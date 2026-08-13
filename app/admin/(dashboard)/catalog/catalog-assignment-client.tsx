"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  History,
  ImageIcon,
  Layers,
  ListChecks,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
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
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api-fetch";
import { catalogVisibilityToggleBlockReason } from "@/lib/catalog-visibility";
import {
  catalogBannerFileError,
  isAllowedCatalogBannerImage,
} from "@/lib/catalog-banner";
import type { ProductKind } from "@/lib/data";
import { PRODUCT_KIND_OPTIONS } from "@/lib/catalog-product-classification";
import { cn } from "@/lib/utils";

interface CatalogNode {
  id: string;
  parentId: string | null;
  nodeType: string;
  productKind: ProductKind | null;
  label: string;
  slug: string;
  path: string;
  description: string | null;
  bannerImage: string | null;
  bannerAlt: string | null;
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
  isPrimary: boolean;
  isFeatured: boolean;
  displayOrder: number | null;
  createdAt: string;
  updatedAt: string;
  catalogNode: {
    id: string;
    label: string;
    path: string;
    nodeType: string;
    productKind: ProductKind | null;
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
  stats: {
    total: number;
    assigned: number;
    unassigned: number;
  };
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
  canManageCatalogPaths: boolean;
  canViewAuditLogs: boolean;
}

type CatalogTab = "assign" | "paths" | "bulk" | "audit";

type AssignmentStats = ProductResponse["stats"];

const EMPTY_CATALOG_NODES: CatalogNode[] = [];
const catalogLabelCache = new WeakMap<
  CatalogNode[],
  Map<string, string>
>();

function catalogPathParts(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function humanizeCatalogSlug(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function catalogBreadcrumb(
  path: string,
  nodes: CatalogNode[] = EMPTY_CATALOG_NODES
): string {
  let labelsByPath = catalogLabelCache.get(nodes);
  if (!labelsByPath) {
    labelsByPath = new Map(nodes.map((node) => [node.path, node.label]));
    catalogLabelCache.set(nodes, labelsByPath);
  }
  let currentPath = "";

  return catalogPathParts(path)
    .map((part) => {
      currentPath += `/${part}`;
      return labelsByPath.get(currentPath) || humanizeCatalogSlug(part);
    })
    .join(" › ");
}

function catalogNodeDepth(node: CatalogNode): number {
  return Math.max(0, catalogPathParts(node.path).length - 1);
}

function catalogTreeOrder(nodes: CatalogNode[]): CatalogNode[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const childrenByParent = new Map<string | null, CatalogNode[]>();
  const compareNodes = (left: CatalogNode, right: CatalogNode) =>
    left.displayOrder - right.displayOrder ||
    left.label.localeCompare(right.label);

  for (const node of nodes) {
    const parentKey =
      node.parentId && nodeIds.has(node.parentId) ? node.parentId : null;
    const siblings = childrenByParent.get(parentKey) || [];
    siblings.push(node);
    childrenByParent.set(parentKey, siblings);
  }
  childrenByParent.forEach((siblings) => siblings.sort(compareNodes));

  const ordered: CatalogNode[] = [];
  const visited = new Set<string>();
  const visit = (node: CatalogNode) => {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    ordered.push(node);
    for (const child of childrenByParent.get(node.id) || []) visit(child);
  };

  for (const root of childrenByParent.get(null) || []) visit(root);
  for (const node of [...nodes].sort(compareNodes)) visit(node);
  return ordered;
}

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
  productKind: ProductKind | null;
  label: string;
  slug: string;
  description: string;
  bannerImage: string;
  bannerAlt: string;
  displayOrder: string;
  isActive: boolean;
  isVisible: boolean;
};

function emptyCatalogNodeDraft(): CatalogNodeDraft {
  return {
    parentId: ROOT_CATALOG_PARENT,
    nodeType: "category",
    productKind: null,
    label: "",
    slug: "",
    description: "",
    bannerImage: "",
    bannerAlt: "",
    displayOrder: "0",
    isActive: false,
    isVisible: false,
  };
}

function catalogNodeDraft(node: CatalogNode): CatalogNodeDraft {
  return {
    parentId: node.parentId || ROOT_CATALOG_PARENT,
    nodeType: node.nodeType,
    productKind: node.productKind,
    label: node.label,
    slug: node.slug,
    description: node.description || "",
    bannerImage: node.bannerImage || "",
    bannerAlt: node.bannerAlt || "",
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
  const orderedNodes = useMemo(() => catalogTreeOrder(nodes), [nodes]);
  const filteredNodes = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return orderedNodes;
    return orderedNodes.filter(
      (node) =>
        node.label.toLowerCase().includes(normalized) ||
        catalogBreadcrumb(node.path, nodes).toLowerCase().includes(normalized)
    );
  }, [nodes, orderedNodes, search]);

  const toggleNode = (nodeId: string, checked: boolean) => {
    if (checked) {
      if (selectedIds.length >= maxSelected) {
        toast.error(`Select no more than ${maxSelected} placements`);
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
          placeholder="Find a catalog placement"
          aria-label="Find a catalog placement"
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
                  aria-label={`Select ${catalogBreadcrumb(node.path, nodes)}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {catalogBreadcrumb(node.path, nodes)}
                    </span>
                    {!node.isVisible && (
                      <Badge variant="outline">Not visible</Badge>
                    )}
                  </span>
                </span>
                <span
                  className="text-xs tabular-nums text-muted-foreground"
                  aria-label={`${node._count.assignments} products assigned`}
                >
                  {node._count.assignments} products
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
  onNodeUpdated,
}: {
  nodes: CatalogNode[];
  loading: boolean;
  onChanged: () => Promise<void>;
  onNodeUpdated: (node: CatalogNode) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CatalogNodeDraft>(
    emptyCatalogNodeDraft
  );
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [visibilitySavingIds, setVisibilitySavingIds] = useState<Set<string>>(
    () => new Set()
  );
  const visibilitySavingIdsRef = useRef(new Set<string>());
  const bannerUploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

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
      catalogTreeOrder(
        nodes.filter(
          (node) =>
            node.id !== editingId && !unavailableParentIds.has(node.id)
        )
      ),
    [editingId, nodes, unavailableParentIds]
  );
  const orderedNodes = useMemo(() => catalogTreeOrder(nodes), [nodes]);
  const filteredNodes = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return orderedNodes;
    return orderedNodes.filter(
      (node) =>
        node.label.toLowerCase().includes(normalized) ||
        catalogBreadcrumb(node.path, nodes).toLowerCase().includes(normalized) ||
        node.nodeType.toLowerCase().includes(normalized)
    );
  }, [nodes, orderedNodes, search]);

  useEffect(() => {
    if (editingId && !editingNode) {
      setEditingId(null);
      setDraft(emptyCatalogNodeDraft());
      setSlugWasEdited(false);
    }
  }, [editingId, editingNode]);

  const startCreate = () => {
    if (uploadingBanner) {
      toast.error("Wait for the banner upload to finish");
      return;
    }
    setEditingId(null);
    setDraft(emptyCatalogNodeDraft());
    setSlugWasEdited(false);
    setBannerError(null);
    if (bannerUploadInputRef.current) bannerUploadInputRef.current.value = "";
  };

  const startEdit = (node: CatalogNode) => {
    if (uploadingBanner) {
      toast.error("Wait for the banner upload to finish");
      return;
    }
    setEditingId(node.id);
    setDraft(catalogNodeDraft(node));
    setSlugWasEdited(true);
    setBannerError(null);
    if (bannerUploadInputRef.current) bannerUploadInputRef.current.value = "";
  };

  const updateLabel = (label: string) => {
    setDraft((current) => ({
      ...current,
      label,
      slug: slugWasEdited ? current.slug : slugifyCatalogLabel(label),
    }));
  };

  const validateBannerSource = (source: string): string | null => {
    const normalized = source.trim();
    if (!normalized) return null;
    if (!isAllowedCatalogBannerImage(normalized)) {
      return "Use a local image path or an approved Cloudinary/Unsplash HTTPS URL";
    }

    return null;
  };

  const uploadBanner = async (file: File) => {
    const fileError = catalogBannerFileError(file);
    if (fileError) {
      setBannerError(fileError);
      toast.error(fileError);
      return;
    }

    setUploadingBanner(true);
    setBannerError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("resourceType", "image");
      formData.append("tags", "catalog-banner");
      const response = await apiFetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Banner upload failed"));
      }

      const data = (await response.json()) as { url?: string };
      if (!data.url) throw new Error("The upload did not return an image URL");
      setDraft((current) => ({ ...current, bannerImage: data.url! }));
      toast.success("Banner uploaded. Save the catalog path to publish it.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Banner upload failed";
      setBannerError(message);
      toast.error(message);
    } finally {
      setUploadingBanner(false);
      if (bannerUploadInputRef.current) {
        bannerUploadInputRef.current.value = "";
      }
    }
  };

  const clearBanner = () => {
    setDraft((current) => ({
      ...current,
      bannerImage: "",
      bannerAlt: "",
    }));
    setBannerError(null);
    if (bannerUploadInputRef.current) bannerUploadInputRef.current.value = "";
  };

  const updateVisibility = async (node: CatalogNode, nextVisible: boolean) => {
    if (
      nextVisible === node.isVisible ||
      visibilitySavingIdsRef.current.has(node.id)
    ) {
      return;
    }

    const blockedReason = catalogVisibilityToggleBlockReason(
      node,
      nodes,
      nextVisible
    );
    if (blockedReason) {
      toast.error(blockedReason);
      return;
    }

    if (
      !nextVisible &&
      !window.confirm(
        `Hide ${catalogBreadcrumb(node.path, nodes)}? Customers will no longer be able to browse this catalog path.`
      )
    ) {
      return;
    }

    const optimisticNode = { ...node, isVisible: nextVisible };
    visibilitySavingIdsRef.current.add(node.id);
    setVisibilitySavingIds(new Set(visibilitySavingIdsRef.current));
    onNodeUpdated(optimisticNode);
    if (editingId === node.id) {
      setDraft((current) => ({ ...current, isVisible: nextVisible }));
    }

    try {
      const response = await apiFetch(
        `/api/admin/catalog/nodes/${encodeURIComponent(node.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isVisible: nextVisible }),
        }
      );
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to update catalog visibility")
        );
      }

      const data = (await response.json()) as { node?: CatalogNode };
      if (!data.node) throw new Error("The updated catalog path was not returned");
      onNodeUpdated(data.node);
      if (editingId === node.id) {
        setDraft((current) => ({ ...current, isVisible: data.node!.isVisible }));
      }
      toast.success(nextVisible ? "Category published" : "Category hidden");
    } catch (error) {
      onNodeUpdated(node);
      if (editingId === node.id) {
        setDraft((current) => ({ ...current, isVisible: node.isVisible }));
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update catalog visibility"
      );
    } finally {
      visibilitySavingIdsRef.current.delete(node.id);
      setVisibilitySavingIds(new Set(visibilitySavingIdsRef.current));
    }
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (uploadingBanner) {
      toast.error("Wait for the banner upload to finish");
      return;
    }

    const bannerSourceError =
      draft.parentId === ROOT_CATALOG_PARENT
        ? null
        : validateBannerSource(draft.bannerImage);
    setBannerError(bannerSourceError);
    if (bannerSourceError) {
      toast.error(bannerSourceError);
      return;
    }

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
        productKind: draft.productKind,
        label: draft.label,
        slug: draft.slug,
        description: draft.description,
        bannerImage: draft.bannerImage,
        bannerAlt: draft.bannerAlt,
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
      `Delete ${catalogBreadcrumb(editingNode.path, nodes)}? This is only allowed when it has no child paths and no product assignments. No product will be deleted.`
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
                        {`${" ".repeat(catalogNodeDepth(node))}${catalogBreadcrumb(
                          node.path,
                          nodes
                        )}`}
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

              <div className="space-y-2">
                <Label htmlFor="catalog-node-product-kind">Product behavior</Label>
                <Select
                  value={draft.productKind || "__mixed__"}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      productKind:
                        value === "__mixed__" ? null : (value as ProductKind),
                    }))
                  }
                >
                  <SelectTrigger id="catalog-node-product-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__mixed__">
                      Mixed products / landing page
                    </SelectItem>
                    {PRODUCT_KIND_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Controls which fields appear when an admin chooses this as a
                  product category. Use mixed only for broad landing pages.
                </p>
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

              <details className="rounded-lg border bg-muted/20">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                  Subcategory banner (optional)
                </summary>
                <div className="space-y-4 border-t p-4">
                  <p className="text-xs text-muted-foreground">
                    This replaces the plain heading on this catalog page and
                    appears above its filters and products. Department roots use
                    the separate Hero Sections system; navigation cards and
                    product cards are not changed.
                  </p>
                  {draft.parentId === ROOT_CATALOG_PARENT && (
                    <Alert>
                      <ImageIcon aria-hidden="true" />
                      <AlertTitle>Department roots use Hero Sections</AlertTitle>
                      <AlertDescription>
                        Choose a category or final subcategory path to manage its
                        collection banner here.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="catalog-node-description">Banner description</Label>
                    <Textarea
                      id="catalog-node-description"
                      value={draft.description}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Introduce this collection for shoppers"
                      rows={3}
                      maxLength={1_000}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="catalog-node-banner-image">Banner image</Label>
                    <input
                      ref={bannerUploadInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadBanner(file);
                      }}
                    />

                    {draft.bannerImage &&
                    isAllowedCatalogBannerImage(draft.bannerImage.trim()) ? (
                      <div className="space-y-3 rounded-lg border bg-background p-3">
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium">Desktop crop</p>
                          <div className="relative aspect-[4/1] overflow-hidden rounded-md bg-muted">
                            <Image
                              src={draft.bannerImage.trim()}
                              alt={draft.bannerAlt || "Banner desktop preview"}
                              fill
                              sizes="(max-width: 1280px) 100vw, 640px"
                              className="object-cover"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium">Mobile crop</p>
                          <div className="relative aspect-[4/3] w-36 overflow-hidden rounded-md bg-muted">
                            <Image
                              src={draft.bannerImage.trim()}
                              alt=""
                              fill
                              sizes="144px"
                              className="object-cover"
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Keep the important subject near the center so it
                            remains visible on narrow screens.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex aspect-[4/1] min-h-28 items-center justify-center rounded-lg border border-dashed bg-background text-muted-foreground">
                        <div className="text-center">
                          <ImageIcon className="mx-auto h-7 w-7" />
                          <p className="mt-2 text-xs">No banner selected</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          uploadingBanner ||
                          draft.parentId === ROOT_CATALOG_PARENT
                        }
                        onClick={() => bannerUploadInputRef.current?.click()}
                      >
                        {uploadingBanner ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {draft.bannerImage ? "Replace image" : "Upload image"}
                      </Button>
                      {draft.bannerImage && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingBanner}
                          onClick={clearBanner}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Clear banner
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="catalog-node-banner-image">
                        Or paste an image URL
                      </Label>
                      <Input
                        id="catalog-node-banner-image"
                        value={draft.bannerImage}
                        disabled={
                          uploadingBanner ||
                          draft.parentId === ROOT_CATALOG_PARENT
                        }
                        onChange={(event) => {
                          const bannerImage = event.target.value;
                          setDraft((current) => ({
                            ...current,
                            bannerImage,
                          }));
                          setBannerError(
                            bannerImage.trim() &&
                              !isAllowedCatalogBannerImage(bannerImage.trim())
                              ? "Use a local image path or an approved Cloudinary/Unsplash HTTPS URL"
                              : null
                          );
                        }}
                        onBlur={() => {
                          const error = validateBannerSource(draft.bannerImage);
                          setBannerError(error);
                        }}
                        placeholder="/images/collections/ready-to-wear.jpg or approved HTTPS URL"
                        maxLength={2_000}
                        aria-invalid={Boolean(bannerError)}
                        aria-describedby={
                          bannerError ? "catalog-node-banner-error" : undefined
                        }
                      />
                    </div>
                    {bannerError ? (
                      <p
                        id="catalog-node-banner-error"
                        className="text-xs text-destructive"
                      >
                        {bannerError}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        JPEG, PNG, or WebP; maximum 10 MB. Any image dimensions
                        are accepted and automatically center-cropped to fit the
                        responsive desktop and mobile banner frames.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="catalog-node-banner-alt">Banner image alt text</Label>
                    <Input
                      id="catalog-node-banner-alt"
                      value={draft.bannerAlt}
                      disabled={
                        uploadingBanner ||
                        draft.parentId === ROOT_CATALOG_PARENT
                      }
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          bannerAlt: event.target.value,
                        }))
                      }
                      placeholder="Teen girls wearing the ready-to-wear collection"
                      maxLength={240}
                    />
                    <p className="text-xs text-muted-foreground">
                      Describe the image for accessibility; do not copy the file
                      name.
                    </p>
                  </div>
                </div>
              </details>

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
                <Button
                  type="submit"
                  disabled={saving || removing || uploadingBanner}
                >
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
                filteredNodes.map((node) => {
                  const visibilitySaving = visibilitySavingIds.has(node.id);
                  const visibilityBlockedReason =
                    catalogVisibilityToggleBlockReason(
                      node,
                      nodes,
                      !node.isVisible
                    );

                  return (
                    <div
                      key={node.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 border-b px-3 py-3 last:border-b-0",
                        editingId === node.id && "bg-muted/60"
                      )}
                    >
                      <div
                        className="min-w-0 flex-1"
                        style={{
                          paddingLeft: `${catalogNodeDepth(node) * 0.75}rem`,
                        }}
                      >
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
                          {node.bannerImage && (
                            <Badge variant="outline">Banner</Badge>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {catalogBreadcrumb(node.path, nodes)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {node._count.children} child path(s) /{" "}
                          {node._count.assignments} assignment(s) / order{" "}
                          {node.displayOrder}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-md border px-2.5 py-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Display
                          </span>
                          <span title={visibilityBlockedReason || undefined}>
                            {visibilitySaving ? (
                              <Loader2
                                className="h-4 w-8 animate-spin"
                                aria-label={`Saving visibility for ${node.label}`}
                              />
                            ) : (
                              <Switch
                                checked={node.isVisible}
                                disabled={
                                  Boolean(visibilityBlockedReason) ||
                                  (saving && editingId === node.id)
                                }
                                onCheckedChange={(checked) =>
                                  void updateVisibility(node, checked)
                                }
                                aria-label={`${
                                  node.isVisible ? "Hide" : "Publish"
                                } ${catalogBreadcrumb(node.path, nodes)}`}
                              />
                            )}
                          </span>
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
                    </div>
                  );
                })
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
  nodes,
  onChanged,
}: {
  assignment: ProductAssignment;
  nodes: CatalogNode[];
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
      `Remove this product from ${catalogBreadcrumb(assignment.catalogNode.path, nodes)}? The product itself will not be changed.`
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
            <p className="font-medium">
              {catalogBreadcrumb(assignment.catalogNode.path, nodes)}
            </p>
            {!assignment.catalogNode.isActive && (
              <Badge variant="destructive">Inactive</Badge>
            )}
            {!assignment.catalogNode.isVisible && (
              <Badge variant="outline">Not visible</Badge>
            )}
          </div>
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
          Feature this product
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
          Save changes
        </Button>
      </div>
    </div>
  );
}

export default function CatalogAssignmentClient({
  canManageCatalogPaths,
  canViewAuditLogs,
}: CatalogAssignmentClientProps) {
  const [activeTab, setActiveTab] = useState<CatalogTab>("assign");
  const [nodes, setNodes] = useState<CatalogNode[]>([]);
  const [nodesLoading, setNodesLoading] = useState(true);
  const [taxonomyNodes, setTaxonomyNodes] = useState<CatalogNode[]>([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [assignmentStats, setAssignmentStats] =
    useState<AssignmentStats | null>(null);
  const [matchingProducts, setMatchingProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "assigned" | "unassigned"
  >("unassigned");
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
  const taxonomyRequested = useRef(false);
  const auditRequested = useRef(false);
  const assignmentPanel = useRef<HTMLDivElement>(null);

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
      setMatchingProducts(data.total || 0);
      setAssignmentStats(data.stats);
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
      setMatchingProducts(0);
      setTotalPages(1);
      setProductsError(
        error instanceof Error ? error.message : "Failed to load products"
      );
    } finally {
      if (requestSequence === productRequestSequence.current) {
        setProductsLoading(false);
      }
    }
  }, [appliedSearch, page, statusFilter]);

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
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setNewNodeIds([]);
    setNewFeatured(false);
    setNewDisplayOrder("");
  }, [selectedProduct?.id]);

  const refreshAfterMutation = useCallback(async () => {
    const selectedId = selectedProduct?.id;
    const tasks: Promise<unknown>[] = [loadProducts(), loadNodes()];
    if (taxonomyRequested.current) tasks.push(loadTaxonomyNodes());
    if (selectedId) tasks.push(refreshProduct(selectedId));
    if (auditRequested.current) tasks.push(loadAuditLogs());
    await Promise.all(tasks);
  }, [
    loadAuditLogs,
    loadNodes,
    loadTaxonomyNodes,
    loadProducts,
    refreshProduct,
    selectedProduct?.id,
  ]);

  const applyCatalogNodeUpdate = useCallback((updatedNode: CatalogNode) => {
    const replaceNode = (node: CatalogNode) =>
      node.id === updatedNode.id ? updatedNode : node;
    setTaxonomyNodes((current) => current.map(replaceNode));
    setNodes((current) => current.map(replaceNode));

    const updateProductAssignments = (product: ProductRow): ProductRow => ({
      ...product,
      catalogAssignments: product.catalogAssignments.map((assignment) =>
        assignment.catalogNode.id === updatedNode.id
          ? {
              ...assignment,
              catalogNode: {
                ...assignment.catalogNode,
                label: updatedNode.label,
                path: updatedNode.path,
                nodeType: updatedNode.nodeType,
                productKind: updatedNode.productKind,
                isActive: updatedNode.isActive,
                isVisible: updatedNode.isVisible,
              },
            }
          : assignment
      ),
    });
    setProducts((current) => current.map(updateProductAssignments));
    setSelectedProduct((current) =>
      current ? updateProductAssignments(current) : null
    );
  }, []);

  const changeTab = (value: string) => {
    const nextTab = value as CatalogTab;
    setActiveTab(nextTab);

    if (
      nextTab === "paths" &&
      canManageCatalogPaths &&
      !taxonomyRequested.current
    ) {
      taxonomyRequested.current = true;
      void loadTaxonomyNodes();
    }
    if (
      nextTab === "audit" &&
      canViewAuditLogs &&
      !auditRequested.current
    ) {
      auditRequested.current = true;
      void loadAuditLogs();
    }
  };

  const assignedNodeIds = useMemo(
    () =>
      new Set(
        selectedProduct?.catalogAssignments.map(
          (assignment) => assignment.catalogNodeId
        ) || []
      ),
    [selectedProduct]
  );
  const selectedHasValidPrimary = useMemo(() => {
    const primary = selectedProduct?.catalogAssignments.find(
      (assignment) => assignment.isPrimary
    );
    const node = primary
      ? nodes.find((candidate) => candidate.id === primary.catalogNodeId)
      : null;
    return Boolean(
      node?.isActive &&
        node.productKind &&
        node._count.children === 0
    );
  }, [nodes, selectedProduct]);
  const availableNodes = useMemo(
    () =>
      nodes.filter(
        (node) =>
          node.isActive &&
          !assignedNodeIds.has(node.id) &&
          (selectedHasValidPrimary
            ? true
            : Boolean(node.productKind) && node._count.children === 0)
      ),
    [assignedNodeIds, nodes, selectedHasValidPrimary]
  );

  const applySearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
    setSelectedProduct(null);
  };

  const selectProduct = (product: ProductRow) => {
    setSelectedProduct(product);
    window.requestAnimationFrame(() => {
      assignmentPanel.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const addAssignments = async () => {
    if (!selectedProduct) {
      toast.error("Select a product first");
      return;
    }
    if (!newNodeIds.length) {
      toast.error("Select at least one storefront placement");
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
        `${data.count || newNodeIds.length} placement(s) added`
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
      toast.error("Select at least one storefront placement");
      return;
    }
    if (!bulkReviewed) {
      toast.error("Confirm that you have checked the list");
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
      toast.success(`${data.count || 0} assignment(s) added`);
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
          <h1 className="text-2xl font-semibold">Catalog assignments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Make sure every product appears in the right storefront section.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void refreshAfterMutation()}
          disabled={
            productsLoading ||
            nodesLoading ||
            taxonomyLoading ||
            auditLoading
          }
        >
          <RefreshCw
            className={cn(
              "mr-2 h-4 w-4",
              (productsLoading ||
                nodesLoading ||
                taxonomyLoading ||
                auditLoading) &&
                "animate-spin"
            )}
          />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3" aria-label="Assignment health">
        {[
          {
            label: "Total products",
            value: assignmentStats?.total,
            status: "all" as const,
          },
          {
            label: "Assigned",
            value: assignmentStats?.assigned,
            status: "assigned" as const,
          },
          {
            label: "Needs assignment",
            value: assignmentStats?.unassigned,
            status: "unassigned" as const,
          },
        ].map((stat) => (
          <button
            key={stat.status}
            type="button"
            className="rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => {
              if (stat.status !== statusFilter) setSelectedProduct(null);
              setStatusFilter(stat.status);
              setPage(1);
              setActiveTab("assign");
            }}
            aria-pressed={statusFilter === stat.status}
          >
            <Card
              className={cn(
                "h-full transition-colors hover:border-foreground/30",
                statusFilter === stat.status && "border-primary bg-primary/5"
              )}
            >
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">
                  {stat.value ?? "—"}
                </p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={changeTab} className="space-y-4">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="assign">
            <Layers className="h-4 w-4" />
            Assignments
          </TabsTrigger>
          {canManageCatalogPaths && (
            <TabsTrigger value="paths">
              <Layers className="h-4 w-4" />
              Catalog paths
            </TabsTrigger>
          )}
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
              <CardTitle className="text-base">Product assignment queue</CardTitle>
              <CardDescription>
                Find a product, then choose Assign or Manage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={applySearch}
                className="grid gap-3 sm:grid-cols-[minmax(15rem,1fr)_11rem_auto]"
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
                    placeholder="Search product name or SKU"
                    aria-label="Search products"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    if (value !== statusFilter) setSelectedProduct(null);
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
                    <SelectItem value="unassigned">Needs assignment</SelectItem>
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
                      <TableHead>Current placement</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-32 text-center">
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
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            {product.catalogAssignments.length ? (
                              <div className="space-y-1">
                                {product.catalogAssignments
                                  .slice(0, 2)
                                  .map((assignment) => (
                                    <p key={assignment.id} className="text-sm">
                                      {catalogBreadcrumb(
                                        assignment.catalogNode.path,
                                        nodes
                                      )}
                                    </p>
                                  ))}
                                <p className="text-xs text-muted-foreground">
                                  {product.catalogAssignments.length === 1
                                    ? "1 placement"
                                    : `${product.catalogAssignments.length} placements`}
                                  {product.catalogAssignments.length > 2
                                    ? ` · ${product.catalogAssignments.length - 2} more`
                                    : ""}
                                </p>
                              </div>
                            ) : (
                              <Badge variant="secondary">Needs assignment</Badge>
                            )}
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
                              {product.catalogAssignments.length
                                ? "Manage"
                                : "Assign"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={3}
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
                  Page {page} of {totalPages} · {matchingProducts} product(s)
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
            <div
              ref={assignmentPanel}
              className="scroll-mt-4 grid gap-4 xl:grid-cols-2"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-5 w-5" />
                    Assign {selectedProduct.name}
                  </CardTitle>
                  <CardDescription>
                    Choose where this product should appear in the storefront.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted/40 p-4">
                    <p className="font-medium">{selectedProduct.name}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {selectedProduct.sku}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label>Storefront placement</Label>
                      <p className="text-xs text-muted-foreground">
                        Choose one placement, or select more when needed.
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
                        emptyMessage="No additional placements are available."
                      />
                    )}
                    <details className="rounded-lg border px-3 py-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        Placement options (optional)
                      </summary>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="flex min-h-10 items-center gap-2 text-sm">
                          <Checkbox
                            checked={newFeatured}
                            onCheckedChange={(value) =>
                              setNewFeatured(value === true)
                            }
                          />
                          Feature this product
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
                    </details>
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
                      Assign to {newNodeIds.length || ""} placement
                      {newNodeIds.length === 1 ? "" : "s"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Current placements
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
                          nodes={nodes}
                          onChanged={refreshAfterMutation}
                        />
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                        This product has no placements yet.
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
                  Choose Assign or Manage from the product queue above.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {canManageCatalogPaths && (
          <TabsContent value="paths" className="space-y-4">
            <CatalogTaxonomyManager
              nodes={taxonomyNodes}
              loading={taxonomyLoading}
              onChanged={refreshAfterMutation}
              onNodeUpdated={applyCatalogNodeUpdate}
            />
          </TabsContent>
        )}

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Assign several products
              </CardTitle>
              <CardDescription>
                Paste up to 100 Product IDs or SKUs, then choose where they
                should appear.
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
                    <Label>Storefront placements</Label>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Every product will be added to every selected placement.
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
                        emptyMessage="No storefront placements are available."
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
                      Feature these products
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
                    I have checked this list and it is correct
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    This change is recorded in the audit log.
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
                Assign products
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
    </div>
  );
}
