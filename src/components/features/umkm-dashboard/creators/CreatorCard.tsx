"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, MapPin, TrendingUp, Briefcase, MessageCircle, CheckCircle2 } from "lucide-react";
import * as Avatar from "@radix-ui/react-avatar";
import type { Creator } from "@/types/campaign";

interface CreatorCardProps {
  creator: Creator;
}

const CATEGORY_COVER: Record<string, { from: string; mid: string; to: string }> = {
  kuliner:    { from: "#fb923c", mid: "#ea580c", to: "#c2410c" },
  fashion:    { from: "#a78bfa", mid: "#7c3aed", to: "#5b21b6" },
  pariwisata: { from: "#60a5fa", mid: "#2563eb", to: "#1e3a5f" },
  edukasi:    { from: "#4ade80", mid: "#16a34a", to: "#15803d" },
  kecantikan: { from: "#f9a8d4", mid: "#db2777", to: "#be185d" },
  teknologi:  { from: "#7dd3fc", mid: "#0284c7", to: "#075985" },
  kosmetik:   { from: "#f9a8d4", mid: "#db2777", to: "#be185d" },
  lainnya:    { from: "#818cf8", mid: "#4f46e5", to: "#3730a3" },
};

const AVATAR_GRADIENTS: Record<string, string> = {
  kuliner:    "linear-gradient(135deg,#fed7aa,#fb923c)",
  fashion:    "linear-gradient(135deg,#c4b5fd,#7c3aed)",
  pariwisata: "linear-gradient(135deg,#93c5fd,#1e3a5f)",
  edukasi:    "linear-gradient(135deg,#a3e635,#16a34a)",
  kecantikan: "linear-gradient(135deg,#fda4af,#be185d)",
  teknologi:  "linear-gradient(135deg,#7dd3fc,#0284c7)",
  kosmetik:   "linear-gradient(135deg,#fda4af,#be185d)",
  lainnya:    "linear-gradient(135deg,#a5b4fc,#4f46e5)",
};

export function CreatorCard({ creator }: CreatorCardProps) {
  const router = useRouter();

  const key = (creator.category || "lainnya").toLowerCase();
  const cover = CATEGORY_COVER[key] ?? CATEGORY_COVER.lainnya;
  const avatarGradient = AVATAR_GRADIENTS[key] ?? AVATAR_GRADIENTS.lainnya;
  const handle = creator.username ? `@${creator.username}` : "";
  // 0 = belum diisi/belum dihitung (backend tidak pernah menaikkan angka ini).
  const engagementText = creator.engagementRate && creator.engagementRate > 0 ? `${creator.engagementRate}%` : "—";
  const completedJobsText = creator.completedJobs && creator.completedJobs > 0 ? `${creator.completedJobs} Proyek` : "—";

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-3xs hover:shadow-md hover:-translate-y-1 hover:border-orange-300/60 transition-all duration-300 select-none">
      {/* ── Cover strip ── */}
      <div
        className="relative h-28 sm:h-32 w-full overflow-hidden shrink-0"
        style={{
          background: `linear-gradient(135deg, ${cover.from} 0%, ${cover.mid} 55%, ${cover.to} 100%)`,
        }}
      >
        {creator.bannerUrl ? (
          <>
            <Image
              src={creator.bannerUrl}
              alt={`Banner ${creator.name}`}
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,.60) 0%, rgba(0,0,0,.10) 50%, rgba(0,0,0,.30) 100%)" }}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_20%,rgba(255,255,255,.22),transparent_70%)] pointer-events-none" />
        )}

        {/* Category badge — TOP LEFT */}
        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/25 text-[10px] font-black text-white uppercase tracking-wider">
          {creator.category}
        </div>

        {/* Rating pill — TOP RIGHT */}
        <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 text-amber-800 text-xs font-black shadow-xs border border-amber-200/60 backdrop-blur-md">
          <Star size={12} className="fill-amber-500 text-amber-500" />
          <span>{creator.rating > 0 ? creator.rating.toFixed(1) : "Baru"}</span>
        </div>
      </div>

      {/* ── Avatar row — overlaps cover ── */}
      <div className="relative -mt-9 sm:-mt-10 px-4 sm:px-5 flex items-end justify-between mb-3">
        {/* Avatar with verified dot */}
        <div className="relative shrink-0">
          <Avatar.Root className="flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-2xl border-4 border-white shadow-md overflow-hidden bg-slate-100">
            <Avatar.Image
              src={creator.imageUrl}
              alt={creator.name}
              className="h-full w-full object-cover"
            />
            <Avatar.Fallback
              className="flex h-full w-full items-center justify-center text-sm sm:text-base font-black text-white"
              style={{ background: avatarGradient }}
            >
              {creator.name.slice(0, 2).toUpperCase()}
            </Avatar.Fallback>
          </Avatar.Root>

          {creator.isVerified && (
            <div
              title="Kreator Terverifikasi"
              className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white bg-blue-600 grid place-items-center shadow-xs"
            >
              <CheckCircle2 size={12} className="text-white fill-blue-600" />
            </div>
          )}
        </div>

        {/* Review count chip */}
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/60 text-xs font-extrabold text-amber-800 shadow-3xs mb-0.5">
          <Star size={11} className="fill-amber-500 text-amber-500" />
          <span>{creator.totalReviews} ulasan</span>
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="p-4 sm:p-5 pt-0 flex flex-col gap-3 flex-1">
        {/* Name + handle + location */}
        <div className="space-y-0.5 min-w-0">
          <h3 className="font-display text-sm sm:text-base font-black text-slate-900 leading-snug tracking-tight truncate group-hover:text-orange-600 transition-colors">
            {creator.name}
          </h3>
          <div className="flex items-center gap-2 flex-wrap text-xs font-semibold text-slate-500">
            {handle && <span className="truncate">{handle}</span>}
            {creator.location && (
              <span className="inline-flex items-center gap-1 shrink-0 text-slate-400">
                <MapPin size={11} />
                <span>{creator.location}</span>
              </span>
            )}
          </div>
        </div>

        {/* Stats row — Engagement + Proyek Selesai */}
        <div className="grid grid-cols-2 gap-2 min-w-0">
          {/* Engagement */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-orange-50/60 border border-orange-200/50 flex flex-col gap-0.5 shadow-3xs min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 text-orange-700 min-w-0">
              <TrendingUp size={12} className="shrink-0" />
              <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider truncate">Tingkat Keterlibatan</span>
            </div>
            <span className="font-display text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
              {engagementText}
            </span>
          </div>

          {/* Selesai */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/50 flex flex-col gap-0.5 shadow-3xs min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 text-blue-700 min-w-0">
              <Briefcase size={12} className="shrink-0" />
              <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider truncate">Pesanan Selesai</span>
            </div>
            <span className="font-display text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
              {completedJobsText}
            </span>
          </div>
        </div>

        {/* Estimasi Biaya Jasa & Bio */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-b from-orange-50/80 to-white border border-orange-200/60 flex flex-col gap-1 shadow-3xs mt-auto min-w-0">
          <span className="text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-orange-600 truncate">
            Estimasi Biaya Jasa
          </span>
          <strong className="font-display text-sm sm:text-base lg:text-lg font-black text-orange-600 tracking-tight leading-none truncate">
            {creator.estimatedSalary}
          </strong>
          <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed mt-0.5">
            {creator.description}
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Link
            href={`/dashboard/umkm/kreator/${creator.id}`}
            className="flex-1 flex items-center justify-center h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-800 text-xs font-extrabold shadow-3xs hover:border-slate-300 hover:shadow-xs transition-all no-underline text-center"
          >
            Lihat Profil
          </Link>
          <button
            type="button"
            aria-label="Mulai negosiasi"
            onClick={() => router.push(`/dashboard/umkm/kreator/${creator.id}`)}
            className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-b from-[#fb7a18] to-[#ea580c] text-white flex items-center justify-center shadow-xs hover:shadow-md hover:from-[#ea580c] hover:to-[#c2410c] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <MessageCircle size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
