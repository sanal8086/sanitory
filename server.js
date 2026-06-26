require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use(express.static(path.join(__dirname), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

let currentOTP = null;
let otpExpiry = null;

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || GMAIL_USER;

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS
  },
  tls: { rejectUnauthorized: false },
  connectionTimeout: 15000,
  socketTimeout: 15000
});

transporter.verify().then(() => {
  console.log('[OK] Email connected');
}).catch(err => {
  console.error('[FAIL] Email error:', err.message);
  console.error('Check your .env file — GMAIL_USER and GMAIL_PASS must be set');
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/api/send-otp', async (req, res) => {
  try {
    currentOTP = generateOTP();
    otpExpiry = Date.now() + 5 * 60 * 1000;

    console.log('[OTP] Sending to', ADMIN_EMAIL);

    await transporter.sendMail({
      from: '"Hindlux Security" <' + GMAIL_USER + '>',
      to: ADMIN_EMAIL,
      subject: 'Hindlux Admin Authorization OTP',
      text: 'Your OTP is: ' + currentOTP + '\nThis OTP expires in 5 minutes.',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px">
          <h2 style="color:#0d0d0d;text-align:center">Hindlux Admin OTP</h2>
          <div style="background:#f8f9fa;border-radius:10px;padding:20px;text-align:center">
            <p style="margin:0 0 10px;color:#666">Your authorization OTP is:</p>
            <h1 style="font-size:36px;background:linear-gradient(135deg,#0d0d0d,#1e88e5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:8px;margin:10px 0">${currentOTP}</h1>
            <p style="margin:10px 0 0;color:#999;font-size:12px">This OTP expires in 5 minutes</p>
          </div>
        </div>
      `
    });

    console.log('[OK] OTP email sent');
    res.json({ success: true, message: 'OTP sent to your registered email' });
  } catch (error) {
    console.error('[FAIL] Email error:', error.message);
    currentOTP = null;
    otpExpiry = null;
    res.status(500).json({ success: false, message: 'Failed to send email. Check server logs.' });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { otp } = req.body;

  if (!currentOTP || !otpExpiry) {
    return res.status(400).json({ success: false, message: 'No OTP sent. Click Send OTP first.' });
  }

  if (Date.now() > otpExpiry) {
    currentOTP = null;
    otpExpiry = null;
    return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });
  }

  if (otp === currentOTP) {
    currentOTP = null;
    otpExpiry = null;
    res.json({ success: true, message: 'OTP verified' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid OTP. Try again.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log('========================================');
  console.log('  Hindlux Server Running');
  console.log('  Local:   http://localhost:' + PORT);
  console.log('  Network: http://<your-ip>:' + PORT);
  console.log('========================================');
});
