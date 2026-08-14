import { StoreHeader } from "@/components/StoreHeader";
import { getSettings } from "@/lib/settings";

export async function Header() {
  const settings = await getSettings();

  return (
    <StoreHeader
      storeName={settings.storeName}
      whatsappNumber={settings.whatsappNumber}
    />
  );
}
