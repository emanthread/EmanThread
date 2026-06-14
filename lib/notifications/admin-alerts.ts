// ── Admin email alert for manual payment submissions ──────────────
// Standalone fire-and-forget function. Does NOT use triggerNotification()
// or any existing provider classes. Sends raw HTML via Resend SDK directly.
// This avoids any side effects on existing notification logic.

import { resendConfig } from "./config";
import { prisma } from "@/lib/db";

const brandName = "Eman Threads";
const brandUrl = "https://emaanthreads.com";
const brandColor = "#1a1a1a";

function adminEmailWrapper(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;color:#333}
.container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.header{background:${brandColor};padding:24px;text-align:center}
.header h1{color:#fff;margin:0;font-size:20px;font-weight:600;letter-spacing:1px}
.content{padding:32px 24px}
.footer{padding:20px 24px;background:#fafafa;text-align:center;font-size:12px;color:#888;border-top:1px solid #eee}
.btn{display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:4px;font-weight:500;margin-top:16px}
.btn-secondary{display:inline-block;padding:12px 24px;background:${brandColor};color:#fff;text-decoration:none;border-radius:4px;font-weight:500;margin-top:16px;margin-left:8px}
.order-details{background:#f9f9f9;padding:16px;border-radius:6px;margin:16px 0}
.order-details p{margin:6px 0;font-size:14px}
.label{font-weight:600;color:#555}
.verify-banner{background:#fef3c7;border:1px solid #f59e0b;padding:14px;border-radius:6px;margin:16px 0;text-align:center}
.verify-banner p{margin:0;font-size:13px;color:#92400e}
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>${brandName.toUpperCase()} — ADMIN ALERT</h1></div>
  <div class="content">${content}</div>
  <div class="footer">
    <p>${brandName} — Admin Notification</p>
    <p><a href="${brandUrl}/admin">${brandUrl}/admin</a></p>
  </div>
</div>
</body>
</html>`;
}

export interface AdminPaymentAlertData {
  orderId: string;
  orderNumber: string;
  amount: number;
  paymentMethod: string; // "NAYAPAY" | "MEEZAN_BANK"
  transactionId: string;
  senderName: string;
  screenshotUrl: string | null;
}

/**
 * Resolve admin email recipients from StoreConfig and DB.
 * Returns a deduplicated list of email addresses.
 */
export async function resolveAdminRecipients(): Promise<string[]> {
  const emails: string[] = [];

  // 1. Check StoreConfig for configured admin/store email
  try {
    const configs = await prisma.storeConfig.findMany({
      where: { key: "email" },
    });
    if (configs.length > 0) {
      const storeEmail = configs[0].value;
      if (storeEmail) emails.push(storeEmail);
    }
  } catch {
    // Ignore store config errors
  }

  // 2. Query all ADMIN and SUPER_ADMIN users
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
      },
      select: { email: true },
    });
    for (const admin of admins) {
      if (admin.email && !emails.includes(admin.email)) {
        emails.push(admin.email);
      }
    }
  } catch {
    // Ignore query errors
  }

  return emails;
}

/**
 * Send an admin alert email for a new manual payment submission.
 * Fire-and-forget — catches all errors internally, never throws.
 * Recipients: admin email from StoreConfig, plus all ADMIN/SUPER_ADMIN users.
 */
export async function sendAdminPaymentAlert(
  data: AdminPaymentAlertData
): Promise<void> {
  try {
    const apiKey = resendConfig.apiKey;
    if (!apiKey) {
      console.warn(
        "[admin-alerts] No RESEND_API_KEY configured — skipping email"
      );
      return;
    }

    const recipients = await resolveAdminRecipients();
    if (recipients.length === 0) {
      console.warn("[admin-alerts] No admin recipients found — skipping email");
      return;
    }

    const methodLabel =
      data.paymentMethod === "NAYAPAY" ? "Nayapay" : "Meezan Bank";

    let screenshotHtml = "";
    if (data.screenshotUrl) {
      screenshotHtml = `<p><span class="label">Screenshot:</span> <a href="${data.screenshotUrl}" target="_blank" rel="noopener noreferrer">View Screenshot</a></p>`;
    }

    const html = adminEmailWrapper(
      "New Payment Pending Verification",
      `
      <div class="verify-banner">
        <p><strong>⏳ Action Required — Payment Pending Verification</strong></p>
      </div>
      <p>A customer has submitted a manual bank transfer for this order:</p>
      <div class="order-details">
        <p><span class="label">Order #:</span> ${data.orderNumber}</p>
        <p><span class="label">Amount:</span> PKR ${data.amount.toLocaleString()}</p>
        <p><span class="label">Payment Method:</span> ${methodLabel}</p>
        <p><span class="label">Transaction ID:</span> ${data.transactionId}</p>
        <p><span class="label">Sender Name:</span> ${data.senderName}</p>
        ${screenshotHtml}
      </div>
      <p>Please review and verify this payment as soon as possible.</p>
      <p style="text-align:center">
        <a href="${brandUrl}/admin/payment-verification" class="btn">✅ Verify Payment</a>
        <a href="${brandUrl}/admin/payment-verification" class="btn-secondary">View Queue</a>
      </p>
      `
    );

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    for (const email of recipients) {
      await resend.emails.send({
        from: resendConfig.fromEmail,
        to: email,
        subject: "New Payment Pending Verification — Eman Threads",
        html,
      });
    }
  } catch (err) {
    console.error("[admin-alerts] Failed to send admin alert email:", err);
    // Never throw — fire-and-forget contract
  }
}

export interface AdminOrderCancelledAlertData {
  orderId: string;
  orderNumber: string;
  amount: string;
  customerName: string;
  reason: string;
}

/**
 * Send an admin alert email when an order is cancelled by the user.
 * Fire-and-forget — catches all errors internally.
 */
export async function sendAdminOrderCancelledAlert(
  data: AdminOrderCancelledAlertData
): Promise<void> {
  try {
    const apiKey = resendConfig.apiKey;
    if (!apiKey) return;

    const recipients = await resolveAdminRecipients();
    if (recipients.length === 0) return;

    const html = adminEmailWrapper(
      "Order Cancelled by Customer",
      `
      <div class="verify-banner" style="border-color: #ef4444; background-color: #fef2f2; color: #b91c1c;">
        <p><strong>🚨 ALERT — Order Cancelled</strong></p>
      </div>
      <p>A customer has just cancelled their pending order:</p>
      <div class="order-details">
        <p><span class="label">Order #:</span> ${data.orderNumber}</p>
        <p><span class="label">Customer Name:</span> ${data.customerName}</p>
        <p><span class="label">Amount:</span> PKR ${data.amount}</p>
        <p><span class="label">Cancellation Reason:</span> ${data.reason}</p>
      </div>
      <p>Inventory stock for this order has been automatically restored.</p>
      <p style="text-align:center">
        <a href="${brandUrl}/admin/orders/${data.orderId}" class="btn">View Order Details</a>
      </p>
      `
    );

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    for (const email of recipients) {
      await resend.emails.send({
        from: resendConfig.fromEmail,
        to: email,
        subject: \`Order Cancelled: \${data.orderNumber} — Eman Threads\`,
        html,
      });
    }
  } catch (err) {
    console.error("[admin-alerts] Failed to send cancellation alert:", err);
  }
}