import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Simple Safepay Webhook Testing Endpoint
 * URL: /api/safepay-test-webhook
 * 
 * This endpoint is designed for testing Safepay webhooks.
 * It logs the payload and signature to the console and returns 200 OK.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-sfpy-signature");

    console.log("--- Safepay Webhook Received ---");
    console.log("Time:", new Date().toISOString());
    console.log("Signature:", signature || "No signature found");
    
    let payload;
    try {
      payload = JSON.parse(rawBody);
      console.log("Payload:", JSON.stringify(payload, null, 2));
    } catch (e) {
      console.log("Raw Body (Not JSON):", rawBody);
    }
    console.log("--------------------------------");

    return NextResponse.json({ 
      status: "received", 
      message: "Webhook processed successfully for testing" 
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error processing Safepay webhook:", error);
    return NextResponse.json({ 
      status: "error", 
      message: "Internal Server Error" 
    }, { status: 500 });
  }
}

/**
 * Health check for the webhook endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "active",
    endpoint: "Safepay Test Webhook",
    instructions: "Point your Safepay sandbox webhook to this URL /api/safepay-test-webhook"
  });
}
