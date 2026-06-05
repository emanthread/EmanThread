"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Package,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Printer,
  Undo2,
  Ban,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminStore } from "@/lib/admin-store";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Approved", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-700" },
};

const reasonLabels: Record<string, string> = {
  SIZE: "Wrong Size",
  QUALITY: "Quality Issue",
  WRONG_ITEM: "Wrong Item",
  DAMAGED: "Damaged",
  OTHER: "Other",
};

const typeLabels: Record<string, string> = {
  refund: "Refund",
  exchange: "Exchange",
};

export default function AdminReturnsPage() {
  const {
    returnRequests,
    loadReturnRequests,
    updateReturnRequestStatus,
    updateReturnRequest,
    deleteReturnRequest,
  } = useAdminStore();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<
    (typeof returnRequests)[0] | null
  >(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editType, setEditType] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editRefundAmount, setEditRefundAmount] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Print ref
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReturnRequests();
  }, [loadReturnRequests]);

  const filtered = returnRequests.filter((req) => {
    const matchesSearch =
      req.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      req.customerName.toLowerCase().includes(search.toLowerCase()) ||
      req.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
      (req.customerPhone || "").includes(search);
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusAction = async (
    requestId: string,
    status: string,
    label: string
  ) => {
    setActionLoading(true);
    try {
      await updateReturnRequestStatus(
        requestId,
        status as "approved" | "rejected" | "completed" | "pending" | "cancelled"
      );
      toast({
        title: `Request ${label}`,
        description: `The return request has been ${label.toLowerCase()}.`,
      });
      setDetailOpen(false);
      setSelectedRequest(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update request status.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openEditDialog = (req: (typeof returnRequests)[0]) => {
    setSelectedRequest(req);
    setEditType(req.type);
    setEditReason(req.reason);
    setEditNotes(req.notes || "");
    setEditRefundAmount(req.refundAmount?.toString() || "");
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedRequest) return;
    setEditLoading(true);
    try {
      await updateReturnRequest(selectedRequest.id, {
        type: editType || undefined,
        reason: editReason || undefined,
        notes: editNotes || undefined,
        refundAmount: editRefundAmount ? Number(editRefundAmount) : undefined,
      });
      toast({
        title: "Request Updated",
        description: "The return request has been updated.",
      });
      setEditOpen(false);
      setSelectedRequest(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update return request.",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const openDeleteDialog = (req: (typeof returnRequests)[0]) => {
    setSelectedRequest(req);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedRequest) return;
    setDeleteLoading(true);
    try {
      await deleteReturnRequest(selectedRequest.id);
      toast({
        title: "Request Deleted",
        description: "The return request has been deleted.",
      });
      setDeleteOpen(false);
      setSelectedRequest(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete return request.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePrint = (req: (typeof returnRequests)[0]) => {
    setSelectedRequest(req);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const renderRowActions = (req: (typeof returnRequests)[0]) => {
    const actions: React.ReactNode[] = [];

    actions.push(
      <Button
        key="view"
        variant="ghost"
        size="sm"
        onClick={() => {
          setSelectedRequest(req);
          setDetailOpen(true);
        }}
      >
        <Eye className="h-4 w-4 mr-1" />
        View
      </Button>
    );

    if (req.status !== "completed" && req.status !== "cancelled") {
      actions.push(
        <Button
          key="edit"
          variant="ghost"
          size="sm"
          onClick={() => openEditDialog(req)}
        >
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      );
    }

    actions.push(
      <Button
        key="print"
        variant="ghost"
        size="sm"
        onClick={() => handlePrint(req)}
      >
        <Printer className="h-4 w-4 mr-1" />
        Print
      </Button>
    );

    actions.push(
      <DropdownMenu key="more">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {req.status === "pending" && (
            <>
              <DropdownMenuItem
                onClick={() =>
                  handleStatusAction(req.id, "approved", "Approved")
                }
              >
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  handleStatusAction(req.id, "rejected", "Rejected")
                }
              >
                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                Reject
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  handleStatusAction(req.id, "cancelled", "Cancelled")
                }
              >
                <Ban className="h-4 w-4 mr-2 text-gray-600" />
                Cancel
              </DropdownMenuItem>
            </>
          )}
          {req.status === "approved" && (
            <>
              <DropdownMenuItem
                onClick={() =>
                  handleStatusAction(req.id, "completed", "Completed")
                }
              >
                <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                Mark Complete
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  handleStatusAction(req.id, "pending", "Set to Pending")
                }
              >
                <Undo2 className="h-4 w-4 mr-2 text-yellow-600" />
                Set to Pending
              </DropdownMenuItem>
            </>
          )}
          {req.status === "rejected" && (
            <DropdownMenuItem
              onClick={() =>
                handleStatusAction(req.id, "pending", "Set to Pending")
              }
            >
              <Undo2 className="h-4 w-4 mr-2 text-yellow-600" />
              Set to Pending
            </DropdownMenuItem>
          )}
          {req.status === "completed" && (
            <DropdownMenuItem
              onClick={() =>
                handleStatusAction(req.id, "pending", "Set to Pending")
              }
            >
              <Undo2 className="h-4 w-4 mr-2 text-yellow-600" />
              Set to Pending
            </DropdownMenuItem>
          )}
          {req.status === "cancelled" && (
            <DropdownMenuItem
              onClick={() =>
                handleStatusAction(req.id, "pending", "Set to Pending")
              }
            >
              <Undo2 className="h-4 w-4 mr-2 text-yellow-600" />
              Set to Pending
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => openDeleteDialog(req)}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    return actions;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Return Requests</h1>
          <p className="text-muted-foreground">
            Manage customer returns and exchanges
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadReturnRequests()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order, name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Requests ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Order</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Customer</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Reason</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                      <p>No return requests found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((req) => (
                    <tr key={req.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <span className="text-sm font-medium">{req.orderNumber}</span>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="text-sm font-medium">{req.customerName}</p>
                          <p className="text-xs text-muted-foreground">{req.customerEmail}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-sm capitalize">{req.type}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-sm">
                          {reasonLabels[req.reason] || req.reason}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <Badge
                          variant="secondary"
                          className={cn("capitalize", statusConfig[req.status]?.color)}
                        >
                          {statusConfig[req.status]?.label || req.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-sm text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {renderRowActions(req)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Return Request Details</DialogTitle>
            <DialogDescription>
              Order {selectedRequest?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-sm font-medium capitalize">{selectedRequest.type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    variant="secondary"
                    className={cn("capitalize", statusConfig[selectedRequest.status]?.color)}
                  >
                    {statusConfig[selectedRequest.status]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reason</p>
                  <p className="text-sm font-medium">
                    {reasonLabels[selectedRequest.reason] || selectedRequest.reason}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Items</p>
                  <p className="text-sm font-medium">{selectedRequest.items.length}</p>
                </div>
              </div>
              {selectedRequest.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Customer Notes</p>
                  <p className="text-sm bg-muted p-2 rounded">{selectedRequest.notes}</p>
                </div>
              )}
              {selectedRequest.refundAmount !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground">Refund Amount</p>
                  <p className="text-sm font-medium">PKR {selectedRequest.refundAmount}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            {selectedRequest && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrint(selectedRequest)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print A4
                </Button>
                {selectedRequest.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusAction(selectedRequest.id, "rejected", "Rejected")}
                      disabled={actionLoading}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusAction(selectedRequest.id, "cancelled", "Cancelled")}
                      disabled={actionLoading}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleStatusAction(selectedRequest.id, "approved", "Approved")}
                      disabled={actionLoading}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </>
                )}
                {selectedRequest.status === "approved" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusAction(selectedRequest.id, "pending", "Set to Pending")}
                      disabled={actionLoading}
                    >
                      <Undo2 className="h-4 w-4 mr-2" />
                      Set to Pending
                    </Button>
                    <Button
                      onClick={() => handleStatusAction(selectedRequest.id, "completed", "Completed")}
                      disabled={actionLoading}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  </>
                )}
                {(selectedRequest.status === "rejected" || selectedRequest.status === "cancelled") && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusAction(selectedRequest.id, "pending", "Set to Pending")}
                    disabled={actionLoading}
                  >
                    <Undo2 className="h-4 w-4 mr-2" />
                    Set to Pending
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Return Request</DialogTitle>
            <DialogDescription>
              Order {selectedRequest?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="exchange">Exchange</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={editReason} onValueChange={setEditReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIZE">Wrong Size</SelectItem>
                  <SelectItem value="QUALITY">Quality Issue</SelectItem>
                  <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Admin notes..."
                rows={3}
              />
            </div>
            <div>
              <Label>Refund Amount (PKR)</Label>
              <Input
                type="number"
                value={editRefundAmount}
                onChange={(e) => setEditRefundAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editLoading}>
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Return Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this return request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Order:</span> {selectedRequest.orderNumber}</p>
              <p><span className="font-medium">Customer:</span> {selectedRequest.customerName}</p>
              <p><span className="font-medium">Type:</span> {typeLabels[selectedRequest.type] || selectedRequest.type}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print A4 — hidden unless printing */}
      {selectedRequest && (
        <div
          ref={printRef}
          className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-50 print:p-8"
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          <div className="max-w-[210mm] mx-auto">
            {/* Header */}
            <div className="border-b-2 border-gray-800 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-center">Return Request — A4 Print</h1>
              <p className="text-center text-gray-500 text-sm">Emaan Thread — Admin Copy</p>
            </div>

            {/* Request Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-500">Request ID</p>
                <p className="text-sm font-medium">{selectedRequest.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Order Number</p>
                <p className="text-sm font-medium">{selectedRequest.orderNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-medium capitalize">
                  {statusConfig[selectedRequest.status]?.label}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm font-medium capitalize">{selectedRequest.type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Reason</p>
                <p className="text-sm font-medium">
                  {reasonLabels[selectedRequest.reason] || selectedRequest.reason}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date Created</p>
                <p className="text-sm font-medium">
                  {new Date(selectedRequest.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold border-b border-gray-300 pb-1 mb-2">Customer</h2>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="text-sm font-medium">{selectedRequest.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium">{selectedRequest.customerEmail}</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold border-b border-gray-300 pb-1 mb-2">
                Items ({selectedRequest.items.length})
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1">#</th>
                    <th className="text-left py-1">Quantity</th>
                    <th className="text-left py-1">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRequest.items.map((item, i) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-1">{i + 1}</td>
                      <td className="py-1">{item.quantity}</td>
                      <td className="py-1">{item.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes & Refund */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {selectedRequest.notes && (
                <div>
                  <p className="text-xs text-gray-500">Notes</p>
                  <p className="text-sm">{selectedRequest.notes}</p>
                </div>
              )}
              {selectedRequest.refundAmount !== undefined && (
                <div>
                  <p className="text-xs text-gray-500">Refund Amount</p>
                  <p className="text-sm font-medium">PKR {selectedRequest.refundAmount}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-300 pt-4 text-xs text-gray-400 text-center">
              <p>Emaan Thread — Admin Copy | Generated: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
