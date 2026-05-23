"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Store, Truck, CreditCard, Bell, Globe, Loader2, MapPin, Plus, Pencil, Trash2, X, Check, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAdminStore } from "@/lib/admin-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [storeSettings, setStoreSettings] = useState({
    name: "Eman Thread",
    tagline: "The Style Never Dies",
    email: "contact@emanthreads.com",
    phone: "+92 300 1234567",
    whatsapp: "+92 300 1234567",
    address: "123 Fashion Street, Lahore, Pakistan",
    currency: "PKR",
    timezone: "Asia/Karachi",
    instagramUrl: "",
    facebookUrl: "",
    youtubeUrl: "",
    tiktokUrl: "",
  });

  const [shippingSettings, setShippingSettings] = useState({
    freeShippingThreshold: 5000,
    standardShippingRate: 200,
    expressShippingRate: 500,
    processingTime: "1-2 business days",
    deliveryTime: "3-5 business days",
    enableCOD: true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    orderConfirmation: true,
    orderShipped: true,
    orderDelivered: true,
    lowStockAlert: true,
    newOrderAlert: true,
    returnRequest: true,
  });

  const [seoSettings, setSeoSettings] = useState({
    metaTitle: "Eman Thread | Premium Men's Unstitched Fabric",
    metaDescription:
      "Discover premium unstitched fabric for men. Shop our collection of Cotton, Wash & Wear, Boski, and more.",
    googleAnalyticsId: "",
    facebookPixelId: "",
  });

  // Content Pages state
  const [contentPages, setContentPages] = useState({
    shipping_content: "",
    returns_content: "",
    size_guide_content: "",
    about_content: "",
    story_content: "",
  });

  // Shipping Zones state
  const {
    shippingZones,
    loadShippingZones,
    addShippingZone,
    updateShippingZone,
    deleteShippingZone,
  } = useAdminStore();

  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [zoneForm, setZoneForm] = useState({
    name: "",
    cities: "",
    provinces: "",
    shippingRate: 0,
    estimatedDays: "",
    isActive: true,
  });

  useEffect(() => {
    loadShippingZones();
  }, [loadShippingZones]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();

        // Load store settings
        if (data.name !== undefined) {
          setStoreSettings((prev) => ({
            name: data.name ?? prev.name,
            tagline: data.tagline ?? prev.tagline,
            email: data.email ?? prev.email,
            phone: data.phone ?? prev.phone,
            whatsapp: data.whatsappNumber ?? prev.whatsapp,
            address: data.address ?? prev.address,
            currency: data.currency ?? prev.currency,
            timezone: data.timezone ?? prev.timezone,
            instagramUrl: data.instagram_url ?? prev.instagramUrl,
            facebookUrl: data.facebook_url ?? prev.facebookUrl,
            youtubeUrl: data.youtube_url ?? prev.youtubeUrl,
            tiktokUrl: data.tiktok_url ?? prev.tiktokUrl,
          }));
        }
        if (data.freeShippingThreshold !== undefined) {
          setShippingSettings((prev) => ({
            ...prev,
            freeShippingThreshold: data.freeShippingThreshold,
            standardShippingRate: data.standardShippingRate ?? prev.standardShippingRate,
            expressShippingRate: data.expressShippingRate ?? prev.expressShippingRate,
            enableCOD: data.enableCOD ?? prev.enableCOD,
          }));
        }
        if (data.orderConfirmation !== undefined) {
          setNotificationSettings({
            orderConfirmation: data.orderConfirmation ?? true,
            orderShipped: data.orderShipped ?? true,
            orderDelivered: data.orderDelivered ?? true,
            lowStockAlert: data.lowStockAlert ?? true,
            newOrderAlert: data.newOrderAlert ?? true,
            returnRequest: data.returnRequest ?? true,
          });
        }
        if (data.metaTitle !== undefined) {
          setSeoSettings((prev) => ({
            ...prev,
            metaTitle: data.metaTitle ?? prev.metaTitle,
            metaDescription: data.metaDescription ?? prev.metaDescription,
            googleAnalyticsId: data.googleAnalyticsId ?? prev.googleAnalyticsId,
            facebookPixelId: data.facebookPixelId ?? prev.facebookPixelId,
          }));
        }
        // Load content pages
        if (data.shipping_content !== undefined) {
          setContentPages({
            shipping_content: data.shipping_content ?? "",
            returns_content: data.returns_content ?? "",
            size_guide_content: data.size_guide_content ?? "",
            about_content: data.about_content ?? "",
            story_content: data.story_content ?? "",
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        toast({ title: "Error", description: "Could not load settings", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    loadSettings();

    // Also load content pages separately
    async function loadContentPages() {
      try {
        const res = await fetch("/api/admin/content-pages");
        if (!res.ok) return;
        const data = await res.json();
        setContentPages((prev) => ({
          ...prev,
          ...data,
        }));
      } catch {
        // silent
      }
    }
    loadContentPages();
  }, [toast]);

  const openAddZone = () => {
    setEditingZone(null);
    setZoneForm({
      name: "",
      cities: "",
      provinces: "",
      shippingRate: 0,
      estimatedDays: "",
      isActive: true,
    });
    setZoneDialogOpen(true);
  };

  const openEditZone = (zone: (typeof shippingZones)[0]) => {
    setEditingZone(zone.id);
    setZoneForm({
      name: zone.name,
      cities: zone.cities.join(", "),
      provinces: zone.provinces.join(", "),
      shippingRate: zone.shippingRate,
      estimatedDays: zone.estimatedDays,
      isActive: zone.isActive,
    });
    setZoneDialogOpen(true);
  };

  const handleSaveZone = async () => {
    try {
      const payload = {
        name: zoneForm.name,
        cities: zoneForm.cities.split(",").map((c) => c.trim()).filter(Boolean),
        provinces: zoneForm.provinces.split(",").map((p) => p.trim()).filter(Boolean),
        shippingRate: zoneForm.shippingRate,
        estimatedDays: zoneForm.estimatedDays,
        isActive: zoneForm.isActive,
      };

      if (editingZone) {
        await updateShippingZone(editingZone, payload);
        toast({ title: "Zone updated", description: `${payload.name} has been updated.` });
      } else {
        await addShippingZone(payload);
        toast({ title: "Zone created", description: `${payload.name} has been created.` });
      }
      setZoneDialogOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to save zone", variant: "destructive" });
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm("Are you sure you want to delete this zone?")) return;
    try {
      await deleteShippingZone(id);
      toast({ title: "Zone deleted", description: "The shipping zone has been removed." });
    } catch {
      toast({ title: "Error", description: "Failed to delete zone", variant: "destructive" });
    }
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        name: storeSettings.name,
        tagline: storeSettings.tagline,
        email: storeSettings.email,
        phone: storeSettings.phone,
        whatsappNumber: storeSettings.whatsapp,
        address: storeSettings.address,
        currency: storeSettings.currency,
        timezone: storeSettings.timezone,
        instagram_url: storeSettings.instagramUrl,
        facebook_url: storeSettings.facebookUrl,
        youtube_url: storeSettings.youtubeUrl,
        tiktok_url: storeSettings.tiktokUrl,
        freeShippingThreshold: shippingSettings.freeShippingThreshold,
        standardShippingRate: shippingSettings.standardShippingRate,
        expressShippingRate: shippingSettings.expressShippingRate,
        enableCOD: shippingSettings.enableCOD,
        orderConfirmation: notificationSettings.orderConfirmation,
        orderShipped: notificationSettings.orderShipped,
        orderDelivered: notificationSettings.orderDelivered,
        lowStockAlert: notificationSettings.lowStockAlert,
        newOrderAlert: notificationSettings.newOrderAlert,
        returnRequest: notificationSettings.returnRequest,
        metaTitle: seoSettings.metaTitle,
        metaDescription: seoSettings.metaDescription,
        googleAnalyticsId: seoSettings.googleAnalyticsId,
        facebookPixelId: seoSettings.facebookPixelId,
      };

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save settings");
      }

      toast({ title: "Settings saved", description: "Your changes have been saved successfully." });
    } catch (err) {
      console.error("Save settings error:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [storeSettings, shippingSettings, notificationSettings, seoSettings, toast]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your store configuration and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="store" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
          <TabsTrigger value="store" className="gap-2">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Store</span>
          </TabsTrigger>
          <TabsTrigger value="shipping" className="gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Shipping</span>
          </TabsTrigger>
          <TabsTrigger value="zones" className="gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Zones</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">SEO</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Content</span>
          </TabsTrigger>
        </TabsList>

        {/* Store Settings */}
        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>
                Basic information about your store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input
                    id="storeName"
                    value={storeSettings.name}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={storeSettings.tagline}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, tagline: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={storeSettings.email}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={storeSettings.phone}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Number</Label>
                  <Input
                    id="whatsapp"
                    value={storeSettings.whatsapp}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, whatsapp: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={storeSettings.currency}
                    onValueChange={(value) =>
                      setStoreSettings({ ...storeSettings, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PKR">PKR (Pakistani Rupee)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      <SelectItem value="AED">AED (UAE Dirham)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Store Address</Label>
                <Textarea
                  id="address"
                  value={storeSettings.address}
                  onChange={(e) =>
                    setStoreSettings({ ...storeSettings, address: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <Separator />
              <h3 className="text-lg font-medium">Social Media Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="instagramUrl">Instagram URL</Label>
                  <Input
                    id="instagramUrl"
                    value={storeSettings.instagramUrl}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, instagramUrl: e.target.value })
                    }
                    placeholder="https://instagram.com/emanthread"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebookUrl">Facebook URL</Label>
                  <Input
                    id="facebookUrl"
                    value={storeSettings.facebookUrl}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, facebookUrl: e.target.value })
                    }
                    placeholder="https://facebook.com/emanthread"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtubeUrl">YouTube URL</Label>
                  <Input
                    id="youtubeUrl"
                    value={storeSettings.youtubeUrl}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, youtubeUrl: e.target.value })
                    }
                    placeholder="https://youtube.com/@emanthread"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktokUrl">TikTok URL</Label>
                  <Input
                    id="tiktokUrl"
                    value={storeSettings.tiktokUrl}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, tiktokUrl: e.target.value })
                    }
                    placeholder="https://tiktok.com/@emanthread"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Settings */}
        <TabsContent value="shipping">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Configuration</CardTitle>
              <CardDescription>
                Configure shipping rates and delivery options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="freeShipping">Free Shipping Threshold (PKR)</Label>
                  <Input
                    id="freeShipping"
                    type="number"
                    value={shippingSettings.freeShippingThreshold}
                    onChange={(e) =>
                      setShippingSettings({
                        ...shippingSettings,
                        freeShippingThreshold: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Orders above this amount get free shipping
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="standardRate">Standard Shipping Rate (PKR)</Label>
                  <Input
                    id="standardRate"
                    type="number"
                    value={shippingSettings.standardShippingRate}
                    onChange={(e) =>
                      setShippingSettings({
                        ...shippingSettings,
                        standardShippingRate: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expressRate">Express Shipping Rate (PKR)</Label>
                  <Input
                    id="expressRate"
                    type="number"
                    value={shippingSettings.expressShippingRate}
                    onChange={(e) =>
                      setShippingSettings({
                        ...shippingSettings,
                        expressShippingRate: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="processing">Processing Time</Label>
                  <Input
                    id="processing"
                    value={shippingSettings.processingTime}
                    onChange={(e) =>
                      setShippingSettings({
                        ...shippingSettings,
                        processingTime: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cash on Delivery (COD)</p>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to pay on delivery
                  </p>
                </div>
                <Switch
                  checked={shippingSettings.enableCOD}
                  onCheckedChange={(checked) =>
                    setShippingSettings({ ...shippingSettings, enableCOD: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Configure accepted payment methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">Cash on Delivery</p>
                      <p className="text-sm text-muted-foreground">
                        Accept payment on delivery
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={shippingSettings.enableCOD}
                    onCheckedChange={(checked) =>
                      setShippingSettings({ ...shippingSettings, enableCOD: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">JazzCash</p>
                      <p className="text-sm text-muted-foreground">
                        Mobile wallet payments
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked disabled />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Easypaisa</p>
                      <p className="text-sm text-muted-foreground">
                        Mobile wallet payments
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked disabled />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Credit/Debit Card</p>
                      <p className="text-sm text-muted-foreground">
                        Visa, Mastercard, etc.
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure automated email and SMS notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Customer Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Order Confirmation</p>
                      <p className="text-sm text-muted-foreground">
                        Send email when order is placed
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.orderConfirmation}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          orderConfirmation: checked,
                        })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Order Shipped</p>
                      <p className="text-sm text-muted-foreground">
                        Notify when order is shipped
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.orderShipped}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          orderShipped: checked,
                        })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Order Delivered</p>
                      <p className="text-sm text-muted-foreground">
                        Notify when order is delivered
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.orderDelivered}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          orderDelivered: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">Admin Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">New Order Alert</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified for new orders
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.newOrderAlert}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          newOrderAlert: checked,
                        })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Low Stock Alert</p>
                      <p className="text-sm text-muted-foreground">
                        Alert when products are low in stock
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.lowStockAlert}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          lowStockAlert: checked,
                        })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Return Request</p>
                      <p className="text-sm text-muted-foreground">
                        Alert for return/refund requests
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.returnRequest}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          returnRequest: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Zones */}
        <TabsContent value="zones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Shipping Zones</CardTitle>
                <CardDescription>
                  Manage delivery zones, rates, and estimated delivery times
                </CardDescription>
              </div>
              <Button onClick={openAddZone} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Zone
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone Name</TableHead>
                    <TableHead>Cities</TableHead>
                    <TableHead>Provinces</TableHead>
                    <TableHead>Rate (PKR)</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shippingZones.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No shipping zones configured yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {shippingZones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">{zone.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {zone.cities.length > 0 ? zone.cities.join(", ") : "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {zone.provinces.length > 0 ? zone.provinces.join(", ") : "—"}
                      </TableCell>
                      <TableCell>
                        {zone.shippingRate === 0 ? "Free" : `PKR ${zone.shippingRate}`}
                      </TableCell>
                      <TableCell>{zone.estimatedDays}</TableCell>
                      <TableCell>
                        <Badge variant={zone.isActive ? "default" : "secondary"}>
                          {zone.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditZone(zone)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteZone(zone.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Zone Dialog */}
          <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingZone ? "Edit Shipping Zone" : "Add Shipping Zone"}
                </DialogTitle>
                <DialogDescription>
                  Configure cities, provinces, shipping rate, and delivery estimate.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="zoneName">Zone Name *</Label>
                  <Input
                    id="zoneName"
                    value={zoneForm.name}
                    onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                    placeholder="e.g. Karachi, Lahore"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zoneCities">Cities (comma-separated)</Label>
                  <Input
                    id="zoneCities"
                    value={zoneForm.cities}
                    onChange={(e) => setZoneForm({ ...zoneForm, cities: e.target.value })}
                    placeholder="karachi, lahore, islamabad"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to match any city in the listed provinces
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zoneProvinces">Provinces (comma-separated)</Label>
                  <Input
                    id="zoneProvinces"
                    value={zoneForm.provinces}
                    onChange={(e) => setZoneForm({ ...zoneForm, provinces: e.target.value })}
                    placeholder="punjab, sindh, kpk"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for default fallback zone
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zoneRate">Shipping Rate (PKR) *</Label>
                    <Input
                      id="zoneRate"
                      type="number"
                      value={zoneForm.shippingRate}
                      onChange={(e) => setZoneForm({ ...zoneForm, shippingRate: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zoneEta">Estimated Days *</Label>
                    <Input
                      id="zoneEta"
                      value={zoneForm.estimatedDays}
                      onChange={(e) => setZoneForm({ ...zoneForm, estimatedDays: e.target.value })}
                      placeholder="2-3 business days"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="font-medium text-sm">Active</p>
                    <p className="text-xs text-muted-foreground">
                      Inactive zones are not used for rate calculation
                    </p>
                  </div>
                  <Switch
                    checked={zoneForm.isActive}
                    onCheckedChange={(checked) => setZoneForm({ ...zoneForm, isActive: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setZoneDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveZone}>
                  {editingZone ? "Update Zone" : "Create Zone"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Content Pages Settings */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Content Pages</CardTitle>
              <CardDescription>
                Edit the content of your store pages. Supports HTML formatting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping_content">Shipping Info Page</Label>
                  <Textarea
                    id="shipping_content"
                    value={contentPages.shipping_content}
                    onChange={(e) =>
                      setContentPages({ ...contentPages, shipping_content: e.target.value })
                    }
                    rows={8}
                    placeholder="Enter HTML content for the Shipping Info page..."
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="returns_content">Returns Page</Label>
                  <Textarea
                    id="returns_content"
                    value={contentPages.returns_content}
                    onChange={(e) =>
                      setContentPages({ ...contentPages, returns_content: e.target.value })
                    }
                    rows={8}
                    placeholder="Enter HTML content for the Returns page..."
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="size_guide_content">Size Guide Page</Label>
                  <Textarea
                    id="size_guide_content"
                    value={contentPages.size_guide_content}
                    onChange={(e) =>
                      setContentPages({ ...contentPages, size_guide_content: e.target.value })
                    }
                    rows={8}
                    placeholder="Enter HTML content for the Size Guide page..."
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="about_content">About Us Page</Label>
                  <Textarea
                    id="about_content"
                    value={contentPages.about_content}
                    onChange={(e) =>
                      setContentPages({ ...contentPages, about_content: e.target.value })
                    }
                    rows={8}
                    placeholder="Enter HTML content for the About Us page..."
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="story_content">Our Story Page</Label>
                  <Textarea
                    id="story_content"
                    value={contentPages.story_content}
                    onChange={(e) =>
                      setContentPages({ ...contentPages, story_content: e.target.value })
                    }
                    rows={8}
                    placeholder="Enter HTML content for the Our Story page..."
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      for (const [key, content] of Object.entries(contentPages)) {
                        await fetch("/api/admin/content-pages", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ key, content }),
                        });
                      }
                      toast({ title: "Content saved", description: "All pages have been updated." });
                    } catch {
                      toast({ title: "Error", description: "Failed to save content", variant: "destructive" });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Content Pages
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Settings */}
        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO & Analytics</CardTitle>
              <CardDescription>
                Configure search engine optimization and tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Default Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={seoSettings.metaTitle}
                  onChange={(e) =>
                    setSeoSettings({ ...seoSettings, metaTitle: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaDesc">Default Meta Description</Label>
                <Textarea
                  id="metaDesc"
                  value={seoSettings.metaDescription}
                  onChange={(e) =>
                    setSeoSettings({ ...seoSettings, metaDescription: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="ga">Google Analytics ID</Label>
                  <Input
                    id="ga"
                    placeholder="G-XXXXXXXXXX"
                    value={seoSettings.googleAnalyticsId}
                    onChange={(e) =>
                      setSeoSettings({ ...seoSettings, googleAnalyticsId: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fb">Facebook Pixel ID</Label>
                  <Input
                    id="fb"
                    placeholder="XXXXXXXXXXXXXXX"
                    value={seoSettings.facebookPixelId}
                    onChange={(e) =>
                      setSeoSettings({ ...seoSettings, facebookPixelId: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}