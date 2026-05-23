import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getNewsletterSubscribers } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  filter: z.enum(["all", "subscribed"]).default("all"),
});

export const GET = withLoggedAdminHandler(async (request: Request) => {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const result = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const data = await getNewsletterSubscribers(result.data);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[Admin Newsletter Subscribers] Error:", err);
    return NextResponse.json(
      { error: "Failed to load subscribers.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
});