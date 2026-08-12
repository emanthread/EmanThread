export interface CatalogVisibilityNode {
  id: string;
  parentId: string | null;
  label: string;
  isActive: boolean;
  isVisible: boolean;
}

export function catalogVisibilityToggleBlockReason(
  node: CatalogVisibilityNode,
  nodes: CatalogVisibilityNode[],
  nextVisible: boolean
): string | null {
  if (nextVisible === node.isVisible) return null;

  if (!nextVisible) {
    const visibleChildren = nodes.filter(
      (candidate) => candidate.parentId === node.id && candidate.isVisible
    );
    return visibleChildren.length
      ? `Hide ${visibleChildren.length} visible child path${
          visibleChildren.length === 1 ? "" : "s"
        } first`
      : null;
  }

  if (!node.isActive) {
    return "Activate this path before publishing it";
  }

  const nodesById = new Map(nodes.map((candidate) => [candidate.id, candidate]));
  const visited = new Set<string>([node.id]);
  let parentId = node.parentId;

  while (parentId) {
    if (visited.has(parentId)) return "Resolve the catalog parent cycle first";
    visited.add(parentId);

    const parent = nodesById.get(parentId);
    if (!parent) return "Restore the missing parent path before publishing it";
    if (!parent.isActive || !parent.isVisible) {
      return `Publish parent ${parent.label} first`;
    }
    parentId = parent.parentId;
  }

  return null;
}
