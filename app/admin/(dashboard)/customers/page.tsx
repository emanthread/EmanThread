"use client";

import { useState, useEffect, useCallback } from "react";
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
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Ruler,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useDebounce } from "@/hooks/use-debounce";
import { type Customer } from "@/lib/admin-store";
import { GARMENT_TYPES_BY_GENDER, garmentTypeLabel } from "@/lib/validators/measurements-unified";

const PAGE_SIZE = 25;

interface PaginatedCustomers {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminCustomersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [currentPage, setCurrentPage] = useState(1);

  const [data, setData] = useState<PaginatedCustomers>({
    customers: [],
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [viewProfileCustomer, setViewProfileCustomer] = useState<Customer | null>(null);
  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add Customer State
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "", city: "" });

  // View Measurements State
  const [viewMeasurementsCustomer, setViewMeasurementsCustomer] = useState<Customer | null>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(false);

  // Create Measurement Setup State
  const [createMeasurementOpen, setCreateMeasurementOpen] = useState(false);
  const [createMeasurementForm, setCreateMeasurementForm] = useState({ profileName: "", gender: "Male", garmentType: "male_shalwar_kameez" });
  const [isCreatingMeasurement, setIsCreatingMeasurement] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchCustomers = useCallback(async (page: number, search: string, status: string, showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_SIZE.toString(),
      });
      if (search) params.set("search", search);
      if (status && status !== "all") params.set("status", status);

      const res = await fetch(`/api/admin/customers?${params}`);
      if (!res.ok) throw new Error("Failed to load customers");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Load customers error:", err);
      toast.error("Failed to load customers");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchCustomers(1, debouncedSearch, statusFilter);
  }, [debouncedSearch, statusFilter, fetchCustomers]);

  useEffect(() => {
    fetchCustomers(currentPage, debouncedSearch, statusFilter);
  }, [currentPage, fetchCustomers, debouncedSearch, statusFilter]);

  const sortedCustomers = [...data.customers].sort((a, b) => {
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCustomers(currentPage, debouncedSearch, statusFilter, false);
  };

  const handleExportCustomers = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["ID,Name,Email,Phone,City,Local Customer,Total Orders,Total Spent,Join Date"]
        .concat(
          data.customers.map(
            (c) =>
              `${c.id},"${c.name}","${c.email}","${c.phone}","${c.city}",${c.isAdminCreated ? "Yes" : "No"},${c.totalOrders},${c.totalSpent},${new Date(c.createdAt).toLocaleDateString()}`
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

  const handleDeleteCustomer = async () => {
    if (!deleteCustomerTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/customers/${deleteCustomerTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete customer");
      toast.success("Customer deleted successfully");
      setDeleteCustomerTarget(null);
      await fetchCustomers(currentPage, debouncedSearch, statusFilter, false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete customer");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");
      
      toast.success("Customer created successfully. A password setup email has been sent.");
      setAddCustomerOpen(false);
      setAddForm({ name: "", email: "", phone: "", city: "" });
      fetchCustomers(1, debouncedSearch, statusFilter);
    } catch (err: any) {
      toast.error(err.message || "Failed to create customer");
    } finally {
      setIsAdding(false);
    }
  };

  const handleViewMeasurements = async (customer: Customer) => {
    setViewMeasurementsCustomer(customer);
    setIsLoadingMeasurements(true);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}/measurements`);
      if (!res.ok) throw new Error("Failed to load measurements");
      const data = await res.json();
      setMeasurements(data.profiles || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load measurements");
    } finally {
      setIsLoadingMeasurements(false);
    }
  };

  const handleOpenCreateMeasurement = () => {
    setCreateMeasurementForm({ profileName: "", gender: "Male", garmentType: "male_shalwar_kameez" });
    setCreateMeasurementOpen(true);
  };

  const submitCreateMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewMeasurementsCustomer) return;
    setIsCreatingMeasurement(true);
    try {
      const res = await fetch(`/api/admin/customers/${viewMeasurementsCustomer.id}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileName: createMeasurementForm.profileName || undefined,
          gender: createMeasurementForm.gender,
          garmentType: createMeasurementForm.garmentType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create measurement profile");
      
      setCreateMeasurementOpen(false);
      router.push(`/admin/measurements/profile/${data.profile.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create measurement profile");
    } finally {
      setIsCreatingMeasurement(false);
    }
  };

  return (
    <div className="space-y-6">
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
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCustomers}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setAddCustomerOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{data.total}</p>
            <p className="text-sm text-muted-foreground">Total Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{data.totalPages}</p>
            <p className="text-sm text-muted-foreground">Total Pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{data.customers.length}</p>
            <p className="text-sm text-muted-foreground">Showing</p>
          </CardContent>
        </Card>
      </div>

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
              {searchQuery !== debouncedSearch && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  Searching…
                </span>
              )}
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
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

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted/40 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {sortedCustomers.map((customer) => {
              const initials = customer.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase();

              return (
                <Card key={customer.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
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
                            {customer.isAdminCreated && (
                              <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                                Local Customer
                              </Badge>
                            )}
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
                          {customer.isAdminCreated && (
                            <DropdownMenuItem onClick={() => handleViewMeasurements(customer)}>
                              <Ruler className="h-4 w-4 mr-2" />
                              View Measurements
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => router.push("/admin/orders?search=" + encodeURIComponent(customer.email || customer.name))}>
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

            {sortedCustomers.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No customers found</p>
                </CardContent>
              </Card>
            )}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, data.total)} of {data.total} customers
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2">
                  Page {currentPage} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={currentPage >= data.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* View Profile Dialog */}
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
                  {viewProfileCustomer.isAdminCreated && (
                    <Badge variant="outline" className="ml-2 border-blue-200 text-blue-700 bg-blue-50">
                      Local Customer
                    </Badge>
                  )}
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
              This action cannot be undone. The customer&apos;s account and all associated data
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
              onClick={handleDeleteCustomer}
            >
              {isDeleting ? "Deleting..." : "Delete Customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Local Customer</DialogTitle>
            <DialogDescription>
              Create an account for an in-store customer. A password setup link will be emailed to them.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCustomer} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
              <Input id="name" required value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input id="email" type="email" required value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={addForm.city} onChange={e => setAddForm({...addForm, city: e.target.value})} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setAddCustomerOpen(false)} disabled={isAdding}>
                Cancel
              </Button>
              <Button type="submit" disabled={isAdding}>
                {isAdding ? "Adding..." : "Add Customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Measurements Dialog */}
      <Dialog open={!!viewMeasurementsCustomer} onOpenChange={() => setViewMeasurementsCustomer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Measurement Profiles for {viewMeasurementsCustomer?.name}</DialogTitle>
            <DialogDescription>
              View and manage measurement profiles created by admin for this local customer.
            </DialogDescription>
          </DialogHeader>
          {isLoadingMeasurements ? (
            <div className="py-8 flex justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              {measurements.length === 0 ? (
                <div className="text-center py-8 bg-muted/20 rounded-lg">
                  <Ruler className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground">No admin-created measurements found for this customer.</p>
                  <Button className="mt-4" onClick={handleOpenCreateMeasurement}>
                    Create Measurement Profile
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      This customer has admin-created measurement profiles.
                    </p>
                    <Button size="sm" onClick={handleOpenCreateMeasurement}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create New Profile
                    </Button>
                  </div>
                  {measurements.map(profile => (
                    <Card key={profile.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{profile.profileName}</p>
                          <p className="text-sm text-muted-foreground mt-1 capitalize">
                            {profile.gender} • {profile.garmentType.replace(/_/g, " ")}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => router.push(`/admin/measurements/profile/${profile.id}`)}>
                          Edit / Print
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Measurement Setup Dialog */}
      <Dialog open={createMeasurementOpen} onOpenChange={setCreateMeasurementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile Details</DialogTitle>
            <DialogDescription>
              Set the name, gender, and garment category before filling in measurements.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreateMeasurement} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Profile Name</Label>
              <Input
                value={createMeasurementForm.profileName}
                onChange={(e) => setCreateMeasurementForm({ ...createMeasurementForm, profileName: e.target.value })}
                placeholder="e.g. Wedding Suit, Casual"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={createMeasurementForm.gender}
                onValueChange={(val) => setCreateMeasurementForm({
                  ...createMeasurementForm,
                  gender: val,
                  garmentType: val === "Male" ? "male_shalwar_kameez" : "female_simple_shalwar"
                })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Garment Type</Label>
              <Select
                value={createMeasurementForm.garmentType}
                onValueChange={(val) => setCreateMeasurementForm({ ...createMeasurementForm, garmentType: val })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(createMeasurementForm.gender === "Female" ? GARMENT_TYPES_BY_GENDER.Female : GARMENT_TYPES_BY_GENDER.Male).map((gt) => (
                    <SelectItem key={gt} value={gt}>
                      {garmentTypeLabel(gt).replace(/^(Men |Ladies )/, "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateMeasurementOpen(false)} disabled={isCreatingMeasurement}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingMeasurement}>
                {isCreatingMeasurement ? "Creating..." : "Continue"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
