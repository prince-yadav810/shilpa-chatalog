import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";
import { loadProductFormOptions } from "@/lib/admin-options";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  const [product, options] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    loadProductFormOptions(),
  ]);

  if (!product) notFound();

  return (
    <>
      <nav className="mb-4 text-caption text-ink-muted">
        <Link href="/admin/products" className="hover:text-brand">
          Products
        </Link>{" "}
        › Edit
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-section text-ink">{product.name}</h1>
        <Link
          href={`/product/${product.slug}`}
          target="_blank"
          className="text-caption text-ink-muted underline underline-offset-2 hover:text-ink"
        >
          View on the shop
        </Link>
      </div>

      <ProductForm
        initial={{
          id: product.id,
          name: product.name,
          sku: product.sku ?? "",
          categoryId: product.categoryId,
          brandId: product.brandId ?? "",
          price: String(product.price),
          mrp: product.mrp == null ? "" : String(product.mrp),
          variant: product.variant ?? "",
          description: product.description ?? "",
          imageUrl: product.imageUrl ?? "",
          inStock: product.inStock,
          isFeatured: product.isFeatured,
        }}
        categories={options.categories}
        brands={options.brands}
      />
    </>
  );
}
