import { prisma } from "@/lib/db";
import {
  shopCatalogOptions,
  type ShopCatalogOption,
} from "@/lib/shop-catalog-options";

type VisibleCatalogNode = {
  id: string;
  parentId: string | null;
  path: string;
};

function hasVisibleAncestorChain(
  node: VisibleCatalogNode,
  nodesById: Map<string, VisibleCatalogNode>
) {
  const visited = new Set<string>();
  let current: VisibleCatalogNode | undefined = node;

  while (current) {
    if (visited.has(current.id)) return false;
    visited.add(current.id);

    if (!current.parentId) return true;
    current = nodesById.get(current.parentId);
  }

  return false;
}

/**
 * The static menu is an allow-list, but only live, fully published catalog
 * nodes should be offered as /shop filters. This read-only helper also makes
 * a code deployment safe before an older production database has catalog
 * tables or visible nodes: the legacy shop simply receives no new options.
 */
export async function getActiveShopCatalogOptions(): Promise<
  ShopCatalogOption[]
> {
  try {
    const nodes = await prisma.catalogNode.findMany({
      where: { isActive: true, isVisible: true },
      select: { id: true, parentId: true, path: true },
    });

    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const nodesByPath = new Map(nodes.map((node) => [node.path, node]));

    return shopCatalogOptions.filter((option) => {
      const node = nodesByPath.get(option.path);
      return Boolean(node && hasVisibleAncestorChain(node, nodesById));
    });
  } catch {
    return [];
  }
}
