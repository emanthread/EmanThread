"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Trash2,
  Plus,
  Database,
  Eye,
  Ruler,
  Printer,
  Pencil,
  CheckCircle2,
  XCircle,
  Undo2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TailorPrintCard } from "@/components/admin/tailor-print-card";
import { getStatusBadgeClass } from "@/lib/utils/status";
import {
  garmentTypeLabel,
  mapFromPrismaFields,
} from "@/lib/validators/measurements-unified";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LegacyProfile {
  id: string;
  profileName: string;
  garmentType: string;
  gender: string;
  measurements: Record<string, string>;
  stylingPrefs: Record<string, unknown> | null;
  notes: string | null;
  isDefault: boolean;
  status?: string;
  createdAt: string;
  user: { name: string; email: string };
}

interface CompletedRecord {
  id: string;
  garmentType: string;
  source: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
}

// ─── Measurement Profiles Tab ────────────────────────────────────────────────

function LegacyProfilesTab({ initialSearch = "" }: { initialSearch?: string }) {
  const [profiles, setProfiles] = useState<LegacyProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewProfile, setViewProfile] = useState<LegacyProfile | null>(null);
  const [printProfile, setPrintProfile] = useState<LegacyProfile | null>(null);
  const [deleteProfile, setDeleteProfile] = useState<LegacyProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const limit = 20;

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });
      const res = await fetch(`/api/admin/measurements?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const handleDelete = async () => {
    if (!deleteProfile) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/measurements/${deleteProfile.id}`, { method: "DELETE" });
      setDeleteProfile(null);
      fetchProfiles();
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    // 1. Optimistic update: instantly update UI
    setProfiles((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));
    
    try {
      const res = await fetch(`/api/admin/measurements/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      // Intentionally NOT calling fetchProfiles() on success to prevent UI jump/flicker
    } catch (e) {
      console.error(e);
      // 2. Revert on failure by re-fetching actual state
      fetchProfiles();
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{total} measurement profile{total !== 1 ? "s" : ""}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium">Customer</th>
                  <th className="text-left p-4 text-sm font-medium">Profile Name</th>
                  <th className="text-left p-4 text-sm font-medium">Type</th>
                  <th className="text-left p-4 text-sm font-medium">Status</th>
                   <th className="text-left p-4 text-sm font-medium">Created</th>
                   <th className="text-left p-4 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-t hover:bg-muted/30">
                    <td className="p-4">
                      <p className="font-medium text-sm">{profile.user.name}</p>
                      <p className="text-xs text-muted-foreground">{profile.user.email}</p>
                    </td>
                    <td className="p-4 font-medium text-sm">{profile.profileName}</td>
                    <td className="p-4">
                      <Badge variant="outline" className="capitalize text-xs">{profile.garmentType}</Badge>
                    </td>
                    <td className="p-4">
                      <Select 
                        value={profile.status || "pending"} 
                        onValueChange={(val) => handleStatusUpdate(profile.id, val)}
                      >
                        <SelectTrigger className={`h-8 text-xs w-[110px] ${getStatusBadgeClass(profile.status ?? "pending")}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Completed</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </td>
                     <td className="p-4">
                       <div className="flex gap-1">

                         <Button
                           variant="ghost"
                           size="icon"
                           className="h-8 w-8"
                           onClick={() => setViewProfile(profile)}
                           title="View Profile"
                         >
                           <Eye className="h-3.5 w-3.5" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="icon"
                           className="h-8 w-8"
                           onClick={() => setPrintProfile(profile)}
                           title="Print Profile"
                         >
                           <Printer className="h-3.5 w-3.5" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="icon"
                           className="h-8 w-8"
                           asChild
                           title="Edit Profile"
                         >
                           <Link href={`/admin/measurements/profile/${profile.id}`}>
                             <Pencil className="h-3.5 w-3.5" />
                           </Link>
                         </Button>
                         <Button
                           variant="ghost"
                           size="icon"
                           className="h-8 w-8 text-red-600 hover:text-red-600"
                           onClick={() => setDeleteProfile(profile)}
                           title="Delete Profile"
                         >
                           <Trash2 className="h-3.5 w-3.5" />
                         </Button>
                       </div>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {profiles.length === 0 && !loading && (
               <div className="text-center py-12 text-muted-foreground">No measurement profiles found</div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Profile Dialog */}
      <Dialog open={!!viewProfile} onOpenChange={(o) => !o && setViewProfile(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Measurement Profile — {viewProfile?.profileName}
            </DialogTitle>
            <DialogDescription>
              Customer: {viewProfile?.user.name} ({viewProfile?.user.email}) · Created: {viewProfile ? new Date(viewProfile.createdAt).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>
          {viewProfile && (
            <TailorPrintCard
              data={{
                serialNo: (viewProfile as any).serialNumber || `MP-${viewProfile.id.slice(0, 6).toUpperCase()}`,
                customerName: (viewProfile as any).customerName || viewProfile.user.name,
                deliveryDate: (viewProfile as any).deliveryDate ? new Date((viewProfile as any).deliveryDate).toLocaleDateString() : new Date(viewProfile.createdAt).toLocaleDateString(),
                productName: viewProfile.profileName.startsWith("[Admin] ") ? `${viewProfile.profileName.replace("[Admin] ", "")} (Default)` : viewProfile.profileName,
                garmentType: viewProfile.garmentType,
                gender: viewProfile.gender,
                measurements: mapFromPrismaFields(viewProfile as unknown as Record<string, unknown>) as unknown as Record<string, string>,
                stylingPrefs: viewProfile.stylingPrefs,
                notes: viewProfile.notes,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Profile Confirmation */}
      <Dialog open={!!deleteProfile} onOpenChange={(o) => !o && setDeleteProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Measurement Profile?</DialogTitle>
            <DialogDescription>
              Permanently delete "{deleteProfile?.profileName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProfile(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Profile Dialog */}
      {printProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:static print:bg-transparent" onClick={() => setPrintProfile(null)}>
          <div className="bg-background rounded-lg shadow-xl max-w-[230mm] max-h-[90vh] overflow-y-auto p-6 print:p-0 print:shadow-none print:max-w-none print:max-h-none" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 print:hidden">
              <h3 className="text-lg font-semibold">Print Measurement Sheet</h3>
              <Button variant="ghost" size="sm" onClick={() => setPrintProfile(null)}>Close</Button>
            </div>
            <TailorPrintCard
              data={{
                serialNo: (printProfile as any).serialNumber || `MP-${printProfile.id.slice(0, 6).toUpperCase()}`,
                customerName: (printProfile as any).customerName || printProfile.user.name,
                deliveryDate: (printProfile as any).deliveryDate ? new Date((printProfile as any).deliveryDate).toLocaleDateString() : new Date(printProfile.createdAt).toLocaleDateString(),
                productName: printProfile.profileName.startsWith("[Admin] ") ? `${printProfile.profileName.replace("[Admin] ", "")} (Default)` : printProfile.profileName,
                garmentType: printProfile.garmentType,
                gender: printProfile.gender,
                measurements: mapFromPrismaFields(printProfile as unknown as Record<string, unknown>) as unknown as Record<string, string>,
                stylingPrefs: printProfile.stylingPrefs,
                notes: printProfile.notes,
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Completed Tab ──────────────────────────────────────────────────────────────

function CompletedTab() {
  const [records, setRecords] = useState<CompletedRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteRecord, setDeleteRecord] = useState<CompletedRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<CompletedRecord | null>(null);
  const [printRecord, setPrintRecord] = useState<CompletedRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const limit = 20;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });
      const res = await fetch(`/api/admin/measurements/completed?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleDelete = async () => {
    if (!deleteRecord) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/measurements/${deleteRecord.id}`, { method: "DELETE" });
      setDeleteRecord(null);
      fetchRecords();
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/measurements/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchRecords();
    } catch (e) {
      console.error(e);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{total} completed record{total !== 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium">Customer</th>
                  <th className="text-left p-4 text-sm font-medium">Garment Type</th>
                  <th className="text-left p-4 text-sm font-medium">Status</th>
                  <th className="text-left p-4 text-sm font-medium">Completed</th>
                  <th className="text-left p-4 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-4">
                      <p className="font-medium text-sm">{r.user.name}</p>
                      <p className="text-xs text-muted-foreground">{r.user.email}</p>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="capitalize text-xs">
                        {garmentTypeLabel(r.garmentType || "")}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Select 
                        value="approved"
                        onValueChange={(val) => handleStatusUpdate(r.id, val)}
                      >
                        <SelectTrigger className={`h-8 text-xs w-[110px] ${getStatusBadgeClass("approved")}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Completed</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(r.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1 justify-end">

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewRecord(r)}
                          title="View Record"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPrintRecord(r)}
                          title="Print Record"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-600"
                          onClick={() => setDeleteRecord(r)}
                          title="Delete Record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                No completed measurement records found
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Record Confirmation */}
      <Dialog open={!!deleteRecord} onOpenChange={(o) => !o && setDeleteRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Completed Record?</DialogTitle>
            <DialogDescription>
              Permanently delete this completed measurement record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRecord(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Record Dialog */}
      <Dialog open={!!viewRecord} onOpenChange={(o) => !o && setViewRecord(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Measurement Profile
            </DialogTitle>
            <DialogDescription>
              Customer: {viewRecord?.user.name} ({viewRecord?.user.email}) · Completed: {viewRecord ? new Date(viewRecord.updatedAt).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>
          {viewRecord && (
            <TailorPrintCard
              data={{
                serialNo: (viewRecord as any).serialNumber || `MP-${viewRecord.id.slice(0, 6).toUpperCase()}`,
                customerName: (viewRecord as any).customerName || viewRecord.user.name,
                deliveryDate: (viewRecord as any).deliveryDate ? new Date((viewRecord as any).deliveryDate).toLocaleDateString() : new Date(viewRecord.updatedAt).toLocaleDateString(),
                productName: "Completed Profile",
                garmentType: viewRecord.garmentType,
                gender: (viewRecord as any).gender || "Male",
                measurements: mapFromPrismaFields(viewRecord as unknown as Record<string, unknown>) as unknown as Record<string, string>,
                stylingPrefs: (viewRecord as any).stylingPrefs || null,
                notes: (viewRecord as any).notes || "",
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Print Record Dialog */}
      {printRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:static print:bg-transparent" onClick={() => setPrintRecord(null)}>
          <div className="bg-background rounded-lg shadow-xl max-w-[230mm] max-h-[90vh] overflow-y-auto p-6 print:p-0 print:shadow-none print:max-w-none print:max-h-none" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 print:hidden">
              <h3 className="text-lg font-semibold">Print Measurement Sheet</h3>
              <Button variant="ghost" size="sm" onClick={() => setPrintRecord(null)}>Close</Button>
            </div>
            <TailorPrintCard
              data={{
                serialNo: (printRecord as any).serialNumber || `MP-${printRecord.id.slice(0, 6).toUpperCase()}`,
                customerName: (printRecord as any).customerName || printRecord.user.name,
                deliveryDate: (printRecord as any).deliveryDate ? new Date((printRecord as any).deliveryDate).toLocaleDateString() : new Date(printRecord.updatedAt).toLocaleDateString(),
                productName: "Completed Profile",
                garmentType: printRecord.garmentType,
                gender: (printRecord as any).gender || "Male",
                measurements: mapFromPrismaFields(printRecord as unknown as Record<string, unknown>) as unknown as Record<string, string>,
                stylingPrefs: (printRecord as any).stylingPrefs || null,
                notes: (printRecord as any).notes || "",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Rejected Tab ──────────────────────────────────────────────────────────────

function RejectedTab() {
  const [records, setRecords] = useState<CompletedRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteRecord, setDeleteRecord] = useState<CompletedRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<CompletedRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const limit = 20;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });
      const res = await fetch(`/api/admin/measurements/rejected?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleDelete = async () => {
    if (!deleteRecord) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/measurements/${deleteRecord.id}`, { method: "DELETE" });
      setDeleteRecord(null);
      fetchRecords();
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/measurements/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchRecords();
    } catch (e) {
      console.error(e);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{total} rejected record{total !== 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium">Customer</th>
                  <th className="text-left p-4 text-sm font-medium">Garment Type</th>
                  <th className="text-left p-4 text-sm font-medium">Status</th>
                  <th className="text-left p-4 text-sm font-medium">Rejected</th>
                  <th className="text-left p-4 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-4">
                      <p className="font-medium text-sm">{r.user.name}</p>
                      <p className="text-xs text-muted-foreground">{r.user.email}</p>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="capitalize text-xs">
                        {garmentTypeLabel(r.garmentType || "")}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Select 
                        value="rejected"
                        onValueChange={(val) => handleStatusUpdate(r.id, val)}
                      >
                        <SelectTrigger className={`h-8 text-xs w-[110px] ${getStatusBadgeClass("rejected")}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Completed</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(r.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1 justify-end">

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewRecord(r)}
                          title="View Record"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-600"
                          onClick={() => setDeleteRecord(r)}
                          title="Delete Record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                No rejected measurement records found
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Record Confirmation */}
      <Dialog open={!!deleteRecord} onOpenChange={(o) => !o && setDeleteRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rejected Record?</DialogTitle>
            <DialogDescription>
              Permanently delete this rejected measurement record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRecord(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Record Dialog */}
      <Dialog open={!!viewRecord} onOpenChange={(o) => !o && setViewRecord(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Measurement Profile
            </DialogTitle>
            <DialogDescription>
              Customer: {viewRecord?.user.name} ({viewRecord?.user.email}) · Rejected: {viewRecord ? new Date(viewRecord.updatedAt).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>
          {viewRecord && (
            <TailorPrintCard
              data={{
                serialNo: (viewRecord as any).serialNumber || `MP-${viewRecord.id.slice(0, 6).toUpperCase()}`,
                customerName: (viewRecord as any).customerName || viewRecord.user.name,
                deliveryDate: (viewRecord as any).deliveryDate ? new Date((viewRecord as any).deliveryDate).toLocaleDateString() : new Date(viewRecord.updatedAt).toLocaleDateString(),
                productName: "Rejected Profile",
                garmentType: viewRecord.garmentType,
                gender: (viewRecord as any).gender || "Male",
                measurements: mapFromPrismaFields(viewRecord as unknown as Record<string, unknown>) as unknown as Record<string, string>,
                stylingPrefs: (viewRecord as any).stylingPrefs || null,
                notes: (viewRecord as any).notes || "",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminMeasurementsPage() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const hasSearchQuery = !!urlSearch;
  const [refreshKey, setRefreshKey] = useState(0);
  const [initializedTabs, setInitializedTabs] = useState<Set<string>>(new Set(["profiles"]));
  const [stats, setStats] = useState({
    totalProfiles: 0,
    completedCount: 0,
    rejectedCount: 0,
  });

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/measurements/stats");
    if (res.ok) setStats(await res.json());
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, refreshKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Ruler className="h-6 w-6" /> Stitching & Measurements
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage measurement profiles and completed records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="gap-2 border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary">
            <Link href="/admin/customer-measurements">
              <Database className="h-4 w-4" />
              View Measurements
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/admin/customer-measurements?add=true">
              <Plus className="h-4 w-4" />
              Add Measurement
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Measurement Profiles</p>
            <p className="text-2xl font-bold mt-1">{stats.totalProfiles}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
              All Completed
            </p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.completedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-red-600 font-medium flex items-center gap-1">
              Rejected
            </p>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.rejectedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs 
        defaultValue={hasSearchQuery ? "profiles" : "profiles"} 
        key={refreshKey}
        onValueChange={(val) => setInitializedTabs((prev) => new Set([...prev, val]))}
      >
        <TabsList>
          <TabsTrigger value="profiles">Measurement Profiles</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value="profiles" className="space-y-4 mt-4">
          <LegacyProfilesTab initialSearch={urlSearch} />
        </TabsContent>
        <TabsContent value="completed" className="space-y-4 mt-4">
          {initializedTabs.has("completed") && <CompletedTab />}
        </TabsContent>
        <TabsContent value="rejected" className="space-y-4 mt-4">
          {initializedTabs.has("rejected") && <RejectedTab />}
        </TabsContent>
      </Tabs>
    </div>
  );
}