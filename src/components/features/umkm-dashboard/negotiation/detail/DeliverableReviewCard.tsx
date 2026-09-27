"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";

type ContextualReviewState = "pending" | "valid" | "invalid" | "revision" | "completed";

interface DeliverableReviewCardProps {
  orderId: string;
  state: ContextualReviewState;
}

const CONTENT: Record<ContextualReviewState, { title: string; subtitle: string; cta: string; tone: string }> = {
  pending: { title: "Hasil kerja telah dikirim", subtitle: "Menunggu Validasi Marketiv", cta: "Buka Tinjauan Pekerjaan", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  valid: { title: "Hasil kerja siap ditinjau", subtitle: "Validasi Marketiv selesai", cta: "Tinjau Sekarang", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  invalid: { title: "Bukti belum lolos validasi", subtitle: "Periksa catatan Marketiv", cta: "Buka Tinjauan Pekerjaan", tone: "border-red-200 bg-red-50 text-red-800" },
  revision: { title: "Revisi telah diminta", subtitle: "Menunggu Kreator mengirim versi baru", cta: "Lihat Tinjauan", tone: "border-orange-200 bg-orange-50 text-orange-800" },
  completed: { title: "Pekerjaan selesai", subtitle: "Hasil akhir tersedia", cta: "Lihat Hasil Akhir", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
};

export function DeliverableReviewCard({ orderId, state }: DeliverableReviewCardProps) {
  const content = CONTENT[state];
  return (
    <div className={`rounded-2xl border p-4 ${content.tone}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70">
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black">{content.title}</h4>
          <p className="mt-1 text-xs font-semibold opacity-80">{content.subtitle}</p>
          <Link href={`/dashboard/umkm/review-rate-card/${orderId}`} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-current shadow-sm hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current">
            {content.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
