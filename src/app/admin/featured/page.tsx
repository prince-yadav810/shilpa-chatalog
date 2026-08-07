import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { FeaturedManager } from "@/components/admin/FeaturedManager";

export const dynamic = "force-dynamic";

export default async function AdminFeaturedPage() {
  const items = await prisma.product.findMany({
    where: { isFeatured: true },
    orderBy: [{ featuredOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      variant: true,
      imageUrl: true,
      featuredOrder: true,
      categoryId: true,
      brandId: true,
      price: true,
      mrp: true,
      sku: true,
      description: true,
      inStock: true,
    },
  });

  return (
    <>
      <h1 className="font-heading text-section text-ink">Homepage</h1>
      <p className="mt-2 max-w-2xl text-caption text-ink-muted">
        These products show in the &ldquo;In the shop now&rdquo; row at the top
        of the homepage, in this order. Add a product to the row by ticking{" "}
        &ldquo;Show on the homepage&rdquo; when you{" "}
        <Link href="/admin/products" className="underline">
          edit it
        </Link>
        .
      </p>

      <FeaturedManager items={items} />

      <p className="mt-4 text-caption text-ink-muted">
        The banner strip above the homepage is set in{" "}
        <Link href="/admin/settings" className="underline">
          Settings
        </Link>
        .
      </p>
    </>
  );
}
