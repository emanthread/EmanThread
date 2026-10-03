import { permanentRedirect } from "next/navigation";
import { retiredWomenRootDestination } from "@/lib/navigation/storefront-routes";

type WomenRootProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Resolve the retired catalog root on every request so it cannot return
// an old cached page shell.
export const dynamic = "force-dynamic";

export default async function WomenRoot({ searchParams }: WomenRootProps) {
  permanentRedirect(retiredWomenRootDestination(await searchParams));
}
