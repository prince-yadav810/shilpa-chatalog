import Link from "next/link";
import type { Metadata } from "next";
import { ToastProvider } from "@/components/admin/Toast";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/products/archived", label: "Archived" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/featured", label: "Homepage" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // The login page renders inside this layout too, so the chrome only appears
  // once there's a session.
  if (!session) return <ToastProvider>{children}</ToastProvider>;

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        {/* Admin screens reuse the tokens but stay purely functional — no hero
            treatment, no branding flourishes (DESIGN_SYSTEM.md §Layout). */}
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
            <Link href="/admin" className="font-heading text-body text-brand">
              Shilpa admin
            </Link>
            <nav className="flex flex-1 flex-wrap gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-2.5 py-1.5 text-caption text-ink-muted hover:text-brand"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              href="/"
              target="_blank"
              className="text-caption text-ink-muted hover:text-brand"
            >
              View shop
            </Link>
            <LogoutButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
