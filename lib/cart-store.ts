"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "./data";
import {
  isEffectivelyUnstitchedProduct,
  isUnstitchedColorVariantProduct,
  isProductStitchingEligible,
  getVariantImages,
  type CartVariantSnapshot,
  type ProductOptionSelection,
} from "./commerce";
import { DEFAULT_STITCHING_FEE } from "./feature-flags";

/**
 * A cart line is deliberately keyed by the purchased option, not only by the
 * product. Existing fabric-only lines keep their historical `product.id` key;
 * a readywear size / fragrance volume gets its own `productId:variantId` line.
 */
export interface CartItem {
  lineId: string;
  product: Product;
  quantity: number;
  /** Server-validated option snapshot used for the order history. */
  variant?: CartVariantSnapshot | null;
  selectedOptions?: ProductOptionSelection[];
  /** Price at the time the customer chose the option. Legacy lines use product.price. */
  unitPrice?: number;
  stitchingProfileId?: string | null;
  stitchingPrice?: number | null;
  stitchingProfileName?: string | null;
  adminMeasurement?: any; // Full measurement snapshot for admin-added measurements
}

export interface CartSelection {
  variant?: CartVariantSnapshot | null;
  selectedOptions?: ProductOptionSelection[];
  unitPrice?: number;
}

export type StitchingOptions = {
  price: number;
  profileId: string;
  profileName: string;
};

export type StitchingUpdate = {
  price: number | null;
  profileId: string | null;
  profileName: string | null;
  adminMeasurement?: any;
};

type PersistedStitchingSelection = {
  lineId: string;
  stitchingProfileId: string;
  stitchingPrice: number | null;
  stitchingProfileName: string | null;
};

type DeferredStitchingSelections = {
  ownerId: string;
  selections: PersistedStitchingSelection[];
};

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  /** The verified customer allowed to restore the active stitching choices. */
  stitchingOwnerId: string | null;
  stitchingIdentityResolved: boolean;
  deferredStitchingSelections: DeferredStitchingSelections | null;
  addItem: (
    product: Product,
    quantity?: number,
    stitchingOptions?: StitchingOptions,
    selection?: CartSelection,
  ) => void;
  /** Accepts a lineId. For legacy callers a product id remains the same lineId. */
  removeItem: (lineId: string) => void;
  /** Accepts a lineId. For legacy callers a product id remains the same lineId. */
  updateQuantity: (lineId: string, quantity: number) => void;
  /** Accepts a lineId. For legacy callers a product id remains the same lineId. */
  updateStitching: (lineId: string, options: StitchingUpdate) => void;
  /** Removes measurement-linked selections without affecting normal cart lines. */
  clearStitchingSelections: () => void;
  /**
   * Releases persisted stitching choices only after the authenticated customer
   * identity has been verified for this browser session.
   */
  setStitchingIdentity: (userId: string | null) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getStitchingTotal: () => number;
  hasStitching: () => boolean;
}

const CART_STORAGE_VERSION = 5;

export function getCartLineId(productId: string, variantId?: string | null): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

export function getCartItemUnitPrice(item: CartItem): number {
  if (
    isEffectivelyUnstitchedProduct(item.product) &&
    !isUnstitchedColorVariantProduct(item.product)
  ) return item.product.price;
  return typeof item.unitPrice === "number" && Number.isFinite(item.unitPrice)
    ? item.unitPrice
    : item.product.price;
}

export function getCartItemImages(item: CartItem): string[] {
  const variant = item.variant
    ? item.product.commerce?.variants.find((candidate) => candidate.id === item.variant?.id)
    : undefined;
  return variant ? getVariantImages(item.product, variant) : item.product.images;
}

export function isCartItemAvailable(item: CartItem): boolean {
  if (
    item.variant &&
    (!isEffectivelyUnstitchedProduct(item.product) ||
      isUnstitchedColorVariantProduct(item.product))
  ) {
    // A cart stores only the immutable purchase snapshot. Fresh availability
    // lives on the product's optional commerce profile when present; a legacy
    // persisted snapshot without that profile must not be incorrectly marked
    // unavailable from the product-level fabric stock.
    const currentVariant = item.product.commerce?.variants.find(
      (variant) => variant.id === item.variant?.id,
    );
    return currentVariant
      ? currentVariant.isActive && currentVariant.inStock && currentVariant.stockQuantity > 0
      : true;
  }

  return Boolean(item.product.inStock) &&
    (item.product.stockQuantity === undefined || item.product.stockQuantity > 0);
}

function normalizeVariant(value: unknown): CartVariantSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<CartVariantSnapshot>;
  if (typeof candidate.id !== "string" || !candidate.id.trim()) return null;
  if (typeof candidate.label !== "string" || !candidate.label.trim()) return null;

  return {
    id: candidate.id,
    label: candidate.label,
    ...(typeof candidate.sku === "string" && candidate.sku.trim()
      ? { sku: candidate.sku }
      : {}),
    priceAdjustment:
      typeof candidate.priceAdjustment === "number" && Number.isFinite(candidate.priceAdjustment)
        ? candidate.priceAdjustment
        : 0,
  };
}

function normalizeSelectedOptions(value: unknown): ProductOptionSelection[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const options = value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const candidate = item as Partial<ProductOptionSelection>;
    if (typeof candidate.label !== "string" || typeof candidate.value !== "string") return [];
    const label = candidate.label.trim().slice(0, 80);
    const optionValue = candidate.value.trim().slice(0, 200);
    return label && optionValue ? [{ label, value: optionValue }] : [];
  });

  return options.length > 0 ? options : undefined;
}

function normalizeCartItem(value: unknown): CartItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<CartItem>;
  if (!candidate.product || typeof candidate.product !== "object" || !candidate.product.id) return null;

  const product = candidate.product as Product;
  const legacyUnstitched =
    isEffectivelyUnstitchedProduct(product) &&
    !isUnstitchedColorVariantProduct(product);
  const variant = legacyUnstitched ? null : normalizeVariant(candidate.variant);
  const quantity =
    typeof candidate.quantity === "number" && Number.isFinite(candidate.quantity)
      ? Math.max(1, Math.floor(candidate.quantity))
      : 1;
  const unitPrice = !legacyUnstitched &&
    typeof candidate.unitPrice === "number" && Number.isFinite(candidate.unitPrice)
      ? candidate.unitPrice
      : undefined;
  const selectedOptions = legacyUnstitched
    ? undefined
    : normalizeSelectedOptions(candidate.selectedOptions);

  return {
    product,
    quantity,
    lineId: getCartLineId(product.id, variant?.id),
    ...(variant ? { variant } : {}),
    ...(selectedOptions ? { selectedOptions } : {}),
    ...(unitPrice !== undefined ? { unitPrice } : {}),
    stitchingProfileId: candidate.stitchingProfileId ?? null,
    stitchingPrice:
      typeof candidate.stitchingPrice === "number" && Number.isFinite(candidate.stitchingPrice)
        ? candidate.stitchingPrice
        : null,
    stitchingProfileName: candidate.stitchingProfileName ?? null,
    ...(candidate.adminMeasurement !== undefined
      ? { adminMeasurement: candidate.adminMeasurement }
      : {}),
  };
}

/** Migrate v1 product-keyed local storage without sharing or dropping a cart. */
export function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  const byLineId = new Map<string, CartItem>();
  for (const candidate of value) {
    const item = normalizeCartItem(candidate);
    if (!item) continue;

    const existing = byLineId.get(item.lineId);
    if (!existing) {
      byLineId.set(item.lineId, item);
      continue;
    }

    // A duplicate can only come from a malformed/old local payload. Preserve
    // the existing option and stitching choices and add the quantities.
    byLineId.set(item.lineId, {
      ...existing,
      quantity: existing.quantity + item.quantity,
      product: item.product,
      ...(item.unitPrice !== undefined ? { unitPrice: item.unitPrice } : {}),
    });
  }

  return [...byLineId.values()];
}

/** Removes all measurement data from the shared product-cart payload. */
function withoutStitchingSelection(item: CartItem): CartItem {
  const { adminMeasurement: _adminMeasurement, ...withoutAdminMeasurement } = item;
  return {
    ...withoutAdminMeasurement,
    stitchingProfileId: null,
    stitchingPrice: null,
    stitchingProfileName: null,
  };
}

function normalizePersistedCartItems(value: unknown): CartItem[] {
  return normalizeCartItems(value).map(withoutStitchingSelection);
}

function isAdminMeasurementProfileId(profileId: string | null | undefined): boolean {
  return typeof profileId === "string" && profileId.startsWith("admin_");
}

/**
 * Admin-measurement records contain customer data and must never be written to
 * browser storage. Standard customer profile choices are stored separately and
 * only restored after the same signed-in identity is confirmed.
 */
function toPersistedStitchingSelections(
  ownerId: string | null,
  items: CartItem[],
): DeferredStitchingSelections | null {
  if (!ownerId) return null;

  const selections = items.flatMap((item): PersistedStitchingSelection[] => {
    const profileId = item.stitchingProfileId;
    if (
      !isProductStitchingEligible(item.product) ||
      !profileId ||
      profileId === "none" ||
      isAdminMeasurementProfileId(profileId) ||
      item.adminMeasurement !== undefined
    ) {
      return [];
    }

    return [{
      lineId: item.lineId,
      stitchingProfileId: profileId,
      stitchingPrice:
        typeof item.stitchingPrice === "number" && Number.isFinite(item.stitchingPrice)
          ? item.stitchingPrice
          : null,
      stitchingProfileName:
        typeof item.stitchingProfileName === "string"
          ? item.stitchingProfileName.slice(0, 160)
          : null,
    }];
  });

  return selections.length > 0 ? { ownerId, selections } : null;
}

function normalizeDeferredStitchingSelections(value: unknown): DeferredStitchingSelections | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<DeferredStitchingSelections>;
  const ownerId = typeof candidate.ownerId === "string" ? candidate.ownerId.trim() : "";
  if (!ownerId || !Array.isArray(candidate.selections)) return null;

  const seenLineIds = new Set<string>();
  const selections = candidate.selections.flatMap((selection): PersistedStitchingSelection[] => {
    if (!selection || typeof selection !== "object" || Array.isArray(selection)) return [];
    const item = selection as Partial<PersistedStitchingSelection>;
    const lineId = typeof item.lineId === "string" ? item.lineId.trim() : "";
    const stitchingProfileId =
      typeof item.stitchingProfileId === "string" ? item.stitchingProfileId.trim() : "";
    if (
      !lineId ||
      !stitchingProfileId ||
      stitchingProfileId === "none" ||
      isAdminMeasurementProfileId(stitchingProfileId) ||
      seenLineIds.has(lineId)
    ) {
      return [];
    }
    seenLineIds.add(lineId);

    return [{
      lineId,
      stitchingProfileId,
      stitchingPrice:
        typeof item.stitchingPrice === "number" && Number.isFinite(item.stitchingPrice)
          ? item.stitchingPrice
          : null,
      stitchingProfileName:
        typeof item.stitchingProfileName === "string"
          ? item.stitchingProfileName.slice(0, 160)
          : null,
    }];
  });

  return selections.length > 0 ? { ownerId, selections } : null;
}

function keepSelectionsForCartLines(
  deferred: DeferredStitchingSelections | null,
  items: CartItem[],
): DeferredStitchingSelections | null {
  if (!deferred) return null;
  const lineIds = new Set(items.map((item) => item.lineId));
  const selections = deferred.selections.filter((selection) => lineIds.has(selection.lineId));
  return selections.length > 0 ? { ...deferred, selections } : null;
}

function applyDeferredStitchingSelections(
  items: CartItem[],
  deferred: DeferredStitchingSelections,
): CartItem[] {
  const selectionsByLineId = new Map(
    deferred.selections.map((selection) => [selection.lineId, selection]),
  );

  return items.map((item) => {
    const selection = selectionsByLineId.get(item.lineId);
    if (!selection || !isProductStitchingEligible(item.product)) return item;

    return {
      ...item,
      stitchingProfileId: selection.stitchingProfileId,
      stitchingPrice: selection.stitchingPrice,
      stitchingProfileName: selection.stitchingProfileName,
    };
  });
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      stitchingOwnerId: null,
      stitchingIdentityResolved: false,
      deferredStitchingSelections: null,

      addItem: (product, quantity = 1, stitchingOptions, selection) => {
        const legacyUnstitched =
          isEffectivelyUnstitchedProduct(product) &&
          !isUnstitchedColorVariantProduct(product);
        const variant = legacyUnstitched ? null : normalizeVariant(selection?.variant);
        const lineId = getCartLineId(product.id, variant?.id);
        const selectedOptions = legacyUnstitched
          ? undefined
          : normalizeSelectedOptions(selection?.selectedOptions);
        const unitPrice =
          !legacyUnstitched && typeof selection?.unitPrice === "number" && Number.isFinite(selection.unitPrice)
            ? selection.unitPrice
            : undefined;

        set((state) => {
          const existingItem = state.items.find((item) => item.lineId === lineId);

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.lineId === lineId
                  ? {
                      ...item,
                      product,
                      quantity: item.quantity + quantity,
                      ...(variant ? { variant } : {}),
                      ...(selectedOptions ? { selectedOptions } : {}),
                      ...(unitPrice !== undefined ? { unitPrice } : {}),
                      stitchingProfileId: stitchingOptions?.profileId ?? item.stitchingProfileId,
                      stitchingPrice: stitchingOptions?.price ?? item.stitchingPrice,
                      stitchingProfileName: stitchingOptions?.profileName ?? item.stitchingProfileName,
                    }
                  : item,
              ),
              isOpen: true,
            };
          }

          return {
            items: [
              ...state.items,
              {
                lineId,
                product,
                quantity,
                ...(variant ? { variant } : {}),
                ...(selectedOptions ? { selectedOptions } : {}),
                ...(unitPrice !== undefined ? { unitPrice } : {}),
                stitchingProfileId: stitchingOptions?.profileId ?? null,
                stitchingPrice: stitchingOptions?.price ?? null,
                stitchingProfileName: stitchingOptions?.profileName ?? null,
              },
            ],
            isOpen: true,
          };
        });
      },

      removeItem: (lineId) => {
        set((state) => ({
          items: state.items.filter((item) => item.lineId !== lineId),
          deferredStitchingSelections: state.deferredStitchingSelections
            ? {
                ...state.deferredStitchingSelections,
                selections: state.deferredStitchingSelections.selections.filter(
                  (selection) => selection.lineId !== lineId,
                ),
              }
            : null,
        }));
      },

      updateQuantity: (lineId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(lineId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.lineId === lineId ? { ...item, quantity } : item,
          ),
        }));
      },

      updateStitching: (lineId, options) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.lineId === lineId
              ? {
                  ...item,
                  stitchingPrice: options.price,
                  stitchingProfileId: options.profileId,
                  stitchingProfileName: options.profileName,
                  adminMeasurement: options.adminMeasurement,
                }
              : item,
          ),
        }));
      },

      clearStitchingSelections: () => {
        set((state) => ({
          items: state.items.map(withoutStitchingSelection),
          deferredStitchingSelections: null,
        }));
      },

      setStitchingIdentity: (userId) => {
        set((state) => {
          // Repeated session checks for the same verified customer must not
          // interrupt checkout or discard their current selection.
          if (
            userId &&
            state.stitchingIdentityResolved &&
            state.stitchingOwnerId === userId
          ) {
            return state;
          }

          const deferred = state.deferredStitchingSelections;
          if (userId && deferred?.ownerId === userId) {
            return {
              items: applyDeferredStitchingSelections(state.items, deferred),
              stitchingOwnerId: userId,
              stitchingIdentityResolved: true,
              deferredStitchingSelections: null,
            };
          }

          // A logout, expired session, or different account can keep ordinary
          // cart lines, but never inherits someone else's profile/measurement.
          return {
            items: state.items.map(withoutStitchingSelection),
            stitchingOwnerId: userId,
            stitchingIdentityResolved: true,
            deferredStitchingSelections: null,
          };
        });
      },

      clearCart: () => {
        set({ items: [], deferredStitchingSelections: null });
      },

      openCart: () => {
        set({ isOpen: true });
      },

      closeCart: () => {
        set({ isOpen: false });
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + getCartItemUnitPrice(item) * item.quantity,
          0,
        );
      },

      getStitchingTotal: () => {
        return get().items.reduce((total, item) => {
          if (
            isProductStitchingEligible(item.product) &&
            item.stitchingProfileId != null &&
            item.stitchingProfileId !== "none"
          ) {
            return total + (item.stitchingPrice ?? DEFAULT_STITCHING_FEE) * item.quantity;
          }
          return total;
        }, 0);
      },

      hasStitching: () => {
        return get().items.some(
          (item) =>
            isProductStitchingEligible(item.product) &&
            item.stitchingProfileId != null &&
            item.stitchingProfileId !== "none",
        );
      },
    }),
    {
      name: "eman-threads-cart",
      version: CART_STORAGE_VERSION,
      migrate: (persistedState, version) => {
        const persisted = persistedState as {
          items?: unknown;
          stitching?: unknown;
        } | undefined;
        // Earlier payloads did not bind selections to a verified user, so only
        // their normal product cart can be safely carried forward.
        return {
          items: normalizePersistedCartItems(persisted?.items),
          stitching: version >= CART_STORAGE_VERSION
            ? normalizeDeferredStitchingSelections(persisted?.stitching)
            : null,
        };
      },
      partialize: (state) => {
        const items = normalizePersistedCartItems(state.items);
        const stitching = state.stitchingIdentityResolved
          ? toPersistedStitchingSelections(state.stitchingOwnerId, state.items)
          : keepSelectionsForCartLines(state.deferredStitchingSelections, items);

        return { items, stitching };
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as {
          items?: unknown;
          stitching?: unknown;
        } | undefined;
        return {
          ...currentState,
          items: normalizePersistedCartItems(persisted?.items),
          deferredStitchingSelections: normalizeDeferredStitchingSelections(persisted?.stitching),
        };
      },
    },
  ),
);
