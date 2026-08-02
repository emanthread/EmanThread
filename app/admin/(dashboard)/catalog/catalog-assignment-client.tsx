"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  History,
  Layers,
  ListChecks,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

interface CatalogNode {
  id: string;
  parentId: string | null;
  nodeType: string;
  label: string;
  slug: string;
  path: string;
  displayOrder: number;
  isActive: boolean;
  isVisible: boolean;
  _count: {
    assignments: number;
    children: number;
  };
}

interface ProductAssignment {
  id: string;
  productId: string;
  catalogNodeId: string;
  isFeatured: boolean;
  displayOrder: number | null;
  createdAt: string;
  updatedAt: string;
  catalogNode: {
    id: string;
    label: string;
    path: string;
    nodeType: string;
    isActive: boolean;
    isVisible: boolean;
  };
}

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  fabricType: string;
  category: {
    id: string;
    name: string;
  };
  catalogAssignments: ProductAssignment[];
}

interface ProductResponse {
  products: ProductRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AuditLog {
  id: string;
  userEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
}

interface CatalogAssignmentClientProps {
  canViewAuditLogs: boolean;
}

const DEPARTMENT_OVERVIEW = [
  {
    name: "Women",
    description: "Choose a Women catalog path for women-focused products.",
  },
  {
    name: "Men",
    description: "Choose a Men catalog path for men-focused products.",
  },
  {
    name: "Fragrance & Beauty",
    description: "Choose a fragrance or beauty path for those products.",
  },
  {
    name: "Teens",
    description: "Choose a Teens catalog path for teen-focused products.",
  },
] as const;

async function readApiError(
  response: Response,
  fallback: string
): Promise<string> {
  const payload = await response.json().catch(() => null);
  return payload && typeof payload.error === "string"
    ? payload.error
    : fallback;
}

function parseOptionalOrder(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) {
    throw new Error("Display order must be a whole number of zero or greater");
  }
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed > 1_000_000) {
    throw new Error("Display order must be between 0 and 1,000,000");
  }
  return parsed;
}

function slugifyCatalogLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const ROOT_CATALOG_PARENT = "__catalog_root__";

type CatalogNodeDraft = {
  parentId: string;
  nodeType: string;
  label: string;
  slug: string;
  displayOrder: string;
  isActive: boolean;
  isVisible: boolean;
};

function emptyCatalogNodeDraft(): CatalogNodeDraft {
  return {
    parentId: ROOT_CATALOG_PARENT,
    nodeType: "category",
    label: "",
    slug: "",
    displayOrder: "0",
    isActive: false,
    isVisible: false,
  };
}

function catalogNodeDraft(node: CatalogNode): CatalogNodeDraft {
  return {
    parentId: node.parentId || ROOT_CATALOG_PARENT,
    nodeType: node.nodeType,
    label: node.label,
    slug: node.slug,
    displayOrder: String(node.displayOrder),
    isActive: node.isActive,
    isVisible: node.isVisible,
  };
}

function catalogDescendantIds(nodes: CatalogNode[], id: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const current = childrenByParent.get(node.parentId) || [];
    current.push(node.id);
    childrenByParent.set(node.parentId, current);
  }

  const descendants = new Set<string>();
  const pending = [...(childrenByParent.get(id) || [])];
  while (pending.length) {
    const current = pending.pop();
    if (!current || descendants.has(current)) continue;
    descendants.add(current);
    pending.push(...(childrenByParent.get(current) || []));
  }
  return descendants;
}

function auditOperation(log: AuditLog): string {
  const values = [log.newValue, log.oldValue];
  for (const value of values) {
    if (
      value &&
      typeof value === "object" &&
      "operation" in value &&
      typeof value.operation === "string"
    ) {
      return value.operation
        .replace(/^CATALOG_/, "")
        .replace(/_/g, " ")
        .toLowerCase();
    }
  }
  return "assignment changed";
}

function NodeChecklist({
  nodes,
  selectedIds,
  onChange,
  emptyMessage,
  maxSelected = 25,
}: {
  nodes: CatalogNode[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyMessage: string;
  maxSelected?: number;
}) {
  const [search, setSearch] = useState("");
  const filteredNodes = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return nodes;
    return nodes.filter(
      (node) =>
        node.label.toLowerCase().includes(normalized) ||
        node.path.toLowerCase().includes(normalized)
    );
  }, [nodes, search]);

  const toggleNode = (nodeId: string, checked: boolean) => {
    if (checked) {
      if (selectedIds.length >= maxSelected) {
        toast.error(`Select no more than ${maxSelected} catalog nodes`);
        return;
      }
      onChange(Array.from(new Set([...selectedIds, nodeId])));
      return;
    }
    onChange(selectedIds.filter((id) => id !== nodeId));
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
          placeholder="Filter catalog paths"
          aria-label="Filter catalog nodes"
        />
      </div>
      <div className="max-h-64 overflow-y-auto rounded-md border">
        {filteredNodes.length ? (
          filteredNodes.map((node) => {
            const checked = selectedIds.includes(node.id);
            return (
              <label
                key={node.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 border-b px-3 py-2.5 last:border-b-0 hover:bg-muted/50",
                  checked && "bg-muted/60"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) =>
                    toggleNode(node.id, value === true)
                  }
                  className="mt-0.5"
                  aria-label={`Select ${node.path}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{node.label}</span>
                    {!node.isVisible && (
                      <Badge variant="outline">Not visible</Badge>
                    )}
                  </span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">
                    {node.path}
                  </span>
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {node._count.assignments}
                </span>
              </label>
            );
          })
        ) : (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {selectedIds.length} of {maxSelected} nodes selected
      </p>
    </div>
  );
}

function CatalogTaxonomyManager({
  nodes,
  loading,
  onChanged,
}: {
  nodes: CatalogNode[];
  loading: boolean;
  onChanged: () => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CatalogNodeDraft>(
    emptyCatalogNodeDraft
  );
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const editingNode = useMemo(
    () => nodes.find((node) => node.id === editingId) || null,
    [editingId, nodes]
  );
  const unavailableParentIds = useMemo(
    () => (editingId ? catalogDescendantIds(nodes, editingId) : new Set()),
    [editingId, nodes]
  );
  const availableParents = useMemo(
    () =>
      nodes.filter(
        (node) =>
          node.id !== editingId && !unavailableParentIds.has(node.id)
      ),
    [editingId, nodes, unavailableParentIds]
  );
  const filteredNodes = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return nodes;
    return nodes.filter(
      (node) =>
        node.label.toLowerCase().includes(normalized) ||
        node.path.toLowerCase().includes(normalized) ||
        node.nodeType.toLowerCase().includes(normalized)
    );
  }, [nodes, search]);

  useEffect(() => {
    if (editingId && !editingNode) {
      setEditingId(null);
      setDraft(emptyCatalogNodeDraft());
      setSlugWasEdited(false);
    }
  }, [editingId, editingNode]);

  const startCreate = () => {
    setEditingId(null);
    setDraft(emptyCatalogNodeDraft());
    setSlugWasEdited(false);
  };

  const startEdit = (node: CatalogNode) => {
    setEditingId(node.id);
    setDraft(catalogNodeDraft(node));
    setSlugWasEdited(true);
  };

  const updateLabel = (label: string) => {
    setDraft((current) => ({
      ...current,
      label,
      slug: slugWasEdited ? current.slug : slugifyCatalogLabel(label),
    }));
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const displayOrder = Number(draft.displayOrder);
    if (
      !Number.isSafeInteger(displayOrder) ||
      displayOrder < 0 ||
      displayOrder > 1_000_000
    ) {
      toast.error("Display order must be a whole number between 0 and 1,000,000");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        parentId:
          draft.parentId === ROOT_CATALOG_PARENT ? null : draft.parentId,
        nodeType: draft.nodeType,
        label: draft.label,
        slug: draft.slug,
        displayOrder,
        isActive: draft.isActive,
        isVisible: draft.isVisible,
      };
      const response = await apiFetch(
        editingId
          ? `/api/admin/catalog/nodes/${encodeURIComponent(editingId)}`
          : "/api/admin/catalog/nodes",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            editingId
              ? "Failed to update catalog path"
              : "Failed to create catalog path"
          )
        );
      }

      toast.success(
        editingId ? "Catalog path updated" : "Catalog path created"
      );
      await onChanged();
      if (!editingId) startCreate();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save catalog path"
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editingNode) return;
    const confirmed = window.confirm(
      `Delete ${editingNode.path}? This is only allowed when it has no child paths and no product assignments. No product will be deleted.`
    );
    if (!confirmed) return;

    setRemoving(true);
    try {
      const response = await apiFetch(
        `/api/admin/catalog/nodes/${encodeURIComponent(editingNode.id)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to delete catalog path")
        );
      }
      toast.success("Catalog path deleted");
      startCreate();
      await onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete catalog path"
      );
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Catalog paths are staged by default</AlertTitle>
        <AlertDescription>
          New paths start inactive and hidden. Publish a parent before its
          child. Existing product assignments are never changed by this form.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(26rem,1.1fr)]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">
                {editingNode ? "Edit catalog path" : "Create catalog path"}
              </CardTitle>
              <CardDescription>
                Use a department as a root, then add categories or
                subcategories beneath it.
              </CardDescription>
            </div>
            {editingNode && (
              <Button type="button" variant="outline" size="sm" onClick={startCreate}>
                <Plus className="mr-2 h-4 w-4" />
                New path
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="catalog-node-parent">Parent path</Label>
                <Select
                  value={draft.parentId}
                  onValueChange={(value) =>
                    setDraft((current) => ({ ...current, parentId: value }))
                  }
                >
                  <SelectTrigger id="catalog-node-parent">
                    <SelectValue placeholder="Choose a parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROOT_CATALOG_PARENT}>
                      No parent (root / department)
                    </SelectItem>
                    {availableParents.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="catalog-node-name">Name</Label>
                  <Input
                    id="catalog-node-name"
                    value={draft.label}
                    onChange={(event) => updateLabel(event.target.value)}
                    placeholder="e.g. Fragrances"
                    maxLength={120}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catalog-node-kind">Kind</Label>
                  <Input
                    id="catalog-node-kind"
                    value={draft.nodeType}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        nodeType: event.target.value,
                      }))
                    }
                    placeholder="department, category, subcategory"
                    maxLength={48}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <div className="space-y-2">
                  <Label htmlFor="catalog-node-slug">Slug</Label>
                  <Input
                    id="catalog-node-slug"
                    value={draft.slug}
                    onChange={(event) => {
                      setSlugWasEdited(true);
                      setDraft((current) => ({
                        ...current,
                        slug: slugifyCatalogLabel(event.target.value),
                      }));
                    }}
                    placeholder="fragrances"
                    maxLength={80}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Lowercase letters, numbers, and hyphens. Parent or slug
                    changes require the path to be inactive and hidden.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catalog-node-order">Order</Label>
                  <Input
                    id="catalog-node-order"
                    type="number"
                    min={0}
                    max={1_000_000}
                    value={draft.displayOrder}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        displayOrder: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={draft.isActive}
                    onCheckedChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        isActive: value === true,
                        isVisible:
                          value === true ? current.isVisible : false,
                      }))
                    }
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium">Active</span>
                    <span className="block text-xs text-muted-foreground">
                      Can receive product assignments.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={draft.isVisible}
                    onCheckedChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        isVisible: value === true,
                        isActive:
                          value === true ? true : current.isActive,
                      }))
                    }
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium">Visible</span>
                    <span className="block text-xs text-muted-foreground">
                      Published only when every parent is published too.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving || removing}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {editingNode ? "Save path" : "Create path"}
                </Button>
                {editingNode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void remove()}
                    disabled={saving || removing}
                  >
                    {removing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete path
                  </Button>
                )}
              </div>
              {editingNode &&
                (editingNode._count.children || editingNode._count.assignments) ? (
                  <p className="text-xs text-muted-foreground">
                    Deletion is blocked: {editingNode._count.children} child
                    path(s) and {editingNode._count.assignments} product
                    assignment(s) remain.
                  </p>
                ) : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Existing catalog paths</CardTitle>
            <CardDescription>
              Select a path to edit its name, placement, publication, or
              display order. Product mappings stay in the Assign a product tab.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Filter paths, names, or kinds"
                aria-label="Filter catalog paths to manage"
              />
            </div>
            <div className="max-h-[34rem] overflow-y-auto rounded-md border">
              {loading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : filteredNodes.length ? (
                filteredNodes.map((node) => (
                  <div
                    key={node.id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-3 border-b px-3 py-3 last:border-b-0",
                      editingId === node.id && "bg-muted/60"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{node.label}</p>
                        <Badge variant="outline">{node.nodeType}</Badge>
                        {!node.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {node.isActive && !node.isVisible && (
                          <Badge variant="secondary">Hidden</Badge>
                        )}
                        {node.isActive && node.isVisible && (
                          <Badge>Published</Badge>
                        )}
                      </div>
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        {node.path}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {node._count.children} child path(s) /{" "}
                        {node._count.assignments} assignment(s) / order{" "}
                        {node.displayOrder}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={editingId === node.id ? "default" : "outline"}
                      onClick={() => startEdit(node)}
                    >
                      Edit
                    </Button>
                  </div>
                ))
              ) : (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No catalog paths match this filter.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AssignmentEditor({
  assignment,
  onChanged,
}: {
  assignment: ProductAssignment;
  onChanged: () => Promise<void>;
}) {
  const [isFeatured, setIsFeatured] = useState(assignment.isFeatured);
  const [displayOrder, setDisplayOrder] = useState(
    assignment.displayOrder === null ? "" : String(assignment.displayOrder)
  );
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setIsFeatured(assignment.isFeatured);
    setDisplayOrder(
      assignment.displayOrder === null ? "" : String(assignment.displayOrder)
    );
  }, [assignment.displayOrder, assignment.isFeatured]);

  const save = async () => {
    setSaving(true);
    try {
      const order = parseOptionalOrder(displayOrder);
      const response = await apiFetch(
        `/api/admin/catalog/assignments/${assignment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isFeatured,
            displayOrder: order,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to update assignment")
        );
      }
      toast.success("Catalog assignment updated");
      await onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update assignment"
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const confirmed = window.confirm(
      `Remove this product from ${assignment.catalogNode.path}? The product itself will not be changed.`
    );
    if (!confirmed) return;

    setRemoving(true);
    try {
      const response = await apiFetch(
        `/api/admin/catalog/assignments/${assignment.id}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to remove assignment")
        );
      }
      toast.success("Catalog assignment removed");
      await onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove assignment"
      );
    } finally {
      setRemoving(false);
    }
  };

  const changed =
    isFeatured !== assignment.isFeatured ||
    displayOrder !==
      (assignment.displayOrder === null ? "" : String(assignment.displayOrder));

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{assignment.catalogNode.label}</p>
            {!assignment.catalogNode.isActive && (
              <Badge variant="destructive">Inactive</Badge>
            )}
            {!assignment.catalogNode.isVisible && (
              <Badge variant="outline">Not visible</Badge>
            )}
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {assignment.catalogNode.path}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={remove}
          disabled={removing}
        >
          {removing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Remove
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <Checkbox
            checked={isFeatured}
            onCheckedChange={(value) => setIsFeatured(value === true)}
            disabled={!assignment.catalogNode.isActive}
          />
          Featured in this node
        </label>
        <div className="space-y-1">
          <Label htmlFor={`order-${assignment.id}`}>Display order</Label>
          <Input
            id={`order-${assignment.id}`}
            type="number"
            min={0}
            max={1_000_000}
            value={displayOrder}
            onChange={(event) => setDisplayOrder(event.target.value)}
            placeholder="Default"
            disabled={!assignment.catalogNode.isActive}
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={
            saving || !changed || !assignment.catalogNode.isActive
          }
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}

export default function CatalogAssignmentClient({
  canViewAuditLogs,
}: CatalogAssignmentClientProps) {
  const [nodes, setNodes] = useState<CatalogNode[]>([]);
  const [nodesLoading, setNodesLoading] = useState(true);
  const [taxonomyNodes, setTaxonomyNodes] = useState<CatalogNode[]>([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(true);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [nodeFilter, setNodeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "assigned" | "unassigned"
  >("all");
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(
    null
  );
  const [newNodeIds, setNewNodeIds] = useState<string[]>([]);
  const [newFeatured, setNewFeatured] = useState(false);
  const [newDisplayOrder, setNewDisplayOrder] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [bulkIdentifierType, setBulkIdentifierType] = useState<
    "productIds" | "skus"
  >("productIds");
  const [bulkIdentifiers, setBulkIdentifiers] = useState("");
  const [bulkNodeIds, setBulkNodeIds] = useState<string[]>([]);
  const [bulkFeatured, setBulkFeatured] = useState(false);
  const [bulkDisplayOrder, setBulkDisplayOrder] = useState("");
  const [bulkReviewed, setBulkReviewed] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const productRequestSequence = useRef(0);

  const loadNodes = useCallback(async () => {
    setNodesLoading(true);
    try {
      const response = await fetch(
        "/api/admin/catalog/nodes?active=true&visible=all&limit=1000",
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to load catalog nodes")
        );
      }
      const data = (await response.json()) as { nodes?: CatalogNode[] };
      setNodes(data.nodes || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load catalog nodes"
      );
      setNodes([]);
    } finally {
      setNodesLoading(false);
    }
  }, []);

  const loadTaxonomyNodes = useCallback(async () => {
    setTaxonomyLoading(true);
    try {
      const response = await fetch(
        "/api/admin/catalog/nodes?active=all&visible=all&limit=1000",
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to load catalog paths")
        );
      }
      const data = (await response.json()) as { nodes?: CatalogNode[] };
      setTaxonomyNodes(data.nodes || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load catalog paths"
      );
      setTaxonomyNodes([]);
    } finally {
      setTaxonomyLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    const requestSequence = ++productRequestSequence.current;
    setProductsLoading(true);
    setProductsError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        status: statusFilter,
      });
      if (appliedSearch) params.set("search", appliedSearch);
      if (nodeFilter !== "all") {
        params.set("catalogNodeId", nodeFilter);
      }

      const response = await fetch(
        `/api/admin/catalog/assignments?${params.toString()}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to load products")
        );
      }
      const data = (await response.json()) as ProductResponse;
      if (requestSequence !== productRequestSequence.current) return;

      setProducts(data.products || []);
      setTotalProducts(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setSelectedProduct((current) => {
        if (!current) return null;
        return (
          data.products.find((product) => product.id === current.id) || current
        );
      });
    } catch (error) {
      if (requestSequence !== productRequestSequence.current) return;
      setProducts([]);
      setTotalProducts(0);
      setTotalPages(1);
      setProductsError(
        error instanceof Error ? error.message : "Failed to load products"
      );
    } finally {
      if (requestSequence === productRequestSequence.current) {
        setProductsLoading(false);
      }
    }
  }, [appliedSearch, nodeFilter, page, statusFilter]);

  const refreshProduct = useCallback(async (productId: string) => {
    const params = new URLSearchParams({
      productId,
      page: "1",
      limit: "1",
      status: "all",
    });
    const response = await fetch(
      `/api/admin/catalog/assignments?${params.toString()}`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(
        await readApiError(response, "Failed to refresh selected product")
      );
    }
    const data = (await response.json()) as ProductResponse;
    const product = data.products.find((item) => item.id === productId) || null;
    setSelectedProduct(product);
  }, []);

  const loadAuditLogs = useCallback(async () => {
    if (!canViewAuditLogs) return;
    setAuditLoading(true);
    try {
      const assignmentParams = new URLSearchParams({
        page: "1",
        limit: "15",
        entity: "ProductCatalogAssignment",
      });
      const nodeParams = new URLSearchParams({
        page: "1",
        limit: "15",
        entity: "CatalogNode",
      });
      const [assignmentResponse, nodeResponse] = await Promise.all([
        fetch(`/api/admin/audit-logs?${assignmentParams}`, {
          cache: "no-store",
        }),
        fetch(`/api/admin/audit-logs?${nodeParams}`, {
          cache: "no-store",
        }),
      ]);
      if (!assignmentResponse.ok || !nodeResponse.ok) {
        throw new Error(
          await readApiError(
            !assignmentResponse.ok ? assignmentResponse : nodeResponse,
            "Failed to load catalog audit trail"
          )
        );
      }
      const [assignmentData, nodeData] = (await Promise.all([
        assignmentResponse.json(),
        nodeResponse.json(),
      ])) as [{ logs?: AuditLog[] }, { logs?: AuditLog[] }];
      setAuditLogs(
        [...(assignmentData.logs || []), ...(nodeData.logs || [])]
          .sort(
            (left, right) =>
              new Date(right.createdAt).getTime() -
              new Date(left.createdAt).getTime()
          )
          .slice(0, 15)
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load catalog audit trail"
      );
    } finally {
      setAuditLoading(false);
    }
  }, [canViewAuditLogs]);

  useEffect(() => {
    void loadNodes();
  }, [loadNodes]);

  useEffect(() => {
    void loadTaxonomyNodes();
  }, [loadTaxonomyNodes]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  useEffect(() => {
    setNewNodeIds([]);
    setNewFeatured(false);
    setNewDisplayOrder("");
  }, [selectedProduct?.id]);

  const refreshAfterMutation = useCallback(async () => {
    const selectedId = selectedProduct?.id;
    const tasks: Promise<unknown>[] = [
      loadProducts(),
      loadNodes(),
      loadTaxonomyNodes(),
    ];
    if (selectedId) tasks.push(refreshProduct(selectedId));
    if (canViewAuditLogs) tasks.push(loadAuditLogs());
    await Promise.all(tasks);
  }, [
    canViewAuditLogs,
    loadAuditLogs,
    loadNodes,
    loadTaxonomyNodes,
    loadProducts,
    refreshProduct,
    selectedProduct?.id,
  ]);

  const assignedNodeIds = useMemo(
    () =>
      new Set(
        selectedProduct?.catalogAssignments.map(
          (assignment) => assignment.catalogNodeId
        ) || []
      ),
    [selectedProduct]
  );
  const availableNodes = useMemo(
    () =>
      nodes.filter(
        (node) => node.isActive && !assignedNodeIds.has(node.id)
      ),
    [assignedNodeIds, nodes]
  );

  const applySearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const selectProduct = (product: ProductRow) => {
    setSelectedProduct(product);
  };

  const addAssignments = async () => {
    if (!selectedProduct) {
      toast.error("Select a product first");
      return;
    }
    if (!newNodeIds.length) {
      toast.error("Select at least one active catalog node");
      return;
    }

    setAssigning(true);
    try {
      const displayOrder = parseOptionalOrder(newDisplayOrder);
      const response = await apiFetch("/api/admin/catalog/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          catalogNodeIds: newNodeIds,
          isFeatured: newFeatured,
          displayOrder,
        }),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to add assignments")
        );
      }
      const data = (await response.json()) as { count?: number };
      toast.success(
        `${data.count || newNodeIds.length} catalog assignment(s) added`
      );
      setNewNodeIds([]);
      setNewFeatured(false);
      setNewDisplayOrder("");
      await refreshAfterMutation();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add assignments"
      );
    } finally {
      setAssigning(false);
    }
  };

  const submitBulkAssignments = async () => {
    const references = Array.from(
      new Set(
        bulkIdentifiers
          .split(/[\s,]+/)
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );
    if (!references.length) {
      toast.error("Enter at least one Product ID or SKU");
      return;
    }
    if (references.length > 100) {
      toast.error("Bulk requests are limited to 100 product references");
      return;
    }
    if (!bulkNodeIds.length) {
      toast.error("Select at least one active catalog node");
      return;
    }
    if (!bulkReviewed) {
      toast.error("Confirm that the explicit bulk list has been reviewed");
      return;
    }

    setBulkSaving(true);
    try {
      const displayOrder = parseOptionalOrder(bulkDisplayOrder);
      const response = await apiFetch("/api/admin/catalog/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [bulkIdentifierType]: references,
          catalogNodeIds: bulkNodeIds,
          isFeatured: bulkFeatured,
          displayOrder,
          reviewed: true,
        }),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to create bulk assignments")
        );
      }
      const data = (await response.json()) as { count?: number };
      toast.success(`${data.count || 0} reviewed assignment(s) added`);
      setBulkIdentifiers("");
      setBulkNodeIds([]);
      setBulkFeatured(false);
      setBulkDisplayOrder("");
      setBulkReviewed(false);
      await refreshAfterMutation();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create bulk assignments"
      );
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">Catalog Assignment</h1>
            <Badge variant="outline">Additive catalog</Badge>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Assign existing products to one or more dedicated catalog paths.
            Legacy Category and Fabric Type values remain read-only and are
            never changed here.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void refreshAfterMutation()}
          disabled={productsLoading || nodesLoading || taxonomyLoading}
        >
          <RefreshCw
            className={cn(
              "mr-2 h-4 w-4",
              (productsLoading || nodesLoading || taxonomyLoading) &&
                "animate-spin"
            )}
          />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Simple catalog workflow</CardTitle>
          <CardDescription>
            For a normal assignment, select an existing product, choose its
            catalog path, then save. Product details and legacy taxonomy stay
            unchanged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ol className="grid gap-3 md:grid-cols-3">
            {[
              ["1", "Select an existing product", "Search by name, SKU, or Product ID."],
              ["2", "Choose an active catalog path", "Pick the right destination from the list."],
              ["3", "Save the assignment", "Review the saved path or make an adjustment."],
            ].map(([step, title, description]) => (
              <li key={step} className="flex gap-3 rounded-lg border p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {step}
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <section aria-labelledby="department-guide-title">
            <p id="department-guide-title" className="text-sm font-medium">
              Department guide
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {DEPARTMENT_OVERVIEW.map((department) => (
                <div key={department.name} className="rounded-md bg-muted/50 p-3">
                  <p className="text-sm font-medium">{department.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {department.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </CardContent>
      </Card>

      <Alert>
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Assignments do not change products</AlertTitle>
        <AlertDescription>
          Removing a saved path only removes discovery from that path. It does
          not delete the product or alter its SKU, stock, price, Category, or
          Fabric Type.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {nodesLoading ? "Loading" : nodes.length} active catalog nodes
        </Badge>
        <Badge variant="secondary">
          {productsLoading ? "Loading" : totalProducts} matching products
        </Badge>
        {selectedProduct && (
          <Badge>{selectedProduct.catalogAssignments.length} current mappings</Badge>
        )}
      </div>

      <Tabs defaultValue="assign" className="space-y-4">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="assign">
            <Layers className="h-4 w-4" />
            Assign a product
          </TabsTrigger>
          <TabsTrigger value="paths">
            <Layers className="h-4 w-4" />
            Manage catalog paths
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <ListChecks className="h-4 w-4" />
            Bulk (advanced)
          </TabsTrigger>
          {canViewAuditLogs && (
            <TabsTrigger value="audit">
              <History className="h-4 w-4" />
              Audit trail
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="assign" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                1. Select an existing product
              </CardTitle>
              <CardDescription>
                Search by Product ID, SKU, or name, then select the product you
                want to place in a catalog path. Filters are optional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={applySearch}
                className="grid gap-3 lg:grid-cols-[minmax(15rem,1fr)_minmax(12rem,18rem)_11rem_auto]"
              >
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    className="pl-9"
                    placeholder="Product ID, SKU, or name"
                    aria-label="Search products"
                  />
                </div>
                <Select
                  value={nodeFilter}
                  onValueChange={(value) => {
                    setNodeFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger aria-label="Catalog node filter">
                    <SelectValue placeholder="All catalog nodes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All catalog nodes</SelectItem>
                    {nodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(
                      value as "all" | "assigned" | "unassigned"
                    );
                    setPage(1);
                  }}
                >
                  <SelectTrigger aria-label="Assignment status filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All products</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit">
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </form>

              {productsError && (
                <Alert variant="destructive">
                  <AlertTriangle aria-hidden="true" />
                  <AlertTitle>Products could not be loaded</AlertTitle>
                  <AlertDescription>{productsError}</AlertDescription>
                </Alert>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Legacy context</TableHead>
                      <TableHead>Mappings</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center">
                          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                          <span className="mt-2 block text-sm text-muted-foreground">
                            Loading products
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : products.length ? (
                      products.map((product) => (
                        <TableRow
                          key={product.id}
                          data-state={
                            selectedProduct?.id === product.id
                              ? "selected"
                              : undefined
                          }
                        >
                          <TableCell className="max-w-sm whitespace-normal">
                            <p className="font-medium">{product.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {product.sku}
                            </p>
                            <p
                              className="max-w-xs truncate font-mono text-[11px] text-muted-foreground"
                              title={product.id}
                            >
                              {product.id}
                            </p>
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            <p className="text-sm">{product.category.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Fabric: {product.fabricType || "—"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                product.catalogAssignments.length
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {product.catalogAssignments.length}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={
                                selectedProduct?.id === product.id
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => selectProduct(product)}
                              aria-pressed={selectedProduct?.id === product.id}
                            >
                              Select
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-32 text-center text-muted-foreground"
                        >
                          No products match these filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} · {totalProducts} product(s)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page <= 1 || productsLoading}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((value) => Math.min(totalPages, value + 1))
                    }
                    disabled={page >= totalPages || productsLoading}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedProduct ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-5 w-5" />
                    2. Choose catalog path
                  </CardTitle>
                  <CardDescription>
                    The selected product is read-only here. Choose one or more
                    active paths, then save.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted/40 p-4">
                    <p className="font-medium">{selectedProduct.name}</p>
                    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Product ID</dt>
                        <dd className="break-all font-mono text-xs">
                          {selectedProduct.id}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">SKU</dt>
                        <dd className="font-mono">{selectedProduct.sku}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          Legacy Category
                        </dt>
                        <dd>{selectedProduct.category.name}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          Legacy Fabric Type
                        </dt>
                        <dd>{selectedProduct.fabricType || "—"}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label>Choose active catalog path</Label>
                      <p className="text-xs text-muted-foreground">
                        Already assigned paths are omitted. You can choose more
                        than one if needed.
                      </p>
                    </div>
                    {nodesLoading ? (
                      <div className="flex h-24 items-center justify-center rounded-md border">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : (
                      <NodeChecklist
                        nodes={availableNodes}
                        selectedIds={newNodeIds}
                        onChange={setNewNodeIds}
                        emptyMessage="No additional active nodes are available."
                      />
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex min-h-10 items-center gap-2 text-sm">
                        <Checkbox
                          checked={newFeatured}
                          onCheckedChange={(value) =>
                            setNewFeatured(value === true)
                          }
                        />
                        Featured in selected nodes
                      </label>
                      <div className="space-y-1">
                        <Label htmlFor="new-display-order">
                          Display order
                        </Label>
                        <Input
                          id="new-display-order"
                          type="number"
                          min={0}
                          max={1_000_000}
                          value={newDisplayOrder}
                          onChange={(event) =>
                            setNewDisplayOrder(event.target.value)
                          }
                          placeholder="Default"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={addAssignments}
                      disabled={assigning || !newNodeIds.length}
                      className="w-full sm:w-auto"
                    >
                      {assigning ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      3. Save {newNodeIds.length || ""} catalog path
                      {newNodeIds.length === 1 ? "" : "s"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Saved catalog paths
                  </CardTitle>
                  <CardDescription>
                    Featured state and display order are specific to each saved
                    path.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedProduct.catalogAssignments.length ? (
                      selectedProduct.catalogAssignments.map((assignment) => (
                        <AssignmentEditor
                          key={assignment.id}
                          assignment={assignment}
                          onChanged={refreshAfterMutation}
                        />
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                        This product has no saved catalog paths yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex min-h-40 flex-col items-center justify-center text-center">
                <Package className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">Start by selecting a product</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Then choose an active catalog path and save. Its legacy
                  taxonomy remains read-only.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="paths" className="space-y-4">
          <CatalogTaxonomyManager
            nodes={taxonomyNodes}
            loading={taxonomyLoading}
            onChanged={refreshAfterMutation}
          />
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Advanced: reviewed bulk assignment
              </CardTitle>
              <CardDescription>
                Provide an explicit, reviewed list of up to 100 Product IDs or
                SKUs. No query-based “select all” action is available.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-id-type">Identifier type</Label>
                    <Select
                      value={bulkIdentifierType}
                      onValueChange={(value) =>
                        setBulkIdentifierType(value as "productIds" | "skus")
                      }
                    >
                      <SelectTrigger id="bulk-id-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="productIds">Product IDs</SelectItem>
                        <SelectItem value="skus">SKUs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulk-identifiers">
                      Explicit{" "}
                      {bulkIdentifierType === "productIds"
                        ? "Product IDs"
                        : "SKUs"}
                    </Label>
                    <Textarea
                      id="bulk-identifiers"
                      value={bulkIdentifiers}
                      onChange={(event) =>
                        setBulkIdentifiers(event.target.value)
                      }
                      rows={12}
                      className="font-mono text-xs"
                      placeholder="One identifier per line (commas also accepted)"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Active destination nodes</Label>
                    <p className="mb-2 text-xs text-muted-foreground">
                      The request is rejected if any product, node, or duplicate
                      mapping is invalid.
                    </p>
                    {nodesLoading ? (
                      <div className="flex h-24 items-center justify-center rounded-md border">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : (
                      <NodeChecklist
                        nodes={nodes.filter((node) => node.isActive)}
                        selectedIds={bulkNodeIds}
                        onChange={setBulkNodeIds}
                        emptyMessage="No active catalog nodes are available."
                      />
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex min-h-10 items-center gap-2 text-sm">
                      <Checkbox
                        checked={bulkFeatured}
                        onCheckedChange={(value) =>
                          setBulkFeatured(value === true)
                        }
                      />
                      Featured in selected nodes
                    </label>
                    <div className="space-y-1">
                      <Label htmlFor="bulk-display-order">
                        Display order
                      </Label>
                      <Input
                        id="bulk-display-order"
                        type="number"
                        min={0}
                        max={1_000_000}
                        value={bulkDisplayOrder}
                        onChange={(event) =>
                          setBulkDisplayOrder(event.target.value)
                        }
                        placeholder="Default"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
                <Checkbox
                  checked={bulkReviewed}
                  onCheckedChange={(value) =>
                    setBulkReviewed(value === true)
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">
                    I reviewed these explicit products and destination nodes
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    This action creates only ProductCatalogAssignment rows and
                    is recorded in the audit log.
                  </span>
                </span>
              </label>

              <Button
                onClick={submitBulkAssignments}
                disabled={
                  bulkSaving ||
                  !bulkIdentifiers.trim() ||
                  !bulkNodeIds.length ||
                  !bulkReviewed
                }
              >
                {bulkSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ListChecks className="mr-2 h-4 w-4" />
                )}
                Create reviewed assignments
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {canViewAuditLogs && (
          <TabsContent value="audit">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">
                    Catalog activity audit trail
                  </CardTitle>
                  <CardDescription>
                    Recent path and assignment changes recorded by the existing
                    central audit mechanism.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/audit-logs">
                    Full audit log
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : auditLogs.length ? (
                  <div className="divide-y rounded-md border">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {auditOperation(log)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.userEmail || "Unknown administrator"}
                            {log.entityId ? ` · ${log.entityId}` : ""}
                          </p>
                        </div>
                        <time
                          dateTime={log.createdAt}
                          className="text-xs text-muted-foreground"
                        >
                          {new Date(log.createdAt).toLocaleString()}
                        </time>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                    No catalog activity audit entries have been recorded yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {!canViewAuditLogs && (
        <p className="text-xs text-muted-foreground">
          Assignment changes are recorded in the central audit log. Viewing
          that log requires the existing Audit Logs permission.
        </p>
      )}
    </div>
  );
}
