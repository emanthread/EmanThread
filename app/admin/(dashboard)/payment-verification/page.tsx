"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Clock,
  AlertTriangle,
  Flag,
  Eye,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Timer,
  CheckSquare,
  Printer,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/data";
import { cn } from "@/lib/utils";
import { getStatusBadgeClass } from "@/lib/utils/status";

interface PaymentSubmission {
  id: string;
  paymentMethod: string;
  transactionId: string;
  senderName: string;
  screenshotUrl: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  flagged: boolean;
  flagReason: string | null;
  createdAt: string;
  order: {
    orderNumber: string;
    grandTotal: number;
    status: string;
    shippingAddress: any;
    items: { product: { name: string; stockQuantity: number } }[];
  };
}

interface StatsData {
  pending: number;
  flagged: number;
  verifiedToday: number;
  rejectedToday: number;
}

export default function PaymentVerificationPage() {
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [stats, setStats] = useState<StatsData>({ pending: 0, flagged: 0, verifiedToday: 0, rejectedToday: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("PENDING");
  const [searchQuery, setSearchQuery] = useState("");

  // Verify dialog
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<PaymentSubmission | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyConfirmed, setVerifyConfirmed] = useState(false); // confirmation checkbox

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<PaymentSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PaymentSubmission | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Screenshot dialog
  const [screenshotDialogOpen, setScreenshotDialogOpen] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [screenshotTarget, setScreenshotTarget] = useState<PaymentSubmission | null>(null);

  // Batch approval
  const [batchSelectIds, setBatchSelectIds] = useState<Set<string>>(new Set());
  const [batchApproving, setBatchApproving] = useState(false);

  // SLA timers — re-render every 30s
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const quickRejectReasons = [
    "Invalid TXN ID",
    "Amount mismatch",
    "Duplicate payment",
    "Screenshot unclear",
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(page));
      queryParams.set("limit", "20");
      if (activeTab === "PENDING" || activeTab === "VERIFIED" || activeTab === "REJECTED") queryParams.set("status", activeTab);
      if (activeTab === "FLAGGED") queryParams.set("flagged", "true");

      const [submissionsRes, statsRes] = await Promise.all([
        fetch(`/api/admin/payments?${queryParams}`),
        fetch("/api/admin/payments/stats"),
      ]);

      if (submissionsRes.ok) {
        const data = await submissionsRes.json();
        setSubmissions(data.submissions);
        setTotal(data.total);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load payments:", err);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleVerify = async () => {
    if (!verifyTarget) return;
    setVerifying(true);
    try {
      const res = await fetch(`/api/admin/payments/${verifyTarget.id}/verify`, { method: "POST" });
      if (res.ok) {
        setVerifyDialogOpen(false);
        setVerifyTarget(null);
        setVerifyConfirmed(false);
        batchSelectIds.delete(verifyTarget.id);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to verify payment");
      }
    } catch { alert("Failed to verify payment"); }
    finally { setVerifying(false); }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setRejecting(true);
    try {
      const res = await fetch(`/api/admin/payments/${rejectTarget.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (res.ok) {
        setRejectDialogOpen(false);
        setRejectTarget(null);
        setRejectReason("");
        batchSelectIds.delete(rejectTarget.id);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to reject payment");
      }
    } catch { alert("Failed to reject payment"); }
    finally { setRejecting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/payments/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        batchSelectIds.delete(deleteTarget.id);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete payment");
      }
    } catch { alert("Failed to delete payment"); }
    finally { setDeleting(false); }
  };

  const handlePrintPayment = (sub: PaymentSubmission) => {
    const win = window.open("about:blank", "_blank", "width=850,height=1100");
    if (!win) return;
    const addr = sub.order.shippingAddress as Record<string, string> | null;
    const customerName = addr ? `${addr.firstName || ""} ${addr.lastName || ""}`.trim() : "N/A";
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Slip — ${sub.order.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            h2 { margin: 0 0 4px; font-size: 18px; }
            @page { size: A4; margin: 12mm; }
            .status { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
            .verified { background: #d1fae5; color: #065f46; }
            .rejected { background: #fee2e2; color: #991b1b; }
            .pending { background: #fef3c7; color: #92400e; }
          </style>
        </head>
        <body onload="window.print()" onafterprint="window.close()">
          <table style="margin-bottom:10px; border-bottom:2px solid #000; padding-bottom:8px;"><tr>
            <td><h2>Emaan Thread</h2><p style="margin:2px 0; font-size:11px; color:#6b7280;">Payment Verification Slip</p></td>
            <td style="text-align:right; font-size:11px;">${new Date().toLocaleDateString()}</td>
          </tr></table>
          <table>
            <tr><td style="width:35%; font-weight:600;">Order Number</td><td>${sub.order.orderNumber}</td></tr>
            <tr><td style="font-weight:600;">Customer</td><td>${customerName}</td></tr>
            <tr><td style="font-weight:600;">Amount</td><td>${formatPrice(Number(sub.order.grandTotal))}</td></tr>
            <tr><td style="font-weight:600;">Payment Method</td><td>${sub.paymentMethod}</td></tr>
            <tr><td style="font-weight:600;">Transaction ID</td><td style="font-family:monospace;">${sub.transactionId}</td></tr>
            <tr><td style="font-weight:600;">Sender Name</td><td>${sub.senderName}</td></tr>
            <tr><td style="font-weight:600;">Status</td><td><span class="status ${sub.status === 'VERIFIED' ? 'verified' : sub.status === 'REJECTED' ? 'rejected' : 'pending'}">${sub.status}</span></td></tr>
            <tr><td style="font-weight:600;">Submitted</td><td>${new Date(sub.createdAt).toLocaleDateString()}</td></tr>
            ${sub.screenshotUrl ? `<tr><td style="font-weight:600;">Screenshot</td><td style="font-size:11px; color:#6b7280;">${sub.screenshotUrl}</td></tr>` : ""}
          </table>
          ${sub.flagged ? `<div style="margin-top:10px; padding:8px; background:#fef3c7; border-radius:4px; font-size:11px;"><strong>FLAGGED</strong> — ${sub.flagReason || "Yes"}</div>` : ""}
          <p style="text-align:center; font-size:10px; color:#9ca3af; margin-top:20px;">Emaan Thread · Generated ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `);
    win.document.close();
  };

  // Batch approve safe-only (not flagged)
  const handleBatchApprove = async () => {
    const safeIds = submissions.filter((s) => batchSelectIds.has(s.id) && !s.flagged).map((s) => s.id);
    if (safeIds.length === 0) { alert("No safe (non-flagged) submissions selected"); return; }
    if (!confirm(`Approve ${safeIds.length} payment(s)? Stock will be deducted for each.`)) return;

    setBatchApproving(true);
    let success = 0, fail = 0;
    for (const id of safeIds) {
      try {
        const res = await fetch(`/api/admin/payments/${id}/verify`, { method: "POST" });
        if (res.ok) success++; else fail++;
      } catch { fail++; }
    }
    setBatchApproving(false);
    setBatchSelectIds(new Set());
    fetchData();
    alert(`Batch approve: ${success} approved, ${fail} failed`);
  };

  const toggleBatchSelect = (id: string) => {
    setBatchSelectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pending = submissions.filter((s) => s.status === "PENDING");
    if (batchSelectIds.size === pending.length) {
      setBatchSelectIds(new Set());
    } else {
      setBatchSelectIds(new Set(pending.map((s) => s.id)));
    }
  };

  const statCards = [
    { title: "Pending", value: stats.pending, color: "text-yellow-600", bgColor: "bg-yellow-100", icon: Clock },
    { title: "Flagged", value: stats.flagged, color: "text-red-600", bgColor: "bg-red-100", icon: AlertTriangle },
    { title: "Verified Today", value: stats.verifiedToday, color: "text-emerald-600", bgColor: "bg-emerald-100", icon: CheckCircle },
    { title: "Rejected Today", value: stats.rejectedToday, color: "text-gray-600", bgColor: "bg-gray-100", icon: XCircle },
  ];

  const tabs = ["PENDING", "FLAGGED", "ALL", "VERIFIED", "REJECTED"];
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Payment Verification</h1>
          <p className="text-muted-foreground">Review and verify manual payment submissions</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <Button key={tab} variant={activeTab === tab ? "default" : "outline"} size="sm"
              onClick={() => { setActiveTab(tab); setPage(1); batchSelectIds.clear(); }}>
              {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search order number or TXN ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading && submissions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground"><RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" /><p>Loading submissions...</p></div>
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground"><CheckCircle className="h-8 w-8 mx-auto mb-4 opacity-50" /><p>No submissions found</p></div>
          ) : (
            <div className="overflow-x-auto">
              {/* Batch Actions Bar */}
              {batchSelectIds.size > 0 && activeTab === "PENDING" && (
                <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b border-border">
                  <span className="text-sm font-medium">{batchSelectIds.size} selected</span>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleBatchApprove} disabled={batchApproving}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {batchApproving ? "Approving..." : "Approve All (Safe Only)"}
                  </Button>
                </div>
              )}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {activeTab === "PENDING" && (
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground w-10">
                        <Checkbox checked={submissions.filter(s => s.status === "PENDING").length > 0 && batchSelectIds.size === submissions.filter(s => s.status === "PENDING").length}
                          onCheckedChange={toggleSelectAll} />
                      </th>
                    )}
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Order #</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Customer</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Method</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">TXN ID</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Sender</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Screenshot</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">SLA Timer</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Flag</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => {
                    const addr = sub.order.shippingAddress as Record<string, string> | null;
                    const customerName = addr ? `${addr.firstName || ""} ${addr.lastName || ""}`.trim() : "N/A";
                    const slaInfo = getSlaInfo(sub.createdAt);
                    const slaColor = slaInfo.hours < 1 ? "text-muted-foreground" : slaInfo.hours < 6 ? "text-amber-600" : "text-red-600";
                    const isPending = sub.status === "PENDING";

                    return (
                      <tr key={sub.id} className={cn("border-b last:border-0 hover:bg-muted/50", sub.flagged && "bg-amber-50 dark:bg-amber-950/10 border-l-4 border-l-amber-400")}>
                        {isPending && (
                          <td className="py-3 px-2">
                            <Checkbox checked={batchSelectIds.has(sub.id)} onCheckedChange={() => toggleBatchSelect(sub.id)} />
                          </td>
                        )}
                        <td className="py-3 px-3"><span className="text-sm font-mono font-medium">{sub.order.orderNumber}</span></td>
                        <td className="py-3 px-3"><span className="text-sm">{customerName}</span></td>
                        <td className="py-3 px-3"><span className="text-sm font-medium">{formatPrice(Number(sub.order.grandTotal))}</span></td>
                        <td className="py-3 px-3">
                          <Badge variant="secondary" className={sub.paymentMethod === "NAYAPAY" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                            {sub.paymentMethod === "NAYAPAY" ? "Nayapay" : "Meezan Bank"}
                          </Badge>
                        </td>
                        <td className="py-3 px-3"><span className="text-sm font-mono">{sub.transactionId}</span></td>
                        <td className="py-3 px-3"><span className="text-sm">{sub.senderName}</span></td>
                        <td className="py-3 px-3">
                          {sub.screenshotUrl ? (
                            <Button variant="ghost" size="sm" onClick={() => { setScreenshotUrl(sub.screenshotUrl!); setScreenshotTarget(sub); setScreenshotDialogOpen(true); }}>
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                          ) : <span className="text-xs text-muted-foreground">No screenshot</span>}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 text-xs ${slaColor}`}>
                            <Timer className="h-3.5 w-3.5" />
                            {slaInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {sub.flagged ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600" title={sub.flagReason || "Flagged"}>
                              <Flag className="h-4 w-4" />
                              {sub.flagReason && <span className="max-w-[120px] truncate">{sub.flagReason}</span>}
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1 flex-wrap">
                            {isPending ? (
                              <>
                                <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 px-3"
                                  onClick={() => { setVerifyTarget(sub); setVerifyConfirmed(false); setVerifyDialogOpen(true); }}>
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept &amp; Proceed
                                </Button>
                                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 h-8 px-3"
                                  onClick={() => { setRejectTarget(sub); setRejectReason(""); setRejectDialogOpen(true); }}>
                                  <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                                </Button>
                              </>
                            ) : (
                              <Badge variant="secondary" className={getStatusBadgeClass(sub.status)}>
                                {sub.status}
                              </Badge>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrintPayment(sub)} title="Print Payment Slip">
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-600" onClick={() => { setDeleteTarget(sub); setDeleteDialogOpen(true); }} title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Verify Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-600" /> Confirm Payment Verification</DialogTitle>
            <DialogDescription>Verify this payment submission. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {verifyTarget && (
            <div className="space-y-3 py-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium text-foreground">This will:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Deduct stock</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Lock the order</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Trigger confirmation email</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Create audit log</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Order #</p><p className="font-medium">{verifyTarget.order.orderNumber}</p></div>
                <div><p className="text-muted-foreground">Amount</p><p className="font-medium">{formatPrice(Number(verifyTarget.order.grandTotal))}</p></div>
                <div><p className="text-muted-foreground">Transaction ID</p><p className="font-mono font-medium">{verifyTarget.transactionId}</p></div>
                <div><p className="text-muted-foreground">Sender</p><p className="font-medium">{verifyTarget.senderName}</p></div>
                <div><p className="text-muted-foreground">Method</p><Badge variant="secondary">{verifyTarget.paymentMethod}</Badge></div>
              </div>
              <div className="flex items-start gap-2 pt-2">
                <Checkbox id="verifyConfirm" checked={verifyConfirmed} onCheckedChange={(v) => setVerifyConfirmed(v === true)} />
                <label htmlFor="verifyConfirm" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  I confirm payment has been verified
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleVerify} disabled={verifying || !verifyConfirmed}>
              {verifying ? "Verifying..." : "Confirm & Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-600" /> Reject Payment</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this payment submission.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {rejectTarget && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Order #</p><p className="font-medium">{rejectTarget.order.orderNumber}</p></div>
                <div><p className="text-muted-foreground">TXN ID</p><p className="font-mono font-medium">{rejectTarget.transactionId}</p></div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {quickRejectReasons.map((reason) => (
                <Button key={reason} variant="outline" size="sm" onClick={() => setRejectReason(reason)}
                  className={rejectReason === reason ? "border-red-500 bg-red-50" : ""}>{reason}</Button>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Rejection Reason *</label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Detailed reason for rejection..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || rejecting}>
              {rejecting ? "Rejecting..." : "Reject Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Screenshot Dialog — Enhanced with Payment Details & Action Buttons */}
      <Dialog open={screenshotDialogOpen} onOpenChange={(o) => { if (!o) { setScreenshotDialogOpen(false); setScreenshotTarget(null); } }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Screenshot &amp; Details</DialogTitle>
            <DialogDescription>Review payment submission and take action</DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-6 py-2">
            <div className="relative min-h-[300px] bg-muted rounded-lg overflow-hidden">
              {screenshotUrl ? (
                <img src={screenshotUrl} alt="Payment screenshot" className="w-full h-full object-contain" />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No screenshot available</div>
              )}
            </div>
            {screenshotTarget && (() => {
              const addr = screenshotTarget.order.shippingAddress as Record<string, string> | null;
              const customerName = addr ? `${addr.firstName || ""} ${addr.lastName || ""}`.trim() : "N/A";
              const isPend = screenshotTarget.status === "PENDING";
              return (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm border-b pb-1">Payment Details</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><p className="text-xs text-muted-foreground">Order #</p><p className="font-medium font-mono">{screenshotTarget.order.orderNumber}</p></div>
                    <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-medium">{formatPrice(Number(screenshotTarget.order.grandTotal))}</p></div>
                    <div><p className="text-xs text-muted-foreground">Customer</p><p className="font-medium">{customerName}</p></div>
                    <div><p className="text-xs text-muted-foreground">Method</p><Badge variant="secondary">{screenshotTarget.paymentMethod}</Badge></div>
                    <div className="col-span-2"><p className="text-xs text-muted-foreground">Transaction ID</p><p className="font-medium font-mono">{screenshotTarget.transactionId}</p></div>
                    <div><p className="text-xs text-muted-foreground">Sender</p><p className="font-medium">{screenshotTarget.senderName}</p></div>
                    <div><p className="text-xs text-muted-foreground">Status</p><Badge className={getStatusBadgeClass(screenshotTarget.status)}>{screenshotTarget.status}</Badge></div>
                    <div><p className="text-xs text-muted-foreground">Submitted</p><p className="font-medium text-xs">{new Date(screenshotTarget.createdAt).toLocaleDateString()}</p></div>
                    {screenshotTarget.flagged && (
                      <div className="col-span-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded">
                        <p className="text-xs text-amber-700"><strong>Flagged:</strong> {screenshotTarget.flagReason || "Yes"}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" asChild><a href={screenshotUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1" /> Open</a></Button>
                    <Button variant="outline" size="sm" asChild><a href={screenshotUrl} download><Download className="h-3.5 w-3.5 mr-1" /> Download</a></Button>
                    <Button variant="outline" size="sm" onClick={() => { setScreenshotDialogOpen(false); setScreenshotTarget(null); handlePrintPayment(screenshotTarget); }}>
                      <Printer className="h-3.5 w-3.5 mr-1" /> Print
                    </Button>
                    {isPend && (
                      <>
                        <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setScreenshotDialogOpen(false); setScreenshotTarget(null); setVerifyTarget(screenshotTarget); setVerifyConfirmed(false); setVerifyDialogOpen(true); }}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept &amp; Proceed
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setScreenshotDialogOpen(false); setScreenshotTarget(null); setRejectTarget(screenshotTarget); setRejectReason(""); setRejectDialogOpen(true); }}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setScreenshotDialogOpen(false); setScreenshotTarget(null); setDeleteTarget(screenshotTarget); setDeleteDialogOpen(true); }}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
          {!screenshotTarget && (
            <div className="flex items-center justify-center text-sm text-muted-foreground">No submission data loaded</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-red-600" /> Delete Payment Submission</DialogTitle>
            <DialogDescription>This will mark the submission as deleted. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-3 py-4">
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg p-3 text-sm">
                <p className="text-red-700 dark:text-red-400">Are you sure you want to delete this submission?</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Order #</p><p className="font-medium">{deleteTarget.order.orderNumber}</p></div>
                <div><p className="text-muted-foreground">TXN ID</p><p className="font-mono font-medium">{deleteTarget.transactionId}</p></div>
                <div><p className="text-muted-foreground">Amount</p><p className="font-medium">{formatPrice(Number(deleteTarget.order.grandTotal))}</p></div>
                <div><p className="text-muted-foreground">Status</p><Badge variant="secondary">{deleteTarget.status}</Badge></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Submission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getSlaInfo(createdAt: string): { label: string; hours: number } {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMs = now - created;
  const totalHours = diffMs / (1000 * 60 * 60);
  const totalMins = Math.floor(diffMs / 60000);

  if (totalMins < 60) return { label: `${totalMins}m`, hours: totalHours };
  const hours = Math.floor(totalHours);
  const mins = Math.floor(totalHours % 1 * 60);
  return { label: `${hours}h ${mins}m`, hours: totalHours };
}