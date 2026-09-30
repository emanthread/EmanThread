import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  isSupportedProductImage,
  prepareProductImageUpload,
  applyProductImageUpload,
  shouldOptimizeProductImage,
} from "../lib/product-image-upload";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test.describe("admin product image uploads", () => {
  test("accepts common browser and phone image formats", () => {
    for (const type of [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/heic",
      "image/heif",
    ]) {
      expect(isSupportedProductImage({ type })).toBe(true);
    }
    expect(isSupportedProductImage({ type: "image/svg+xml" })).toBe(false);
  });

  test("optimizes images before they approach the proxied body limit", () => {
    expect(
      shouldOptimizeProductImage({ type: "image/jpeg", size: 7 * 1024 * 1024 })
    ).toBe(false);
    expect(
      shouldOptimizeProductImage({ type: "image/jpeg", size: 8 * 1024 * 1024 })
    ).toBe(true);
  });

  test("keeps enough proxy headroom and a dedicated upload timeout", () => {
    expect(source("next.config.mjs")).toContain("proxyClientMaxBodySize: '12mb'");
    expect(source("lib/admin-fetch.ts")).toContain(
      "const UPLOAD_TIMEOUT_MS = 120_000"
    );
    expect(source("app/api/admin/upload/route.ts")).toContain(
      'export const runtime = "nodejs"'
    );
  });

  test("uses the shared optimizer for product and variant images", () => {
    const editor = source("components/admin/product-editor.tsx");
    const variants = source(
      "components/admin/product-commerce-profile-section.tsx"
    );

    expect(editor).toContain("prepareProductImageUpload(file)");
    expect(editor).toContain("Product image upload failed");
    expect(editor).toContain("was not uploaded");
    expect(editor).toContain("image/avif,image/heic,image/heif");
    expect(variants).toContain("image/avif,image/heic,image/heif");
  });
});


test('passes a supported phone image within the server limit when the browser cannot decode it', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap');
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: async () => { throw new Error('Unsupported decoder'); } });
  try {
    const file = new File([new Uint8Array(8 * 1024 * 1024)], 'phone.heic', { type: 'image/heic' });
    expect(await prepareProductImageUpload(file)).toBe(file);
    const oversized = new File([new Uint8Array(11 * 1024 * 1024)], 'large.heic', { type: 'image/heic' });
    await expect(prepareProductImageUpload(oversized)).rejects.toThrow(/10 MB/);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'createImageBitmap', previous);
    else Reflect.deleteProperty(globalThis, 'createImageBitmap');
  }
});

test('preserves GIF animation instead of running it through a still-image canvas', async () => {
  const gif = new File([new Uint8Array(8 * 1024 * 1024)], 'banner.gif', { type: 'image/gif' });
  expect(await prepareProductImageUpload(gif)).toBe(gif);
});

test('replaces only the selected image and preserves gallery order', () => {
  const images = ['/cover.jpg', '/detail.jpg', '/back.jpg'];
  expect(applyProductImageUpload(images, '/new-detail.jpg', 1)).toEqual(['/cover.jpg', '/new-detail.jpg', '/back.jpg']);
  expect(images).toEqual(['/cover.jpg', '/detail.jpg', '/back.jpg']);
  expect(applyProductImageUpload(images, '/extra.jpg')).toEqual([...images, '/extra.jpg']);
  expect(() => applyProductImageUpload(images, '', 1)).toThrow();
  expect(() => applyProductImageUpload(images, '/new.jpg', 4)).toThrow();
});
