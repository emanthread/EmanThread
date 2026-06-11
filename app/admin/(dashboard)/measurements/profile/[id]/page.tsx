"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Calendar,
  Mail,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { UnifiedMeasurementForm } from "@/components/measurements/UnifiedMeasurementForm";
import { TailorPrintCard, type TailorCardData } from "@/components/admin/tailor-print-card";
import { getStatusBadgeClass } from "@/lib/utils/status";
import type { UnifiedMeasurementFormData } from "@/lib/validators/measurements-unified";
import { garmentTypeLabel, mapFromPrismaFields } from "@/lib/validators/measurements-unified";

interface MeasurementProfileDetail {
  id: string;
  userId: string;
  profileName: string;
  gender: string;
  garmentType: string;
  notes: string | null;
  status?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  [key: string]: unknown;
}

export default function AdminMeasurementProfileEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<MeasurementProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/measurements/${id}`);
      if (!res.ok) {
        router.push("/admin/measurements");
        return;
      }
      const data = await res.json();
      setProfile(data);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (formData: UnifiedMeasurementFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/measurements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile((prev) =>
          prev ? { ...prev, ...updated } : prev
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

  if (!profile) return null;

  const mappedFormData = mapFromPrismaFields(profile as Record<string, unknown>);
  const formData: UnifiedMeasurementFormData = {
    ...mappedFormData,
    gender: (profile.gender as "Male" | "Female") ?? "Male",
  };

  const customer = {
    name: profile.user.name,
    email: profile.user.email,
  };

  const mappedPrint = mapFromPrismaFields(profile as Record<string, unknown>);
  const printMetaKeys = new Set([
    "gender", "garmentType", "deliveryDate", "notes", "status",
    "source", "profileName", "isDefault", "customerName", "serialNumber",
  ]);
  const flatMeasurements: Record<string, string> = {};
  for (const [key, val] of Object.entries(mappedPrint)) {
    if (!printMetaKeys.has(key) && typeof val === "string" && val !== "") {
      flatMeasurements[key] = val;
    }
  }

  const garmentLabel = garmentTypeLabel(profile.garmentType || "") || profile.gender;
  const serialNo = `MP-${profile.id.slice(0, 6).toUpperCase()}`;
  const printDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString()
    : new Date().toLocaleDateString();

  const printCardData: TailorCardData = {
    serialNo,
    customerName: customer.name,
    deliveryDate: printDate,
    productName: profile.profileName || garmentLabel,
    garmentType: profile.garmentType,
    gender: profile.gender,
    measurements: flatMeasurements,
    stylingPrefs: null,
    notes: profile.notes || undefined,
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
          <h1 className="text-xl font-semibold">Edit Measurement Profile</h1>
          <p className="text-sm text-muted-foreground">
            {profile.profileName} · {garmentLabel}
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
              <p className="font-semibold">{profile.user.name}</p>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Mail className="h-3 w-3" />
                {profile.user.email}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Calendar className="h-3 w-3" />
                Created:{" "}
                {new Date(profile.createdAt).toLocaleDateString()}
              </div>
              <div>
                <Badge className={getStatusBadgeClass(profile.status ?? "complete")}>
                  {profile.status || "complete"}
                </Badge>
              </div>
              <div className="pt-1 border-t">
                <span className="text-xs text-muted-foreground">Garment:</span>
                <p className="text-sm font-medium mt-0.5 capitalize">
                  {garmentLabel}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Editor + Print Preview via Tabs */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="edit">
                <TabsList className="mb-4">
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                  <TabsTrigger value="print">Print Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="edit">
                  <UnifiedMeasurementForm
                    data={formData}
                    mode="edit"
                    garmentTypeFixed={profile.garmentType}
                    customerName={customer.name}
                    customerEmail={customer.email}
                    measurementId={profile.id}
                    onSave={handleSave}
                    saving={saving}
                    isAdmin={true}
                  />
                </TabsContent>
                <TabsContent value="print">
                  <p className="text-xs text-muted-foreground mb-3">
                    Print a clean A4 measurement sheet for the tailor. Serial No and Date are auto-generated.
                  </p>
                  <TailorPrintCard data={printCardData} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
