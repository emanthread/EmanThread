"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  MoreHorizontal,
  Eye,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  Calendar,
  Download,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useAdminStore, type Customer } from "@/lib/admin-store";

export default function AdminCustomersPage() {
  const router = useRouter();
  const { customers, loadCustomers, deleteCustomer } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [viewProfileCustomer, setViewProfileCustomer] = useState<Customer | null>(null);
  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = customers
    .filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery);
      const matchesStatus =
        statusFilter === "all" || customer.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
        case "spent":
          return b.totalSpent - a.totalSpent;
        case "orders":
          return b.totalOrders - a.totalOrders;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === "active").length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalOrders = customers.reduce((sum, c) => sum + c.totalOrders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const handleExportCustomers = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["ID,Name,Email,Phone,City,Total Orders,Total Spent,Join Date"]
        .concat(
          filteredCustomers.map(
            (c) =>
              `${c.id},"${c.name}","${c.email}","${c.phone}","${c.city}",${c.totalOrders},${c.totalSpent},${new Date(c.createdAt).toLocaleDateString()}`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "customers_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-muted-foreground">
            Manage and view customer information
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              setIsRefreshing(true);
              await loadCustomers();
              setIsRefreshing(false);
            }}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCustomers}>
            <Download className="h-4 w-4 mr-2" />
            Export Customers
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totalCustomers}</p>
            <p className="text-sm text-muted-foreground">Total Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{activeCustomers}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{formatPrice(totalRevenue)}</p>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{formatPrice(Math.round(avgOrderValue))}</p>
            <p className="text-sm text-muted-foreground">Avg. Order Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="spent">Highest Spent</SelectItem>
                <SelectItem value="orders">Most Orders</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Quick Segments:</span>
          <Badge variant="secondary">VIP ({customers.filter((c) => c.totalSpent > 80000).length})</Badge>
          <Badge variant="secondary">Frequent ({customers.filter((c) => c.totalOrders >= 10).length})</Badge>
          <Badge variant="secondary">At Risk ({customers.filter((c) => c.status === "inactive").length})</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredCustomers.map((customer) => {
          const initials = customer.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase();

          return (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Customer Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{customer.name}</h3>
                        <Badge
                          variant="secondary"
                          className={cn(
                            customer.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          )}
                        >
                          {customer.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 truncate max-w-[200px] sm:max-w-none" title={customer.email}>
                          <Mail className="h-4 w-4 shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {customer.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {customer.city}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-8 w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <ShoppingBag className="h-4 w-4" />
                        <span className="text-xs">Orders</span>
                      </div>
                      <p className="text-xl font-bold">{customer.totalOrders}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Total Spent</div>
                      <p className="text-xl font-bold">{formatPrice(customer.totalSpent)}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs">Last Order</span>
                      </div>
                      <p className="text-sm font-medium">
                        {new Date(customer.lastOrderDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewProfileCustomer(customer)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/admin/orders")}>
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        View Orders
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        if (!customer.email || customer.email.trim() === "") {
                          toast.error("No email address found for this customer.");
                        } else {
                          window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(customer.email)}`, '_blank');
                        }
                      }}>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteCustomerTarget(customer)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Customer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredCustomers.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No customers found</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!viewProfileCustomer} onOpenChange={() => setViewProfileCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer Profile</DialogTitle>
            <DialogDescription>
              Detailed view of the customer&apos;s information.
            </DialogDescription>
          </DialogHeader>
          {viewProfileCustomer && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                    {viewProfileCustomer.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{viewProfileCustomer.name}</h3>
                  <Badge variant={viewProfileCustomer.status === "active" ? "default" : "secondary"}>
                    {viewProfileCustomer.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div>
                  <span className="text-muted-foreground block mb-1">Email</span>
                  <p className="font-medium">{viewProfileCustomer.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Phone</span>
                  <p className="font-medium">{viewProfileCustomer.phone}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">City</span>
                  <p className="font-medium">{viewProfileCustomer.city}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Customer Since</span>
                  <p className="font-medium">{new Date(viewProfileCustomer.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Total Orders</span>
                  <p className="font-medium">{viewProfileCustomer.totalOrders}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Total Spent</span>
                  <p className="font-medium">{formatPrice(viewProfileCustomer.totalSpent)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteCustomerTarget} onOpenChange={() => setDeleteCustomerTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Customer
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteCustomerTarget?.name}</strong>?
              This action cannot be undone. The customer's account and all associated data
              (addresses, reviews, measurements) will be permanently removed. Order history
              will be preserved but disassociated from this customer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteCustomerTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={async () => {
                if (!deleteCustomerTarget) return;
                setIsDeleting(true);
                await deleteCustomer(deleteCustomerTarget.id);
                setIsDeleting(false);
                setDeleteCustomerTarget(null);
              }}
            >
              {isDeleting ? "Deleting..." : "Delete Customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
