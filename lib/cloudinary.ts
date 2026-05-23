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
                // Auto quality & format for optimal delivery
                { quality: "auto", fetch_format: "auto" },
                // Ensure 2:3 aspect ratio with fill crop — matches the product page display
                { aspect_ratio: "2:3", crop: "fill", gravity: "auto" },
                // Scale to a sensible max width (retina-ready for ~600px containers)
                { width: 1200, crop: "limit" },
                // Auto-enhance colors for fabric accuracy
                { effect: "auto_color" },
                // Slight sharpening for fabric texture detail
                { effect: "sharpen" },
              ],
            }
          : resourceType === "image" && options.skipTransformations
          ? {
              transformation: [
                // Auto quality & format but NO cropping or color changes
                { quality: "auto", fetch_format: "auto" },
                // Cap max width to avoid huge files but don't crop
                { width: 1920, crop: "limit" },
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