import { Campaign } from "@/types/umkm-dashboard.types";
import { MetricCard } from "@/components/ui/metric-card";

interface CampaignOverviewCardsProps {
  campaign: Campaign;
  pendingSubmissionsCount: number;
}

export function CampaignOverviewCards({
  campaign,
  pendingSubmissionsCount,
}: CampaignOverviewCardsProps) {
  const remainingBudget = campaign.totalBudgetEscrow - campaign.usedBudget;

  const cardData = [
    {
      label: "Total Tayangan Video",
      value: campaign.totalViews === undefined ? "—" : campaign.totalViews,
      helper: "Jumlah penonton tayangan",
      tone: "info" as const,
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      label: "Dana Kampanye",
      value: campaign.totalBudgetEscrow,
      currency: "full" as const,
      helper: "Dana awal yang disiapkan",
      tone: "primary" as const,
      highlight: true,
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      label: "Dana Terpakai",
      value: campaign.usedBudget,
      currency: "full" as const,
      helper: "Total hadiah teralokasi",
      tone: "danger" as const,
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8L13 14l-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: "Sisa Dana Kampanye",
      value: remainingBudget,
      currency: "full" as const,
      helper: "Tersimpan aman",
      tone: "success" as const,
      highlight: true,
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Kreator Mendaftar",
      value: `${campaign.usedQuota} / ${campaign.creatorQuota}`,
      helper: "Kreator yang bergabung",
      tone: "default" as const,
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "Menunggu Validasi",
      value: pendingSubmissionsCount,
      helper: "Bukti diproses Marketiv",
      tone: "warning" as const,
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 shrink-0">
      {cardData.map((card, i) => (
        <MetricCard
          key={i}
          label={card.label}
          value={card.value}
          helper={card.helper}
          icon={card.icon}
          currency={card.currency}
          tone={card.tone}
          highlight={card.highlight}
        />
      ))}
    </div>
  );
}
