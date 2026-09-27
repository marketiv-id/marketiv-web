import { UmkmDashboardChrome } from "@/components/features/dashboard/UmkmDashboardChrome";
import { RatecardReviewListPage } from "@/components/features/umkm-dashboard/ratecard-review";

export const metadata = {
  title: "Tinjauan Pekerjaan | Dashboard UMKM | Marketiv",
};

export default function ReviewRateCardPage() {
  return <UmkmDashboardChrome><div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><RatecardReviewListPage /></div></UmkmDashboardChrome>;
}
