"use client";

interface CollabPostWarningBannerProps {
  compact?: boolean;
}

export function CollabPostWarningBanner({ compact }: CollabPostWarningBannerProps) {
  if (compact) {
    return (
      <div
        className="flex items-start gap-2.5 px-4 py-2.5 shrink-0"
        style={{
          background: "rgba(254,243,199,.55)",
          borderBottom: "1px solid rgba(245,158,11,.14)",
        }}
      >
        <div
          className="h-5 w-5 rounded-md flex items-center justify-center shrink-0 mt-px"
          style={{ background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.2)" }}
        >
          <svg className="w-3 h-3 text-[#d97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-[9px] text-[#92400e] font-semibold leading-snug flex-1">
          Kreator wajib menggunakan fitur{" "}
          <strong className="text-[#b45309]">Postingan Kolaborasi</strong> Instagram/TikTok agar kunjungan dan tayangan masuk langsung ke akun UMKM Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-warning-soft bg-gradient-to-r from-warning-soft/20 to-orange-50/40 p-4 flex gap-3 items-start select-none shadow-2xs">
      <div className="h-7 w-7 rounded-xl bg-warning/15 border border-warning/20 text-warning flex items-center justify-center shrink-0 shadow-3xs" aria-hidden="true">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div className="min-w-0 space-y-0.5">
        <h4 className="text-[10px] sm:text-xs font-extrabold text-warning-strong uppercase tracking-wider leading-none">
          Ketentuan Publikasi Kolaborasi
        </h4>
        <p className="text-[10px] sm:text-xs text-text-secondary mt-1 leading-relaxed font-semibold">
          Kreator wajib menggunakan fitur{" "}
          <strong className="text-warning-strong">Postingan Kolaborasi</strong> Instagram/TikTok saat publikasi agar kunjungan, tayangan, dan interaksi masuk ke akun UMKM Anda secara langsung.
        </p>
      </div>
    </div>
  );
}
