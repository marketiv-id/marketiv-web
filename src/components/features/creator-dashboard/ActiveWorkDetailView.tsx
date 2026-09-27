"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FolderOpen,
  Play,
  Users,
  AlertCircle,
  CheckCircle,
  Info,
  TriangleAlert,
  ExternalLink,
  Clock,
  Banknote,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { CreatorActiveWork } from "@/types/creator-dashboard";
import { getClaimStatusLabel, getFraudStatusLabel, getSubmissionStatusLabel } from "@/lib/creator-status";
import { submitProof, unclaimCampaign } from "@/services/creator/creator-dashboard.service";
import { canUnclaimCreatorActiveWork } from "@/lib/creator-active-work";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { DashboardButton, DashboardStateCard } from "@/components/features/dashboard/shared";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ActiveWorkDetailViewProps {
  work: CreatorActiveWork | null;
}

function ModalFrame({
  cancelLabel = "Tutup",
  children,
  confirmLabel,
  description,
  footer,
  isOpen,
  onClose,
  onConfirm,
  title,
}: {
  cancelLabel?: string;
  children?: ReactNode;
  confirmLabel?: string;
  description?: string;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
}) {
  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent className="max-w-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xl bg-white">
        <ResponsiveModalHeader className="space-y-1.5 text-center">
          <ResponsiveModalTitle className="text-xl sm:text-2xl font-black text-slate-900 font-display tracking-tight">
            {title}
          </ResponsiveModalTitle>
          {description ? (
            <ResponsiveModalDescription className="text-xs text-slate-500 font-medium leading-relaxed">
              {description}
            </ResponsiveModalDescription>
          ) : null}
        </ResponsiveModalHeader>
        {children ? <div className="mt-3">{children}</div> : null}
        <ResponsiveModalFooter className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          {footer ?? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs transition-all cursor-pointer"
              >
                {cancelLabel}
              </button>
              {confirmLabel && onConfirm ? (
                <button
                  type="button"
                  onClick={onConfirm}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-black text-xs shadow-[0_4px_14px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] transition-all cursor-pointer hover:-translate-y-0.5"
                >
                  {confirmLabel}
                </button>
              ) : null}
            </>
          )}
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

const CREATOR_DARK_GRADIENT =
  "linear-gradient(135deg, var(--color-kreator-ink) 0%, var(--color-kreator-ink-mid) 45%, var(--color-kreator-900) 100%)";
const CREATOR_ACTION_GRADIENT =
  "linear-gradient(135deg, var(--color-kreator-600), var(--color-kreator-action-end))";

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-bold text-white/60">
      <span className="text-white/70">{icon}</span>
      {label}
    </span>
  );
}

export function ActiveWorkDetailView({ work: initialWork }: ActiveWorkDetailViewProps) {
  const router = useRouter();
  const [work, setWork] = useState<CreatorActiveWork | null>(initialWork);
  const [renderedAt] = useState(() => Date.now());

  // Derive platform strictly from campaign/work contract
  const campaignPlatform = (work?.platform ?? "tiktok").toLowerCase() as "tiktok" | "instagram";
  const [contentUrl, setContentUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isUnclaimConfirmOpen, setIsUnclaimConfirmOpen] = useState(false);
  const [unclaimSucceeded, setUnclaimSucceeded] = useState(false);
  const [activeTab, setActiveTab] = useState<"detail" | "video">("detail");

  const getSubStatusLabel = (w: CreatorActiveWork): string => {
    if (w.status === "expired") return getClaimStatusLabel("expired");
    if (w.fraudStatus && w.fraudStatus !== "safe") return getFraudStatusLabel(w.fraudStatus);
    if (w.submissionStatus) return getSubmissionStatusLabel(w.submissionStatus);
    if (w.status === "approved") return "Selesai";
    return "Belum Kirim";
  };

  const validateUrl = (url: string, plat: "tiktok" | "instagram"): boolean => {
    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setValidationError("URL wajib diawali dengan http:// atau https://");
      return false;
    }
    const lower = trimmed.toLowerCase();
    if (plat === "tiktok" && !lower.includes("tiktok.com")) {
      setValidationError("Format URL salah. URL wajib memuat domain 'tiktok.com' untuk platform TikTok.");
      return false;
    }
    if (plat === "instagram" && !lower.includes("instagram.com")) {
      setValidationError("Format URL salah. URL wajib memuat domain 'instagram.com' untuk platform Instagram Reels.");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUrl(contentUrl, campaignPlatform)) return;
    setIsConfirmOpen(true);
  };

  const executeSubmit = async () => {
    if (!work) return;
    setIsConfirmOpen(false);
    setIsSubmitting(true);

    const res = await submitProof({
      claimId: work.id,
      campaignId: work.campaignId,
      postUrl: contentUrl.trim(),
      caption: notes.trim() || undefined,
      platform: campaignPlatform,
    });

    setIsSubmitting(false);

    if (!res.success) {
      toast.error(res.error ?? "Gagal mengirim bukti tayang.");
      return;
    }

    setWork((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        contentUrl: contentUrl.trim(),
        platform: campaignPlatform,
        status: "submitted" as const,
        submissionStatus: "pending" as const,
        fraudStatus: undefined,
        submittedAt: new Date().toISOString(),
        notes: notes.trim(),
      };
    });
    setIsSuccessOpen(true);
  };

  const handleUnclaimConfirm = async () => {
    if (!work || !canUnclaimCreatorActiveWork(work)) return;

    const res = await unclaimCampaign(work.id);
    if (!res.success) {
      toast.error(res.error ?? "Gagal membatalkan pekerjaan.");
      throw new Error(res.error ?? "Gagal membatalkan pekerjaan.");
    }

    setUnclaimSucceeded(true);
    toast.success(`Pekerjaan "${work.title}" dibatalkan. Kuota kampanye kembali terbuka.`);
    try {
      router.replace("/dashboard/kreator/pekerjaan-aktif");
    } catch {
      // Mutasi sudah sukses. Tampilkan jalur kembali manual tanpa mengulangnya.
      toast.success("Pekerjaan sudah dibatalkan. Kembali ke daftar untuk memuat ulang status terbaru.");
    }
  };

  if (!work) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col justify-center items-center min-h-[70vh]">
        <DashboardStateCard
          kind="empty"
          title="Pekerjaan tidak ditemukan"
          description="ID pekerjaan yang Anda cari tidak terdaftar atau telah dibatalkan."
          actionLabel="Kembali ke Pekerjaan Aktif"
          onAction={() => { window.location.href = "/dashboard/kreator/pekerjaan-aktif"; }}
        />
      </div>
    );
  }

  if (unclaimSucceeded) {
    return (
      <div className="flex min-h-[70vh] flex-1 flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <DashboardStateCard
          kind="empty"
          title="Pekerjaan dibatalkan"
          description="Klaim sudah dilepas. Kembali ke Pekerjaan Aktif untuk melihat status terbaru."
          actionLabel="Kembali ke Pekerjaan Aktif"
          onAction={() => router.replace("/dashboard/kreator/pekerjaan-aktif")}
        />
      </div>
    );
  }

  const statusLabel = getSubStatusLabel(work);
  const isSubmitted = !!work.contentUrl;
  const canUnclaim = canUnclaimCreatorActiveWork(work);
  const isFraud = work.fraudStatus === "rejected" || work.submissionStatus === "rejected" || work.status === "rejected";
  const isValid = work.submissionStatus === "approved" || work.status === "approved";
  const isPending = isSubmitted && !isValid && !isFraud;
  const auditedViews = work.actualViews ?? 0;
  const earningsEstimate = work.earnings ?? (work.ratePerThousandViews * auditedViews) / 1000;

  const { text: deadlineText, days } = (() => {
    const diffDays = Math.ceil(
      (new Date(work.deadline).getTime() - renderedAt) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 0) return { text: "Melewati batas", days: diffDays };
    if (diffDays === 0) return { text: "Hari ini", days: 0 };
    return { text: `${diffDays} hari lagi`, days: diffDays };
  })();

  const STATUS_BADGE: Record<string, string> = {
    "Belum Kirim": "bg-blue-500/25 text-blue-200 border-blue-400/30",
    "Menunggu Validasi": "bg-amber-500/25 text-amber-200 border-amber-400/30",
    "Menunggu Tinjauan": "bg-amber-500/25 text-amber-200 border-amber-400/30",
    "Perlu Ditinjau": "bg-amber-500/25 text-amber-200 border-amber-400/30",
    "Disetujui": "bg-emerald-500/25 text-emerald-200 border-emerald-400/30",
    "Selesai": "bg-emerald-500/25 text-emerald-200 border-emerald-400/30",
    "Ditolak": "bg-red-500/25 text-red-200 border-red-400/30",
    "Terindikasi Kecurangan": "bg-red-500/25 text-red-200 border-red-400/30",
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* ═══ HERO — full-bleed blurred background ═══ */}
      <div className="relative overflow-hidden" style={{ minHeight: 320 }}>
        <div className="absolute inset-0 scale-110">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: CREATOR_DARK_GRADIENT }}
          />
        </div>

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(12,23,43,0.95) 0%, rgba(12,23,43,0.82) 55%, rgba(12,23,43,0.60) 100%)",
          }}
        />

        <div
          className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(243,245,248,0.6))" }}
        />

        {/* Hero content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
          <Link
            href="/dashboard/kreator/pekerjaan-aktif"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/55 hover:text-white transition-colors mb-7 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
            Kembali ke Pekerjaan Aktif
          </Link>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-start lg:items-center">
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative w-7 h-7 rounded-full border-2 border-white/25 overflow-hidden bg-white/15 shrink-0">
                    {work.brandAvatar ? (
                      <Image src={work.brandAvatar} alt={work.brandName} fill className="object-cover" sizes="28px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-black text-xs text-white/60">
                        {work.brandName?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-white/80">{work.brandName}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-black uppercase tracking-wide text-white/80">
                  KAMPANYE
                </span>
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border",
                    STATUS_BADGE[statusLabel] ?? "bg-neutral-500/25 text-neutral-200 border-neutral-400/30"
                  )}
                >
                  {statusLabel}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                {work.title}
              </h1>

              <div className="flex items-baseline gap-2">
                <span className="font-display text-[2.2rem] font-black text-white tracking-tight leading-none">
                  {formatCurrency(work.ratePerThousandViews)}
                </span>
                <span className="text-sm text-white/50 font-bold">/ 1.000 tayangan</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <StatPill
                  icon={
                    campaignPlatform === "instagram" ? (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z" />
                      </svg>
                    )
                  }
                  label={campaignPlatform.toUpperCase()}
                />
                <span className="w-1 h-1 rounded-full bg-white/25 shrink-0" />
                <StatPill icon={<Eye className="w-3.5 h-3.5" />} label="MODE TARIF PER 1.000 TAYANGAN" />
                <span className="w-1 h-1 rounded-full bg-white/25 shrink-0" />
                <StatPill
                  icon={<Users className="w-3.5 h-3.5" />}
                  label={isValid ? `${auditedViews.toLocaleString("id-ID")} TAYANGAN TERAUDIT` : "BELUM DIVERIFIKASI"}
                />
              </div>

              {/* CTA row */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {!isSubmitted ? (
                  <button
                    onClick={() =>
                      document.getElementById("submit-form-section")?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="min-h-[44px] px-7 font-black text-sm rounded-xl text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                    style={{
                      background: CREATOR_ACTION_GRADIENT,
                      boxShadow: "var(--shadow-kreator-cta)",
                    }}
                  >
                    Kirim untuk Diverifikasi
                  </button>
                ) : (
                  <div className="min-h-[44px] px-6 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-xs font-extrabold text-white/50 select-none">
                    Bukti Tayang Sudah Dikirim
                  </div>
                )}

                {canUnclaim ? (
                  <button
                    type="button"
                    onClick={() => setIsUnclaimConfirmOpen(true)}
                    className="min-h-[44px] px-4 text-xs font-extrabold text-red-100 underline decoration-red-300/60 underline-offset-4 transition-colors hover:text-white"
                    aria-label="Batalkan pekerjaan ini"
                  >
                    Batalkan pekerjaan
                  </button>
                ) : null}

                {work.assetUrl && (
                  <a
                    href={work.assetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 min-h-[44px] px-6 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.10] text-white font-extrabold text-xs transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 text-violet-300" />
                    <span>Buka Materi</span>
                  </a>
                )}
              </div>
            </div>

            <div className="relative w-full lg:w-[320px] xl:w-[360px] aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shrink-0 bg-white/5 hidden lg:block">
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: CREATOR_DARK_GRADIENT }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-6 border-b border-neutral-200">
          {(["detail", "video"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "py-3 border-b-2 font-black text-sm transition-all cursor-pointer capitalize",
                activeTab === tab
                  ? "border-kreator-600 text-kreator-600"
                  : "border-transparent text-neutral-400 hover:text-neutral-600"
              )}
            >
              {tab === "detail" ? "Detail" : "Video Anda"}
            </button>
          ))}
        </div>

        {activeTab === "detail" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-5">
              {/* Brief card */}
              <div className="bg-white border border-neutral-200/60 rounded-[22px] p-6 space-y-5 shadow-[0_2px_12px_rgba(15,23,42,.04)]">
                <h3 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-3">
                  Arahan Kampanye &amp; Detail Aset
                </h3>

                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Instruksi Pengerjaan</h4>
                  <p className="text-sm text-neutral-600 font-medium leading-relaxed">{work.brief}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Tarif per 1.000 Tayangan", value: formatCurrency(work.ratePerThousandViews) },
                    {
                      label: "Tanggal Klaim",
                      value: new Date(work.claimedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
                    },
                    {
                      label: "Batas Waktu",
                      value: new Date(work.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
                      danger: days < 0,
                    },
                    { label: "Bukti Tayang", value: "Tautan URL" },
                  ].map((item) => (
                    <div key={item.label} className="p-3.5 bg-neutral-50 border border-neutral-200/30 rounded-[14px] text-center">
                      <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider">{item.label}</span>
                      <span className={cn("block text-xs font-black mt-1", item.danger ? "text-red-500" : "text-neutral-900")}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {work.assetUrl && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-50 p-4 rounded-[16px] border border-neutral-200/30">
                    <div>
                      <h5 className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider">Materi Pendukung &amp; Logo Merek</h5>
                      <p className="text-[11px] text-neutral-400 font-semibold mt-0.5">Aset yang dilampirkan UMKM untuk kampanye ini.</p>
                    </div>
                    <a
                      href={work.assetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-extrabold text-xs transition-all hover:-translate-y-0.5 cursor-pointer shrink-0"
                      style={{ background: CREATOR_ACTION_GRADIENT }}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Buka Materi
                    </a>
                  </div>
                )}
              </div>

              {/* Submit form OR submitted details */}
              {!isSubmitted ? (
                <div id="submit-form-section" className="bg-white border border-neutral-200/60 rounded-[22px] p-6 shadow-[0_2px_12px_rgba(15,23,42,.04)] space-y-6">
                  <div>
                    <h3 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-3">
                      Kirim Bukti Tayang (Tautan URL)
                    </h3>
                    <p className="text-[11px] text-amber-700 font-bold mt-2 bg-amber-50 border border-amber-200/60 rounded-xl px-3 py-2 leading-relaxed">
                      Pastikan video sudah Anda posting di platform {campaignPlatform === "tiktok" ? "TikTok" : "Instagram Reels"} terlebih dahulu.
                    </p>
                  </div>

                  {/* Reward formula info banner */}
                  <div className="border border-violet-200/70 bg-violet-50/60 rounded-2xl p-4 text-xs text-violet-900 leading-relaxed flex items-start gap-3 shadow-2xs">
                    <div className="w-7 h-7 rounded-xl bg-violet-100/80 border border-violet-200 flex items-center justify-center text-violet-700 shrink-0 mt-0.5">
                      <Info size={15} />
                    </div>
                    <div>
                      <span className="block font-black text-violet-800 text-xs mb-0.5">Cara Hitung Imbalan</span>
                      <span className="font-medium text-violet-700/90 text-[11.5px]">Imbalan = (jumlah tayangan ÷ 1.000) × tarif per 1.000 tayangan, dibulatkan ke bawah. Di bawah 1.000 tayangan, imbalan = Rp0.</span>
                    </div>
                  </div>

                  {validationError && (
                    <div className="bg-rose-50 border border-rose-200/80 p-4 rounded-2xl flex items-start gap-3 text-rose-800 text-xs font-bold leading-relaxed shadow-2xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  <form onSubmit={handlePreSubmit} className="space-y-5">
                    {/* Read-only Platform context (Derived from Campaign) */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Platform Kampanye
                      </label>
                      <div className="px-4 py-3 bg-slate-50 border border-slate-200/90 rounded-2xl font-bold text-xs text-slate-800 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-violet-600" />
                          <span>{campaignPlatform === "tiktok" ? "TikTok Video" : "Instagram Reels"}</span>
                        </span>
                        <span className="text-[9px] font-black text-slate-500 uppercase bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-3xs">
                          Hanya Baca
                        </span>
                      </div>
                    </div>

                    {/* URL input */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Tautan URL Postingan Publik
                      </label>
                      <input
                        type="url"
                        required
                        placeholder={
                          campaignPlatform === "tiktok"
                            ? "https://www.tiktok.com/@username/video/12345678"
                            : "https://www.instagram.com/reel/CtO12345/"
                        }
                        value={contentUrl}
                        onChange={(e) => {
                          setContentUrl(e.target.value);
                          if (validationError) setValidationError(null);
                        }}
                        className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-semibold text-slate-900 placeholder:text-slate-400"
                      />
                      <p className="text-[10px] text-amber-700 font-bold leading-relaxed flex items-center gap-1.5 pt-0.5">
                        <span>⚠️</span>
                        <span>Mode Kampanye: Dilarang mengunggah berkas video. Cukup masukkan tautan URL video publik di atas.</span>
                      </p>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Catatan Tambahan untuk Admin Marketiv (Opsional)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Contoh: Video sudah ditayangkan menggunakan tagar merek..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-semibold text-slate-900 placeholder:text-slate-400 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 sm:py-4 text-center text-white font-black text-xs sm:text-sm rounded-xl sm:rounded-2xl transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 shadow-[0_4px_16px_rgba(124,58,237,0.35)] hover:shadow-[0_8px_24px_rgba(124,58,237,0.45)]"
                    >
                      Kirim untuk Diverifikasi
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="bg-white border border-neutral-200/60 rounded-[22px] p-6 shadow-[0_2px_12px_rgba(15,23,42,.04)] space-y-5">
                    <h3 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-3">
                      Detail Bukti Tayang Diajukan
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-neutral-50 border border-neutral-200/30 rounded-[14px]">
                        <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider">Platform</span>
                        <span className="block text-xs font-black text-neutral-900 mt-1 uppercase">
                          {work.platform === "instagram" ? "📷 Instagram" : "🎵 TikTok"}
                        </span>
                      </div>
                      <div className="p-4 bg-neutral-50 border border-neutral-200/30 rounded-[14px] md:col-span-2">
                        <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider">Tautan Video Postingan</span>
                        <a
                          href={work.contentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs font-black text-kreator-600 mt-1 truncate hover:underline"
                        >
                          <span className="truncate">{work.contentUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </div>

                    {work.notes && (
                      <div className="bg-neutral-50 p-4 rounded-[14px] border border-neutral-200/30 space-y-1">
                        <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider">Catatan Pengiriman</span>
                        <p className="text-xs text-neutral-600 font-medium">{work.notes}</p>
                      </div>
                    )}

                    {isFraud && work.rejectedReason && (
                      <div className="bg-red-50 border border-red-200/60 p-4 rounded-[14px] text-xs font-bold text-red-800 space-y-1 flex items-start gap-2">
                        <TriangleAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-[9px] uppercase tracking-wider text-red-500 mb-1">Alasan Penolakan Audit:</span>
                          <p className="leading-relaxed">{work.rejectedReason}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Earnings / views card */}
                  <div className="bg-white border border-neutral-200/60 rounded-[22px] p-6 shadow-[0_2px_12px_rgba(15,23,42,.04)] space-y-5">
                    <h3 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-3">
                      Estimasi &amp; Data Tayangan Video
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-neutral-50 border border-neutral-200/30 rounded-[14px] text-center">
                        <Eye className="w-4 h-4 text-neutral-400 mx-auto mb-2" />
                        <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider">Jumlah Tayangan</span>
                        <span className="block text-base font-black text-neutral-900 mt-1">
                          {isValid ? auditedViews.toLocaleString("id-ID") : "Belum diverifikasi"}
                        </span>
                      </div>
                      <div className="p-4 bg-neutral-50 border border-neutral-200/30 rounded-[14px] text-center">
                        <Banknote className="w-4 h-4 text-neutral-400 mx-auto mb-2" />
                        <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider">Tarif per 1.000 Tayangan</span>
                        <span className="block text-base font-black text-neutral-900 mt-1">
                          {formatCurrency(work.ratePerThousandViews)}
                        </span>
                      </div>
                      <div
                        className="p-4 rounded-[14px] text-center border"
                        style={{
                          background: "linear-gradient(135deg, color-mix(in srgb, var(--color-kreator-600) 6%, transparent), color-mix(in srgb, var(--color-kreator-action-end) 6%, transparent))",
                          borderColor: "color-mix(in srgb, var(--color-kreator-600) 20%, transparent)",
                        }}
                      >
                        <CheckCircle className="w-4 h-4 text-violet-500 mx-auto mb-2" />
                        <span className="block text-[8px] font-bold text-violet-500 uppercase tracking-wider">
                          {isValid ? "Imbalan Terhitung" : "Estimasi Imbalan"}
                        </span>
                        <span className="block text-base font-black text-kreator-600 mt-1">
                          {isValid ? formatCurrency(earningsEstimate) : "Belum dihitung"}
                        </span>
                      </div>
                    </div>

                    <div
                      className="border rounded-[14px] p-4 text-[11px] text-violet-900 font-bold leading-normal flex items-start gap-2"
                      style={{ background: "color-mix(in srgb, var(--color-kreator-600) 4%, transparent)", borderColor: "color-mix(in srgb, var(--color-kreator-600) 15%, transparent)" }}
                    >
                      <Info className="w-4 h-4 shrink-0 text-violet-500 mt-0.5" />
                      <span>Imbalan dihitung oleh sistem setelah bukti tayang diverifikasi oleh Admin Marketiv: tayangan dibagi 1.000, dibulatkan ke bawah, lalu dikali tarif per 1.000 tayangan. Tayangan di bawah 1.000 = Rp0.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right pane */}
            <div className="lg:col-span-4 space-y-5">
              {/* Timeline */}
              <div className="bg-white border border-neutral-200/60 rounded-[22px] p-6 shadow-[0_2px_12px_rgba(15,23,42,.04)] space-y-5">
                <h4 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-3">
                  Riwayat Progres Bukti
                </h4>

                <div className="relative pl-7 space-y-6 text-xs">
                  <div className="absolute left-3 top-1 bottom-1 w-0.5 bg-neutral-100 rounded-full" />

                  {/* Step 1 */}
                  <div className="relative">
                    <div className="absolute -left-7 top-0.5 w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-white shadow-sm flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <h5 className="font-extrabold text-neutral-900 leading-tight">Kampanye Diklaim</h5>
                    <p className="text-[10px] text-neutral-400 font-bold mt-0.5">
                      {new Date(work.claimedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                    <div
                      className={cn(
                        "absolute -left-7 top-0.5 w-5 h-5 rounded-full border-[3px] border-white shadow-sm flex items-center justify-center",
                        isSubmitted ? "bg-emerald-500" : "bg-neutral-200"
                      )}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <h5 className="font-extrabold text-neutral-900 leading-tight">Bukti Tayang Dikirim</h5>
                    <p className="text-[10px] text-neutral-400 font-bold mt-0.5">
                      {work.submittedAt
                        ? new Date(work.submittedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Belum dikirim"}
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="relative">
                    <div
                      className={cn(
                        "absolute -left-7 top-0.5 w-5 h-5 rounded-full border-[3px] border-white shadow-sm flex items-center justify-center",
                        isSubmitted ? "bg-amber-400" : "bg-neutral-200"
                      )}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <h5 className="font-extrabold text-neutral-900 leading-tight">Verifikasi Marketiv</h5>
                    <p className="text-[10px] text-neutral-400 font-bold mt-0.5">
                      {isSubmitted ? "Sedang diaudit berkala oleh Admin" : "Menunggu pengiriman bukti"}
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="relative">
                    <div
                      className={cn(
                        "absolute -left-7 top-0.5 w-5 h-5 rounded-full border-[3px] border-white shadow-sm flex items-center justify-center",
                        isValid
                          ? "bg-emerald-500"
                          : isFraud
                          ? "bg-red-500"
                          : "bg-neutral-200"
                      )}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <h5 className="font-extrabold text-neutral-900 leading-tight">Hasil Validasi</h5>
                    <p className="text-[10px] text-neutral-400 font-bold mt-0.5">
                      {isValid
                        ? "Disetujui oleh Admin Marketiv"
                        : isFraud
                        ? "Ditolak / Perlu Perbaikan"
                        : "Menunggu hasil audit"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Deadline summary */}
              <div
                className={cn(
                  "rounded-[22px] p-5 border space-y-3",
                  days < 0
                    ? "bg-red-50 border-red-200/60"
                    : days <= 3 && !isSubmitted
                    ? "bg-amber-50 border-amber-200/60"
                    : "bg-neutral-50 border-neutral-200/40"
                )}
              >
                <div className="flex items-center gap-2">
                  <Clock
                    className={cn(
                      "w-4 h-4",
                      days < 0 ? "text-red-500" : days <= 3 && !isSubmitted ? "text-[#c2410c]" : "text-neutral-400"
                    )}
                  />
                  <h4
                    className={cn(
                      "text-[10px] font-extrabold uppercase tracking-widest",
                      days < 0 ? "text-red-600" : days <= 3 && !isSubmitted ? "text-amber-700" : "text-neutral-500"
                    )}
                  >
                    Batas Waktu Pengerjaan
                  </h4>
                </div>
                <p
                  className={cn(
                    "text-sm font-black",
                    days < 0 ? "text-red-600" : days <= 3 && !isSubmitted ? "text-amber-700" : "text-neutral-700"
                  )}
                >
                  {deadlineText}
                </p>
                <p className="text-[10px] text-neutral-400 font-semibold">
                  {new Date(work.deadline).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Campaign Mode rules */}
              <div
                className="rounded-[22px] p-5 border space-y-3"
                style={{
                  background: "color-mix(in srgb, var(--color-kreator-600) 3%, transparent)",
                  borderColor: "color-mix(in srgb, var(--color-kreator-600) 15%, transparent)",
                }}
              >
                <h4 className="text-[10px] font-extrabold text-violet-700 uppercase tracking-widest flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Standar Mode Kampanye
                </h4>
                <ul className="space-y-2 text-[10px] text-violet-900 font-semibold leading-relaxed">
                  {[
                    "Modul chat ditiadakan demi efisiensi pengerjaan.",
                    "Verifikasi jumlah tayangan dilakukan oleh Admin Marketiv saat memvalidasi bukti tayang.",
                    "Pertanyaan teknis dapat diajukan ke Admin via menu Bantuan.",
                  ].map((rule) => (
                    <li key={rule} className="flex items-start gap-1.5">
                      <span className="text-violet-400 shrink-0 mt-0.5">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          /* Video tab */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8">
              <div className="bg-white border border-neutral-200/60 rounded-[22px] p-6 shadow-[0_2px_12px_rgba(15,23,42,.04)] space-y-5">
                <h3 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-3">
                  Statistik &amp; Riwayat Tayangan Video
                </h3>

                {isSubmitted ? (
                  <div className="space-y-4">
                    <div className="p-5 bg-neutral-50 rounded-[16px] border border-neutral-200/30 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-neutral-900">Tautan Bukti Tayang</h4>
                        <a
                          href={work.contentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold text-kreator-600 hover:underline max-w-[280px]"
                        >
                          <span className="truncate">{work.contentUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                      <div className="flex gap-5 shrink-0">
                        <div className="text-center">
                          <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider">Tayangan</span>
                          <span className="block text-sm font-black text-neutral-900 mt-0.5">
                            {isValid ? auditedViews.toLocaleString("id-ID") : "Belum diverifikasi"}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-wider">Imbalan</span>
                          <span className="block text-sm font-black text-kreator-600 mt-0.5">
                            {isValid ? formatCurrency(earningsEstimate) : "Belum dihitung"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="text-[11px] text-violet-900 font-semibold leading-relaxed border rounded-[14px] p-4 flex items-start gap-2"
                      style={{ background: "color-mix(in srgb, var(--color-kreator-600) 4%, transparent)", borderColor: "color-mix(in srgb, var(--color-kreator-600) 15%, transparent)" }}
                    >
                      <Info className="w-4 h-4 shrink-0 text-violet-500 mt-0.5" />
                      <span>Admin Marketiv akan memvalidasi jumlah tayangan video ini saat menyetujui bukti tayang. Pastikan video tetap publik minimal 30 hari pasca persetujuan agar imbalan tidak dibatalkan.</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 flex flex-col justify-center items-center text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-200/50 text-neutral-400">
                      <Play className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-neutral-900">Belum ada video terkirim</h4>
                      <p className="text-[11px] text-neutral-400 font-semibold mt-1">Kirim tautan video Anda terlebih dahulu di tab Detail.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="bg-neutral-50 border border-neutral-200/50 rounded-[22px] p-6 space-y-3">
                <h4 className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest">Cara Kerja Verifikasi Tayangan</h4>
                <p className="text-[11px] text-neutral-500 font-semibold leading-relaxed">
                  Admin Marketiv mengunci jumlah tayangan video ini saat menyetujui bukti tayang. Angka tersebut dikunci dan menjadi dasar perhitungan imbalan.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ModalFrame
        isOpen={isConfirmOpen}
        title="Konfirmasi Pengiriman Bukti"
        description={`Yakin ingin mengirim tautan ${campaignPlatform === "tiktok" ? "TikTok Video" : "Instagram Reels"} berikut sebagai bukti tayang?`}
        onClose={() => setIsConfirmOpen(false)}
        confirmLabel="Ya, Kirim Bukti"
        cancelLabel="Cek Ulang Tautan"
        onConfirm={executeSubmit}
      >
        <div className="mt-3 bg-neutral-50 border border-neutral-200 rounded-[14px] p-4 break-all text-xs font-semibold text-kreator-600">
          {contentUrl}
        </div>
      </ModalFrame>

      <ConfirmDialog
        open={isUnclaimConfirmOpen}
        onClose={() => setIsUnclaimConfirmOpen(false)}
        title="Batalkan pekerjaan ini?"
        description={
          <>
            Klaim Anda atas <span className="font-semibold text-text-primary">&quot;{work.title}&quot;</span> akan
            dilepas dan kuotanya kembali terbuka untuk kreator lain.
          </>
        }
        note="Anda masih bisa mengambil kampanye ini lagi selama kuotanya belum penuh."
        confirmLabel="Batalkan Pekerjaan"
        tone="warning"
        onConfirm={handleUnclaimConfirm}
      />

      {/* Success Modal */}
      <ModalFrame
        isOpen={isSuccessOpen}
        title="Bukti Tayang Berhasil Dikirim!"
        description="Bukti tayang Anda telah dikirim dan sedang dalam antrean verifikasi oleh Admin Marketiv. Anda akan mendapat notifikasi setelah proses selesai."
        onClose={() => setIsSuccessOpen(false)}
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => setIsSuccessOpen(false)}
              className="flex-1 py-3 px-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs transition-all cursor-pointer shadow-xs"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = "/dashboard/kreator/pekerjaan-aktif"; }}
              className="flex-1 py-3 px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:shadow-[0_6px_20px_rgba(124,58,237,0.35)] text-white font-black text-xs transition-all cursor-pointer shadow-md hover:-translate-y-0.5"
            >
              Kembali ke Daftar
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center pb-2">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-500 mx-auto mb-2 shadow-xs">
            <CheckCircle className="w-8 h-8" />
          </div>
        </div>
      </ModalFrame>

      {isSubmitting && (
        <ResponsiveModal open={isSubmitting}>
          <ResponsiveModalContent className="max-w-sm rounded-2xl border border-slate-200/80 p-5 bg-white shadow-2xl" showCloseButton={false}>
            <ResponsiveModalHeader className="sr-only">
              <ResponsiveModalTitle>Mengirim Bukti</ResponsiveModalTitle>
              <ResponsiveModalDescription>
                Tautan bukti posting sedang dikirim.
              </ResponsiveModalDescription>
            </ResponsiveModalHeader>
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-200/60 flex items-center justify-center shrink-0">
                <svg className="animate-spin h-5 w-5 text-violet-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-900 leading-snug">Mengirim Bukti Posting</p>
                <p className="text-[11px] font-medium text-slate-500 leading-tight">Menyimpan tautan tayang ke sistem...</p>
              </div>
            </div>
          </ResponsiveModalContent>
        </ResponsiveModal>
      )}
    </div>
  );
}
