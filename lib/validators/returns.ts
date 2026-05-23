import { z } from "zod";

export const createReturnRequestSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  type: z.enum(["REFUND", "EXCHANGE"]),
  reason: z.enum(["SIZE", "QUALITY", "WRONG_ITEM", "DAMAGED", "OTHER"]),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1, "Order item ID is required"),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
        reason: z.enum(["SIZE", "QUALITY", "WRONG_ITEM", "DAMAGED", "OTHER"]).optional(),
      })
    )
    .min(1, "At least one item must be selected"),
});

export const updateReturnRequestStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "COMPLETED", "PENDING", "CANCELLED"]),
  refundAmount: z.number().optional(),
  notes: z.string().optional(),
});

export const updateReturnRequestSchema = z.object({
  type: z.enum(["REFUND", "EXCHANGE"]).optional(),
  reason: z.enum(["SIZE", "QUALITY", "WRONG_ITEM", "DAMAGED", "OTHER"]).optional(),
  notes: z.string().optional(),
  refundAmount: z.number().optional(),
});