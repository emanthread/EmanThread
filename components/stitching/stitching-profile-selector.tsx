"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import type { StitchingUpdate } from "@/lib/cart-store";
import { formatPrice } from "@/lib/data";
import {
  getProfileStitchingPrice,
  type GroupedStitchingPrices,
  type MeasurementProfileSummary,
} from "@/lib/stitching-profile";
import { garmentTypeLabel } from "@/lib/validators/measurements-unified";

interface StitchingProfileSelectorProps {
  selectedProfileId: string | null;
  preferredProfileId?: string | null;
  quantity?: number;
  onChange: (selection: StitchingUpdate) => void;
  onCreateNew: () => void;
  onSignIn: () => void;
}

export function StitchingProfileSelector({
  selectedProfileId,
  preferredProfileId,
  quantity = 1,
  onChange,
  onCreateNew,
  onSignIn,
}: StitchingProfileSelectorProps) {
  const { isAuthenticated } = useAuthStore();
  const [profiles, setProfiles] = useState<MeasurementProfileSummary[]>([]);
  const [prices, setPrices] = useState<GroupedStitchingPrices>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      setProfiles([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      fetch("/api/measurements", { signal: controller.signal }).then(async (response) => {
        if (!response.ok) throw new Error("Could not load saved measurements");
        return response.json();
      }),
      fetch("/api/stitching-prices", { signal: controller.signal }).then(async (response) => {
        if (!response.ok) throw new Error("Could not load stitching prices");
        return response.json();
      }),
    ])
      .then(([profileData, priceData]) => {
        const availableProfiles = (profileData.profiles ?? []).filter(
          (profile: MeasurementProfileSummary) =>
            profile.source == null || profile.source === "profile",
        );
        setProfiles(availableProfiles);
        setPrices(priceData ?? {});
      })
      .catch((fetchError) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "Could not load saved measurements");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [isAuthenticated]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );

  useEffect(() => {
    if (!preferredProfileId || loading) return;
    const profile = profiles.find((candidate) => candidate.id === preferredProfileId);
    if (!profile) return;
    onChange({
      price: getProfileStitchingPrice(profile, prices),
      profileId: profile.id,
      profileName: profile.profileName,
    });
  }, [loading, onChange, preferredProfileId, prices, profiles]);

  const handleSelection = (value: string) => {
    if (value === "create_new") {
      onCreateNew();
      return;
    }
    if (value === "none") {
      onChange({ price: null, profileId: null, profileName: null });
      return;
    }

    const profile = profiles.find((candidate) => candidate.id === value);
    if (!profile) return;
    onChange({
      price: getProfileStitchingPrice(profile, prices),
      profileId: profile.id,
      profileName: profile.profileName,
    });
  };

  return (
    <div className="bg-secondary/30 rounded-lg border border-border/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Ruler className="h-5 w-5 text-accent" />
        <span className="font-semibold text-sm">Optional Stitching Service</span>
        <Badge variant="secondary" className="text-xs bg-accent/10 text-accent">
          Optional
        </Badge>
      </div>

      {!isAuthenticated ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Continue with fabric only, or sign in to use saved measurements and stitching.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onSignIn}>
            Sign in to use measurements
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <label htmlFor="stitching-profile" className="text-sm font-medium">
            Stitching and measurements
          </label>
          <div className="relative">
            <select
              id="stitching-profile"
              value={selectedProfileId ?? "none"}
              onChange={(event) => handleSelection(event.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 pr-9 text-sm disabled:cursor-wait disabled:opacity-60"
            >
              <option value="none">Fabric only — No stitching</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.profileName} — {garmentTypeLabel(profile.garmentType)}
                  {profile.isDefault ? " (Default)" : ""}
                </option>
              ))}
              <option value="create_new">+ Create new measurements</option>
            </select>
            {loading && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {profiles.length === 0 && !loading && !error && (
            <p className="text-xs text-muted-foreground">
              No saved profiles yet. Choose “Create new measurements” to add one.
            </p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          {selectedProfile && (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                Estimated stitching: {formatPrice(getProfileStitchingPrice(selectedProfile, prices))} per piece.
                You can review the stitching option and final server-verified price at checkout.
              </p>
              {quantity > 1 && (
                <p>The selected profile will apply to all {quantity} pieces in this cart line.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
