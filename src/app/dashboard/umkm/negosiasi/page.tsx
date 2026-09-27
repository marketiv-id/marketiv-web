import { UmkmDashboardChrome } from "@/components/features/dashboard/UmkmDashboardChrome";
import { NegotiationListPage } from "@/components/features/umkm-dashboard/negotiation";

export const metadata = {
  title: "Diskusi Paket Harga Kreator | Dashboard UMKM | Marketiv",
};

export default function NegotiationPage() {
  return (
    <UmkmDashboardChrome>
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <NegotiationListPage />
      </div>
    </UmkmDashboardChrome>
  );
}
