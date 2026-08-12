import { Resend } from "resend";
import { resendConfig } from "@/lib/notifications/config";
import { emailHtmlToText } from "@/lib/notifications/email-format";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = resendConfig.fromEmail;
const replyTo = resendConfig.replyToEmail;
const siteUrl =
  (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");

let resend: Resend | null = null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
            <td style="padding:40px 32px 32px;text-align:center;background:#1a1a1a;">
              <h1 style="margin:0;font-size:24px;color:#ffffff;font-weight:700;letter-spacing:1px;">EMAN THREAD</h1>
              <p style="margin:8px 0 0;color:#e5e7eb;font-size:14px;">${title}</p>
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
  const html = emailWrapper(
    "Reset Your Password",
    `<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
      We received a request to reset your password. Click the button below to set a new password.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td align="center"><a href="${resetUrl}" style="display:inline-block;padding:14px 36px;background-color:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">Reset Password</a></td></tr>
    </table>
    <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.5;">This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
    <p style="margin:0;color:#999;font-size:12px;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${resetUrl}" style="color:#1a1a1a;word-break:break-all;font-size:12px;">${resetUrl}</a></p>`,
  );

  try {
    const { data, error } = await getResend().emails.send({
      from: fromEmail,
      to,
      ...(replyTo ? { replyTo } : {}),
      subject: "Reset your Eman Thread password",
      html,
      text: emailHtmlToText(html),
    });

    if (error) {
      console.error("[email] Resend password reset error:", error);
      return { success: false, error: error.message };
    }

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
  const html = emailWrapper(
    "Verify Your Email Address",
    `<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">Thank you for creating an account. Please verify your email address using the button below.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center"><a href="${verifyUrl}" style="display:inline-block;padding:14px 36px;background-color:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">Verify Email</a></td></tr></table>
    <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.5;">This link will expire in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.</p>
    <p style="margin:0;color:#999;font-size:12px;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${verifyUrl}" style="color:#1a1a1a;word-break:break-all;font-size:12px;">${verifyUrl}</a></p>`,
  );

  try {
    const { data, error } = await getResend().emails.send({
      from: fromEmail,
      to,
      ...(replyTo ? { replyTo } : {}),
      subject: "Verify your Eman Thread email",
      html,
      text: emailHtmlToText(html),
    });

    if (error) {
      console.error("[email] Resend verification email error:", error);
      return { success: false, error: error.message };
    }

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
  const html = emailWrapper(
    "Welcome to Eman Thread!",
    `<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">Your email has been verified successfully. Welcome to the Eman Thread family.</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">You can now browse every department, save products, manage measurements, and track your orders.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center"><a href="${siteUrl}/account" style="display:inline-block;padding:14px 36px;background-color:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">Go to My Account</a></td></tr></table>
    <p style="margin:0;color:#666;font-size:13px;line-height:1.5;">If you have any questions, reply to this email or contact our support team.</p>`,
  );
  try {
    const { data, error } = await getResend().emails.send({
      from: fromEmail,
      to,
      ...(replyTo ? { replyTo } : {}),
      subject: "Welcome to Eman Thread — your email is verified!",
      html,
      text: emailHtmlToText(html),
    });

    if (error) {
      console.error("[email] Resend welcome email error:", error);
      return { success: false, error: error.message };
    }

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
