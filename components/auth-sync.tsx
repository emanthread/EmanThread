"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";

export function AuthSync() {
  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((profile) => {
        useAuthStore.setState({
          user: {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            role: profile.role,
            isVerified: profile.isVerified ?? true,
            addresses: profile.addresses,
            createdAt: profile.createdAt,
          },
          isAuthenticated: true,
        });
      })
      .catch(() => {
        useAuthStore.setState({ user: null, isAuthenticated: false });
      });
  }, []);

  return null;
}