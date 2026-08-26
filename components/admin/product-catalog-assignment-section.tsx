"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminFetch } from "@/lib/admin-fetch";
import type { ProductKind } from "@/lib/data";
import {
  classifyCatalogNode,
  humanizeCatalogSegment,
} from "@/lib/catalog-product-classification";
import { cn } from "@/lib/utils";

export type CatalogAssignmentDraft = {
  catalogNodeId: string;
  isFeatured: boolean;
  displayOrder: string;
  catalogNode?: {
    label: string;
    path: string;
    productKind?: ProductKind | null;
    isActive: boolean;
    isVisible: boolean;
    _count?: { children: number };
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
  productKind?: ProductKind | null;
  isActive: boolean;
  isVisible: boolean;
  _count?: { children: number };
};

function catalogDepartmentNodes(nodes: CatalogNode[]): CatalogNode[] {
  return nodes.filter((node) => node.path.split("/").filter(Boolean).length === 1);
}

function catalogPathMatchesDepartment(path: string, departmentPath: string): boolean {
  return path === departmentPath || path.startsWith(`${departmentPath}/`);
}

function catalogNodeBreadcrumb(
  path: string,
  nodesOrLabels: CatalogNode[] | ReadonlyMap<string, string>
): string {
  const labelsByPath = Array.isArray(nodesOrLabels)
    ? new Map(nodesOrLabels.map((node) => [node.path, node.label]))
    : nodesOrLabels;
  let currentPath = "";
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      currentPath += `/${segment}`;
      return labelsByPath.get(currentPath) || humanizeCatalogSegment(segment);
    })
    .join(" > ");
}

const MAX_VISIBLE_CATEGORY_RESULTS = 75;

export function catalogNodePickerResults(
  nodes: CatalogNode[],
  allNodes: CatalogNode[],
  search: string,
  limit = MAX_VISIBLE_CATEGORY_RESULTS
): { nodes: CatalogNode[]; total: number } {
  const labelsByPath = new Map(
    allNodes.map((node) => [node.path, node.label])
  );
  const normalizedSearch = search.trim().toLocaleLowerCase("en-US");
  const matchingNodes = nodes.filter((node) => {
    if (!normalizedSearch) return true;
    const breadcrumb = catalogNodeBreadcrumb(node.path, labelsByPath);
    return `${node.label} ${breadcrumb} ${node.path}`
      .toLocaleLowerCase("en-US")
      .includes(normalizedSearch);
  });
  return { nodes: matchingNodes.slice(0, limit), total: matchingNodes.length };
}

/** Strip the department prefix from a breadcrumb string for display in the category dropdown. */
function stripDepartmentPrefix(breadcrumb: string, departmentLabel: string): string {
  const prefix = departmentLabel + " > ";
  return breadcrumb.startsWith(prefix) ? breadcrumb.slice(prefix.length) : breadcrumb;
}

function CatalogNodeCombobox({
  id,
  value,
  nodes,
  allNodes,
  onChange,
  disabled,
  placeholder,
  searchPlaceholder,
  ariaLabel,
  stripPrefixPath,
}: {
  id?: string;
  value: string;
  nodes: CatalogNode[];
  allNodes: CatalogNode[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  ariaLabel?: string;
  /** When set, the department segment is stripped from displayed labels so the category box only shows subcategory paths. */
  stripPrefixPath?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const labelsByPath = useMemo(
    () => new Map(allNodes.map((node) => [node.path, node.label])),
    [allNodes]
  );
  const selected = nodes.find((node) => node.id === value);
  const results = useMemo(
    () => catalogNodePickerResults(nodes, allNodes, search),
    [allNodes, nodes, search]
  );

  // Label of the department node to strip (e.g. "FRAGRANCE & BEAUTY")
  const departmentLabel = useMemo(
    () => (stripPrefixPath ? (labelsByPath.get(stripPrefixPath) ?? "") : ""),
    [stripPrefixPath, labelsByPath]
  );

  const formatLabel = (path: string) => {
    const full = catalogNodeBreadcrumb(path, labelsByPath);
    return departmentLabel ? stripDepartmentPrefix(full, departmentLabel) : full;
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-left">
            {selected ? formatLabel(selected.path) : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={searchPlaceholder}
          />
          <CommandList>
            {results.nodes.length === 0 ? (
              <CommandEmpty>No matching category.</CommandEmpty>
            ) : (
              results.nodes.map((node) => (
                <CommandItem
                  key={node.id}
                  value={node.id}
                  onSelect={() => {
                    onChange(node.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === node.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">
                    {formatLabel(node.path)}
                  </span>
                </CommandItem>
              ))
            )}
            {results.total > MAX_VISIBLE_CATEGORY_RESULTS && (
              <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                Showing the first {MAX_VISIBLE_CATEGORY_RESULTS} of{" "}
                {results.total}. Type to narrow the list.
              </p>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
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
  onPrimaryPathChange,
  onEstablishedProductKindLoad,
  allowedPrimaryProductKinds,
}: {
  productId?: string;
  assignments: CatalogAssignmentDraft[];
  onChange: (assignments: CatalogAssignmentDraft[]) => void;
  onLoadingChange: (loading: boolean) => void;
  onLoadError: (error: string | null) => void;
  saveError?: string | null;
  allowedPrimaryProductKinds?: readonly ProductKind[];
  onEstablishedProductKindLoad?: (productKind: ProductKind) => void;
  onPrimaryPathChange?: (
    path: string | null,
    reason: "initial" | "selection",
    productKind?: ProductKind | null
  ) => void;
}) {
  const [nodes, setNodes] = useState<CatalogNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nodeToAdd, setNodeToAdd] = useState("");
  const [departmentPath, setDepartmentPath] = useState("");
  const [primaryNodeId, setPrimaryNodeId] = useState("");
  const primaryToReplace = useRef<string | null>(null);

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
        const assignmentProduct = assignmentsPayload?.products?.[0];
        const currentAssignments = Array.isArray(assignmentProduct?.catalogAssignments)
          ? (assignmentProduct.catalogAssignments as AssignmentApiRow[])
          : [];

        // A newly-created Product may be switched into edit mode solely to
        // retry a failed assignment save. Keep that unsaved draft intact.
        const nextAssignments =
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
              }));
        onChange(nextAssignments);

        const firstAssignment = nextAssignments[0];
        const firstNode = firstAssignment
          ? loadedNodes.find((node) => node.id === firstAssignment.catalogNodeId) ||
            firstAssignment.catalogNode
          : null;
        if (firstAssignment && firstNode) {
          setPrimaryNodeId(firstAssignment.catalogNodeId);
          primaryToReplace.current = null;
          const rootSegment = firstNode.path.split("/").filter(Boolean)[0];
          setDepartmentPath(rootSegment ? `/${rootSegment}` : "");
          const isSpecificCategory =
            (firstNode._count?.children ?? 0) === 0 &&
            Boolean(classifyCatalogNode(firstNode));
          onPrimaryPathChange?.(
            isSpecificCategory ? firstNode.path : null,
            "initial",
            isSpecificCategory ? firstNode.productKind : null
          );
        }
        const establishedProductKind = assignmentProduct?.commerceProfile
          ?.productKind as ProductKind | undefined;
        if (establishedProductKind) {
          // Run after the primary callback so a dormant profile wins over a
          // stale or missing primary during a catalog-only rollback repair.
          onEstablishedProductKindLoad?.(establishedProductKind);
        }
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
    ? nodes
        .filter(
          (node) =>
            node.path !== departmentPath &&
            catalogPathMatchesDepartment(node.path, departmentPath) &&
            ((node._count?.children ?? 0) === 0 || node.id === primaryNodeId) &&
            classifyCatalogNode(node) &&
            (node.id === primaryNodeId ||
              !allowedPrimaryProductKinds ||
              (node.productKind != null &&
                allowedPrimaryProductKinds.includes(node.productKind)))
        )
        .sort((left, right) => left.path.localeCompare(right.path, "en"))
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
          productKind: node.productKind,
          isActive: node.isActive,
          isVisible: node.isVisible,
        },
      },
    ]);
    setNodeToAdd("");
  };

  const selectPrimaryNode = (catalogNodeId: string) => {
    const previousPrimaryId = primaryToReplace.current || primaryNodeId;
    primaryToReplace.current = null;
    setPrimaryNodeId(catalogNodeId);
    const node = nodesById.get(catalogNodeId);
    if (!node) return;

    const existing = assignments.find(
      (assignment) => assignment.catalogNodeId === node.id
    );
    const primaryAssignment: CatalogAssignmentDraft = existing || {
      catalogNodeId: node.id,
      isFeatured: false,
      displayOrder: "",
      catalogNode: {
        label: node.label,
        path: node.path,
        productKind: node.productKind,
        isActive: node.isActive,
        isVisible: node.isVisible,
      },
    };
    // A category correction replaces the old primary. Additional placements
    // are retained only when the admin deliberately added them in Advanced.
    onChange([
      primaryAssignment,
      ...assignments.filter(
        (assignment) =>
          assignment.catalogNodeId !== node.id &&
          assignment.catalogNodeId !== previousPrimaryId
      ),
    ]);

    onPrimaryPathChange?.(node.path, "selection", node.productKind);
  };

  const removeAssignment = (catalogNodeId: string) => {
    const remaining = assignments.filter(
      (item) => item.catalogNodeId !== catalogNodeId
    );
    primaryToReplace.current = null;
    onChange(remaining);
    if (catalogNodeId !== primaryNodeId) return;

    const nextPrimary = remaining[0];
    setPrimaryNodeId(nextPrimary?.catalogNodeId || "");
    const node = nextPrimary
      ? nodesById.get(nextPrimary.catalogNodeId) || nextPrimary.catalogNode
      : null;
    const rootSegment = node?.path.split("/").filter(Boolean)[0];
    if (rootSegment) setDepartmentPath(`/${rootSegment}`);
    const isSpecificCategory =
      Boolean(node) &&
      (node?._count?.children ?? 0) === 0 &&
      Boolean(classifyCatalogNode(node));
    onPrimaryPathChange?.(
      isSpecificCategory ? node?.path || null : null,
      "selection",
      isSpecificCategory ? node?.productKind : null
    );
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

  const resolvedPrimaryId = primaryNodeId;
  const primaryAssignment = assignments.find(
    (assignment) => assignment.catalogNodeId === resolvedPrimaryId
  );
  const primaryNode = primaryAssignment
    ? nodesById.get(primaryAssignment.catalogNodeId) || primaryAssignment.catalogNode
    : null;
  const primaryNeedsSpecificCategory =
    Boolean(primaryNode) &&
    ((primaryNode?._count?.children ?? 0) > 0 ||
      !classifyCatalogNode(primaryNode));

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Choose a product category</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          This one choice adapts the rest of the form and places the product in
          the right storefront department.
        </p>
      </div>

      {saveError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Catalog assignments need attention</AlertTitle>
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
          <Label htmlFor="catalog-department">Department *</Label>
          <Select
            value={departmentPath}
            onValueChange={(path) => {
              if (primaryNodeId) primaryToReplace.current = primaryNodeId;
              setDepartmentPath(path);
              setPrimaryNodeId("");
              onPrimaryPathChange?.(null, "selection", null);
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
          <Label htmlFor="catalog-primary-node">Category *</Label>
          <CatalogNodeCombobox
            id="catalog-primary-node"
            value={primaryNodeId}
            nodes={nodesForDepartment}
            allNodes={nodes}
            onChange={selectPrimaryNode}
            disabled={loading || !departmentPath || !nodesForDepartment.length}
            placeholder={departmentPath ? "Choose category" : "Choose department first"}
            searchPlaceholder="Search categories..."
            ariaLabel="Product category"
            stripPrefixPath={departmentPath || undefined}
          />
        </div>
      </div>

      {primaryNode ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          <span>
            <span className="font-medium">Selected:</span>{" "}
            {catalogNodeBreadcrumb(primaryNode.path, nodes)}
          </span>
          {classifyCatalogNode(primaryNode) && (
            <Badge variant="secondary">
              {classifyCatalogNode(primaryNode)?.label}
            </Badge>
          )}
        </div>
      ) : assignments.length === 0 ? (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Choose a department and category to continue.
        </p>
      ) : null}

      {primaryNeedsSpecificCategory && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Choose a more specific category</AlertTitle>
          <AlertDescription>
            This existing placement is a broad storefront landing page. Choose
            a subcategory above; broad pages can remain additional placements.
          </AlertDescription>
        </Alert>
      )}

      <details className="group rounded-lg border bg-muted/10">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">
          Advanced: additional placements and display settings
          <span className="ml-2 font-normal text-muted-foreground">
            {Math.max(0, assignments.length - 1)} additional
          </span>
        </summary>
        <div className="space-y-4 border-t p-4">
          <div>
            <Label className="mb-2 block">Add another storefront placement</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <CatalogNodeCombobox
                value={nodeToAdd}
                nodes={availableNodes}
                allNodes={nodes}
                onChange={setNodeToAdd}
                disabled={loading || !availableNodes.length}
                placeholder={loading ? "Loading categories..." : "Choose another category"}
                searchPlaceholder="Search all placements..."
                ariaLabel="Additional catalog placement"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addNode}
                disabled={!nodeToAdd || loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add placement
              </Button>
            </div>
          </div>

          <div className="space-y-3">
          {assignments.map((assignment) => {
            const node = nodesById.get(assignment.catalogNodeId) || assignment.catalogNode;
            const nodeActive = node?.isActive !== false;
            const isPrimary = assignment.catalogNodeId === resolvedPrimaryId;
            return (
              <div key={assignment.catalogNodeId} className="space-y-3 rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {node?.path
                          ? catalogNodeBreadcrumb(node.path, nodes)
                          : node?.label || "Catalog category unavailable"}
                      </p>
                      {isPrimary && <Badge>Primary</Badge>}
                    </div>
                    {!nodeActive && <Badge variant="destructive" className="mt-1">Inactive</Badge>}
                    {node && !node.isVisible && <Badge variant="outline" className="ml-1 mt-1">Not visible</Badge>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeAssignment(assignment.catalogNodeId)}
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
        </div>
      </details>
    </section>
  );
}
