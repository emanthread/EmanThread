"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
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

import {
  catalogMenu,
  type MenuLeaf,
} from "@/lib/navigation/catalog-menu";
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
  linksEnabled: boolean;
  showNavigation: boolean;
  user: MobileMenuUser | null;
  utilityLinks: readonly MobileUtilityLink[];
  wishlistCount: number;
  wishlistReady: boolean;
  onSearch: () => void;
  onLogout: () => void | Promise<void>;
};

const byOrder = <T extends { order: number }>(items: readonly T[]) =>
  [...items].sort((a, b) => a.order - b.order);

const visibleLeaves = (items: readonly MenuLeaf[]) =>
  byOrder(items.filter((item) => item.visibility === "visible"));

const isLeafEnabled = (item: MenuLeaf, linksEnabled: boolean) =>
  linksEnabled &&
  item.status === "active" &&
  Boolean(item.href) &&
  !item.comingSoon;

export function CatalogMobileMenu({
  isAuthenticated,
  linksEnabled,
  showNavigation,
  user,
  utilityLinks,
  wishlistCount,
  wishlistReady,
  onSearch,
  onLogout,
}: CatalogMobileMenuProps) {
  const pathname = usePathname();
  const departments = useMemo(() => byOrder(catalogMenu), []);
  const [isOpen, setIsOpen] = useState(false);
  const [openDepartmentId, setOpenDepartmentId] = useState<string | null>(
    departments[0]?.id ?? null,
  );
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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

  const handleAccordionKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.mobileIconButton}
        aria-label="Open catalog menu"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <Menu aria-hidden="true" size={21} />
      </button>

      <div
        className={styles.drawerLayer}
        data-open={isOpen}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <button
          type="button"
          className={styles.drawerOverlay}
          aria-label="Close catalog menu"
          tabIndex={isOpen ? 0 : -1}
          onClick={() => setIsOpen(false)}
        />
        <aside
          ref={drawerRef}
          className={styles.drawer}
          role="dialog"
          aria-modal="true"
          aria-label="Catalog menu"
        >
          <div className={styles.drawerHeader}>
            <span className={styles.drawerTitle}>Menu</span>
            <button
              ref={closeRef}
              type="button"
              className={styles.mobileIconButton}
              aria-label="Close catalog menu"
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

            {showNavigation ? <nav className={styles.drawerNav} aria-label="Mobile catalog">
              {departments.map((department) => {
                const departmentOpen =
                  openDepartmentId === department.id;

                return (
                  <div key={department.id} className={styles.drawerDepartment}>
                    <button
                      type="button"
                      className={styles.drawerButton}
                      aria-expanded={departmentOpen}
                      aria-controls={`mobile-department-${department.id}`}
                      onKeyDown={handleAccordionKeyDown}
                      onClick={() => {
                        setOpenDepartmentId(
                          departmentOpen ? null : department.id,
                        );
                        setOpenSectionId(null);
                        if (!departmentOpen) {
                          window.dispatchEvent(
                            new CustomEvent("eman-thread:hero-department", {
                              detail: { department: department.id },
                            })
                          );
                        }
                      }}
                    >
                      <span className={styles.drawerButtonLabel}>
                        {department.label}
                      </span>
                      <ChevronDown
                        className={styles.drawerChevron}
                        data-open={departmentOpen}
                        aria-hidden="true"
                        size={16}
                      />
                    </button>

                    {departmentOpen ? (
                      <div
                        id={`mobile-department-${department.id}`}
                        className={styles.drawerSections}
                      >
                        {byOrder(department.sections).map((section) => {
                          const sectionOpen = openSectionId === section.id;

                          return (
                            <div
                              key={section.id}
                              className={styles.drawerSection}
                            >
                              <button
                                type="button"
                                className={styles.drawerButton}
                                aria-expanded={sectionOpen}
                                aria-controls={`mobile-section-${section.id}`}
                                onKeyDown={handleAccordionKeyDown}
                                onClick={() =>
                                  setOpenSectionId(
                                    sectionOpen ? null : section.id,
                                  )
                                }
                              >
                                <span className={styles.drawerButtonLabel}>
                                  {section.label}
                                </span>
                                <ChevronDown
                                  className={styles.drawerChevron}
                                  data-open={sectionOpen}
                                  aria-hidden="true"
                                  size={15}
                                />
                              </button>

                              {sectionOpen ? (
                                <div
                                  id={`mobile-section-${section.id}`}
                                  className={styles.drawerGroups}
                                >
                                  {linksEnabled && section.href ? (
                                    <Link
                                      href={section.href}
                                      className={styles.drawerLanding}
                                      onClick={() => setIsOpen(false)}
                                    >
                                      {section.label}
                                    </Link>
                                  ) : null}

                                  {byOrder(section.groups).map((group) => {
                                    const items = visibleLeaves(group.items);
                                    if (items.length === 0) return null;

                                    return (
                                      <section key={group.id}>
                                        <h3
                                          className={
                                            styles.drawerGroupHeading
                                          }
                                        >
                                          {group.label}
                                        </h3>
                                        <div
                                          className={styles.drawerGroupLinks}
                                        >
                                          {items.map((item) =>
                                            isLeafEnabled(
                                              item,
                                              linksEnabled,
                                            ) && item.href ? (
                                              <Link
                                                key={item.id}
                                                href={item.href}
                                                className={styles.drawerLink}
                                                onClick={() =>
                                                  setIsOpen(false)
                                                }
                                              >
                                                <span>{item.label}</span>
                                                {item.badge ? (
                                                  <span
                                                    className={styles.badge}
                                                  >
                                                    {item.badge}
                                                  </span>
                                                ) : null}
                                              </Link>
                                            ) : (
                                              <span
                                                key={item.id}
                                                className={`${styles.drawerLink} ${styles.unavailable}`}
                                                aria-disabled="true"
                                              >
                                                <span>{item.label}</span>
                                                {item.badge ? (
                                                  <span
                                                    className={styles.badge}
                                                  >
                                                    {item.badge}
                                                  </span>
                                                ) : null}
                                              </span>
                                            ),
                                          )}
                                        </div>
                                      </section>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav> : null}

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
    </>
  );
}
