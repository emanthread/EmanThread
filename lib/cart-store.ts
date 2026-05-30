"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "./data";

export interface CartItem {
  product: Product;
  quantity: number;
  stitchingProfileId?: string | null;
  stitchingPrice?: number | null;
  stitchingProfileName?: string | null;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, quantity?: number, stitchingOptions?: { price: number; profileId: string; profileName: string }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateStitching: (productId: string, options: { price: number | null; profileId: string | null; profileName: string | null }) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getStitchingTotal: () => number;
  hasStitching: () => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, quantity = 1, stitchingOptions?) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.product.id === product.id
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id
                  ? {
                      ...item,
                      quantity: item.quantity + quantity,
                      stitchingProfileId: stitchingOptions?.profileId ?? item.stitchingProfileId,
                      stitchingPrice: stitchingOptions?.price ?? item.stitchingPrice,
                      stitchingProfileName: stitchingOptions?.profileName ?? item.stitchingProfileName,
                    }
                  : item
              ),
              isOpen: true,
            };
          }

          return {
            items: [
              ...state.items,
              {
                product,
                quantity,
                stitchingProfileId: stitchingOptions?.profileId ?? null,
                stitchingPrice: stitchingOptions?.price ?? null,
                stitchingProfileName: stitchingOptions?.profileName ?? null,
              },
            ],
            isOpen: true,
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        }));
      },

      updateStitching: (productId, options) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId
              ? {
                  ...item,
                  stitchingPrice: options.price,
                  stitchingProfileId: options.profileId,
                  stitchingProfileName: options.profileName,
                }
              : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
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
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },

      getStitchingTotal: () => {
        return get().items.reduce(
          (total, item) => total + (item.stitchingPrice ?? 0) * item.quantity,
          0
        );
      },

      hasStitching: () => {
        return get().items.some((item) => item.stitchingPrice != null && item.stitchingPrice > 0);
      },
    }),
    {
      name: "eman-threads-cart",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
