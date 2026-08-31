"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  catalogMenu,
  type MenuDepartment,
  type MenuLeaf,
  type MenuSection,
} from "@/lib/navigation/catalog-menu";
import {
  isPublishedCatalogHref,
  publishedCatalogPathSet,
} from "@/lib/navigation/published-catalog";
import styles from "./catalog-mobile-department-menu.module.css";

type CatalogMobileDepartmentMenuProps = {
  linksEnabled: boolean;
  showNavigation: boolean;
  publishedCatalogPaths: readonly string[];
};

const byOrder = <T extends { order: number }>(items: readonly T[]) =>
  [...items].sort((left, right) => left.order - right.order);

function routeDepartment(pathname: string): MenuDepartment["id"] | null {
  const segment = pathname.split("/").filter(Boolean)[0];
  return catalogMenu.some((department) => department.id === segment)
    ? (segment as MenuDepartment["id"])
    : null;
}

function enabledLeaf(item: MenuLeaf, linksEnabled: boolean): boolean {
  return Boolean(
    linksEnabled &&
      item.href &&
      item.status === "active" &&
      !item.comingSoon,
  );
}

function routeSection(
  pathname: string,
  sections: readonly MenuSection[],
): MenuSection | null {
  return (
    [...sections]
      .filter(
        (section) =>
          section.href &&
          (pathname === section.href || pathname.startsWith(`${section.href}/`)),
      )
      .sort((left, right) => (right.href?.length ?? 0) - (left.href?.length ?? 0))[0] ??
    null
  );
}

export function CatalogMobileDepartmentMenu({
  linksEnabled,
  showNavigation,
  publishedCatalogPaths,
}: CatalogMobileDepartmentMenuProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const publishedPaths = useMemo(
    () => publishedCatalogPathSet(publishedCatalogPaths),
    [publishedCatalogPaths],
  );
  const departments = useMemo(
    () =>
      byOrder(catalogMenu).filter((department) =>
        isPublishedCatalogHref(`/${department.id}`, publishedPaths),
      ),
    [publishedPaths],
  );
  const currentDepartmentId = routeDepartment(pathname);
  const [openDepartmentId, setOpenDepartmentId] = useState<
    MenuDepartment["id"] | null
  >(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const openDepartment =
    departments.find((department) => department.id === openDepartmentId) ?? null;
  const publishedSections = useMemo(
    () =>
      openDepartment
        ? byOrder(openDepartment.sections).filter(
            (section) =>
              section.href &&
              isPublishedCatalogHref(section.href, publishedPaths),
          )
        : [],
    [openDepartment, publishedPaths],
  );
  const selectedSection =
    publishedSections.find((section) => section.id === selectedSectionId) ??
    publishedSections[0] ??
    null;

  useEffect(() => {
    setOpenDepartmentId(null);
    setSelectedSectionId(null);
  }, [pathname]);

  useEffect(() => {
    if (!openDepartmentId) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpenDepartmentId(null);
        setSelectedSectionId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenDepartmentId(null);
        setSelectedSectionId(null);
      }
    };
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setOpenDepartmentId(null);
        setSelectedSectionId(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [openDepartmentId]);

  if (!showNavigation || departments.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={styles.mobileDepartmentNavigation}
      data-open={Boolean(openDepartment)}
    >
      <nav className={styles.departmentScroller} aria-label="Mobile departments">
        {departments.map((department) => {
          const isOpen = department.id === openDepartmentId;
          const isCurrent = department.id === currentDepartmentId;

          return (
            <button
              key={department.id}
              type="button"
              className={styles.departmentButton}
              data-active={isOpen || (!openDepartmentId && isCurrent)}
              aria-expanded={isOpen}
              aria-controls={`mobile-catalog-panel-${department.id}`}
              onClick={() => {
                if (isOpen) {
                  setOpenDepartmentId(null);
                  setSelectedSectionId(null);
                  return;
                }

                const nextSections = byOrder(department.sections).filter(
                  (section) =>
                    section.href &&
                    isPublishedCatalogHref(section.href, publishedPaths),
                );
                const currentSection = routeSection(pathname, nextSections);
                setOpenDepartmentId(department.id);
                setSelectedSectionId(currentSection?.id ?? nextSections[0]?.id ?? null);
              }}
            >
              {department.label}
            </button>
          );
        })}
      </nav>

      {openDepartment ? (
        <>
          <button
            type="button"
            className={styles.menuBackdrop}
            aria-label="Close category menu"
            onClick={() => {
              setOpenDepartmentId(null);
              setSelectedSectionId(null);
            }}
          />
          <section
            id={`mobile-catalog-panel-${openDepartment.id}`}
            className={styles.menuPanel}
            aria-label={`${openDepartment.label} categories`}
          >
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>{openDepartment.label}</span>
            {linksEnabled ? (
              <Link
                href={`/${openDepartment.id}`}
                className={styles.shopAllLink}
                onClick={() => setOpenDepartmentId(null)}
              >
                Shop all
              </Link>
            ) : null}
          </div>

          <nav
            className={styles.sectionScroller}
            aria-label={`${openDepartment.label} categories`}
          >
            {publishedSections.map((section) => (
              <button
                key={section.id}
                id={`mobile-catalog-tab-${section.id}`}
                type="button"
                className={styles.sectionButton}
                aria-pressed={selectedSection?.id === section.id}
                aria-controls={`mobile-catalog-section-${section.id}`}
                onClick={() => setSelectedSectionId(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>

          {selectedSection ? (
            <div
              id={`mobile-catalog-section-${selectedSection.id}`}
              className={styles.sectionContent}
              role="region"
              aria-labelledby={`mobile-catalog-tab-${selectedSection.id}`}
            >
              {linksEnabled && selectedSection.href ? (
                <Link
                  href={selectedSection.href}
                  className={styles.sectionLanding}
                  onClick={() => setOpenDepartmentId(null)}
                >
                  Shop {selectedSection.label}
                </Link>
              ) : null}

              <div className={styles.groupGrid}>
                {byOrder(selectedSection.groups).map((group) => {
                  const items = byOrder(
                    group.items.filter(
                      (item) =>
                        item.visibility === "visible" &&
                        isPublishedCatalogHref(item.href, publishedPaths),
                    ),
                  );
                  if (items.length === 0) return null;

                  return (
                    <section key={group.id} className={styles.group}>
                      <h3 className={styles.groupTitle}>{group.label}</h3>
                      <div className={styles.groupLinks}>
                        {items.map((item) =>
                          enabledLeaf(item, linksEnabled) && item.href ? (
                            <Link
                              key={item.id}
                              href={item.href}
                              className={styles.leafLink}
                              onClick={() => setOpenDepartmentId(null)}
                            >
                              <span>{item.label}</span>
                              {item.badge ? (
                                <span className={styles.badge}>{item.badge}</span>
                              ) : null}
                            </Link>
                          ) : (
                            <span
                              key={item.id}
                              className={`${styles.leafLink} ${styles.unavailable}`}
                              aria-disabled="true"
                            >
                              {item.label}
                            </span>
                          ),
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className={styles.emptyState}>No categories are currently available.</p>
          )}
          </section>
        </>
      ) : null}
    </div>
  );
}
