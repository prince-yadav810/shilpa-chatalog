import Link from "next/link";
import Image from "next/image";
import type { Prisma } from "@prisma/client";
import { Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { parsePage } from "@/lib/queries";
import { formatPrice } from "@/lib/pricing";
import { Pagination, PAGE_SIZE } from "@/components/Pagination";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { AdminProductFilters } from "@/components/admin/AdminProductFilters";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    stock?: string;
    page?: string;
  }>;
};

export default async function AdminProductsPage({ searchParams }: Props) {
  const { q, category, stock, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const query = (q ?? "").trim();

  const where: Prisma.ProductWhereInput = {
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { sku: { contains: query, mode: "insensitive" as const } },
            { variant: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(category ? { categoryId: category } : {}),
    ...(stock === "out" ? { inStock: false } : {}),
    ...(stock === "in" ? { inStock: true } : {}),
  };

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        price: true,
        mrp: true,
        variant: true,
        imageUrl: true,
        inStock: true,
        isFeatured: true,
        category: { select: { name: true, parent: { select: { name: true } } } },
        brand: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { children: { none: {} } },
      select: { id: true, name: true, parent: { select: { name: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-section text-ink">
          Products <span className="price text-body text-ink-muted">{total}</span>
        </h1>
        <Link href="/admin/products/new" className="btn-primary">
          Add a product
        </Link>
      </div>

      <div className="mt-6">
        <AdminProductFilters
          categories={categories.map((c) => ({
            id: c.id,
            label: c.parent ? `${c.parent.name} › ${c.name}` : c.name,
          }))}
        />
      </div>

      {products.length === 0 ? (
        <p className="mt-8 border border-border bg-surface px-6 py-12 text-center text-body text-ink-muted">
          {query || category || stock
            ? "No products match those filters."
            : "No products yet. Add one to get started."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto border border-border bg-surface">
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b border-border">
              <tr className="text-caption uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-background">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt=""
                            fill
                            className="object-contain p-0.5"
                            sizes="40px"
                          />
                        ) : (
                          <Package size={14} className="text-border" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-body text-ink">{product.name}</p>
                        <p className="text-caption text-ink-muted">
                          {[product.brand?.name, product.variant, product.sku]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-caption text-ink-muted">
                    {product.category.parent
                      ? `${product.category.parent.name} › ${product.category.name}`
                      : product.category.name}
                  </td>
                  <td className="price px-4 py-3 text-body text-ink">
                    {formatPrice(product.price)}
                    {product.mrp != null && product.mrp > product.price && (
                      <span className="block text-caption text-ink-muted line-through">
                        {formatPrice(product.mrp)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-caption">
                    {product.inStock ? (
                      <span className="text-ink-muted">In stock</span>
                    ) : (
                      <span className="text-accent">Out of stock</span>
                    )}
                    {product.isFeatured && (
                      <span className="block text-ink-muted">On homepage</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/product/${product.slug}`}
                        target="_blank"
                        className="text-caption text-ink-muted underline underline-offset-2 hover:text-ink"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="text-caption text-brand underline underline-offset-2"
                      >
                        Edit
                      </Link>
                      <ConfirmButton
                        endpoint={`/api/products/${product.id}`}
                        successMessage={`"${product.name}" deleted`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/admin/products"
        params={{ q: query || undefined, category, stock }}
      />
    </>
  );
}
