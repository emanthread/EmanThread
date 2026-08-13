import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CartDrawer } from "@/components/cart/lazy-cart-drawer";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogProductResults } from "@/components/catalog/catalog-product-results";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/home/hero-section";
import { getHeroSlides } from "@/lib/db/store-config";
import { selectHeroSlidesForDepartment } from "@/lib/hero-slide-targeting";
import { catalogDepartmentFromRootPath } from "@/lib/navigation/storefront-routes";
import { cn } from "@/lib/utils";
import {
  getCatalogPageData,
  hasCatalogQueryParams,
  parseCatalogSearchParams,
  resolveActiveCatalogNode,
  type CatalogPageData,
  type CatalogSearchParams,
} from "@/lib/db/catalog";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://emanthread.com";

function siteUrl(): URL {
  try {
    return new URL(configuredSiteUrl);
  } catch {
    return new URL("https://emanthread.com");
  }
}

function canonicalUrl(
  path: string,
  canonicalOverride: string | null
): string {
  try {
    return new URL(canonicalOverride || path, siteUrl()).toString();
  } catch {
    return new URL(path, siteUrl()).toString();
  }
}

function supportedImageSource(source: string | null): source is string {
  if (!source) return false;
  if (source.startsWith("/") && !source.startsWith("//")) return true;

  try {
    const url = new URL(source);
    return (
      url.protocol === "https:" &&
      (url.hostname === "res.cloudinary.com" ||
        url.hostname === "images.unsplash.com")
    );
  } catch {
    return false;
  }
}

function safeInternalHref(href: string | null): string | null {
  return href?.startsWith("/") && !href.startsWith("//") ? href : null;
}

function noIndexMetadata(title = "Collection unavailable"): Metadata {
  return {
    title,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

/**
 * Metadata deliberately canonicalizes filtered, sorted, and paginated URLs to
 * the base catalog node and keeps those variants noindex until a separate
 * indexing policy is approved.
 */
export async function getCatalogPageMetadata(
  canonicalPath: string | null,
  searchParams: CatalogSearchParams
): Promise<Metadata> {
  if (!FEATURE_FLAGS.CATALOG_PAGES_V1 || !canonicalPath) {
    return noIndexMetadata();
  }

  let node: Awaited<ReturnType<typeof resolveActiveCatalogNode>>;
  try {
    node = await resolveActiveCatalogNode(canonicalPath);
  } catch {
    return noIndexMetadata();
  }

  if (!node) return noIndexMetadata("Collection not found");

  const title = node.seoTitle || node.label;
  const description =
    node.seoDescription ||
    node.description ||
    `Explore the ${node.label} collection from Eman Thread.`;
  const canonical = canonicalUrl(node.path, node.canonicalOverride);
  const hasQueryVariant = hasCatalogQueryParams(searchParams);
  const mayIndex = node.indexable && !hasQueryVariant;
  const socialImage = supportedImageSource(node.bannerImage)
    ? [
        {
          url: node.bannerImage,
          alt: node.bannerAlt || node.label,
        },
      ]
    : [];

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: mayIndex,
      follow: mayIndex,
      googleBot: {
        index: mayIndex,
        follow: mayIndex,
      },
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      images: socialImage,
    },
    twitter: {
      card: socialImage.length ? "summary_large_image" : "summary",
      title,
      description,
      images: socialImage.map((image) => image.url),
    },
  };
}

function catalogHref(
  path: string,
  query: CatalogPageData["query"],
  overrides: Partial<CatalogPageData["query"]> = {}
): string {
  const nextQuery = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (nextQuery.search) params.set("q", nextQuery.search);
  if (nextQuery.fabricType) params.set("fabric", nextQuery.fabricType);
  if (nextQuery.categoryIds?.length) {
    params.set("category", nextQuery.categoryIds.join(","));
  }
  if (nextQuery.color) params.set("color", nextQuery.color);
  if (nextQuery.season) params.set("season", nextQuery.season);
  if (nextQuery.productKind) params.set("kind", nextQuery.productKind);
  if (nextQuery.option) params.set("option", nextQuery.option);
  if (nextQuery.minPrice !== undefined) {
    params.set("minPrice", String(nextQuery.minPrice));
  }
  if (nextQuery.maxPrice !== undefined) {
    params.set("maxPrice", String(nextQuery.maxPrice));
  }
  if (nextQuery.inStock) params.set("inStock", "true");
  if (nextQuery.sort !== "featured") params.set("sort", nextQuery.sort);
  if (nextQuery.page > 1) params.set("page", String(nextQuery.page));

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function breadcrumbJsonLd(data: CatalogPageData) {
  const baseUrl = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl.toString(),
      },
      ...data.node.breadcrumbs.map((breadcrumb, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: breadcrumb.label,
        item: new URL(breadcrumb.path, baseUrl).toString(),
      })),
    ],
  };
}

function FeaturedContent({ data }: { data: CatalogPageData }) {
  if (!data.node.featuredContent.length) return null;

  return (
    <section aria-labelledby="catalog-featured-heading" className="py-10">
      <h2
        id="catalog-featured-heading"
        className="mb-6 font-serif text-2xl font-semibold"
      >
        Featured
      </h2>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {data.node.featuredContent.map((item, index) => {
          const href = safeInternalHref(item.href);
          const image = supportedImageSource(item.image) ? item.image : null;
          const content = (
            <article className="h-full overflow-hidden rounded-xl border border-border bg-card">
              {image && (
                <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                  <Image
                    src={image}
                    alt={item.imageAlt || item.title || ""}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              )}
              <div className="space-y-2 p-5">
                {item.title && (
                  <h3 className="font-serif text-xl font-semibold">
                    {item.title}
                  </h3>
                )}
                {item.description && (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                )}
                {href && (
                  <span className="inline-block pt-2 text-xs font-semibold uppercase tracking-[0.18em] underline underline-offset-4">
                    {item.ctaLabel || "Explore"}
                  </span>
                )}
              </div>
            </article>
          );

          return href ? (
            <Link
              key={`${href}-${index}`}
              href={href}
              className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {content}
            </Link>
          ) : (
            <div key={`featured-${index}`}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}

function Pagination({ data }: { data: CatalogPageData }) {
  if (data.totalPages <= 1 && !data.hasPreviousPage) return null;

  return (
    <nav
      aria-label="Catalog pagination"
      className="mt-12 flex items-center justify-center gap-3"
    >
      {data.hasPreviousPage ? (
        <Button variant="outline" asChild>
          <Link
            href={catalogHref(data.node.path, data.query, {
              page: data.query.page - 1,
            })}
            rel="prev"
          >
            <ChevronLeft aria-hidden="true" />
            Previous
          </Link>
        </Button>
      ) : (
        <Button variant="outline" disabled>
          <ChevronLeft aria-hidden="true" />
          Previous
        </Button>
      )}

      <span className="min-w-24 text-center text-sm text-muted-foreground">
        Page {data.query.page} of {Math.max(1, data.totalPages)}
      </span>

      {data.hasNextPage ? (
        <Button variant="outline" asChild>
          <Link
            href={catalogHref(data.node.path, data.query, {
              page: data.query.page + 1,
            })}
            rel="next"
          >
            Next
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" disabled>
          Next
          <ChevronRight aria-hidden="true" />
        </Button>
      )}
    </nav>
  );
}

export function CatalogPageSkeleton({ isDepartmentRoot }: { isDepartmentRoot?: boolean }) {
  return (
    <>
      <Header />
      <CartDrawer />
      <main
        className={cn("min-h-screen bg-background pb-16", !isDepartmentRoot && "pt-28")}
        aria-busy="true"
        aria-label="Loading collection"
      >
        <div className="mx-auto max-w-7xl animate-pulse px-4 sm:px-6 lg:px-8">
          <div className="mb-5 h-4 w-56 rounded bg-muted" />
          <div className="h-56 rounded-xl bg-muted sm:h-72" />
          <div className="my-8 h-28 rounded-xl bg-muted" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[2/3] rounded-xl bg-muted"
              />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export interface CatalogPageProps {
  canonicalPath: string | null;
  searchParams: CatalogSearchParams;
}

export async function CatalogPage({
  canonicalPath,
  searchParams,
}: CatalogPageProps) {
  if (!FEATURE_FLAGS.CATALOG_PAGES_V1 || !canonicalPath) {
    notFound();
  }

  const data = await getCatalogPageData(
    canonicalPath,
    parseCatalogSearchParams(searchParams)
  );

  if (!data) notFound();

  const breadcrumbData = breadcrumbJsonLd(data);
  const bannerImage = supportedImageSource(data.node.bannerImage)
    ? data.node.bannerImage
    : null;
  const hasFilters = Boolean(
    data.query.search ||
      data.query.fabricType ||
      data.query.color ||
      data.query.season ||
      data.query.productKind ||
      data.query.option ||
      data.query.categoryIds?.length ||
      data.query.minPrice !== undefined ||
      data.query.maxPrice !== undefined ||
      data.query.inStock
  );

  const heroDepartment = catalogDepartmentFromRootPath(data.node.path);
  const isDepartmentRoot = heroDepartment !== null;
  const heroSlides = heroDepartment
    ? selectHeroSlidesForDepartment(await getHeroSlides(), heroDepartment)
    : [];
  
  return (
    <>
      <Header />
      <CartDrawer />
      <main className={cn("min-h-screen bg-background pb-16", !isDepartmentRoot && "pt-28")}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbData).replace(/</g, "\\u003c"),
          }}
        />

        {isDepartmentRoot && heroSlides.length > 0 && (
          <HeroSection
            initialSlides={heroSlides}
            initialDepartment={heroDepartment}
            locked
          />
        )}

        <div className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", isDepartmentRoot && "pt-12")}>
          <nav
            aria-label="Breadcrumb"
            className="mb-5 overflow-x-auto py-1 text-xs uppercase tracking-[0.14em] text-muted-foreground"
          >
            <ol className="flex min-w-max items-center gap-2">
              <li>
                <Link
                  href="/"
                  className="transition-colors hover:text-foreground"
                >
                  Home
                </Link>
              </li>
              {data.node.breadcrumbs.map((breadcrumb, index) => {
                const isCurrent =
                  index === data.node.breadcrumbs.length - 1;
                return (
                  <li
                    key={breadcrumb.id}
                    className="flex items-center gap-2"
                  >
                    <span aria-hidden="true">/</span>
                    {isCurrent ? (
                      <span aria-current="page" className="text-foreground">
                        {breadcrumb.label}
                      </span>
                    ) : (
                      <Link
                        href={breadcrumb.path}
                        className="transition-colors hover:text-foreground"
                      >
                        {breadcrumb.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          {!isDepartmentRoot && bannerImage ? (
            <section
              data-testid="catalog-node-banner"
              className="relative isolate flex min-h-64 items-end overflow-hidden rounded-xl bg-muted sm:min-h-80"
            >
              <Image
                src={bannerImage}
                alt={data.node.bannerAlt || data.node.label}
                fill
                priority
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
              />
              <div className="relative z-10 max-w-3xl p-6 text-white sm:p-10">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-white/80">
                  {data.node.nodeType}
                </p>
                <h1 className="font-serif text-4xl font-semibold sm:text-5xl lg:text-6xl">
                  {data.node.label}
                </h1>
                {data.node.description && (
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-white/90 sm:text-base">
                    {data.node.description}
                  </p>
                )}
              </div>
            </section>
          ) : !isDepartmentRoot && (
            <section
              data-testid="catalog-node-banner"
              className="border-y border-border py-12 text-center sm:py-16"
            >
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                {data.node.nodeType}
              </p>
              <h1 className="font-serif text-4xl font-semibold sm:text-5xl">
                {data.node.label}
              </h1>
              {data.node.description && (
                <p className="mx-auto mt-4 max-w-2xl leading-7 text-muted-foreground">
                  {data.node.description}
                </p>
              )}
            </section>
          )}

          <FeaturedContent data={data} />

          <section aria-labelledby="catalog-products-heading" className="pt-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:gap-8">
              <CatalogFilters data={data} />

              <div className="min-w-0 flex-1">
                <CatalogProductResults
                  path={data.node.path}
                  products={data.products}
                  query={data.query}
                  total={data.total}
                  hasFilters={hasFilters}
                  indexable={data.node.indexable}
                />
                <Pagination data={data} />
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
