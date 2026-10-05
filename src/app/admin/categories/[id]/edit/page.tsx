import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CategoryEditForm } from "@/components/admin/CategoryEditForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params;

  const [category, parents, productImages] = await Promise.all([
    prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { children: true } } },
    }),
    prisma.category.findMany({
      where: { parentId: null, products: { none: {} } },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      where: {
        categoryId: id,
        isArchived: false,
        imageUrl: { not: null },
        NOT: { imageUrl: "" },
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        brand: { select: { name: true } },
      },
      orderBy: [
        { isFeatured: "desc" },
        { inStock: "desc" },
        { featuredOrder: "asc" },
        { name: "asc" },
      ],
      take: 100,
    }),
  ]);

  if (!category) notFound();

  return (
    <>
      <nav className="mb-4 text-caption text-ink-muted">
        <Link href="/admin/categories" className="hover:text-brand">
          Categories
        </Link>{" "}
        › Edit
      </nav>

      <h1 className="mb-6 font-heading text-section text-ink">{category.name}</h1>

      <CategoryEditForm
        category={{
          id: category.id,
          name: category.name,
          parentId: category.parentId,
          imageUrl: category.imageUrl,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
          hasChildren: category._count.children > 0,
        }}
        // A category can't be its own parent.
        parents={parents.filter((p) => p.id !== category.id)}
        productImages={productImages.flatMap((product) =>
          product.imageUrl
            ? [
                {
                  id: product.id,
                  name: product.name,
                  imageUrl: product.imageUrl,
                  brandName: product.brand?.name ?? null,
                },
              ]
            : [],
        )}
      />
    </>
  );
}
