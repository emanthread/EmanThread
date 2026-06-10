import { NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { auth } from "@/auth";
import { sanitizeDbError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];

    // Reject if MIME type OR extension fails — both must pass.
    // Example: a .jpg file with application/x-php MIME type must be rejected.
    if (!allowedTypes.includes(file.type) || (!ext || !allowedExts.includes(ext))) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: JPEG, PNG, PDF, DOC, DOCX` },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size: 10MB` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const isDoc = !file.type.includes('image');
    const resourceType = isDoc ? "raw" : "image";

    const result = await uploadToCloudinary(buffer, {
      tags: ["payment-screenshot"],
      folder: "emaan-threads/payments",
      resourceType: resourceType as "image" | "raw" | "video",
      skipTransformations: true,
    });

    return NextResponse.json({
      url: result.url,
    });
  } catch (error) {
    console.error("Payment screenshot upload error:", error);
    const { message, status } = sanitizeDbError(error);
    return NextResponse.json({ error: message }, { status });
  }
}