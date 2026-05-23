export type PaymentProviderName = "jazzcash" | "easypaisa" | "card" | "safepay";

export type PaymentStatus = "pending" | "initiated" | "success" | "failed" | "cancelled";

export interface InitiatePaymentRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
}

export interface InitiatePaymentResponse {
  success: boolean;
  redirectUrl?: string;
  transactionId?: string;
  error?: string;
}

export interface VerifyCallbackResult {
  success: boolean;
  transactionId: string;
  providerRef?: string;
  status: PaymentStatus;
  amount?: number;
  failureReason?: string;
}

export interface PaymentTransactionRecord {
  id: string;
  orderId: string;
  provider: PaymentProviderName;
  amount: number;
  currency: string;
  transactionRef?: string | null;
  status: PaymentStatus;
  gatewayResponse?: unknown;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}