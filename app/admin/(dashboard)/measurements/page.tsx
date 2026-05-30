"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Trash2,
  Pencil,
  Ruler,
  ExternalLink,
  Printer,
  CheckCircle2,
  Eye,
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminProfile {
  id: string;
  profileName: string;
  garmentType: string;
  measurements: Record<string, string>;
  stylingPrefs: Record<string, unknown> | null;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
  user: { name: string; email: string };
}

interface TailorMeasurement {
  id: string;
  gender: string;
  status: string;
  notes: string;
  requestedAt: string;
  updatedAt: string;
  deliveryDate: string | null;
  user: { id: string; name: string; email: string; phone?: string | null };
  _cleanNotes?: string;
}

// ─── Profile system edit dialog ───────────────────────────────────────────────

const FRACTIONS = ["1/2", "1/4", "1/8"];
const ALL_GENTS_FIELDS: [string, string][] = [
  ["length", "Length"], ["shoulder", "Shoulder"], ["sleeves", "Sleeves"],
  ["golai", "Golai"], ["caff", "Caff"], ["plate", "Caff Plate"],
  ["golbazoo", "Gol Bazoo"], ["neck", "Neck"], ["chest", "Chest"],
  ["collarnok", "Collar Nok"], ["bane", "Bane"], ["patti", "Patti"],
  ["waist", "Waist"], ["gherra", "Gherra"], ["shalwar", "Shalwar"],
  ["shalwargherra", "Shalwar Gherra"], ["shalwarassan", "Shalwar Assan"],
  ["shalwarpancha", "Shalwar Pancha"], ["trouser", "Trouser"],
  ["trousergherra", "Trouser Gherra"], ["trouserassan", "Trouser Assan"],
  ["trouserside", "Trouser Side"], ["trouserfront", "Trouser Front"],
  ["trouserpancha", "Trouser Pancha"],
];
const ALL_LADIES_FIELDS: [string, string][] = [
  ["length", "Length"], ["shoulder", "Shoulder"], ["sleeves", "Sleeves"],
  ["golai", "Golai"], ["mori", "Mori"], ["bellbazoo", "Bell Bazoo"],
  ["neck", "Neck"], ["chest", "Chest"], ["waist", "Waist"],
  ["gherra", "Gherra"], ["shalwar", "Shalwar"], ["shalwargherra", "Shalwar Gherra"],
  ["shalwarassan", "Shalwar Assan"], ["shalwarpancha", "Shalwar Pancha"],
];

// ─── Comprehensive Garment Category Field Mappings ───────────────────────────
// Each garment category from the user-facing wizard has its own measurement fields
// organized in labeled sections. These exactly match app/account/measurements/page.tsx

interface CategoryFieldDef {
  sections: { name: string; fields: [string, string][] }[];
}

const GARMENT_FIELDS: Record<string, CategoryFieldDef> = {
  male_shalwar_kameez: {
    sections: [
      { name: "Shirt (Kameez)", fields: [["length","Length"],["shoulder","Shoulder"],["neck","Neck"],["sleeves","Sleeves (Single Stitch)"],["chest","Chest"],["waist","Waist"],["gherra","Gherra"]] },
      { name: "Shalwar", fields: [["shalwar","Shalwar"],["pancha","Pancha"]] },
    ],
  },
  male_prince_coat: {
    sections: [
      { name: "Prince Coat", fields: [["length","Length"],["shoulder","Shoulder"],["neck","Neck"],["sleeves","Sleeves (Straight)"],["chest","Chest"],["waist","Waist"],["gherra","Gherra (Straight)"],["choras","Choras"]] },
      { name: "Trousers / Pent", fields: [["trouser_length","Length"],["trouser_bottom","Bottom (Tight)"],["trouser_waist","Waist"]] },
      { name: "Shirt (Optional)", fields: [["shirt_length","Shirt Length"],["shirt_shoulder","Shirt Shoulder"],["shirt_neck","Shirt Neck"],["shirt_chest","Shirt Chest"],["shirt_waist","Shirt Waist"],["shirt_gherra","Shirt Gherra"]] },
    ],
  },
  male_simple_pent_coat: {
    sections: [
      { name: "Simple Pent Coat", fields: [["length","Length"],["shoulder","Shoulder"],["neck","Neck"],["chest","Chest"],["waist","Waist"],["hip","Hip"]] },
      { name: "Trousers / Pent", fields: [["trouser_length","Length"],["trouser_bottom","Bottom (Tight)"],["trouser_waist","Waist"]] },
      { name: "Shirt (Optional)", fields: [["shirt_length","Shirt Length"],["shirt_shoulder","Shirt Shoulder"],["shirt_neck","Shirt Neck"],["shirt_chest","Shirt Chest"],["shirt_waist","Shirt Waist"],["shirt_gherra","Shirt Gherra"]] },
    ],
  },
  female_simple_shalwar: {
    sections: [
      { name: "Shirt", fields: [["length","Length"],["shoulder","Shoulder"],["sleeves","Sleeves"],["neck","Neck"],["chest","Chest"],["waist","Waist"],["gherra","Gherra"]] },
      { name: "Shalwar", fields: [["shalwar","Shalwar"],["pancha","Pancha"]] },
    ],
  },
  female_frock: {
    sections: [
      { name: "Frock", fields: [["length","Length"],["shoulder","Shoulder"],["neck","Neck"],["chest","Chest"],["waist","Waist"]] },
      { name: "Trousers", fields: [["trouser_length","Length"],["trouser_tight","Tight"],["trouser_waist","Waist"]] },
    ],
  },
  female_saari: {
    sections: [
      { name: "Saari Blouse", fields: [["length","Length"],["shoulder","Shoulder"],["neck","Neck"],["chest","Chest"],["waist","Waist"],["hip","Hip"],["blouse","Blouse"]] },
      { name: "Saari", fields: [["saari_length","Saari Length"],["saari_waist","Waist (Pati Coat) Length"]] },
    ],
  },
  female_lehnga_kurti: {
    sections: [
      { name: "Kurti", fields: [["length","Length"],["shoulder","Shoulder"],["neck","Neck"],["chest","Chest"],["waist","Waist"],["hip","Hip"]] },
      { name: "Lehnga", fields: [["lehnga_l","Lehnga Length"],["lehnga_w","Lehnga Width"]] },
    ],
  },
};

function determineFields(garmentType: string): CategoryFieldDef {
  const def = GARMENT_FIELDS[garmentType];
  if (def) return def;
  if (garmentType === "gents" || garmentType.startsWith("male_")) {
    return { sections: [{ name: "Measurements", fields: ALL_GENTS_FIELDS }] };
  }
  if (garmentType === "ladies" || garmentType.startsWith("female_")) {
    return { sections: [{ name: "Measurements", fields: ALL_LADIES_FIELDS }] };
  }
  return { sections: [{ name: "Measurements", fields: ALL_GENTS_FIELDS }] };
}

function categorizeProfileFields(profile: AdminProfile): CategoryFieldDef {
  const def = determineFields(profile.garmentType);
  if (def) return def;
  const keys = Object.keys(profile.measurements).filter(k => profile.measurements[k] && String(profile.measurements[k]).trim() !== "");
  const fields: [string, string][] = keys.map(k => [k, k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " ")]);
  return { sections: [{ name: "Measurements", fields }] };
}

function EditProfileDialog({
  profile,
  onClose,
  onSaved,
}: {
  profile: AdminProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (profile) {
      setMeasurements((profile.measurements as Record<string, string>) || {});
      setNotes(profile.notes || "");
    }
  }, [profile]);

  const setM = (key: string, whole: string, frac: string) =>
    setMeasurements((prev) => ({ ...prev, [key]: [whole, frac].join(" ").trim() }));

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/measurements/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ measurements, notes }),
      });
      if (res.ok) { onSaved(); onClose(); }
    } finally {
      setSaving(false);
    }
  };

  const fieldDef = profile ? categorizeProfileFields(profile) : { sections: [] };

  return (
    <Dialog open={!!profile} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Measurements — {profile?.profileName}</DialogTitle>
          <DialogDescription>
            Customer: {profile?.user.name} ({profile?.user.email}) · Type: {profile?.garmentType.replace(/_/g, " ")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Predefined sections from garment type mapping */}
          {fieldDef.sections.map((section) => {
            const filledFields = section.fields.filter(([key]) => measurements[key] !== undefined);
            if (filledFields.length === 0) return null;
            return (
              <div key={section.name}>
                <h4 className="text-sm font-semibold border-b pb-1 mb-2 text-muted-foreground uppercase tracking-wide">{section.name}</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {section.fields.map(([key, label]) => {
                    const parts = (measurements[key] || "").split(" ");
                    const whole = parts[0] || "";
                    const frac = parts[1] || "";
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <Label className="text-xs w-28 shrink-0 truncate">{label}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={whole}
                          onChange={(e) => setM(key, e.target.value, frac)}
                          className="w-16 h-7 text-xs"
                          placeholder="0"
                        />
                        <select
                          value={frac || "__none__"}
                          onChange={(e) =>
                            setM(key, whole, e.target.value === "__none__" ? "" : e.target.value)
                          }
                          className="w-16 h-7 text-xs border border-border rounded-md px-1 bg-background"
                        >
                          <option value="__none__">—</option>
                          {FRACTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {/* Dynamic catch-all for any keys not covered by predefined sections */}
          {(() => {
            const definedKeys = new Set(fieldDef.sections.flatMap(s => s.fields.map(([k]) => k)));
            const extraKeys = Object.keys(measurements).filter(k => !definedKeys.has(k) && measurements[k].trim() !== "");
            if (extraKeys.length === 0) return null;
            return (
              <div>
                <h4 className="text-sm font-semibold border-b pb-1 mb-2 text-muted-foreground uppercase tracking-wide">Additional Measurements</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {extraKeys.map((key) => {
                    const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
                    const parts = (measurements[key] || "").split(" ");
                    const whole = parts[0] || "";
                    const frac = parts[1] || "";
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <Label className="text-xs w-28 shrink-0 truncate">{label}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={whole}
                          onChange={(e) => setM(key, e.target.value, frac)}
                          className="w-16 h-7 text-xs"
                          placeholder="0"
                        />
                        <select
                          value={frac || "__none__"}
                          onChange={(e) =>
                            setM(key, whole, e.target.value === "__none__" ? "" : e.target.value)
                          }
                          className="w-16 h-7 text-xs border border-border rounded-md px-1 bg-background"
                        >
                          <option value="__none__">—</option>
                          {FRACTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
        <div className="space-y-1">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Profile Measurements Tab ─────────────────────────────────────────────────

function ProfileMeasurementsTab() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [garmentFilter, setGarmentFilter] = useState("all");
  const [editProfile, setEditProfile] = useState<AdminProfile | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const limit = 20;

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(garmentFilter !== "all" && { garmentType: garmentFilter }),
        ...(search && { search }),
      });
      const res = await fetch(`/api/admin/measurements?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, garmentFilter, search]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/admin/measurements/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    fetchProfiles();
  };

  const handlePrintProfile = (p: AdminProfile) => {
    const win = window.open("about:blank", "_blank", "width=850,height=1100");
    if (!win) return;

    const fd = categorizeProfileFields(p);
    const prefs = (p.stylingPrefs as Record<string, unknown>) || {};

    let sectionsHtml = "";
    const definedPrintKeys = new Set(fd.sections.flatMap(s => s.fields.map(([k]) => k)));
    fd.sections.forEach((section) => {
      let rows = "";
      section.fields.forEach(([key, label]) => {
        const v = p.measurements[key];
        if (v && String(v).trim() !== "") {
          rows += `<tr><td style="padding:3px 8px; border-bottom:1px solid #e5e7eb; width:55%; font-size:12px;">${label}</td><td style="padding:3px 8px; border-bottom:1px solid #e5e7eb; font-weight:600; font-size:12px;">${String(v)}"</td></tr>`;
        }
      });
      if (rows) {
        sectionsHtml += `<div style="margin-bottom:10px;"><h4 style="margin:0 0 4px; font-size:12px; color:#4b5563; border-bottom:1px solid #d1d5db; padding-bottom:2px;">${section.name}</h4><table style="width:100%; border-collapse:collapse;">${rows}</table></div>`;
      }
    });
    // Add extra keys not covered by predefined sections
    const extraPrintKeys = Object.keys(p.measurements).filter(k => !definedPrintKeys.has(k) && String(p.measurements[k]).trim() !== "");
    if (extraPrintKeys.length > 0) {
      let extraRows = "";
      extraPrintKeys.forEach((key) => {
        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
        const v = p.measurements[key];
        extraRows += `<tr><td style="padding:3px 8px; border-bottom:1px solid #e5e7eb; width:55%; font-size:12px;">${label}</td><td style="padding:3px 8px; border-bottom:1px solid #e5e7eb; font-weight:600; font-size:12px;">${String(v)}"</td></tr>`;
      });
      sectionsHtml += `<div style="margin-bottom:10px;"><h4 style="margin:0 0 4px; font-size:12px; color:#4b5563; border-bottom:1px solid #d1d5db; padding-bottom:2px;">Additional Measurements</h4><table style="width:100%; border-collapse:collapse;">${extraRows}</table></div>`;
    }

    let pocketsHtml = "";
    const pocketLabels: Record<string, string> = { frontpocket: "Front Pocket", sidepocket: "Side Pocket", shalwarpocket: "Shalwar Pocket" };
    Object.entries(pocketLabels).forEach(([k, lbl]) => {
      if (prefs[k]) pocketsHtml += `<div style="font-size:11px; margin:2px 0;"><strong>${lbl}:</strong> ${prefs[k]}</div>`;
    });

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Measurement Profile - ${p.user.name}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            h2 { margin: 0 0 4px; font-size: 18px; }
            h3 { margin: 0 0 2px; font-size: 16px; }
            @page { size: A4; margin: 12mm; }
          </style>
        </head>
        <body onload="window.print()" onafterprint="window.close()">
          <table style="margin-bottom:10px; border-bottom:2px solid #000; padding-bottom:8px;"><tr>
            <td><h2>Emaan Thread</h2><p style="margin:2px 0; font-size:12px; color:#6b7280;">Customer Measurement Profile</p></td>
            <td style="text-align:right; font-size:11px;">${new Date().toLocaleDateString()}</td>
          </tr></table>
          <div style="margin-bottom:8px;"><strong>${p.user.name}</strong> &mdash; ${p.user.email}</div>
          <div style="margin-bottom:10px; font-size:12px;"><strong>Profile:</strong> ${p.profileName} <span style="color:#6b7280;">(${p.garmentType.replace(/_/g, " ")})</span></div>
          ${sectionsHtml}
          ${pocketsHtml ? `<div style="margin-top:8px; padding:6px 8px; background:#f9fafb; border-radius:4px; font-size:11px;"><strong>Pockets:</strong><br/>${pocketsHtml}</div>` : ""}
          ${p.notes ? `<div style="margin-top:10px; padding:8px; background:#f9fafb; border-radius:4px; font-size:11px;"><strong>Notes:</strong> ${p.notes}</div>` : ""}
        </body>
      </html>
    `);
    win.document.close();
  };

  const totalPages = Math.ceil(total / limit);

  const [viewProfile, setViewProfile] = useState<AdminProfile | null>(null);

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
          <Select value={garmentFilter} onValueChange={(v) => { setGarmentFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="gents">Gents</SelectItem>
              <SelectItem value="ladies">Ladies</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{total} profile{total !== 1 ? "s" : ""} found</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium">Customer</th>
                  <th className="text-left p-4 text-sm font-medium">Profile Name</th>
                  <th className="text-left p-4 text-sm font-medium">Type</th>
                  <th className="text-left p-4 text-sm font-medium">Default</th>
                  <th className="text-left p-4 text-sm font-medium">Created</th>
                  <th className="text-left p-4 w-24"></th>
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
                      {profile.isDefault && (
                        <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">Default</Badge>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewProfile(profile)} title="View Profile">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700" onClick={() => handlePrintProfile(profile)} title="Print Profile">
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditProfile(profile)} title="Edit Profile">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-600" onClick={() => setDeleteId(profile.id)}>
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

      <EditProfileDialog profile={editProfile} onClose={() => setEditProfile(null)} onSaved={fetchProfiles} />

      {/* View Profile Dialog — Full A4-Style Measurement Profile */}
      <Dialog open={!!viewProfile} onOpenChange={(o) => !o && setViewProfile(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto print:max-w-none print:max-h-none">
          <DialogHeader>
            <DialogTitle className="text-xl">Measurement Profile — {viewProfile?.profileName}</DialogTitle>
            <DialogDescription>
              Customer: {viewProfile?.user.name} ({viewProfile?.user.email}) · Created: {viewProfile ? new Date(viewProfile.createdAt).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>
          {viewProfile && (() => {
            const fieldDef = categorizeProfileFields(viewProfile);
            const prefs = (viewProfile.stylingPrefs as Record<string, unknown>) || {};
            const m = viewProfile.measurements as Record<string, string>;
            return (
              <div className="space-y-5 py-2">
                {fieldDef.sections.map((section) => {
                  const filledFields = section.fields.filter(([key]) => m[key] && String(m[key]).trim() !== "");
                  if (filledFields.length === 0) return null;
                  return (
                    <div key={section.name}>
                      <h4 className="text-sm font-semibold border-b-2 pb-1 mb-2 text-muted-foreground uppercase tracking-wide">{section.name}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                        {filledFields.map(([key, label]) => (
                          <div key={key} className="flex items-center justify-between border-b border-border/30 py-1">
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <span className="text-sm font-semibold">{String(m[key])}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {/* Dynamic catch-all for extra keys not matched by predefined sections */}
                {(() => {
                  const definedKeys = new Set(fieldDef.sections.flatMap(s => s.fields.map(([k]) => k)));
                  const extraKeys = Object.keys(m).filter(k => !definedKeys.has(k) && String(m[k]).trim() !== "");
                  if (extraKeys.length === 0) return null;
                  return (
                    <div>
                      <h4 className="text-sm font-semibold border-b-2 pb-1 mb-2 text-muted-foreground uppercase tracking-wide">Additional Measurements</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                        {extraKeys.map((key) => (
                          <div key={key} className="flex items-center justify-between border-b border-border/30 py-1">
                            <span className="text-xs text-muted-foreground">{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")}</span>
                            <span className="text-sm font-semibold">{String(m[key])}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {Object.keys(prefs).some(k => prefs[k]) && (
                  <div>
                    <h4 className="text-sm font-semibold border-b-2 pb-1 mb-2 text-muted-foreground uppercase tracking-wide">Pockets / Preferences</h4>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      {prefs.frontpocket ? <span><span className="text-muted-foreground text-xs">Front Pocket:</span> <strong>{String(prefs.frontpocket)}</strong></span> : null}
                      {prefs.sidepocket ? <span><span className="text-muted-foreground text-xs">Side Pocket:</span> <strong>{String(prefs.sidepocket)}</strong></span> : null}
                      {prefs.shalwarpocket ? <span><span className="text-muted-foreground text-xs">Shalwar Pocket:</span> <strong>{String(prefs.shalwarpocket)}</strong></span> : null}
                      {prefs.includeShirt ? <span><span className="text-muted-foreground text-xs">Include Shirt:</span> <strong>Yes</strong></span> : null}
                    </div>
                  </div>
                )}

                {viewProfile.notes && (
                  <div>
                    <h4 className="text-sm font-semibold border-b-2 pb-1 mb-2 text-muted-foreground uppercase tracking-wide">Notes</h4>
                    <p className="text-sm bg-muted/30 rounded-lg p-3 italic">{viewProfile.notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Badge variant="outline" className="capitalize text-xs">{viewProfile.garmentType.replace(/_/g, " ")}</Badge>
                  {viewProfile.isDefault && (
                    <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">Default Profile</Badge>
                  )}
                  <Button variant="outline" size="sm" className="ml-auto gap-1" onClick={() => handlePrintProfile(viewProfile)}>
                    <Printer className="h-3.5 w-3.5" /> Print
                  </Button>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewProfile(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Measurement Profile?</DialogTitle>
            <DialogDescription>This will permanently delete this measurement profile. Order snapshots will be retained.</DialogDescription>
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

// ─── Tailor Measurements Tab ──────────────────────────────────────────────────

function TailorMeasurementsTab() {
  const [measurements, setMeasurements] = useState<TailorMeasurement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [quickEdit, setQuickEdit] = useState<TailorMeasurement | null>(null);
  const [savingQuick, setSavingQuick] = useState(false);
  const limit = 20;

  const fetchMeasurements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(genderFilter !== "all" && { gender: genderFilter }),
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
  }, [page, statusFilter, genderFilter, search]);

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
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36">
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
                  <th className="text-left p-4 text-sm font-medium">Gender</th>
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
                      <Badge variant="outline" className="text-xs">{m.gender}</Badge>
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
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => setQuickEdit(m)}
                          title="Quick Edit"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Full Measurements">
                          <Link href={`/admin/measurements/${m.id}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
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

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tailor Measurement?</DialogTitle>
            <DialogDescription>
              This will permanently delete this measurement record. The customer will be able to submit a new request.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!quickEdit} onOpenChange={(o) => !o && setQuickEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Edit Request</DialogTitle>
            <DialogDescription>Update status and notes without filling the full measurement form.</DialogDescription>
          </DialogHeader>
          {quickEdit && (() => {
            const profileMatch = (quickEdit.notes || "").match(/^\[Profile:\s*(.+?)\|(.+?)\]/);
            const profileTag = profileMatch ? profileMatch[0] : "";
            const profileName = profileMatch ? profileMatch[1] : "";
            const cleanNotes = profileMatch ? (quickEdit.notes || "").replace(profileMatch[0], "").trim() : (quickEdit.notes || "");
            return (
            <div className="space-y-4 py-2">
              {profileName && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <span className="text-sm">
                    <span className="font-medium">Linked Profile:</span> {profileName}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={quickEdit.status}
                  onValueChange={(v) => setQuickEdit({ ...quickEdit, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Delivery Date (Optional)</Label>
                <Input
                  type="date"
                  value={quickEdit.deliveryDate ? quickEdit.deliveryDate.split("T")[0] : ""}
                  onChange={(e) => setQuickEdit({ ...quickEdit, deliveryDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Internal Notes</Label>
                <Textarea
                  value={quickEdit._cleanNotes !== undefined ? quickEdit._cleanNotes : cleanNotes}
                  onChange={(e) => setQuickEdit({ ...quickEdit, _cleanNotes: e.target.value })}
                  placeholder="e.g. Customer prefers loose fit..."
                  rows={3}
                />
              </div>
            </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickEdit(null)}>Cancel</Button>
            <Button onClick={async () => {
              if (!quickEdit) return;
              setSavingQuick(true);
              try {
                const profileMatch = (quickEdit.notes || "").match(/^\[Profile:\s*(.+?)\|(.+?)\]/);
                const profileTag = profileMatch ? profileMatch[0] : "";
                const userNotes = quickEdit._cleanNotes !== undefined ? quickEdit._cleanNotes : (quickEdit.notes || "").replace(profileTag, "").trim();
                const finalNotes = profileTag ? (userNotes ? `${profileTag}\n${userNotes}` : profileTag) : userNotes;
                const res = await fetch(`/api/admin/tailor-measurements/${quickEdit.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: quickEdit.status,
                    notes: finalNotes,
                    deliveryDate: quickEdit.deliveryDate || null,
                  }),
                });
                if (res.ok) {
                  setQuickEdit(null);
                  fetchMeasurements();
                }
              } finally {
                setSavingQuick(false);
              }
            }} disabled={savingQuick}>
              {savingQuick ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminMeasurementsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({ totalProfiles: 0, totalTailorRequests: 0, pendingRequests: 0, completeRequests: 0 });

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
            <Ruler className="h-6 w-6" /> Stitching
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage customer measurement profiles and tailor requests
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setRefreshKey((k) => k + 1)}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Profiles</p>
            <p className="text-2xl font-bold mt-1">{stats.totalProfiles}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Tailor Requests</p>
            <p className="text-2xl font-bold mt-1">{stats.totalTailorRequests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-amber-600 font-medium">Pending Requests</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{stats.pendingRequests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-emerald-600 font-medium">Completed Requests</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.completeRequests}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tailor" key={refreshKey}>
        <TabsList>
          <TabsTrigger value="tailor">Tailor Requests</TabsTrigger>
          <TabsTrigger value="profiles">Measurement Profiles</TabsTrigger>
        </TabsList>
        <TabsContent value="tailor" className="space-y-4 mt-4">
          <TailorMeasurementsTab />
        </TabsContent>
        <TabsContent value="profiles" className="space-y-4 mt-4">
          <ProfileMeasurementsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
