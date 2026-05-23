import { isAdminRole } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cloudinary } from "@/lib/cloudinary";
import { createAuditLog } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const DELETE = withLoggedAdminHandler(async (req: Request) => {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { publicId, resourceType } = await req.json();

    if (!publicId) {
      return NextResponse.json({ error: "publicId is required" }, { status: 400 });
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: (resourceType || "image") as "image" | "video" | "raw",
    });

    void createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      action: "PRODUCT_DELETED",
      entity: "Media",
      entityId: publicId,
      newValue: { result, publicId, resourceType: resourceType || "image" },
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Media delete error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete media";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});