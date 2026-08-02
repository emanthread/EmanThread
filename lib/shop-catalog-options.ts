import { catalogMenu } from "@/lib/navigation/catalog-menu";

export type ShopCatalogOption = {
  path: string;
  label: string;
  department: string;
};

/**
 * A read-only bridge for the existing /shop screen. It exposes the approved
 * catalog destinations as filters without changing the static navigation or
 * rewriting any legacy category/product records.
 */
export const shopCatalogOptions: ShopCatalogOption[] = (() => {
  const options = new Map<string, ShopCatalogOption>();

  for (const department of catalogMenu) {
    for (const section of department.sections) {
      const add = (path: string | null, label: string) => {
        if (!path || path === "/shop" || !path.startsWith(`/${department.id}`)) {
          return;
        }
        options.set(path, {
          path,
          label: `${department.label} · ${label}`,
          department: department.label,
        });
      };

      add(section.href, section.label);
      for (const group of section.groups) {
        for (const item of group.items) {
          if (item.visibility !== "visible" || item.status !== "active" || item.comingSoon) {
            continue;
          }
          add(item.href, `${section.label} · ${group.label} · ${item.label}`);
        }
      }
    }
  }

  return Array.from(options.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "en")
  );
})();

export function isShopCatalogPath(value: string | null | undefined): value is string {
  return Boolean(value && shopCatalogOptions.some((option) => option.path === value));
}
