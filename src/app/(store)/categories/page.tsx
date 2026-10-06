import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Layers3, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ProductGrid";

export const revalidate = 300;

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { parentId: null, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (categories.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState title="Categories are being prepared." hint="Please check back shortly." />
      </div>
    );
  }

  return (
    <div className="pb-3">
      <section className="overflow-hidden rounded-[1.5rem] border border-[#eadbd1] bg-[#fff3e9] px-4 py-5 shadow-[0_8px_24px_rgba(109,64,37,0.08)] sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e84a35] text-white shadow-[0_8px_16px_rgba(202,58,43,0.22)]">
            <Layers3 size={20} strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#bf4d34]">Browse your way</p>
            <h2 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-[#39241e] sm:text-3xl">
              Shop by category
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#704e40]">
              Start with a department, then choose exactly what you need.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <article
            key={category.id}
            className="overflow-hidden rounded-[1.35rem] border border-[#eaded7] bg-surface shadow-[0_5px_18px_rgba(91,57,38,0.07)]"
          >
            <Link href={`/c/${category.slug}`} className="group block p-2.5">
              <div className="relative aspect-[1.18] overflow-hidden rounded-[1rem] bg-[#fff7f1]">
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 44vw, 220px"
                    className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <Package className="absolute inset-0 m-auto text-[#e5cfc2]" size={28} aria-hidden="true" />
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-1">
                <h2 className="line-clamp-2 text-sm font-extrabold leading-tight text-ink">{category.name}</h2>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#d84b2f] transition-transform group-hover:translate-x-0.5" strokeWidth={2.8} />
              </div>
            </Link>

            {category.children.length > 0 && (
              <div className="border-t border-[#f0e6df] px-2.5 py-2">
                <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#a27967]">Popular picks</p>
                <div className="flex flex-wrap gap-1">
                  {category.children.slice(0, 3).map((child) => (
                    <Link
                      key={child.id}
                      href={`/c/${category.slug}/${child.slug}`}
                      className="max-w-full truncate rounded-full bg-[#fff1e7] px-2 py-1 text-[10px] font-semibold text-[#754f40] transition-colors hover:bg-[#fbe0ce]"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
