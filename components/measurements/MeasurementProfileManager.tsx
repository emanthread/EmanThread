"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Star, Pencil, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GARMENT_TYPES,
  garmentTypeLabel,
} from "@/lib/validators/measurements-unified";
import { UnifiedMeasurementForm } from "./UnifiedMeasurementForm";
import type { UnifiedMeasurementFormData } from "@/lib/validators/measurements-unified";

interface ProfileSummary {
  id: string;
  profileName: string;
  isDefault: boolean;
  gender: string;
  garmentType: string;
  status: string;
  notes: string;
  deliveryDate: string | null;
  requestedAt: string;
  updatedAt: string;
}

interface MeasurementProfileManagerProps {
  /** Optional: filter profiles by garment type */
  garmentTypeFilter?: string;
  /** Called when user selects a profile (e.g. for checkout) */
  onSelect?: (profile: ProfileSummary) => void;
  /** If true, shows a "select" button next to each profile */
  showSelect?: boolean;
  /** If true, opens the form for creating a new profile immediately */
  defaultCreateMode?: boolean;
}

export function MeasurementProfileManager({
  garmentTypeFilter,
  onSelect,
  showSelect = false,
  defaultCreateMode = false,
}: MeasurementProfileManagerProps) {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(defaultCreateMode);
  const [editProfile, setEditProfile] = useState<ProfileSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfileSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/measurements");
      if (!res.ok) throw new Error("Failed to fetch profiles");
      const data = await res.json();
      let list = data.profiles || [];
      if (garmentTypeFilter) {
        list = list.filter((p: ProfileSummary) => p.garmentType === garmentTypeFilter);
      }
      setProfiles(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }, [garmentTypeFilter]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/measurements/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete profile");
      setDeleteTarget(null);
      fetchProfiles();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (profileId: string) => {
    try {
      const res = await fetch(`/api/measurements/${profileId}/set-default`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to set default");
      fetchProfiles();
    } catch (err) {
      console.error("Set default error:", err);
    }
  };

  const handleSaveNew = async (data: UnifiedMeasurementFormData) => {
    const res = await fetch("/api/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create profile");
    }
    setCreateOpen(false);
    fetchProfiles();
  };

  const handleSaveEdit = async (data: UnifiedMeasurementFormData) => {
    if (!editProfile) return;
    const res = await fetch(`/api/measurements/${editProfile.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update profile");
    }
    setEditProfile(null);
    fetchProfiles();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Measurement Profiles
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {profiles.length} profile{profiles.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCreateOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          New Profile
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
          <button
            onClick={fetchProfiles}
            className="ml-2 underline font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-xs text-muted-foreground py-4 text-center">
          Loading profiles...
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && profiles.length === 0 && (
        <div className="text-xs text-muted-foreground py-6 text-center border border-dashed rounded-lg">
          <p className="font-medium mb-1">No measurement profiles yet</p>
          <p className="text-[11px]">Create a profile to save your measurements for future orders</p>
        </div>
      )}

      {/* Profile list */}
      {!loading && profiles.length > 0 && (
        <div className="space-y-2">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {profile.profileName}
                  </span>
                  {profile.isDefault && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 bg-amber-50 text-amber-600 border-amber-200"
                    >
                      Default
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 capitalize"
                  >
                    {garmentTypeLabel(profile.garmentType)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {profile.gender} ·{" "}
                  {profile.status === "complete"
                    ? "Completed"
                    : "Pending"}{" "}
                  · Updated{" "}
                  {new Date(profile.updatedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-1 ml-3 shrink-0">
                {showSelect && onSelect && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs"
                    onClick={() => onSelect(profile)}
                  >
                    Select
                  </Button>
                )}
                {!profile.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleSetDefault(profile.id)}
                    title="Set as default"
                  >
                    <Star className="h-3.5 w-3.5 text-muted-foreground hover:text-amber-500" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setEditProfile(profile)}
                  title="Edit profile"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-600"
                  onClick={() => setDeleteTarget(profile)}
                  title="Delete profile"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Measurement Profile</DialogTitle>
            <DialogDescription>
              Save a named set of measurements for future orders.
            </DialogDescription>
          </DialogHeader>
          <UnifiedMeasurementForm
            data={{}}
            mode="edit"
            wizard={true}
            onSave={handleSaveNew}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editProfile}
        onOpenChange={(o) => !o && setEditProfile(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile — {editProfile?.profileName}</DialogTitle>
            <DialogDescription>
              Update your saved measurements.
            </DialogDescription>
          </DialogHeader>
          {editProfile && (
            <UnifiedMeasurementForm
              data={editProfile as unknown as Partial<UnifiedMeasurementFormData>}
              mode="edit"
              garmentTypeFixed={editProfile.garmentType}
              onSave={handleSaveEdit}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Profile?</DialogTitle>
            <DialogDescription>
              Permanently delete "{deleteTarget?.profileName}"? This action
              cannot be undone. Past orders using this profile are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}