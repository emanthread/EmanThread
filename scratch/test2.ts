import { getFilteredProducts } from "../../lib/db-queries";
async function run() {
  const products = await getFilteredProducts({ category: "Wash & Wear" });
  console.log(`Found ${products.length} products for Wash & Wear`);
}
run().catch(console.error).finally(() => process.exit(0));
