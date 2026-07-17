"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { adminFetch, adminResponseError } from "@/lib/admin-fetch";

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type PaymentMethod = "cod" | "jazzcash" | "easypaisa" | "card";

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  sku: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    address: string;
    city: string;
    province: string;
    postalCode: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  stitchingFee?: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  sku: string;
  slug: string;
  price: number;
  originalPrice?: number;
  fabricType: string;
  color: string;
  colorHex: string;
  images: string[];
  videoUrl?: string;
  badge?: string;
  inStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  description: string;
  longDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
  tags: string[];
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Discount {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "buy_x_get_y";
  value: number;
  buyQuantity?: number;
  getQuantity?: number;
  productIds?: string[];
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Notification {
  id: string;
  type: "order" | "low_stock" | "return_request" | "review";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface NotificationLogEntry {
  id: string;
  orderId: string;
  channel: string;
  template: string;
  recipient: string;
  subject?: string | null;
  content?: string | null;
  status: string;
  providerRef?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  totalCustomers: number;
  customersChange: number;
  averageOrderValue: number;
  aovChange: number;
  // Note: pendingOrders / lowStockItems / returnRequests have moved to AlertCounts
  // and are sourced from /api/admin/alerts (single source of truth).
  totalReviews: number;
  averageRating: number;
}

export interface AlertCounts {
  newOrders: number;
  newOrdersLatest: string | null;
  pendingReturns: number;
  pendingReturnsLatest: string | null;
  lowStockProducts: number;
  lowStockLatest: string | null;
  backlogOrders: number;
  backlogOrdersLatest: string | null;
  total: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
}

export interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
  image: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled";
  type: "refund" | "exchange";
  reason: string;
  notes?: string;
  items: {
    id: string;
    orderItemId: string;
    quantity: number;
    reason?: string;
    condition?: string;
  }[];
  refundAmount?: number;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingZone {
  id: string;
  name: string;
  cities: string[];
  provinces: string[];
  shippingRate: number;
  estimatedDays: string;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  status: "active" | "inactive";
  isAdminCreated?: boolean;
  createdAt: string;
}

interface AdminState {
  orders: Order[];
  ordersTotal: number;
  ordersPage: number;
  ordersTotalPages: number;
  products: AdminProduct[];
  productsTotal: number;
  productsPage: number;
  productsTotalPages: number;
  customers: Customer[];
  discounts: Discount[];
  notifications: Notification[];
  notificationLogs: NotificationLogEntry[];
  stats: DashboardStats;
  statsError: string | null; // A4.5
  // Alert counts — single source of truth sourced from /api/admin/alerts
  alertCounts: AlertCounts;
  // Recent orders for the dashboard table — fetched on-demand, not bundled in analytics poll
  recentOrders: RecentOrderRow[];
  recentOrdersLoading: boolean;
  // Low stock products for the dashboard card — fetched on-demand, not from loadProducts()
  lowStockProducts: LowStockProduct[];
  revenueOverview: RevenueDataPoint[];
  topProducts: TopProduct[];
  returnRequests: ReturnRequest[];
  shippingZones: ShippingZone[];
  sidebarOpen: boolean;

  // Loaders
  loadOrders: (status?: string, page?: number, limit?: number, search?: string) => Promise<void>;
  loadProducts: (page?: number, limit?: number, search?: string, category?: string, stock?: string, signal?: AbortSignal) => Promise<void>;
  loadCustomers: () => Promise<void>;
  loadStats: () => Promise<void>;
  /** Fetches alert counts from /api/admin/alerts — shared between layout & dashboard */
  loadAlerts: () => Promise<void>;
  loadRecentOrders: () => Promise<void>;
  /** Fetches low-stock products for the dashboard card — works on fresh visit, no dependency on loadProducts() */
  loadLowStockProducts: () => Promise<void>;
  loadDiscounts: () => Promise<void>;
  loadNotificationLogs: (orderId: string) => Promise<void>;
  loadRevenueOverview: (timeRange: string) => Promise<void>;
  loadTopProducts: () => Promise<void>;
  loadReturnRequests: () => Promise<void>;
  loadShippingZones: () => Promise<void>;
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  
  deleteOrder: (orderId: string) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updatePaymentStatus: (orderId: string, status: PaymentStatus) => Promise<void>;
  
  deleteProduct: (productId: string) => Promise<void>;
  updateProduct: (productId: string, data: Partial<AdminProduct>) => Promise<AdminProduct>;
  updateProductStock: (productId: string, quantity: number) => Promise<AdminProduct>;
  addProduct: (product: AdminProduct) => Promise<AdminProduct>;
  
  addDiscount: (discount: Omit<Discount, "id" | "usageCount">) => Promise<void>;
  updateDiscount: (discountId: string, data: Partial<Discount>) => Promise<void>;
  deleteDiscount: (discountId: string) => Promise<void>;
  
  updateReturnRequestStatus: (requestId: string, status: "approved" | "rejected" | "completed" | "pending" | "cancelled", refundAmount?: number) => Promise<void>;
  updateReturnRequest: (requestId: string, data: { type?: string; reason?: string; notes?: string; refundAmount?: number }) => Promise<void>;
  deleteReturnRequest: (requestId: string) => Promise<void>;
  
  addShippingZone: (zone: Omit<ShippingZone, "id" | "createdAt">) => Promise<void>;
  updateShippingZone: (zoneId: string, data: Partial<ShippingZone>) => Promise<void>;
  deleteShippingZone: (zoneId: string) => Promise<void>;
  
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  getUnreadCount: () => number;
}

const defaultStats: DashboardStats = {
  totalRevenue: 0,
  revenueChange: 0,
  totalOrders: 0,
  ordersChange: 0,
  totalCustomers: 0,
  customersChange: 0,
  averageOrderValue: 0,
  aovChange: 0,
  totalReviews: 0,
  averageRating: 0,
};

const defaultAlertCounts: AlertCounts = {
  newOrders: 0,
  newOrdersLatest: null,
  pendingReturns: 0,
  pendingReturnsLatest: null,
  lowStockProducts: 0,
  lowStockLatest: null,
  backlogOrders: 0,
  backlogOrdersLatest: null,
  total: 0,
};

// Typed alias for recent orders row (matches getAdminRecentOrders return element)
export interface RecentOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: {
    productId: string;
    productName: string;
    productImage: string;
    quantity: number;
    price: number;
    sku: string;
  }[];
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";
  createdAt: string;
}

// Typed alias for low stock product row (matches getAdminLowStockProducts return element)
export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  images: string[];
  stockQuantity: number;
  lowStockThreshold: number;
}

export const useAdminStore = create<AdminState>()(  
  persist(
    (set, get) => ({
      orders: [],
      ordersTotal: 0,
      ordersPage: 1,
      ordersTotalPages: 0,
      products: [],
      productsTotal: 0,
      productsPage: 1,
      productsTotalPages: 0,
      customers: [],
      discounts: [],
      notifications: [],
      notificationLogs: [],
      stats: defaultStats,
      statsError: null, // A4.5
      alertCounts: defaultAlertCounts,
      recentOrders: [] as RecentOrderRow[],
      recentOrdersLoading: false,
      lowStockProducts: [] as LowStockProduct[],
      revenueOverview: [],
      topProducts: [],
      returnRequests: [],
      shippingZones: [],
      sidebarOpen: true,

      loadOrders: async (status = "all", page = 1, limit = 50, search = "") => {
        try {
          const url = new URL("/api/admin/orders", window.location.origin);
          if (status && status !== "all") url.searchParams.set("status", status);
          url.searchParams.set("page", page.toString());
          url.searchParams.set("limit", limit.toString());
          if (search) url.searchParams.set("search", search);

          const res = await adminFetch(url.toString());
          if (!res.ok) throw await adminResponseError(res, "Failed to load orders");
          const data = await res.json();
          set({ 
            orders: data.orders || [],
            ordersTotal: data.total || 0,
            ordersPage: data.page || 1,
            ordersTotalPages: data.totalPages || 0
          });
        } catch (err) {
          console.error("Failed to load orders:", err);
          toast.error(err instanceof Error ? err.message : "Failed to load orders", {
            id: "admin-orders-load",
          });
        }
      },

      loadProducts: async (page = 1, limit = 50, search = "", category = "", stock = "", signal?: AbortSignal) => {
        try {
          const url = new URL("/api/admin/products", window.location.origin);
          url.searchParams.set("page", page.toString());
          url.searchParams.set("limit", limit.toString());
          if (search) url.searchParams.set("search", search);
          if (category && category !== "all") url.searchParams.set("category", category);
          if (stock && stock !== "all") url.searchParams.set("stock", stock);

          const res = await adminFetch(url.toString(), { signal });
          if (!res.ok) {
            const errorData = await res.json().catch(() => null);
            throw new Error(errorData?.error || "Failed to load products");
          }
          const data = await res.json();
          set({ 
            products: data.products || [],
            productsTotal: data.total || 0,
            productsPage: data.page || 1,
            productsTotalPages: data.totalPages || 0
          });
        } catch (err) {
          // Silently ignore intentional aborts (AbortController fired on filter change)
          if (err instanceof DOMException && err.name === "AbortError") return;
          console.error("Failed to load products:", err);
          toast.error(err instanceof Error ? err.message : "Failed to load products");
        }
      },

      loadCustomers: async () => {
        try {
          const res = await adminFetch("/api/admin/customers");
          if (!res.ok) throw await adminResponseError(res, "Failed to load customers");
          const data = await res.json();
          set({ customers: data || [] });
        } catch (err) {
          console.error("Failed to load customers:", err);
          toast.error(err instanceof Error ? err.message : "Failed to load customers", {
            id: "admin-customers-load",
          });
        }
      },

      loadStats: async () => {
        try {
          const res = await adminFetch("/api/admin/analytics");
          if (!res.ok) { set({ statsError: "Failed to load data" }); return; } // A4.5
          const data = await res.json();
          set({
            stats: {
              // Analytics-only metrics (pending counts removed — they live in alertCounts)
              totalRevenue: data.totalRevenue ?? 0,
              revenueChange: data.revenueChange ?? 0,
              totalOrders: data.totalOrders ?? 0,
              ordersChange: data.ordersChange ?? 0,
              totalCustomers: data.totalCustomers ?? 0,
              customersChange: data.customersChange ?? 0,
              averageOrderValue: data.averageOrderValue ?? 0,
              aovChange: data.aovChange ?? 0,
              totalReviews: data.totalReviews ?? 0,
              averageRating: data.averageRating ?? 0,
            },
            statsError: null, // A4.5
          });
        } catch (err) {
          console.error("Failed to load stats:", err);
          set({ statsError: "Failed to load data" }); // A4.5
        }
      },

      loadAlerts: async () => {
        // Don't poll when tab is hidden — saves mobile battery/data
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
        try {
          const res = await adminFetch("/api/admin/alerts");
          if (!res.ok) throw await adminResponseError(res, "Failed to load alerts");
          const data = await res.json();
          set({ alertCounts: data });
        } catch (err) {
          console.error("Failed to load alerts:", err);
        }
      },

      loadRecentOrders: async () => {
        set({ recentOrdersLoading: true });
        try {
          const res = await adminFetch("/api/admin/analytics/recent-orders");
          if (!res.ok) throw await adminResponseError(res, "Failed to load recent orders");
          const data = await res.json();
          set({ recentOrders: data || [] });
        } catch (err) {
          console.error("Failed to load recent orders:", err);
          toast.error(err instanceof Error ? err.message : "Failed to load dashboard data", {
            id: "admin-dashboard-load",
          });
        } finally {
          set({ recentOrdersLoading: false });
        }
      },

      loadLowStockProducts: async () => {
        try {
          const res = await adminFetch("/api/admin/analytics/low-stock");
          if (!res.ok) throw await adminResponseError(res, "Failed to load low stock products");
          const data = await res.json();
          set({ lowStockProducts: data || [] });
        } catch (err) {
          console.error("Failed to load low stock products:", err);
          toast.error(err instanceof Error ? err.message : "Failed to load dashboard data", {
            id: "admin-dashboard-load",
          });
        }
      },

      loadDiscounts: async () => {
        try {
          const res = await adminFetch("/api/admin/discounts");
          if (!res.ok) throw await adminResponseError(res, "Failed to load discounts");
          const data = await res.json();
          set({ discounts: data || [] });
        } catch (err) {
          console.error("Failed to load discounts:", err);
          toast.error(err instanceof Error ? err.message : "Failed to load discounts", {
            id: "admin-discounts-load",
          });
        }
      },

      loadNotificationLogs: async (orderId) => {
        try {
          const res = await adminFetch(`/api/notifications/logs/${orderId}`);
          if (!res.ok) throw await adminResponseError(res, "Failed to load notification logs");
          const data = await res.json();
          set({ notificationLogs: data.logs || [] });
        } catch (err) {
          console.error("Failed to load notification logs:", err);
          toast.error(err instanceof Error ? err.message : "Failed to load notification logs", {
            id: "admin-notification-logs-load",
          });
        }
      },

      loadRevenueOverview: async (timeRange) => {
        try {
          const res = await adminFetch(`/api/admin/analytics/revenue?timeRange=${timeRange}`);
          if (!res.ok) throw await adminResponseError(res, "Failed to load revenue overview");
          const data = await res.json();
          set({ revenueOverview: data || [] });
        } catch (err) {
          console.error("Failed to load revenue overview:", err);
          toast.error(err instanceof Error ? err.message : "Failed to load dashboard data", {
            id: "admin-dashboard-load",
          });
        }
      },

      loadTopProducts: async () => {
        try {
          const res = await adminFetch("/api/admin/analytics/top-products");
          if (!res.ok) throw await adminResponseError(res, "Failed to load top products");
          const data = await res.json();
          set({ topProducts: data || [] });
        } catch (err) {
          console.error("Failed to load top products:", err);
          toast.error(err instanceof Error ? err.message : "Failed to load dashboard data", {
            id: "admin-dashboard-load",
          });
        }
      },

      loadReturnRequests: async () => {
        try {
          const res = await adminFetch("/api/admin/returns");
          if (!res.ok) throw await adminResponseError(res, "Failed to load return requests");
          const data = await res.json();
          set({ returnRequests: data.returnRequests || [] });
        } catch (err) {
          console.error("Failed to load return requests:", err);
          toast.error(err instanceof Error ? err.message : "Failed to load return requests", {
            id: "admin-returns-load",
          });
        }
      },

      loadShippingZones: async () => {
        try {
          const res = await adminFetch("/api/admin/shipping/zones");
          if (!res.ok) throw await adminResponseError(res, "Failed to load shipping zones");
          const data = await res.json();
          set({ shippingZones: data.zones || [] });
        } catch (err) {
          console.error("Failed to load shipping zones:", err);
          toast.error(err instanceof Error ? err.message : "Failed to load shipping zones", {
            id: "admin-shipping-load",
          });
        }
      },

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      deleteCustomer: async (customerId) => {
        // Optimistic local update
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== customerId),
        }));
        try {
          const res = await adminFetch(`/api/admin/customers/${customerId}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to delete customer");
          toast.success("Customer deleted successfully");
        } catch (err) {
          console.error("Delete customer error:", err);
          toast.error(err instanceof Error ? err.message : "Failed to delete customer");
          // Revert by re-fetching
          await get().loadCustomers();
        }
      },

      deleteOrder: async (orderId) => {
        // Optimistic local update
        set((state) => ({
          orders: state.orders.filter((o) => o.id !== orderId),
        }));
        try {
          const res = await adminFetch(`/api/admin/orders/${orderId}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to delete order");
        } catch (err) {
          console.error("Delete order error:", err);
          // Revert by re-fetching
          await get().loadOrders();
        }
      },

      updateOrderStatus: async (orderId, status) => {
        // Optimistic local update
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? { ...order, status, updatedAt: new Date().toISOString() }
              : order
          ),
        }));
        try {
          const res = await adminFetch(`/api/admin/orders/${orderId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: status.toUpperCase() }),
          });
          if (!res.ok) throw new Error("Failed to update status");
        } catch (err) {
          console.error("Update order status error:", err);
          // Revert by re-fetching
          await get().loadOrders();
          throw err;
        }
      },

      updatePaymentStatus: async (orderId, status) => {
        // Optimistic local update
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? { ...order, paymentStatus: status, updatedAt: new Date().toISOString() }
              : order
          ),
        }));
        try {
          const res = await adminFetch(`/api/admin/orders/${orderId}/payment-status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentStatus: status }),
          });
          if (!res.ok) throw new Error("Failed to update payment status");
        } catch (err) {
          console.error("Update payment status error:", err);
          // Revert by re-fetching
          await get().loadOrders();
          throw err;
        }
      },

      deleteProduct: async (productId) => {
        try {
          const res = await adminFetch(`/api/admin/products/${productId}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to delete product");
          }
          toast.success("Product deleted successfully");
          // Remove immediately from local state — calling loadProducts() would bring
          // the product back because getAdminProducts() has no inStock filter and
          // the DELETE API only soft-deletes (sets inStock: false).
          set((state) => ({
            products: state.products.filter((p) => p.id !== productId),
          }));
        } catch (err) {
          console.error("Delete product error:", err);
          toast.error(err instanceof Error ? err.message : "Failed to delete product");
        }
      },

      updateProduct: async (productId, data) => {
        try {
          const res = await adminFetch(`/api/admin/products/${productId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to update product");
          }
          const updated = (await res.json()) as AdminProduct;
          set((state) => ({
            products: state.products.map((product) =>
              product.id === productId ? updated : product
            ),
          }));
          return updated;
        } catch (err) {
          console.error("Update product error:", err);
          throw err;
        }
      },

      updateProductStock: async (productId, quantity) => {
        try {
          const res = await adminFetch(`/api/admin/products/${productId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stockQuantity: quantity, inStock: quantity > 0 }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            throw new Error(data?.error || "Failed to update stock");
          }
          const updated = data as AdminProduct;
          set((state) => ({
            products: state.products.map((product) =>
              product.id === productId
                ? {
                    ...product,
                    stockQuantity: updated.stockQuantity,
                    inStock: updated.inStock,
                    updatedAt: updated.updatedAt,
                  }
                : product
            ),
          }));
          return updated;
        } catch (err) {
          console.error("Update stock error:", err);
          throw err;
        }
      },

      addProduct: async (product) => {
        try {
          const res = await adminFetch("/api/admin/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...product,
              fabricType: product.fabricType,
              badge: product.badge?.toUpperCase(),
            }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to create product");
          }
          const created = (await res.json()) as AdminProduct;
          set((state) => ({
            products: [created, ...state.products],
            productsTotal: state.productsTotal + 1,
          }));
          return created;
        } catch (err) {
          console.error("Add product error:", err);
          throw err;
        }
      },

      addDiscount: async (discount) => {
        try {
          const res = await adminFetch("/api/admin/discounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(discount),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to create discount");
          }
          toast.success("Discount created successfully!");
          await get().loadDiscounts();
        } catch (err) {
          console.error("Add discount error:", err);
          toast.error(err instanceof Error ? err.message : "Failed to create discount");
        }
      },

      updateDiscount: async (discountId, data) => {
        // Optimistic local update
        set((state) => ({
          discounts: state.discounts.map((discount) =>
            discount.id === discountId
              ? { ...discount, ...data }
              : discount
          ),
        }));
        try {
          const res = await adminFetch(`/api/admin/discounts/${discountId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error("Failed to update discount");
        } catch (err) {
          console.error("Update discount error:", err);
          // Revert by re-fetching
          await get().loadDiscounts();
        }
      },

      deleteDiscount: async (discountId) => {
        // Optimistic local update
        set((state) => ({
          discounts: state.discounts.filter((d) => d.id !== discountId),
        }));
        try {
          const res = await adminFetch(`/api/admin/discounts/${discountId}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to delete discount");
        } catch (err) {
          console.error("Delete discount error:", err);
          // Revert by re-fetching
          await get().loadDiscounts();
        }
      },

      updateReturnRequestStatus: async (requestId, status, refundAmount) => {
        // Optimistic local update
        set((state) => ({
          returnRequests: state.returnRequests.map((req) =>
            req.id === requestId
              ? { ...req, status, refundAmount: refundAmount ?? req.refundAmount, updatedAt: new Date().toISOString() }
              : req
          ),
        }));
        try {
          const res = await adminFetch(`/api/admin/returns/${requestId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: status.toUpperCase(), refundAmount }),
          });
          if (!res.ok) throw new Error("Failed to update return request status");
          // Re-load stats for top-level badge changes, but skip heavy returnRequests load
          await get().loadStats();
        } catch (err) {
          console.error("Update return request status error:", err);
          // Revert by re-fetching
          await get().loadReturnRequests();
        }
      },

      updateReturnRequest: async (requestId, data) => {
        try {
          const payload: Record<string, unknown> = {};
          if (data.type !== undefined) payload.type = data.type.toUpperCase();
          if (data.reason !== undefined) payload.reason = data.reason.toUpperCase();
          if (data.notes !== undefined) payload.notes = data.notes;
          if (data.refundAmount !== undefined) payload.refundAmount = data.refundAmount;

          const res = await adminFetch(`/api/admin/returns/${requestId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error("Failed to update return request");
          await get().loadReturnRequests();
        } catch (err) {
          console.error("Update return request error:", err);
        }
      },

      deleteReturnRequest: async (requestId) => {
        // Optimistic local update
        set((state) => ({
          returnRequests: state.returnRequests.filter((req) => req.id !== requestId),
        }));
        try {
          const res = await adminFetch(`/api/admin/returns/${requestId}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to delete return request");
          await get().loadStats();
        } catch (err) {
          console.error("Delete return request error:", err);
          // Revert by re-fetching
          await get().loadReturnRequests();
        }
      },

      addShippingZone: async (zone) => {
        try {
          const res = await adminFetch("/api/admin/shipping/zones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(zone),
          });
          if (!res.ok) throw new Error("Failed to create shipping zone");
          await get().loadShippingZones();
        } catch (err) {
          console.error("Add shipping zone error:", err);
          throw err;
        }
      },

      updateShippingZone: async (zoneId, data) => {
        try {
          const res = await adminFetch(`/api/admin/shipping/zones/${zoneId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error("Failed to update shipping zone");
          await get().loadShippingZones();
        } catch (err) {
          console.error("Update shipping zone error:", err);
        }
      },

      deleteShippingZone: async (zoneId) => {
        try {
          const res = await adminFetch(`/api/admin/shipping/zones/${zoneId}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to delete shipping zone");
          await get().loadShippingZones();
        } catch (err) {
          console.error("Delete shipping zone error:", err);
          throw err;
        }
      },

      markNotificationRead: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.map((notif) =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          ),
        }));
      },

      markAllNotificationsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((notif) => ({
            ...notif,
            read: true,
          })),
        }));
      },

      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: "eman-threads-admin",
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
