"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TailorMeasurementFormData } from "@/lib/validators/tailor-measurements";
import { TAILOR_MEASUREMENT_EMPTY } from "@/lib/validators/tailor-measurements";

type FormData = TailorMeasurementFormData;
type Key = keyof FormData;

const FRACTIONS = ["", "1/2", "1/4", "1/8"] as const;

function MRow({
  label,
  urdu,
  k1,
  k2,
  data,
  onChange,
  readOnly,
}: {
  label: string;
  urdu?: string;
  k1: Key;
  k2: Key;
  data: FormData;
  onChange: (k: Key, v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-1 py-1 border-b border-border/40">
      <div className="col-span-5 text-xs font-medium leading-tight">
        {urdu && <span className="text-muted-foreground text-[10px] block">{urdu}</span>}
        {label}
      </div>
      <div className="col-span-4">
        <Input
          type="number"
          min={0}
          step={1}
          value={data[k1] as string}
          onChange={(e) => onChange(k1, e.target.value)}
          disabled={readOnly}
          className="h-7 text-xs"
          placeholder="0"
        />
      </div>
      <div className="col-span-3">
        <Select
          value={(data[k2] as string) || "__none__"}
          onValueChange={(v) => onChange(k2, v === "__none__" ? "" : v)}
          disabled={readOnly}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {FRACTIONS.filter(Boolean).map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function CbRow({
  label,
  k,
  data,
  onChange,
  readOnly,
}: {
  label: string;
  k: Key;
  data: FormData;
  onChange: (k: Key, v: string) => void;
  readOnly?: boolean;
}) {
  const checked = data[k] === "1";
  return (
    <label
      className={cn(
        "flex items-center gap-2 cursor-pointer text-xs py-0.5",
        readOnly && "cursor-default"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(k, e.target.checked ? "1" : "0")}
        disabled={readOnly}
        className="h-3.5 w-3.5 rounded"
      />
      {label}
    </label>
  );
}

interface TailorMeasurementEditorProps {
  initialData?: Partial<FormData>;
  readOnly?: boolean;
  onSave?: (data: FormData) => Promise<void>;
  saving?: boolean;
}

export function TailorMeasurementEditor({
  initialData,
  readOnly = false,
  onSave,
  saving = false,
}: TailorMeasurementEditorProps) {
  const [data, setData] = useState<FormData>({
    ...TAILOR_MEASUREMENT_EMPTY,
    ...initialData,
  });

  const set = (k: Key, v: string) => {
    if (readOnly) return;
    setData((prev) => ({ ...prev, [k]: v }));
  };

  const isMale = data.gender !== "Female";

  const handleSubmit = async () => {
    if (!onSave) return;
    await onSave(data);
  };

  return (
    <div className="space-y-6">
      {/* Top Meta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Gender</Label>
          <Select
            value={data.gender}
            onValueChange={(v) => set("gender", v)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male (مرد)</SelectItem>
              <SelectItem value="Female">Female (عورت)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Badge
            className={cn(
              "mt-1 capitalize",
              data.status === "complete"
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-amber-100 text-amber-700 border-amber-200"
            )}
          >
            {data.status}
          </Badge>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Delivery Date</Label>
          <Input
            type="date"
            value={data.deliveryDate || ""}
            onChange={(e) => set("deliveryDate", e.target.value)}
            disabled={readOnly}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Two column: Kameez | Shalwar */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Kameez Section */}
        <div>
          <h3 className="font-semibold text-sm mb-2 pb-1 border-b-2">
            {isMale ? "کمیز / Kameez" : "شرٹ / Shirt"}
          </h3>
          <div className="text-[10px] text-muted-foreground grid grid-cols-12 mb-1">
            <span className="col-span-5">Field</span>
            <span className="col-span-4">Value</span>
            <span className="col-span-3">Fraction</span>
          </div>
          <MRow label="Length" urdu="لمبائی" k1="length1" k2="length2" data={data} onChange={set} readOnly={readOnly} />
          <MRow label="Shoulder" urdu="کندھا" k1="shoulder1" k2="shoulder2" data={data} onChange={set} readOnly={readOnly} />
          <MRow label="Chest" urdu="سینہ" k1="chest1" k2="chest2" data={data} onChange={set} readOnly={readOnly} />
          <MRow label="Waist" urdu="کمر" k1="waist1" k2="waist2" data={data} onChange={set} readOnly={readOnly} />
          <MRow label="Gherra" urdu="گھیرا" k1="gherra1" k2="gherra2" data={data} onChange={set} readOnly={readOnly} />
          <MRow label="Neck" urdu="گلا" k1="neck1" k2="neck2" data={data} onChange={set} readOnly={readOnly} />
          <MRow label="Sleeves" urdu="آستین" k1="sleeves1" k2="sleeves2" data={data} onChange={set} readOnly={readOnly} />
          <MRow label="Golai" urdu="گولائی" k1="golai1" k2="golai2" data={data} onChange={set} readOnly={readOnly} />
          <MRow label="Cuff" urdu="کف" k1="armcuff1" k2="armcuff2" data={data} onChange={set} readOnly={readOnly} />
          <MRow label="Plate" urdu="پلیٹ" k1="armplate1" k2="armplate2" data={data} onChange={set} readOnly={readOnly} />
          <MRow label="Gol Bazoo" urdu="گول بازو" k1="golbazoo1" k2="golbazoo2" data={data} onChange={set} readOnly={readOnly} />
          <MRow label="Patti" urdu="پٹی" k1="armpatti1" k2="armpatti2" data={data} onChange={set} readOnly={readOnly} />
          <MRow label="Collar Nok" urdu="کالر نوک" k1="collarnok1" k2="collarnok2" data={data} onChange={set} readOnly={readOnly} />
          <MRow label="Bane" urdu="بنے" k1="bane1" k2="bane2" data={data} onChange={set} readOnly={readOnly} />

          {/* Ladies extras */}
          {!isMale && (
            <>
              <MRow label="Golai (Ladies)" k1="ladGolai1" k2="ladGolai2" data={data} onChange={set} readOnly={readOnly} />
              <MRow label="Mori" urdu="موری" k1="ladMori1" k2="ladMori2" data={data} onChange={set} readOnly={readOnly} />
              <MRow label="Bell Bazoo" urdu="بیل بازو" k1="ladBellbazoo1" k2="ladBellbazoo2" data={data} onChange={set} readOnly={readOnly} />
              <MRow label="Chaak" urdu="چاک" k1="ladChaak1" k2="ladChaak2" data={data} onChange={set} readOnly={readOnly} />
              <MRow label="Hip" urdu="ہپ" k1="ladHip1" k2="ladHip2" data={data} onChange={set} readOnly={readOnly} />
            </>
          )}

          {/* Style flags */}
          <div className="mt-3 p-2 bg-muted/30 rounded-md">
            <p className="text-xs font-medium mb-1">Style / قسم</p>
            <div className="flex flex-wrap gap-3">
              <CbRow label="Single" k="singleCb" data={data} onChange={set} readOnly={readOnly} />
              <CbRow label="Double" k="doubleCb" data={data} onChange={set} readOnly={readOnly} />
              <CbRow label="Gol" k="golCb" data={data} onChange={set} readOnly={readOnly} />
              <CbRow label="Choras" k="chorasCb" data={data} onChange={set} readOnly={readOnly} />
              <CbRow label="Bane" k="baneCb" data={data} onChange={set} readOnly={readOnly} />
              <CbRow label="Collar" k="collarCb" data={data} onChange={set} readOnly={readOnly} />
              <CbRow label="Round Neck" k="roundneck" data={data} onChange={set} readOnly={readOnly} />
            </div>
          </div>
        </div>

        {/* Shalwar + Trouser Section */}
        <div className="space-y-6">
          {/* Shalwar */}
          <div>
            <h3 className="font-semibold text-sm mb-2 pb-1 border-b-2">شلوار / Shalwar</h3>
            <MRow label="Length" urdu="لمبائی" k1="shalwar1" k2="shalwar2" data={data} onChange={set} readOnly={readOnly} />
            <MRow label="Gherra" urdu="گھیرا" k1="shalwarGherra1" k2="shalwarGherra2" data={data} onChange={set} readOnly={readOnly} />
            <MRow label="Assan" urdu="اسن" k1="shalwarAssan1" k2="shalwarAssan2" data={data} onChange={set} readOnly={readOnly} />
            <MRow label="Pancha" urdu="پنچہ" k1="shalwarPancha1" k2="shalwarPancha2" data={data} onChange={set} readOnly={readOnly} />

            {/* Ladies shalwar extras */}
            {!isMale && (
              <>
                <MRow label="Simple Shalwar" k1="ladSimpleShalwar1" k2="ladSimpleShalwar2" data={data} onChange={set} readOnly={readOnly} />
                <MRow label="Simple Pancha" k1="ladSimpleShalwarPancha1" k2="ladSimpleShalwarPancha2" data={data} onChange={set} readOnly={readOnly} />
                <MRow label="Simple Gherra" k1="ladSimpleShalwarGherra1" k2="ladSimpleShalwarGherra2" data={data} onChange={set} readOnly={readOnly} />
                <div className="grid grid-cols-12 items-center gap-1 py-1 border-b border-border/40">
                  <div className="col-span-5 text-xs font-medium">Lastic Simple</div>
                  <div className="col-span-7">
                    <Input value={data.ladLasticSimpleShalwar} onChange={(e) => set("ladLasticSimpleShalwar", e.target.value)} disabled={readOnly} className="h-7 text-xs" />
                  </div>
                </div>
                <MRow label="Belt Shalwar" k1="ladShalwarBelt1" k2="ladShalwarBelt2" data={data} onChange={set} readOnly={readOnly} />
                <MRow label="Belt Pancha" k1="ladShalwarBeltPancha1" k2="ladShalwarBeltPancha2" data={data} onChange={set} readOnly={readOnly} />
                <MRow label="Belt Gherra" k1="ladShalwarBeltGherra1" k2="ladShalwarBeltGherra2" data={data} onChange={set} readOnly={readOnly} />
                <div className="grid grid-cols-12 items-center gap-1 py-1 border-b border-border/40">
                  <div className="col-span-5 text-xs font-medium">Lastic Belt</div>
                  <div className="col-span-7">
                    <Input value={data.ladLasticShalwarBelt} onChange={(e) => set("ladLasticShalwarBelt", e.target.value)} disabled={readOnly} className="h-7 text-xs" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Trouser — gents only */}
          {isMale && (
            <div>
              <h3 className="font-semibold text-sm mb-2 pb-1 border-b-2">ٹراؤزر / Trouser</h3>
              <MRow label="Length" k1="trouserdata1" k2="trouserdata2" data={data} onChange={set} readOnly={readOnly} />
              <MRow label="Gherra" k1="trouserdata3" k2="trouserdata4" data={data} onChange={set} readOnly={readOnly} />
              <MRow label="Assan" k1="trouserdata5" k2="trouserdata6" data={data} onChange={set} readOnly={readOnly} />
              <MRow label="Side" k1="trouserdata7" k2="trouserdata8" data={data} onChange={set} readOnly={readOnly} />
              <MRow label="Front" k1="trouserdata9" k2="trouserdata10" data={data} onChange={set} readOnly={readOnly} />
              <MRow label="Pancha" k1="trouserdata11" k2="trouserdata12" data={data} onChange={set} readOnly={readOnly} />
              <div className="grid grid-cols-12 items-center gap-1 py-1">
                <div className="col-span-5 text-xs font-medium">Other</div>
                <div className="col-span-7">
                  <Input value={data.trouserdata13} onChange={(e) => set("trouserdata13", e.target.value)} disabled={readOnly} className="h-7 text-xs" />
                </div>
              </div>
            </div>
          )}

          {/* Pockets */}
          <div>
            <h3 className="font-semibold text-sm mb-2 pb-1 border-b-2">Pockets / جیب</h3>
            <div className="space-y-2">
              {(
                [
                  ["frontPocket", "Front Pocket"],
                  ["sidePocket", "Side Pocket"],
                  ["shalwarPocket", "Shalwar Pocket"],
                ] as [Key, string][]
              ).map(([k, lbl]) => (
                <div key={k} className="flex items-center gap-2">
                  <Label className="text-xs w-28 shrink-0">{lbl}</Label>
                  <Input
                    value={data[k] as string}
                    onChange={(e) => set(k, e.target.value)}
                    disabled={readOnly}
                    className="h-7 text-xs flex-1"
                    placeholder="e.g. 2"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label className="text-xs">Notes / نوٹ</Label>
        <Textarea
          value={data.notes}
          onChange={(e) => set("notes", e.target.value)}
          disabled={readOnly}
          rows={2}
          placeholder="Special instructions..."
          className="text-sm"
        />
      </div>

      {/* Save */}
      {!readOnly && onSave && (
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save Measurements"}
          </Button>
        </div>
      )}
    </div>
  );
}
