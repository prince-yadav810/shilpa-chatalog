import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDisplayNumber } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [products, categories, brands, outOfStock, featured, settings] =
    await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.brand.count(),
      prisma.product.count({ where: { inStock: false } }),
      prisma.product.count({ where: { isFeatured: true } }),
      getSettings(),
    ]);

  const stats = [
    { label: "Products", value: products, href: "/admin/products" },
    { label: "Categories", value: categories, href: "/admin/categories" },
    { label: "Brands", value: brands, href: "/admin/brands" },
    { label: "Out of stock", value: outOfStock, href: "/admin/products?stock=out" },
    { label: "On the homepage", value: featured, href: "/admin/featured" },
  ];

  return (
    <>
      <h1 className="font-heading text-section text-ink">Overview</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="border border-border bg-surface p-4 transition-colors hover:border-brand/40"
          >
            <span className="price block text-2xl text-ink">{stat.value}</span>
            <span className="mt-1 block text-caption text-ink-muted">{stat.label}</span>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/products/new" className="btn-primary">
          Add a product
        </Link>
        <Link href="/admin/categories" className="btn-secondary">
          Manage categories
        </Link>
      </div>

      <section className="mt-10 border border-border bg-surface p-5">
        <h2 className="font-heading text-body text-ink">Orders come to WhatsApp</h2>
        <p className="mt-2 max-w-2xl text-caption text-ink-muted">
          Every order button on the shop opens a WhatsApp chat to{" "}
          <strong className="text-ink">
            {settings.whatsappNumber
              ? formatDisplayNumber(settings.whatsappNumber)
              : "no number set yet"}
          </strong>{" "}
          with the customer&rsquo;s list already written out. Nothing is charged
          or confirmed on the website — you reply in WhatsApp as usual.{" "}
          <Link href="/admin/settings" className="underline">
            Change the number
          </Link>
          .
        </p>
      </section>
    </>
  );
}
