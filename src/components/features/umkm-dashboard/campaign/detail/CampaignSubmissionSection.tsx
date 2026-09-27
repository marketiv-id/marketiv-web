"use client";

import { useState } from "react";
import { getSubmissionStatusLabel } from "@/lib/dashboard-labels";
import { CampaignSubmission, SubmissionStatus } from "@/types/umkm-dashboard.types";
import { CampaignSubmissionCard } from "./CampaignSubmissionCard";

interface CampaignSubmissionSectionProps {
  submissions: CampaignSubmission[];
  onViewDetailsClick: (sub: CampaignSubmission) => void;
}

export function CampaignSubmissionSection({
  submissions,
  onViewDetailsClick,
}: CampaignSubmissionSectionProps) {
  const [filterTab, setFilterTab] = useState<"all" | SubmissionStatus>("all");

  const filteredSubmissions =
    filterTab === "all"
      ? submissions
      : submissions.filter((s) => s.validationStatus === filterTab);

  const tabs: { label: string; value: "all" | SubmissionStatus; count: number }[] = [
    { label: "Semua", value: "all", count: submissions.length },
    {
      label: getSubmissionStatusLabel("pending"),
      value: "pending",
      count: submissions.filter((s) => s.validationStatus === "pending").length,
    },
    {
      label: getSubmissionStatusLabel("approved"),
      value: "approved",
      count: submissions.filter((s) => s.validationStatus === "approved").length,
    },
    {
      label: getSubmissionStatusLabel("rejected"),
      value: "rejected",
      count: submissions.filter((s) => s.validationStatus === "rejected").length,
    },
  ];

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-2xs overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-neutral-200/50 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs sm:text-sm font-extrabold text-text-primary uppercase tracking-wide">
              Bukti Konten Kreator
            </h3>
            <p className="text-xs text-text-muted">
              Daftar postingan video dari kreator dan status validasi resmi oleh Admin Marketiv.
            </p>
          </div>
          <span className="text-[11px] font-extrabold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200/80 uppercase tracking-wide shrink-0">
            {submissions.length} BUKTI KONTEN
          </span>
        </div>
        
        {/* Navigation Filter Tabs */}
        <div className="flex flex-wrap gap-2 w-full pt-1">
          {tabs.map((tab) => {
            const isActive = filterTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFilterTab(tab.value)}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-b from-[#fb7a18] to-primary-600 text-white shadow-xs"
                    : "bg-neutral-50 text-text-secondary hover:bg-neutral-100 border border-neutral-200/80"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`inline-flex items-center justify-center font-extrabold rounded-full px-2 py-0.5 text-[11px] leading-none shrink-0 ${
                    isActive
                      ? "bg-white text-orange-600 shadow-2xs"
                      : "bg-neutral-200/80 text-text-primary"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* Submissions List */}
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-10 bg-neutral-50/60 rounded-xl border border-neutral-200/60">
            <svg className="w-10 h-10 mx-auto text-neutral-400 mb-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h5 className="text-xs sm:text-sm font-extrabold text-text-primary mb-1">Belum Ada Bukti Konten</h5>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              Kreator yang bergabung belum mengirimkan tautan postingan video.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredSubmissions.map((sub) => (
              <CampaignSubmissionCard
                key={sub.id}
                submission={sub}
                onViewDetails={() => onViewDetailsClick(sub)}
              />
            ))}
          </div>
        )}

        {/* Marketiv 3-Step Validation Process */}
        <div className="mt-6 pt-5 border-t border-neutral-200/50">
          <span className="block text-[11px] font-extrabold text-text-muted uppercase tracking-wider mb-3">
            Proses Validasi Konten Marketiv
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 text-xs space-y-0.5">
              <strong className="text-text-primary block font-extrabold">1. Kreator Mengirim Bukti</strong>
              <span className="text-text-muted text-[11px]">Kreator menyertakan tautan postingan video publik.</span>
            </div>
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 text-xs space-y-0.5">
              <strong className="text-text-primary block font-extrabold">2. Verifikasi Admin Marketiv</strong>
              <span className="text-text-muted text-[11px]">Admin memeriksa keabsahan tautan dan mengunci total tayangan.</span>
            </div>
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 text-xs space-y-0.5">
              <strong className="text-text-primary block font-extrabold">3. Pencairan Hadiah</strong>
              <span className="text-text-muted text-[11px]">Hadiah dihitung otomatis setelah validasi disetujui.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
