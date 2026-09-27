"use client";

import Image from "next/image";
import { Briefcase } from "lucide-react";
import type { Creator } from "@/types/campaign";

interface CreatorProfileHeroProps {
  creator: Creator;
}

export function CreatorProfileHero({ creator }: CreatorProfileHeroProps) {
  return (
    <div className="relative rounded-3xl bg-white border border-border-soft overflow-hidden shadow-xs mb-6 select-none">
      
      {/* Banner backdrop */}
      <div className="h-32 sm:h-44 w-full bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 relative overflow-hidden">
        {creator.bannerUrl ? (
          <Image
            src={creator.bannerUrl}
            alt={`Banner ${creator.name}`}
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 100vw, 80vw"
            priority
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
            {/* Glow halo */}
            <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/20 blur-xl" />
          </>
        )}
        {/* Badge verifikasi hanya muncul kalau profilnya memang terverifikasi. */}
        {creator.isVerified && (
          <div className="absolute bottom-3 right-4 z-10">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[9px] font-extrabold uppercase tracking-widest text-white border border-white/10">
              Kreator Terverifikasi
            </span>
          </div>
        )}
      </div>

      {/* Main Profile Info Row — Posisikan items-start untuk mencegah teks menabrak banner */}
      <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Avatar — overlap ke atas menggunakan margin negatif kustom */}
        <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-white p-1.5 shadow-md border border-neutral-100 shrink-0 relative overflow-hidden -mt-12 sm:-mt-16 z-10">
          <div className="h-full w-full rounded-2xl relative overflow-hidden bg-neutral-100">
            {creator.imageUrl ? (
              <Image
                src={creator.imageUrl}
                alt={creator.name}
                fill
                className="object-cover"
                sizes="112px"
                priority
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-4xl font-black text-neutral-300">
                {creator.name.charAt(0)}
              </span>
            )}
          </div>
        </div>

        {/* Text Details — diturunkan sedikit dengan padding top agar sejajar rapi dengan avatar di area putih */}
        <div className="flex-1 text-center sm:text-left space-y-2 pt-2 sm:pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-center sm:justify-start gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-text-primary tracking-tight">
              {creator.name}
            </h2>
            <span className="self-center px-2.5 py-0.5 rounded-full border bg-primary-50/40 border-primary-100 text-[9px] font-extrabold uppercase tracking-wider text-primary">
              {creator.category}
            </span>
          </div>

          <p className="text-xs text-text-secondary font-semibold max-w-2xl leading-relaxed">
            {creator.description}
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-bold text-text-secondary pt-1">
            <div className="flex items-center gap-1">
              <span className="text-text-primary font-extrabold">{creator.followers || "—"}</span>
              <span className="text-[10px] text-text-muted">Pengikut</span>
            </div>

            {/* Rating hanya tampil kalau ada datanya — `rating` 0 berarti belum
                pernah dihitung (tidak ada sistem ulasan), bukan nilai jelek. */}
            {creator.rating > 0 && (
              <>
                <span className="text-neutral-300">|</span>

                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-text-primary font-extrabold">{creator.rating}</span>
                </div>
              </>
            )}

            <span className="text-neutral-300">|</span>

            {/* `totalOrders` belum pernah di-increment backend → 0 = belum ada data. */}
            <div className="flex items-center gap-1">
              <Briefcase size={14} className="text-text-muted" />
              <span className="text-text-primary font-extrabold">
                {creator.completedJobs && creator.completedJobs > 0 ? creator.completedJobs : "—"}
              </span>
              <span className="text-[10px] text-text-muted">Pesanan Selesai</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
