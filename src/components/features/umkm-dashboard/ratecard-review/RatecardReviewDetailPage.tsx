"use client";

/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
/* Hallmark · macrostructure: order dossier + validation rail · existing Marketiv system */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileCheck2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { getRatecardReviewState } from "@/lib/ratecard-review/review-state";
import { getDeliverableStatusLabel, getEscrowStatusLabel, getValidationStatusLabel } from "@/lib/dashboard-labels";
import { approveDeliverable, requestRevision } from "@/services/shared/deliverable.service";
import { getUmkmRatecardReview } from "@/services/umkm/ratecard-review.service";
import type { RatecardReview } from "@/types/ratecard-review.types";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

function DetailSkeleton() {
  return <div aria-label="Memuat detail tinjauan" className="mx-auto max-w-6xl animate-pulse space-y-4"><div className="h-24 rounded-2xl bg-white" /><div className="grid gap-4 lg:grid-cols-3"><div className="h-80 rounded-2xl bg-white lg:col-span-2" /><div className="h-80 rounded-2xl bg-white" /></div></div>;
}

export function RatecardReviewDetailPage({ orderId }: { orderId: string }) {
  const [review, setReview] = useState<RatecardReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionMessage, setRevisionMessage] = useState("");

  const load = useCallback(async () => {
    const result = await getUmkmRatecardReview(orderId);
    if (!result.success || !result.data) {
      setError(result.error ?? "Detail tinjauan pekerjaan tidak ditemukan.");
    } else {
      setReview(result.data);
      setError(null);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    let active = true;
    void getUmkmRatecardReview(orderId).then((result) => {
      if (!active) return;
      if (!result.success || !result.data) {
        setError(result.error ?? "Detail tinjauan pekerjaan tidak ditemukan.");
      } else {
        setReview(result.data);
        setError(null);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [orderId]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setReview(null);
    void load();
  };

  const state = review ? getRatecardReviewState(review) : null;

  const handleApprove = async () => {
    if (!review || !state?.canApprove || !state.actionableDeliverableId || processing) return;
    setProcessing(true);
    const result = await approveDeliverable(review.orderId, state.actionableDeliverableId);
    if (!result.success) {
      setProcessing(false);
      toast.error(result.error ?? "Gagal menyetujui hasil kerja.");
      throw new Error(result.error ?? "Gagal menyetujui hasil kerja.");
    }
    toast.success("Hasil kerja disetujui. Status settlement sedang diperbarui.");
    await load();
    setProcessing(false);
  };

  const handleRevision = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!review || !state?.canRequestRevision || processing) return;
    const message = revisionMessage.trim();
    if (!message) {
      toast.error("Jelaskan bagian yang perlu diperbaiki.");
      return;
    }
    setProcessing(true);
    const result = await requestRevision({ orderId: review.orderId, message });
    if (!result.success) {
      setProcessing(false);
      toast.error(result.error ?? "Gagal meminta revisi.");
      return;
    }
    toast.success("Permintaan revisi terkirim ke Kreator.");
    setRevisionOpen(false);
    setRevisionMessage("");
    await load();
    setProcessing(false);
  };

  if (loading) return <DetailSkeleton />;
  if (error || !review || !state) return (
    <div role="alert" className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-7 text-center">
      <h1 className="text-lg font-black text-red-900">Detail tinjauan gagal dimuat</h1>
      <p className="mt-2 text-sm font-medium text-red-700">{error ?? "Tinjauan pekerjaan tidak ditemukan."}</p>
      <button type="button" onClick={retry} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-xs font-extrabold text-white"><RotateCcw className="h-4 w-4" /> Coba Lagi</button>
    </div>
  );

  const latest = review.latestDeliverable;
  const validationTone = review.validation.status === "valid"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : review.validation.status === "invalid"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <Link href="/dashboard/umkm/review-rate-card" className="inline-flex min-h-10 items-center gap-2 text-xs font-extrabold text-neutral-600 hover:text-orange-600"><ArrowLeft className="h-4 w-4" /> Kembali ke Tinjauan Pekerjaan</Link>

      <header className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,.05)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-500">{review.creatorName}</p>
            <h1 className="mt-1 min-w-0 break-words text-2xl font-black tracking-tight text-ink-900">{review.projectTitle}</h1>
            <p className="mt-2 text-sm font-semibold text-neutral-500">{review.packageContext?.name ?? "Paket Khusus"}</p>
          </div>
          <div className={`rounded-xl border px-4 py-3 ${validationTone}`}>
            <p className="text-sm font-black">{state.title}</p>
            <p className="mt-0.5 text-xs font-semibold opacity-80">{state.subtitle}</p>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-neutral-600">{state.description}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,.85fr)]">
        <main className="space-y-5">
          <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Hasil Kerja Terbaru</p>
                <h2 className="mt-1 text-lg font-black text-ink-900">Versi {latest?.version ?? "—"}</h2>
              </div>
              {latest ? <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[10px] font-black uppercase text-neutral-600">{getDeliverableStatusLabel(latest.status)}</span> : null}
            </div>

            {latest ? (
              <div className="mt-5 space-y-4">
                <a href={latest.fileUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-extrabold text-orange-700 hover:bg-orange-100">
                  <span className="min-w-0 truncate">Buka file hasil kerja</span><ExternalLink className="h-4 w-4 shrink-0" />
                </a>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs font-bold text-neutral-400">Sumber</dt><dd className="mt-1 font-semibold text-ink-900">{latest.source === "storage" ? "Penyimpanan Marketiv" : "Tautan Eksternal"}</dd></div>
                  <div><dt className="text-xs font-bold text-neutral-400">Waktu Pengiriman</dt><dd className="mt-1 font-semibold text-ink-900">{formatDate(latest.createdAt)}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs font-bold text-neutral-400">Catatan</dt><dd className="mt-1 whitespace-pre-wrap font-medium leading-relaxed text-neutral-700">{latest.notes || "Tidak ada catatan."}</dd></div>
                </dl>
              </div>
            ) : <p className="mt-5 text-sm font-medium text-neutral-500">Kreator belum mengirim hasil kerja.</p>}

            {(state.canApprove || state.canRequestRevision) ? (
              <div className="mt-6 flex flex-col gap-2 border-t border-neutral-100 pt-5 sm:flex-row">
                {state.canApprove ? <button type="button" disabled={processing} onClick={() => setApproveOpen(true)} className="min-h-11 rounded-xl bg-emerald-600 px-5 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">Setujui Hasil Kerja</button> : null}
                {state.canRequestRevision ? <button type="button" disabled={processing} onClick={() => setRevisionOpen(true)} className="min-h-11 rounded-xl border border-neutral-300 bg-white px-5 text-xs font-extrabold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60">Minta Revisi</button> : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 sm:p-6">
            <h2 className="text-base font-black text-ink-900">Versi Sebelumnya</h2>
            <p className="mt-1 text-xs font-medium text-neutral-500">Riwayat lama baca-saja. Hanya versi terbaru dapat ditindaklanjuti.</p>
            {review.deliverableHistory.filter((item) => item.id !== latest?.id).length === 0 ? <p className="mt-5 text-sm font-medium text-neutral-400">Belum ada versi sebelumnya.</p> : (
              <div className="mt-4 divide-y divide-neutral-100">
                {review.deliverableHistory.filter((item) => item.id !== latest?.id).sort((a, b) => b.version - a.version).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-4">
                    <div><p className="text-sm font-extrabold text-ink-900">Versi {item.version}</p><p className="mt-1 text-xs font-medium text-neutral-500">{formatDate(item.createdAt)}</p></div>
                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-xs font-bold text-neutral-600 hover:text-orange-600">Lihat file <ExternalLink className="h-3.5 w-3.5" /></a>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="space-y-5">
          <section className={`rounded-2xl border p-5 ${validationTone}`}>
            <div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" /><h2 className="text-sm font-black">Validasi Marketiv</h2></div>
            <p className="mt-4 text-lg font-black">{getValidationStatusLabel(review.validation.status)}</p>
            {review.validation.reviewNotes ? <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-relaxed">{review.validation.reviewNotes}</p> : null}
            <p className="mt-3 text-xs font-medium opacity-75">{review.validation.reviewedAt ? `Ditinjau ${formatDate(review.validation.reviewedAt)}` : "Belum ditinjau Admin Marketiv"}</p>
          </section>

          <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
            <h2 className="text-sm font-black text-ink-900">Ringkasan Pesanan</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div><dt className="text-xs font-bold text-neutral-400">Lingkup Pekerjaan</dt><dd className="mt-1 whitespace-pre-wrap font-medium leading-relaxed text-neutral-700">{review.scope || "—"}</dd></div>
              <div><dt className="text-xs font-bold text-neutral-400">Harga</dt><dd className="mt-1 font-black text-ink-900">{formatAmount(review.amount)}</dd></div>
              <div><dt className="text-xs font-bold text-neutral-400">Revisi Terpakai</dt><dd className="mt-1 font-black text-ink-900">{review.revisionCount} dari {review.revisionLimit}</dd></div>
              <div><dt className="text-xs font-bold text-neutral-400">Dana Aman</dt><dd className="mt-1 font-black text-ink-900">{review.escrowStatus ? getEscrowStatusLabel(review.escrowStatus) : "—"}</dd></div>
            </dl>
          </section>
        </aside>
      </div>

      {approveOpen ? <ConfirmDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Setujui Hasil Kerja?"
        description={`Versi ${latest?.version} akan ditandai disetujui.`}
        note="Persetujuan dapat melanjutkan penyelesaian dan pelepasan dana aman sesuai status backend. Status finansial tetap ditentukan backend."
        acknowledgement="Saya sudah memeriksa hasil terbaru dan memahami konsekuensi persetujuan."
        confirmLabel="Setujui & Lanjutkan"
        tone="warning"
        onConfirm={handleApprove}
      /> : null}

      {revisionOpen ? <ResponsiveModal open={revisionOpen} onOpenChange={(open) => !open && !processing && setRevisionOpen(false)}>
        <ResponsiveModalContent className="max-w-md p-6">
          <ResponsiveModalHeader><ResponsiveModalTitle>Minta Revisi</ResponsiveModalTitle><ResponsiveModalDescription>Jelaskan perubahan untuk versi terbaru. Batas revisi tetap diverifikasi backend.</ResponsiveModalDescription></ResponsiveModalHeader>
          <form onSubmit={handleRevision} className="mt-5 space-y-4">
            <label htmlFor="revision-message" className="block text-xs font-extrabold text-neutral-700">Bagian yang perlu diperbaiki</label>
            <textarea id="revision-message" required rows={5} value={revisionMessage} onChange={(event) => setRevisionMessage(event.target.value)} disabled={processing} className="w-full resize-none rounded-xl border border-neutral-300 bg-white p-3 text-sm font-medium text-ink-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            <div className="flex justify-end gap-2"><button type="button" disabled={processing} onClick={() => setRevisionOpen(false)} className="min-h-10 rounded-xl border border-neutral-200 px-4 text-xs font-bold text-neutral-600">Batal</button><button type="submit" disabled={processing} className="min-h-10 rounded-xl bg-orange-600 px-4 text-xs font-extrabold text-white disabled:opacity-60">{processing ? "Mengirim…" : "Kirim Permintaan"}</button></div>
          </form>
        </ResponsiveModalContent>
      </ResponsiveModal> : null}
    </div>
  );
}
