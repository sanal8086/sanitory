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

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'sanalshijilkk52@gmail.com',
    pass: 'cawn xdya kfpx vptv'
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000
});

transporter.verify().then(() => {
  console.log('[OK] Email transporter connected');
}).catch(err => {
  console.error('[WARN] Email transporter failed:', err.message);
  console.error('[WARN] OTP will be shown on screen as fallback');
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/api/send-otp', async (req, res) => {
  try {
    currentOTP = generateOTP();
    otpExpiry = Date.now() + 5 * 60 * 1000;

    console.log('[OTP] Generated:', currentOTP);

    let emailSent = false;
    let emailError = null;

    try {
      const mailOptions = {
        from: '"Hindlux Admin" <sanalshijilkk52@gmail.com>',
        to: 'sanalshijilkk52@gmail.com',
        subject: 'Hindlux Admin Authorization OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0d0d0d; text-align: center;">Hindlux Admin OTP</h2>
            <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; text-align: center;">
              <p style="margin: 0 0 10px; color: #666;">Your authorization OTP is:</p>
              <h1 style="font-size: 36px; background: linear-gradient(135deg, #0d0d0d, #1e88e5); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 8px; margin: 10px 0;">${currentOTP}</h1>
              <p style="margin: 10px 0 0; color: #999; font-size: 12px;">This OTP expires in 5 minutes</p>
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('[OK] Email sent:', info.messageId);
      emailSent = true;
    } catch (err) {
      console.error('[WARN] Email failed:', err.message);
      emailError = err.message;
    }

    if (emailSent) {
      res.json({ success: true, message: 'OTP sent to email' });
    } else {
      console.log('[OTP] Showing OTP on screen:', currentOTP);
      res.json({
        success: true,
        message: 'Email failed. Use OTP shown on server console.',
        otp: currentOTP
      });
    }
  } catch (error) {
    console.error('[ERROR] Send OTP failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send OTP: ' + error.message });
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
    return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
  }

  if (otp === currentOTP) {
    currentOTP = null;
    otpExpiry = null;
    res.json({ success: true, message: 'OTP verified' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid OTP. Check and try again.' });
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
