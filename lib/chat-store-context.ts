import { prisma } from "@/lib/db";
import {
  KIDS_SIZE_GUIDE_URL,
  SIZE_GUIDE_TEMPLATES,
} from "@/lib/size-guide";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  "https://emanthread.com";

type PublishedCatalogNode = {
  id: string;
  parentId: string | null;
  label: string;
  path: string;
  nodeType: string;
  productKind: string | null;
  displayOrder: number;
};

function absoluteStoreUrl(path: string): string {
  try {
    return new URL(path, siteUrl).toString();
  } catch {
    return `${siteUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  }
}

/**
 * Excludes a visible child when one of its ancestors is hidden/inactive.
 * This mirrors the storefront's published-navigation rule and prevents Zara
 * from recommending a route a customer cannot reach.
 */
export function publishedCatalogHierarchy(
  nodes: readonly PublishedCatalogNode[],
): Array<PublishedCatalogNode & { breadcrumb: string }> {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  return nodes.flatMap((node) => {
    const labels: string[] = [];
    const visited = new Set<string>();
    let current: PublishedCatalogNode | undefined = node;

    while (current) {
      if (visited.has(current.id)) return [];
      visited.add(current.id);
      labels.unshift(current.label);
      if (!current.parentId) {
        return [{ ...node, breadcrumb: labels.join(" > ") }];
      }
      current = byId.get(current.parentId);
      if (!current) return [];
    }

    return [];
  });
}

export async function getPublishedCatalogContext(): Promise<string> {
  try {
    const nodes = await prisma.catalogNode.findMany({
      where: { isActive: true, isVisible: true },
      select: {
        id: true,
        parentId: true,
        label: true,
        path: true,
        nodeType: true,
        productKind: true,
        displayOrder: true,
      },
      orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
    });

    const published = publishedCatalogHierarchy(nodes).filter((node) =>
      /^\/(?:women|men|fragrance-beauty|teens)(?:\/|$)/.test(node.path),
    );

    if (published.length === 0) return "";

    return [
      "Current customer-visible catalog (database-managed; this overrides old catalog wording):",
      ...published.map((node) => {
        const kind = node.productKind
          ? `; product kind: ${node.productKind.replace(/_/g, " ")}`
          : "";
        return `- ${node.breadcrumb}${kind}; Link: ${absoluteStoreUrl(node.path)}`;
      }),
      "Only recommend the routes listed above. Hidden, inactive, or ancestor-hidden catalog nodes must not be presented to customers.",
    ].join("\n");
  } catch {
    return "";
  }
}

export function getSizeGuideContext(): string {
  const templates = SIZE_GUIDE_TEMPLATES.map(
    (template) => `- ${template.title}: ${template.description}`,
  ).join("\n");

  return [
    "Current size-guide system:",
    `- Main size-guide page: ${absoluteStoreUrl("/size-guide")}`,
    `- Kids and Teens PDF: ${absoluteStoreUrl(KIDS_SIZE_GUIDE_URL)}`,
    templates,
    "- Teens products automatically use the Kids / Teens PDF unless Admin sets a product-specific guide.",
    "- Ready-to-wear products can use the relevant built-in garment chart or an Admin-provided product guide.",
    "- Unstitched fabric, fragrance, beauty, gifts, and non-sized accessories do not have a size guide unless Admin explicitly assigns one.",
    "Never invent measurements. Direct the customer to the linked guide or the guide shown on that product page.",
  ].join("\n");
}

export function messageNeedsCatalogContext(message: string): boolean {
  return /\b(category|categories|catalog|collection|department|women|woman|ladies|men|mens|teen|teens|girls|boys|beauty|makeup|cosmetic|fragrance|perfume|accessor(?:y|ies)|gift|ready[ -]?to[ -]?wear|unstitched|what do you sell|kya milta)\b/i.test(
    message,
  );
}

export function messageNeedsSizeGuideContext(message: string): boolean {
  return /\b(size guide|size chart|sizing|measurement chart|kids size|teen size|which size|what size|measurements?|naap|size kya)\b/i.test(
    message,
  );
}
