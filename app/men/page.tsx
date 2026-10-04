import {
  generateDepartmentCatalogMetadata,
  renderDepartmentCatalogPage,
  type CatalogRouteProps,
} from "@/components/catalog/catalog-route";

export const revalidate = 0;

type DepartmentRootProps = Pick<CatalogRouteProps, "searchParams">;

export function generateMetadata({ searchParams }: DepartmentRootProps) {
  return generateDepartmentCatalogMetadata("men", {
    params: Promise.resolve({}), searchParams,
  });
}

export default function DepartmentRoot({ searchParams }: DepartmentRootProps) {
  return renderDepartmentCatalogPage("men", {
    params: Promise.resolve({}), searchParams,
  });
}
