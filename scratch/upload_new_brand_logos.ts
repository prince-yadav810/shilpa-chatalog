import { prisma } from "../src/lib/prisma";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function getLogoUrl(brandName: string): Promise<string | null> {
  const query = `${brandName} brand logo png transparent vector`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML: Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const html = await res.text();
    const matches = html.match(/https?:\/\/[^"'\s>]+\.(?:png|jpg|svg|jpeg)/gi);
    if (!matches || matches.length === 0) return null;

    for (const imgUrl of matches.slice(0, 5)) {
      if (imgUrl.includes("logo") || imgUrl.includes("brand") || imgUrl.includes("vector")) {
        try {
          const imgRes = await fetch(imgUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
          if (!imgRes.ok) continue;
          const buffer = await imgRes.arrayBuffer();

          const uploadRes = await new Promise<any>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "shilpa/brand_logos" },
              (err, result) => (err ? reject(err) : resolve(result))
            );
            stream.end(Buffer.from(buffer));
          });
          return uploadRes.secure_url;
        } catch {
          continue;
        }
      }
    }
  } catch {}
  return null;
}

async function main() {
  const brandsWithoutLogo = await prisma.brand.findMany({
    where: { logoUrl: null },
  });

  console.log(`Found ${brandsWithoutLogo.length} brands missing logos.`);

  for (const b of brandsWithoutLogo) {
    console.log(`Fetching logo for brand: ${b.name}...`);
    const logoUrl = await getLogoUrl(b.name);
    if (logoUrl) {
      await prisma.brand.update({
        where: { id: b.id },
        data: { logoUrl },
      });
      console.log(`[UPDATED BRAND LOGO] ${b.name} -> ${logoUrl}`);
    } else {
      console.log(`[NO LOGO FOUND] ${b.name}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
