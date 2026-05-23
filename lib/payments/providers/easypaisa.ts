import { BasePaymentProvider } from "./base";
import {
  type InitiatePaymentRequest,
  type InitiatePaymentResponse,
  type VerifyCallbackResult,
} from "../types";
import { easypaisaConfig, isSandbox } from "../config";
import { generateTxnRef, enforceHmac } from "../utils";

export class EasypaisaProvider extends BasePaymentProvider {
  constructor() {
    super("easypaisa");
  }

  async initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    try {
      if (!easypaisaConfig.storeId || !easypaisaConfig.hashKey) {
        return {
          success: false,
          error: "Easypaisa credentials not configured",
        };
      }

      const txnRef = generateTxnRef();

      if (isSandbox) {
        const mockUrl = new URL(request.returnUrl);
        mockUrl.searchParams.set("orderId", request.orderId);
        mockUrl.searchParams.set("transactionRefNo", txnRef);
        mockUrl.searchParams.set("amount", request.amount.toString());
        mockUrl.searchParams.set("responseCode", "0000");
        mockUrl.searchParams.set("responseDesc", "SUCCESS");
        mockUrl.searchParams.set("secureHash", "sandbox-hash");

        return {
          success: true,
          redirectUrl: mockUrl.toString(),
          transactionId: txnRef,
        };
      }

      const payload = {
        storeId: easypaisaConfig.storeId,
        amount: request.amount.toString(),
        orderRefNum: request.orderNumber,
        paymentMethod: "MWALLET_ACCOUNT",
        redirectURL: request.returnUrl,
        transactionRef: txnRef,
        customerEmail: request.customerEmail,
        customerMobile: request.customerPhone,
        description: `Order ${request.orderNumber}`,
      };

      const hash = this.generateHash(
        Object.entries(payload)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join("&"),
        easypaisaConfig.hashKey
      );

      const redirectUrl = `${easypaisaConfig.endpoint}?${new URLSearchParams({
        ...payload,
        secureHash: hash,
      }).toString()}`;

      return {
        success: true,
        redirectUrl,
        transactionId: txnRef,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Easypaisa initiation failed",
      };
    }
  }

  async verifyCallback(payload: unknown): Promise<VerifyCallbackResult> {
    try {
      const data = payload as Record<string, string>;

      const txnRef = data.transactionRefNo || "";
      const responseCode = data.responseCode || "";
      const responseDesc = data.responseDesc || "";

      const isValidHash =
        isSandbox ||
        data.secureHash ===
          this.generateHash(
            Object.entries(data)
              .filter(([k]) => k !== "secureHash")
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => `${k}=${v}`)
              .join("&"),
            easypaisaConfig.hashKey
          );

      try {
        enforceHmac(isSandbox, isValidHash, "Easypaisa");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "HMAC verification failed";
        return {
          success: false,
          transactionId: txnRef,
          status: "failed",
          failureReason: msg,
        };
      }

      // Easypaisa: 0000 = success
      const isSuccess = responseCode === "0000";

      return {
        success: isSuccess,
        transactionId: txnRef,
        providerRef: txnRef,
        status: isSuccess ? "success" : "failed",
        failureReason: isSuccess ? undefined : responseDesc,
      };
    } catch (error) {
      return {
        success: false,
        transactionId: "",
        status: "failed",
        failureReason: error instanceof Error ? error.message : "Easypaisa callback verification failed",
      };
    }
  }
}