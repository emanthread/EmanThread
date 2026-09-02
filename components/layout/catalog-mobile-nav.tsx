"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ChevronRight,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Ruler,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";

import {
  catalogMenu,
  type MenuSection,
} from "@/lib/navigation/catalog-menu";
import {
  EMPTY_CATALOG_HEADER_CARD_CONFIG,
  getResolvedCatalogHeaderCards,
  parseCatalogHeaderCardConfig,
  resolveCatalogHeaderCardHref,
  type CatalogHeaderCardConfig,
} from "@/lib/navigation/catalog-header-cards";
import {
  isPublishedCatalogHref,
  publishedCatalogPathSet,
} from "@/lib/navigation/published-catalog";
import styles from "./catalog-mobile-nav.module.css";

// ── Types ──────────────────────────────────────────────────────────────────
type MobileNavUser = {
  name: string;
  email: string;
  role: string;
};

type MobileNavUtilityLink = {
  id: string;
  label: string;
  href: string;
};

export type CatalogMobileNavProps = {
  isAuthenticated: boolean;
  user: MobileNavUser | null;
  utilityLinks: readonly MobileNavUtilityLink[];
  wishlistCount: number;
  wishlistReady: boolean;
  onSearch: () => void;
  onLogout: () => void | Promise<void>;
  linksEnabled: boolean;
  showNavigation: boolean;
  publishedCatalogPaths: readonly string[];
};

// ── Helpers ────────────────────────────────────────────────────────────────
const byOrder = <T extends { order: number }>(items: readonly T[]) =>
  [...items].sort((a, b) => a.order - b.order);

function departmentFromPathname(
  pathname: string,
  departments: readonly { id: string }[]
): string | null {
  const sorted = [...departments].sort((a, b) => b.id.length - a.id.length);
  for (const dept of sorted) {
    if (pathname === `/${dept.id}` || pathname.startsWith(`/${dept.id}/`)) {
      return dept.id;
    }
  }
  return null;
}

// ── Component ──────────────────────────────────────────────────────────────
export function CatalogMobileNav({
  isAuthenticated,
  user,
  utilityLinks,
  wishlistCount,
  wishlistReady,
  onSearch,
  onLogout,
  linksEnabled,
  showNavigation,
  publishedCatalogPaths,
}: CatalogMobileNavProps) {
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<MenuSection | null>(null);
  const [cardConfig, setCardConfig] = useState<CatalogHeaderCardConfig>(
    EMPTY_CATALOG_HEADER_CARD_CONFIG
  );

  const publishedPaths = useMemo(
    () => publishedCatalogPathSet(publishedCatalogPaths),
    [publishedCatalogPaths]
  );

  const departments = useMemo(
    () =>
      byOrder(catalogMenu).filter((dept) =>
        isPublishedCatalogHref(`/${dept.id}`, publishedPaths)
      ),
    [publishedPaths]
  );

  const [activeDeptId, setActiveDeptId] = useState<string>(
    () => departmentFromPathname(pathname, departments) ?? departments[0]?.id ?? "women"
  );

  const activeDept =
    departments.find((d) => d.id === activeDeptId) ?? departments[0] ?? null;

  const publishedSections = useMemo(() => {
    if (!activeDept) return [];
    return byOrder(activeDept.sections).filter(
      (s) => s.href && isPublishedCatalogHref(s.href, publishedPaths)
    );
  }, [activeDept, publishedPaths]);

  // Department-level visual cards (posters for Screen 1)
  const deptCards = useMemo(() => {
    if (!activeDept) return [];
    return activeDept.visualCards
      .filter(
        (c) =>
          c.visibility === "visible" &&
          c.status === "active" &&
          c.href &&
          isPublishedCatalogHref(c.href, publishedPaths)
      )
      .sort((a, b) => a.order - b.order)
      .slice(0, 4);
  }, [activeDept, publishedPaths]);

  // Section-level visual cards (posters for Screen 2 bottom)
  const sectionCards = useMemo(() => {
    if (!activeDept || !activeSection) return [];
    return getResolvedCatalogHeaderCards(activeDept, activeSection, cardConfig)
      .filter((card) => {
        const href = resolveCatalogHeaderCardHref(card.destinationId);
        return href && isPublishedCatalogHref(href, publishedPaths);
      });
  }, [activeDept, activeSection, cardConfig, publishedPaths]);

  // ── Side-effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
    setActiveSection(null);
  }, [pathname]);

  // Sync active dept from route
  useEffect(() => {
    const fromRoute = departmentFromPathname(pathname, departments);
    if (fromRoute) setActiveDeptId(fromRoute);
  }, [pathname, departments]);

  // Fetch card config for section posters
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/store/header-cards", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => {
        if (v) setCardConfig(parseCatalogHeaderCardConfig(v));
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.warn("CatalogMobileNav: could not load header cards", e);
      });
    return () => controller.abort();
  }, []);

  // Body scroll lock + Escape key + resize-to-desktop close
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (activeSection) {
        setActiveSection(null);
      } else {
        setIsOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsOpen(false);
    };

    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, activeSection]);

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const close = useCallback(() => {
    setIsOpen(false);
    setActiveSection(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const handleSectionTap = (section: MenuSection) => {
    const hasGroups = section.groups.some((g) =>
      g.items.some((i) => i.visibility === "visible")
    );
    if (hasGroups) {
      setActiveSection(section);
    } else if (linksEnabled && section.href) {
      close();
    }
  };

  const handleDeptSwitch = (deptId: string) => {
    setActiveDeptId(deptId);
    setActiveSection(null);
  };

  // ── Drawer content (portalled) ────────────────────────────────────────────
  const drawerContent = (
    <div
      className={styles.portal}
      data-open={isOpen}
      aria-hidden={!isOpen}
      // @ts-expect-error – inert is a valid HTML attribute not yet in React types
      inert={!isOpen ? "" : undefined}
    >
      {/* Backdrop */}
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close menu"
        tabIndex={isOpen ? 0 : -1}
        onClick={close}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Horizontal screens container */}
        <div
          className={styles.screens}
          data-screen={activeSection ? "2" : "1"}
        >
          {/* ─── SCREEN 1: Department home ─────────────────────────────── */}
          <div
            className={styles.screen}
            aria-hidden={activeSection !== null}
          >
            {/* Header */}
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>Menu</span>
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Close menu"
                onClick={close}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {showNavigation && (
              <>
                {/* Department tabs */}
                <nav className={styles.deptBar} aria-label="Departments">
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      type="button"
                      className={styles.deptTab}
                      data-active={dept.id === activeDeptId}
                      onClick={() => handleDeptSwitch(dept.id)}
                    >
                      {dept.label}
                    </button>
                  ))}
                </nav>

                {/* Department-level visual card posters */}
                {deptCards.length > 0 && (
                  <div
                    className={styles.postersRow}
                    aria-label="Featured categories"
                  >
                    {deptCards.map((card) => {
                      const href = card.href!;
                      return linksEnabled ? (
                        <Link
                          key={card.id}
                          href={href}
                          className={styles.posterCard}
                          onClick={close}
                        >
                          <div className={styles.posterImageWrap}>
                            <Image
                              src={card.image ?? "/placeholder.jpg"}
                              alt={card.label}
                              fill
                              sizes="115px"
                              className={styles.posterImage}
                            />
                          </div>
                          <p className={styles.posterLabel}>{card.label}</p>
                        </Link>
                      ) : (
                        <div key={card.id} className={styles.posterCard}>
                          <div className={styles.posterImageWrap}>
                            <Image
                              src={card.image ?? "/placeholder.jpg"}
                              alt={card.label}
                              fill
                              sizes="115px"
                              className={styles.posterImage}
                            />
                          </div>
                          <p className={styles.posterLabel}>{card.label}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Section rows */}
                <div className={styles.sectionList}>
                  {publishedSections.map((section) => {
                    const hasGroups = section.groups.some((g) =>
                      g.items.some((i) => i.visibility === "visible")
                    );

                    // Sections without subcategories → direct link
                    if (!hasGroups && linksEnabled && section.href) {
                      return (
                        <Link
                          key={section.id}
                          href={section.href}
                          className={styles.sectionRow}
                          onClick={close}
                        >
                          <span>{section.label}</span>
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={section.id}
                        type="button"
                        className={styles.sectionRow}
                        onClick={() => handleSectionTap(section)}
                      >
                        <span>{section.label}</span>
                        {hasGroups && (
                          <ChevronRight
                            size={16}
                            aria-hidden="true"
                            className={styles.chevron}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Auth / utility area */}
            <div className={styles.authSection}>
              {isAuthenticated && user ? (
                <>
                  <div className={styles.authUser}>
                    <p className={styles.authUserName}>{user.name}</p>
                    <p className={styles.authUserEmail}>{user.email}</p>
                  </div>
                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      className={styles.authLink}
                      onClick={close}
                    >
                      <LayoutDashboard size={15} aria-hidden="true" />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}
                  <Link
                    href="/account"
                    className={styles.authLink}
                    onClick={close}
                  >
                    <User size={15} aria-hidden="true" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    href="/account/orders"
                    className={styles.authLink}
                    onClick={close}
                  >
                    <Package size={15} aria-hidden="true" />
                    <span>My Orders</span>
                  </Link>
                  {wishlistReady && (
                    <Link
                      href="/wishlist"
                      className={styles.authLink}
                      onClick={close}
                    >
                      <Heart size={15} aria-hidden="true" />
                      <span>
                        Wishlist{wishlistCount > 0 ? ` (${wishlistCount})` : ""}
                      </span>
                    </Link>
                  )}
                  {utilityLinks.map((link) => (
                    <Link
                      key={link.id}
                      href={link.href}
                      className={styles.authLink}
                      onClick={close}
                    >
                      {link.id === "stitching" ? (
                        <Ruler size={15} aria-hidden="true" />
                      ) : null}
                      <span>{link.label}</span>
                    </Link>
                  ))}
                  <Link
                    href="/account/settings"
                    className={styles.authLink}
                    onClick={close}
                  >
                    <Settings size={15} aria-hidden="true" />
                    <span>Settings</span>
                  </Link>
                  <button
                    type="button"
                    className={styles.authLogout}
                    onClick={() => {
                      close();
                      void onLogout();
                    }}
                  >
                    <LogOut size={15} aria-hidden="true" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={styles.authLink}
                    onClick={close}
                  >
                    <User size={15} aria-hidden="true" />
                    <span>Sign Up / Log In Account</span>
                  </Link>
                  {wishlistReady && (
                    <Link
                      href="/wishlist"
                      className={styles.authLink}
                      onClick={close}
                    >
                      <Heart size={15} aria-hidden="true" />
                      <span>Wishlist</span>
                    </Link>
                  )}
                  {utilityLinks.map((link) => (
                    <Link
                      key={link.id}
                      href={link.href}
                      className={styles.authLink}
                      onClick={close}
                    >
                      {link.id === "stitching" ? (
                        <Ruler size={15} aria-hidden="true" />
                      ) : null}
                      <span>{link.label}</span>
                    </Link>
                  ))}
                </>
              )}
              <button
                type="button"
                className={styles.authLink}
                style={{
                  border: "0",
                  background: "transparent",
                  color: "inherit",
                  font: "inherit",
                  cursor: "pointer",
                  padding: "0",
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  minHeight: "42px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  borderBottom: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
                }}
                onClick={() => {
                  close();
                  onSearch();
                }}
              >
                <Search size={15} aria-hidden="true" />
                <span>Search Products</span>
              </button>
            </div>
          </div>

          {/* ─── SCREEN 2: Section subcategories ──────────────────────── */}
          <div
            className={styles.screen}
            aria-hidden={activeSection === null}
          >
            {activeSection ? (
              <>
                {/* Screen 2 header */}
                <div className={styles.screen2Header}>
                  <button
                    type="button"
                    className={styles.backBtn}
                    aria-label="Back to main menu"
                    onClick={() => setActiveSection(null)}
                  >
                    <ArrowLeft size={20} aria-hidden="true" />
                  </button>
                  <span className={styles.screen2Breadcrumb}>
                    {activeSection.label}
                    <span className={styles.screen2Dept}>
                      {" "}
                      / {activeDept?.label ?? ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={styles.closeBtn}
                    aria-label="Close menu"
                    onClick={close}
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>

                {/* Group sections + subcategory items */}
                <div className={styles.groupsContainer}>
                  {byOrder(activeSection.groups).map((group) => {
                    const items = byOrder(
                      group.items.filter(
                        (item) =>
                          item.visibility === "visible" &&
                          item.href &&
                          isPublishedCatalogHref(item.href, publishedPaths)
                      )
                    );
                    if (items.length === 0) return null;

                    return (
                      <div key={group.id} className={styles.groupSection}>
                        <h3 className={styles.groupHeading}>{group.label}</h3>
                        {items.map((item) =>
                          linksEnabled &&
                          item.href &&
                          item.status === "active" &&
                          !item.comingSoon ? (
                            <Link
                              key={item.id}
                              href={item.href}
                              className={styles.itemLink}
                              onClick={close}
                            >
                              <span>{item.label}</span>
                              {item.badge && (
                                <span className={styles.badge}>
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          ) : (
                            <span
                              key={item.id}
                              className={`${styles.itemLink} ${styles.itemDisabled}`}
                              aria-disabled="true"
                            >
                              <span>{item.label}</span>
                              {item.badge && (
                                <span className={styles.badge}>
                                  {item.badge}
                                </span>
                              )}
                            </span>
                          )
                        )}
                      </div>
                    );
                  })}

                  {/* Section visual card posters at the bottom */}
                  {sectionCards.length > 0 && (
                    <div
                      className={styles.postersRow}
                      style={{ marginTop: 24, paddingBottom: 16 }}
                      aria-label="Featured"
                    >
                      {sectionCards.map((card) => {
                        const href = resolveCatalogHeaderCardHref(
                          card.destinationId
                        );
                        if (!href) return null;
                        return linksEnabled ? (
                          <Link
                            key={card.id}
                            href={href}
                            className={styles.posterCard}
                            onClick={close}
                          >
                            <div className={styles.posterImageWrap}>
                              <Image
                                src={card.image || "/placeholder.jpg"}
                                alt={card.title}
                                fill
                                sizes="115px"
                                className={styles.posterImage}
                              />
                            </div>
                            <p className={styles.posterLabel}>{card.title}</p>
                          </Link>
                        ) : (
                          <div key={card.id} className={styles.posterCard}>
                            <div className={styles.posterImageWrap}>
                              <Image
                                src={card.image || "/placeholder.jpg"}
                                alt={card.title}
                                fill
                                sizes="115px"
                                className={styles.posterImage}
                              />
                            </div>
                            <p className={styles.posterLabel}>{card.title}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Hamburger trigger button */}
      <button
        ref={triggerRef}
        type="button"
        className={styles.triggerBtn}
        aria-label="Open navigation menu"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <Menu aria-hidden="true" size={21} />
      </button>

      {mounted ? createPortal(drawerContent, document.body) : null}
    </>
  );
}
