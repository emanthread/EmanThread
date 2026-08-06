import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ProductEditor } from "@/components/admin/product-editor";
import { hasPermission, Permission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string }>;
}) {
  const session = await auth();
  if (
    !session?.user ||
    !hasPermission(
      session.user.role || "",
      Permission.MANAGE_PRODUCTS,
      session.user.permissions
    )
  ) {
    notFound();
  }

  const { duplicate } = await searchParams;
  return <ProductEditor duplicateFromId={duplicate} />;
}
