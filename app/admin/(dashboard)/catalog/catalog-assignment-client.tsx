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
        "/api/admin/catalog/nodes?active=true&visible=all&limit=250",
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
      const params = new URLSearchParams({
        page: "1",
        limit: "15",
        entity: "ProductCatalogAssignment",
      });
      const response = await fetch(`/api/admin/audit-logs?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to load assignment audit trail")
        );
      }
      const data = (await response.json()) as { logs?: AuditLog[] };
      setAuditLogs(data.logs || []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load assignment audit trail"
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
    void loadAuditLogs();
  }, [loadAuditLogs]);

  useEffect(() => {
    setNewNodeIds([]);
    setNewFeatured(false);
    setNewDisplayOrder("");
  }, [selectedProduct?.id]);

  const refreshAfterMutation = useCallback(async () => {
    const selectedId = selectedProduct?.id;
    const tasks: Promise<unknown>[] = [loadProducts(), loadNodes()];
    if (selectedId) tasks.push(refreshProduct(selectedId));
    if (canViewAuditLogs) tasks.push(loadAuditLogs());
    await Promise.all(tasks);
  }, [
    canViewAuditLogs,
    loadAuditLogs,
    loadNodes,
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
          disabled={productsLoading || nodesLoading}
        >
          <RefreshCw
            className={cn(
              "mr-2 h-4 w-4",
              (productsLoading || nodesLoading) && "animate-spin"
            )}
          />
          Refresh
        </Button>
      </div>

      <Alert>
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Assignment-only workflow</AlertTitle>
        <AlertDescription>
          Removing a mapping only removes discovery from that catalog node. It
          does not delete the product or alter its SKU, stock, price, Category,
          or Fabric Type.
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
            Assign products
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <ListChecks className="h-4 w-4" />
            Reviewed bulk
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
              <CardTitle className="text-base">Find existing products</CardTitle>
              <CardDescription>
                Search by Product ID, SKU, or name. Use the node and assignment
                status together to review assigned or unassigned products.
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
                              Manage
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
                    Selected product
                  </CardTitle>
                  <CardDescription>
                    Product details below are read-only context.
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
                      <Label>Add to active catalog nodes</Label>
                      <p className="text-xs text-muted-foreground">
                        Already assigned nodes are omitted.
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
                      Add {newNodeIds.length || ""} assignment
                      {newNodeIds.length === 1 ? "" : "s"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Current assignments
                  </CardTitle>
                  <CardDescription>
                    Featured state and ordering are specific to each catalog
                    node.
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
                        This product has no additive catalog assignments yet.
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
                <p className="font-medium">Select a product to manage</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Its legacy taxonomy will remain read-only while you add or
                  remove catalog mappings.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Reviewed bulk assignment
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
                    Catalog assignment audit trail
                  </CardTitle>
                  <CardDescription>
                    Recent assignment creates, updates, and removals recorded by
                    the existing central audit mechanism.
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
                    No catalog assignment audit entries have been recorded yet.
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

