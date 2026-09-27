import { Megaphone, TrendingUp, CheckCircle, Eye, Clock, Shield } from "lucide-react";
import type { UmkmDashboardSummary } from "@/types/umkm-dashboard.types";
import { formatCompactViews, formatCompactCurrency } from "@/lib/formatters";

interface SummaryCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  note: string;
  iconBg: string;
  iconColor: string;
  iconBorder: string;
}

function SummaryCard({ icon: Icon, label, value, note, iconBg, iconColor, iconBorder }: SummaryCardProps) {
  return (
    <div className="relative min-w-0 p-3.5 sm:p-4.5 border border-neutral-200/80 rounded-2xl sm:rounded-[22px] bg-gradient-to-b from-white to-neutral-50/50 shadow-3xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary-500/20 group">
      {/* Icon Row — Perkecil di mobile */}
      <div className="flex items-center justify-between gap-3 mb-2.5 sm:mb-3.5">
        <div
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-[14px] grid place-items-center border shadow-3xs transition-transform duration-300 group-hover:scale-105"
          style={{ background: iconBg, borderColor: iconBorder, color: iconColor }}
        >
          <div className="block sm:hidden">
            <Icon size={14} />
          </div>
          <div className="hidden sm:block">
            <Icon size={18} />
          </div>
        </div>
      </div>
      
      {/* Label text */}
      <div className="text-[0.66rem] sm:text-[0.74rem] font-extrabold text-neutral-500 tracking-wide uppercase">
        {label}
      </div>
      
      {/* Value — Ukuran medium seimbang untuk 3 kolom (2 baris) */}
      <div className="font-display text-[1.2rem] sm:text-[1.4rem] lg:text-[1.55rem] font-black text-neutral-900 tracking-tight leading-none mt-1 sm:mt-1.5 break-all">
        {value}
      </div>
      
      {/* Note text */}
      <div className="text-[0.68rem] sm:text-[0.74rem] text-neutral-400 font-semibold mt-1 sm:mt-1.5 leading-none">
        {note}
      </div>
    </div>
  );
}

interface CampaignSummaryCardsProps {
  summary: UmkmDashboardSummary;
}

export function CampaignSummaryCards({ summary }: CampaignSummaryCardsProps) {
  return (
    /* Grid: 2 kolom di mobile (2x3), 3 kolom di desktop/tablet (3x2) untuk keseimbangan ukuran card */
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
      <SummaryCard
        icon={Megaphone}
        label="Total Kampanye"
        value={String(summary.activeCampaigns + summary.completedCampaigns)}
        note="Aktif & selesai"
        iconBg="#fff7ed" iconColor="#ea580c" iconBorder="rgba(234,88,12,.18)"
      />
      <SummaryCard
        icon={TrendingUp}
        label="Kampanye Aktif"
        value={String(summary.activeCampaigns)}
        note="Sedang berjalan"
        iconBg="#f1fbf5" iconColor="#16a34a" iconBorder="rgba(22,163,74,.18)"
      />
      <SummaryCard
        icon={CheckCircle}
        label="Kampanye Selesai"
        value={String(summary.completedCampaigns)}
        note="Berhasil diselesaikan"
        iconBg="#f0f6ff" iconColor="#2563eb" iconBorder="rgba(37,99,235,.18)"
      />
      <SummaryCard
        icon={Eye}
        label="Total Tayangan"
        value={formatCompactViews(summary.totalViews)}
        note="Dari semua kampanye"
        iconBg="#f7f3ff" iconColor="#7c3aed" iconBorder="rgba(124,58,237,.18)"
      />
      <SummaryCard
        icon={Clock}
        label="Bukti Konten Menunggu"
        value={String(summary.pendingSubmissions)}
        note="Perlu validasi"
        iconBg="#fffbeb" iconColor="#d97706" iconBorder="rgba(217,119,6,.18)"
      />
      <SummaryCard
        icon={Shield}
        label="Dana Aman Kampanye"
        value={formatCompactCurrency(summary.escrowBalance)}
        note="Dana Anda aman"
        iconBg="#f1fbf5" iconColor="#16a34a" iconBorder="rgba(22,163,74,.18)"
      />
    </div>
  );
}
