"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  ClipboardList,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
}

const actionColors: Record<string, string> = {
  USER_LOGIN: "bg-green-100 text-green-700",
  USER_LOGIN_FAILED: "bg-red-100 text-red-700",
  USER_REGISTER: "bg-blue-100 text-blue-700",
  USER_LOGOUT: "bg-gray-100 text-gray-700",
  ORDER_STATUS_CHANGED: "bg-yellow-100 text-yellow-700",
  ORDER_DELETED: "bg-red-100 text-red-700",
  PRODUCT_CREATED: "bg-emerald-100 text-emerald-700",
  PRODUCT_UPDATED: "bg-orange-100 text-orange-700",
  PRODUCT_DELETED: "bg-red-100 text-red-700",
  RETURN_APPROVED: "bg-green-100 text-green-700",
  RETURN_REJECTED: "bg-red-100 text-red-700",
  RETURN_COMPLETED: "bg-blue-100 text-blue-700",
  RETURN_CANCELLED: "bg-gray-100 text-gray-700",
  RETURN_PENDING: "bg-yellow-100 text-yellow-700",
  RETURN_REQUEST_UPDATED: "bg-orange-100 text-orange-700",
  RETURN_REQUEST_DELETED: "bg-red-100 text-red-700",
  DISCOUNT_CREATED: "bg-purple-100 text-purple-700",
  DISCOUNT_UPDATED: "bg-indigo-100 text-indigo-700",
  DISCOUNT_DELETED: "bg-red-100 text-red-700",
  SETTINGS_CHANGED: "bg-cyan-100 text-cyan-700",
  ADMIN_ACCESS: "bg-pink-100 text-pink-700",
  MEASUREMENT_CREATED: "bg-teal-100 text-teal-700",
  MEASUREMENT_UPDATED: "bg-teal-100 text-teal-700",
  MEASUREMENT_DELETED: "bg-red-100 text-red-700",
  STITCHING_ORDER_CREATED: "bg-indigo-100 text-indigo-700",
  STITCHING_ORDER_UPDATED: "bg-indigo-100 text-indigo-700",
  STITCHING_ORDER_DELETED: "bg-red-100 text-red-700",
  PAYMENT_VERIFIED: "bg-green-100 text-green-700",
  PAYMENT_REJECTED: "bg-red-100 text-red-700",
  PAYMENT_DELETED: "bg-red-100 text-red-700",
  AUDIT_LOG_DELETED: "bg-gray-100 text-gray-700",
  AUDIT_LOGS_CLEARED: "bg-red-100 text-red-700",
};

const actionOptions = [
  { value: "all", label: "All Actions" },
  { value: "USER_LOGIN", label: "Login" },
  { value: "USER_LOGIN_FAILED", label: "Login Failed" },
  { value: "USER_REGISTER", label: "Register" },
  { value: "ORDER_STATUS_CHANGED", label: "Order Status" },
  { value: "ORDER_DELETED", label: "Order Deleted" },
  { value: "PRODUCT_CREATED", label: "Product Created" },
  { value: "PRODUCT_UPDATED", label: "Product Updated" },
  { value: "PRODUCT_DELETED", label: "Product Deleted" },
  { value: "RETURN_APPROVED", label: "Return Approved" },
  { value: "RETURN_REJECTED", label: "Return Rejected" },
  { value: "RETURN_COMPLETED", label: "Return Completed" },
  { value: "RETURN_CANCELLED", label: "Return Cancelled" },
  { value: "RETURN_PENDING", label: "Return Set to Pending" },
  { value: "RETURN_REQUEST_UPDATED", label: "Return Updated" },
  { value: "RETURN_REQUEST_DELETED", label: "Return Deleted" },
  { value: "DISCOUNT_CREATED", label: "Discount Created" },
  { value: "DISCOUNT_UPDATED", label: "Discount Updated" },
  { value: "DISCOUNT_DELETED", label: "Discount Deleted" },
  { value: "SETTINGS_CHANGED", label: "Settings Changed" },
  { value: "MEASUREMENT_CREATED", label: "Measurement Created" },
  { value: "MEASUREMENT_UPDATED", label: "Measurement Updated" },
  { value: "MEASUREMENT_DELETED", label: "Measurement Deleted" },
  { value: "STITCHING_ORDER_CREATED", label: "Stitching Order Created" },
  { value: "STITCHING_ORDER_UPDATED", label: "Stitching Order Updated" },
  { value: "STITCHING_ORDER_DELETED", label: "Stitching Order Deleted" },
  { value: "PAYMENT_VERIFIED", label: "Payment Verified" },
  { value: "PAYMENT_REJECTED", label: "Payment Rejected" },
  { value: "PAYMENT_DELETED", label: "Payment Deleted" },
  { value: "AUDIT_LOG_DELETED", label: "Audit Log Deleted" },
  { value: "AUDIT_LOGS_CLEARED", label: "Audit Logs Cleared" },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(25);
  const [actionFilter, setActionFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearAllLoading, setClearAllLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (actionFilter !== "all") params.set("action", actionFilter);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load audit logs";
      setError(message);
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter]);

  const handleDeleteSingle = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?id=${deleteTarget}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l.id !== deleteTarget));
        setTotal((prev) => prev - 1);
      }
    } catch (err) {
      console.error("Failed to delete audit log:", err);
    } finally {
      setDeleteLoading(false);
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleClearAll = async () => {
    setClearAllLoading(true);
    try {
      const res = await fetch("/api/admin/audit-logs", { method: "DELETE" });
      if (res.ok) {
        setLogs([]);
        setTotal(0);
        setPage(1);
      }
    } catch (err) {
      console.error("Failed to clear audit logs:", err);
    } finally {
      setClearAllLoading(false);
      setClearAllOpen(false);
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeleteTarget(id);
    setDeleteOpen(true);
  };

  const totalPages = Math.ceil(total / limit);

  const isInternalId = (key: string): boolean => {
    const lower = key.toLowerCase();
    return (
      lower.endsWith("id") ||
      lower.includes("_id") ||
      lower === "customerid" ||
      lower === "orderid" ||
      lower === "userid" ||
      lower === "productid" ||
      lower === "entityid"
    );
  };

  const formatLabel = (key: string): string => {
    return key
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track every admin action and system event
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {actionOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadLogs}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          {total > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setClearAllOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Logs
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-8 text-red-500 text-sm">
              {error}
            </div>
          )}
          {!error && logs.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              No audit logs found yet. Audit logs appear when admin actions are performed.
            </div>
          )}
          {!error && logs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Time
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      User
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Action
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Entity
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Details
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground w-10">
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50 group">
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.createdAt), "MMM d, HH:mm")}
                        </span>
                      </td>
                       <td className="py-3 px-2">
                         <span className="text-sm font-medium">
                           {log.userEmail || "System"}
                         </span>
                       </td>
                      <td className="py-3 px-2">
                        <Badge
                          variant="secondary"
                          className={actionColors[log.action] || "bg-gray-100 text-gray-700"}
                        >
                          {log.action.replace(/_/g, " ").toLowerCase()}
                        </Badge>
                      </td>
                       <td className="py-3 px-2">
                         <span className="text-sm">{log.entity}</span>
                       </td>
                       <td className="py-3 px-2">
                         <div className="max-w-xs text-xs space-y-1">
                           {!!log.oldValue && typeof log.oldValue === "object" && log.oldValue !== null && (
                             <div>
                               <span className="font-medium text-muted-foreground">Old:</span>
                               <ul className="list-none space-y-0.5 mt-0.5">
                                 {Object.entries(log.oldValue as Record<string, unknown>).map(([key, val]) =>
                                   val != null && val !== "" ? (
                                     <li key={key} className="text-muted-foreground">
                                       <span className="capitalize">{formatLabel(key)}:</span>{" "}
                                       <span className={cn(isInternalId(key) ? "font-mono text-[10px]" : "")}>
                                         {isInternalId(key) && typeof val === "string" && val.length > 12
                                           ? `${String(val).slice(0, 8)}…`
                                           : String(val)}
                                       </span>
                                     </li>
                                   ) : null
                                 )}
                               </ul>
                             </div>
                           )}
                           {!!log.newValue && typeof log.newValue === "object" && log.newValue !== null && (
                             <div>
                               <span className="font-medium text-foreground/80">New:</span>
                               <ul className="list-none space-y-0.5 mt-0.5">
                                 {Object.entries(log.newValue as Record<string, unknown>).map(([key, val]) =>
                                   val != null && val !== "" ? (
                                     <li key={key} className="text-foreground/80">
                                       <span className="capitalize">{formatLabel(key)}:</span>{" "}
                                       <span className={cn(isInternalId(key) ? "font-mono text-[10px]" : "")}>
                                         {isInternalId(key) && typeof val === "string" && val.length > 12
                                           ? `${String(val).slice(0, 8)}…`
                                           : String(val)}
                                       </span>
                                     </li>
                                   ) : null
                                 )}
                               </ul>
                             </div>
                           )}
                           {!!log.oldValue && typeof log.oldValue !== "object" && String(log.oldValue) && (
                             <div className="text-muted-foreground">
                               <span className="font-medium">Old:</span> {String(log.oldValue)}
                             </div>
                           )}
                           {!!log.newValue && typeof log.newValue !== "object" && String(log.newValue) && (
                             <div className="text-foreground/80">
                               <span className="font-medium">New:</span> {String(log.newValue)}
                             </div>
                           )}
                         </div>
                       </td>
                      <td className="py-3 px-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => openDeleteDialog(log.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Single Log Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Audit Log Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this audit log entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteTarget(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSingle} disabled={deleteLoading}>
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Logs Confirmation */}
      <Dialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clear All Audit Logs</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete ALL audit logs? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {total > 0 && (
            <p className="text-sm text-muted-foreground">
              This will permanently delete {total} log entries.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearAllOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearAll} disabled={clearAllLoading}>
              <Trash2 className="h-4 w-4 mr-2" />
              {clearAllLoading ? "Clearing..." : "Clear All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
