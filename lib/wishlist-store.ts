"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "./data";

const WISHLIST_STORAGE_VERSION = 2;
const GUEST_ID_STORAGE_KEY = "eman-threads-wishlist-guest-id";

type WishlistItemsByIdentity = Record<string, Product[]>;

interface WishlistState {
  /** The currently selected identity's products. Kept for existing consumers. */
  items: Product[];
  /** Persisted wishlist buckets, isolated by customer or browser-session identity. */
  itemsByIdentity: WishlistItemsByIdentity;
  activeIdentity: string | null;
  /** False while AuthSync is determining the customer or guest identity. */
  isIdentityResolved: boolean;
  beginIdentityResolution: () => void;
  setWishlistIdentity: (identity: string) => void;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  toggleItem: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  getTotalItems: () => number;
}

// A private-browsing/sessionStorage failure should not make all guests share one
// bucket. In that case the current in-memory browser session remains isolated.
let inMemoryGuestId: string | null = null;

const createGuestId = () => {
  if (typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

/**
 * Returns an ID that lasts only for this browser session. It is intentionally
 * separate from localStorage so a later visitor cannot inherit a guest wishlist.
 */
export const getGuestWishlistIdentity = () => {
  if (typeof window === "undefined") return "guest:server";

  if (inMemoryGuestId) return `guest:${inMemoryGuestId}`;

  try {
    const storedGuestId = window.sessionStorage.getItem(GUEST_ID_STORAGE_KEY);
    if (storedGuestId) {
      inMemoryGuestId = storedGuestId;
      return `guest:${storedGuestId}`;
    }

    const newGuestId = createGuestId();
    window.sessionStorage.setItem(GUEST_ID_STORAGE_KEY, newGuestId);
    inMemoryGuestId = newGuestId;
    return `guest:${newGuestId}`;
  } catch {
    inMemoryGuestId = createGuestId();
    return `guest:${inMemoryGuestId}`;
  }
};

export const getUserWishlistIdentity = (userId: string) => `user:${userId}`;

// Helper function to remove duplicates from an array by id.
const removeDuplicates = (items: Product[]): Product[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
};

const isProduct = (item: unknown): item is Product =>
  typeof item === "object" &&
  item !== null &&
  typeof (item as { id?: unknown }).id === "string";

const normalizeItems = (value: unknown): Product[] =>
  Array.isArray(value) ? removeDuplicates(value.filter(isProduct)) : [];

const normalizeItemsByIdentity = (value: unknown): WishlistItemsByIdentity => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.entries(value).reduce<WishlistItemsByIdentity>((identities, [identity, items]) => {
    if (!identity) return identities;

    const normalizedItems = normalizeItems(items);
    if (normalizedItems.length > 0) {
      identities[identity] = normalizedItems;
    }
    return identities;
  }, {});
};

const getItemsForIdentity = (
  itemsByIdentity: WishlistItemsByIdentity,
  identity: string | null,
) => (identity ? normalizeItems(itemsByIdentity[identity]) : []);

const canUseWishlist = (state: WishlistState) =>
  state.isIdentityResolved && Boolean(state.activeIdentity);

const setActiveIdentityItems = (state: WishlistState, items: Product[]) => {
  if (!canUseWishlist(state) || !state.activeIdentity) return {};

  const uniqueItems = removeDuplicates(items);
  const itemsByIdentity = { ...state.itemsByIdentity };

  if (uniqueItems.length > 0) {
    itemsByIdentity[state.activeIdentity] = uniqueItems;
  } else {
    delete itemsByIdentity[state.activeIdentity];
  }

  return { items: uniqueItems, itemsByIdentity };
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      itemsByIdentity: {},
      activeIdentity: null,
      isIdentityResolved: false,

      beginIdentityResolution: () => {
        // Clear the active mirror immediately. This prevents a previous user's
        // heart/count from flashing while the current session is being checked.
        set({ activeIdentity: null, items: [], isIdentityResolved: false });
      },

      setWishlistIdentity: (identity) => {
        const normalizedIdentity = identity.trim();
        if (!normalizedIdentity) {
          get().beginIdentityResolution();
          return;
        }

        set((state) => ({
          activeIdentity: normalizedIdentity,
          items: getItemsForIdentity(state.itemsByIdentity, normalizedIdentity),
          isIdentityResolved: true,
        }));
      },

      addItem: (product) => {
        set((state) => {
          if (!canUseWishlist(state)) return {};

          const currentItems = getItemsForIdentity(state.itemsByIdentity, state.activeIdentity);
          if (currentItems.some((item) => item.id === product.id)) {
            return setActiveIdentityItems(state, currentItems);
          }

          return setActiveIdentityItems(state, [...currentItems, product]);
        });
      },

      removeItem: (productId) => {
        set((state) => {
          if (!canUseWishlist(state)) return {};

          const currentItems = getItemsForIdentity(state.itemsByIdentity, state.activeIdentity);
          return setActiveIdentityItems(
            state,
            currentItems.filter((item) => item.id !== productId),
          );
        });
      },

      toggleItem: (product) => {
        set((state) => {
          if (!canUseWishlist(state)) return {};

          const currentItems = getItemsForIdentity(state.itemsByIdentity, state.activeIdentity);
          const exists = currentItems.some((item) => item.id === product.id);
          return setActiveIdentityItems(
            state,
            exists
              ? currentItems.filter((item) => item.id !== product.id)
              : [...currentItems, product],
          );
        });
      },

      isInWishlist: (productId) => {
        const state = get();
        if (!canUseWishlist(state)) return false;

        return getItemsForIdentity(state.itemsByIdentity, state.activeIdentity).some(
          (item) => item.id === productId,
        );
      },

      clearWishlist: () => {
        set((state) => {
          if (!canUseWishlist(state)) return {};
          return setActiveIdentityItems(state, []);
        });
      },

      getTotalItems: () => {
        const state = get();
        if (!canUseWishlist(state)) return 0;

        return getItemsForIdentity(state.itemsByIdentity, state.activeIdentity).length;
      },
    }),
    {
      name: "eman-threads-wishlist",
      version: WISHLIST_STORAGE_VERSION,
      // The old storage contained one unowned global `items` array. Deliberately
      // do not assign it to either a customer or guest scope during migration.
      migrate: () => ({ itemsByIdentity: {} }),
      partialize: (state) => ({
        itemsByIdentity: normalizeItemsByIdentity(state.itemsByIdentity),
      }),
      // Never hydrate an identity or the active `items` mirror. AuthSync owns the
      // current identity, and the mirror is rebuilt from that identity's bucket.
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { itemsByIdentity?: unknown } | undefined;
        const itemsByIdentity = normalizeItemsByIdentity(persisted?.itemsByIdentity);

        return {
          ...currentState,
          itemsByIdentity,
          items: getItemsForIdentity(itemsByIdentity, currentState.activeIdentity),
        };
      },
    },
  ),
);
