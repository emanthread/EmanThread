"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminFetch } from "@/lib/admin-fetch";
import type { ProductKind } from "@/lib/data";

export type CatalogAssignmentDraft = {
  catalogNodeId: string;
  isFeatured: boolean;
  displayOrder: string;
  catalogNode?: {
    label: string;
    path: string;
    isActive: boolean;
    isVisible: boolean;
  };
};

export type CatalogAssignmentPayload = {
  catalogNodeId: string;
  isFeatured: boolean;
  displayOrder: number | null;
};

export type CatalogNode = {
  id: string;
  label: string;
  path: string;
  isActive: boolean;
  isVisible: boolean;
};

function catalogDepartmentNodes(nodes: CatalogNode[]): CatalogNode[] {
  return nodes.filter((node) => node.path.split("/").filter(Boolean).length === 1);
}

function catalogPathMatchesDepartment(path: string, departmentPath: string): boolean {
  return path === departmentPath || path.startsWith(`${departmentPath}/`);
}

/**
 * The catalog path is the merchandising source of truth. This only proposes a
 * sensible starting product kind; the admin remains able to choose the final
 * merchandise type and every existing profile remains untouched.
 */
export function suggestedProductKindForCatalogPath(
  path: string
): ProductKind | null {
  const normalized = path.toLowerCase();
  if (
    normalized.includes("/fragrances") ||
    normalized.includes("/perfume") ||
    normalized.includes("/attar") ||
    normalized.includes("body-mist") ||
    normalized.includes("body-spray") ||
    normalized.includes("bakhoor") ||
    normalized.includes("diffuser") ||
    normalized.includes("scented-candle")
  ) {
    return "FRAGRANCE";
  }
  if (
    normalized.includes("/makeup") ||
    normalized.includes("/skincare") ||
    normalized.includes("eye-") ||
    normalized.includes("lip") ||
    normalized.includes("foundation") ||
    normalized.includes("blush")
  ) {
    return "BEAUTY";
  }
  if (normalized.includes("gift-box")) return "GIFT_BOX";
  if (normalized.includes("gift")) return "GIFT";
  if (normalized.startsWith("/teens")) return "TEENS";
  if (normalized.includes("ready-to-wear") || normalized.includes("/rtw")) {
    return "READY_TO_WEAR";
  }
  if (normalized.includes("unstitched")) return "UNSTITCHED_FABRIC";
  return null;
}

type AssignmentApiRow = Omit<CatalogAssignmentDraft, "displayOrder"> & {
  displayOrder: number | null;
  catalogNode: NonNullable<CatalogAssignmentDraft["catalogNode"]>;
};

function readApiError(payload: unknown, fallback: string): string {
  return payload && typeof payload === "object" && "error" in payload
    ? String(payload.error)
    : fallback;
}

/**
 * This deliberately validates only catalog-specific values. The legacy
 * Product form and its payload remain entirely separate from this state.
 */
export function serializeCatalogAssignments(
  assignments: CatalogAssignmentDraft[]
): CatalogAssignmentPayload[] {
  if (assignments.length > 25) {
    throw new Error("A product can be assigned to at most 25 catalog nodes");
  }

  const nodeIds = new Set<string>();
  return assignments.map((assignment) => {
    if (!assignment.catalogNodeId || nodeIds.has(assignment.catalogNodeId)) {
      throw new Error("Each catalog node can be assigned only once");
    }
    nodeIds.add(assignment.catalogNodeId);

    const rawOrder = assignment.displayOrder.trim();
    if (!rawOrder) {
      return {
        catalogNodeId: assignment.catalogNodeId,
        isFeatured: assignment.isFeatured,
        displayOrder: null,
      };
    }

    if (!/^\d+$/.test(rawOrder)) {
      throw new Error("Catalog display order must be a whole number of zero or greater");
    }

    const displayOrder = Number(rawOrder);
    if (!Number.isSafeInteger(displayOrder) || displayOrder > 1_000_000) {
      throw new Error("Catalog display order must be between 0 and 1,000,000");
    }

    return {
      catalogNodeId: assignment.catalogNodeId,
      isFeatured: assignment.isFeatured,
      displayOrder,
    };
  });
}

export function ProductCatalogAssignmentSection({
  productId,
  assignments,
  onChange,
  onLoadingChange,
  onLoadError,
  saveError,
  onProductKindSuggested,
}: {
  productId?: string;
  assignments: CatalogAssignmentDraft[];
  onChange: (assignments: CatalogAssignmentDraft[]) => void;
  onLoadingChange: (loading: boolean) => void;
  onLoadError: (error: string | null) => void;
  saveError?: string | null;
  onProductKindSuggested?: (kind: ProductKind) => void;
}) {
  const [nodes, setNodes] = useState<CatalogNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nodeToAdd, setNodeToAdd] = useState("");
  const [departmentPath, setDepartmentPath] = useState("");
  const [primaryNodeId, setPrimaryNodeId] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      onLoadingChange(Boolean(productId));
      setLoadError(null);
      onLoadError(null);

      try {
        const nodesResponse = await adminFetch(
          "/api/admin/catalog/nodes?active=true&visible=all&limit=250"
        );
        const nodesPayload = await nodesResponse.json().catch(() => null);
        if (!nodesResponse.ok) {
          throw new Error(readApiError(nodesPayload, "Failed to load catalog nodes"));
        }

        if (cancelled) return;
        const loadedNodes = Array.isArray(nodesPayload?.nodes)
          ? (nodesPayload.nodes as CatalogNode[])
          : [];
        setNodes(loadedNodes);

        if (!productId) return;

        const assignmentsResponse = await adminFetch(
          `/api/admin/catalog/assignments?productId=${encodeURIComponent(productId)}&page=1&limit=1&status=all`
        );
        const assignmentsPayload = await assignmentsResponse.json().catch(() => null);
        if (!assignmentsResponse.ok) {
          throw new Error(
            readApiError(assignmentsPayload, "Failed to load catalog assignments")
          );
        }

        if (cancelled) return;
        const currentAssignments = Array.isArray(assignmentsPayload?.products?.[0]?.catalogAssignments)
          ? (assignmentsPayload.products[0].catalogAssignments as AssignmentApiRow[])
          : [];

        // A newly-created Product may be switched into edit mode solely to
        // retry a failed assignment save. Keep that unsaved draft intact.
        onChange(
          assignments.length
            ? assignments
            : currentAssignments.map((assignment) => ({
                catalogNodeId: assignment.catalogNodeId,
                isFeatured: assignment.isFeatured,
                displayOrder:
                  assignment.displayOrder === null
                    ? ""
                    : String(assignment.displayOrder),
                catalogNode: assignment.catalogNode,
              }))
        );
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load catalog data";
          setLoadError(message);
          onLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          onLoadingChange(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // Load the server state once per Product/dialog identity. Draft edits are
    // intentionally excluded so typing never triggers a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const nodesById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes]
  );
  const availableNodes = nodes.filter(
    (node) => !assignments.some((assignment) => assignment.catalogNodeId === node.id)
  );
  const departments = catalogDepartmentNodes(nodes);
  const nodesForDepartment = departmentPath
    ? nodes.filter((node) => catalogPathMatchesDepartment(node.path, departmentPath))
    : [];

  const addNode = () => {
    const node = nodesById.get(nodeToAdd);
    if (!node) return;
    onChange([
      ...assignments,
      {
        catalogNodeId: node.id,
        isFeatured: false,
        displayOrder: "",
        catalogNode: {
          label: node.label,
          path: node.path,
          isActive: node.isActive,
          isVisible: node.isVisible,
        },
      },
    ]);
    setNodeToAdd("");
  };

  const selectPrimaryNode = (catalogNodeId: string) => {
    setPrimaryNodeId(catalogNodeId);
    const node = nodesById.get(catalogNodeId);
    if (!node) return;

    if (!assignments.some((assignment) => assignment.catalogNodeId === node.id)) {
      onChange([
        ...assignments,
        {
          catalogNodeId: node.id,
          isFeatured: false,
          displayOrder: "",
          catalogNode: {
            label: node.label,
            path: node.path,
            isActive: node.isActive,
            isVisible: node.isVisible,
          },
        },
      ]);
    }

    const suggestedKind = suggestedProductKindForCatalogPath(node.path);
    if (suggestedKind) onProductKindSuggested?.(suggestedKind);
  };

  const updateAssignment = (
    catalogNodeId: string,
    update: Partial<CatalogAssignmentDraft>
  ) => {
    onChange(
      assignments.map((assignment) =>
        assignment.catalogNodeId === catalogNodeId
          ? { ...assignment, ...update }
          : assignment
      )
    );
  };

  return (
    <section className="space-y-3 rounded-lg border border-dashed p-4">
      <div>
        <h3 className="font-medium">Department & category</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose where this product belongs first. The chosen category is added
          safely to its catalog placements; existing placements are never removed.
        </p>
      </div>

      {saveError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Product saved; catalog assignments need attention</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {loadError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Catalog data could not be loaded</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="catalog-department">Main department</Label>
          <Select
            value={departmentPath}
            onValueChange={(path) => {
              setDepartmentPath(path);
              setPrimaryNodeId("");
            }}
            disabled={loading || !departments.length}
          >
            <SelectTrigger id="catalog-department">
              <SelectValue placeholder={loading ? "Loading departments..." : "Choose department"} />
            </SelectTrigger>
            <SelectContent>
              {departments.map((node) => (
                <SelectItem key={node.id} value={node.path}>
                  {node.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="catalog-primary-node">Category / subcategory</Label>
          <Select
            value={primaryNodeId}
            onValueChange={selectPrimaryNode}
            disabled={loading || !departmentPath || !nodesForDepartment.length}
          >
            <SelectTrigger id="catalog-primary-node">
              <SelectValue placeholder={departmentPath ? "Choose category" : "Choose department first"} />
            </SelectTrigger>
            <SelectContent>
              {nodesForDepartment.map((node) => (
                <SelectItem key={node.id} value={node.id}>
                  {node.path}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {primaryNodeId ? (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          This product will be discoverable on the selected category and its parent department pages.
        </p>
      ) : null}

      <div className="border-t border-dashed pt-3">
        <Label className="mb-2 block">Additional catalog placements</Label>
        <div className="flex gap-2">
        <Select value={nodeToAdd} onValueChange={setNodeToAdd} disabled={loading || !availableNodes.length}>
          <SelectTrigger aria-label="Catalog node">
            <SelectValue placeholder={loading ? "Loading catalog nodes..." : "Select catalog node"} />
          </SelectTrigger>
          <SelectContent>
            {availableNodes.map((node) => (
              <SelectItem key={node.id} value={node.id}>
                {node.path}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={addNode} disabled={!nodeToAdd || loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add
        </Button>
        </div>
      </div>

      {assignments.length === 0 ? (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          No category is assigned yet. Choose a department and category above so this product can appear in the storefront catalog.
        </p>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const node = assignment.catalogNode || nodesById.get(assignment.catalogNodeId);
            const nodeActive = node?.isActive !== false;
            return (
              <div key={assignment.catalogNodeId} className="space-y-3 rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{node?.label || assignment.catalogNodeId}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {node?.path || "Catalog node unavailable"}
                    </p>
                    {!nodeActive && <Badge variant="destructive" className="mt-1">Inactive</Badge>}
                    {node && !node.isVisible && <Badge variant="outline" className="ml-1 mt-1">Not visible</Badge>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onChange(assignments.filter((item) => item.catalogNodeId !== assignment.catalogNodeId))}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-end">
                  <label className="flex min-h-10 items-center gap-2 text-sm">
                    <Checkbox
                      checked={assignment.isFeatured}
                      onCheckedChange={(value) => updateAssignment(assignment.catalogNodeId, { isFeatured: value === true })}
                      disabled={!nodeActive}
                    />
                    Featured in this node
                  </label>
                  <div className="space-y-1">
                    <Label htmlFor={`catalog-order-${assignment.catalogNodeId}`}>Catalog display order</Label>
                    <Input
                      id={`catalog-order-${assignment.catalogNodeId}`}
                      type="number"
                      min={0}
                      max={1_000_000}
                      value={assignment.displayOrder}
                      placeholder="Default"
                      onChange={(event) => updateAssignment(assignment.catalogNodeId, { displayOrder: event.target.value })}
                      disabled={!nodeActive}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
