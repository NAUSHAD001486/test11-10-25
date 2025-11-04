// Contact Controller - Handle contact form submissions
const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return nodemailer.createTransport({
    jsonTransport: true
  });
};

const emailTransporter = createTransporter();

const sendContactEmail = async (req, res) => {
  try {
    const { email, message } = req.body;
    
    if (!email || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and message are required' 
      });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }
    
    const mailOptions = {
      from: process.env.SMTP_USER || 'noreply@love-u-convert.com',
      to: process.env.CONTACT_EMAIL || 'Contact@love-u-convert.com',
      subject: `Contact Form - Love U Convert - ${email}`,
      text: `New contact form submission from: ${email}\n\nMessage:\n${message}\n\n---\nSubmitted at: ${new Date().toISOString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7C3AED;">New Contact Form Submission</h2>
          <p><strong>From:</strong> ${email}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <hr style="border: 1px solid #ddd; margin: 20px 0;">
          <h3>Message:</h3>
          <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
      `
    };
    
    await emailTransporter.sendMail(mailOptions);
    
    res.json({ 
      success: true, 
      message: 'Message sent successfully' 
    });
  } catch (error) {
    const logger = require('../logger');
    logger.error('Contact form error:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false, 
      error: 'Error sending message. Please try again later.' 
    });
  }
};

module.exports = {
  sendContactEmail
};

