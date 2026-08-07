import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/db-queries";
import { catalogMenu } from "@/lib/navigation/catalog-menu";
import { CATALOG_ROOT_PATHS } from "@/lib/navigation/storefront-routes";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://emanthread.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Gracefully handle DB unavailability during static generation (build time).
  // In production, Vercel builds with a live DATABASE_URL; locally,
  // if PostgreSQL is not running, we fall back to static routes only.
  let products: { id: string }[] = [];
  try {
    products = await getAllProducts();
  } catch (err) {
    console.warn(
      "[sitemap] Database unavailable during static generation — falling back to static routes only.",
      err instanceof Error ? err.message : err
    );
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: new Date(), priority: 1.0 },
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

  const catalogPaths = new Set<string>(CATALOG_ROOT_PATHS);
  for (const department of catalogMenu) {
    for (const section of department.sections) {
      if (section.href) catalogPaths.add(section.href);
      for (const group of section.groups) {
        for (const item of group.items) {
          if (
            item.href &&
            item.visibility === "visible" &&
            item.status === "active" &&
            !item.comingSoon
          ) {
            catalogPaths.add(item.href);
          }
        }
      }
    }
  }

  const catalogRoutes: MetadataRoute.Sitemap = [...catalogPaths].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    priority: 0.7,
  }));

  return [...staticRoutes, ...catalogRoutes, ...productRoutes];
}
