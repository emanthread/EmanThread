import { NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { createAuditLog } from "@/lib/db-queries";
import { withLoggedAdminHandler } from "@/lib/logger";
import { requireAdminApiAccess } from "@/lib/admin-route-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_RESOURCE_TYPES = new Set(["image", "video", "raw"]);
const REQUIRED_CLOUDINARY_ENV = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

export const POST = withLoggedAdminHandler(async (req: Request) => {
  const access = await requireAdminApiAccess(req);
  if (!access.ok) return access.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const tagsRaw = formData.getAll("tags") as string[];
    const resourceType = String(formData.get("resourceType") || "image");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_RESOURCE_TYPES.has(resourceType)) {
      return NextResponse.json(
        { error: "Invalid upload resource type" },
        { status: 400 }
      );
    }

    if (REQUIRED_CLOUDINARY_ENV.some((name) => !process.env[name])) {
      return NextResponse.json(
        { error: "Image storage is not configured on the server." },
        { status: 503 }
      );
    }

    const allowedImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
      "image/heic",
      "image/heif",
    ];
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
    const allowedDocTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedTypes =
      resourceType === "video"
        ? allowedVideoTypes
        : resourceType === "raw"
          ? allowedDocTypes
          : allowedImageTypes;

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type: ${file.type || "unknown"}. Allowed: ${allowedTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const maxSize =
      resourceType === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const cloudinaryResourceType = resourceType as "image" | "video" | "raw";

    const result = await uploadToCloudinary(buffer, {
      tags: tagsRaw.length > 0 ? tagsRaw : undefined,
      resourceType: cloudinaryResourceType,
    });

    void createAuditLog({
      userId: access.session.user.id,
      userEmail: access.session.user.email || undefined,
      action: "PRODUCT_CREATED",
      entity: "Media",
      entityId: result.publicId,
      newValue: {
        url: result.url,
        publicId: result.publicId,
        tags: result.tags,
        resourceType,
      },
    });

    return NextResponse.json({
      url: result.url,
      publicId: result.publicId,
      tags: result.tags,
      resourceType: result.resourceType,
    });
  } catch (error) {
    console.error("Upload error:", error);
    const timedOut =
      error instanceof Error && /timeout|timed out/i.test(error.message);
    return NextResponse.json(
      {
        error: timedOut
          ? "Image storage timed out. Please retry."
          : "Image upload failed at image storage. Please retry.",
      },
      { status: 502 }
    );
  }
});
