import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  isSupportedProductImage,
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
