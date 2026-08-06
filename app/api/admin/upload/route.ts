import { NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { createAuditLog } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";
import { sanitizeDbError } from '@/lib/utils/errors';

export const dynamic = "force-dynamic";

export const POST = withLoggedAdminHandler(async (req: Request) => {
  const access = await requireAdminApiAccess(req);
  if (!access.ok) return access.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const tagsRaw = formData.getAll("tags") as string[];
    const resourceType = (formData.get("resourceType") as string) || "image";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
    const allowedDocTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    const allowedTypes = resourceType === "video" ? allowedVideoTypes : resourceType === "raw" ? allowedDocTypes : allowedImageTypes;

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const maxSize = resourceType === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await uploadToCloudinary(buffer, {
      tags: tagsRaw.length > 0 ? tagsRaw : undefined,
      resourceType: resourceType as "image" | "video",
    });

    void createAuditLog({
      userId: access.session.user.id,
      userEmail: access.session.user.email || undefined,
      action: "PRODUCT_CREATED",
      entity: "Media",
      entityId: result.publicId,
      newValue: { url: result.url, publicId: result.publicId, tags: result.tags, resourceType },
    });

    return NextResponse.json({
      url: result.url,
      publicId: result.publicId,
      tags: result.tags,
      resourceType: result.resourceType,
    });
  } catch (error) {
    console.error("Upload error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
});
