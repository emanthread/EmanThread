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

type CatalogNode = {
  id: string;
  label: string;
  path: string;
  isActive: boolean;
  isVisible: boolean;
};

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
}: {
  productId?: string;
  assignments: CatalogAssignmentDraft[];
  onChange: (assignments: CatalogAssignmentDraft[]) => void;
  onLoadingChange: (loading: boolean) => void;
  onLoadError: (error: string | null) => void;
  saveError?: string | null;
}) {
  const [nodes, setNodes] = useState<CatalogNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nodeToAdd, setNodeToAdd] = useState("");

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
        <h3 className="font-medium">Catalog Assignment</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign this product to dedicated catalog nodes. Category and Fabric Type
          remain unchanged.
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

      {assignments.length === 0 ? (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          No catalog nodes assigned. Saving this product will not change catalog discovery.
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
