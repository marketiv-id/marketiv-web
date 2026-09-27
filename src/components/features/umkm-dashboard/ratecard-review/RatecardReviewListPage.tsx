"use client";

/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
/* Hallmark · macrostructure: status-first review workbench · existing Marketiv system */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, ClipboardCheck, RotateCcw } from "lucide-react";
import { getRatecardReviewState } from "@/lib/ratecard-review/review-state";
import { getUmkmRatecardReviews } from "@/services/umkm/ratecard-review.service";
import { getOrderStatusLabel, getValidationStatusLabel } from "@/lib/dashboard-labels";
import type { RatecardReview, RatecardReviewFilter } from "@/types/ratecard-review.types";

type ActiveFilter = "all" | RatecardReviewFilter;

const FILTERS: Array<{ value: ActiveFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "action_required", label: "Perlu Tindakan" },
  { value: "marketiv_validation", label: "Menunggu Marketiv" },
  { value: "revision", label: "Revisi" },
  { value: "completed", label: "Selesai" },
];

const PRIORITY: Record<RatecardReviewFilter, number> = {
  action_required: 0,
  marketiv_validation: 1,
  revision: 2,
  completed: 3,
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value?: string) {
  if (!value) return "Belum dikirim";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ReviewListSkeleton() {
  return (
    <div aria-label="Memuat tinjauan pekerjaan" className="grid gap-4 lg:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="h-56 animate-pulse rounded-2xl border border-neutral-200/70 bg-white p-5">
          <div className="h-4 w-28 rounded bg-neutral-100" />
          <div className="mt-5 h-6 w-3/5 rounded bg-neutral-100" />
          <div className="mt-3 h-4 w-2/5 rounded bg-neutral-100" />
          <div className="mt-8 h-10 rounded-xl bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}

export function RatecardReviewListPage() {
  const [reviews, setReviews] = useState<RatecardReview[]>([]);
  const [filter, setFilter] = useState<ActiveFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await getUmkmRatecardReviews();
    if (!result.success || !result.data) {
      setError(result.error ?? "Gagal memuat tinjauan pekerjaan.");
      setReviews([]);
    } else {
      setReviews(result.data);
    }
    setLoading(false);
  }, []);

  const retry = () => {
    setLoading(true);
    setError(null);
    void load();
  };

  useEffect(() => {
    let active = true;
    void getUmkmRatecardReviews().then((result) => {
      if (!active) return;
      if (!result.success || !result.data) {
        setError(result.error ?? "Gagal memuat tinjauan pekerjaan.");
        setReviews([]);
      } else {
        setReviews(result.data);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const reviewRows = useMemo(() => reviews
    .map((review) => ({ review, state: getRatecardReviewState(review) }))
    .filter((row) => row.state.filter !== null)
    .sort((a, b) => {
      const priority = PRIORITY[a.state.filter!] - PRIORITY[b.state.filter!];
      if (priority !== 0) return priority;
      return (b.review.latestDeliverable?.createdAt ?? b.review.createdAt)
        .localeCompare(a.review.latestDeliverable?.createdAt ?? a.review.createdAt);
    }), [reviews]);

  const visibleRows = filter === "all"
    ? reviewRows
    : reviewRows.filter((row) => row.state.filter === filter);

  const countFor = (value: ActiveFilter) => value === "all"
    ? reviewRows.length
    : reviewRows.filter((row) => row.state.filter === value).length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Paket Harga</p>
          <h1 className="mt-1 min-w-0 break-words text-2xl font-black tracking-tight text-ink-900 sm:text-3xl">Tinjauan Pekerjaan</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-neutral-500">
            Tinjau hasil terbaru Kreator setelah validasi Marketiv. Setiap pesanan tetap terpisah meski berasal dari percakapan yang sama.
          </p>
        </div>
        <div className="rounded-xl border border-orange-200/70 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800">
          {countFor("action_required")} perlu tindakan
        </div>
      </div>

      <div className="overflow-x-auto pb-1" aria-label="Filter tinjauan pekerjaan">
        <div className="flex min-w-max gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={`rounded-xl border px-3.5 py-2 text-xs font-extrabold transition-colors ${
                filter === item.value
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-orange-200 hover:text-orange-700"
              }`}
            >
              {item.label} <span className="ml-1 opacity-75">{countFor(item.value)}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? <ReviewListSkeleton /> : null}

      {!loading && error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-7 w-7 text-red-600" aria-hidden="true" />
          <h2 className="mt-3 text-base font-black text-red-900">Tinjauan pekerjaan gagal dimuat</h2>
          <p className="mt-1 text-sm font-medium text-red-700">{error}</p>
          <button type="button" onClick={retry} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-xs font-extrabold text-white hover:bg-red-800">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Coba Lagi
          </button>
        </div>
      ) : null}

      {!loading && !error && reviewRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
          <ClipboardCheck className="mx-auto h-9 w-9 text-neutral-300" aria-hidden="true" />
          <h2 className="mt-4 text-base font-black text-ink-900">Belum ada pekerjaan Paket Harga untuk ditinjau.</h2>
          <p className="mt-1 text-sm font-medium text-neutral-500">Hasil kerja Kreator akan muncul di sini setelah dikirim.</p>
        </div>
      ) : null}

      {!loading && !error && reviewRows.length > 0 && visibleRows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-10 text-center text-sm font-semibold text-neutral-500">
          Tidak ada pekerjaan dengan status ini.
        </div>
      ) : null}

      {!loading && !error && visibleRows.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleRows.map(({ review, state }) => (
            <article key={review.orderId} className="flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,.05)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-neutral-500">{review.creatorName}</p>
                  <h2 className="mt-1 truncate text-lg font-black tracking-tight text-ink-900">{review.projectTitle}</h2>
                  <p className="mt-1 truncate text-xs font-semibold text-neutral-400">{review.packageContext?.name ?? "Paket Khusus"}</p>
                </div>
                <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-black ${
                  state.filter === "action_required"
                    ? "border-orange-200 bg-orange-50 text-orange-700"
                    : state.filter === "completed"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-blue-200 bg-blue-50 text-blue-700"
                }`}>
                  {state.subtitle}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-y border-neutral-100 py-4 text-xs">
                <div><span className="block font-semibold text-neutral-400">Harga Pesanan</span><strong className="mt-1 block text-ink-900">{formatAmount(review.amount)}</strong></div>
                <div><span className="block font-semibold text-neutral-400">Versi Terbaru</span><strong className="mt-1 block text-ink-900">Versi {review.latestDeliverable?.version ?? "—"}</strong></div>
                <div><span className="block font-semibold text-neutral-400">Status Pesanan</span><strong className="mt-1 block text-ink-900">{getOrderStatusLabel(review.orderStatus)}</strong></div>
                <div><span className="block font-semibold text-neutral-400">Validasi</span><strong className="mt-1 block text-ink-900">{getValidationStatusLabel(review.validation.status)}</strong></div>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Pengiriman</p>
                  <p className="mt-1 text-xs font-semibold text-neutral-600">{formatDate(review.latestDeliverable?.createdAt)}</p>
                </div>
                <Link href={`/dashboard/umkm/review-rate-card/${review.orderId}`} className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl bg-ink-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 active:bg-ink-950">
                  Lihat Detail <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
