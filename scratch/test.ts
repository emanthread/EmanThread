import { getFeaturedCategories } from "../../lib/db-queries";
async function run() {
  const cats = await getFeaturedCategories();
  console.log(JSON.stringify(cats, null, 2));
}
run().catch(console.error).finally(() => process.exit(0));
