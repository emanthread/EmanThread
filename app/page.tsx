import { DepartmentHome } from "@/components/home/department-home";

// Always render the current homepage shell; data helpers retain their caches.
export const revalidate = 0;

export default function HomePage() {
  return <DepartmentHome department="women" />;
}
