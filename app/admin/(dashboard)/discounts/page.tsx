"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Tag,
  Calendar,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAdminStore, type Discount } from "@/lib/admin-store";
import { formatPrice } from "@/lib/data";
import { cn } from "@/lib/utils";

const discountTypeLabels = {
  percentage: "Percentage Off",
  fixed: "Fixed Amount",
  buy_x_get_y: "Buy X Get Y",
};

export default function AdminDiscountsPage() {
  const { discounts, addDiscount, updateDiscount, deleteDiscount, loadDiscounts } = useAdminStore();

  useEffect(() => {
    loadDiscounts();
  }, [loadDiscounts]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDiscount, setNewDiscount] = useState({
    code: "",
    type: "percentage" as Discount["type"],
    value: 10,
    buyQuantity: 2,
    getQuantity: 1,
    productIds: [] as string[],
    minPurchase: 0,
    maxDiscount: 0,
    usageLimit: 0,
      startDate: "",
      endDate: "",
      isActive: true,
    });

  const [editDiscountPayload, setEditDiscountPayload] = useState<Discount | null>(null);

  const filteredDiscounts = discounts.filter(
    (discount) =>
      discount.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDuplicateDiscount = async (discount: Discount) => {
    await addDiscount({
       ...discount,
       code: `${discount.code}-COPY`,
    });
  };

  const handleUpdateDiscount = () => {
    if (editDiscountPayload) {
      updateDiscount(editDiscountPayload.id, editDiscountPayload);
      toast.success("Discount updated successfully!");
      setEditDiscountPayload(null);
    }
  };

  const handleCreateDiscount = async () => {
    const payload: Omit<Discount, "id" | "usageCount"> = {
      ...newDiscount,
      value: newDiscount.type === "buy_x_get_y" ? 0 : newDiscount.value,
      startDate: newDiscount.startDate || "",
      endDate: newDiscount.endDate || "",
      // Convert 0 → undefined so db-queries.ts `?? null` sets NULL in DB
      // (0 means "unlimited"/"no restriction" for these fields)
      minPurchase: newDiscount.minPurchase || undefined,
      maxDiscount: newDiscount.maxDiscount || undefined,
      usageLimit: newDiscount.usageLimit || undefined,
    };
    await addDiscount(payload);
    setIsCreateDialogOpen(false);
    setNewDiscount({
      code: "",
      type: "percentage",
      value: 10,
      buyQuantity: 2,
      getQuantity: 1,
      productIds: [],
      minPurchase: 0,
      maxDiscount: 0,
      usageLimit: 0,
      startDate: "",
      endDate: "",
      isActive: true,
    });
  };

  const handleToggleActive = (discountId: string, isActive: boolean) => {
    updateDiscount(discountId, { isActive });
  };

  function getDiscountStatus(discount: Discount) {
    const now = new Date();
    const start = discount.startDate ? new Date(discount.startDate) : null;
    const end = discount.endDate ? new Date(discount.endDate) : null;

    if (!discount.isActive) return { label: "Inactive", variant: "secondary" as const };
    if (start && start > now) return { label: "Scheduled", variant: "outline" as const };
    if (end && end < now) return { label: "Expired", variant: "destructive" as const };
    return { label: "Active", variant: "default" as const };
  }

  const activeCount = discounts.filter((d) => d.isActive).length;
  const totalUsage = discounts.reduce((sum, d) => sum + d.usageCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Discounts & Coupons</h1>
          <p className="text-muted-foreground">
            Manage promotional codes and discounts
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Discount
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create New Discount</DialogTitle>
              <DialogDescription>
                Set up a new promotional code for your customers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Discount Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., SUMMER20"
                  value={newDiscount.code}
                  onChange={(e) =>
                    setNewDiscount({ ...newDiscount, code: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Discount Type</Label>
                <Select
                  value={newDiscount.type}
                  onValueChange={(value: Discount["type"]) =>
                    setNewDiscount({ ...newDiscount, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Off</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="buy_x_get_y">Buy X Get Y Free</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newDiscount.type === "buy_x_get_y" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buyQuantity">Buy Quantity</Label>
                    <Input
                      id="buyQuantity"
                      type="number"
                      min="1"
                      value={newDiscount.buyQuantity}
                      onChange={(e) =>
                        setNewDiscount({ ...newDiscount, buyQuantity: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="getQuantity">Get Free</Label>
                    <Input
                      id="getQuantity"
                      type="number"
                      min="1"
                      value={newDiscount.getQuantity}
                      onChange={(e) =>
                        setNewDiscount({ ...newDiscount, getQuantity: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="value">
                  {newDiscount.type === "percentage"
                    ? "Percentage"
                    : newDiscount.type === "fixed"
                    ? "Amount (PKR)"
                    : "Value (not used for BOGO)"}
                </Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  value={newDiscount.value}
                  disabled={newDiscount.type === "buy_x_get_y"}
                  onChange={(e) =>
                    setNewDiscount({ ...newDiscount, value: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minPurchase">Min. Purchase</Label>
                  <Input
                    id="minPurchase"
                    type="number"
                    min="0"
                    value={newDiscount.minPurchase}
                    onChange={(e) =>
                      setNewDiscount({
                        ...newDiscount,
                        minPurchase: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usageLimit">Usage Limit</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    min="0"
                    placeholder="Unlimited"
                    value={newDiscount.usageLimit || ""}
                    onChange={(e) =>
                      setNewDiscount({
                        ...newDiscount,
                        usageLimit: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date & Time</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={newDiscount.startDate}
                    onChange={(e) =>
                      setNewDiscount({ ...newDiscount, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date & Time</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={newDiscount.endDate}
                    onChange={(e) =>
                      setNewDiscount({ ...newDiscount, endDate: e.target.value })
                    }
                  />
                </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDiscount} disabled={!newDiscount.code}>
                Create Discount
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{discounts.length}</p>
            <p className="text-sm text-muted-foreground">Total Discounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totalUsage}</p>
            <p className="text-sm text-muted-foreground">Total Uses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{formatPrice(45000)}</p>
            <p className="text-sm text-muted-foreground">Total Savings</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search discount codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Discounts List */}
      <div className="grid gap-4">
        {filteredDiscounts.map((discount) => {
          const status = getDiscountStatus(discount);
          const usagePercentage = discount.usageLimit
            ? (discount.usageCount / discount.usageLimit) * 100
            : 0;

          return (
            <Card
              key={discount.id}
              className={cn(
                "transition-opacity",
                status.label === "Inactive" && "opacity-60"
              )}
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Discount Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Tag className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold font-mono">
                            {discount.code}
                          </h3>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {discountTypeLabels[discount.type]}
                          {discount.type === "percentage" && ` - ${discount.value}% off`}
                          {discount.type === "fixed" && ` - ${formatPrice(discount.value)} off`}
                          {discount.type === "buy_x_get_y" && ` - Buy ${discount.buyQuantity} Get ${discount.getQuantity}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-3">
                      {discount.minPurchase && discount.minPurchase > 0 && (
                        <span>Min. purchase: {formatPrice(discount.minPurchase)}</span>
                      )}
                      {discount.maxDiscount && discount.maxDiscount > 0 && (
                        <span>Max. discount: {formatPrice(discount.maxDiscount)}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {discount.startDate
                          ? new Date(discount.startDate).toLocaleString("en-PK", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Always"}
                        {" — "}
                        {discount.endDate
                          ? new Date(discount.endDate).toLocaleString("en-PK", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "No expiry"}
                      </span>
                    </div>
                  </div>

                  {/* Usage */}
                  <div className="sm:w-48">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {discount.usageCount} / {discount.usageLimit || "∞"}
                      </span>
                      <span className="text-xs text-muted-foreground">uses</span>
                    </div>
                    {discount.usageLimit && (
                      <Progress value={usagePercentage} className="h-2" />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={discount.isActive}
                        onCheckedChange={(checked) =>
                          handleToggleActive(discount.id, checked)
                        }
                      />
                      <span className="text-sm">Active</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditDiscountPayload(discount)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateDiscount(discount)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => deleteDiscount(discount.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredDiscounts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No discounts found</p>
              <p className="text-muted-foreground mb-6">
                Create your first discount code to get started.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Discount
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!editDiscountPayload} onOpenChange={(open) => !open && setEditDiscountPayload(null)}>
        <DialogContent className="max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Discount</DialogTitle>
            <DialogDescription>
              Update the details of your promotional code.
            </DialogDescription>
          </DialogHeader>
          {editDiscountPayload && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Discount Code</Label>
                <Input
                  id="edit-code"
                  placeholder="e.g., SUMMER20"
                  value={editDiscountPayload.code}
                  onChange={(e) =>
                    setEditDiscountPayload({ ...editDiscountPayload, code: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Discount Type</Label>
                <Select
                  value={editDiscountPayload.type}
                  onValueChange={(value: Discount["type"]) =>
                    setEditDiscountPayload({ ...editDiscountPayload, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Off</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="buy_x_get_y">Buy X Get Y Free</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editDiscountPayload.type === "buy_x_get_y" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-buyQuantity">Buy Quantity</Label>
                    <Input
                      id="edit-buyQuantity"
                      type="number"
                      min="1"
                      value={editDiscountPayload.buyQuantity || 2}
                      onChange={(e) =>
                        setEditDiscountPayload({
                          ...editDiscountPayload,
                          buyQuantity: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-getQuantity">Get Free</Label>
                    <Input
                      id="edit-getQuantity"
                      type="number"
                      min="1"
                      value={editDiscountPayload.getQuantity || 1}
                      onChange={(e) =>
                        setEditDiscountPayload({
                          ...editDiscountPayload,
                          getQuantity: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-value">
                  {editDiscountPayload.type === "percentage"
                    ? "Percentage"
                    : editDiscountPayload.type === "fixed"
                    ? "Amount (PKR)"
                    : "Value (not used for BOGO)"}
                </Label>
                <Input
                  id="edit-value"
                  type="number"
                  min="0"
                  value={editDiscountPayload.value}
                  disabled={editDiscountPayload.type === "buy_x_get_y"}
                  onChange={(e) =>
                    setEditDiscountPayload({ ...editDiscountPayload, value: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-minPurchase">Min. Purchase</Label>
                  <Input
                    id="edit-minPurchase"
                    type="number"
                    min="0"
                    value={editDiscountPayload.minPurchase || ""}
                    onChange={(e) =>
                      setEditDiscountPayload({
                        ...editDiscountPayload,
                        minPurchase: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-usageLimit">Usage Limit</Label>
                  <Input
                    id="edit-usageLimit"
                    type="number"
                    min="0"
                    placeholder="Unlimited"
                    value={editDiscountPayload.usageLimit || ""}
                    onChange={(e) =>
                      setEditDiscountPayload({
                        ...editDiscountPayload,
                        usageLimit: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-startDate">Start Date & Time</Label>
                  <Input
                    id="edit-startDate"
                    type="datetime-local"
                    value={editDiscountPayload.startDate}
                    onChange={(e) =>
                      setEditDiscountPayload({ ...editDiscountPayload, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endDate">End Date & Time</Label>
                  <Input
                    id="edit-endDate"
                    type="datetime-local"
                    value={editDiscountPayload.endDate}
                    onChange={(e) =>
                      setEditDiscountPayload({ ...editDiscountPayload, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDiscountPayload(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDiscount} disabled={!editDiscountPayload?.code}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
