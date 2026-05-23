"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Plus, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";

interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}

const defaultForm = {
  label: "",
  fullName: "",
  phone: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  isDefault: false,
};

const PAKISTAN_PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Islamabad Capital Territory",
  "Gilgit-Baltistan",
  "Azad Jammu and Kashmir",
];

export default function AddressesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAddress, setEditAddress] = useState<Address | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchAddresses = async () => {
    try {
      const res = await fetch("/api/user/addresses");
      if (res.ok) setAddresses(await res.json());
    } catch (err) {
      console.error("Error fetching addresses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAddresses();
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const openAddDialog = () => {
    setEditAddress(null);
    setForm({
      ...defaultForm,
      fullName: user?.name ?? "",
      phone: user?.phone ?? "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (addr: Address) => {
    setEditAddress(addr);
    setForm({
      label: addr.label,
      fullName: addr.fullName,
      phone: addr.phone,
      address: addr.address,
      city: addr.city,
      province: addr.province,
      postalCode: addr.postalCode,
      isDefault: addr.isDefault,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editAddress
        ? `/api/user/addresses/${editAddress.id}`
        : "/api/user/addresses";
      const method = editAddress ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save address");
      }

      toast({
        title: editAddress ? "Address Updated" : "Address Added",
        description: "Your address has been saved.",
      });

      setDialogOpen(false);
      await fetchAddresses();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this address?")) return;

    try {
      const res = await fetch(`/api/user/addresses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete address");

      toast({
        title: "Address Deleted",
        description: "The address has been removed.",
      });

      await fetchAddresses();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete address",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/user/addresses/${id}/set-default`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to set default");

      toast({
        title: "Default Updated",
        description: "Your default address has been changed.",
      });

      await fetchAddresses();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to set default address",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Header />
      <CartDrawer />

      <main className="min-h-screen bg-muted/30 pt-28 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link
            href="/account"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Account
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-serif">Addresses</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your delivery addresses
              </p>
            </div>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Address
            </Button>
          </div>

          {/* Addresses List */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : addresses.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No addresses saved</p>
                <p className="text-muted-foreground mb-6">
                  Add a delivery address to speed up your checkout.
                </p>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Address
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <Card key={addr.id} className="relative">
                  <CardContent className="p-5">
                    {addr.isDefault && (
                      <Badge className="absolute top-3 right-3 bg-amber-100 text-amber-700 border-amber-200 text-xs">
                        Default
                      </Badge>
                    )}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm capitalize">{addr.label}</p>
                        <p className="text-sm font-medium">{addr.fullName}</p>
                        <p className="text-sm text-muted-foreground">{addr.phone}</p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-0.5 mb-4 ml-12">
                      <p>{addr.address}</p>
                      <p>
                        {addr.city}, {addr.province}
                      </p>
                      <p>{addr.postalCode}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap ml-12">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(addr)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      {!addr.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(addr.id)}
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(addr.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Add/Edit Address Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editAddress ? "Edit Address" : "Add New Address"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addr-label">Label</Label>
                <Select
                  value={form.label}
                  onValueChange={(v) => setForm((f) => ({ ...f, label: v }))}
                >
                  <SelectTrigger id="addr-label">
                    <SelectValue placeholder="Select label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr-postal">Postal Code</Label>
                <Input
                  id="addr-postal"
                  value={form.postalCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, postalCode: e.target.value }))
                  }
                  placeholder="54000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addr-fullname">Full Name</Label>
                <Input
                  id="addr-fullname"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr-phone">Phone</Label>
                <Input
                  id="addr-phone"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="+92 300 1234567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addr-address">Address</Label>
              <Input
                id="addr-address"
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="House #, Street, Area"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addr-city">City</Label>
                <Input
                  id="addr-city"
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  placeholder="Lahore"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr-province">Province</Label>
                <Select
                  value={form.province}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, province: v }))
                  }
                >
                  <SelectTrigger id="addr-province">
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAKISTAN_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {addresses.length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="addr-default"
                  checked={form.isDefault}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, isDefault: checked === true }))
                  }
                />
                <Label htmlFor="addr-default" className="text-sm cursor-pointer">
                  Set as default address
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.label || !form.fullName || !form.phone || !form.address || !form.city || !form.province || !form.postalCode}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editAddress ? (
                "Update Address"
              ) : (
                "Add Address"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}