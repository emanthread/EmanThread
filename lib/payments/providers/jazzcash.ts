import { BasePaymentProvider } from "./base";
import {
  type InitiatePaymentRequest,
  type InitiatePaymentResponse,
  type VerifyCallbackResult,
} from "../types";
import { jazzcashConfig, isSandbox } from "../config";
import { formatAmountForGateway, generateTxnRef, enforceHmac } from "../utils";

export class JazzCashProvider extends BasePaymentProvider {
  constructor() {
    super("jazzcash");
  }

  async initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    try {
      if (!jazzcashConfig.merchantId || !jazzcashConfig.integritySalt) {
        return {
          success: false,
          error: "JazzCash credentials not configured",
        };
      }

      const txnRef = generateTxnRef();
      const formattedAmount = formatAmountForGateway(request.amount);

      // In sandbox mode, return a mock redirect URL that simulates the gateway
      if (isSandbox) {
        const mockUrl = new URL(request.returnUrl);
        mockUrl.searchParams.set("pp_TxnRefNo", txnRef);
        mockUrl.searchParams.set("pp_Amount", formattedAmount);
        mockUrl.searchParams.set("pp_ResponseCode", "000");
        mockUrl.searchParams.set("pp_ResponseMessage", "Success");
        mockUrl.searchParams.set("pp_SecureHash", "sandbox-hash");

        return {
          success: true,
          redirectUrl: mockUrl.toString(),
          transactionId: txnRef,
        };
      }

      // Production: build real JazzCash payload
      const payload = {
        pp_MerchantID: jazzcashConfig.merchantId,
        pp_Password: jazzcashConfig.password,
        pp_TxnRefNo: txnRef,
        pp_Amount: formattedAmount,
        pp_TxnCurrency: "PKR",
        pp_TxnDateTime: new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14),
        pp_BillReference: request.orderNumber,
        pp_Description: `Order ${request.orderNumber}`,
        pp_CustomerEmail: request.customerEmail,
        pp_CustomerMobile: request.customerPhone,
        pp_ReturnURL: request.returnUrl,
      };

      // Generate secure hash
      const hash = this.generateHash(
        Object.entries(payload)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join("&"),
        jazzcashConfig.integritySalt
      );

      const formData = new URLSearchParams({ ...payload, pp_SecureHash: hash });

      // For JazzCash, we return a redirect URL that POSTs to their endpoint
      // In practice, the frontend would create a form and auto-submit
      const redirectUrl = `${jazzcashConfig.endpoint}?${formData.toString()}`;

      return {
        success: true,
        redirectUrl,
        transactionId: txnRef,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "JazzCash initiation failed",
      };
    }
  }

  async verifyCallback(payload: unknown): Promise<VerifyCallbackResult> {
    try {
      const data = payload as Record<string, string>;

      const txnRef = data.pp_TxnRefNo || "";
      const responseCode = data.pp_ResponseCode || "";
      const responseMessage = data.pp_ResponseMessage || "";

      const isValidHash =
        isSandbox ||
        data.pp_SecureHash ===
          this.generateHash(
            Object.entries(data)
              .filter(([k]) => k !== "pp_SecureHash")
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => `${k}=${v}`)
              .join("&"),
            jazzcashConfig.integritySalt
          );

      try {
        enforceHmac(isSandbox, isValidHash, "JazzCash");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "HMAC verification failed";
        return {
          success: false,
          transactionId: txnRef,
          status: "failed",
          failureReason: msg,
        };
      }

      // JazzCash response codes: 000 = success
      const isSuccess = responseCode === "000";

      return {
        success: isSuccess,
        transactionId: txnRef,
        providerRef: txnRef,
        status: isSuccess ? "success" : "failed",
        failureReason: isSuccess ? undefined : responseMessage,
      };
    } catch (error) {
      return {
        success: false,
        transactionId: "",
        status: "failed",
        failureReason: error instanceof Error ? error.message : "JazzCash callback verification failed",
      };
    }
  }
}