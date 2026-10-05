import "dotenv/config";
import {
  configureCatalogSearchIndex,
  isAlgoliaIndexingConfigured,
  syncEntireCatalogSearchIndex,
} from "../src/lib/catalog-search";

async function main() {
  if (!isAlgoliaIndexingConfigured()) {
    throw new Error(
      "Missing Algolia configuration. Add ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY first.",
    );
  }

  console.log("Configuring the product-search index…");
  await configureCatalogSearchIndex();

  console.log("Syncing active products…");
  const count = await syncEntireCatalogSearchIndex();
  console.log(`Search index is ready with ${count} active products.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
