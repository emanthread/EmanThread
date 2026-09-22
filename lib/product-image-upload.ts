const SAFE_UPLOAD_BYTES = 7.5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2500;
const MIN_WEBP_QUALITY = 0.55;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

export function isSupportedProductImage(file: Pick<File, "type">): boolean {
  return SUPPORTED_IMAGE_TYPES.has(file.type.toLowerCase());
}

export function shouldOptimizeProductImage(
  file: Pick<File, "size" | "type">
): boolean {
  return file.size > SAFE_UPLOAD_BYTES;
}

function webpName(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "").trim() || "product-image";
  return `${stem}.webp`;
}

function canvasBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("The browser could not optimize this image.")),
      "image/webp",
      quality
    );
  });
}

/**
 * Keep normal product photos untouched. Camera files that are too large for
 * the proxied multipart request are resized and encoded as WebP in-browser.
 */
export async function prepareProductImageUpload(file: File): Promise<File> {
  if (!isSupportedProductImage(file)) {
    throw new Error(
      "Unsupported image format. Use JPG, PNG, WebP, AVIF, HEIC, or HEIF."
    );
  }

  if (!shouldOptimizeProductImage(file)) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "This large image cannot be optimized by the browser. Convert it to JPG or PNG and try again."
    );
  }

  try {
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height)
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The browser could not prepare this image.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let quality = 0.9;
    let blob = await canvasBlob(canvas, quality);
    while (blob.size > SAFE_UPLOAD_BYTES && quality > MIN_WEBP_QUALITY) {
      quality = Math.max(MIN_WEBP_QUALITY, quality - 0.1);
      blob = await canvasBlob(canvas, quality);
    }

    if (blob.size > SAFE_UPLOAD_BYTES) {
      throw new Error(
        "The optimized image is still too large. Please use an image below 8 MB."
      );
    }

    return new File([blob], webpName(file.name), {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}
