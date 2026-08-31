"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";

import styles from "./catalog-header-menu.module.css";

type MobileMenuUser = {
  name: string;
  email: string;
  role: string;
};

type MobileUtilityLink = {
  id: string;
  label: string;
  href: string;
};

type CatalogMobileMenuProps = {
  isAuthenticated: boolean;
  user: MobileMenuUser | null;
  utilityLinks: readonly MobileUtilityLink[];
  wishlistCount: number;
  wishlistReady: boolean;
  onSearch: () => void;
  onLogout: () => void | Promise<void>;
};

export function CatalogMobileMenu({
  isAuthenticated,
  user,
  utilityLinks,
  wishlistCount,
  wishlistReady,
  onSearch,
  onLogout,
}: CatalogMobileMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true",
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  const closeAndRun = (callback?: () => void | Promise<void>) => {
    setIsOpen(false);
    void callback?.();
  };

  const drawerLayerContent = (
    <div
      className={styles.drawerLayer}
      data-open={isOpen}
      aria-hidden={!isOpen}
      inert={!isOpen}
    >
        <button
          type="button"
          className={styles.drawerOverlay}
          aria-label="Close account and support menu"
          tabIndex={isOpen ? 0 : -1}
          onClick={() => setIsOpen(false)}
        />
        <aside
          ref={drawerRef}
          className={styles.drawer}
          role="dialog"
          aria-modal="true"
          aria-label="Account and support menu"
        >
          <div className={styles.drawerHeader}>
            <span className={styles.drawerTitle}>Menu</span>
            <button
              ref={closeRef}
              type="button"
              className={styles.mobileIconButton}
              aria-label="Close account and support menu"
              onClick={() => setIsOpen(false)}
            >
              <X aria-hidden="true" size={20} />
            </button>
          </div>

          <div className={styles.drawerBody}>
            <div className={styles.drawerSearch}>
              <button
                type="button"
                className={styles.drawerSearchButton}
                onClick={() => closeAndRun(onSearch)}
              >
                <Search aria-hidden="true" size={16} />
                <span>Search products</span>
              </button>
            </div>

            <div className={styles.drawerUtilities}>
              {utilityLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  className={styles.drawerUtilityLink}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {wishlistReady ? (
                <Link
                  href="/wishlist"
                  className={styles.drawerUtilityLink}
                  onClick={() => setIsOpen(false)}
                >
                  <Heart aria-hidden="true" size={16} />
                  <span>
                    Wishlist
                    {wishlistCount > 0 ? ` (${wishlistCount})` : ""}
                  </span>
                </Link>
              ) : null}

              {isAuthenticated && user ? (
                <>
                  <div className={styles.drawerUser}>
                    <p className={styles.drawerUserName}>{user.name}</p>
                    <p className={styles.drawerUserEmail}>{user.email}</p>
                  </div>
                  {user.role === "admin" ? (
                    <Link
                      href="/admin"
                      className={styles.drawerUtilityLink}
                      onClick={() => setIsOpen(false)}
                    >
                      <LayoutDashboard aria-hidden="true" size={16} />
                      <span>Admin Dashboard</span>
                    </Link>
                  ) : null}
                  <Link
                    href="/account"
                    className={styles.drawerUtilityLink}
                    onClick={() => setIsOpen(false)}
                  >
                    <User aria-hidden="true" size={16} />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    href="/account/orders"
                    className={styles.drawerUtilityLink}
                    onClick={() => setIsOpen(false)}
                  >
                    <Package aria-hidden="true" size={16} />
                    <span>My Orders</span>
                  </Link>
                  <Link
                    href="/account/settings"
                    className={styles.drawerUtilityLink}
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings aria-hidden="true" size={16} />
                    <span>Settings</span>
                  </Link>
                  <button
                    type="button"
                    className={styles.drawerLogout}
                    onClick={() => closeAndRun(onLogout)}
                  >
                    <LogOut aria-hidden="true" size={16} />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className={styles.drawerUtilityLink}
                  onClick={() => setIsOpen(false)}
                >
                  <User aria-hidden="true" size={16} />
                  <span>Login / Register</span>
                </Link>
              )}
            </div>
          </div>
        </aside>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.mobileIconButton}
        aria-label="Open account and support menu"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <Menu aria-hidden="true" size={21} />
      </button>

      {mounted ? createPortal(drawerLayerContent, document.body) : null}
    </>
  );
}
