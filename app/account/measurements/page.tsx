"use client";

import { useState, useEffect, useCallback } from "react";
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

function MeasurementField({
  field,
  value,
  onChange,
}: {
  field: MeasurementFieldDef;
  value: string;
  onChange: (key: string, val: string) => void;
}) {
  const parts = value.split(" ");
  const whole = parts[0] || "";
  const frac = parts[1] || "";

  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">
        <span>{field.en}</span>
        <span className="text-muted-foreground text-sm ml-1.5 font-semibold" dir="rtl" style={{ fontFamily: '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif', fontSize: '14px' }}>
          {field.ur}
        </span>
      </Label>
      <div className="flex gap-1">
        <Input
          type="number"
          min={0}
          step={1}
          placeholder="0"
          value={whole}
          onChange={(e) => onChange(field.key, [e.target.value, frac].join(" ").trim())}
          className="w-20 h-8 text-sm"
        />
        <Select
          value={frac || "__none__"}
          onValueChange={(v) =>
            onChange(field.key, [whole, v === "__none__" ? "" : v].join(" ").trim())
          }
        >
          <SelectTrigger className="w-20 h-8 text-xs">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {FRACTIONS.filter(Boolean).map((f) => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
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
  type Category =
    | "shalwar_kameez"
    | "prince_coat"
    | "simple_pent_coat"
    | "simple_shalwar"
    | "frock"
    | "saari"
    | "lehnga_kurti"
    | "";

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [category, setCategory] = useState<Category>("");
  const [includeShirt, setIncludeShirt] = useState(false);
  const [notes, setNotes] = useState("");
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [pockets, setPockets] = useState({ front: "", side: "", shalwar: "" });

  useEffect(() => {
    if (editProfile) {
      setProfileName(editProfile.profileName);
      const gt = editProfile.garmentType;
      if (gt.startsWith("male_")) {
        setGender("male");
        setCategory(gt.replace("male_", "") as Category);
      } else if (gt.startsWith("female_")) {
        setGender("female");
        setCategory(gt.replace("female_", "") as Category);
      } else {
        setGender(gt === "gents" ? "male" : "female");
        setCategory("");
      }
      setNotes(editProfile.notes || "");
      setMeasurements((editProfile.measurements as Record<string, string>) || {});
      const sp = (editProfile.stylingPrefs as Record<string, unknown>) || {};
      setPockets({
        front: (sp.frontpocket as string) || "",
        side: (sp.sidepocket as string) || "",
        shalwar: (sp.shalwarpocket as string) || "",
      });
      setIncludeShirt(!!(sp.includeShirt));
    } else {
      setProfileName("");
      setGender("male");
      setCategory("");
      setNotes("");
      setMeasurements({});
      setPockets({ front: "", side: "", shalwar: "" });
      setIncludeShirt(false);
    }
    setStep(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editProfile, open]);

  const setM = (key: string, val: string) =>
    setMeasurements((prev) => ({ ...prev, [key]: val }));

  const hasPockets = !(gender === "female" && ["frock", "saari", "lehnga_kurti"].includes(category));
  const TOTAL_STEPS = hasPockets ? 4 : 3;

  const handleSave = async () => {
    setSaving(true);
    try {
      const garmentType = `${gender}_${category}`;
      const shouldIncludePockets = !(gender === "female" && ["frock", "saari", "lehnga_kurti"].includes(category));
      const stylingPrefs: Record<string, unknown> = { includeShirt };
      if (shouldIncludePockets) {
        stylingPrefs.frontpocket = pockets.front;
        stylingPrefs.sidepocket = pockets.side;
        stylingPrefs.shalwarpocket = pockets.shalwar;
      }
      const url = editProfile ? `/api/measurements/${editProfile.id}` : "/api/measurements";
      const method = editProfile ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileName, garmentType, measurements, stylingPrefs, notes }),
      });
      if (res.ok) { onSaved(); onClose(); }
    } finally {
      setSaving(false);
    }
  };

  const maleCategories = [
    { value: "shalwar_kameez", label: "Shalwar Kameez", desc: "Traditional shirt + shalwar" },
    {
      value: "prince_coat",
      label: "3 Piece Suit — Prince Coat",
      desc: "Prince coat (Bane, Single, Choras, Straight Ghierra) + trousers",
    },
    {
      value: "simple_pent_coat",
      label: "3 Piece Suit — Simple Pent Coat",
      desc: "Simple pent coat (Collar, Hip) + trousers",
    },
  ];
  const femaleCategories = [
    { value: "simple_shalwar", label: "Simple Shalwar Kameez", desc: "Traditional shirt + shalwar" },
    { value: "frock", label: "Frock", desc: "Frock + trousers" },
    { value: "saari", label: "Saari", desc: "Saari blouse + saari" },
    { value: "lehnga_kurti", label: "Lehnga Kurti", desc: "Kurti + lehnga" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editProfile ? "Edit" : "New"} Measurement Profile</DialogTitle>
          <div className="flex gap-1 mt-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i + 1 <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Step {step} of {TOTAL_STEPS}</p>
        </DialogHeader>

        {/* ── STEP 1: Profile name + gender ─────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <Label>Profile Name *</Label>
              <Input
                placeholder='e.g. "My Eid Suit"'
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="mb-2 block">Gender *</Label>
              <div className="grid grid-cols-2 gap-3">
                {(["male", "female"] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => { setGender(g); setCategory(""); }}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                      gender === g ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-primary/40"
                    }`}
                  >
                    <span className="text-2xl">{g === "male" ? "👨" : "👩"}</span>
                    <span className="font-medium capitalize">{g === "male" ? "Male" : "Female"}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Special tailoring instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* ── STEP 2: Category selection ─────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-3">
            <h3 className="font-medium">{gender === "male" ? "Select Garment Category" : "Select Garment Type"}</h3>
            <div className="grid gap-3">
              {(gender === "male" ? maleCategories : femaleCategories).map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value as Category)}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left w-full ${
                    category === cat.value ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40"
                  }`}
                >
                  <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    category === cat.value ? "border-primary" : "border-muted-foreground"
                  }`}>
                    {category === cat.value && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">{cat.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {gender === "male" && category === "prince_coat" && (
              <label className="flex items-center gap-2 cursor-pointer mt-2 p-3 bg-muted/40 rounded-lg">
                <input
                  type="checkbox"
                  checked={includeShirt}
                  onChange={(e) => setIncludeShirt(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-medium">Also include Shirt measurements</span>
              </label>
            )}
            {gender === "male" && category === "simple_pent_coat" && (
              <label className="flex items-center gap-2 cursor-pointer mt-2 p-3 bg-muted/40 rounded-lg">
                <input
                  type="checkbox"
                  checked={includeShirt}
                  onChange={(e) => setIncludeShirt(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-medium">Also include Shirt measurements</span>
              </label>
            )}
          </div>
        )}

        {/* ── STEP 3: Main measurements ──────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Male – Shalwar Kameez */}
            {gender === "male" && category === "shalwar_kameez" && (<>
              <div>
                <h3 className="font-medium mb-3">Shirt Measurements</h3>
                <div className="grid grid-cols-2 gap-3">
                  {MALE_SK_SHIRT_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-3">Shalwar</h3>
                <div className="grid grid-cols-2 gap-3">
                  {MALE_SK_SHALWAR_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                </div>
              </div>
            </>)}
            {/* Male – 3 Piece Suit: Prince Coat */}
            {gender === "male" && category === "prince_coat" && (<>
              <div>
                <h3 className="font-medium mb-3">Prince Coat Measurements</h3>
                <p className="text-xs text-muted-foreground mb-3">Bane: Selected · Single: Selected · Ghierra: Straight · Choras: 1</p>
                <div className="grid grid-cols-2 gap-3">
                  {MALE_PC_COAT_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-3">Trousers / Pent</h3>
                <div className="grid grid-cols-2 gap-3">
                  {MALE_PC_TROUSER_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                </div>
              </div>
              {includeShirt && (
                <div>
                  <h3 className="font-medium mb-3">Shirt Measurements</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {MALE_PC_SHIRT_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                  </div>
                </div>
              )}
            </>)}
            {/* Male – 3 Piece Suit: Simple Pent Coat */}
            {gender === "male" && category === "simple_pent_coat" && (<>
              <div>
                <h3 className="font-medium mb-3">Simple Pent Coat Measurements</h3>
                <p className="text-xs text-muted-foreground mb-3">Collar: Selected</p>
                <div className="grid grid-cols-2 gap-3">
                  {MALE_SPC_COAT_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-3">Trousers / Pent</h3>
                <div className="grid grid-cols-2 gap-3">
                  {MALE_PC_TROUSER_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                </div>
              </div>
              {includeShirt && (
                <div>
                  <h3 className="font-medium mb-3">Shirt Measurements</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {MALE_PC_SHIRT_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                  </div>
                </div>
              )}
            </>)}
            {/* Female – Simple Shalwar */}
            {gender === "female" && category === "simple_shalwar" && (<>
              <div>
                <h3 className="font-medium mb-3">Shirt Measurements</h3>
                <div className="grid grid-cols-2 gap-3">
                  {FEMALE_SS_SHIRT_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-3">Shalwar</h3>
                <div className="grid grid-cols-2 gap-3">
                  {FEMALE_SS_SHALWAR_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                </div>
              </div>
            </>)}
            {/* Female – Frock */}
            {gender === "female" && category === "frock" && (<>
              <div>
                <h3 className="font-medium mb-3">Frock Measurements</h3>
                <div className="grid grid-cols-2 gap-3">
                  {FEMALE_FROCK_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-3">Trousers</h3>
                <div className="grid grid-cols-2 gap-3">
                  {FEMALE_FROCK_TROUSER_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                </div>
              </div>
            </>)}
            {/* Female – Saari */}
            {gender === "female" && category === "saari" && (<>
              <div>
                <h3 className="font-medium mb-3">Saari Blouse Measurements</h3>
                <div className="grid grid-cols-2 gap-3">
                  {FEMALE_SAARI_BLOUSE_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-3">Saari</h3>
                <div className="grid grid-cols-2 gap-3">
                  {FEMALE_SAARI_BOTTOM_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                </div>
              </div>
            </>)}
            {/* Female – Lehnga Kurti */}
            {gender === "female" && category === "lehnga_kurti" && (<>
              <div>
                <h3 className="font-medium mb-3">Kurti Measurements</h3>
                <div className="grid grid-cols-2 gap-3">
                  {FEMALE_LK_KURTI_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-3">Lehnga</h3>
                <div className="grid grid-cols-2 gap-3">
                  {FEMALE_LK_LEHNGA_FIELDS.map((field) => <MeasurementField key={field.key} field={field} value={measurements[field.key] || ""} onChange={setM} />)}
                </div>
              </div>
            </>)}
          </div>
        )}

        {/* ── STEP 4: Pockets ───────────────────────────────────────────── */}
        {step === 4 && hasPockets && (
          <div className="space-y-4">
            <h3 className="font-medium mb-3">Pocket Details</h3>
            <div className="grid grid-cols-3 gap-3">
              {([["front", "Front Pocket"], ["side", "Side Pocket"], ["shalwar", "Shalwar Pocket"]] as [keyof typeof pockets, string][]).map(([key, label]) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={pockets[key]}
                    onChange={(e) => setPockets((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="mt-1 h-8"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : onClose()}>
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < TOTAL_STEPS ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !profileName.trim()) || (step === 2 && !category)}
            >
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