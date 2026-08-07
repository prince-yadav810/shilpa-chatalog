import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { AddCategoryForm } from "@/components/admin/AddCategoryForm";
import { ReorderControls } from "@/components/admin/ReorderControls";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const tops = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      _count: { select: { products: true } },
      children: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          _count: { select: { products: true } },
        },
      },
    },
  });

  return (
    <>
      <h1 className="font-heading text-section text-ink">Categories</h1>
      <p className="mt-2 max-w-2xl text-caption text-ink-muted">
        Categories go two levels deep — a top-level category like{" "}
        <em>Ice Cream</em>, with subcategories like <em>Tubs</em> and{" "}
        <em>Cones</em> inside it. Products always go in a subcategory.
      </p>

      <div className="mt-6 border border-border bg-surface p-5">
        <AddCategoryForm
          parents={tops.map((t) => ({
            id: t.id,
            name: t.name,
            hasProducts: t._count.products > 0,
          }))}
        />
      </div>

      {tops.length === 0 ? (
        <p className="mt-8 border border-border bg-surface px-6 py-12 text-center text-body text-ink-muted">
          No categories yet. Add a top-level one above to get started.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {tops.map((top) => (
            <li key={top.id} className="border border-border bg-surface">
              <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
                <ReorderControls siblings={tops} id={top.id} />
                <div className="flex-1">
                  <p className="text-body text-ink">
                    {top.name}
                    {!top.isActive && (
                      <span className="ml-2 text-caption text-accent">Hidden</span>
                    )}
                  </p>
                  <p className="text-caption text-ink-muted">
                    /c/{top.slug} · {top.children.length} subcategor
                    {top.children.length === 1 ? "y" : "ies"}
                    {top._count.products > 0 && ` · ${top._count.products} products`}
                  </p>
                </div>
                <Link
                  href={`/admin/categories/${top.id}/edit`}
                  className="text-caption text-brand underline underline-offset-2"
                >
                  Edit
                </Link>
                <ConfirmButton
                  endpoint={`/api/categories/${top.id}`}
                  successMessage={`"${top.name}" deleted`}
                />
              </div>

              {top.children.length === 0 ? (
                <p className="px-4 py-3 text-caption text-ink-muted">
                  No subcategories yet — products can&rsquo;t be added until there
                  is at least one.
                </p>
              ) : (
                <ul>
                  {top.children.map((child) => (
                    <li
                      key={child.id}
                      className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5 pl-8 last:border-0"
                    >
                      <ReorderControls siblings={top.children} id={child.id} />
                      <div className="flex-1">
                        <p className="text-body text-ink">
                          {child.name}
                          {!child.isActive && (
                            <span className="ml-2 text-caption text-accent">Hidden</span>
                          )}
                        </p>
                        <p className="text-caption text-ink-muted">
                          /c/{top.slug}/{child.slug} ·{" "}
                          <span className="price">{child._count.products}</span> products
                        </p>
                      </div>
                      <Link
                        href={`/admin/categories/${child.id}/edit`}
                        className="text-caption text-brand underline underline-offset-2"
                      >
                        Edit
                      </Link>
                      <ConfirmButton
                        endpoint={`/api/categories/${child.id}`}
                        successMessage={`"${child.name}" deleted`}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
