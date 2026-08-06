import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ProductEditor } from "@/components/admin/product-editor";
import { hasPermission, Permission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;
  return <ProductEditor productId={id} />;
}
