"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Printer, User, Shirt, ArrowLeft, ArrowRight, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { UnifiedMeasurementFormData } from "@/lib/validators/measurements-unified";
import {
  UNIFIED_MEASUREMENT_EMPTY,
  GARMENT_TYPES,
  garmentTypeLabel,
  GARMENT_TYPES_BY_GENDER,
} from "@/lib/validators/measurements-unified";
import { A4MeasurementForm } from "@/components/measurements/forms/A4MeasurementForm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormMode = "edit" | "readonly" | "print";

export interface UnifiedMeasurementFormProps {
  data: Partial<UnifiedMeasurementFormData>;
  mode?: FormMode;
  onChange?: (data: UnifiedMeasurementFormData) => void;
  onSave?: (data: UnifiedMeasurementFormData) => Promise<void>;
  saving?: boolean;
  garmentTypeFixed?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  measurementId?: string;
  wizard?: boolean;
  isAdmin?: boolean;
}

type Data = UnifiedMeasurementFormData;
type DataKey = keyof Data;

// ─── Main component ───────────────────────────────────────────────────────────

export function UnifiedMeasurementForm({
  data: initialData,
  mode = "edit",
  onChange,
  onSave,
  saving = false,
  garmentTypeFixed,
  customerName: initialCustomerName,
  measurementId,
  wizard = false,
  isAdmin = false,
}: UnifiedMeasurementFormProps) {
  const readOnly = mode === "readonly" || mode === "print";
  const [step, setStep] = useState(wizard ? 1 : 3);

  const [data, setData] = useState<Data>({
    ...UNIFIED_MEASUREMENT_EMPTY,
    ...initialData,
    customerName: initialCustomerName || (initialData as any)?.customerName || "",
  });

  const handleChange = useCallback(
    (next: Data) => {
      if (readOnly) return;
      setData(next);
      onChange?.(next);
    },
    [readOnly, onChange]
  );

  const setField = useCallback(
    (k: DataKey, v: string) => {
      if (readOnly) return;
      const next = { ...data, [k]: v };
      setData(next);
      onChange?.(next);
    },
    [data, readOnly, onChange]
  );

  const setGarmentType = useCallback(
    (gt: string) => {
      if (readOnly || garmentTypeFixed) return;
      const next = { ...data, garmentType: gt as Data["garmentType"] };
      setData(next);
      onChange?.(next);
    },
    [data, readOnly, garmentTypeFixed, onChange]
  );

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async () => {
    if (!onSave) return;
    await onSave(data);
  };

  const garmentTypes =
    data.gender === "Female"
      ? GARMENT_TYPES_BY_GENDER.Female
      : GARMENT_TYPES_BY_GENDER.Male;

  // ─── Step 1: Profile Name ───────────────────────────────────────────────
  if (wizard && step === 1) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <User className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Create Measurement Profile</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Give your measurement profile a name so you can easily find it later.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Profile Name</Label>
            <Input
              value={data.profileName || ""}
              onChange={(e) => setField("profileName", e.target.value)}
              placeholder="e.g. My Size, Brother's Size"
              className="h-11 text-base"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Choose a name that helps you identify this profile later
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-8">
          <Button
            onClick={() => setStep(2)}
            disabled={!data.profileName?.trim()}
            size="lg"
            className="gap-2"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── Step 2: Gender + Garment Type ──────────────────────────────────────
  if (wizard && step === 2) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <Shirt className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Select Your Garment</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Choose the gender and garment type for your measurements.
          </p>
        </div>

        <div className="space-y-6">
          {/* Gender Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Gender</Label>
            <div className="grid grid-cols-2 gap-3">
              {["Male", "Female"].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    const next: Data = {
                      ...data,
                      gender: g as Data["gender"],
                      garmentType: (g === "Male" ? "male_shalwar_kameez" : "female_simple_shalwar") as Data["garmentType"],
                    };
                    setData(next);
                    onChange?.(next);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                    data.gender === g
                      ? "border-primary bg-primary/5 text-primary font-semibold shadow-sm"
                      : "border-border hover:border-primary/50 text-muted-foreground"
                  )}
                >
                  <span className="text-lg">{g === "Male" ? "👨" : "👩"}</span>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Garment Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Garment Type</Label>
            <Select value={data.garmentType} onValueChange={setGarmentType}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {garmentTypes.map((gt) => (
                  <SelectItem key={gt} value={gt}>
                    {garmentTypeLabel(gt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between pt-8">
          <Button variant="outline" onClick={() => setStep(1)} size="lg" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={() => setStep(3)} size="lg" className="gap-2">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── Step 3: Measurements (A4 Form) ─────────────────────────────────────
  return (
    <div className="space-y-6">
      {wizard && (
        <div className="flex items-center gap-2 -mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(2)}
            className="h-8 text-xs gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Garment Type
          </Button>
        </div>
      )}

      {/* ── Top Meta ── */}
      <div className="bg-card rounded-xl border p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Profile
            </Label>
            <Input
              value={data.profileName || ""}
              onChange={(e) => setField("profileName", e.target.value)}
              disabled={readOnly || wizard}
              className="h-9 text-sm font-medium"
              placeholder="Profile Name"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Gender
            </Label>
            <Select
              value={data.gender}
              onValueChange={(v) => setField("gender", v)}
              disabled={readOnly || wizard}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={cn("space-y-1.5", !isAdmin && "sm:col-span-2")}>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Garment Type
            </Label>
            <Select
              value={data.garmentType}
              onValueChange={setGarmentType}
              disabled={readOnly || !!garmentTypeFixed || wizard}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GARMENT_TYPES.map((gt) => (
                  <SelectItem key={gt} value={gt}>
                    {garmentTypeLabel(gt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Status
            </Label>
            <Badge
              className={cn(
                "h-9 px-3 text-sm capitalize font-medium inline-flex items-center",
                data.status === "complete"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
              )}
            >
              {data.status}
            </Badge>
          </div>

          {isAdmin && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Delivery Date
              </Label>
              <Input
                type="date"
                value={data.deliveryDate || ""}
                onChange={(e) => setField("deliveryDate", e.target.value)}
                disabled={readOnly}
                className="h-9 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── A4 Measurement Form ── */}
      <div className="bg-muted/30 rounded-xl border overflow-hidden">
        <A4MeasurementForm
          data={data}
          onChange={handleChange}
          readOnly={readOnly}
          garmentType={data.garmentType}
        />
      </div>

      {/* ── Notes ── */}
      <div className="bg-card rounded-xl border p-4 sm:p-6 space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Notes / Special Instructions
        </Label>
        {readOnly ? (
          <p className="text-sm bg-muted/20 rounded-lg p-3 italic">
            {data.notes || "No notes provided."}
          </p>
        ) : (
          <Textarea
            value={data.notes}
            onChange={(e) => setField("notes", e.target.value)}
            rows={2}
            placeholder="e.g. Stitching details, fitting preferences..."
            className="text-sm resize-none"
          />
        )}
      </div>

      {/* ── Actions ── */}
      <div className="flex justify-end items-center">
        {mode === "edit" && onSave && (
          <Button onClick={handleSubmit} disabled={saving} size="lg" className="gap-2">
            {saving ? (
              "Saving..."
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Measurements
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}