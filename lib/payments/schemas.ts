import { z } from "zod";

export const initiatePaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  orderNumber: z.string().min(1, "Order number is required"),
  amount: z.number().positive("Amount must be positive"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().min(1, "Phone is required"),
  provider: z.enum(["jazzcash", "easypaisa", "card", "safepay"]),
  returnUrl: z.string().url().optional(),
});

export const jazzcashCallbackSchema = z.object({
  pp_TxnRefNo: z.string().optional(),
  pp_Amount: z.string().optional(),
  pp_ResponseCode: z.string().optional(),
  pp_ResponseMessage: z.string().optional(),
  pp_SecureHash: z.string().optional(),
});

export const easypaisaCallbackSchema = z.object({
  orderId: z.string().optional(),
  transactionRefNo: z.string().optional(),
  amount: z.string().optional(),
  responseCode: z.string().optional(),
  responseDesc: z.string().optional(),
  secureHash: z.string().optional(),
});

export const cardCallbackSchema = z.object({
  transaction_id: z.string().optional(),
  order_id: z.string().optional(),
  amount: z.string().optional(),
  status: z.string().optional(),
  message: z.string().optional(),
  signature: z.string().optional(),
});

export const safepayCallbackSchema = z.object({
  tracker: z.string().optional(),
  tracker_token: z.string().optional(),
  reference_number: z.string().optional(),
  ref: z.string().optional(),
  order_id: z.string().optional(),
  status: z.string().optional(),
  sig: z.string().optional(),
  signature: z.string().optional(),
});