import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "@/components/SearchBar";
import { CartButton } from "@/components/CartButton";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { buildContactLink, formatDisplayNumber } from "@/lib/whatsapp";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

/**
 * Sticky, white surface, hairline bottom border — logo left, search centre,
 * WhatsApp contact right. Ordering is the point of the site, so the number
 * stays visible at every scroll position (DESIGN_SYSTEM.md §Layout).
 */
export async function Header() {
  const [settings, categories] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { name: true, slug: true },
      take: 10,
    }),
  ]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/logo.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />
          <span className="font-heading text-lg text-brand">{settings.storeName}</span>
        </Link>

        <div className="hidden flex-1 md:block">
          <Suspense fallback={<div className="field h-[38px]" />}>
            <SearchBar />
          </Suspense>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <CartButton />
          {settings.whatsappNumber && (
            <a
              href={buildContactLink(settings.whatsappNumber, settings.storeName)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp h-9 px-3 py-0 text-caption"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span className="hidden lg:inline">
                {formatDisplayNumber(settings.whatsappNumber)}
              </span>
              <span className="lg:hidden">Chat</span>
            </a>
          )}
        </div>
      </div>

      <div className="border-t border-border md:hidden">
        <div className="px-4 py-2">
          <Suspense fallback={<div className="field h-[38px]" />}>
            <SearchBar />
          </Suspense>
        </div>
      </div>

      {categories.length > 0 && (
        <nav
          aria-label="Categories"
          className="border-t border-border bg-surface"
        >
          <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/c/${c.slug}`}
                  className="block whitespace-nowrap px-2.5 py-1.5 text-caption text-ink-muted hover:text-brand"
                >
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/brands"
                className="block whitespace-nowrap px-2.5 py-1.5 text-caption text-ink-muted hover:text-brand"
              >
                Brands
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
