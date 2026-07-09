"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays, Plus, Trash2, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight, Scissors, AlertTriangle,
  CheckCircle2, XCircle, Loader2, Settings,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type RuleType = "BLOCKED_DATE" | "CAPACITY_OVERRIDE" | "BLOCKED_RANGE" | "CAPACITY_RANGE";

interface CalendarRule {
  id: string;
  type: RuleType;
  date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  capacity?: number | null;
  label?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface DayStats {
  count: number;
  capacity: number | null;
  blocked: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  BLOCKED_DATE: "Block Single Day",
  CAPACITY_OVERRIDE: "Override Capacity (Single Day)",
  BLOCKED_RANGE: "Block Date Range",
  CAPACITY_RANGE: "Override Capacity (Range)",
};

const SEASON_TEMPLATES = [
  { label: "🕌 Eid (3-day block)", type: "BLOCKED_DATE" as RuleType, days: 1, suggestedLabel: "Eid Holiday" },
  { label: "🌙 Ramadan (reduced capacity)", type: "CAPACITY_RANGE" as RuleType, capacity: 6, suggestedLabel: "Ramadan Season" },
  { label: "💍 Wedding Season (reduced)", type: "CAPACITY_RANGE" as RuleType, capacity: 8, suggestedLabel: "Wedding Season" },
  { label: "📅 Custom Block Day", type: "BLOCKED_DATE" as RuleType, suggestedLabel: "" },
  { label: "⚙️ Custom Capacity Override", type: "CAPACITY_OVERRIDE" as RuleType, suggestedLabel: "" },
];

function formatMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateStr(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi",
  });
}

function getDayColor(stats: DayStats | undefined): string {
  if (!stats) return "bg-secondary/30 text-muted-foreground";
  if (stats.blocked) return "bg-gray-800 text-gray-400 border-gray-700";
  if (stats.capacity === null) return "bg-gray-800 text-gray-400";
  const pct = stats.count / stats.capacity;
  if (pct >= 1) return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300";
  if (pct >= 0.75) return "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300";
  return "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200";
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function StitchingCalendarPage() {
  const { toast } = useToast();
  const [rules, setRules] = useState<CalendarRule[]>([]);
  const [dayStats, setDayStats] = useState<Record<string, DayStats>>({});
  const [threshold, setThreshold] = useState(12);
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof SEASON_TEMPLATES)[0] | null>(null);
  const [newRule, setNewRule] = useState({
    type: "BLOCKED_DATE" as RuleType,
    date: "",
    startDate: "",
    endDate: "",
    capacity: "",
    label: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch Rules ──────────────────────────────────────────────────────────

  const loadRules = useCallback(async () => {
    setLoadingRules(true);
    try {
      const res = await fetch("/api/admin/stitching-calendar");
      if (res.ok) setRules(await res.json());
    } catch { /* silent */ }
    finally { setLoadingRules(false); }
  }, []);

  // ── Fetch Month Capacity ─────────────────────────────────────────────────

  const loadMonthCapacity = useCallback(async (month: Date) => {
    setLoadingMonth(true);
    try {
      const key = formatMonthKey(month);
      const res = await fetch(`/api/admin/stitching-calendar/capacity?month=${key}`);
      if (res.ok) {
        const data = await res.json();
        setDayStats(data.days ?? {});
        setThreshold(data.threshold ?? 12);
      }
    } catch { /* silent */ }
    finally { setLoadingMonth(false); }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);
  useEffect(() => { loadMonthCapacity(currentMonth); }, [currentMonth, loadMonthCapacity, rules]);

  // ── Calendar Grid ────────────────────────────────────────────────────────

  const year = currentMonth.getFullYear();
  const mon = currentMonth.getMonth();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, mon, 1).getDay(); // 0=Sun
  const monthName = currentMonth.toLocaleDateString("en-PK", { month: "long", year: "numeric", timeZone: "Asia/Karachi" });

  const prevMonth = () => setCurrentMonth(new Date(year, mon - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, mon + 1, 1));

  // ── Save Rule ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      const isRange = newRule.type === "BLOCKED_RANGE" || newRule.type === "CAPACITY_RANGE";
      const isSingle = newRule.type === "BLOCKED_DATE" || newRule.type === "CAPACITY_OVERRIDE";
      const needsCapacity = newRule.type === "CAPACITY_OVERRIDE" || newRule.type === "CAPACITY_RANGE";

      const payload: any = {
        type: newRule.type,
        label: newRule.label || null,
        capacity: needsCapacity ? (parseInt(newRule.capacity) || null) : null,
      };

      if (isSingle) {
        if (!newRule.date) { toast({ title: "Error", description: "Please select a date", variant: "destructive" }); setSaving(false); return; }
        payload.date = new Date(newRule.date).toISOString();
      }
      if (isRange) {
        if (!newRule.startDate || !newRule.endDate) {
          toast({ title: "Error", description: "Please select start and end dates", variant: "destructive" });
          setSaving(false); return;
        }
        payload.startDate = new Date(newRule.startDate).toISOString();
        payload.endDate = new Date(newRule.endDate).toISOString();
      }

      const res = await fetch("/api/admin/stitching-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create rule");

      toast({ title: "Rule created", description: "Calendar rule has been saved." });
      setDialogOpen(false);
      setNewRule({ type: "BLOCKED_DATE", date: "", startDate: "", endDate: "", capacity: "", label: "" });
      setSelectedTemplate(null);
      loadRules();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  // ── Toggle Active ────────────────────────────────────────────────────────

  const toggleActive = async (rule: CalendarRule) => {
    try {
      const res = await fetch(`/api/admin/stitching-calendar/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      if (!res.ok) throw new Error();
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
      toast({ title: rule.isActive ? "Rule deactivated" : "Rule activated" });
    } catch {
      toast({ title: "Error", description: "Could not update rule", variant: "destructive" });
    }
  };

  // ── Delete Rule ──────────────────────────────────────────────────────────

  const deleteRule = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/stitching-calendar/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Rule deleted" });
    } catch {
      toast({ title: "Error", description: "Could not delete rule", variant: "destructive" });
    } finally { setDeletingId(null); }
  };

  // ── Open dialog with template ────────────────────────────────────────────

  const openWithTemplate = (tmpl: typeof SEASON_TEMPLATES[0]) => {
    setSelectedTemplate(tmpl);
    setNewRule({
      type: tmpl.type,
      date: "",
      startDate: "",
      endDate: "",
      capacity: (tmpl as any).capacity?.toString() ?? "",
      label: tmpl.suggestedLabel,
    });
    setDialogOpen(true);
  };

  // ── Legend ───────────────────────────────────────────────────────────────

  const stats = Object.values(dayStats);
  const blockedDays = stats.filter((d) => d.blocked).length;
  const fullDays = stats.filter((d) => !d.blocked && d.capacity !== null && d.count >= d.capacity).length;
  const nearDays = stats.filter((d) => !d.blocked && d.capacity !== null && d.count >= d.capacity * 0.75 && d.count < d.capacity).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Stitching Delivery Calendar
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage delivery capacity, block holidays, and set seasonal overrides.
          </p>
        </div>
        <Button onClick={() => { setSelectedTemplate(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Daily Cap", value: threshold, icon: <Scissors className="h-4 w-4" />, color: "text-primary" },
          { label: "Blocked Days", value: blockedDays, icon: <XCircle className="h-4 w-4" />, color: "text-gray-500" },
          { label: "Full Days", value: fullDays, icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-500" },
          { label: "Near Capacity", value: nearDays, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-amber-500" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className={cn("flex items-center gap-2 mb-1", s.color)}>{s.icon}<span className="text-xs font-medium">{s.label}</span></div>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{monthName}</CardTitle>
            <div className="flex items-center gap-2">
              {loadingMonth && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            {[
              { color: "bg-emerald-100 dark:bg-emerald-900/20", label: "Available" },
              { color: "bg-amber-100 dark:bg-amber-900/40", label: "Near Capacity (≥75%)" },
              { color: "bg-red-100 dark:bg-red-900/40", label: "Full" },
              { color: "bg-gray-800", label: "Blocked" },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className={cn("w-3 h-3 rounded-sm border", l.color)} />
                {l.label}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(mon + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const s = dayStats[dateStr];
              const isToday = dateStr === new Date().toISOString().slice(0, 10);
              return (
                <div
                  key={dateStr}
                  title={s ? (s.blocked ? "Blocked" : `${s.count} / ${s.capacity ?? "?"} orders`) : "No data"}
                  className={cn(
                    "rounded-md border p-1 min-h-[52px] flex flex-col items-center justify-between transition-all cursor-default",
                    getDayColor(s),
                    isToday && "ring-2 ring-primary ring-offset-1"
                  )}
                >
                  <span className={cn("text-xs font-semibold", isToday && "underline")}>{dayNum}</span>
                  {s ? (
                    s.blocked ? (
                      <XCircle className="h-3.5 w-3.5 opacity-70" />
                    ) : (
                      <span className="text-[10px] font-medium">
                        {s.count}/{s.capacity ?? "?"}
                      </span>
                    )
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick-add templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick-Add Season Templates</CardTitle>
          <CardDescription>Common seasonal rules for Eid, Ramadan, weddings, and more.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SEASON_TEMPLATES.map((tmpl) => (
              <Button
                key={tmpl.label}
                variant="outline"
                size="sm"
                onClick={() => openWithTemplate(tmpl)}
              >
                {tmpl.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Calendar Rules</CardTitle>
          <CardDescription>{rules.length} rule{rules.length !== 1 ? "s" : ""} configured</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRules ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No rules configured yet. Add your first rule above.</p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-start sm:items-center gap-3 p-3 rounded-lg border transition-all",
                    rule.isActive ? "bg-background border-border" : "bg-muted/30 border-dashed opacity-60"
                  )}
                >
                  {/* Type badge */}
                  <Badge
                    variant={rule.isActive ? "default" : "secondary"}
                    className={cn(
                      "shrink-0 text-[10px]",
                      (rule.type === "BLOCKED_DATE" || rule.type === "BLOCKED_RANGE") && "bg-gray-700 text-gray-100",
                      (rule.type === "CAPACITY_OVERRIDE" || rule.type === "CAPACITY_RANGE") && "bg-amber-600 text-white"
                    )}
                  >
                    {rule.type === "BLOCKED_DATE" || rule.type === "BLOCKED_RANGE" ? "⛔ BLOCKED" : "⚙️ OVERRIDE"}
                  </Badge>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{rule.label || RULE_TYPE_LABELS[rule.type]}</p>
                    <p className="text-xs text-muted-foreground">
                      {rule.type === "BLOCKED_DATE" || rule.type === "CAPACITY_OVERRIDE"
                        ? formatDateStr(rule.date)
                        : `${formatDateStr(rule.startDate)} → ${formatDateStr(rule.endDate)}`}
                      {rule.capacity !== null && rule.capacity !== undefined && (
                        <span className="ml-2 font-semibold text-amber-600">Cap: {rule.capacity}/day</span>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggleActive(rule)}
                      title={rule.isActive ? "Deactivate" : "Activate"}
                    >
                      {rule.isActive
                        ? <ToggleRight className="h-4 w-4 text-primary" />
                        : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteRule(rule.id)}
                      disabled={deletingId === rule.id}
                    >
                      {deletingId === rule.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings link */}
      <Card className="border-dashed">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delivery Threshold & Lead Days</p>
              <p className="text-xs text-muted-foreground">Configured in Settings → Stitching tab</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/settings?tab=stitching">
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                Open Settings
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setSelectedTemplate(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {selectedTemplate ? selectedTemplate.label : "Add Calendar Rule"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Rule Type */}
            <div className="space-y-1.5">
              <Label>Rule Type</Label>
              <Select
                value={newRule.type}
                onValueChange={(v) => setNewRule((p) => ({ ...p, type: v as RuleType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Single day */}
            {(newRule.type === "BLOCKED_DATE" || newRule.type === "CAPACITY_OVERRIDE") && (
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={newRule.date} onChange={(e) => setNewRule((p) => ({ ...p, date: e.target.value }))} />
              </div>
            )}

            {/* Range */}
            {(newRule.type === "BLOCKED_RANGE" || newRule.type === "CAPACITY_RANGE") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input type="date" value={newRule.startDate} onChange={(e) => setNewRule((p) => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Input type="date" value={newRule.endDate} onChange={(e) => setNewRule((p) => ({ ...p, endDate: e.target.value }))} />
                </div>
              </div>
            )}

            {/* Capacity override */}
            {(newRule.type === "CAPACITY_OVERRIDE" || newRule.type === "CAPACITY_RANGE") && (
              <div className="space-y-1.5">
                <Label>Daily Capacity Override</Label>
                <Input
                  type="number"
                  min="0"
                  max="500"
                  placeholder={`Default: ${threshold}`}
                  value={newRule.capacity}
                  onChange={(e) => setNewRule((p) => ({ ...p, capacity: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Max orders deliverable per day during this period</p>
              </div>
            )}

            {/* Label */}
            <div className="space-y-1.5">
              <Label>Label (optional)</Label>
              <Input
                placeholder="e.g. Eid ul Fitr, Ramadan Season"
                value={newRule.label}
                onChange={(e) => setNewRule((p) => ({ ...p, label: e.target.value }))}
              />
            </div>

            {/* Info box */}
            {(newRule.type === "BLOCKED_DATE" || newRule.type === "BLOCKED_RANGE") && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-xs text-muted-foreground">
                ⛔ No stitching orders will be assigned to these date(s). Orders will automatically roll over to the next available day.
              </div>
            )}
            {(newRule.type === "CAPACITY_OVERRIDE" || newRule.type === "CAPACITY_RANGE") && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
                ⚠️ This overrides the global threshold ({threshold}/day) for the specified date(s). Useful for Ramadan, weddings, or high-demand seasons.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
