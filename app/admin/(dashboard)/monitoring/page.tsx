"use client";

import { useState, useEffect } from "react";
import { RefreshCw, AlertTriangle, CheckCircle, Clock, Activity, Database, Server, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HealthData {
  status: string;
  db: string;
  uptime?: string;
  timestamp?: string;
}

interface AuditError {
  id: string;
  userEmail: string | null;
  action: string;
  entity: string;
  newValue: any;
  createdAt: string;
}

export default function MonitoringPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [errors, setErrors] = useState<AuditError[]>([]);
  const [stats, setStats] = useState({ totalOrders: 0, totalProducts: 0, totalCustomers: 0, pendingPayments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [healthRes, auditRes, statsRes] = await Promise.all([
        fetch("/api/health").catch(() => null),
        fetch("/api/admin/audit-logs?limit=20&action=ORDER_STATUS_CHANGED").catch(() => null),
        fetch("/api/admin/analytics").catch(() => null),
      ]);

      if (healthRes?.ok) setHealth(await healthRes.json());
      if (auditRes?.ok) {
        const data = await auditRes.json();
        setErrors(data.logs || []);
      }
      if (statsRes?.ok) {
        const data = await statsRes.json();
        setStats({
          totalOrders: data.totalOrders || 0,
          totalProducts: 0,
          totalCustomers: data.totalCustomers || 0,
          pendingPayments: data.pendingOrders || 0,
        });
      }
    } catch (err) {
      console.error("Monitoring fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const isHealthy = health?.status === "ok" || health?.db === "connected";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">System Monitoring</h1>
          <p className="text-muted-foreground">Health checks and performance overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isHealthy ? "bg-emerald-100" : "bg-red-100"}`}>
              <Server className={`h-5 w-5 ${isHealthy ? "text-emerald-600" : "text-red-600"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{isHealthy ? "Online" : "Offline"}</p>
              <p className="text-xs text-muted-foreground">API Status</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${health?.db === "connected" ? "bg-emerald-100" : "bg-red-100"}`}>
              <Database className={`h-5 w-5 ${health?.db === "connected" ? "text-emerald-600" : "text-red-600"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold capitalize">{health?.db || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">Database</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pendingPayments}</p>
              <p className="text-xs text-muted-foreground">Pending Payments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Status Changes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            Recent Order Status Changes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {errors.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No status change events recorded yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Time</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Admin</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Action</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.slice(0, 10).map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">{log.userEmail || "System"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{log.action}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-muted-foreground max-w-[200px] truncate block">
                          {JSON.stringify(log.newValue)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
          <p>🟢 <strong>Health Endpoint:</strong> <code className="bg-muted px-1 rounded">/api/health</code></p>
          <p>📋 <strong>Audit Logs:</strong> Tracked via <code className="bg-muted px-1 rounded">AuditLog</code> model</p>
          <p>⏱️ <strong>Auto-Expiry:</strong> Manual payments expire after 12 hours (checked on queue load)</p>
          <p>📦 <strong>Stock:</strong> Orders with <code className="bg-muted px-1 rounded">PENDING_VERIFICATION</code> use soft-hold inventory</p>
        </CardContent>
      </Card>
    </div>
  );
}