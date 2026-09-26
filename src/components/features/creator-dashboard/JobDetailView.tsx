"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Share2,
  Play,
  ChevronDown,
  ChevronRight,
  AlignLeft,
  Info,
  Globe,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileText,
  Tag,
  X,
} from "lucide-react";
import { CreatorJob } from "@/types/creator-dashboard";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { claimCampaign, getCreatorActiveWorks } from "@/services/creator/creator-dashboard.service";
import { toast } from "sonner";
import { ClaimCampaignModal } from "./modals/ClaimCampaignModal";
import { ClaimSuccessModal } from "./modals/ClaimSuccessModal";
import {
  DashboardButton,
  DashboardStateCard,
} from "@/components/features/dashboard/shared";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";

interface JobDetailViewProps {
  job: CreatorJob | null;
}

function ModalFrame({
  children,
  description,
  footer,
  isOpen,
  onClose,
  title,
}: {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}) {
  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent className="max-w-lg rounded-t-3xl sm:rounded-3xl">
        <ResponsiveModalHeader className="space-y-2 text-left">
          <ResponsiveModalTitle className="text-xl font-bold text-neutral-950">
            {title}
          </ResponsiveModalTitle>
          {description ? (
            <ResponsiveModalDescription className="text-sm leading-6 text-neutral-500">
              {description}
            </ResponsiveModalDescription>
          ) : null}
        </ResponsiveModalHeader>
        <div className="mt-2">{children}</div>
        {footer ? (
          <ResponsiveModalFooter className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {footer}
          </ResponsiveModalFooter>
        ) : null}
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

const VIDEO_SUB_TABS = ["Semua", "Menunggu", "Disetujui", "Ditolak", "Perlu Aksi", "Dihapus"];
const CREATOR_ACTION_GRADIENT =
  "linear-gradient(135deg, var(--color-kreator-600), var(--color-kreator-action-end))";
const CREATOR_DARK_GRADIENT =
  "linear-gradient(135deg, var(--color-kreator-ink), var(--color-kreator-ink-deep))";
const CREATOR_PLACEHOLDER_GRADIENT =
  "linear-gradient(135deg, var(--color-kreator-700), var(--color-indigo-800))";
const CREATOR_PROGRESS_GRADIENT =
  "linear-gradient(90deg, var(--color-kreator-600), var(--color-kreator-action-end))";
// "Syarat akun" dihapus: minimum followers & niche yang diperbolehkan tidak punya
// kolom apa pun di campaigns/campaign_briefs — sebelumnya diisi konstanta.
const BRIEF_PILLS = ["Aturan", "Narasi", "Caption", "Tentang"] as const;
type BriefPill = (typeof BRIEF_PILLS)[number];

/** Placeholder saat UMKM belum mengisi bagian brief tersebut. */
function BriefEmpty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-neutral-400 font-medium italic">{children}</p>;
}

export function JobDetailView({ job: initialJob }: JobDetailViewProps) {
  const [job, setJob] = useState<CreatorJob | null>(initialJob);
  const [activeTab, setActiveTab] = useState<"detail" | "video">("detail");
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [activeVideoTab, setActiveVideoTab] = useState("Semua");

  // Brief inline section
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [activeBriefSection, setActiveBriefSection] = useState<"brief" | "materi">("brief");
  const [activeBriefPill, setActiveBriefPill] = useState<BriefPill>("Aturan");
  const briefRef = useRef<HTMLDivElement>(null);

  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isRulesChecked, setIsRulesChecked] = useState({
    brief: false,
    privacy: false,
    retention: false,
    views: false,
  });

  useEffect(() => {
    async function checkClaimStatus() {
      if (!initialJob?.id) return;
      const res = await getCreatorActiveWorks();
      if (res.success && res.data) {
        const isAlreadyClaimed = res.data.some((w) => w.campaignId === initialJob.id);
        if (isAlreadyClaimed) {
          setHasClaimed(true);
        }
      }
    }
    checkClaimStatus();
  }, [initialJob?.id]);

  const openBrief = () => {
    setIsBriefOpen(true);
    setTimeout(() => {
      briefRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  /**
   * Klaim campaign. Kuota lokal baru dinaikkan SETELAH server menerima —
   * sebelumnya dinaikkan optimistis, sehingga kuota terlihat berkurang walau
   * klaimnya ditolak (kuota penuh / sudah pernah klaim / profil belum lengkap).
   */
  const handleClaimSubmit = async () => {
    if (!job || isClaiming) return;
    setIsClaiming(true);
    const res = await claimCampaign(job.id);
    setIsClaiming(false);

    if (!res.success) {
      setIsClaimOpen(false);
      toast.error(res.error ?? "Gagal mengambil pekerjaan ini.");
      return;
    }

    setJob((prev) => (prev ? { ...prev, usedQuota: prev.usedQuota + 1 } : null));
    setHasClaimed(true);
    setIsClaimOpen(false);
    setIsSuccessOpen(true);
  };

  if (!job) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col justify-center items-center min-h-[70vh]">
        <DashboardStateCard kind="empty" title="Kampanye tidak ditemukan" description="ID kampanye tidak valid atau telah dihapus." actionLabel="Kembali ke Job Pool" onAction={() => { window.location.href = "/dashboard/kreator/job-pool"; }} />
      </div>
    );
  }

  const isFull = job.usedQuota >= job.quota;
  const isNearLimit = job.quota - job.usedQuota <= 1 && !isFull;
  const percentQuotaUsed = job.quota > 0 ? Math.round((job.usedQuota / job.quota) * 100) : 0;
  const quotaRemainingPct = 100 - percentQuotaUsed;
  const quotaRemaining = job.quota - job.usedQuota;
  const allChecked = isRulesChecked.brief && isRulesChecked.privacy && isRulesChecked.retention && isRulesChecked.views;
  const descText = job.brief ?? "";
  const isLongDesc = descText.length > 220;

  const doList = job.doAndDont?.do ?? [];
  const dontList = job.doAndDont?.dont ?? [];
  const platforms = job.platforms ?? [];
  const materials = job.materials ?? [];

  return (
    <div className="flex-1 overflow-y-auto">
      {/* ═══ HERO — full-bleed image background ═══ */}
      <div className="relative overflow-hidden" style={{ minHeight: 340 }}>
        {/* Blurred bg image */}
        {job.thumbnailUrl ? (
          <div className="absolute inset-0 scale-110" style={{ background: CREATOR_DARK_GRADIENT }}>
            <Image
              src={job.thumbnailUrl}
              alt=""
              fill
              className="object-cover"
              priority
              sizes="100vw"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className="absolute inset-0" style={{ background: CREATOR_DARK_GRADIENT }} />
        )}

        {/* Main dark overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.72) 50%, rgba(0,0,0,0.55) 100%)" }}
        />

        {/* Bottom fade — eases into the card below */}
        <div
          className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.25))" }}
        />

        {/* Hero content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
          {/* Back */}
          <Link href="/dashboard/kreator/job-pool" className="inline-flex items-center gap-1.5 text-xs font-bold text-white/55 hover:text-white transition-colors mb-6 group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
            Kembali
          </Link>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-center">
            {/* Left info */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Brand row */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative w-7 h-7 rounded-full border-2 border-white/25 overflow-hidden bg-white/15 shrink-0">
                    {job.brandAvatar ? (
                      <Image src={job.brandAvatar} alt={job.brandName} fill className="object-cover" sizes="28px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-black text-xs text-white/60">{job.brandName?.charAt(0)}</div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-white/80">{job.brandName}</span>
                </div>
                {job.type && <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-black uppercase tracking-wide text-white/80">{job.type.toUpperCase()}</span>}
                <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border",
                  isFull ? "bg-red-500/30 text-red-200 border-red-400/30"
                  : isNearLimit ? "bg-amber-500/30 text-amber-200 border-amber-400/30"
                  : "bg-emerald-500/30 text-emerald-200 border-emerald-400/30")}>
                  {isFull ? "PENUH" : isNearLimit ? "HAMPIR PENUH" : "ACTIVE"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-black text-white leading-tight tracking-tight">
                {job.title}
              </h1>

              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl sm:text-[2.2rem] font-black text-white tracking-tight leading-none">
                  {formatCurrency(job.ratePerThousandViews)}
                </span>
                <span className="text-sm text-white/50 font-bold">/ 1K views</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-white/55">
                {platforms.map((p, i) => (
                  <span key={p} className="flex items-center gap-1.5">
                    {i > 0 && <span className="w-1 h-1 rounded-full bg-white/25 shrink-0" />}
                    {p.toUpperCase()}
                  </span>
                ))}
                {platforms.length > 0 && <span className="w-1 h-1 rounded-full bg-white/25 shrink-0" />}
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-white/65" />
                  {job.niche.toUpperCase()}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  disabled={isFull || hasClaimed}
                  onClick={() => { setIsRulesChecked({ brief: false, privacy: false, retention: false, views: false }); setIsClaimOpen(true); }}
                  className={cn("min-h-[44px] px-7 font-black text-sm rounded-xl transition-all duration-200",
                    isFull || hasClaimed ? "bg-white/10 text-white/40 cursor-not-allowed border border-white/10 shadow-none" : "text-white hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-lg")}
                  style={!isFull && !hasClaimed ? { background: CREATOR_ACTION_GRADIENT, boxShadow: "var(--shadow-kreator-cta)" } : undefined}
                >
                  {hasClaimed ? "Sudah Diklaim ✓" : isFull ? "Kuota Penuh" : "Join Campaign"}
                </button>
                <button onClick={() => setActiveTab("video")} className="min-h-[44px] px-5 inline-flex items-center gap-2 font-bold text-sm rounded-xl border border-white/25 bg-white/10 hover:bg-white/18 text-white transition-all duration-200 cursor-pointer backdrop-blur-sm">
                  <Play className="w-3.5 h-3.5" />
                  Submit Video
                </button>
                <button className="min-h-[44px] w-11 flex items-center justify-center rounded-xl border border-white/25 bg-white/10 hover:bg-white/18 text-white transition-all duration-200 cursor-pointer backdrop-blur-sm">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: thumbnail */}
            <div
              className="relative w-full lg:w-[400px] xl:w-[440px] aspect-video rounded-2xl overflow-hidden shadow-2xl shrink-0 border-2 border-white/20"
              style={{ background: CREATOR_PLACEHOLDER_GRADIENT }}
            >
              {job.thumbnailUrl ? (
                <Image
                  src={job.thumbnailUrl}
                  alt={job.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 440px"
                  className="object-cover"
                  priority
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center font-black text-8xl text-white/10 select-none" style={{ background: CREATOR_PLACEHOLDER_GRADIENT }}>
                  {job.brandName?.charAt(0) ?? "M"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CONTENT CARD — overlaps hero with rounded top ═══ */}
      <div className="relative -mt-7 bg-white rounded-t-[28px] shadow-[0_15px_30px_rgba(0,0,0,0.03)]">

        {/* Tab bar at top of white card */}
        <div className="border-b border-neutral-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
            {(["detail", "video"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn("py-4 text-sm font-bold border-b-2 transition-all duration-200 cursor-pointer",
                  activeTab === tab ? "border-violet-500 text-violet-600" : "border-transparent text-neutral-400 hover:text-neutral-700")}
              >
                {tab === "detail" ? "Detail" : "Video Kamu"}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7">

          {/* ── Detail tab ── */}
          {activeTab === "detail" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-start">

                {/* Left (8 cols) */}
                <div className="lg:col-span-8 space-y-4">
                  {/* Tentang Campaign */}
                  <div className="bg-white border border-neutral-200/60 rounded-[22px] p-6 shadow-sm">
                    <h3 className="text-sm font-extrabold text-neutral-800 mb-4">Tentang Campaign</h3>
                    <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                      {isDescExpanded || !isLongDesc ? descText : descText.slice(0, 220) + "..."}
                    </p>
                    {isLongDesc && (
                      <button onClick={() => setIsDescExpanded(!isDescExpanded)} className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 mt-3 transition-colors cursor-pointer">
                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isDescExpanded && "rotate-180")} />
                        {isDescExpanded ? "Sembunyikan" : "Show more"}
                      </button>
                    )}
                  </div>

                  {/* Brief & Materi card */}
                  <button
                    onClick={openBrief}
                    className="w-full bg-white border border-neutral-200/60 rounded-[22px] shadow-sm hover:shadow-md hover:-translate-y-0.5 p-5 flex items-center gap-4 text-left transition-all duration-200 group cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-xl bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center shrink-0 transition-colors duration-200">
                      <FileText className="w-5 h-5 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-extrabold text-neutral-800">Brief &amp; Materi Clipping</div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        Penjelasan brand, narasi, aturan + logo, footage &amp; materi yang harus dipakai
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                </div>

                {/* Right (4 cols) */}
                <div className="lg:col-span-4">
                  <div className="bg-white border border-neutral-200/60 rounded-[22px] p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-neutral-700">Kuota Tersedia</span>
                      <span className="text-sm font-black text-neutral-900">
                        {quotaRemaining} / {job.quota} slot
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${quotaRemainingPct}%`, background: CREATOR_PROGRESS_GRADIENT }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-neutral-100">
                      <div className="bg-neutral-50 border border-neutral-200/40 rounded-xl p-3.5">
                        <span className="block text-[9px] font-black text-neutral-400 uppercase tracking-wide mb-2">Mulai Dibayar</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-black text-neutral-900">1.000 Views</span>
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-violet-100 text-violet-700 border border-violet-200 leading-none">CPM Awal</span>
                        </div>
                      </div>
                      <div className="bg-neutral-50 border border-neutral-200/40 rounded-xl p-3.5">
                        <span className="block text-[9px] font-black text-neutral-400 uppercase tracking-wide mb-2">CPM (Rate /1K Views)</span>
                        <span className="text-xs font-black text-neutral-900">{formatCurrency(job.ratePerThousandViews)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Brief & Materi inline section ── */}
              {isBriefOpen && (
                <div ref={briefRef} className="rounded-[22px] border border-neutral-200/60 bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Brief header */}
                  <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-neutral-100">
                    <div>
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wide mb-0.5">
                        Materi Clipping Campaigns:
                      </p>
                      <h3 className="text-base font-black text-neutral-900">{job.title}</h3>
                      <p className="text-xs text-neutral-400 mt-0.5 font-medium">
                        Dibuat pada{" "}
                        {new Date(job.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <button onClick={() => setIsBriefOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors cursor-pointer shrink-0 mt-0.5">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Brief / Materi toggle */}
                  <div className="px-6 pt-5">
                    <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-neutral-200/60 mb-5">
                      <button
                        onClick={() => setActiveBriefSection("brief")}
                        className={cn("py-2.5 text-xs font-bold transition-all cursor-pointer",
                          activeBriefSection === "brief" ? "bg-violet-600 text-white" : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100")}
                      >
                        Brief
                      </button>
                      <button
                        onClick={() => setActiveBriefSection("materi")}
                        className={cn("py-2.5 text-xs font-bold transition-all cursor-pointer",
                          activeBriefSection === "materi" ? "bg-violet-600 text-white" : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100")}
                      >
                        Materi
                      </button>
                    </div>
                  </div>

                  {/* ── Brief content ── */}
                  {activeBriefSection === "brief" && (
                    <div className="px-6 pb-6 space-y-5">
                      {/* Pill nav */}
                      <div className="flex flex-wrap gap-2">
                        {BRIEF_PILLS.map((pill) => (
                          <button key={pill} onClick={() => setActiveBriefPill(pill)}
                            className={cn("px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                              activeBriefPill === pill ? "bg-violet-600 text-white shadow-sm shadow-violet-200" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200")}>
                            {pill}
                          </button>
                        ))}
                      </div>

                      {/* Aturan */}
                      {activeBriefPill === "Aturan" && (
                        <div className="space-y-4">
                          <SectionBox title="Aturan konten" badge={`${platforms.length} platform`}>
                            <FieldBox label="Platform yang diperbolehkan">
                              {platforms.length > 0 ? (
                                <div className="flex gap-2 flex-wrap">
                                  {platforms.map((p) => (
                                    <span key={p} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 border border-neutral-200/40 rounded-xl text-xs font-bold text-neutral-700 capitalize">
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <BriefEmpty>Belum ditentukan UMKM.</BriefEmpty>
                              )}
                            </FieldBox>
                          </SectionBox>

                          <SectionBox title="Do's & Don'ts" badge={`${doList.length + dontList.length} aturan`}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-emerald-50/60 border border-emerald-200/50 rounded-2xl p-4 space-y-2.5">
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wide">HAL YANG BOLEH DILAKUKAN</span>
                                </div>
                                <ul className="space-y-2">
                                  {doList.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-[11px] text-emerald-800 font-semibold leading-normal">
                                      <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="bg-rose-50/60 border border-rose-200/50 rounded-2xl p-4 space-y-2.5">
                                <div className="flex items-center gap-1.5">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span className="text-[10px] font-black text-rose-700 uppercase tracking-wide">HAL YANG DILARANG</span>
                                </div>
                                <ul className="space-y-2">
                                  {dontList.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-[11px] text-rose-800 font-semibold leading-normal">
                                      <span className="w-1 h-1 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </SectionBox>
                        </div>
                      )}

                      {/* Narasi — campaign_briefs.briefDetail */}
                      {activeBriefPill === "Narasi" && (
                        <div className="space-y-4">
                          <SectionBox title="Narasi & pesan" badge="Panduan">
                            <FieldBox label="Instruksi konten dari UMKM">
                              {job.contentInstruction ? (
                                <div className="bg-neutral-50 border border-neutral-200/40 rounded-xl p-4 text-sm text-neutral-700 font-medium leading-relaxed whitespace-pre-line">
                                  {job.contentInstruction}
                                </div>
                              ) : (
                                <BriefEmpty>UMKM belum menuliskan instruksi konten.</BriefEmpty>
                              )}
                            </FieldBox>
                          </SectionBox>
                        </div>
                      )}

                      {/* Caption — campaign_briefs.cta */}
                      {activeBriefPill === "Caption" && (
                        <div className="space-y-4">
                          <SectionBox title="Caption & CTA" badge="Panduan">
                            <FieldBox label="Call to action yang disarankan">
                              {job.ctaInstruction ? (
                                <div className="bg-neutral-50 border border-neutral-200/40 rounded-xl p-4 text-sm text-neutral-700 font-medium leading-relaxed whitespace-pre-line">
                                  {job.ctaInstruction}
                                </div>
                              ) : (
                                <BriefEmpty>UMKM belum menuliskan CTA.</BriefEmpty>
                              )}
                            </FieldBox>
                          </SectionBox>
                        </div>
                      )}

                      {/* Tentang */}
                      {activeBriefPill === "Tentang" && (
                        <div className="space-y-4">
                          <SectionBox title="Tentang brand" badge="Informasi">
                            <FieldBox label="Deskripsi kampanye">
                              {job.brief ? (
                                <p className="text-sm text-neutral-700 font-medium leading-relaxed">
                                  {job.brief}
                                </p>
                              ) : (
                                <BriefEmpty>Belum diisi UMKM.</BriefEmpty>
                              )}
                            </FieldBox>
                            <FieldBox label="Objektif campaign">
                              {job.targetAudience ? (
                                <p className="text-sm text-neutral-700 font-medium leading-relaxed">
                                  {job.targetAudience}
                                </p>
                              ) : (
                                <BriefEmpty>Belum diisi UMKM.</BriefEmpty>
                              )}
                            </FieldBox>
                          </SectionBox>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Materi content ── */}
                  {activeBriefSection === "materi" && (
                    <div className="px-6 pb-6 space-y-4">
                      <div className="bg-neutral-50 border border-neutral-200/40 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-neutral-500 font-medium">
                        <Info className="w-4 h-4 shrink-0 text-neutral-400 mt-0.5" />
                        Penggunaan materi tidak wajib. Boleh pakai sebagian.
                      </div>

                      <div className="space-y-2.5">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wide">
                          Material links (logo, footage, foto produk, dll)
                        </p>
                        {materials.length > 0 ? (
                          materials.map((material) => (
                            <div key={material.id} className="flex items-center gap-3.5 border border-neutral-200/60 rounded-2xl p-4 hover:bg-neutral-50 transition-colors group">
                              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                                {material.kind === "link" ? <Globe className="w-4 h-4 text-neutral-500" /> : <FileText className="w-4 h-4 text-neutral-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-neutral-800 truncate">{material.label}</div>
                              </div>
                              <a
                                href={material.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
                              >
                                {material.kind === "link" ? <><ExternalLink className="w-3 h-3" /> Buka</> : <><ChevronDown className="w-3 h-3 rotate-180" /> Unduh</>}
                              </a>
                            </div>
                          ))
                        ) : (
                          <BriefEmpty>UMKM belum melampirkan materi apa pun.</BriefEmpty>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Video Kamu tab ── */}
          {activeTab === "video" && (
            <div className="bg-white border border-neutral-200/60 rounded-[22px] shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <h3 className="text-sm font-extrabold text-neutral-800">Video Kamu</h3>
              </div>
              <div className="flex border-b border-neutral-100 overflow-x-auto px-5">
                {VIDEO_SUB_TABS.map((tab) => (
                  <button key={tab} onClick={() => setActiveVideoTab(tab)}
                    className={cn("py-3.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all duration-200 cursor-pointer",
                      activeVideoTab === tab ? "border-violet-500 text-violet-600" : "border-transparent text-neutral-400 hover:text-neutral-600")}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="px-5 py-3 border-b border-neutral-50">
                <button className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 border border-neutral-200 hover:border-neutral-300 hover:text-neutral-700 rounded-xl px-3.5 py-2 transition-all duration-200 cursor-pointer">
                  Urutkan dari <AlignLeft className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="py-16 text-center">
                <p className="text-sm text-neutral-400 font-medium">Join campaign dulu untuk mulai submit video.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ CLAIM MODAL ═══ */}
      <ClaimCampaignModal
        isOpen={isClaimOpen && !!job}
        onClose={() => setIsClaimOpen(false)}
        job={job}
        onConfirm={handleClaimSubmit}
        isClaiming={isClaiming}
      />

      {/* ═══ SUCCESS MODAL ═══ */}
      <ClaimSuccessModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        campaignTitle={job?.title}
      />
    </div>
  );
}

// ── Shared sub-components for brief sections ──

function SectionBox({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="border border-neutral-200/60 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-200/40">
        <h4 className="text-xs font-black text-neutral-800">{title}</h4>
        {badge && <span className="text-[10px] font-bold text-neutral-400">{badge}</span>}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function FieldBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wide block">{label}</label>
      {children}
    </div>
  );
}
