import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getProductById, getProductBySlug, getProductRecommendations, getProductVariations } from "@/lib/db-queries";
import { prisma } from "@/lib/db";
import ProductPageClient from "./product-page-client";
import { getActiveVariants, getVariantUnitPrice, isVariantAvailable } from "@/lib/commerce";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://emaanthreads.com";

export const revalidate = 300; // Cache product pages for 5 minutes
export const dynamicParams = true; // Allow new products added after build to still work

// Pre-build all in-stock product pages at deploy time → served from CDN, zero DB wait
export async function generateStaticParams() {
  try {
    const products = await prisma.product.findMany({
      select: { id: true, slug: true },
      where: { inStock: true },
    });
    return products
      .map((p) => ({ id: p.slug ?? p.id }))
      .filter((p) => p.id.length <= 200); // skip products with abnormally long slugs/ids (ENAMETOOLONG guard)
  } catch {
    // If DB is unavailable at build time, fall back gracefully to dynamic rendering
    return [];
  }
}


interface Props {
  params: Promise<{ id: string }>;
}

// Storefront cards use Prisma CUIDs, while shared chatbot links may use slugs.
// React.cache shares this read between metadata and the page in one request.
const getProductByIdOrSlug = cache(async (idOrSlug: string) => {
  if (/^c[a-z0-9]{24}$/.test(idOrSlug)) {
    const byId = await getProductById(idOrSlug);
    return byId ?? getProductBySlug(idOrSlug);
  }
  const bySlug = await getProductBySlug(idOrSlug);
  return bySlug ?? getProductById(idOrSlug);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductByIdOrSlug(id);

  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  const title = product.metaTitle || product.name;
  const description =
    product.metaDescription ||
    product.description ||
    "Premium men's unstitched fabric from Emaan Thread.";
  const activeVariants = getActiveVariants(product);
  const prices = activeVariants.map((variant) => getVariantUnitPrice(product, variant));
  const structuredOffers = activeVariants.length > 0 ? {
    "@type": "AggregateOffer",
    lowPrice: Math.min(...prices),
    highPrice: Math.max(...prices),
    offerCount: activeVariants.length,
    priceCurrency: "PKR",
    availability: activeVariants.some(isVariantAvailable)
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    url: `${siteUrl}/product/${product.id}`,
  } : {
    "@type": "Offer",
    price: product.price,
    priceCurrency: "PKR",
    availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    url: `${siteUrl}/product/${product.id}`,
  };

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/product/${product.id}`,
    },
    openGraph: {
      type: "website" as const,
      title,
      description,
      url: `${siteUrl}/product/${product.id}`,
      images: product.images?.[0]
        ? [
            {
              url: product.images[0] || "",
              width: 800,
              height: 1200,
              alt: product.name,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.images?.[0] ? [product.images[0]] : [],
    },
    other: {
      "script:ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description || "Premium men's unstitched fabric from Emaan Threads.",
        image: product.images,
        sku: product.sku,
        brand: { "@type": "Brand", name: "Emaan Threads" },
        offers: structuredOffers,
      }),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductByIdOrSlug(id);

  if (!product) {
    notFound();
  }

  const [recommendationsResult, variationsResult] = await Promise.allSettled([
    getProductRecommendations(product.id, 4),
    getProductVariations(product.name),
  ]);
  if (recommendationsResult.status === "rejected") {
    console.error("[product] Recommendations unavailable", recommendationsResult.reason);
  }
  if (variationsResult.status === "rejected") {
    console.error("[product] Variations unavailable", variationsResult.reason);
  }
  const recommendations = recommendationsResult.status === "fulfilled"
    ? recommendationsResult.value
    : { frequentlyBought: [], youMayAlsoLike: [] };
  const variations = variationsResult.status === "fulfilled"
    ? variationsResult.value
    : [];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || "Premium men's unstitched fabric from Emaan Threads.",
    "image": product.images,
    "sku": product.sku,
    "brand": { "@type": "Brand", "name": "Emaan Threads" },
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "PKR",
      "availability": product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      "url": `${siteUrl}/product/${product.id}`,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Collections",
        "item": `${siteUrl}/women`,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": product.name,
        "item": `${siteUrl}/product/${product.id}`,
      },
    ],
  };

  return (
    <ProductPageClient
      product={product}
      variations={variations}
      frequentlyBought={recommendations.frequentlyBought}
      youMayAlsoLike={recommendations.youMayAlsoLike}
    />
  );
}
