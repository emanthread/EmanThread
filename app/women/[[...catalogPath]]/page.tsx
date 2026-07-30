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
  return generateDepartmentCatalogMetadata("women", props);
}

export default function WomenCatalogPage(props: CatalogRouteProps) {
  return renderDepartmentCatalogPage("women", props);
}
