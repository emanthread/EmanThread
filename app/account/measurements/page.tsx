"use client";

import { useState, useEffect, useCallback } from "react";
import { UnifiedLayoutEngine } from "@/components/measurements/UnifiedLayoutEngine";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Ruler, Plus, Pencil, Trash2, Star, ClipboardCheck, Send } from "lucide-react";
import { TailorMeasurementEditor } from "@/components/measurements/tailor-measurement-editor";
import type { TailorMeasurementFormData } from "@/lib/validators/tailor-measurements";
import { TAILOR_MEASUREMENT_EMPTY } from "@/lib/validators/tailor-measurements";

interface MeasurementFieldDef {
  key: string;
  en: string;
  ur: string;
}

interface MeasurementProfile {
  id: string;
  profileName: string;
  garmentType: string;
  measurements: Record<string, string>;
  stylingPrefs: Record<string, unknown> | null;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
}

const FRACTIONS = ["", "1/2", "1/4", "1/8"];

// ── Male – Shalwar Kameez ────────────────────────────────────────────────────
const MALE_SK_SHIRT_FIELDS: MeasurementFieldDef[] = [
  { key: "length",   en: "Length",             ur: "لمبائی" },
  { key: "shoulder", en: "Shoulder",           ur: "کندھا" },
  { key: "neck",     en: "Neck",               ur: "گلا" },
  { key: "sleeves",  en: "Sleeves (Stitching Single)", ur: "آستین (سنگل سلائی)" },
  { key: "chest",    en: "Chest",              ur: "سینہ" },
  { key: "waist",    en: "Waist",              ur: "کمر" },
  { key: "gherra",   en: "Ghierra",            ur: "گھیرا" },
];
const MALE_SK_SHALWAR_FIELDS: MeasurementFieldDef[] = [
  { key: "shalwar", en: "Shalwar", ur: "شلوار" },
  { key: "pancha",  en: "Pancha",  ur: "پانچہ" },
];

// ── Male – 3 Piece Suit: Prince Coat ────────────────────────────────────────
const MALE_PC_COAT_FIELDS: MeasurementFieldDef[] = [
  { key: "length",   en: "Length",                      ur: "لمبائی" },
  { key: "shoulder", en: "Shoulder",                    ur: "کندھا" },
  { key: "neck",     en: "Neck",                        ur: "گلا" },
  { key: "sleeves",  en: "Sleeves (Straight on Down)",  ur: "آستین (سیدھی نیچے)" },
  { key: "chest",    en: "Chest",                       ur: "سینہ" },
  { key: "waist",    en: "Waist",                       ur: "کمر" },
  { key: "gherra",   en: "Ghierra (Straight)",          ur: "گھیرا (سیدھا)" },
  { key: "choras",   en: "Choras",                      ur: "چوڑاس" },
];
const MALE_PC_TROUSER_FIELDS: MeasurementFieldDef[] = [
  { key: "trouser_length", en: "L (Length)", ur: "لمبائی" },
  { key: "trouser_bottom", en: "Bottom (Tight)", ur: "پائنچہ (تنگ)" },
  { key: "trouser_waist",  en: "Waist",      ur: "کمر" },
];
const MALE_PC_SHIRT_FIELDS: MeasurementFieldDef[] = [
  { key: "shirt_length",   en: "Shirt Length",    ur: "قمیض لمبائی" },
  { key: "shirt_shoulder", en: "Shirt Shoulder",  ur: "قمیض کندھا" },
  { key: "shirt_neck",     en: "Shirt Neck",      ur: "قمیض گلا" },
  { key: "shirt_chest",    en: "Shirt Chest",     ur: "قمیض سینہ" },
  { key: "shirt_waist",    en: "Shirt Waist",     ur: "قمیض کمر" },
  { key: "shirt_gherra",   en: "Shirt Ghierra",   ur: "قمیض گھیرا" },
];

// ── Male – 3 Piece Suit: Simple Pent Coat ────────────────────────────────────
const MALE_SPC_COAT_FIELDS: MeasurementFieldDef[] = [
  { key: "length",   en: "Length",   ur: "لمبائی" },
  { key: "shoulder", en: "Shoulder", ur: "کندھا" },
  { key: "neck",     en: "Neck",     ur: "گلا" },
  { key: "chest",    en: "Chest",    ur: "سینہ" },
  { key: "waist",    en: "Waist",    ur: "کمر" },
  { key: "hip",      en: "Hip",      ur: "کولہا" },
];

// ── Female – Simple Shalwar Kameez ──────────────────────────────────────────
const FEMALE_SS_SHIRT_FIELDS: MeasurementFieldDef[] = [
  { key: "length",   en: "Length",   ur: "لمبائی" },
  { key: "shoulder", en: "Shoulder", ur: "کندھا" },
  { key: "sleeves",  en: "Sleeves",  ur: "آستین" },
  { key: "neck",     en: "Neck",     ur: "گلا" },
  { key: "chest",    en: "Chest",    ur: "سینہ" },
  { key: "waist",    en: "Waist",    ur: "کمر" },
  { key: "gherra",   en: "Ghierra",  ur: "گھیرا" },
];
const FEMALE_SS_SHALWAR_FIELDS: MeasurementFieldDef[] = [
  { key: "shalwar", en: "Shalwar", ur: "شلوار" },
  { key: "pancha",  en: "Pancha",  ur: "پانچہ" },
];

// ── Female – Frock ───────────────────────────────────────────────────────────
const FEMALE_FROCK_FIELDS: MeasurementFieldDef[] = [
  { key: "length",   en: "Length",   ur: "لمبائی" },
  { key: "shoulder", en: "Shoulder", ur: "کندھا" },
  { key: "neck",     en: "Neck",     ur: "گلا" },
  { key: "chest",    en: "Chest",    ur: "سینہ" },
  { key: "waist",    en: "Waist",    ur: "کمر" },
];
const FEMALE_FROCK_TROUSER_FIELDS: MeasurementFieldDef[] = [
  { key: "trouser_length", en: "Length", ur: "لمبائی" },
  { key: "trouser_tight", en: "Tight",   ur: "تنگ" },
  { key: "trouser_waist", en: "Waist",   ur: "کمر" },
];

// ── Female – Saari ───────────────────────────────────────────────────────────
const FEMALE_SAARI_BLOUSE_FIELDS: MeasurementFieldDef[] = [
  { key: "length",   en: "Length",   ur: "لمبائی" },
  { key: "shoulder", en: "Shoulder", ur: "کندھا" },
  { key: "neck",     en: "Neck",     ur: "گلا" },
  { key: "chest",    en: "Chest",    ur: "سینہ" },
  { key: "waist",    en: "Waist",    ur: "کمر" },
  { key: "hip",      en: "Hip",      ur: "کولہا" },
  { key: "blouse",   en: "Blouse",   ur: "بلاؤز" },
];
const FEMALE_SAARI_BOTTOM_FIELDS: MeasurementFieldDef[] = [
  { key: "saari_length", en: "Saari L",          ur: "ساڑھی لمبائی" },
  { key: "saari_waist",  en: "Waist (Pati Coat) L", ur: "کمر (پٹی کوٹ) لمبائی" },
];

// ── Female – Lehnga Kurti ────────────────────────────────────────────────────
const FEMALE_LK_KURTI_FIELDS: MeasurementFieldDef[] = [
  { key: "length",   en: "Length",   ur: "لمبائی" },
  { key: "shoulder", en: "Shoulder", ur: "کندھا" },
  { key: "neck",     en: "Neck",     ur: "گلا" },
  { key: "chest",    en: "Chest",    ur: "سینہ" },
  { key: "waist",    en: "Waist",    ur: "کمر" },
  { key: "hip",      en: "Hip",      ur: "کولہا" },
];
const FEMALE_LK_LEHNGA_FIELDS: MeasurementFieldDef[] = [
  { key: "lehnga_l", en: "Lehnga L", ur: "لیہنگا لمبائی" },
  { key: "lehnga_w", en: "Lehnga W", ur: "لیہنگا چوڑائی" },
];

// Unified Measurement Field component
function NumInput({ label, urdu, value, onChange, className = "" }: any) {
  return (
    <div className={`flex flex-col justify-end ${className}`}>
      {(label || urdu) && (
        <Label className="text-[11px] font-medium flex items-center justify-between mb-1 text-muted-foreground whitespace-nowrap">
          <span>{label}</span>
          {urdu && <span dir="rtl" className="ml-1 font-semibold">{urdu}</span>}
        </Label>
      )}
      <Input
        type="number"
        min={0}
        step={0.25}
        placeholder="0"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm px-2 text-center"
      />
    </div>
  );
}

function CheckInput({ label, urdu, checked, onChange, className = "" }: any) {
  return (
    <label className={`flex flex-col items-center justify-end gap-1 cursor-pointer p-1 border rounded hover:bg-muted/50 ${checked ? 'bg-primary/5 border-primary/30' : 'bg-background'} ${className}`}>
      <div className="flex flex-col items-center leading-none mb-1 text-center">
        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{label}</span>
        {urdu && <span className="text-[10px] text-muted-foreground whitespace-nowrap" dir="rtl">{urdu}</span>}
      </div>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-muted-foreground/50"
      />
    </label>
  );
}

function WizardDialog({
  open,
  onClose,
  onSaved,
  editProfile,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editProfile: MeasurementProfile | null;
}) {
  type Gender = "male" | "female";
  type Category = string;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [category, setCategory] = useState<Category>("");
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [stylingPrefs, setStylingPrefs] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (editProfile) {
      setProfileName(editProfile.profileName);
      const gt = editProfile.garmentType;
      if (gt.startsWith("male_")) {
        setGender("male");
        setCategory(gt.replace("male_", ""));
      } else if (gt.startsWith("female_")) {
        setGender("female");
        setCategory(gt.replace("female_", ""));
      } else {
        setGender(gt === "gents" ? "male" : "female");
        setCategory(gt);
      }
      setNotes(editProfile.notes || "");
      setMeasurements(editProfile.measurements || {});
      setStylingPrefs(editProfile.stylingPrefs || {});
    } else {
      setProfileName("");
      setGender("male");
      setCategory("");
      setNotes("");
      setMeasurements({});
      setStylingPrefs({});
    }
    setStep(1);
  }, [editProfile, open]);

  const setM = (key: string, val: string) => setMeasurements((prev) => ({ ...prev, [key]: val }));
  const setS = (key: string, val: any) => setStylingPrefs((prev) => ({ ...prev, [key]: val }));

  const TOTAL_STEPS = 3;

  const handleSave = async () => {
    setSaving(true);
    try {
      const garmentType = `${gender}_${category}`;
      const url = editProfile ? `/api/measurements/${editProfile.id}` : "/api/measurements";
      const method = editProfile ? "PUT" : "POST";
      
      // Merge tailorNotes into stylingPrefs
      const finalStyling = { ...stylingPrefs, tailorNotes: notes };
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileName, garmentType, measurements, stylingPrefs: finalStyling }),
      });
      if (res.ok) { onSaved(); onClose(); }
    } finally {
      setSaving(false);
    }
  };

  const maleCategories = [
    { value: "shalwar_kameez", label: "Shalwar Kameez", desc: "Traditional shirt + shalwar" },
    { value: "prince_coat", label: "3 Piece Suit — Prince Coat", desc: "Prince coat + trousers" },
    { value: "simple_pent_coat", label: "3 Piece Suit — Simple Pent Coat", desc: "Simple pent coat + trousers" },
  ];
  const femaleCategories = [
    { value: "simple_shalwar", label: "Simple Shalwar Kameez", desc: "Traditional shirt + shalwar" },
    { value: "frock", label: "Frock", desc: "Frock + trousers" },
    { value: "saari", label: "Saari", desc: "Saari blouse + saari" },
    { value: "lehnga_kurti", label: "Lehnga Kurti", desc: "Kurti + lehnga" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50 dark:bg-slate-950">
        <DialogHeader>
          <DialogTitle>{editProfile ? "Edit" : "New"} Measurement Profile</DialogTitle>
          <div className="flex gap-1 mt-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i + 1 <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Step {step} of {TOTAL_STEPS}</p>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <Label>Profile Name *</Label>
              <Input placeholder='e.g. "My Eid Suit"' value={profileName} onChange={(e) => setProfileName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="mb-2 block">Gender *</Label>
              <div className="grid grid-cols-2 gap-3">
                {(["male", "female"] as Gender[]).map((g) => (
                  <button
                    key={g} type="button" onClick={() => { setGender(g); setCategory(""); }}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${gender === g ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-primary/40"}`}
                  >
                    <span className="text-2xl">{g === "male" ? "👨" : "👩"}</span>
                    <span className="font-medium capitalize">{g === "male" ? "Male" : "Female"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h3 className="font-medium">{gender === "male" ? "Select Garment Category" : "Select Garment Type"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(gender === "male" ? maleCategories : femaleCategories).map((cat) => (
                <button
                  key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left w-full ${category === cat.value ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40"}`}
                >
                  <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${category === cat.value ? "border-primary" : "border-muted-foreground"}`}>
                    {category === cat.value && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">{cat.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-2 border-2 border-blue-900/30 dark:border-blue-500/30 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm text-blue-950 dark:text-blue-100">
            {/* Header Area */}
            <div className="bg-blue-50 dark:bg-blue-950/40 p-4 border-b-2 border-blue-900/20 dark:border-blue-500/20 flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-900 dark:bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  EC
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight uppercase">EMAN THREADS</h2>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium tracking-widest">
                    {gender === "male" ? "MEN " : "LADIES "} 
                    {category ? category.replace(/_/g, " ").toUpperCase() : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded border border-blue-200 dark:border-blue-800">
                  <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 mr-2">Name:</span>
                  <span className="text-sm font-medium">{profileName || "________________"}</span>
                </div>
              </div>
            </div>

            {/* Main Form Body */}
            <UnifiedLayoutEngine 
              gender={gender}
              measurements={measurements as Record<string, string>}
              stylingPrefs={stylingPrefs}
              notes={notes}
              setM={setM}
              setS={setS}
              setNotes={setNotes}
              readOnly={false}
            />
          </div>
        )}
<div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : onClose()}>
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < TOTAL_STEPS ? (
            <Button onClick={() => setStep(step + 1)} disabled={(step === 1 && !profileName.trim()) || (step === 2 && !category)}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


interface TailorMeasurementRecord {
  id: string;
  status: string;
  gender: string;
  notes: string;
  requestedAt: string;
  deliveryDate: string | null;
  [key: string]: unknown;
}

function TailorMeasurementSection({ profiles }: { profiles: MeasurementProfile[] }) {
  const [record, setRecord] = useState<TailorMeasurementRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [notes, setNotes] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("none");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tailor-measurements")
      .then((r) => r.json())
      .then((d) => { setRecord(d.measurement ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleRequest = async () => {
    setRequesting(true);
    setError("");

    // Find selected profile info to send to the API
    let selectedProfileName = "";
    if (selectedProfileId !== "none") {
      const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
      if (selectedProfile) {
        selectedProfileName = `${selectedProfile.profileName} (${selectedProfile.garmentType.replace(/_/g, ' ')})`;
      }
    }

    try {
      const res = await fetch("/api/tailor-measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender,
          notes,
          selectedProfileId: selectedProfileId !== "none" ? selectedProfileId : undefined,
          selectedProfileName: selectedProfileName || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecord(data.measurement);
      } else {
        setError(data.error ?? "Request failed");
      }
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading tailor measurements...</div>;
  }

  if (!record) {
    return (
      <div className="bg-background rounded-lg border p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Tailor Measurement Request</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Submit a measurement request to our tailor. We will schedule an appointment and fill in your measurements.
        </p>
        <div className="space-y-4 max-w-sm">
          <div>
            <Label>Gender</Label>
            <Select value={gender} onValueChange={(v) => setGender(v as "Male" | "Female")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male (مرد)</SelectItem>
                <SelectItem value="Female">Female (عورت)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {profiles && profiles.length > 0 && (
            <div>
              <Label>Select Profile (Optional)</Label>
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a profile to modify" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- None --</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.profileName} <span className="text-muted-foreground ml-1 capitalize">({p.garmentType.replace(/_/g, ' ')})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Any special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button onClick={handleRequest} disabled={requesting} className="gap-2">
            <Send className="h-4 w-4" />
            {requesting ? "Submitting..." : "Submit Measurement Request"}
          </Button>
        </div>
      </div>
    );
  }

  const formData: TailorMeasurementFormData = {
    ...TAILOR_MEASUREMENT_EMPTY,
    ...(record as unknown as Partial<TailorMeasurementFormData>),
    gender: (record.gender as "Male" | "Female") ?? "Male",
    status: (record.status as "pending" | "complete") ?? "pending",
    deliveryDate: record.deliveryDate
      ? new Date(record.deliveryDate).toISOString().split("T")[0]
      : "",
  };

  // Parse profile info from notes if present (stored as [Profile: name|id] tag)
  let linkedProfileName = "";
  let displayNotes = record.notes || "";
  const profileMatch = displayNotes.match(/^\[Profile:\s*(.+?)\|(.+?)\]/);
  if (profileMatch) {
    linkedProfileName = profileMatch[1];
    displayNotes = displayNotes.replace(profileMatch[0], "").trim();
  }

  return (
    <div className="bg-background rounded-lg border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Tailor Measurement</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={
              record.status === "complete"
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-amber-100 text-amber-700 border-amber-200"
            }
          >
            {record.status === "complete" ? "✓ Measurements Recorded" : "⏳ Pending"}
          </Badge>
          {record.deliveryDate && (
            <span className="text-xs text-muted-foreground">
              Delivery: {new Date(record.deliveryDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      {record.status === "pending" ? (
        <div className="space-y-3">
          {linkedProfileName && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-sm">
                <span className="font-medium">Linked Profile:</span> {linkedProfileName}
              </span>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Your request has been submitted. Our tailor will take your measurements at the scheduled appointment and update this record.
          </p>
          {displayNotes && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 italic">
              {displayNotes}
            </p>
          )}
        </div>
      ) : (
        <>
          {linkedProfileName && (
            <div className="flex items-center gap-2 p-3 mb-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-sm">
                <span className="font-medium">Linked Profile:</span> {linkedProfileName}
              </span>
            </div>
          )}
          <TailorMeasurementEditor initialData={formData} readOnly />
        </>
      )}
    </div>
  );
}

export default function MeasurementsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [profiles, setProfiles] = useState<MeasurementProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<MeasurementProfile | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/measurements");
      if (res.ok) setProfiles(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  if (!isAuthenticated || !user) return null;

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this profile?")) return;
    await fetch(`/api/measurements/${id}`, { method: "DELETE" });
    fetchProfiles();
  };

  const handleSetDefault = async (id: string) => {
    await fetch(`/api/measurements/${id}/set-default`, { method: "POST" });
    fetchProfiles();
  };

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen bg-muted/30 pt-28 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-serif flex items-center gap-2">
                <Ruler className="h-6 w-6" /> Stitching Services
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Save your tailor measurements for faster checkout
              </p>
            </div>
            <Button onClick={() => { setEditProfile(null); setWizardOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add New Profile
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Loading...</div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <Ruler className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">No measurement profiles yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your measurements to get custom-tailored outfits
              </p>
              <Button onClick={() => { setEditProfile(null); setWizardOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Create First Profile
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {profiles.map((profile) => (
                <div key={profile.id} className="bg-background rounded-lg border p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{profile.profileName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="capitalize text-xs">
                          {profile.garmentType}
                        </Badge>
                        {profile.isDefault && (
                          <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                            Default
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {profile.notes && (
                    <p className="text-xs text-muted-foreground mb-3 italic">{profile.notes}</p>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditProfile(profile); setWizardOpen(true); }}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    {!profile.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(profile.id)}
                      >
                        <Star className="h-3 w-3 mr-1" /> Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(profile.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8">
            <TailorMeasurementSection profiles={profiles} />
          </div>
        </div>
      </main>
      <Footer />

      <WizardDialog
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={fetchProfiles}
        editProfile={editProfile}
      />
    </>
  );
}