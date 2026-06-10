import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { triggerNotification } from "@/lib/notifications";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

const sendSchema = z.object({
  to: z.string().min(1, "Recipient is required"),
  template: z.enum([
    "order_confirmation",
    "payment_success",
    "order_shipped",
    "order_delivered",
    "order_cancelled",
  ]),
  data: z.record(z.string()).default({}),
  orderId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = sendSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    triggerNotification({
      to: result.data.to,
      template: result.data.template,
      data: result.data.data,
      orderId: result.data.orderId,
    });

    return NextResponse.json({ queued: true, message: "Notification queued for delivery" });
  } catch (error) {
    console.error("Manual notification error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}