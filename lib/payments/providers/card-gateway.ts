import { BasePaymentProvider } from "./base";
import {
  type InitiatePaymentRequest,
  type InitiatePaymentResponse,
  type VerifyCallbackResult,
} from "../types";
import { cardGatewayConfig, isSandbox } from "../config";
import { generateTxnRef, enforceHmac } from "../utils";

export class CardGatewayProvider extends BasePaymentProvider {
  constructor() {
    super("card");
  }

  async initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    try {
      if (!cardGatewayConfig.merchantId || !cardGatewayConfig.apiKey) {
        return {
          success: false,
          error: "Card gateway credentials not configured",
        };
      }

      const txnRef = generateTxnRef();

      if (isSandbox) {
        const mockUrl = new URL(request.returnUrl);
        mockUrl.searchParams.set("transaction_id", txnRef);
        mockUrl.searchParams.set("order_id", request.orderId);
        mockUrl.searchParams.set("amount", request.amount.toString());
        mockUrl.searchParams.set("status", "success");
        mockUrl.searchParams.set("message", "Payment successful");
        mockUrl.searchParams.set("signature", "sandbox-signature");

        return {
          success: true,
          redirectUrl: mockUrl.toString(),
          transactionId: txnRef,
        };
      }

      const payload = {
        merchant_id: cardGatewayConfig.merchantId,
        api_key: cardGatewayConfig.apiKey,
        transaction_id: txnRef,
        order_id: request.orderId,
        order_number: request.orderNumber,
        amount: request.amount.toString(),
        currency: "PKR",
        customer_email: request.customerEmail,
        customer_phone: request.customerPhone,
        return_url: request.returnUrl,
        description: `Order ${request.orderNumber}`,
      };

      const signature = this.generateHash(
        Object.entries(payload)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join("&"),
        cardGatewayConfig.apiKey
      );

      const redirectUrl = `${cardGatewayConfig.endpoint}/checkout?${new URLSearchParams({
        ...payload,
        signature,
      }).toString()}`;

      return {
        success: true,
        redirectUrl,
        transactionId: txnRef,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Card gateway initiation failed",
      };
    }
  }

  async verifyCallback(payload: unknown): Promise<VerifyCallbackResult> {
    try {
      const data = payload as Record<string, string>;

      const txnRef = data.transaction_id || "";
      const status = data.status || "";
      const message = data.message || "";

      const isValidSignature =
        isSandbox ||
        data.signature ===
          this.generateHash(
            Object.entries(data)
              .filter(([k]) => k !== "signature")
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => `${k}=${v}`)
              .join("&"),
            cardGatewayConfig.apiKey
          );

      try {
        enforceHmac(isSandbox, isValidSignature, "card-gateway");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "HMAC verification failed";
        return {
          success: false,
          transactionId: txnRef,
          status: "failed",
          failureReason: msg,
        };
      }

      const isSuccess = status.toLowerCase() === "success";

      return {
        success: isSuccess,
        transactionId: txnRef,
        providerRef: txnRef,
        status: isSuccess ? "success" : "failed",
        failureReason: isSuccess ? undefined : message,
      };
    } catch (error) {
      return {
        success: false,
        transactionId: "",
        status: "failed",
        failureReason: error instanceof Error ? error.message : "Card gateway callback verification failed",
      };
    }
  }
}