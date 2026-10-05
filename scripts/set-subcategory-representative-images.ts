import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const replace = process.argv.includes("--replace");

type ImageCandidate = {
  categoryId: string;
  categoryName: string;
  parentName: string;
  productName: string;
  imageUrl: string;
  isFeatured: boolean;
};

async function main() {
  const subcategories = await prisma.category.findMany({
    where: {
      parentId: { not: null },
      isActive: true,
      ...(replace ? {} : { imageUrl: null }),
    },
    select: {
      id: true,
      name: true,
      parent: { select: { name: true } },
    },
    orderBy: [{ parent: { name: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
  });

  const candidates: ImageCandidate[] = [];
  const withoutProductImage: string[] = [];

  for (const category of subcategories) {
    // "Featured" is the available editorial signal for a well-known product.
    // Otherwise use a currently in-stock, non-archived product with photography.
    const product = await prisma.product.findFirst({
      where: {
        categoryId: category.id,
        isArchived: false,
        imageUrl: { not: null },
        NOT: { imageUrl: "" },
      },
      select: {
        name: true,
        imageUrl: true,
        isFeatured: true,
      },
      orderBy: [
        { isFeatured: "desc" },
        { inStock: "desc" },
        { featuredOrder: "asc" },
        { name: "asc" },
      ],
    });

    if (!product?.imageUrl) {
      withoutProductImage.push(
        `${category.parent?.name ?? "Uncategorised"} › ${category.name}`,
      );
      continue;
    }

    candidates.push({
      categoryId: category.id,
      categoryName: category.name,
      parentName: category.parent?.name ?? "Uncategorised",
      productName: product.name,
      imageUrl: product.imageUrl,
      isFeatured: product.isFeatured,
    });
  }

  console.log(
    `${candidates.length} subcategor${candidates.length === 1 ? "y" : "ies"} can use a representative product image.`,
  );
  if (withoutProductImage.length > 0) {
    console.log(`No usable product image for ${withoutProductImage.length} subcategories:`);
    withoutProductImage.forEach((name) => console.log(`  - ${name}`));
  }

  console.table(
    candidates.slice(0, 20).map((candidate) => ({
      subcategory: `${candidate.parentName} › ${candidate.categoryName}`,
      representativeProduct: candidate.productName,
      selection: candidate.isFeatured ? "Featured product" : "In-stock product",
    })),
  );

  if (!apply) {
    console.log("Dry run only — no category images were changed.");
    console.log(
      "Run `npm run set-subcategory-images -- --apply` to fill missing images.",
    );
    console.log(
      "Add `--replace` to refresh existing subcategory images as well.",
    );
    return;
  }

  for (const candidate of candidates) {
    await prisma.category.update({
      where: { id: candidate.categoryId },
      data: { imageUrl: candidate.imageUrl },
    });
  }

  console.log(`Updated ${candidates.length} subcategory images.`);
}

main()
  .catch((error) => {
    console.error("Couldn't set subcategory images:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
