import type { Metadata } from "next";
import {
  generateDepartmentCatalogMetadata,
  renderDepartmentCatalogPage,
  type CatalogRouteProps,
} from "@/components/catalog/catalog-route";

export const revalidate = 300;
export const dynamicParams = true;

export function generateMetadata(
  props: CatalogRouteProps
): Promise<Metadata> {
  return generateDepartmentCatalogMetadata("men", props);
}

export default function MenCatalogPage(props: CatalogRouteProps) {
  return renderDepartmentCatalogPage("men", props);
}
