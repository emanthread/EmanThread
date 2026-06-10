"use client";

import { useEffect, useRef } from "react";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { useAuthStore } from "@/lib/auth-store";
import { isStaffRole } from "@/lib/permissions";

interface PendingSubmission {
  id: string;
  orderNumber: string;
  amount: number;
  paymentMethod: string;
  createdAt: string;
}

// Track already-notified submissions to avoid duplicates across re-renders
const notifiedIds = new Set<string>();

/**
 * useAdminPushNotifications
 *
 * React hook for admin browser push notifications.
 * Polls for new pending manual payment submissions and shows
 * a browser Notification for each one.
 *
 * Gracefully degrades if:
 * - Browser doesn't support Notification API
 * - Permission is denied
 * - User is not an authenticated admin
 * - Feature flag ADMIN_PUSH_ALERTS is false
 */
export function useAdminPushNotifications() {
  const { user, isAuthenticated } = useAuthStore();
  const lastCheckedRef = useRef<number>(Date.now());
  const isAdminRef = useRef<boolean>(false);

  useEffect(() => {
    // 1. Check if feature is enabled
    if (!FEATURE_FLAGS.ADMIN_PUSH_ALERTS) return;

    // 2. Check if user is authenticated admin
    if (!isAuthenticated || !user || !isStaffRole(user.role ?? "")) return;
    isAdminRef.current = true;

    // 3. Check if browser supports Notification API
    if (
      typeof window === "undefined" ||
      typeof Notification === "undefined"
    ) {
      console.debug(
        "[push-notif] Browser does not support Notification API"
      );
      return;
    }

    // 4. Check or request permission
    const permissionPromise =
      Notification.permission === "default"
        ? Notification.requestPermission()
        : Promise.resolve(Notification.permission);

    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = async () => {
      try {
        const permission = await permissionPromise;
        if (permission !== "granted") {
          console.debug("[push-notif] Notification permission denied");
          return;
        }

        // 5. Start polling for new submissions
        intervalId = setInterval(async () => {
          try {
            const since = new Date(lastCheckedRef.current).toISOString();
            const res = await fetch(
              `/api/admin/payments/pending-new?since=${encodeURIComponent(since)}`
            );
            if (!res.ok) return;

            const data = await res.json();
            if (!data.submissions || data.submissions.length === 0) return;

            // Update last checked to the newest submission time
            const submissions: PendingSubmission[] = data.submissions;
            for (const sub of submissions) {
              // Skip already notified
              if (notifiedIds.has(sub.id)) continue;
              notifiedIds.add(sub.id);

              const methodLabel =
                sub.paymentMethod === "NAYAPAY" ? "Nayapay" : "Meezan Bank";

              try {
                const notif = new Notification(
                  "New Payment Pending Approval",
                  {
                    body: `Order #${sub.orderNumber} – PKR ${sub.amount.toLocaleString()} (${methodLabel})`,
                    tag: `payment-${sub.id}`,
                    icon: "/logo.jpg",
                  }
                );

                notif.onclick = () => {
                  window.open("/admin/payment-verification", "_blank");
                };
              } catch (notifErr) {
                console.debug("[push-notif] Failed to show notification:", notifErr);
              }
            }

            // Update last checked timestamp
            if (submissions.length > 0) {
              const newest = submissions.reduce((latest, s) =>
                latest.createdAt > s.createdAt ? latest : s
              );
              lastCheckedRef.current = new Date(newest.createdAt).getTime();
            }
          } catch (err) {
            console.debug("[push-notif] Poll error:", err);
          }
        }, 60000); // Poll every 60 seconds
      } catch {
        console.debug("[push-notif] Permission request failed");
      }
    };

    startPolling();

    // Cleanup on unmount — clears the interval even when created asynchronously
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthenticated, user]);
}