import nodemailer from 'nodemailer';

// Built lazily on first use (not at import time) so this never runs
// before dotenv has loaded EMAIL_USER/EMAIL_PASS into process.env.
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Render's outbound networking doesn't route IPv6, but Node picks
      // Gmail's IPv6 address first when DNS returns both — forcing IPv4
      // avoids the resulting ENETUNREACH failures.
      family: 4,
      // Fail fast instead of hanging the request if the host's outbound
      // connection to Gmail is slow or blocked (common on some platforms).
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  return transporter;
};

export const sendWelcomeEmail = async (toEmail, fullName) => {
  const firstName = (fullName || '').split(' ')[0] || 'there';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
        <div style="width: 32px; height: 32px; border-radius: 8px; background: #FF6603; display: inline-block;"></div>
        <span style="font-size: 20px; font-weight: 700; color: #111827;">Horarium</span>
      </div>
      <h1 style="font-size: 22px; color: #111827; margin-bottom: 12px;">Welcome aboard, ${firstName}! 🎉</h1>
      <p style="font-size: 15px; color: #4B5563; line-height: 1.6;">
        Your Horarium account has been created successfully. You're all set to start
        tracking work hours, managing timesheets, and keeping your team on schedule —
        completely free.
      </p>
      <a href="http://localhost:5173/login"
         style="display: inline-block; margin-top: 20px; background: #FF6603; color: #fff;
                text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px;
                border-radius: 10px;">
        Log in to your account
      </a>
      <p style="font-size: 13px; color: #9CA3AF; margin-top: 32px;">
        If you didn't create this account, you can safely ignore this email.
      </p>
    </div>
  `;

  const info = await getTransporter().sendMail({
    from: `"Horarium" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Welcome to Horarium 👋',
    html,
  });
  console.log('Welcome email accepted by Gmail:', info.response, '| messageId:', info.messageId);
};

export const sendInviteEmail = async (toEmail, adminName, inviteLink) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
        <div style="width: 32px; height: 32px; border-radius: 8px; background: #FF6603; display: inline-block;"></div>
        <span style="font-size: 20px; font-weight: 700; color: #111827;">Horarium</span>
      </div>
      <h1 style="font-size: 22px; color: #111827; margin-bottom: 12px;">You've been invited to join a team on Horarium</h1>
      <p style="font-size: 15px; color: #4B5563; line-height: 1.6;">
        <strong>${adminName}</strong> has invited you to join their team on Horarium to
        track your work hours together. Click below to set up your account.
      </p>
      <a href="${inviteLink}"
         style="display: inline-block; margin-top: 20px; background: #FF6603; color: #fff;
                text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px;
                border-radius: 10px;">
        Accept Invitation
      </a>
      <p style="font-size: 13px; color: #9CA3AF; margin-top: 32px;">
        This invite link expires in 7 days. If you weren't expecting this, you can
        safely ignore this email.
      </p>
    </div>
  `;

  const info = await getTransporter().sendMail({
    from: `"Horarium" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${adminName} invited you to join their team on Horarium`,
    html,
  });
  console.log('Invite email accepted by Gmail:', info.response, '| messageId:', info.messageId);
};