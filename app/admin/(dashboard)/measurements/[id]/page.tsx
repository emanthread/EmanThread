"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Calendar,
  Mail,
  Phone,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TailorMeasurementEditor } from "@/components/measurements/tailor-measurement-editor";
import { MeasurementPrintSlip } from "@/components/measurements/measurement-print-slip";
import type { TailorMeasurementFormData } from "@/lib/validators/tailor-measurements";
import { TAILOR_MEASUREMENT_EMPTY } from "@/lib/validators/tailor-measurements";

interface MeasurementDetail {
  id: string;
  userId: string;
  status: string;
  gender: string;
  notes: string;
  requestedAt: string;
  updatedAt: string;
  deliveryDate: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  [key: string]: unknown;
}

export default function AdminTailorMeasurementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [measurement, setMeasurement] = useState<MeasurementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tailor-measurements/${id}`);
      if (!res.ok) {
        router.push("/admin/measurements");
        return;
      }
      const data = await res.json();
      setMeasurement(data.measurement);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (formData: TailorMeasurementFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tailor-measurements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const updated = await res.json();
        setMeasurement((prev) =>
          prev ? { ...prev, ...updated.measurement } : prev
        );
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!measurement) return null;

  const formData: TailorMeasurementFormData = {
    ...TAILOR_MEASUREMENT_EMPTY,
    ...(measurement as unknown as Partial<TailorMeasurementFormData>),
    gender: (measurement.gender as "Male" | "Female") ?? "Male",
    status: (measurement.status as "pending" | "complete") ?? "pending",
    deliveryDate: measurement.deliveryDate
      ? new Date(measurement.deliveryDate).toISOString().split("T")[0]
      : "",
  };

  const customer = {
    name: measurement.user.name,
    email: measurement.user.email,
    phone: measurement.user.phone,
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/measurements">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Edit Tailor Measurement</h1>
          <p className="text-sm text-muted-foreground">
            ID: {id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        {saved && (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 ml-auto">
            ✓ Saved
          </Badge>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Customer Info sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" /> Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-semibold">{measurement.user.name}</p>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Mail className="h-3 w-3" />
                {measurement.user.email}
              </div>
              {measurement.user.phone && (
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Phone className="h-3 w-3" />
                  {measurement.user.phone}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Calendar className="h-3 w-3" />
                Requested:{" "}
                {new Date(measurement.requestedAt).toLocaleDateString()}
              </div>
              <div>
                <Badge
                  className={
                    measurement.status === "complete"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-amber-100 text-amber-700 border-amber-200"
                  }
                >
                  {measurement.status}
                </Badge>
              </div>

              {/* Print Slip button — no preview, just the action */}
              <div className="pt-1 border-t">
                <MeasurementPrintSlip
                  data={formData}
                  customer={customer}
                  measurementId={id}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Editor — same component as customer view, just editable */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-6">
              <TailorMeasurementEditor
                initialData={formData}
                onSave={handleSave}
                saving={saving}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
