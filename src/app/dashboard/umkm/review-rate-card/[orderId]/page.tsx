import { UmkmDashboardChrome } from "@/components/features/dashboard/UmkmDashboardChrome";
import { RatecardReviewDetailPage } from "@/components/features/umkm-dashboard/ratecard-review";

export const metadata = {
  title: "Tinjauan Pekerjaan | Dashboard UMKM | Marketiv",
};

export default async function ReviewRateCardDetailRoute({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <UmkmDashboardChrome><div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><RatecardReviewDetailPage orderId={orderId} /></div></UmkmDashboardChrome>;
}
