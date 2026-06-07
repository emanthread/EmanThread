"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Trash2,
  Eye,
  Ruler,
  Printer,
  CheckCircle,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { UnifiedMeasurementForm } from "@/components/measurements/UnifiedMeasurementForm";
import { TailorPrintCard, type TailorCardData } from "@/components/admin/tailor-print-card";
import type {
  UnifiedMeasurementFormData,
  GarmentType,
} from "@/lib/validators/measurements-unified";
import {
  GARMENT_TYPES,
  garmentTypeLabel,
} from "@/lib/validators/measurements-unified";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TailorMeasurement {
  id: string;
  gender: string;
  garmentType: string;
  status: string;
  notes: string;
  requestedAt: string;
  updatedAt: string;
  deliveryDate: string | null;
  user: { id: string; name: string; email: string; phone?: string | null };
}

interface LegacyProfile {
  id: string;
  profileName: string;
  garmentType: string;
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

// ─── Tailor Requests Tab ─────────────────────────────────────────────────────

function TailorRequestsTab() {
  const [measurements, setMeasurements] = useState<TailorMeasurement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [garmentFilter, setGarmentFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [quickEdit, setQuickEdit] = useState<TailorMeasurement | null>(null);
  const [savingQuick, setSavingQuick] = useState(false);
  const [viewDetail, setViewDetail] = useState<TailorMeasurement | null>(null);
  const limit = 20;

  const fetchMeasurements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(genderFilter !== "all" && { gender: genderFilter }),
        ...(garmentFilter !== "all" && { garmentType: garmentFilter }),
        ...(search && { search }),
      });
      const res = await fetch(`/api/admin/tailor-measurements?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMeasurements(data.measurements);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, genderFilter, garmentFilter, search]);

  useEffect(() => { fetchMeasurements(); }, [fetchMeasurements]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/admin/tailor-measurements/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    fetchMeasurements();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, email or phone..."
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
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>
          <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
          <Select value={garmentFilter} onValueChange={(v) => { setGarmentFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Garment Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {GARMENT_TYPES.map((gt) => (
                <SelectItem key={gt} value={gt}>{garmentTypeLabel(gt)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{total} request{total !== 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium">Customer</th>
                  <th className="text-left p-4 text-sm font-medium">Garment Type</th>
                  <th className="text-left p-4 text-sm font-medium">Status</th>
                  <th className="text-left p-4 text-sm font-medium">Requested</th>
                  <th className="text-left p-4 text-sm font-medium">Delivery</th>
                  <th className="text-left p-4 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m) => (
                  <tr key={m.id} className="border-t hover:bg-muted/30">
                    <td className="p-4">
                      <p className="font-medium text-sm">{m.user.name}</p>
                      <p className="text-xs text-muted-foreground">{m.user.email}</p>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="text-xs capitalize">
                        {garmentTypeLabel(m.garmentType || "") || m.gender}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge
                        className={
                          m.status === "complete"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200 text-xs"
                            : "bg-amber-100 text-amber-700 border-amber-200 text-xs"
                        }
                      >
                        {m.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(m.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {m.deliveryDate ? new Date(m.deliveryDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewDetail(m)}
                          title="View / Edit"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Full Edit">
                          <Link href={`/admin/measurements/${m.id}`}>
                            <Ruler className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-600"
                          onClick={() => setDeleteId(m.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {measurements.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                No tailor measurement requests found
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

      {/* View / Quick Edit Dialog */}
      <Dialog open={!!viewDetail} onOpenChange={(o) => !o && setViewDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewDetail?.user.name} — {garmentTypeLabel(viewDetail?.garmentType || "")}
            </DialogTitle>
            <DialogDescription>
              View and manage measurements. Use the full editor for detailed changes.
            </DialogDescription>
          </DialogHeader>
          {viewDetail && (
            <UnifiedMeasurementForm
              data={viewDetail as unknown as Partial<UnifiedMeasurementFormData>}
              mode="edit"
              isAdmin={true}
              garmentTypeFixed={viewDetail.garmentType}
              customerName={viewDetail.user.name}
              customerEmail={viewDetail.user.email}
              customerPhone={viewDetail.user.phone ?? undefined}
              measurementId={viewDetail.id}
              onSave={async (data) => {
                const res = await fetch(`/api/admin/tailor-measurements/${viewDetail.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
                if (res.ok) {
                  setViewDetail(null);
                  fetchMeasurements();
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tailor Measurement?</DialogTitle>
            <DialogDescription>
              This will permanently delete this measurement record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Measurement Profiles Tab ────────────────────────────────────────────────────

function LegacyProfilesTab({ initialSearch = "" }: { initialSearch?: string }) {
  const [profiles, setProfiles] = useState<LegacyProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewProfile, setViewProfile] = useState<LegacyProfile | null>(null);
  const [printProfile, setPrintProfile] = useState<LegacyProfile | null>(null);
  const [editProfile, setEditProfile] = useState<LegacyProfile | null>(null);
  const [deleteProfile, setDeleteProfile] = useState<LegacyProfile | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
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

  const handleEditSave = async (data: UnifiedMeasurementFormData) => {
    if (!editProfile) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/measurements/${editProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEditProfile(null);
        fetchProfiles();
      }
    } finally {
      setSavingEdit(false);
    }
  };

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
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{total} measurement profile{total !== 1 ? "s" : ""}</CardTitle>
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-600 border-amber-200">
              View-only
            </Badge>
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
                      <Badge
                        className={
                          profile.status === "complete"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200 text-xs"
                            : "bg-amber-100 text-amber-700 border-amber-200 text-xs"
                        }
                      >
                        {profile.status || "complete"}
                      </Badge>
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
                           onClick={() => setEditProfile(profile)}
                           title="Edit Profile"
                         >
                           <Pencil className="h-3.5 w-3.5" />
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
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-600 border-amber-200">
                View-only
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Customer: {viewProfile?.user.name} ({viewProfile?.user.email}) · Created: {viewProfile ? new Date(viewProfile.createdAt).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>
          {viewProfile && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize text-xs">
                  {viewProfile.garmentType.replace(/_/g, " ")}
                </Badge>
                {viewProfile.isDefault && (
                  <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">Default</Badge>
                )}
              </div>

              {viewProfile.notes && (
                <p className="text-sm bg-muted/30 rounded-lg p-3 italic">{viewProfile.notes}</p>
              )}

              <h4 className="text-sm font-semibold border-b pb-1 text-muted-foreground uppercase tracking-wide">
                Measurements
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                {Object.entries(viewProfile.measurements || {}).map(([key, value]) => (
                  value ? (
                    <div key={key} className="flex items-center justify-between border-b border-border/30 py-1">
                      <span className="text-xs text-muted-foreground capitalize">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm font-semibold">{String(value)}</span>
                    </div>
                  ) : null
                ))}
              </div>

              {viewProfile.stylingPrefs && Object.keys(viewProfile.stylingPrefs).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold border-b pb-1 text-muted-foreground uppercase tracking-wide">
                    Styling Preferences
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(viewProfile.stylingPrefs).map(([key, val]) => (
                      val ? (
                        <Badge key={key} variant="outline" className="text-xs capitalize">
                          {key.replace(/_/g, " ")}: {String(val)}
                        </Badge>
                      ) : null
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={!!editProfile} onOpenChange={(o) => !o && setEditProfile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile — {editProfile?.profileName}</DialogTitle>
            <DialogDescription>
              Update this measurement profile. Changes are applied immediately.
            </DialogDescription>
          </DialogHeader>
          {editProfile && (
            <UnifiedMeasurementForm
              data={editProfile as unknown as Partial<UnifiedMeasurementFormData>}
              mode="edit"
              isAdmin={true}
              garmentTypeFixed={editProfile.garmentType}
              customerName={editProfile.user.name}
              customerEmail={editProfile.user.email}
              onSave={handleEditSave}
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
                serialNo: `MP-${printProfile.id.slice(0, 6).toUpperCase()}`,
                customerName: printProfile.user.name,
                deliveryDate: new Date(printProfile.createdAt).toLocaleDateString(),
                productName: printProfile.profileName,
                garmentType: printProfile.garmentType,
                measurements: printProfile.measurements || {},
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
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteRecord, setDeleteRecord] = useState<CompletedRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const limit = 20;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        ...(search && { search }),
        ...(sourceFilter !== "all" && { source: sourceFilter }),
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
  }, [page, search, sourceFilter, statusFilter]);

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
          <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="order">From Order</SelectItem>
              <SelectItem value="tailor_request">Tailor Request</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
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
                  <th className="text-left p-4 text-sm font-medium">Source</th>
                  <th className="text-left p-4 text-sm font-medium">Garment Type</th>
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
                      <Badge
                        className={
                          r.source === "order"
                            ? "bg-blue-100 text-blue-700 border-blue-200 text-xs"
                            : "bg-purple-100 text-purple-700 border-purple-200 text-xs"
                        }
                      >
                        {r.source === "order" ? "From Order" : "Tailor Request"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="capitalize text-xs">
                        {garmentTypeLabel(r.garmentType || "")}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(r.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-600"
                        onClick={() => setDeleteRecord(r)}
                        title="Delete Record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminMeasurementsPage() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const hasSearchQuery = !!urlSearch;
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({
    totalProfiles: 0,
    totalTailorRequests: 0,
    pendingRequests: 0,
    completeRequests: 0,
    completedCount: 0,
  });
  const [activeTab, setActiveTab] = useState(hasSearchQuery ? "profiles" : "tailor");

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
            Manage tailor measurement requests and view measurement profiles
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setRefreshKey((k) => k + 1)}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Tailor Requests</p>
            <p className="text-2xl font-bold mt-1">{stats.totalTailorRequests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-amber-600 font-medium">Pending</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{stats.pendingRequests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-emerald-600 font-medium">Completed</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.completeRequests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Measurement Profiles</p>
            <p className="text-2xl font-bold mt-1">{stats.totalProfiles}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> All Completed
            </p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.completedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} key={refreshKey}>
        <TabsList>
          <TabsTrigger value="tailor">Tailor Requests</TabsTrigger>
          <TabsTrigger value="profiles">Measurement Profiles</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="tailor" className="space-y-4 mt-4">
          <TailorRequestsTab />
        </TabsContent>
        <TabsContent value="profiles" className="space-y-4 mt-4">
          <LegacyProfilesTab initialSearch={urlSearch} />
        </TabsContent>
        <TabsContent value="completed" className="space-y-4 mt-4">
          <CompletedTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}