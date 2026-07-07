"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Plus, Eye, Pencil, Trash2, Users, X, Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { garmentTypeLabel, mapFromPrismaFields, mapToPrismaFields } from "@/lib/validators/measurements-unified";
import { UnifiedMeasurementForm } from "@/components/measurements/UnifiedMeasurementForm";
import { TailorPrintCard } from "@/components/admin/tailor-print-card";
import type { UnifiedMeasurementFormData } from "@/lib/validators/measurements-unified";
import { UNIFIED_MEASUREMENT_EMPTY } from "@/lib/validators/measurements-unified";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerMeasurement {
  id: string;
  phone: string;
  customer_name: string;
  garment_type: string;
  gender: string;
  notes: string;
  created_at: string;
  // measurement fields (snake_case from DB)
  [key: string]: string;
}

// ─── Helper: convert DB record → UnifiedMeasurementFormData ──────────────────

function dbRowToFormData(record: CustomerMeasurement): UnifiedMeasurementFormData & { adminPhone?: string } {
  // mapFromPrismaFields handles all legacy field name reversals
  const base = mapFromPrismaFields(record as any);
  return {
    ...base,
    gender: (record.gender as "Male" | "Female") || "Male",
    garmentType: (record.garment_type as UnifiedMeasurementFormData["garmentType"]) || "male_shalwar_kameez",
    customerName: record.customer_name || "",
    notes: record.notes || "",
    adminPhone: record.phone || "",
  } as UnifiedMeasurementFormData & { adminPhone?: string };
}

// ─── Helper: convert UnifiedMeasurementFormData → API payload ────────────────

function formDataToPayload(
  data: UnifiedMeasurementFormData & { adminPhone?: string },
  existingId?: string
): Record<string, string> {
  // Use mapToPrismaFields to get the correctly named fields (shalwar1, trouserdata1, etc.)
  // The API route already has a camelToSnake map that handles these names
  const prismaFields = mapToPrismaFields(data);

  const payload: Record<string, string> = {
    phone: ((data as any).adminPhone || "").trim(),
    customerName: (data.customerName || "").trim(),
    garmentType: data.garmentType,
    gender: data.gender,
    notes: data.notes || "",
    // Measurement fields from mapToPrismaFields — these match the API's camelToSnake keys
    // Note: mapToPrismaFields returns keys like shalwar1, trouserdata1 which the API
    // already maps to snake_case. We include all of them directly.
    length1: prismaFields.length1 || "",
    length2: prismaFields.length2 || "",
    shoulder1: prismaFields.shoulder1 || "",
    shoulder2: prismaFields.shoulder2 || "",
    chest1: prismaFields.chest1 || "",
    chest2: prismaFields.chest2 || "",
    waist1: prismaFields.waist1 || "",
    waist2: prismaFields.waist2 || "",
    gherra1: prismaFields.gherra1 || "",
    gherra2: prismaFields.gherra2 || "",
    neck1: prismaFields.neck1 || "",
    neck2: prismaFields.neck2 || "",
    sleeves1: prismaFields.sleeves1 || "",
    sleeves2: prismaFields.sleeves2 || "",
    golai1: prismaFields.golai1 || "",
    golai2: prismaFields.golai2 || "",
    armcuff1: prismaFields.armcuff1 || "",
    armcuff2: prismaFields.armcuff2 || "",
    armplate1: prismaFields.armplate1 || "",
    armplate2: prismaFields.armplate2 || "",
    golbazoo1: prismaFields.golbazoo1 || "",
    golbazoo2: prismaFields.golbazoo2 || "",
    armpatti1: prismaFields.armpatti1 || "",
    armpatti2: prismaFields.armpatti2 || "",
    collarnok1: prismaFields.collarnok1 || "",
    collarnok2: prismaFields.collarnok2 || "",
    bane1: prismaFields.bane1 || "",
    bane2: prismaFields.bane2 || "",
    ladHip1: prismaFields.ladHip1 || "",
    ladHip2: prismaFields.ladHip2 || "",
    hip1: prismaFields.hip1 || "",
    hip2: prismaFields.hip2 || "",
    // Toggles
    doubleCb: prismaFields.doubleCb || "0",
    singleCb: prismaFields.singleCb || "0",
    golCb: prismaFields.golCb || "0",
    chorasCb: prismaFields.chorasCb || "0",
    baneCb: prismaFields.baneCb || "0",
    collarCb: prismaFields.collarCb || "0",
    roundneck: prismaFields.roundneck || "0",
    straightCb: prismaFields.straightCb || "0",
    downCb: prismaFields.downCb || "0",
    // Pockets
    frontPocket: prismaFields.frontPocket || "0",
    sidePocket: prismaFields.sidePocket || "0",
    shalwarPocket: prismaFields.shalwarPocket || "0",
    zipCb: prismaFields.zipCb || "0",
    // Shalwar (API maps shalwar1 → shalwar1 in DB)
    shalwar1: prismaFields.shalwar1 || "",
    shalwar2: prismaFields.shalwar2 || "",
    shalwarPancha1: prismaFields.shalwarPancha1 || "",
    shalwarPancha2: prismaFields.shalwarPancha2 || "",
    shalwarGherra1: prismaFields.shalwarGherra1 || "",
    shalwarGherra2: prismaFields.shalwarGherra2 || "",
    shalwarAssan1: prismaFields.shalwarAssan1 || "",
    shalwarAssan2: prismaFields.shalwarAssan2 || "",
    // Trouser (API maps trouserdata1..N → trouserdata1..N in DB)
    trouserdata1: prismaFields.trouserdata1 || "",
    trouserdata2: prismaFields.trouserdata2 || "",
    trouserdata3: prismaFields.trouserdata3 || "",
    trouserdata4: prismaFields.trouserdata4 || "",
    trouserdata5: prismaFields.trouserdata5 || "",
    trouserdata6: prismaFields.trouserdata6 || "",
    trouserdata7: prismaFields.trouserdata7 || "",
    trouserdata8: prismaFields.trouserdata8 || "",
    trouserdata9: prismaFields.trouserdata9 || "",
    trouserdata10: prismaFields.trouserdata10 || "",
    trouserdata11: prismaFields.trouserdata11 || "",
    trouserdata12: prismaFields.trouserdata12 || "",
    trouserdata13: prismaFields.trouserdata13 || "",
    trouserdata14: prismaFields.trouserdata14 || "",
    // Ladies extras
    ladGolai1: prismaFields.ladGolai1 || "",
    ladGolai2: prismaFields.ladGolai2 || "",
    ladMori1: prismaFields.ladMori1 || "",
    ladMori2: prismaFields.ladMori2 || "",
    ladBellbazoo1: prismaFields.ladBellbazoo1 || "",
    ladBellbazoo2: prismaFields.ladBellbazoo2 || "",
    ladChaak1: prismaFields.ladChaak1 || "",
    ladChaak2: prismaFields.ladChaak2 || "",
    ladSimpleShalwar1: prismaFields.ladSimpleShalwar1 || "",
    ladSimpleShalwar2: prismaFields.ladSimpleShalwar2 || "",
    ladSimpleShalwarPancha1: prismaFields.ladSimpleShalwarPancha1 || "",
    ladSimpleShalwarPancha2: prismaFields.ladSimpleShalwarPancha2 || "",
    ladSimpleShalwarGherra1: prismaFields.ladSimpleShalwarGherra1 || "",
    ladSimpleShalwarGherra2: prismaFields.ladSimpleShalwarGherra2 || "",
    ladLasticSimpleShalwar: prismaFields.ladLasticSimpleShalwar || "",
    ladShalwarBelt1: prismaFields.ladShalwarBelt1 || "",
    ladShalwarBelt2: prismaFields.ladShalwarBelt2 || "",
    ladShalwarBeltPancha1: prismaFields.ladShalwarBeltPancha1 || "",
    ladShalwarBeltPancha2: prismaFields.ladShalwarBeltPancha2 || "",
    ladShalwarBeltGherra1: prismaFields.ladShalwarBeltGherra1 || "",
    ladShalwarBeltGherra2: prismaFields.ladShalwarBeltGherra2 || "",
    ladLasticShalwarBelt: prismaFields.ladLasticShalwarBelt || "",
    // Ladies trouser → API maps ladTrouserElastic1 → lad_trouser_elastic1
    ladTrouserElastic1: data.ladTrouserElastic1 || "",
  };

  return payload;
}

// ─── Add/Edit Dialog using UnifiedMeasurementForm wizard ─────────────────────

function AddEditDialog({
  open,
  onClose,
  onSaved,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  existing?: CustomerMeasurement | null;
}) {
  const isEdit = !!existing;
  // Use a key to force full remount on open/close so wizard resets
  const [dialogKey, setDialogKey] = useState(0);

  useEffect(() => {
    if (open) setDialogKey((k) => k + 1);
  }, [open, existing]);

  const initialData = existing
    ? dbRowToFormData(existing)
    : {
        ...UNIFIED_MEASUREMENT_EMPTY,
        adminPhone: "",
        customerName: "",
      };

  const handleSave = async (data: UnifiedMeasurementFormData) => {
    const payload = formDataToPayload(data as any);

    if (!payload.phone?.trim()) throw new Error("Phone number is required");
    if (!payload.customerName?.trim()) throw new Error("Customer name is required");

    const url = isEdit
      ? `/api/admin/customer-measurements/${existing!.id}`
      : "/api/admin/customer-measurements";

    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || "Failed to save");
    }

    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl w-full max-h-[95vh] overflow-y-auto p-0">
        {/* Dialog header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <div>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {isEdit ? "Edit Customer Measurement" : "Add Customer Measurement"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {isEdit
                ? `Editing: ${existing?.customer_name} (${existing?.phone})`
                : "Fill in the customer's details and measurements using the form below."}
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Wizard body */}
        <div className="px-2 pb-6">
          <UnifiedMeasurementForm
            key={dialogKey}
            data={initialData}
            mode="edit"
            wizard={!isEdit}
            isAdmin={true}
            onSave={handleSave}
          />

          {/* For edit mode (no wizard), UnifiedMeasurementForm starts at step 3 directly.
              We still need admin phone + name shown above the A4 form for reference. */}
          {isEdit && (
            <div className="bg-muted/40 rounded-lg px-4 py-2 flex gap-6 text-sm mb-4 -mt-2 order-first">
              <span>
                <span className="text-muted-foreground">Phone:</span>{" "}
                <strong className="font-mono">{existing?.phone}</strong>
              </span>
              <span>
                <span className="text-muted-foreground">Name:</span>{" "}
                <strong>{existing?.customer_name}</strong>
              </span>
              <Badge variant="outline" className="text-xs capitalize">
                {garmentTypeLabel(existing?.garment_type || "")}
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── View Detail Dialog ───────────────────────────────────────────────────────

function ViewDetailDialog({
  record,
  onClose,
}: {
  record: CustomerMeasurement | null;
  onClose: () => void;
}) {
  if (!record) return null;

  const formData = dbRowToFormData(record);

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl w-full max-h-[95vh] overflow-y-auto p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <div>
            <DialogTitle className="text-lg font-semibold">Measurement Details</DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              <span className="font-mono">{record.phone}</span> — {record.customer_name}{" "}
              ·{" "}
              <Badge variant="outline" className="text-xs capitalize ml-1">
                {garmentTypeLabel(record.garment_type)}
              </Badge>
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-2 pb-6">
          <UnifiedMeasurementForm
            data={formData}
            mode="readonly"
            wizard={false}
            isAdmin={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Customer Measurements Panel ────────────────────────────────────────

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CustomerMeasurementsContent() {
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<CustomerMeasurement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const limit = 20;

  const [showAdd, setShowAdd] = useState(searchParams.get("add") === "true");
  const [editRecord, setEditRecord] = useState<CustomerMeasurement | null>(null);
  const [viewRecord, setViewRecord] = useState<CustomerMeasurement | null>(null);
  const [printRecord, setPrintRecord] = useState<CustomerMeasurement | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<CustomerMeasurement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRecords = useCallback(async (searchVal: string, pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(limit) });
      if (searchVal.trim()) params.set("search", searchVal.trim());
      const res = await fetch(`/api/admin/customer-measurements?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecords(search, page);
  }, [page, fetchRecords, search]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchRecords(val, 1), 350);
  };

  const handleDelete = async () => {
    if (!deleteRecord) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/customer-measurements/${deleteRecord.id}`, { method: "DELETE" });
      setDeleteRecord(null);
      fetchRecords(search, page);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="h-6 w-6" /> Customer Measurements Database
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Admin-managed measurement records for old customers — searchable by phone or name
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Measurement
        </Button>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Total Records</p>
          <p className="text-2xl font-bold mt-1">{total}</p>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by phone number or customer name..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{total} record{total !== 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium">Phone</th>
                  <th className="text-left p-4 text-sm font-medium">Customer Name</th>
                  <th className="text-left p-4 text-sm font-medium">Garment Type</th>
                  <th className="text-left p-4 text-sm font-medium">Added</th>
                  <th className="text-left p-4 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-4">
                      <span className="font-mono text-sm font-medium">{r.phone}</span>
                    </td>
                    <td className="p-4 text-sm">{r.customer_name}</td>
                    <td className="p-4">
                      <Badge variant="outline" className="text-xs capitalize">
                        {garmentTypeLabel(r.garment_type)}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 items-center">
                        <Button
                          variant="outline" size="sm" className="h-8 gap-1.5 text-primary border-primary/40 hover:bg-primary/5 hover:border-primary"
                          onClick={() => setViewRecord(r)} title="View Measurements"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => setEditRecord(r)} title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => setPrintRecord(r)} title="Print"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteRecord(r)} title="Delete"
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
                {search ? "No records match your search" : "No customer measurements yet. Click 'Add Measurement' to start."}
              </div>
            )}
            {loading && (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
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

      {/* Add Dialog */}
      <AddEditDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => fetchRecords(search, 1)}
      />

      {/* Edit Dialog */}
      <AddEditDialog
        open={!!editRecord}
        onClose={() => setEditRecord(null)}
        onSaved={() => fetchRecords(search, page)}
        existing={editRecord}
      />

      {/* View Dialog */}
      <ViewDetailDialog record={viewRecord} onClose={() => setViewRecord(null)} />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteRecord} onOpenChange={(o) => !o && setDeleteRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Measurement?</DialogTitle>
            <DialogDescription>
              Delete the record for <strong>{deleteRecord?.customer_name}</strong> ({deleteRecord?.phone})?
              This action cannot be undone.
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

      {/* 4. Print Dialog */}
      <Dialog open={!!printRecord} onOpenChange={(o) => !o && setPrintRecord(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Print Measurement Profile</DialogTitle>
          </DialogHeader>
          {printRecord && (
            <TailorPrintCard
              data={{
                serialNo: `CM-${printRecord.id.slice(0, 6).toUpperCase()}`,
                customerName: printRecord.customer_name,
                deliveryDate: new Date(printRecord.created_at).toLocaleDateString(),
                productName: "Admin Customer Measurement",
                garmentType: printRecord.garment_type,
                gender: printRecord.gender || "Male",
                // Map snake_case to camelCase for the print card
                measurements: mapFromPrismaFields(printRecord),
                stylingPrefs: null,
                notes: printRecord.notes ?? "",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CustomerMeasurementsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <CustomerMeasurementsContent />
    </Suspense>
  );
}
