"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Truck, Power } from "lucide-react";
import type { ShippingZone } from "@/lib/admin-store";

export default function AdminShippingPage() {
  const { toast } = useToast();
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editZone, setEditZone] = useState<ShippingZone | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCities, setFormCities] = useState("");
  const [formProvinces, setFormProvinces] = useState("");
  const [formRate, setFormRate] = useState("");
  const [formDays, setFormDays] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSaving, setFormSaving] = useState(false);

  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shipping/zones");
      if (res.ok) {
        const data = await res.json();
        setZones(data.zones || []);
      }
    } catch (err) {
      console.error("Failed to load shipping zones:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadZones(); }, [loadZones]);

  function openCreateDialog() {
    setEditZone(null);
    setFormName("");
    setFormCities("");
    setFormProvinces("");
    setFormRate("");
    setFormDays("");
    setFormIsActive(true);
    setDialogOpen(true);
  }

  function openEditDialog(zone: ShippingZone) {
    setEditZone(zone);
    setFormName(zone.name);
    setFormCities(Array.isArray(zone.cities) ? zone.cities.join(", ") : "");
    setFormProvinces(Array.isArray(zone.provinces) ? zone.provinces.join(", ") : "");
    setFormRate(String(zone.shippingRate));
    setFormDays(zone.estimatedDays);
    setFormIsActive(zone.isActive);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim() || !formRate.trim() || !formDays.trim()) {
      toast({ title: "Error", description: "Name, rate, and estimated days are required.", variant: "destructive" });
      return;
    }
    setFormSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        cities: formCities.split(",").map((s) => s.trim()).filter(Boolean),
        provinces: formProvinces.split(",").map((s) => s.trim()).filter(Boolean),
        shippingRate: parseInt(formRate, 10),
        estimatedDays: formDays.trim(),
        isActive: formIsActive,
      };

      if (editZone) {
        const res = await fetch(`/api/admin/shipping/zones/${editZone.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast({ title: "Zone updated" });
      } else {
        const res = await fetch("/api/admin/shipping/zones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast({ title: "Zone created" });
      }
      setDialogOpen(false);
      await loadZones();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this shipping zone?")) return;
    try {
      const res = await fetch(`/api/admin/shipping/zones/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Zone deleted" });
      await loadZones();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }
  }

  async function toggleActive(zone: ShippingZone) {
    try {
      const res = await fetch(`/api/admin/shipping/zones/${zone.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !zone.isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      await loadZones();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Shipping Zones</h1>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" /> Add Zone
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : zones.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Truck className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">No shipping zones configured</p>
          <p className="text-sm text-muted-foreground mb-4">Add your first shipping zone to calculate delivery costs</p>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" /> Create First Zone
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Cities</TableHead>
                <TableHead>Provinces</TableHead>
                <TableHead>Rate (PKR)</TableHead>
                <TableHead>Est. Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">{zone.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {Array.isArray(zone.cities) ? zone.cities.join(", ") : "-"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {Array.isArray(zone.provinces) ? zone.provinces.join(", ") : "-"}
                  </TableCell>
                  <TableCell>{zone.shippingRate}</TableCell>
                  <TableCell>{zone.estimatedDays}</TableCell>
                  <TableCell>
                    <Badge variant={zone.isActive ? "default" : "secondary"}>
                      {zone.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(zone)} title="Toggle active">
                        {zone.isActive ? <Power className="h-4 w-4 text-green-600" /> : <Power className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(zone)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(zone.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editZone ? "Edit" : "Create"} Shipping Zone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Zone Name *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder='e.g. "Lahore City"' className="mt-1" />
            </div>
            <div>
              <Label>Cities (comma-separated)</Label>
              <Input value={formCities} onChange={(e) => setFormCities(e.target.value)} placeholder="e.g. Lahore, Kasur, Sheikhupura" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Leave empty for province-wide or default zone</p>
            </div>
            <div>
              <Label>Provinces (comma-separated)</Label>
              <Input value={formProvinces} onChange={(e) => setFormProvinces(e.target.value)} placeholder="e.g. Punjab, Sindh" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Leave empty for city-specific or default zone</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Shipping Rate (PKR) *</Label>
                <Input type="number" min={0} value={formRate} onChange={(e) => setFormRate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Est. Delivery *</Label>
                <Input value={formDays} onChange={(e) => setFormDays(e.target.value)} placeholder="3-5 business days" className="mt-1" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm">Active</span>
            </label>
            <Button onClick={handleSave} disabled={formSaving} className="w-full">
              {formSaving ? "Saving..." : editZone ? "Update Zone" : "Create Zone"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}