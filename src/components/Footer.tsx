import Link from "next/link";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { buildContactLink, formatDisplayNumber } from "@/lib/whatsapp";
import { getSettings } from "@/lib/settings";

export async function Footer() {
  const settings = await getSettings();

  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-body text-brand">{settings.storeName}</p>
          <p className="mt-1 text-caption text-ink-muted">
            Browse what we stock and send your order on WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/brands" className="text-caption text-ink-muted hover:text-brand">
            Brands
          </Link>
          {settings.whatsappNumber && (
            <a
              href={buildContactLink(settings.whatsappNumber, settings.storeName)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp h-9 px-3 py-0 text-caption"
            >
              <WhatsAppIcon className="h-4 w-4" />
              {formatDisplayNumber(settings.whatsappNumber)}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
