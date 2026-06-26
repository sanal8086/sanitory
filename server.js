const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
  service: 'gmail',
  auth: {
    user: 'sanalshijilkk52@gmail.com',
    pass: 'cawn xdya kfpx vptv'
  },
  tls: {
    rejectUnauthorized: false
  }
});

transporter.verify().then(() => {
  console.log('Email transporter verified successfully');
}).catch(err => {
  console.error('Email transporter verification failed:', err.message);
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/api/send-otp', async (req, res) => {
  try {
    currentOTP = generateOTP();
    otpExpiry = Date.now() + 5 * 60 * 1000;

    console.log('Generated OTP:', currentOTP, 'Expires at:', new Date(otpExpiry).toLocaleString());

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
    console.log('Email sent:', info.messageId);
    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send OTP: ' + error.message });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { otp } = req.body;

  if (!currentOTP || !otpExpiry) {
    return res.status(400).json({ success: false, message: 'No OTP sent' });
  }

  if (Date.now() > otpExpiry) {
    currentOTP = null;
    otpExpiry = null;
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }

  if (otp === currentOTP) {
    currentOTP = null;
    otpExpiry = null;
    res.json({ success: true, message: 'OTP verified' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid OTP' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Hindlux server running at http://localhost:${PORT}`);
});
