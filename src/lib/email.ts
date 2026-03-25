import { Resend } from 'resend';

// Lazy load Resend to avoid initialization errors during build
function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const emailService = {
  sendEmail: async ({ to, subject, html }: SendEmailOptions) => {
    // Skip sending in development if no API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.log('📧 [Email] Development mode - would send email:', {
        to,
        subject,
        html: html.substring(0, 100) + '...',
      });
      return { success: true };
    }

    const resend = getResendClient();
    if (!resend) {
      console.error('RESEND_API_KEY is not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const response = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Snapense <onboarding@resend.dev>',
        to,
        subject,
        html,
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error };
    }
  },

  sendVerificationEmail: async (email: string, url: string) => {
    return emailService.sendEmail({
      to: email,
      subject: 'Verify your email - Snapense',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #22d3ee; margin: 0;">Snapense</h1>
            <p style="color: #6b7280; margin: 5px 0 0;">Minimalist expense tracking</p>
          </div>

          <div style="background: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #111827; margin: 0 0 10px;">Verify your email address</h2>
            <p style="color: #6b7280; margin: 0 0 20px;">Thanks for signing up! Please click the button below to verify your email address and start tracking your expenses.</p>

            <a href="${url}" style="display: inline-block; padding: 14px 28px; background-color: #22d3ee; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
              Verify Email
            </a>
          </div>

          <div style="text-align: center; color: #9ca3af; font-size: 14px;">
            <p style="margin: 0 0 10px;">Or copy and paste this link into your browser:</p>
            <a href="${url}" style="color: #22d3ee; word-break: break-all;">${url}</a>
            <p style="margin: 20px 0 0;">This link expires in 24 hours.</p>
          </div>
        </div>
      `,
    });
  },

  sendResetPasswordEmail: async (email: string, url: string) => {
    return emailService.sendEmail({
      to: email,
      subject: 'Reset your password - Snapense',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #22d3ee; margin: 0;">Snapense</h1>
          </div>

          <div style="background: #f9fafb; border-radius: 12px; padding: 30px;">
            <h2 style="color: #111827; margin: 0 0 10px;">Reset your password</h2>
            <p style="color: #6b7280; margin: 0 0 20px;">Click the button below to reset your password.</p>

            <a href="${url}" style="display: inline-block; padding: 14px 28px; background-color: #22d3ee; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
              Reset Password
            </a>

            <p style="color: #9ca3af; font-size: 14px; margin: 20px 0 0;">If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      `,
    });
  },
};

// Export for use in auth.ts
export const { sendEmail, sendVerificationEmail, sendResetPasswordEmail } = emailService;

// Backward compatibility export
export { emailService as resend };
