import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function countArchivedOffers() {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count
    FROM "Product"
    WHERE "isArchived" = true
      AND "mrp" IS NOT NULL
      AND "price" < "mrp"
  `;

  return Number(rows[0]?.count ?? 0n);
}

async function main() {
  const count = await countArchivedOffers();

  if (count === 0) {
    console.log("No archived products have an active offer.");
    return;
  }

  console.log(`${count} archived product${count === 1 ? "" : "s"} have price below MRP.`);

  if (!apply) {
    console.log("Dry run only — no prices were changed.");
    console.log("Run `npm run remove-archived-offers -- --apply` to set their price back to MRP.");
    return;
  }

  const updated = await prisma.$executeRaw`
    UPDATE "Product"
    SET "price" = "mrp",
        "updatedAt" = NOW()
    WHERE "isArchived" = true
      AND "mrp" IS NOT NULL
      AND "price" < "mrp"
  `;

  const remaining = await countArchivedOffers();
  console.log(`Removed offers from ${updated} archived product${updated === 1 ? "" : "s"}.`);
  console.log(`Archived products still showing an offer: ${remaining}.`);
}

main()
  .catch((error) => {
    console.error("Couldn't remove archived offers:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
