"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Plus, Eye, Pencil, Trash2, X, Phone, User, ChevronDown, ChevronUp, Users,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { garmentTypeLabel } from "@/lib/validators/measurements-unified";

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

// ─── Garment field definitions (per garment type, grouped by section) ─────────

const GARMENT_TYPES = [
  { value: "male_shalwar_kameez",  label: "Male Shalwar Kameez",          gender: "Male" },
  { value: "male_simple_3_piece",  label: "Male Simple 3 Piece Suit",      gender: "Male" },
  { value: "male_prince_coat",     label: "Male Prince Coat 3 Piece Suit", gender: "Male" },
  { value: "male_shirt",           label: "Male Shirt",                    gender: "Male" },
  { value: "female_simple_shalwar",label: "Female Simple Shalwar Kameez",  gender: "Female" },
  { value: "female_frock",         label: "Female Frock",                  gender: "Female" },
  { value: "female_lehnga_kurti",  label: "Female Lehnga Kurti",           gender: "Female" },
  { value: "female_saari",         label: "Female Saari",                  gender: "Female" },
];

interface FieldDef { label: string; key: string; type: "text" | "toggle"; }
interface FieldSection { title: string; fields: FieldDef[]; }

const GARMENT_FIELDS: Record<string, FieldSection[]> = {
  male_shalwar_kameez: [
    {
      title: "Kameez Measurements",
      fields: [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Arm Hole Golai", key: "golai1", type: "text" },
        { label: "Cuff", key: "armcuff1", type: "text" },
        { label: "Cuff Plate", key: "armplate1", type: "text" },
        { label: "Gol Bazoo", key: "golbazoo1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Patti Width", key: "armpatti1", type: "text" },
        { label: "Bane Width", key: "bane1", type: "text" },
        { label: "Collar Nok", key: "collarnok1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Hip", key: "hip1", type: "text" },
        { label: "Gherra", key: "gherra1", type: "text" },
      ],
    },
    {
      title: "Style Options",
      fields: [
        { label: "Double CB", key: "double_cb", type: "toggle" },
        { label: "Single CB", key: "single_cb", type: "toggle" },
        { label: "Gol CB", key: "gol_cb", type: "toggle" },
        { label: "Choras CB", key: "choras_cb", type: "toggle" },
        { label: "Bane", key: "bane_cb", type: "toggle" },
        { label: "Collar", key: "collar_cb", type: "toggle" },
        { label: "Round Neck", key: "roundneck", type: "toggle" },
        { label: "Straight CB", key: "straight_cb", type: "toggle" },
        { label: "Down CB", key: "down_cb", type: "toggle" },
      ],
    },
    {
      title: "Shalwar Measurements",
      fields: [
        { label: "Length", key: "shalwar1", type: "text" },
        { label: "Gherra", key: "shalwar_gherra1", type: "text" },
        { label: "Assan", key: "shalwar_assan1", type: "text" },
        { label: "Pancha", key: "shalwar_pancha1", type: "text" },
        { label: "Pocket (Front)", key: "front_pocket", type: "text" },
        { label: "Pocket (Side)", key: "side_pocket", type: "text" },
        { label: "Zip", key: "zip_cb", type: "toggle" },
      ],
    },
    {
      title: "Trouser Measurements",
      fields: [
        { label: "Length", key: "trouserdata1", type: "text" },
        { label: "Pancha (Bottom)", key: "trouserdata2", type: "text" },
        { label: "Thigh", key: "trouserdata3", type: "text" },
        { label: "Elastic", key: "trouserdata4", type: "text" },
      ],
    },
  ],
  male_simple_3_piece: [
    {
      title: "Coat Measurements",
      fields: [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Gol Bazoo", key: "golbazoo1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Hip", key: "hip1", type: "text" },
      ],
    },
    {
      title: "Trouser Measurements",
      fields: [
        { label: "Length", key: "trouserdata1", type: "text" },
        { label: "Pancha (Bottom)", key: "trouserdata2", type: "text" },
        { label: "Thigh", key: "trouserdata3", type: "text" },
        { label: "Elastic", key: "trouserdata4", type: "text" },
      ],
    },
  ],
  male_prince_coat: [
    {
      title: "Coat Measurements",
      fields: [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Arm Hole Golai", key: "golai1", type: "text" },
        { label: "Gol Bazoo", key: "golbazoo1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Hip", key: "hip1", type: "text" },
      ],
    },
    {
      title: "Trouser Measurements",
      fields: [
        { label: "Length", key: "trouserdata1", type: "text" },
        { label: "Pancha (Bottom)", key: "trouserdata2", type: "text" },
        { label: "Thigh", key: "trouserdata3", type: "text" },
        { label: "Elastic", key: "trouserdata4", type: "text" },
      ],
    },
  ],
  male_shirt: [
    {
      title: "Shirt Measurements",
      fields: [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Arm Hole Golai", key: "golai1", type: "text" },
        { label: "Cuff", key: "armcuff1", type: "text" },
        { label: "Cuff Plate", key: "armplate1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Patti Width", key: "armpatti1", type: "text" },
        { label: "Bane Width", key: "bane1", type: "text" },
        { label: "Collar Nok", key: "collarnok1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Hip", key: "hip1", type: "text" },
        { label: "Front Pocket", key: "front_pocket", type: "toggle" },
        { label: "Collar", key: "collar_cb", type: "toggle" },
        { label: "Bane", key: "bane_cb", type: "toggle" },
      ],
    },
  ],
  female_simple_shalwar: [
    {
      title: "Kameez Measurements",
      fields: [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Arm Hole Golai", key: "lad_golai1", type: "text" },
        { label: "Mori", key: "lad_mori1", type: "text" },
        { label: "Bell Bazoo", key: "lad_bellbazoo1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Gherra", key: "gherra1", type: "text" },
        { label: "Chaak", key: "lad_chaak1", type: "text" },
        { label: "Zip", key: "zip_cb", type: "toggle" },
      ],
    },
    {
      title: "Simple Shalwar",
      fields: [
        { label: "Length", key: "lad_simple_shalwar1", type: "text" },
        { label: "Pancha", key: "lad_simple_shalwar_pancha1", type: "text" },
        { label: "Gherra", key: "lad_simple_shalwar_gherra1", type: "text" },
        { label: "Elastic", key: "lad_lastic_simple_shalwar", type: "text" },
      ],
    },
    {
      title: "Belt Shalwar",
      fields: [
        { label: "Length", key: "lad_shalwar_belt1", type: "text" },
        { label: "Pancha", key: "lad_shalwar_belt_pancha1", type: "text" },
        { label: "Gherra", key: "lad_shalwar_belt_gherra1", type: "text" },
        { label: "Elastic", key: "lad_lastic_shalwar_belt", type: "text" },
      ],
    },
    {
      title: "Trouser",
      fields: [
        { label: "Length", key: "trouserdata1", type: "text" },
        { label: "Pancha", key: "trouserdata2", type: "text" },
        { label: "Thigh", key: "trouserdata3", type: "text" },
        { label: "Elastic", key: "lad_trouser_elastic1", type: "text" },
      ],
    },
  ],
  female_frock: [
    {
      title: "Frock Measurements",
      fields: [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Arm Hole Golai", key: "lad_golai1", type: "text" },
        { label: "Mori", key: "lad_mori1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Gherra", key: "gherra1", type: "text" },
      ],
    },
  ],
  female_lehnga_kurti: [
    {
      title: "Kurti Measurements",
      fields: [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Arm Hole Golai", key: "lad_golai1", type: "text" },
        { label: "Mori", key: "lad_mori1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Hip", key: "lad_hip1", type: "text" },
        { label: "Chaak", key: "lad_chaak1", type: "text" },
      ],
    },
  ],
  female_saari: [
    {
      title: "Blouse Measurements",
      fields: [
        { label: "Length", key: "length1", type: "text" },
        { label: "Shoulder", key: "shoulder1", type: "text" },
        { label: "Sleeves", key: "sleeves1", type: "text" },
        { label: "Arm Hole Golai", key: "lad_golai1", type: "text" },
        { label: "Mori", key: "lad_mori1", type: "text" },
        { label: "Neck", key: "neck1", type: "text" },
        { label: "Chest", key: "chest1", type: "text" },
        { label: "Waist", key: "waist1", type: "text" },
        { label: "Hip", key: "lad_hip1", type: "text" },
      ],
    },
  ],
};

// ─── Measurement Form Component ───────────────────────────────────────────────

function MeasurementForm({
  garmentType,
  values,
  onChange,
}: {
  garmentType: string;
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
}) {
  const sections = GARMENT_FIELDS[garmentType] || [];

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.title}>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 pb-1 border-b">
            {section.title}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {section.fields.map((f) => (
              <div key={f.key}>
                <Label className="text-xs mb-1 block">{f.label}</Label>
                {f.type === "toggle" ? (
                  <Select
                    value={values[f.key] || "0"}
                    onValueChange={(v) => onChange(f.key, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No</SelectItem>
                      <SelectItem value="1">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={values[f.key] || ""}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    className="h-8 text-xs"
                    placeholder='e.g. 42 or 42½'
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Add/Edit Dialog ──────────────────────────────────────────────────────────

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
  const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [phone, setPhone] = useState(existing?.phone || "");
  const [customerName, setCustomerName] = useState(existing?.customer_name || "");
  const [garmentType, setGarmentType] = useState(existing?.garment_type || "male_shalwar_kameez");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [measurements, setMeasurements] = useState<Record<string, string>>(() => {
    if (!existing) return {};
    // Pull all measurement fields from existing record
    const m: Record<string, string> = {};
    const exclude = new Set(["id", "phone", "customer_name", "garment_type", "gender", "notes", "created_at", "updated_at", "deleted_at"]);
    for (const [k, v] of Object.entries(existing)) {
      if (!exclude.has(k) && typeof v === "string") m[k] = v;
    }
    return m;
  });

  const gender = garmentType.startsWith("female_") ? "Female" : "Male";

  // Reset when opened fresh
  useEffect(() => {
    if (!open) return;
    if (!existing) {
      setStep(1); setPhone(""); setCustomerName("");
      setGarmentType("male_shalwar_kameez"); setNotes(""); setMeasurements({});
    } else {
      setStep(2);
      setPhone(existing.phone); setCustomerName(existing.customer_name);
      setGarmentType(existing.garment_type); setNotes(existing.notes || "");
      const m: Record<string, string> = {};
      const exclude = new Set(["id", "phone", "customer_name", "garment_type", "gender", "notes", "created_at", "updated_at", "deleted_at"]);
      for (const [k, v] of Object.entries(existing)) {
        if (!exclude.has(k) && typeof v === "string") m[k] = v;
      }
      setMeasurements(m);
    }
    setError("");
  }, [open, existing]);

  const handleMeasurementChange = (key: string, val: string) => {
    setMeasurements((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    if (!phone.trim()) { setError("Phone number is required"); return; }
    if (!customerName.trim()) { setError("Customer name is required"); return; }
    setSaving(true); setError("");

    // Flatten all fields into one camelCase-keyed object for the API
    const snakeToCamel: Record<string, string> = {
      length1: "length1", length2: "length2",
      shoulder1: "shoulder1", shoulder2: "shoulder2",
      chest1: "chest1", chest2: "chest2",
      waist1: "waist1", waist2: "waist2",
      gherra1: "gherra1", gherra2: "gherra2",
      neck1: "neck1", neck2: "neck2",
      sleeves1: "sleeves1", sleeves2: "sleeves2",
      golai1: "golai1", golai2: "golai2",
      armcuff1: "armcuff1", armcuff2: "armcuff2",
      armplate1: "armplate1", armplate2: "armplate2",
      golbazoo1: "golbazoo1", golbazoo2: "golbazoo2",
      armpatti1: "armpatti1", armpatti2: "armpatti2",
      collarnok1: "collarnok1", collarnok2: "collarnok2",
      bane1: "bane1", bane2: "bane2",
      hip1: "hip1", hip2: "hip2",
      double_cb: "doubleCb", single_cb: "singleCb",
      gol_cb: "golCb", choras_cb: "chorasCb",
      bane_cb: "baneCb", collar_cb: "collarCb",
      roundneck: "roundneck", straight_cb: "straightCb", down_cb: "downCb",
      shalwar1: "shalwar1", shalwar2: "shalwar2",
      shalwar_gherra1: "shalwarGherra1", shalwar_gherra2: "shalwarGherra2",
      shalwar_assan1: "shalwarAssan1", shalwar_assan2: "shalwarAssan2",
      shalwar_pancha1: "shalwarPancha1", shalwar_pancha2: "shalwarPancha2",
      front_pocket: "frontPocket", side_pocket: "sidePocket", shalwar_pocket: "shalwarPocket",
      zip_cb: "zipCb",
      trouserdata1: "trouserdata1", trouserdata2: "trouserdata2",
      trouserdata3: "trouserdata3", trouserdata4: "trouserdata4",
      lad_golai1: "ladGolai1", lad_golai2: "ladGolai2",
      lad_mori1: "ladMori1", lad_mori2: "ladMori2",
      lad_bellbazoo1: "ladBellbazoo1", lad_bellbazoo2: "ladBellbazoo2",
      lad_chaak1: "ladChaak1", lad_chaak2: "ladChaak2",
      lad_hip1: "ladHip1", lad_hip2: "ladHip2",
      lad_simple_shalwar1: "ladSimpleShalwar1", lad_simple_shalwar2: "ladSimpleShalwar2",
      lad_simple_shalwar_pancha1: "ladSimpleShalwarPancha1",
      lad_simple_shalwar_gherra1: "ladSimpleShalwarGherra1",
      lad_lastic_simple_shalwar: "ladLasticSimpleShalwar",
      lad_shalwar_belt1: "ladShalwarBelt1", lad_shalwar_belt2: "ladShalwarBelt2",
      lad_shalwar_belt_pancha1: "ladShalwarBeltPancha1",
      lad_shalwar_belt_gherra1: "ladShalwarBeltGherra1",
      lad_lastic_shalwar_belt: "ladLasticShalwarBelt",
      lad_trouserdata15: "ladTrouserdata15", lad_trouserdata16: "ladTrouserdata16",
      lad_trouser_elastic1: "ladTrouserElastic1",
    };

    const payload: Record<string, string> = {
      phone: phone.trim(),
      customerName: customerName.trim(),
      garmentType,
      gender,
      notes: notes.trim(),
    };

    for (const [snake, val] of Object.entries(measurements)) {
      const camel = snakeToCamel[snake] || snake;
      payload[camel] = val;
    }

    try {
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
        setError(d.error || "Failed to save");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Network error, please try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Customer Measurement" : "Add Customer Measurement"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the measurement details for this customer."
              : "Add a measurement for an old customer. One phone number can have multiple entries."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ── Step 1: Identity ── */}
          {(step === 1 || isEdit) && (
            <div className="space-y-4">
              {!isEdit && (
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                  Customer Info
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cm-phone" className="flex items-center gap-1 mb-1">
                    <Phone className="h-3.5 w-3.5" /> Phone Number *
                  </Label>
                  <Input
                    id="cm-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 03001234567"
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="cm-name" className="flex items-center gap-1 mb-1">
                    <User className="h-3.5 w-3.5" /> Customer Name *
                  </Label>
                  <Input
                    id="cm-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ahmed Ali"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1 block">Garment Type *</Label>
                <Select value={garmentType} onValueChange={(v) => { setGarmentType(v); setMeasurements({}); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Male</div>
                    {GARMENT_TYPES.filter((g) => g.gender === "Male").map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-1">Female</div>
                    {GARMENT_TYPES.filter((g) => g.gender === "Female").map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isEdit && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      if (!phone.trim()) { setError("Phone is required"); return; }
                      if (!customerName.trim()) { setError("Name is required"); return; }
                      setError(""); setStep(2);
                    }}
                  >
                    Next: Enter Measurements →
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Measurements ── */}
          {step === 2 && (
            <div className="space-y-4">
              {!isEdit && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                      Measurements — <Badge variant="outline" className="text-xs capitalize">{garmentTypeLabel(garmentType)}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep(1)}>← Back</Button>
                  </div>
                  <div className="bg-muted/40 rounded-lg px-4 py-2 flex gap-6 text-sm">
                    <span><span className="text-muted-foreground">Phone:</span> <strong className="font-mono">{phone}</strong></span>
                    <span><span className="text-muted-foreground">Name:</span> <strong>{customerName}</strong></span>
                  </div>
                </>
              )}

              <MeasurementForm
                garmentType={garmentType}
                values={measurements}
                onChange={handleMeasurementChange}
              />

              <div>
                <Label className="mb-1 block">Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions or remarks..."
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded px-3 py-2">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          {(step === 2 || isEdit) && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Measurement"}
            </Button>
          )}
        </DialogFooter>
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
  const sections = GARMENT_FIELDS[record.garment_type] || [];

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Measurement Details</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{record.phone}</span> — {record.customer_name} ·{" "}
            <Badge variant="outline" className="text-xs capitalize ml-1">
              {garmentTypeLabel(record.garment_type)}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 pb-1 border-b">
                {section.title}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {section.fields.map((f) => {
                  const val = record[f.key] || "—";
                  const displayVal = f.type === "toggle" ? (val === "1" ? "Yes" : "No") : val;
                  return (
                    <div key={f.key} className="bg-muted/30 rounded px-3 py-2">
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="text-sm font-medium">{displayVal}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {record.notes && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 pb-1 border-b">Notes</h4>
              <p className="text-sm">{record.notes}</p>
            </div>
          )}
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

  // Group records by phone for display
  const grouped: Record<string, CustomerMeasurement[]> = {};
  for (const r of records) {
    if (!grouped[r.phone]) grouped[r.phone] = [];
    grouped[r.phone].push(r);
  }

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
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => setViewRecord(r)} title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => setEditRecord(r)} title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-600"
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
