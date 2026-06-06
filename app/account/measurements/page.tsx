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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/data";
import { UnifiedMeasurementForm } from "@/components/measurements/UnifiedMeasurementForm";
import type { UnifiedMeasurementFormData } from "@/lib/validators/measurements-unified";
import {
  UNIFIED_MEASUREMENT_EMPTY,
  GARMENT_TYPES,
  garmentTypeLabel,
} from "@/lib/validators/measurements-unified";

import { Textarea } from "@/components/ui/textarea";
import {
  Ruler,
  Plus,
  ClipboardCheck,
  Send,
  Eye,
  AlertTriangle,
} from "lucide-react";

interface StitchingPrices {
  [fabric: string]: number;
}

// ─── Unified Measurement Request Section ──────────────────────────────────────

interface TailorRecord {
  id: string;
  status: string;
  gender: string;
  garmentType: string;
  notes: string;
  deliveryDate: string | null;
  requestedAt: string;
  [key: string]: unknown;
}

function UnifiedTailorSection() {
  const [record, setRecord] = useState<TailorRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);

  const fetchRecord = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tailor-measurements");
      if (res.ok) {
        const data = await res.json();
        setRecord(data.measurement ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecord(); }, [fetchRecord]);

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
        <Button onClick={() => setRequestOpen(true)} className="gap-2">
          <Send className="h-4 w-4" />
          Submit Measurement Request
        </Button>

        <Dialog open={requestOpen} onOpenChange={(o) => !o && setRequestOpen(false)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Tailor Measurement Request</DialogTitle>
              <DialogDescription>
                Select your garment type and submit. Our tailor will take your measurements.
              </DialogDescription>
            </DialogHeader>
            <NewTailorRequestForm
              onSaved={() => { setRequestOpen(false); fetchRecord(); }}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Parse profile info from notes if present
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
        <div>
          {linkedProfileName && (
            <div className="flex items-center gap-2 p-3 mb-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-sm">
                <span className="font-medium">Linked Profile:</span> {linkedProfileName}
              </span>
            </div>
          )}
          <UnifiedMeasurementForm
            data={record as unknown as Partial<UnifiedMeasurementFormData>}
            mode="readonly"
          />
        </div>
      )}
    </div>
  );
}

// ─── New Tailor Request Form ──────────────────────────────────────────────────

function NewTailorRequestForm({ onSaved }: { onSaved: () => void }) {
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [garmentType, setGarmentType] = useState("male_shalwar_kameez");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tailor-measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender, garmentType, notes }),
      });
      const data = await res.json();
      if (res.ok) {
        onSaved();
      } else {
        setError(data.error ?? "Request failed");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div>
        <Label>Gender</Label>
        <Select
          value={gender}
          onValueChange={(v) => {
            setGender(v as "Male" | "Female");
            // Auto-select garment type
            if (v === "Male" && !garmentType.startsWith("male_")) setGarmentType("male_shalwar_kameez");
            if (v === "Female" && !garmentType.startsWith("female_")) setGarmentType("female_simple_shalwar");
          }}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Male">Male (مرد)</SelectItem>
            <SelectItem value="Female">Female (عورت)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Garment Type</Label>
        <Select value={garmentType} onValueChange={setGarmentType}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GARMENT_TYPES.filter((gt) => {
              if (gender === "Male") return gt.startsWith("male_");
              return gt.startsWith("female_");
            }).map((gt) => (
              <SelectItem key={gt} value={gt}>
                {garmentTypeLabel(gt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      <Button onClick={handleSubmit} disabled={saving} className="gap-2">
        <Send className="h-4 w-4" />
        {saving ? "Submitting..." : "Submit Request"}
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MeasurementsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stitchingPrices, setStitchingPrices] = useState<StitchingPrices>({});

  const fetchStitchingPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/stitching-prices");
      if (res.ok) setStitchingPrices(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStitchingPrices();
    }
  }, [isAuthenticated, fetchStitchingPrices]);

  if (!isAuthenticated || !user) return null;

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
                Submit tailor requests and manage your measurements
              </p>
            </div>
          </div>

          {/* ── Stitching Prices ── */}
          <div className="mb-8 bg-background rounded-lg border p-6 shadow-sm">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="text-primary">✂️</span> Stitching Prices by Category
            </h2>
            {Object.keys(stitchingPrices).length === 0 ? (
              <div className="text-sm text-muted-foreground">Loading prices...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(stitchingPrices).map(([fabric, price]) => (
                  <div key={fabric} className="p-3 bg-muted/30 border rounded-md flex flex-col justify-center items-center text-center">
                    <span className="text-sm font-medium capitalize mb-1">{fabric}</span>
                    <span className="text-primary font-bold">{formatPrice(price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Unified Tailor Measurement Section ── */}
          <div className="mb-8">
            <UnifiedTailorSection />
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
