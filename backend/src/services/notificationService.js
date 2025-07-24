const nodemailer = require('nodemailer');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const redis = require('../config/redis');
const { query } = require('../config/database');

class NotificationService {
  constructor() {
    this.emailTransporter = this.createEmailTransporter();
  }

  // Create email transporter
  createEmailTransporter() {
    if (process.env.NODE_ENV === 'test') {
      // Use test transporter for testing
      return {
        sendMail: async (options) => {
          logger.info('Test email sent:', options);
          return { messageId: 'test-message-id' };
        }
      };
    }

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Send email notification
  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'SyncSphere'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent)
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}: ${result.messageId}`);
      return result;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw new AppError('Failed to send email', 500);
    }
  }

  // Strip HTML tags for text version
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Send welcome email
  async sendWelcomeEmail(user) {
    try {
      const subject = `Welcome to ${process.env.APP_NAME || 'SyncSphere'}!`;
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to SyncSphere</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to SyncSphere!</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.first_name},</h2>
              <p>Thank you for joining SyncSphere! We're excited to help you recover and transfer your data seamlessly.</p>
              
              <h3>What you can do with SyncSphere:</h3>
              <ul>
                <li>🔄 Recover lost data from your devices</li>
                <li>📱 Transfer data between phones effortlessly</li>
                <li>☁️ Secure cloud backup and sync</li>
                <li>🔒 Enterprise-grade security</li>
              </ul>
              
              <p>Ready to get started?</p>
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
              
              <p>If you have any questions, our support team is here to help!</p>
            </div>
            <div class="footer">
              <p>© 2024 SyncSphere. All rights reserved.</p>
              <p>If you didn't create this account, please ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(user.email, subject, htmlContent);
      logger.info(`Welcome email sent to user ${user.id}`);
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      // Don't throw error for welcome email failures
    }
  }

  // Send email verification
  async sendEmailVerification(user, verificationToken) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      const subject = 'Verify your email address';
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.first_name},</h2>
              <p>Please verify your email address to complete your SyncSphere account setup.</p>
              
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
              
              <p>This verification link will expire in 24 hours.</p>
              
              <p>If you didn't create a SyncSphere account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2024 SyncSphere. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(user.email, subject, htmlContent);
      logger.info(`Email verification sent to user ${user.id}`);
    } catch (error) {
      logger.error('Error sending email verification:', error);
      throw error;
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(user, resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      const subject = 'Reset your password';
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .warning { background: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.first_name},</h2>
              <p>We received a request to reset your password for your SyncSphere account.</p>
              
              <a href="${resetUrl}" class="button">Reset Password</a>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              
              <div class="warning">
                <strong>Security Notice:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your password will remain unchanged until you create a new one</li>
                </ul>
              </div>
              
              <p>If you continue to have problems, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>© 2024 SyncSphere. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(user.email, subject, htmlContent);
      logger.info(`Password reset email sent to user ${user.id}`);
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      throw error;
    }
  }

  // Send data recovery completion notification
  async sendDataRecoveryCompleteEmail(user, recoverySession) {
    try {
      const subject = 'Data Recovery Complete';
      const successRate = Math.round((recoverySession.recovered_files / recoverySession.total_files) * 100);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Data Recovery Complete</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .stats { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .stat-item { display: flex; justify-content: space-between; margin: 10px 0; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Data Recovery Complete!</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.first_name},</h2>
              <p>Great news! Your data recovery session has been completed successfully.</p>
              
              <div class="stats">
                <h3>Recovery Summary:</h3>
                <div class="stat-item">
                  <span>Total Files Scanned:</span>
                  <strong>${recoverySession.total_files.toLocaleString()}</strong>
                </div>
                <div class="stat-item">
                  <span>Files Recovered:</span>
                  <strong>${recoverySession.recovered_files.toLocaleString()}</strong>
                </div>
                <div class="stat-item">
                  <span>Success Rate:</span>
                  <strong>${successRate}%</strong>
                </div>
                <div class="stat-item">
                  <span>Recovery Type:</span>
                  <strong>${recoverySession.recovery_type}</strong>
                </div>
              </div>
              
              <p>You can now download your recovered files from your dashboard.</p>
              
              <a href="${process.env.FRONTEND_URL}/dashboard/recovery/${recoverySession.id}" class="button">View Recovery Results</a>
              
              <p>If you have any questions about your recovered data, please don't hesitate to contact our support team.</p>
            </div>
            <div class="footer">
              <p>© 2024 SyncSphere. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(user.email, subject, htmlContent);
      logger.info(`Data recovery completion email sent to user ${user.id}`);
    } catch (error) {
      logger.error('Error sending data recovery completion email:', error);
    }
  }

  // Send phone transfer completion notification
  async sendPhoneTransferCompleteEmail(user, transferSession) {
    try {
      const subject = 'Phone Transfer Complete';
      const successRate = Math.round((transferSession.transferred_items / transferSession.total_items) * 100);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Phone Transfer Complete</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .stats { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .stat-item { display: flex; justify-content: space-between; margin: 10px 0; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📱 Phone Transfer Complete!</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.first_name},</h2>
              <p>Excellent! Your phone-to-phone data transfer has been completed successfully.</p>
              
              <div class="stats">
                <h3>Transfer Summary:</h3>
                <div class="stat-item">
                  <span>Total Items:</span>
                  <strong>${transferSession.total_items.toLocaleString()}</strong>
                </div>
                <div class="stat-item">
                  <span>Items Transferred:</span>
                  <strong>${transferSession.transferred_items.toLocaleString()}</strong>
                </div>
                <div class="stat-item">
                  <span>Success Rate:</span>
                  <strong>${successRate}%</strong>
                </div>
                <div class="stat-item">
                  <span>Data Size:</span>
                  <strong>${this.formatBytes(transferSession.transferred_size)}</strong>
                </div>
                <div class="stat-item">
                  <span>Transfer Method:</span>
                  <strong>${transferSession.connection_method}</strong>
                </div>
              </div>
              
              <p>Your data has been securely transferred to your new device. You can verify the transfer results in your dashboard.</p>
              
              <a href="${process.env.FRONTEND_URL}/dashboard/transfers/${transferSession.id}" class="button">View Transfer Details</a>
              
              <p>Thank you for using SyncSphere for your data transfer needs!</p>
            </div>
            <div class="footer">
              <p>© 2024 SyncSphere. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(user.email, subject, htmlContent);
      logger.info(`Phone transfer completion email sent to user ${user.id}`);
    } catch (error) {
      logger.error('Error sending phone transfer completion email:', error);
    }
  }

  // Send subscription expiration warning
  async sendSubscriptionExpirationWarning(user, subscription, daysUntilExpiration) {
    try {
      const subject = `Your ${subscription.plan_name} subscription expires in ${daysUntilExpiration} days`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Subscription Expiring Soon</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #F59E0B; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Subscription Expiring Soon</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.first_name},</h2>
              
              <div class="warning">
                <strong>Important:</strong> Your ${subscription.plan_name} subscription will expire in ${daysUntilExpiration} days.
              </div>
              
              <p>To continue enjoying all the features of SyncSphere, please renew your subscription before it expires.</p>
              
              <h3>What happens if your subscription expires:</h3>
              <ul>
                <li>Your account will be downgraded to the Free plan</li>
                <li>Access to premium features will be restricted</li>
                <li>Your data will remain safe, but some features may be limited</li>
              </ul>
              
              <a href="${process.env.FRONTEND_URL}/dashboard/billing" class="button">Renew Subscription</a>
              
              <p>If you have any questions about your subscription, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>© 2024 SyncSphere. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(user.email, subject, htmlContent);
      logger.info(`Subscription expiration warning sent to user ${user.id}`);
    } catch (error) {
      logger.error('Error sending subscription expiration warning:', error);
    }
  }

  // Send subscription cancelled notification
  async sendSubscriptionCancelledEmail(user, subscription) {
    try {
      const subject = 'Subscription Cancelled';
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Subscription Cancelled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .info { background: #DBEAFE; border: 1px solid #3B82F6; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Subscription Cancelled</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.first_name},</h2>
              
              <p>We've processed your request to cancel your ${subscription.plan_name} subscription.</p>
              
              <div class="info">
                <strong>Important Information:</strong>
                <ul>
                  <li>Your subscription will remain active until ${new Date(subscription.current_period_end).toLocaleDateString()}</li>
                  <li>You'll continue to have access to all premium features until then</li>
                  <li>After expiration, your account will be downgraded to the Free plan</li>
                  <li>Your data will remain safe and accessible</li>
                </ul>
              </div>
              
              <p>Changed your mind? You can reactivate your subscription anytime before it expires.</p>
              
              <a href="${process.env.FRONTEND_URL}/dashboard/billing" class="button">Reactivate Subscription</a>
              
              <p>We're sorry to see you go! If you have any feedback on how we can improve, please let us know.</p>
            </div>
            <div class="footer">
              <p>© 2024 SyncSphere. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(user.email, subject, htmlContent);
      logger.info(`Subscription cancelled email sent to user ${user.id}`);
    } catch (error) {
      logger.error('Error sending subscription cancelled email:', error);
    }
  }

  // Send security alert email
  async sendSecurityAlertEmail(user, alertType, details) {
    try {
      const subject = `Security Alert: ${alertType}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Security Alert</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .alert { background: #FEE2E2; border: 1px solid #FECACA; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Security Alert</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.first_name},</h2>
              
              <div class="alert">
                <strong>Security Event Detected:</strong> ${alertType}
              </div>
              
              <p>We detected the following security event on your account:</p>
              
              <ul>
                <li><strong>Event:</strong> ${alertType}</li>
                <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                <li><strong>Details:</strong> ${details}</li>
              </ul>
              
              <p>If this was you, no action is needed. If you don't recognize this activity, please secure your account immediately.</p>
              
              <a href="${process.env.FRONTEND_URL}/dashboard/security" class="button">Review Security Settings</a>
              
              <p>For immediate assistance, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>© 2024 SyncSphere. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(user.email, subject, htmlContent);
      logger.info(`Security alert email sent to user ${user.id}`);
    } catch (error) {
      logger.error('Error sending security alert email:', error);
    }
  }

  // Create in-app notification
  async createInAppNotification(userId, type, title, message, data = {}) {
    try {
      const queryText = `
        INSERT INTO notifications (
          user_id, type, title, message, data, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const values = [userId, type, title, message, JSON.stringify(data)];
      const result = await query(queryText, values);
      
      // Cache notification for real-time updates
      await redis.lpush(`notifications:${userId}`, JSON.stringify(result.rows[0]));
      await redis.expire(`notifications:${userId}`, 86400); // 24 hours
      
      logger.info(`In-app notification created for user ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating in-app notification:', error);
      throw error;
    }
  }

  // Get user notifications
  async getUserNotifications(userId, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      
      const queryText = `
        SELECT * FROM notifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      
      const countQuery = `
        SELECT COUNT(*) as total FROM notifications WHERE user_id = $1
      `;
      
      const [result, countResult] = await Promise.all([
        query(queryText, [userId, limit, offset]),
        query(countQuery, [userId])
      ]);
      
      return {
        notifications: result.rows,
        total: parseInt(countResult.rows[0].total),
        page,
        limit,
        total_pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId, userId) {
    try {
      const queryText = `
        UPDATE notifications 
        SET is_read = true, read_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;
      
      const result = await query(queryText, [notificationId, userId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(userId) {
    try {
      const queryText = `
        UPDATE notifications 
        SET is_read = true, read_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND is_read = false
      `;
      
      await query(queryText, [userId]);
      logger.info(`All notifications marked as read for user ${userId}`);
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get unread notification count
  async getUnreadNotificationCount(userId) {
    try {
      const queryText = `
        SELECT COUNT(*) as count FROM notifications 
        WHERE user_id = $1 AND is_read = false
      `;
      
      const result = await query(queryText, [userId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  // Helper method to format bytes
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Initialize notification tables
  async initializeTables() {
    const { isPostgreSQL } = require('../config/database');
    
    if (isPostgreSQL) {
      const queryText = `
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          data JSONB DEFAULT '{}'::jsonb,
          is_read BOOLEAN DEFAULT false,
          read_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
      `;
      await query(queryText);
    } else {
      // SQLite version - execute statements separately
      const statements = [
        `CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          data TEXT DEFAULT '{}',
          is_read INTEGER DEFAULT 0,
          read_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)`
      ];
      
      for (const statement of statements) {
        await query(statement);
      }
    }
  }
}

module.exports = new NotificationService();