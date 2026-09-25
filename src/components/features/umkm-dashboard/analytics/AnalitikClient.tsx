"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Megaphone,
  CheckCircle2,
  Eye,
  Wallet,
  Users,
  Clock,
  AlertCircle,
  BarChart2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { UmkmDashboardChrome } from "@/components/features/dashboard/UmkmDashboardChrome";
import { UmkmPageWrapper } from "@/components/features/umkm-dashboard/shared/UmkmPageWrapper";
import { MetricCard } from "@/components/ui/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PerformanceChart } from "./PerformanceChart";
import {
  getDashboardSummary,
  getCampaigns,
  getUmkmProfile,
} from "@/services/umkm/umkm-dashboard.service";
import type { UmkmDashboardSummary, Campaign } from "@/types/umkm-dashboard.types";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active:          { label: "Aktif",          cls: "bg-emerald-50 text-emerald-700 border-emerald-200/60" },
  completed:       { label: "Selesai",         cls: "bg-blue-50   text-blue-700   border-blue-200/60"    },
  draft:           { label: "Draft",           cls: "bg-neutral-100 text-neutral-500 border-neutral-200"   },
  paused:          { label: "Dijeda",          cls: "bg-amber-50  text-amber-700  border-amber-200/60"   },
  pending_payment: { label: "Menunggu Bayar",  cls: "bg-orange-50 text-orange-700 border-orange-200/60"  },
};

function CampaignRow({ c }: { c: Campaign }) {
  const s = STATUS_MAP[c.status] ?? STATUS_MAP.draft;
  const pct = c.creatorQuota > 0 ? Math.min((c.usedQuota / c.creatorQuota) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-3 sm:gap-4 p-3.5 rounded-2xl border border-neutral-200/60 bg-white hover:shadow-sm hover:-translate-y-px transition-all duration-200">
      <div className="flex-1 min-w-0">
        <p className="text-[0.88rem] font-[700] text-ink-900 truncate leading-tight">{c.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[0.7rem] font-[600] text-ink-400 capitalize">{c.niche}</span>
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-[800] border",
              s.cls
            )}
          >
            {s.label}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right space-y-1">
        <p className="text-[0.78rem] font-[800] text-ink-700">
          {c.usedQuota}/{c.creatorQuota} kreator
        </p>
        <div className="w-20 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <UmkmDashboardChrome businessName="">
      <UmkmPageWrapper>
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </UmkmPageWrapper>
    </UmkmDashboardChrome>
  );
}

export function AnalitikClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<UmkmDashboardSummary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");

  const fetchData = useCallback(async (isActive: () => boolean) => {
    const [summaryRes, campaignsRes, profileRes] = await Promise.all([
      getDashboardSummary(),
      getCampaigns(),
      getUmkmProfile(),
    ]);
    if (!isActive()) return;

    if (!summaryRes.success) {
      setError(summaryRes.error ?? "Gagal memuat data analitik.");
      setLoading(false);
      return;
    }

    setSummary(summaryRes.data ?? null);

    if (!campaignsRes.success) {
      setCampaignsError(campaignsRes.error ?? "Gagal memuat data campaign.");
      setCampaigns([]);
    } else {
      setCampaignsError(null);
      setCampaigns(
        [...(campaignsRes.data ?? [])].sort((a, b) => b.usedQuota - a.usedQuota)
      );
    }

    if (profileRes.success && profileRes.data) {
      setBusinessName(profileRes.data.businessName);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      await fetchData(() => active);
    })();
    return () => {
      active = false;
    };
  }, [fetchData]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    void fetchData(() => true);
  };

  if (loading) return <LoadingSkeleton />;

  if (error || !summary) {
    return (
      <UmkmDashboardChrome businessName="">
        <UmkmPageWrapper>
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <AlertCircle size={40} className="text-neutral-300" />
            <div>
              <p className="text-[0.92rem] font-[700] text-ink-600">
                {error ?? "Gagal memuat data."}
              </p>
              <p className="text-[0.78rem] text-ink-400 mt-1">
                Periksa koneksi Anda lalu coba lagi.
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[0.84rem] font-[700] transition-colors cursor-pointer"
            >
              <RefreshCw size={14} /> Coba Lagi
            </button>
          </div>
        </UmkmPageWrapper>
      </UmkmDashboardChrome>
    );
  }

  return (
    <UmkmDashboardChrome businessName={businessName}>
      <UmkmPageWrapper>

        {/* ── Header ── */}
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-2 text-[0.68rem] font-[800] text-orange-600 uppercase tracking-widest">
            <span className="w-4 h-[2px] rounded-full bg-orange-500" />
            Performa Bisnis
          </div>
          <h1 className="text-[1.8rem] font-[850] text-ink-900 leading-tight tracking-[-0.03em] font-display">
            Analitik & Insight
          </h1>
          <p className="text-[0.88rem] text-ink-500 font-[500] mb-4">
            Ringkasan performa campaign dan aktivitas bisnis Anda di Marketiv.
          </p>

          {summary.isTruncated && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-sm font-semibold text-amber-700">
                Sebagian data analitik di bawah ini adalah estimasi (mencapai batas maksimal sistem 5000 data).
              </p>
            </div>
          )}
        </div>

        {/* ── KPI Baris 1 — Campaign & Views ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Campaign Aktif"
            value={summary.activeCampaigns}
            icon={<Megaphone />}
            tone="success"
            helper={
              summary.completedCampaigns > 0
                ? `${summary.completedCampaigns} selesai`
                : "belum ada yang selesai"
            }
          />
          <MetricCard
            label="Total Views"
            value={summary.totalViews}
            icon={<Eye />}
            tone="info"
            helper="views terverifikasi"
          />
          <MetricCard
            label="Total Pengeluaran"
            value={summary.totalSpent}
            icon={<Wallet />}
            currency="compact"
            tone="primary"
            helper="campaign & kolaborasi Rate Card"
          />
          <MetricCard
            label="Saldo Escrow"
            value={summary.escrowBalance}
            icon={<TrendingUp />}
            currency="compact"
            tone="warning"
            helper="tertahan di campaign & order aktif"
          />
        </div>

        {/* ── KPI Baris 2 — Operasional ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Submission Masuk"
            value={summary.pendingSubmissions}
            icon={<Clock />}
            tone={summary.pendingSubmissions > 0 ? "danger" : "default"}
            helper={summary.pendingSubmissions > 0 ? "menunggu review" : "semua sudah diulas"}
          />
          <MetricCard
            label="Negosiasi Aktif"
            value={summary.activeNegotiations}
            icon={<Users />}
            tone="kreator"
            helper="dengan kreator"
          />
          <MetricCard
            label="Campaign Selesai"
            value={summary.completedCampaigns}
            icon={<CheckCircle2 />}
            tone="success"
            helper="total sepanjang waktu"
          />
          <MetricCard
            label="Pembayaran Tertunda"
            value={summary.pendingPayments}
            icon={<AlertCircle />}
            tone={summary.pendingPayments > 0 ? "danger" : "default"}
            helper={summary.pendingPayments > 0 ? "perlu tindakan" : "semua lunas"}
          />
        </div>

        {/* ── Daftar Campaign ── */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-50 border border-orange-200/50 text-orange-600 shrink-0">
                <Megaphone size={15} />
              </div>
              <h4 className="text-[0.92rem] font-[800] text-ink-900 font-display">
                Semua Campaign
              </h4>
            </div>
            <span className="text-[0.74rem] font-[700] text-ink-400 shrink-0">
              {campaigns.length} campaign
            </span>
          </div>

          {campaignsError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
              <p className="text-sm font-semibold text-red-600 mb-3">{campaignsError}</p>
              <button
                onClick={handleRetry}
                className="text-xs font-bold bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Megaphone size={32} className="text-neutral-200" />
              <p className="text-[0.84rem] font-[600] text-ink-400">Belum ada campaign</p>
              <p className="text-[0.76rem] text-ink-300">
                Buat campaign pertama Anda untuk mulai melihat data di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => (
                <CampaignRow key={c.id} c={c} />
              ))}
            </div>
          )}
        </div>

        {/* ── Grafik Performa Views ── */}
        <PerformanceChart campaigns={campaigns} summary={summary} />

      </UmkmPageWrapper>
    </UmkmDashboardChrome>
  );
}
