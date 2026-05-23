"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "./data";

interface WishlistState {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  toggleItem: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  getTotalItems: () => number;
}

// Helper function to remove duplicates from an array by id
const removeDuplicates = (items: Product[]): Product[] => {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        set((state) => {
          // First ensure current items have no duplicates
          const uniqueItems = removeDuplicates(state.items);
          const exists = uniqueItems.some((item) => item.id === product.id);
          if (exists) return { items: uniqueItems };
          return { items: [...uniqueItems, product] };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: removeDuplicates(state.items).filter((item) => item.id !== productId),
        }));
      },

      toggleItem: (product) => {
        set((state) => {
          const uniqueItems = removeDuplicates(state.items);
          const exists = uniqueItems.some((item) => item.id === product.id);
          if (exists) {
            return {
              items: uniqueItems.filter((item) => item.id !== product.id),
            };
          }
          return { items: [...uniqueItems, product] };
        });
      },

      isInWishlist: (productId) => {
        return get().items.some((item) => item.id === productId);
      },

      clearWishlist: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return removeDuplicates(get().items).length;
      },
    }),
    {
      name: "eman-threads-wishlist",
      partialize: (state) => ({ items: removeDuplicates(state.items) }),
    }
  )
);
