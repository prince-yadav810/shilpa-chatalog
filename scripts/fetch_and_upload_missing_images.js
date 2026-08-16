const { PrismaClient } = require("@prisma/client");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_dXM3zUuGQ8gc@ep-spring-breeze-b3nkxpfx.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

cloudinary.config({
  cloud_name: "glviggky",
  api_key: "614689384162168",
  api_secret: "TUi9fK9ddIyWmuTtdoO-eQHEKcs"
});

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function searchProductImage(query) {
  try {
    const tokenRes = await fetch("https://duckduckgo.com/?q=" + encodeURIComponent(query), {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      signal: AbortSignal.timeout(8000)
    });
    const html = await tokenRes.text();
    const vqdMatch = html.match(/vqd=([\d-]+)/) || html.match(/vqd=\"([\d-]+)\"/);
    if (!vqdMatch) return null;

    const vqd = vqdMatch[1];
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?l=in-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
        signal: AbortSignal.timeout(8000)
      }
    );
    const data = await imgRes.json();
    if (!data.results || data.results.length === 0) return null;

    for (const item of data.results) {
      const imgUrl = item.image;
      if (!imgUrl || !imgUrl.startsWith("http")) continue;
      if (imgUrl.includes("favicon") || imgUrl.includes("logo") || imgUrl.includes("icon") || imgUrl.includes("placeholder")) {
        continue;
      }

      try {
        const testRes = await fetch(imgUrl, {
          method: "GET",
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(7000)
        });
        const cType = testRes.headers.get("content-type") || "";
        if (testRes.status === 200 && (cType.includes("image/") || cType.includes("application/octet-stream"))) {
          const buffer = await testRes.arrayBuffer();
          if (buffer.byteLength > 4000) {
            return {
              url: imgUrl,
              buffer: Buffer.from(buffer),
              source: item.domain || "web"
            };
          }
        }
      } catch {
        // Try next
      }
    }
  } catch {
    // Search error
  }
  return null;
}

async function uploadToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "shilpa/products",
        public_id: publicId,
        overwrite: true,
        resource_type: "image"
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

async function main() {
  if (!fs.existsSync("broken_and_missing_products.json")) {
    console.error("Run scan_catalog_images.js first to generate broken_and_missing_products.json");
    process.exit(1);
  }

  const items = JSON.parse(fs.readFileSync("broken_and_missing_products.json", "utf-8"));
  console.log(`Starting parallel image search & re-upload for ${items.length} products...\n`);

  let successCount = 0;
  let failCount = 0;
  let processed = 0;

  const CONCURRENCY = 4;
  const queue = [...items];

  async function worker(workerId) {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      processed++;
      const brandPrefix = item.brand && !item.name.toLowerCase().includes(item.brand.toLowerCase()) ? `${item.brand} ` : "";
      const variantSuffix = item.variant && !item.name.toLowerCase().includes(item.variant.toLowerCase()) ? ` ${item.variant}` : "";
      const searchQuery = `${brandPrefix}${item.name}${variantSuffix}`.trim();

      let found = await searchProductImage(searchQuery);

      // Fallback query if not found on primary
      if (!found && item.brand) {
        found = await searchProductImage(`${item.name} ${item.variant || ""}`.trim());
      }

      if (found) {
        try {
          const publicId = `${slugify(item.brand || "product")}-${slugify(item.name)}${item.variant ? `-${slugify(item.variant)}` : ""}`.slice(0, 95);
          const secureUrl = await uploadToCloudinary(found.buffer, publicId);

          await prisma.product.update({
            where: { id: item.id },
            data: { imageUrl: secureUrl }
          });

          successCount++;
          console.log(`[${processed}/${items.length}] ✅ [Worker ${workerId}] ${item.name} -> Uploaded from ${found.source}`);
        } catch (uploadErr) {
          failCount++;
          console.log(`[${processed}/${items.length}] ❌ [Worker ${workerId}] ${item.name} -> Upload failed: ${uploadErr.message}`);
        }
      } else {
        // If image not found online, reset imageUrl to null so it cleanly renders placeholder
        await prisma.product.update({
          where: { id: item.id },
          data: { imageUrl: null }
        });
        failCount++;
        console.log(`[${processed}/${items.length}] ⚪ [Worker ${workerId}] ${item.name} -> No online image found (Cleaned to null placeholder)`);
      }

      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  console.log("\n==========================================");
  console.log(`Finished processing all ${items.length} items!`);
  console.log(`✅ Successfully uploaded and updated: ${successCount}`);
  console.log(`⚪ Cleaned / No image: ${failCount}`);
  console.log("==========================================");

  await prisma.$disconnect();
}

main().catch(console.error);
