import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail =
  process.env.RESEND_FROM_EMAIL ||
  (process.env.MAIL_FROM
    ? process.env.MAIL_FROM.includes("<")
      ? process.env.MAIL_FROM
      : `Eman Thread <${process.env.MAIL_FROM}>`
    : "Eman Thread <noreply@emanthread.com>");
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured in environment variables");
    }
    resend = new Resend(resendApiKey);
  }
  return resend;
}

function emailWrapper(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:40px 32px 32px;text-align:center;background:linear-gradient(135deg,#fbbf24,#f59e0b);">
              <h1 style="margin:0;font-size:24px;color:#1a1a1a;font-weight:700;">Eman Thread</h1>
              <p style="margin:8px 0 0;color:#4a4a4a;font-size:14px;">${title}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#fafafa;border-top:1px solid #eee;text-align:center;">
              <p style="margin:0;color:#999;font-size:12px;">
                &copy; ${new Date().getFullYear()} Eman Thread. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(
  to: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${siteUrl}/reset-password?token=${token}`;

  try {
    const response = await getResend().emails.send({
      from: fromEmail,
      to,
      subject: "Reset your Eman Thread password",
      html: emailWrapper(
        "Reset Your Password",
        `<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
          We received a request to reset your password. Click the button below to set a new password.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr>
            <td align="center">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 36px;background-color:#f59e0b;color:#1a1a1a;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">Reset Password</a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.5;">
          This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
        </p>
        <p style="margin:0;color:#999;font-size:12px;line-height:1.5;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color:#f59e0b;word-break:break-all;font-size:12px;">${resetUrl}</a>
        </p>`
      ),
    });

    console.log("[resend] Password reset email response:", JSON.stringify(response));
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("[email] Failed to send password reset email:", message);
    return { success: false, error: message };
  }
}

export async function sendVerificationEmail(
  to: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const verifyUrl = `${siteUrl}/api/auth/verify-email?token=${token}`;

  try {
    await getResend().emails.send({
      from: fromEmail,
      to,
      subject: "Verify your Eman Thread email",
      html: emailWrapper(
        "Verify Your Email Address",
        `<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
          Thank you for creating an account! Please click the button below to verify your email address.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr>
            <td align="center">
              <a href="${verifyUrl}" style="display:inline-block;padding:14px 36px;background-color:#f59e0b;color:#1a1a1a;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">Verify Email</a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.5;">
          This link will expire in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
        </p>
        <p style="margin:0;color:#999;font-size:12px;line-height:1.5;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verifyUrl}" style="color:#f59e0b;word-break:break-all;font-size:12px;">${verifyUrl}</a>
        </p>`
      ),
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("[email] Failed to send verification email:", message);
    return { success: false, error: message };
  }
}

export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await getResend().emails.send({
      from: fromEmail,
      to,
      subject: "Welcome to Eman Thread — your email is verified!",
      html: emailWrapper(
        "Welcome to Eman Thread!",
        `<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
          Hi ${name},
        </p>
        <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
          Your email has been verified successfully. Welcome to the Eman Thread family!
        </p>
        <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
          You can now save your custom stitching profiles, track orders, and reuse your fit preferences effortlessly.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr>
            <td align="center">
              <a href="${siteUrl}/account" style="display:inline-block;padding:14px 36px;background-color:#f59e0b;color:#1a1a1a;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">Go to My Account</a>
            </td>
          </tr>
        </table>
        <p style="margin:0;color:#666;font-size:13px;line-height:1.5;">
          If you have any questions, feel free to reply to this email or contact our support team.
        </p>`
      ),
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("[email] Failed to send welcome email:", message);
    return { success: false, error: message };
  }
}

export function generateToken(length: number = 48): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.getRandomValues(new Uint8Array(1))[0] % chars.length;
    token += chars[randomIndex];
  }
  return token;
}