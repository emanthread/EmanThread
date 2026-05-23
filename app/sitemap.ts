import type { MetadataRoute } from "next";
import { getAllProducts, getAllCategories } from "@/lib/db-queries";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://emanthread.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Gracefully handle DB unavailability during static generation (build time).
  // In production, Vercel builds with a live DATABASE_URL; locally,
  // if PostgreSQL is not running, we fall back to static routes only.
  let products: { id: string }[] = [];
  let categories: { id: string }[] = [];

  try {
    [products, categories] = await Promise.all([
      getAllProducts(),
      getAllCategories(),
    ]);
  } catch (err) {
    console.warn(
      "[sitemap] Database unavailable during static generation — falling back to static routes only.",
      err instanceof Error ? err.message : err
    );
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: new Date(), priority: 1.0 },
    { url: `${siteUrl}/shop`, lastModified: new Date(), priority: 0.9 },
    { url: `${siteUrl}/about`, lastModified: new Date(), priority: 0.5 },
    { url: `${siteUrl}/contact`, lastModified: new Date(), priority: 0.5 },
    { url: `${siteUrl}/faqs`, lastModified: new Date(), priority: 0.5 },
    { url: `${siteUrl}/shipping`, lastModified: new Date(), priority: 0.5 },
    { url: `${siteUrl}/returns`, lastModified: new Date(), priority: 0.5 },
    { url: `${siteUrl}/size-guide`, lastModified: new Date(), priority: 0.5 },
    { url: `${siteUrl}/privacy-policy`, lastModified: new Date(), priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: new Date(), priority: 0.3 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteUrl}/product/${product.id}`,
    lastModified: new Date(),
    priority: 0.8,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteUrl}/shop?category=${category.id}`,
    lastModified: new Date(),
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}
