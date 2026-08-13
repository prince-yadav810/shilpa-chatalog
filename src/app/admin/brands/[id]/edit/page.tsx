import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BrandEditForm } from "@/components/admin/BrandEditForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = { params: Promise<{ id: string }> };

export default async function EditBrandPage({ params }: Props) {
  const { id } = await params;

  const brand = await prisma.brand.findUnique({
    where: { id },
  });

  if (!brand) notFound();

  const products = await prisma.product.findMany({
    where: { brandId: id },
    include: {
      category: {
        select: { name: true }
      }
    },
    orderBy: { name: "asc" }
  });

  return (
    <>
      <nav className="mb-4 text-caption text-ink-muted">
        <Link href="/admin/brands" className="hover:text-brand">
          Brands
        </Link>{" "}
        › {brand.name}
      </nav>

      <h1 className="mb-6 font-heading text-section text-ink flex items-center justify-between">
        <span>Edit Brand: <strong className="text-brand">{brand.name}</strong></span>
        <span className="text-sm font-medium text-ink-muted bg-surface-subtle px-3 py-1 rounded-full border border-border">
          {products.length} Products
        </span>
      </h1>

      <BrandEditForm
        brand={{
          id: brand.id,
          name: brand.name,
          logoUrl: brand.logoUrl,
          isActive: brand.isActive,
        }}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          mrp: p.mrp,
          variant: p.variant,
          imageUrl: p.imageUrl,
          isArchived: p.isArchived,
          inStock: p.inStock,
          categoryName: p.category?.name || "General"
        }))}
      />
    </>
  );
}
