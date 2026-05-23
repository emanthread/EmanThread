import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  whatsappConsent?: boolean;
  whatsappPhone?: string;
  avatar?: string;
  role: string; // e.g. "customer" | "admin" | "super_admin" | "manager" | "support"
  permissions?: string[];
  isVerified: boolean;
  addresses: Address[];
  createdAt: string;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  addAddress: (address: Omit<Address, "id">) => void;
  updateAddress: (id: string, address: Partial<Address>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password, rememberMe = false) => { // L1: remember me support
        set({ isLoading: true });

        try {
          const { signIn } = await import("next-auth/react");
          const result = await signIn("credentials", {
            email,
            password,
            loginOrigin: "customer",
            redirect: false,
            maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // L1
          });

          if (result?.error) {
            set({ isLoading: false });
            return false;
          }

          // Wait for session cookie to propagate — retry with delay
          let profile: any = null;
          for (let attempt = 0; attempt < 5; attempt++) {
            const res = await fetch("/api/user/profile");
            if (res.ok) {
              profile = await res.json();
              break;
            }
            if (attempt < 4) await new Promise((r) => setTimeout(r, 300));
          }

          if (!profile) {
            set({ isLoading: false });
            return false;
          }

          set({
            user: {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
              whatsappConsent: profile.whatsappConsent,
              whatsappPhone: profile.whatsappPhone,
              role: profile.role,
              isVerified: profile.isVerified ?? true,
              addresses: profile.addresses,
              createdAt: profile.createdAt,
            },
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });

        try {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
          });

          if (!res.ok) {
            set({ isLoading: false });
            return false;
          }

          const { signIn } = await import("next-auth/react");
          const result = await signIn("credentials", {
            email,
            password,
            loginOrigin: "customer",
            redirect: false,
          });

          if (result?.error) {
            set({ isLoading: false });
            return false;
          }

          // Wait for session cookie to propagate — retry with delay
          let profile: any = null;
          for (let attempt = 0; attempt < 5; attempt++) {
            const res = await fetch("/api/user/profile");
            if (res.ok) {
              profile = await res.json();
              break;
            }
            if (attempt < 4) await new Promise((r) => setTimeout(r, 300));
          }

          if (!profile) {
            set({ isLoading: false });
            return false;
          }
          set({
            user: {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
              whatsappConsent: profile.whatsappConsent,
              whatsappPhone: profile.whatsappPhone,
              role: profile.role,
              isVerified: profile.isVerified ?? true,
              addresses: profile.addresses,
              createdAt: profile.createdAt,
            },
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => {
        import("next-auth/react").then(({ signOut }) => {
          signOut({ redirect: false });
        });
        set({ user: null, isAuthenticated: false });
      },

      updateProfile: (data) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        }));
      },

      addAddress: (address) => {
        set((state) => {
          if (!state.user) return state;

          const newAddress: Address = {
            ...address,
            id: `addr-${Date.now()}`,
          };

          const addresses = state.user.addresses.map((a) => ({
            ...a,
            isDefault: address.isDefault ? false : a.isDefault,
          }));

          return {
            user: {
              ...state.user,
              addresses: [...addresses, newAddress],
            },
          };
        });
      },

      updateAddress: (id, address) => {
        set((state) => {
          if (!state.user) return state;

          return {
            user: {
              ...state.user,
              addresses: state.user.addresses.map((a) =>
                a.id === id ? { ...a, ...address } : a
              ),
            },
          };
        });
      },

      deleteAddress: (id) => {
        set((state) => {
          if (!state.user) return state;

          return {
            user: {
              ...state.user,
              addresses: state.user.addresses.filter((a) => a.id !== id),
            },
          };
        });
      },

      setDefaultAddress: (id) => {
        set((state) => {
          if (!state.user) return state;

          return {
            user: {
              ...state.user,
              addresses: state.user.addresses.map((a) => ({
                ...a,
                isDefault: a.id === id,
              })),
            },
          };
        });
      },
    }),
    {
      name: "eman-threads-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);