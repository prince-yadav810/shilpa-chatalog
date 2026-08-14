import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { DeleteBrandModal } from "@/components/admin/DeleteBrandModal";
import { AddBrandForm } from "@/components/admin/AddBrandForm";

export const dynamic = "force-dynamic";

export default async function AdminBrandsPage() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });

  return (
    <>
      <h1 className="font-heading text-section text-ink">Brands</h1>
      <p className="mt-2 max-w-2xl text-caption text-ink-muted">
        Brands are separate from categories, so one product can appear under{" "}
        <em>Ice Cream</em>, under <em>Amul</em>, and on a combined{" "}
        <em>Amul ice cream</em> page at the same time.
      </p>

      <div className="mt-6 border border-border bg-surface p-5">
        <AddBrandForm />
      </div>

      {brands.length === 0 ? (
        <p className="mt-8 border border-border bg-surface px-6 py-12 text-center text-body text-ink-muted">
          No brands yet. Add one above, or let the catalog import create them.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto border border-border bg-surface">
          <table className="w-full min-w-[560px] text-left">
            <thead className="border-b border-border">
              <tr className="text-caption uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 text-right font-medium">Products</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-background">
                        {brand.logoUrl ? (
                          <Image
                            src={brand.logoUrl}
                            alt=""
                            fill
                            className="object-contain p-1"
                            sizes="40px"
                          />
                        ) : (
                          <span className="text-caption text-border">—</span>
                        )}
                      </div>
                      <div>
                        <p className="text-body text-ink">{brand.name}</p>
                        <p className="text-caption text-ink-muted">/brand/{brand.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="price px-4 py-3 text-body text-ink">
                    {brand._count.products}
                  </td>
                  <td className="px-4 py-3 text-caption text-ink-muted">
                    {brand.isActive ? "Visible" : "Hidden"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/admin/brands/${brand.id}/edit`}
                        className="text-caption text-brand underline underline-offset-2"
                      >
                        Edit
                      </Link>
                      <DeleteBrandModal brand={brand} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
