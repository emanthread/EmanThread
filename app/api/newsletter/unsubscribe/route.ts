import { NextResponse } from "next/server";
import { z } from "zod";
import { unsubscribeFromNewsletter } from "@/lib/db-queries";

const unsubscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = unsubscribeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const subscriber = await unsubscribeFromNewsletter(email);

    if (!subscriber) {
      return NextResponse.json(
        { error: "Email not found in subscriber list.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ unsubscribed: true, subscriber });
  } catch (err) {
    console.error("[Newsletter Unsubscribe] Error:", err);
    return NextResponse.json(
      { error: "Failed to unsubscribe. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}