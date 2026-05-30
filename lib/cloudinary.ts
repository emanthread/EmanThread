import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export interface UploadResult {
  url: string;
  publicId: string;
  tags: string[];
  width?: number;
  height?: number;
  duration?: number;
  resourceType: "image" | "video" | "raw";
}

export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    tags?: string[];
    folder?: string;
    resourceType?: "image" | "video" | "raw";
    skipTransformations?: boolean;
  } = {}
): Promise<UploadResult> {
  const folder = options.folder || "emaan-threads/products";
  const tags = options.tags || [];
  const resourceType = options.resourceType || "image";

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        tags,
        resource_type: resourceType,
        ...(resourceType === "image" && !options.skipTransformations
          ? {
                transformation: [
                // Auto quality & format for optimal delivery (minimum ~80% quality)
                { quality: "auto:good", fetch_format: "auto" },
                // Cap max width to 2500px – retains detail for texture zoom while limiting file size
                { width: 2500, crop: "limit" },
              ],
            }
          : resourceType === "image" && options.skipTransformations
          ? {
              transformation: [
                // Auto quality & format but NO cropping or color changes (minimum ~80% quality)
                { quality: "auto:good", fetch_format: "auto" },
                // Cap max width to 2500px to avoid huge files but don't crop
                { width: 2500, crop: "limit" },
              ],
            }
          : {}),
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Upload failed"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          tags: result.tags || [],
          width: result.width,
          height: result.height,
          duration: result.duration,
          resourceType: resourceType as "image" | "video" | "raw",
        });
      }
    );
    stream.end(buffer);
  });
}

export function getOptimizedImageUrl(
  publicId: string,
  width?: number
): string {
  return cloudinary.url(publicId, {
    quality: "auto",
    fetch_format: "auto",
    ...(width ? { width, crop: "limit" } : {}),
  });
}

export function getVideoUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    resource_type: "video",
    quality: "auto",
  });
}