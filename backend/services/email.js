/**
 * Email Service Module
 *
 * Sends transactional emails (registration confirmation, booking confirmation).
 * Uses Nodemailer with SMTP - works with Gmail, SendGrid, Mailgun, etc.
 *
 * If SMTP is not configured (e.g. in development), emails are logged to console
 * and the app continues to work without failing.
 */

const nodemailer = require('nodemailer');

/**
 * Create email transporter from environment variables.
 * Returns null if email is not configured (e.g. SMTP_HOST missing).
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port: parseInt(port, 10) || 587,
    secure: secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Get sender name and address from env (with defaults).
 */
function getSender() {
  const fromName = process.env.EMAIL_FROM_NAME || 'Reservations App';
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || 'noreply@example.com';
  return `"${fromName}" <${fromAddress}>`;
}

/**
 * Send an email. If transporter is not configured, logs to console and resolves.
 * @param {Object} options - { to, subject, text, html }
 * @returns {Promise<void>}
 */
async function sendEmail(options) {
  const transporter = createTransporter();

  if (!transporter) {
    console.log('[Email] SMTP not configured. Would have sent email:', {
      to: options.to,
      subject: options.subject,
    });
    return;
  }

  try {
    await transporter.sendMail({
      from: getSender(),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    });
    console.log('[Email] Sent successfully to', options.to, '-', options.subject);
  } catch (err) {
    console.error('[Email] Failed to send:', err.message);
    // Do not throw - we don't want to fail registration/booking if email fails
  }
}

/**
 * Send registration confirmation email after successful account creation.
 * @param {string} to - User email address
 * @param {string} name - User's display name
 */
async function sendRegistrationConfirmation(to, name) {
  const appName = process.env.EMAIL_APP_NAME || 'Reservations App';
  const subject = `Welcome to ${appName} – Account Created`;
  const text = `
Hello ${name},

Your account has been successfully created.

You can now sign in and book services at any time.

Thank you for joining us!

—
${appName}
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2185d0;">Welcome to ${appName}</h2>
  <p>Hello ${name},</p>
  <p>Your account has been successfully created.</p>
  <p>You can now sign in and book services at any time.</p>
  <p>Thank you for joining us!</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="color: #888; font-size: 12px;">— ${appName}</p>
</body>
</html>
  `.trim();

  await sendEmail({ to, subject, text, html });
}

/**
 * Send booking confirmation email after successful booking.
 * @param {string} to - User email address
 * @param {string} userName - User's display name
 * @param {Object} booking - { serviceName, date, time, status }
 */
async function sendBookingConfirmation(to, userName, booking) {
  const appName = process.env.EMAIL_APP_NAME || 'Reservations App';
  const formattedDate = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const subject = `Booking Confirmed – ${booking.serviceName} on ${formattedDate}`;
  const text = `
Hello ${userName},

Your booking has been confirmed.

Service: ${booking.serviceName}
Date: ${formattedDate}
Time: ${booking.time}
Status: ${booking.status}

We look forward to seeing you!

—
${appName}
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #21ba45;">Booking Confirmed</h2>
  <p>Hello ${userName},</p>
  <p>Your booking has been confirmed.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Service</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${booking.serviceName}</td></tr>
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Date</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formattedDate}</td></tr>
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Time</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${booking.time}</td></tr>
    <tr><td style="padding: 8px 0;"><strong>Status</strong></td><td style="padding: 8px 0;">${booking.status}</td></tr>
  </table>
  <p>We look forward to seeing you!</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="color: #888; font-size: 12px;">— ${appName}</p>
</body>
</html>
  `.trim();

  await sendEmail({ to, subject, text, html });
}

/**
 * Send password reset email with secure link.
 * @param {string} to - User email address
 * @param {string} name - User's display name
 * @param {string} resetLink - Full URL to the reset-password page including token (e.g. https://app.com/auth/reset-password?token=xxx)
 */
async function sendPasswordResetEmail(to, name, resetLink) {
  const appName = process.env.EMAIL_APP_NAME || 'Reservations App';
  const subject = `Reset Your Password – ${appName}`;
  const text = `
Hello ${name},

You requested a password reset for your ${appName} account.

Click the link below to set a new password (link expires in 1 hour):

${resetLink}

If you did not request this, you can ignore this email. Your password will not be changed.

—
${appName}
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2185d0;">Reset Your Password</h2>
  <p>Hello ${name},</p>
  <p>You requested a password reset for your ${appName} account.</p>
  <p>Click the link below to set a new password (link expires in 1 hour):</p>
  <p style="margin: 24px 0;"><a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #2185d0; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
  <p style="word-break: break-all; font-size: 12px; color: #666;">Or copy this link: ${resetLink}</p>
  <p style="color: #888; font-size: 14px;">If you did not request this, you can ignore this email. Your password will not be changed.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="color: #888; font-size: 12px;">— ${appName}</p>
</body>
</html>
  `.trim();

  await sendEmail({ to, subject, text, html });
}

module.exports = {
  sendEmail,
  sendRegistrationConfirmation,
  sendBookingConfirmation,
  sendPasswordResetEmail,
};
