import { CampaignDetailPage } from "@/components/features/umkm-dashboard/campaign";

export const metadata = {
  title: "Detail Kampanye | Dashboard UMKM | Marketiv",
};

interface PageProps {
  params: Promise<{
    campaignId: string;
  }>;
}

export default async function CampaignDetailRoute({ params }: PageProps) {
  const { campaignId } = await params;
  return <CampaignDetailPage campaignId={campaignId} />;
}
