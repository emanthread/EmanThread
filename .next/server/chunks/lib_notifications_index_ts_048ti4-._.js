module.exports=[12592,e=>{"use strict";var r=e.i(89171),t=e.i(46245);class s{}var o=e.i(57074);let n="Eman Thread",a="https://www.emanthread.com/",d="#1a1a1a";function i(e,r){return`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${e}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;color:#333}
.container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.header{background:${d};padding:24px;text-align:center}
.header h1{color:#fff;margin:0;font-size:20px;font-weight:600;letter-spacing:1px}
.content{padding:32px 24px}
.footer{padding:20px 24px;background:#fafafa;text-align:center;font-size:12px;color:#888;border-top:1px solid #eee}
.btn{display:inline-block;padding:12px 24px;background:${d};color:#fff;text-decoration:none;border-radius:4px;font-weight:500;margin-top:16px}
.order-details{background:#f9f9f9;padding:16px;border-radius:6px;margin:16px 0}
.order-details p{margin:6px 0;font-size:14px}
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>${n.toUpperCase()}</h1></div>
  <div class="content">${r}</div>
  <div class="footer">
    <p>${n} — Premium Unstitched Fabric for Men</p>
    <p><a href="${a}">${a}</a></p>
  </div>
</div>
</body>
</html>`}let p={order_processing:{subject:"Your Eman Thread order is being processed",body:e=>i("Order Processing",`<h2>We're working on your order!</h2>
<p>Hi ${e.customerName||"there"},</p>
<p>Your order has been picked up and is now being processed. We'll notify you as soon as it ships.</p>
<div class="order-details">
  <p><strong>Order #:</strong> ${e.orderNumber}</p>
  <p><strong>Total:</strong> PKR ${e.total}</p>
  <p><strong>Payment Method:</strong> ${e.paymentMethod}</p>
</div>
<p>Thank you for choosing Eman Thread!</p>
<a href="${a}/order-status/${e.orderId||e.orderNumber}" class="btn">View Order</a>`)},order_confirmation:{subject:"Your Eman Thread order has been confirmed",body:e=>i("Order Confirmed",`<h2>Thank you for your order!</h2>
<p>Hi ${e.customerName||"there"},</p>
<p>We've received your order and are getting it ready for you.</p>
<div class="order-details">
  <p><strong>Order #:</strong> ${e.orderNumber}</p>
  <p><strong>Total:</strong> PKR ${e.total}</p>
  <p><strong>Payment Method:</strong> ${e.paymentMethod}</p>
</div>
<p>You'll receive another update when your order ships.</p>
<a href="${a}/order-status/${e.orderId||e.orderNumber}" class="btn">View Order</a>`)},payment_success:{subject:"Payment received for your Eman Thread order",body:e=>i("Payment Successful",`<h2>Payment Confirmed</h2>
<p>Hi ${e.customerName||"there"},</p>
<p>We've received your payment. Thank you!</p>
<div class="order-details">
  <p><strong>Order #:</strong> ${e.orderNumber}</p>
  <p><strong>Amount Paid:</strong> PKR ${e.total}</p>
  <p><strong>Transaction ID:</strong> ${e.transactionRef||"N/A"}</p>
</div>
<p>Your order is now being processed.</p>
<a href="${a}/order-status/${e.orderId||e.orderNumber}" class="btn">View Order</a>`)},order_shipped:{subject:"Your Eman Thread order has been shipped",body:e=>i("Order Shipped",`<h2>Your order is on its way!</h2>
<p>Hi ${e.customerName||"there"},</p>
<p>Great news — your order has been shipped.</p>
<div class="order-details">
  <p><strong>Order #:</strong> ${e.orderNumber}</p>
  <p><strong>Tracking #:</strong> ${e.trackingNumber||"N/A"}</p>
</div>
<p>Expected delivery: ${e.estimatedDelivery||"3-5 business days"}</p>`)},order_delivered:{subject:"Your Eman Thread order has been delivered",body:e=>i("Order Delivered",`<h2>Delivered!</h2>
<p>Hi ${e.customerName||"there"},</p>
<p>Your order has been delivered. We hope you love your purchase!</p>
<div class="order-details">
  <p><strong>Order #:</strong> ${e.orderNumber}</p>
</div>
<p>Questions? Reply to this email or contact us at support@emanthread.com</p>`)},order_cancelled:{subject:"Your Eman Thread order has been cancelled",body:e=>i("Order Cancelled",`<h2>Order Cancelled</h2>
<p>Hi ${e.customerName||"there"},</p>
<p>Your order has been cancelled as requested.</p>
<div class="order-details">
  <p><strong>Order #:</strong> ${e.orderNumber}</p>
  <p><strong>Reason:</strong> ${e.cancellationReason||"Customer request"}</p>
</div>
<p>If you have any questions, please contact us.</p>`)},return_request_submitted:{subject:"Return request received — Eman Thread",body:e=>i("Return Request Received",`<h2>Return Request Received</h2>
<p>Hi ${e.customerName||"there"},</p>
<p>We've received your ${e.requestType} request for order <strong>${e.orderNumber}</strong>.</p>
<div class="order-details">
  <p><strong>Reason:</strong> ${e.reason}</p>
  <p><strong>Request ID:</strong> ${e.requestId}</p>
</div>
<p>Our team will review and get back to you within 1-2 business days.</p>`)},return_request_approved:{subject:"Return request approved — Eman Thread",body:e=>i("Return Request Approved",`<h2>Return Request Approved</h2>
<p>Hi ${e.customerName||"there"},</p>
<p>Great news! Your ${e.requestType} request for order <strong>${e.orderNumber}</strong> has been approved.</p>
<div class="order-details">
  <p><strong>Request ID:</strong> ${e.requestId}</p>
  <p><strong>Next Steps:</strong> ${e.nextSteps}</p>
</div>
<p>We'll arrange a courier pickup shortly. Thank you for your patience.</p>`)},return_request_rejected:{subject:"Return request update — Eman Thread",body:e=>i("Return Request Rejected",`<h2>Return Request Rejected</h2>
<p>Hi ${e.customerName||"there"},</p>
<p>We reviewed your ${e.requestType} request for order <strong>${e.orderNumber}</strong> and unfortunately could not approve it at this time.</p>
<div class="order-details">
  <p><strong>Reason:</strong> ${e.rejectionReason}</p>
  <p><strong>Request ID:</strong> ${e.requestId}</p>
</div>
<p>If you have questions, please contact our support team.</p>`)},return_request_completed:{subject:"Return request completed — Eman Thread",body:e=>i("Return Request Completed",`<h2>Return Request Completed</h2>
<p>Hi ${e.customerName||"there"},</p>
<p>Your ${e.requestType} request for order <strong>${e.orderNumber}</strong> has been completed.</p>
<div class="order-details">
  <p><strong>Request ID:</strong> ${e.requestId}</p>
  <p><strong>Amount:</strong> PKR ${e.refundAmount||"0"}</p>
</div>
<p>${e.completionNote}</p>`)},low_stock_alert:{subject:"Low Stock Alert — Eman Thread",body:e=>i("Low Stock Alert",`<h2>Low Stock Alert</h2>
<p>The following product is running low on inventory:</p>
<div class="order-details">
  <p><strong>Product:</strong> ${e.productName}</p>
  <p><strong>SKU:</strong> ${e.sku}</p>
  <p><strong>Stock Remaining:</strong> ${e.stockQuantity}</p>
  <p><strong>Threshold:</strong> ${e.threshold}</p>
</div>
<p>Please restock soon to avoid out-of-stock issues.</p>`)}},u={order_processing:e=>`Eman Thread: Order ${e.orderNumber} is now being processed. We'll update you when it ships!`,order_confirmation:e=>`Eman Thread: Order ${e.orderNumber} confirmed. Total: PKR ${e.total}. Thank you for shopping with us!`,payment_success:e=>`Eman Thread: Payment received for order ${e.orderNumber}. Amount: PKR ${e.total}. Txn: ${e.transactionRef||"N/A"}`,order_shipped:e=>`Eman Thread: Order ${e.orderNumber} shipped. Tracking: ${e.trackingNumber||"N/A"}. Expected: ${e.estimatedDelivery||"3-5 days"}`,order_delivered:e=>`Eman Thread: Order ${e.orderNumber} delivered. Thank you for choosing us!`,order_cancelled:e=>`Eman Thread: Order ${e.orderNumber} cancelled. Reason: ${e.cancellationReason||"N/A"}`,return_request_submitted:e=>`Eman Thread: Return request received for order ${e.orderNumber}. Type: ${e.requestType}. Reason: ${e.reason}. We'll update you soon.`,return_request_approved:e=>`Eman Thread: Return request approved for order ${e.orderNumber}. A courier will pickup the item. Request ID: ${e.requestId}`,return_request_rejected:e=>`Eman Thread: Return request for order ${e.orderNumber} could not be approved. Reason: ${e.rejectionReason}. Contact support for help.`,return_request_completed:e=>`Eman Thread: Return request completed for order ${e.orderNumber}. Amount: PKR ${e.refundAmount||"0"}. ${e.completionNote}`,low_stock_alert:e=>`⚠️ Eman Thread: Low stock alert! ${e.productName} (SKU: ${e.sku}) has only ${e.stockQuantity} units left. Threshold: ${e.threshold}.`},c={order_processing:e=>`⚙️ *Eman Thread* — Order Processing

Order #: ${e.orderNumber}

Your order is being prepared. We'll notify you when it ships.`,order_confirmation:e=>`🧵 *Eman Thread* — Order Confirmed

Order #: ${e.orderNumber}
Total: PKR ${e.total}
Payment: ${e.paymentMethod}

We'll update you when it ships.`,payment_success:e=>`💳 *Eman Thread* — Payment Received

Order #: ${e.orderNumber}
Amount: PKR ${e.total}
Txn ID: ${e.transactionRef||"N/A"}

Thank you!`,order_shipped:e=>`🚚 *Eman Thread* — Order Shipped

Order #: ${e.orderNumber}
Tracking: ${e.trackingNumber||"N/A"}
Expected: ${e.estimatedDelivery||"3-5 days"}`,order_delivered:e=>`✅ *Eman Thread* — Delivered!

Order #: ${e.orderNumber}

We hope you love your purchase. Reply for support.`,order_cancelled:e=>`❌ *Eman Thread* — Order Cancelled

Order #: ${e.orderNumber}
Reason: ${e.cancellationReason||"N/A"}

Contact us if you need help.`,return_request_submitted:e=>`🔄 *Eman Thread* — Return Request Received

Order #: ${e.orderNumber}
Type: ${e.requestType}
Reason: ${e.reason}
Request ID: ${e.requestId}

We'll review and update you shortly.`,return_request_approved:e=>`✅ *Eman Thread* — Return Approved

Order #: ${e.orderNumber}
Request ID: ${e.requestId}

A courier will pickup the item. Thank you!`,return_request_rejected:e=>`❌ *Eman Thread* — Return Request Rejected

Order #: ${e.orderNumber}
Reason: ${e.rejectionReason}

Contact support@emanthread.com for help.`,return_request_completed:e=>`✅ *Eman Thread* — Return Completed

Order #: ${e.orderNumber}
Amount: PKR ${e.refundAmount||"0"}

${e.completionNote}`,low_stock_alert:e=>`⚠️ *Eman Thread* — Low Stock Alert

Product: ${e.productName}
SKU: ${e.sku}
Stock: ${e.stockQuantity} left
Threshold: ${e.threshold}

Please restock soon.`},l=new Set(["1","2","3","4","5","6","-6","7","8","9","11"]);async function m(e){return new Promise(r=>setTimeout(r,e))}var h=e.i(62294);let f=new class extends s{channel="email";client;constructor(){super(),o.resendConfig.apiKey?this.client=new t.Resend(o.resendConfig.apiKey):(console.warn("[ResendProvider] Missing RESEND_API_KEY — emails disabled"),this.client=null)}async send(e){if(!this.client)return{success:!1,error:"Resend API key not configured"};try{let r=p[e.template];if(!r)return{success:!1,error:`Unknown template: ${e.template}`};let t=r.body(e.data),{data:s,error:n}=await this.client.emails.send({from:o.resendConfig.fromEmail,to:e.to,subject:r.subject,html:t});if(n)return{success:!1,error:n.message};return{success:!0,providerRef:s?.id}}catch(e){return{success:!1,error:e instanceof Error?e.message:"Resend send failed"}}}},g=new class extends s{channel="whatsapp";async send(e){try{let r=o.whatsappTemplateNames[e.template];if(!r)return{success:!1,error:`Unknown template: ${e.template}`};let{apiKey:t,phoneNumberId:s,apiVersion:n}=o.whatsappConfig;if(!t||!s)return{success:!1,error:"WhatsApp Business API not configured"};let a=e.to.replace(/\D/g,"");a.startsWith("0")?a="92"+a.slice(1):a.startsWith("92")||(a="92"+a);let d=`https://graph.facebook.com/${n}/${s}/messages`,i=Object.entries(e.data).map(([e,r])=>({type:"text",text:r})),p=await fetch(d,{method:"POST",headers:{Authorization:`Bearer ${t}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to:a,type:"template",template:{name:r,language:{code:"en"},components:[{type:"body",parameters:i.slice(0,10)}]}})}),u=await p.json();if(!p.ok)return{success:!1,error:u.error?.message||`WhatsApp API error: ${p.status}`};return{success:!0,providerRef:u.messages?.[0]?.id}}catch(e){return{success:!1,error:e instanceof Error?e.message:"WhatsApp send failed"}}}},y="sendpk"===o.smsConfig.provider?new class extends s{channel="sms";async send(e){try{let{apiToken:r,senderId:t,sender:s}=o.smsConfig.sendpk;if(!r&&(!o.smsConfig.sendpk.username||!o.smsConfig.sendpk.password))return{success:!1,error:"SendPK credentials not configured"};let n=o.sendpkTemplateIds[e.template];if(!n)return{success:!1,error:`No SendPK template ID configured for ${e.template}`};let a=(e.phone||e.to).replace(/\D/g,"");if(a.startsWith("0")?a="92"+a.slice(1):a.startsWith("92")||(a="92"+a),a.length<10)return{success:!1,error:`Invalid phone number: ${e.phone||e.to}`};let d=function(e,r){let t=o.sendpkTemplateFields[e]||[],s=o.sendpkVariableMap[e]||{},n={};for(let e of t){let t=Object.keys(s).find(r=>s[r]===e);t&&r[t]?n[e]=r[t]:r[e]&&(n[e]=r[e])}for(let[e,t]of Object.entries(s))r[e]&&!n[t]&&(n[t]=r[e]);return JSON.stringify(n)}(e.template,e.data),i=new URLSearchParams;r?i.set("api_key",r):(i.set("username",o.smsConfig.sendpk.username),i.set("password",o.smsConfig.sendpk.password)),i.set("sender",t||s||"EmanThread"),i.set("mobile",a),i.set("template_id",n),i.set("message",d);let p=null;for(let e=1;e<=3;e++)try{let r=await fetch(`http://sendpk.com/api/sms.php?${i.toString()}`,{signal:AbortSignal.timeout(15e3)}),t=(await r.text()).trim();if(t.startsWith("OK")){let e=t.includes(":")?t.split(":")[1]?.trim():t;return{success:!0,providerRef:e||t}}let s=null;try{s=JSON.parse(t)}catch{}if(s?.success==="true"||s?.success===!0){let e=s?.results?.[0]?.messageid||s?.results?.[0]?.id;return{success:!0,providerRef:e}}let o=s?.results?.[0]?.status??t;if(l.has(o)||l.has(t)){let e=s?.results?.[0]?.error||o||t;return{success:!1,error:`SendPK: ${e}`}}p=s?.results?.[0]?.error||t,e<3&&await m(1e3*Math.pow(2,e-1))}catch(r){p=r instanceof Error?r.message:"SendPK send failed",e<3&&await m(1e3*Math.pow(2,e-1))}return{success:!1,error:p||"SendPK max retries exceeded"}}catch(e){return{success:!1,error:e instanceof Error?e.message:"SendPK send failed"}}}}:new class extends s{channel="sms";async send(e){try{let r=u[e.template];if(!r)return{success:!1,error:`Unknown template: ${e.template}`};let t=r(e.data),{endpoint:s,apiKey:n,sender:a}=o.smsConfig.pakistan;if(!s||!n)return{success:!1,error:"Pakistan SMS gateway not configured"};let d=(e.phone||e.to).replace(/\D/g,"");if(d.startsWith("0")?d="92"+d.slice(1):d.startsWith("92")||(d="92"+d),d.length<10)return{success:!1,error:`Invalid phone number: ${e.phone||e.to}`};let i=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({to:d,from:a||"EmanThreads",message:t})}),p=await i.json().catch(()=>({}));if(!i.ok)return{success:!1,error:p.message||`SMS gateway error: ${i.status}`};return{success:!0,providerRef:p.id||p.reference}}catch(e){return{success:!1,error:e instanceof Error?e.message:"Pakistan SMS send failed"}}}};async function b(e,r,t){if(e.orderId)try{await h.prisma.notificationLog.create({data:{orderId:e.orderId,channel:r,template:e.template,recipient:e.to,subject:"email"===r?p[e.template]?.subject??null:null,content:"email"===r?p[e.template]?.body(e.data):"sms"===r?u[e.template]?.(e.data):c[e.template]?.(e.data),status:t.success?"sent":"failed",providerRef:t.providerRef??null,errorMessage:t.error??null}})}catch(e){console.error("[notifications] Failed to persist notification log:",e)}}async function $(e){try{return await y.send(e)}catch(e){return{success:!1,error:e instanceof Error?e.message:"SMS provider threw unexpectedly"}}}async function v(e,r,t=2){for(let s=1;s<=t;s++)try{return await e.send(r)}catch(e){if(s===t)return{success:!1,error:e instanceof Error?e.message:"Provider threw"};await new Promise(e=>setTimeout(e,1e3*s))}return{success:!1,error:"Max retries exceeded"}}(0,o.assertSMSServerlessSafe)(),e.s(["triggerNotification",0,function(e){(0,r.after)(async()=>{try{let r=e.to.includes("@"),t=e.phone||(r?void 0:e.to),s=!!t?.trim();if(e.orderId&&e.data&&!e.data.orderId&&(e.data.orderId=e.orderId),e.channels&&e.channels.length>0){let t=[];for(let r of e.channels){let s;if("email"===r)s=await v(f,e);else{let t=e.phone||(e.to.includes("@")?void 0:e.to);s=!t||t.includes("@")?{success:!1,error:`Invalid phone number for ${r} channel`}:"whatsapp"===r?await v(g,{...e,to:t}):await $({...e,to:t})}await b(e,r,s),t.push({channel:r,result:s})}if(t.some(e=>"sms"===e.channel&&!e.result.success)&&r){console.warn("[notifications] SMS failed for order, falling back to email:",t.find(e=>"sms"===e.channel)?.result.error);let r=await v(f,e);await b(e,"email",r)}return}if(s||console.log("[notifications] No phone number available — SMS/WhatsApp will be skipped for order",e.orderId,"(to:",e.to,"phone:",e.phone||"none",")"),o.notificationDefaults.smsEnabled||console.warn("[notifications] SMS is DISABLED via configuration (NOTIFICATION_SMS_ENABLED is not 'true'). Set NOTIFICATION_SMS_ENABLED=true in environment variables to enable SMS."),r){let r=await v(f,e);await b(e,"email",r),r.success||console.error("[notifications] Email delivery failed:",r.error)}if(s){let r=!!o.whatsappConfig.apiKey&&!!o.whatsappConfig.phoneNumberId,s=!1;if(r&&o.notificationDefaults.enabledChannels.includes("whatsapp")){let r=await v(g,{...e,to:t});await b({...e,to:t},"whatsapp",r),r.success?s=!0:console.warn("[notifications] WhatsApp delivery failed, falling back to SMS:",r.error)}if(!s&&o.notificationDefaults.smsEnabled){let r=await $({...e,to:t});await b({...e,to:t},"sms",r),r.success||console.error("[notifications] SMS delivery failed:",r.error)}}}catch(e){console.error("[notifications] Orchestrator crashed:",e)}})}],12592)}];

//# sourceMappingURL=lib_notifications_index_ts_048ti4-._.js.map