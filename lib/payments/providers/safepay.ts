import { BasePaymentProvider } from "./base";
import {
  type InitiatePaymentRequest,
  type InitiatePaymentResponse,
  type VerifyCallbackResult,
} from "../types";
import { safepayConfig, isSandbox } from "../config";
import { generateTxnRef } from "../utils";
import { createHmac } from "crypto";

export class SafepayProvider extends BasePaymentProvider {
  constructor() {
    super("safepay");
  }

  async initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    try {
      if (!safepayConfig.secretKey || !safepayConfig.publicKey) {
        return {
          success: false,
          error: "Safepay credentials not configured",
        };
      }

      // Step 1: Create a payment tracker on Safepay's server
      const trackerPayload = {
        client: safepayConfig.publicKey,
        amount: request.amount,
        currency: "PKR",
        environment: isSandbox ? "sandbox" : "production",
      };

      // 10-second timeout to prevent hanging on degraded gateway
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      let trackerRes: Response;
      try {
        trackerRes = await fetch(`${safepayConfig.apiBase}/order/v1/init`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(trackerPayload),
          signal: controller.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        const isAbort = fetchErr instanceof DOMException && fetchErr.name === "AbortError";
        return {
          success: false,
          error: isAbort ? "Payment gateway timed out. Please try again." : "Safepay connection failed",
        };
      } finally {
        clearTimeout(timeoutId);
      }

      if (!trackerRes.ok) {
        const errText = await trackerRes.text();
        console.error(`[Safepay] Tracker creation failed (${trackerRes.status}):`, errText);
        return {
          success: false,
          error: `Safepay tracker creation failed: ${trackerRes.status}`,
        };
      }

      const trackerData = await trackerRes.json();
      const trackerToken: string = 
        trackerData?.data?.token || 
        trackerData?.token || 
        "";

      if (!trackerToken) {
        console.error("[Safepay] No tracker token in response:", JSON.stringify(trackerData));
        return {
          success: false,
          error: "Safepay did not return a tracker token",
        };
      }

      // Step 2: Extract the hosted checkout redirect URL from response
      let checkoutUrlString = 
        trackerData?.data?.checkout_url || 
        trackerData?.checkout_url ||
        trackerData?.data?.payment_url ||
        trackerData?.payment_url;

      if (!checkoutUrlString) {
        // Fallback to manual construction if not provided (for safety)
        const fallbackUrl = new URL(`${safepayConfig.checkoutBase}/checkout/render`);
        fallbackUrl.searchParams.set("env", isSandbox ? "sandbox" : "production");
        fallbackUrl.searchParams.set("beacon", trackerToken);
        fallbackUrl.searchParams.set("source", "custom");
        fallbackUrl.searchParams.set("order_id", request.orderNumber);
        fallbackUrl.searchParams.set("redirect_url", request.returnUrl);
        fallbackUrl.searchParams.set("cancel_url", request.returnUrl);
        checkoutUrlString = fallbackUrl.toString();
      } else {
        // Optionally append return URLs to the provided checkout URL if needed
        const urlObj = new URL(checkoutUrlString);
        if (!urlObj.searchParams.has("redirect_url")) {
          urlObj.searchParams.set("redirect_url", request.returnUrl);
        }
        if (!urlObj.searchParams.has("cancel_url")) {
          urlObj.searchParams.set("cancel_url", request.returnUrl);
        }
        if (!urlObj.searchParams.has("order_id")) {
          urlObj.searchParams.set("order_id", request.orderNumber);
        }
        checkoutUrlString = urlObj.toString();
      }

      return {
        success: true,
        redirectUrl: checkoutUrlString,
        transactionId: trackerToken,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Safepay initiation failed",
      };
    }
  }

  async verifyCallback(payload: unknown): Promise<VerifyCallbackResult> {
    try {
      const data = payload as Record<string, string>;

      // Safepay sends: tracker_token, reference_number, order_id, status, sig
      const trackerToken = data.tracker || data.tracker_token || "";
      const reference = data.reference_number || data.ref || "";
      const status = data.status || "";
      const signature = data.sig || data.signature || "";

      // Verify HMAC signature (skip in sandbox)
      const isValidSig = isSandbox || this.verifySignature(data, signature, safepayConfig.secretKey);

      if (!isSandbox && !isValidSig) {
        return {
          success: false,
          transactionId: trackerToken,
          status: "failed",
          failureReason: "Safepay signature verification failed",
        };
      }

      // Safepay success status is "S" (Success) or "PAID"
      const isSuccess = status === "S" || status === "PAID" || status === "success";

      return {
        success: isSuccess,
        transactionId: trackerToken,
        providerRef: reference || trackerToken,
        status: isSuccess ? "success" : "failed",
        failureReason: isSuccess ? undefined : `Safepay status: ${status}`,
      };
    } catch (error) {
      return {
        success: false,
        transactionId: "",
        status: "failed",
        failureReason: error instanceof Error ? error.message : "Safepay callback verification failed",
      };
    }
  }

  /**
   * Verify Safepay webhook/callback HMAC signature.
   * Safepay signs payloads using HMAC-SHA256 with the merchant secret key.
   */
  private verifySignature(
    payload: Record<string, string>,
    receivedSig: string,
    secret: string
  ): boolean {
    try {
      // Build canonical string: sorted key=value pairs joined by &
      const canonical = Object.keys(payload)
        .filter((k) => k !== "sig" && k !== "signature")
        .sort()
        .map((k) => `${k}=${payload[k]}`)
        .join("&");

      const expectedSig = createHmac("sha256", secret)
        .update(canonical)
        .digest("hex");

      return expectedSig === receivedSig;
    } catch {
      return false;
    }
  }
}
