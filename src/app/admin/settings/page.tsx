import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <>
      <h1 className="font-heading text-section text-ink">Settings</h1>

      <div className="mt-6">
        <SettingsForm
          initial={{
            storeName: settings.storeName,
            whatsappNumber: settings.whatsappNumber,
            promoBannerText: settings.promoBannerText ?? "",
            promoBannerLink: settings.promoBannerLink ?? "",
          }}
        />
      </div>
    </>
  );
}
