import { permanentRedirect } from "next/navigation";
import { DEFAULT_CATALOG_PATH } from "@/lib/navigation/storefront-routes";

/**
 * The generic listing was replaced by schema-driven department catalogs.
 * Keep this compatibility redirect for old bookmarks and saved campaign URLs.
 */
export default function RetiredShopPage() {
  permanentRedirect(DEFAULT_CATALOG_PATH);
}
