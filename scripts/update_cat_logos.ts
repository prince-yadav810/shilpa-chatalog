
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const updates = [
  { slug: "packaged-foods", url: "/categories/packaged-foods.jpg" },
  { slug: "personal-care-and-beauty", url: "/categories/personal-care-and-beauty.jpg" },
  { slug: "baby-care", url: "/categories/baby-care.jpg" },
  { slug: "skin-care", url: "/categories/skin-care.jpg" },
  { slug: "home-and-kitchen", url: "/categories/home-and-kitchen.jpg" },
  { slug: "ice-cream-and-frozen-desserts", url: "/categories/ice-cream-and-frozen-desserts.jpg" },
  { slug: "mobility-aids", url: "/categories/mobility-aids.jpg" },
  { slug: "orthopaedic-supports", url: "/categories/orthopaedic-supports.jpg" },

];

async function main() {
  for (const item of updates) {
    const cat = await prisma.category.findUnique({ where: { slug: item.slug } });
    if (cat) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { imageUrl: item.url }
      });
      console.log(`✓ Updated DB Category image for "${cat.name}" -> ${item.url}`);
    }
  }
}

main().then(() => prisma.$disconnect());
