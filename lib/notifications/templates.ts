// ── Notification message templates ───────────────────────────────

import type { NotificationTemplate } from "./types";

interface EmailTemplateDef {
  subject: string;
  body: (data: Record<string, string>) => string;
}

const brandName = "Eman Thread";
const brandUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
const brandColor = "#1a1a1a";

function emailWrapper(title: string, content: string): string {
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
.btn{display:inline-block;padding:12px 24px;background:${brandColor};color:#fff;text-decoration:none;border-radius:4px;font-weight:500;margin-top:16px}
.order-details{background:#f9f9f9;padding:16px;border-radius:6px;margin:16px 0}
.order-details p{margin:6px 0;font-size:14px}
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>${brandName.toUpperCase()}</h1></div>
  <div class="content">${content}</div>
  <div class="footer">
    <p>${brandName} — Premium Unstitched Fabric for Men</p>
    <p><a href="${brandUrl}">${brandUrl}</a></p>
  </div>
</div>
</body>
</html>`;
}

export const EmailTemplates: Record<NotificationTemplate, EmailTemplateDef> = {
  order_processing: {
    subject: "Your Eman Thread order is being processed",
    body: (data) =>
      emailWrapper(
        "Order Processing",
        `<h2>We're working on your order!</h2>
<p>Hi ${data.customerName || "there"},</p>
<p>Your order has been picked up and is now being processed. We'll notify you as soon as it ships.</p>
<div class="order-details">
  <p><strong>Order #:</strong> ${data.orderNumber}</p>
  <p><strong>Total:</strong> PKR ${data.total}</p>
  <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
</div>
<p>Thank you for choosing Eman Thread!</p>
<a href="${data.orderId ? `${brandUrl}/order-status/${data.orderId}` : `${brandUrl}/account/orders`}" class="btn">View Order</a>`
      ),
  },
  order_confirmation: {
    subject: "Your Eman Thread order has been confirmed",
    body: (data) =>
      emailWrapper(
        "Order Confirmed",
        `<h2>Thank you for your order!</h2>
<p>Hi ${data.customerName || "there"},</p>
<p>We've received your order and are getting it ready for you.</p>
<div class="order-details">
  <p><strong>Order #:</strong> ${data.orderNumber}</p>
  <p><strong>Total:</strong> PKR ${data.total}</p>
  <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
</div>
<p>You'll receive another update when your order ships.</p>
<a href="${data.orderId ? `${brandUrl}/order-status/${data.orderId}` : `${brandUrl}/account/orders`}" class="btn">View Order</a>`
      ),
  },
  payment_success: {
    subject: "Payment received for your Eman Thread order",
    body: (data) =>
      emailWrapper(
        "Payment Successful",
        `<h2>Payment Confirmed</h2>
<p>Hi ${data.customerName || "there"},</p>
<p>We've received your payment. Thank you!</p>
<div class="order-details">
  <p><strong>Order #:</strong> ${data.orderNumber}</p>
  <p><strong>Amount Paid:</strong> PKR ${data.total}</p>
  <p><strong>Transaction ID:</strong> ${data.transactionRef || "N/A"}</p>
</div>
<p>Your order is now being processed.</p>
<a href="${data.orderId ? `${brandUrl}/order-status/${data.orderId}` : `${brandUrl}/account/orders`}" class="btn">View Order</a>`
      ),
  },
  order_shipped: {
    subject: "Your Eman Thread order has been shipped",
    body: (data) =>
      emailWrapper(
        "Order Shipped",
        `<h2>Your order is on its way!</h2>
<p>Hi ${data.customerName || "there"},</p>
<p>Great news — your order has been shipped.</p>
<div class="order-details">
  <p><strong>Order #:</strong> ${data.orderNumber}</p>
  <p><strong>Tracking #:</strong> ${data.trackingNumber || "N/A"}</p>
</div>
<p>Expected delivery: ${data.estimatedDelivery || "3-5 business days"}</p>`
      ),
  },
  order_delivered: {
    subject: "Your Eman Thread order has been delivered",
    body: (data) =>
      emailWrapper(
        "Order Delivered",
        `<h2>Delivered!</h2>
<p>Hi ${data.customerName || "there"},</p>
<p>Your order has been delivered. We hope you love your purchase!</p>
<div class="order-details">
  <p><strong>Order #:</strong> ${data.orderNumber}</p>
</div>
<p>Questions? Reply to this email or contact us at support@emanthread.com</p>`
      ),
  },
  order_cancelled: {
    subject: "Your Eman Thread order has been cancelled",
    body: (data) =>
      emailWrapper(
        "Order Cancelled",
        `<h2>Order Cancelled</h2>
<p>Hi ${data.customerName || "there"},</p>
<p>Your order has been cancelled as requested.</p>
<div class="order-details">
  <p><strong>Order #:</strong> ${data.orderNumber}</p>
  <p><strong>Reason:</strong> ${data.cancellationReason || "Customer request"}</p>
</div>
<p>If you have any questions, please contact us.</p>`
      ),
  },
  return_request_submitted: {
    subject: "Return request received — Eman Thread",
    body: (data) =>
      emailWrapper(
        "Return Request Received",
        `<h2>Return Request Received</h2>
<p>Hi ${data.customerName || "there"},</p>
<p>We've received your ${data.requestType} request for order <strong>${data.orderNumber}</strong>.</p>
<div class="order-details">
  <p><strong>Reason:</strong> ${data.reason}</p>
  <p><strong>Request ID:</strong> ${data.requestId}</p>
</div>
<p>Our team will review and get back to you within 1-2 business days.</p>`
      ),
  },
  return_request_approved: {
    subject: "Return request approved — Eman Thread",
    body: (data) =>
      emailWrapper(
        "Return Request Approved",
        `<h2>Return Request Approved</h2>
<p>Hi ${data.customerName || "there"},</p>
<p>Great news! Your ${data.requestType} request for order <strong>${data.orderNumber}</strong> has been approved.</p>
<div class="order-details">
  <p><strong>Request ID:</strong> ${data.requestId}</p>
  <p><strong>Next Steps:</strong> ${data.nextSteps}</p>
</div>
<p>We'll arrange a courier pickup shortly. Thank you for your patience.</p>`
      ),
  },
  return_request_rejected: {
    subject: "Return request update — Eman Thread",
    body: (data) =>
      emailWrapper(
        "Return Request Rejected",
        `<h2>Return Request Rejected</h2>
<p>Hi ${data.customerName || "there"},</p>
<p>We reviewed your ${data.requestType} request for order <strong>${data.orderNumber}</strong> and unfortunately could not approve it at this time.</p>
<div class="order-details">
  <p><strong>Reason:</strong> ${data.rejectionReason}</p>
  <p><strong>Request ID:</strong> ${data.requestId}</p>
</div>
<p>If you have questions, please contact our support team.</p>`
      ),
  },
  return_request_completed: {
    subject: "Return request completed — Eman Thread",
    body: (data) =>
      emailWrapper(
        "Return Request Completed",
        `<h2>Return Request Completed</h2>
<p>Hi ${data.customerName || "there"},</p>
<p>Your ${data.requestType} request for order <strong>${data.orderNumber}</strong> has been completed.</p>
<div class="order-details">
  <p><strong>Request ID:</strong> ${data.requestId}</p>
  <p><strong>Amount:</strong> PKR ${data.refundAmount || "0"}</p>
</div>
<p>${data.completionNote}</p>`
      ),
  },
  low_stock_alert: {
    subject: "Low Stock Alert — Eman Thread",
    body: (data) =>
      emailWrapper(
        "Low Stock Alert",
        `<h2>Low Stock Alert</h2>
<p>The following product is running low on inventory:</p>
<div class="order-details">
  <p><strong>Product:</strong> ${data.productName}</p>
  <p><strong>SKU:</strong> ${data.sku}</p>
  <p><strong>Stock Remaining:</strong> ${data.stockQuantity}</p>
  <p><strong>Threshold:</strong> ${data.threshold}</p>
</div>
<p>Please restock soon to avoid out-of-stock issues.</p>`
      ),
  },
};

export const SMSTemplates: Record<
  NotificationTemplate,
  (data: Record<string, string>) => string
> = {
  order_processing: (data) =>
    `Eman Thread: Order ${data.orderNumber} is now being processed. We'll update you when it ships!`,
  order_confirmation: (data) =>
    `Eman Thread: Order ${data.orderNumber} confirmed. Total: PKR ${data.total}. Thank you for shopping with us!`,
  payment_success: (data) =>
    `Eman Thread: Payment received for order ${data.orderNumber}. Amount: PKR ${data.total}. Txn: ${data.transactionRef || "N/A"}`,
  order_shipped: (data) =>
    `Eman Thread: Order ${data.orderNumber} shipped. Tracking: ${data.trackingNumber || "N/A"}. Expected: ${data.estimatedDelivery || "3-5 days"}`,
  order_delivered: (data) =>
    `Eman Thread: Order ${data.orderNumber} delivered. Thank you for choosing us!`,
  order_cancelled: (data) =>
    `Eman Thread: Order ${data.orderNumber} cancelled. Reason: ${data.cancellationReason || "N/A"}`,
  return_request_submitted: (data) =>
    `Eman Thread: Return request received for order ${data.orderNumber}. Type: ${data.requestType}. Reason: ${data.reason}. We'll update you soon.`,
  return_request_approved: (data) =>
    `Eman Thread: Return request approved for order ${data.orderNumber}. A courier will pickup the item. Request ID: ${data.requestId}`,
  return_request_rejected: (data) =>
    `Eman Thread: Return request for order ${data.orderNumber} could not be approved. Reason: ${data.rejectionReason}. Contact support for help.`,
  return_request_completed: (data) =>
    `Eman Thread: Return request completed for order ${data.orderNumber}. Amount: PKR ${data.refundAmount || "0"}. ${data.completionNote}`,
  low_stock_alert: (data) =>
    `⚠️ Eman Thread: Low stock alert! ${data.productName} (SKU: ${data.sku}) has only ${data.stockQuantity} units left. Threshold: ${data.threshold}.`,
};

export const WhatsAppTemplates: Record<
  NotificationTemplate,
  (data: Record<string, string>) => string
> = {
  order_processing: (data) =>
    `⚙️ *Eman Thread* — Order Processing\n\nOrder #: ${data.orderNumber}\n\nYour order is being prepared. We'll notify you when it ships.`,
  order_confirmation: (data) =>
    `🧵 *Eman Thread* — Order Confirmed\n\nOrder #: ${data.orderNumber}\nTotal: PKR ${data.total}\nPayment: ${data.paymentMethod}\n\nWe'll update you when it ships.`,
  payment_success: (data) =>
    `💳 *Eman Thread* — Payment Received\n\nOrder #: ${data.orderNumber}\nAmount: PKR ${data.total}\nTxn ID: ${data.transactionRef || "N/A"}\n\nThank you!`,
  order_shipped: (data) =>
    `🚚 *Eman Thread* — Order Shipped\n\nOrder #: ${data.orderNumber}\nTracking: ${data.trackingNumber || "N/A"}\nExpected: ${data.estimatedDelivery || "3-5 days"}`,
  order_delivered: (data) =>
    `✅ *Eman Thread* — Delivered!\n\nOrder #: ${data.orderNumber}\n\nWe hope you love your purchase. Reply for support.`,
  order_cancelled: (data) =>
    `❌ *Eman Thread* — Order Cancelled\n\nOrder #: ${data.orderNumber}\nReason: ${data.cancellationReason || "N/A"}\n\nContact us if you need help.`,
  return_request_submitted: (data) =>
    `🔄 *Eman Thread* — Return Request Received\n\nOrder #: ${data.orderNumber}\nType: ${data.requestType}\nReason: ${data.reason}\nRequest ID: ${data.requestId}\n\nWe'll review and update you shortly.`,
  return_request_approved: (data) =>
    `✅ *Eman Thread* — Return Approved\n\nOrder #: ${data.orderNumber}\nRequest ID: ${data.requestId}\n\nA courier will pickup the item. Thank you!`,
  return_request_rejected: (data) =>
    `❌ *Eman Thread* — Return Request Rejected\n\nOrder #: ${data.orderNumber}\nReason: ${data.rejectionReason}\n\nContact support@emanthread.com for help.`,
  return_request_completed: (data) =>
    `✅ *Eman Thread* — Return Completed\n\nOrder #: ${data.orderNumber}\nAmount: PKR ${data.refundAmount || "0"}\n\n${data.completionNote}`,
  low_stock_alert: (data) =>
    `⚠️ *Eman Thread* — Low Stock Alert\n\nProduct: ${data.productName}\nSKU: ${data.sku}\nStock: ${data.stockQuantity} left\nThreshold: ${data.threshold}\n\nPlease restock soon.`,
};