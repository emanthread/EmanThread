"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";

import {
  catalogMenu,
  catalogStoreIndicator,
  catalogVisualCardFallbackImage,
  type MenuDepartment,
  type MenuLeaf,
  type MenuSection,
  type MenuVisualCard,
} from "@/lib/navigation/catalog-menu";
import styles from "./catalog-header-menu.module.css";

type CatalogHeaderMenuProps = {
  mark: ReactNode;
  utilities: ReactNode;
  linksEnabled: boolean;
  showNavigation: boolean;
};

const byOrder = <T extends { order: number }>(items: readonly T[]) =>
  [...items].sort((a, b) => a.order - b.order);

const visibleLeaves = (items: readonly MenuLeaf[]) =>
  byOrder(items.filter((item) => item.visibility === "visible"));

const visibleCards = (items: readonly MenuVisualCard[]) =>
  byOrder(items.filter((item) => item.visibility === "visible")).slice(0, 3);

const isLinkEnabled = (
  item: MenuLeaf | MenuVisualCard,
  linksEnabled: boolean,
) =>
  linksEnabled &&
  item.status === "active" &&
  Boolean(item.href) &&
  !item.comingSoon;

export function CatalogHeaderMenu({
  mark,
  utilities,
  linksEnabled,
  showNavigation,
}: CatalogHeaderMenuProps) {
  const pathname = usePathname();
  const departments = useMemo(() => byOrder(catalogMenu), []);
  const [activeDepartmentId, setActiveDepartmentId] = useState(
    departments[0]?.id ?? "women",
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isMegaPanelOpen, setIsMegaPanelOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A mouse click leaves its trigger focused, so focus alone cannot tell us
  // whether the panel should remain open after the pointer leaves. Start in
  // keyboard mode to keep focus-driven navigation safe by default.
  const interactionModeRef = useRef<"keyboard" | "pointer">("keyboard");
  const departmentRefs = useRef(new Map<string, HTMLButtonElement>());
  const sectionRefs = useRef(new Map<string, HTMLButtonElement>());

  const activeDepartment =
    departments.find((department) => department.id === activeDepartmentId) ??
    departments[0];
  const sections = activeDepartment
    ? byOrder(activeDepartment.sections)
    : [];
  const activeSection =
    sections.find((section) => section.id === activeSectionId) ?? null;

  const closeMegaPanel = useCallback(
    (restoreDepartmentFocus = false) => {
      setIsMegaPanelOpen(false);
      setActiveSectionId(null);
      if (restoreDepartmentFocus) {
        requestAnimationFrame(() => {
          departmentRefs.current.get(activeDepartmentId)?.focus();
        });
      }
    },
    [activeDepartmentId],
  );

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const schedulePointerClose = useCallback(() => {
    cancelScheduledClose();
    // A small delay lets the pointer cross the gap between a section label and
    // its panel, while still closing naturally as soon as the user leaves the
    // catalog area. Keyboard users retain the panel while focus is within it.
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      const hasKeyboardFocus =
        interactionModeRef.current === "keyboard" &&
        rootRef.current?.matches(":focus-within");
      if (!hasKeyboardFocus) {
        closeMegaPanel(false);
      }
    }, 140);
  }, [cancelScheduledClose, closeMegaPanel]);

  useEffect(
    () => () => {
      cancelScheduledClose();
    },
    [cancelScheduledClose],
  );

  useEffect(() => {
    closeMegaPanel(false);
  }, [pathname, showNavigation, closeMegaPanel]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      interactionModeRef.current = "pointer";
      if (
        isMegaPanelOpen &&
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        closeMegaPanel(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      interactionModeRef.current = "keyboard";
      if (event.key === "Escape" && isMegaPanelOpen) {
        event.preventDefault();
        closeMegaPanel(true);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMegaPanel, isMegaPanelOpen]);

  const selectDepartment = (department: MenuDepartment) => {
    setActiveDepartmentId(department.id);
    setActiveSectionId(null);
    setIsMegaPanelOpen(false);
    // On the homepage the hero listens for this small UI event and swaps to
    // the department's media. The header itself keeps its established menu
    // behavior and does not navigate or change catalog state.
    window.dispatchEvent(
      new CustomEvent("eman-thread:hero-department", {
        detail: { department: department.id },
      })
    );
  };

  const openSection = (section: MenuSection) => {
    setActiveSectionId(section.id);
    setIsMegaPanelOpen(true);
  };

  const handleDepartmentKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    departmentIndex: number,
  ) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex =
        (departmentIndex + direction + departments.length) %
        departments.length;
      const nextDepartment = departments[nextIndex];
      if (nextDepartment) {
        selectDepartment(nextDepartment);
        requestAnimationFrame(() => {
          departmentRefs.current.get(nextDepartment.id)?.focus();
        });
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const focusedDepartment = departments[departmentIndex];
      if (!focusedDepartment) return;

      const firstSection = byOrder(focusedDepartment.sections)[0];
      if (firstSection) {
        selectDepartment(focusedDepartment);
        requestAnimationFrame(() => {
          sectionRefs.current.get(firstSection.id)?.focus();
        });
      }
    }
  };

  const cards =
    activeDepartment && activeSection
      ? (() => {
          const sectionCards = visibleCards(activeSection.visualCards);
          return sectionCards.length > 0
            ? sectionCards
            : visibleCards(activeDepartment.visualCards);
        })()
      : [];

  return (
    <div
      ref={rootRef}
      className={styles.desktopShell}
      onPointerEnter={cancelScheduledClose}
      onPointerLeave={schedulePointerClose}
    >
      <div className={styles.primaryRow}>
        {showNavigation ? (
          <nav
            className={styles.departmentNav}
            aria-label="Catalog departments"
          >
            {departments.map((department, index) => (
              <button
                key={department.id}
                ref={(node) => {
                  if (node) departmentRefs.current.set(department.id, node);
                  else departmentRefs.current.delete(department.id);
                }}
                type="button"
                className={styles.departmentButton}
                data-active={activeDepartment?.id === department.id}
                aria-pressed={activeDepartment?.id === department.id}
                aria-expanded={
                  activeDepartment?.id === department.id && isMegaPanelOpen
                }
                onClick={() => selectDepartment(department)}
                onKeyDown={(event) => handleDepartmentKeyDown(event, index)}
              >
                {department.label}
              </button>
            ))}
          </nav>
        ) : (
          <div aria-hidden="true" />
        )}

        <div
          className={styles.mark}
          onPointerDown={() => closeMegaPanel(false)}
        >
          {mark}
        </div>
        <div
          className={styles.utilities}
          onPointerDown={() => closeMegaPanel(false)}
        >
          {utilities}
        </div>
      </div>

      {showNavigation ? <div className={styles.secondaryRow}>
        {catalogStoreIndicator.visibility === "visible" ? (
          <div className={styles.storeIndicator}>
            <span className={styles.flag} aria-hidden="true">
              ★
            </span>
            <span>{catalogStoreIndicator.label}</span>
          </div>
        ) : (
          <div />
        )}

        <nav
          className={styles.sectionNav}
          aria-label={`${activeDepartment?.label ?? "Catalog"} sections`}
        >
          {sections.map((section) => (
            <button
              key={section.id}
              ref={(node) => {
                if (node) sectionRefs.current.set(section.id, node);
                else sectionRefs.current.delete(section.id);
              }}
              type="button"
              className={styles.sectionButton}
              data-active={
                isMegaPanelOpen && activeSection?.id === section.id
              }
              aria-expanded={
                isMegaPanelOpen && activeSection?.id === section.id
              }
              aria-controls="catalog-mega-panel"
              onPointerEnter={() => {
                interactionModeRef.current = "pointer";
                openSection(section);
              }}
              onFocus={() => openSection(section)}
              onClick={() => openSection(section)}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className={styles.secondarySpacer} aria-hidden="true" />
      </div> : null}

      {showNavigation && isMegaPanelOpen && activeDepartment && activeSection ? (
        <div
          id="catalog-mega-panel"
          className={styles.megaPanel}
          role="region"
          aria-label={`${activeDepartment.label} ${activeSection.label}`}
        >
          <div className={styles.megaInner}>
            <div className={styles.megaContent}>
              <div className={styles.megaHeadingRow}>
                {linksEnabled && activeSection.href ? (
                  <Link
                    href={activeSection.href}
                    className={styles.sectionLanding}
                    onClick={() => closeMegaPanel(false)}
                  >
                    {activeSection.label}
                  </Link>
                ) : (
                  <span
                    className={styles.sectionLanding}
                    aria-disabled="true"
                  >
                    {activeSection.label}
                  </span>
                )}
                <button
                  type="button"
                  className={styles.closeButton}
                  aria-label="Close catalog menu"
                  onClick={() => closeMegaPanel(true)}
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </div>

              {activeSection.groups.length > 0 ? (
                <div className={styles.groupGrid}>
                  {byOrder(activeSection.groups).map((group) => {
                    const items = visibleLeaves(group.items);
                    if (items.length === 0) return null;

                    return (
                      <section key={group.id}>
                        <h3 className={styles.groupHeading}>{group.label}</h3>
                        <ul className={styles.groupList}>
                          {items.map((item) => (
                            <li key={item.id}>
                              {isLinkEnabled(item, linksEnabled) && item.href ? (
                                <Link
                                  href={item.href}
                                  className={styles.megaLink}
                                  onClick={() => closeMegaPanel(false)}
                                >
                                  <span>{item.label}</span>
                                  {item.badge ? (
                                    <span className={styles.badge}>
                                      {item.badge}
                                    </span>
                                  ) : null}
                                </Link>
                              ) : (
                                <span
                                  className={`${styles.megaLink} ${styles.unavailable}`}
                                  aria-disabled="true"
                                >
                                  <span>{item.label}</span>
                                  {item.badge ? (
                                    <span className={styles.badge}>
                                      {item.badge}
                                    </span>
                                  ) : null}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.emptyMessage}>
                  This collection is being prepared for release.
                </p>
              )}
            </div>

            {cards.length > 0 ? (
              <div className={styles.visualGrid} aria-label="Featured catalog">
                {cards.map((card) => {
                  const content = (
                    <>
                      <Image
                        className={styles.visualImage}
                        src={card.image ?? catalogVisualCardFallbackImage}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 16vw, 0px"
                      />
                      <span className={styles.visualScrim} aria-hidden="true" />
                      <span className={styles.visualCaption}>
                        <span>{card.label}</span>
                        {card.badge ? (
                          <span className={styles.badge}>{card.badge}</span>
                        ) : null}
                      </span>
                    </>
                  );

                  return isLinkEnabled(card, linksEnabled) && card.href ? (
                    <Link
                      key={card.id}
                      href={card.href}
                      className={styles.visualCard}
                      onClick={() => closeMegaPanel(false)}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={card.id}
                      className={styles.visualCard}
                      aria-disabled="true"
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
