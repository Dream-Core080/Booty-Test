const nodemailer = require('nodemailer');

/**
 * Create and return a reusable nodemailer transporter for Gmail SMTP
 * Uses environment variables for Gmail credentials
 * 
 * @returns {Object} Configured nodemailer transporter object
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // Gmail address from environment variable
      pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password (not regular password) from environment variable
    },
  });
};

/**
 * Send email verification email to user
 * Creates a verification link and sends it via Gmail SMTP
 * 
 * @param {string} email - Recipient email address
 * @param {string} verificationToken - Unique verification token generated during registration
 * @param {string} baseUrl - Base URL for verification link (defaults to BACKEND_URL env var or localhost)
 * @returns {Promise<Object>} Promise that resolves with success status and message ID
 * @throws {Error} If email sending fails
 */
const sendVerificationEmail = async (email, verificationToken, baseUrl = process.env.BACKEND_URL || 'http://localhost:5004') => {
  try {
    const transporter = createTransporter();
    
    // Create verification link with token as query parameter
    const verificationLink = `${baseUrl}/api/users/verify-email?token=${verificationToken}`;
    
    // Configure email options with HTML and plain text versions
    const mailOptions = {
      from: `"${process.env.GMAIL_FROM_NAME || 'Booty Test'}" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #9A354E; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1 style="color: white; margin: 0;">Email Verification</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
            <p>Hello,</p>
            <p>Thank you for registering with us! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="background-color: #9A354E; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 12px;">${verificationLink}</p>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              This verification link will expire in 24 hours. If you didn't create an account, please ignore this email.
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Best regards,<br>
              Booty Test Team
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello,
        
        Thank you for registering with us! Please verify your email address by clicking the link below:
        
        ${verificationLink}
        
        This verification link will expire in 24 hours. If you didn't create an account, please ignore this email.
        
        Best regards,
        Booty Test Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};

module.exports = {
  sendVerificationEmail,
  createTransporter,
};

