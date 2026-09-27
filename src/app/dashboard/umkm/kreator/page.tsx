import { UmkmDashboardChrome } from "@/components/features/dashboard/UmkmDashboardChrome";
import { CreatorDirectoryPage } from "@/components/features/umkm-dashboard/creators";

export const metadata = {
  title: "Temukan Kreator Terbaik | Dashboard UMKM | Marketiv",
};

export default function CreatorsMarketplacePage() {
  return (
    <UmkmDashboardChrome>
      <CreatorDirectoryPage />
    </UmkmDashboardChrome>
  );
}
