import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductById, getProductBySlug, getProductRecommendations } from "@/lib/db-queries";
import ProductPageClient from "./product-page-client";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://emaanthreads.com";

interface Props {
  params: Promise<{ id: string }>;
}

// Try slug first, fall back to DB id — chatbot sends slug-based URLs
async function getProductByIdOrSlug(idOrSlug: string) {
  const bySlug = await getProductBySlug(idOrSlug);
  if (bySlug) return bySlug;
  return getProductById(idOrSlug);
}

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

  return {
    title,
    description,
    openGraph: {
      type: "website" as const,
      title,
      description,
      url: `${siteUrl}/product/${product.id}`,
      images: product.images?.[0]
        ? [
            {
              url: product.images[0],
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
        offers: {
          "@type": "Offer",
          price: product.price,
          priceCurrency: "PKR",
          availability: product.inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          url: `${siteUrl}/product/${product.id}`,
        },
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

  const recommendations = await getProductRecommendations(id, 4);

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
        "name": "Shop",
        "item": `${siteUrl}/shop`,
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
      frequentlyBought={recommendations.frequentlyBought}
      youMayAlsoLike={recommendations.youMayAlsoLike}
    />
  );
}
