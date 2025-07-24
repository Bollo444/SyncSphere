const nodemailer = require('nodemailer');
const logger = require('../../utils/logger');

// Email service for sending various types of emails
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Configure email transporter based on environment
    if (process.env.NODE_ENV === 'test') {
      // Use test configuration for testing
      this.transporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
      };
      return;
    }

    // Production/Development configuration
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendVerificationEmail(email, verificationToken) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@syncsphere.com',
        to: email,
        subject: 'Verify Your SyncSphere Account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3B82F6;">Welcome to SyncSphere!</h2>
            <p>Thank you for creating an account. Please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6B7280;">${verificationUrl}</p>
            <p style="color: #6B7280; font-size: 14px;">This link will expire in 24 hours.</p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${email}`, { messageId: result.messageId });
      return true;
    } catch (error) {
      logger.error('Failed to send verification email', { email, error: error.message });
      throw error;
    }
  }

  async sendPasswordResetEmail(email, resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@syncsphere.com',
        to: email,
        subject: 'Reset Your SyncSphere Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3B82F6;">Password Reset Request</h2>
            <p>You requested to reset your password. Click the button below to set a new password:</p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6B7280;">${resetUrl}</p>
            <p style="color: #6B7280; font-size: 14px;">This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${email}`, { messageId: result.messageId });
      return true;
    } catch (error) {
      logger.error('Failed to send password reset email', { email, error: error.message });
      throw error;
    }
  }

  async sendWelcomeEmail(email, userName) {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@syncsphere.com',
        to: email,
        subject: 'Welcome to SyncSphere!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3B82F6;">Welcome to SyncSphere, ${userName}!</h2>
            <p>Your account has been successfully verified. You can now enjoy all the features SyncSphere has to offer:</p>
            <ul style="color: #374151;">
              <li>📱 Phone Data Transfer</li>
              <li>🔄 Data Recovery</li>
              <li>🔓 Screen Unlock</li>
              <li>🛠️ System Repair</li>
              <li>🗑️ Secure Data Eraser</li>
              <li>💬 WhatsApp Transfer</li>
            </ul>
            <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Go to Dashboard</a>
            <p style="color: #6B7280; font-size: 14px;">If you have any questions, feel free to contact our support team.</p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${email}`, { messageId: result.messageId });
      return true;
    } catch (error) {
      logger.error('Failed to send welcome email', { email, error: error.message });
      throw error;
    }
  }

  async sendSubscriptionEmail(email, subscriptionType, action) {
    try {
      let subject, content;
      
      switch (action) {
        case 'activated':
          subject = `${subscriptionType} Plan Activated`;
          content = `
            <h2 style="color: #3B82F6;">Subscription Activated!</h2>
            <p>Your ${subscriptionType} plan has been successfully activated. You now have access to premium features.</p>
          `;
          break;
        case 'cancelled':
          subject = 'Subscription Cancelled';
          content = `
            <h2 style="color: #EF4444;">Subscription Cancelled</h2>
            <p>Your subscription has been cancelled. You'll continue to have access until the end of your billing period.</p>
          `;
          break;
        case 'expired':
          subject = 'Subscription Expired';
          content = `
            <h2 style="color: #F59E0B;">Subscription Expired</h2>
            <p>Your subscription has expired. Renew now to continue enjoying premium features.</p>
          `;
          break;
        default:
          subject = 'Subscription Update';
          content = `
            <h2 style="color: #3B82F6;">Subscription Update</h2>
            <p>There has been an update to your subscription.</p>
          `;
      }

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@syncsphere.com',
        to: email,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${content}
            <a href="${process.env.FRONTEND_URL}/subscription" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Manage Subscription</a>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Subscription email sent to ${email}`, { action, messageId: result.messageId });
      return true;
    } catch (error) {
      logger.error('Failed to send subscription email', { email, action, error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
const emailService = new EmailService();

module.exports = {
  sendVerificationEmail: emailService.sendVerificationEmail.bind(emailService),
  sendPasswordResetEmail: emailService.sendPasswordResetEmail.bind(emailService),
  sendWelcomeEmail: emailService.sendWelcomeEmail.bind(emailService),
  sendSubscriptionEmail: emailService.sendSubscriptionEmail.bind(emailService)
};