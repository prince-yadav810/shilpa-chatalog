import "dotenv/config";
/**
 * Move sourced product images onto our own Cloudinary account and rewrite the
 * catalog file to point at them.
 *
 *   npm run upload-images -- data/catalog/amul.json
 *
 * Run this after filling in `imageUrl` on each row during sourcing, and before
 * importing. Rows already on Cloudinary are skipped, so it's safe to re-run.
 *
 * Why copy rather than link: the demo hotlinked live product photos from
 * third-party retail sites, which breaks the moment they change a path — and
 * puts the shop's storefront at the mercy of someone else's server.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { catalogFileSchema } from "../src/lib/catalog-file";
import { slugify } from "../src/lib/slugify";

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--"));
const force = args.includes("--force");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadFromUrl(url: string, publicId: string): Promise<string> {
  // Some brand sites reject requests without a browser-ish UA, so fetch the
  // bytes here rather than handing Cloudinary the remote URL.
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
      Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) throw new Error(`not an image (${type || "unknown"})`);

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength < 1024) throw new Error("suspiciously small file");

  const uploaded = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "shilpa/products",
          public_id: publicId,
          overwrite: true,
          resource_type: "image",
          // Trim to a sane storefront size; keeps the CDN bill and LCP down.
          transformation: [{ width: 1000, height: 1000, crop: "limit", quality: "auto" }],
        },
        (err, result) =>
          err || !result ? reject(err ?? new Error("no result")) : resolve(result),
      )
      .end(buffer);
  });

  return uploaded.secure_url;
}

async function main() {
  if (!filePath) {
    throw new Error("Usage: npm run upload-images -- <path/to/catalog.json> [--force]");
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary credentials are missing from .env");
  }

  const abs = path.resolve(process.cwd(), filePath);
  const file = catalogFileSchema.parse(JSON.parse(readFileSync(abs, "utf8")));

  let uploaded = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const row of file.products) {
    if (!row.imageUrl) {
      skipped += 1;
      continue;
    }
    if (row.imageUrl.includes("res.cloudinary.com") && !force) {
      skipped += 1;
      continue;
    }

    const publicId = `${slugify(row.brand ?? "unbranded")}-${slugify(row.name)}-${slugify(row.sku)}`;

    try {
      const url = await uploadFromUrl(row.imageUrl, publicId);
      row.imageUrl = url;
      uploaded += 1;
      console.log(`  ✓ ${row.sku} ${row.name}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      failures.push(`${row.sku} ${row.name} — ${reason}`);
      console.log(`  ✗ ${row.sku} ${row.name} — ${reason}`);
    }
  }

  writeFileSync(abs, `${JSON.stringify(file, null, 2)}\n`, "utf8");

  console.log(`\n${uploaded} uploaded, ${skipped} skipped, ${failures.length} failed.`);
  if (failures.length > 0) {
    console.log("\nSource these by hand and re-run:");
    for (const f of failures) console.log(`  • ${f}`);
  }
  console.log(`\n${filePath} rewritten with Cloudinary URLs.\n`);
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : err}\n`);
  process.exitCode = 1;
});
