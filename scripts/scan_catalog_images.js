const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_dXM3zUuGQ8gc@ep-spring-breeze-b3nkxpfx.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

async function main() {
  console.log("Fetching all products from database...");
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      variant: true,
      imageUrl: true,
      brand: { select: { name: true } },
      category: { select: { name: true, parent: { select: { name: true } } } }
    },
    orderBy: { name: "asc" }
  });

  console.log(`Total products: ${products.length}`);

  const missing = [];
  const broken = [];
  const valid = [];

  const CONCURRENCY = 25;
  let processed = 0;

  async function checkProduct(p) {
    if (!p.imageUrl) {
      missing.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand?.name || "General",
        variant: p.variant || "",
        category: p.category?.name || "General",
        parentCategory: p.category?.parent?.name || "",
        reason: "NULL_URL"
      });
      return;
    }

    try {
      const res = await fetch(p.imageUrl, { method: "GET" });
      const contentType = res.headers.get("content-type") || "";
      const isOk = res.status === 200 && (contentType.includes("image/") || contentType.includes("application/octet-stream"));

      if (isOk) {
        valid.push(p.id);
      } else {
        broken.push({
          id: p.id,
          name: p.name,
          slug: p.slug,
          brand: p.brand?.name || "General",
          variant: p.variant || "",
          category: p.category?.name || "General",
          parentCategory: p.category?.parent?.name || "",
          currentUrl: p.imageUrl,
          statusCode: res.status,
          reason: `HTTP_${res.status}`
        });
      }
    } catch (err) {
      broken.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand?.name || "General",
        variant: p.variant || "",
        category: p.category?.name || "General",
        parentCategory: p.category?.parent?.name || "",
        currentUrl: p.imageUrl,
        reason: err.message
      });
    }
  }

  // Process in concurrent pools
  for (let i = 0; i < products.length; i += CONCURRENCY) {
    const chunk = products.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(checkProduct));
    processed += chunk.length;
    if (processed % 250 === 0 || processed === products.length) {
      process.stdout.write(`\rScanned ${processed}/${products.length} products... (Valid: ${valid.length}, Broken 404: ${broken.length}, Missing Null: ${missing.length})`);
    }
  }

  console.log("\n\n--- Scan Results ---");
  console.log(`Total Products: ${products.length}`);
  console.log(`✅ Valid Working Images: ${valid.length}`);
  console.log(`❌ Broken Images (404/Empty): ${broken.length}`);
  console.log(`⚪ Missing Images (Null): ${missing.length}`);
  console.log(`Total to Fix: ${broken.length + missing.length}`);

  const targetList = [...broken, ...missing];
  fs.writeFileSync("broken_and_missing_products.json", JSON.stringify(targetList, null, 2));
  console.log(`Saved target list to broken_and_missing_products.json`);

  await prisma.$disconnect();
}

main().catch(console.error);
