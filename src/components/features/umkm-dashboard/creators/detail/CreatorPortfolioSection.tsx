"use client";

import type { CreatorPortfolioItem } from "@/types/umkm-dashboard.types";

interface CreatorPortfolioSectionProps {
  /** Item dari getCreatorPortfolio() — bukan lagi literal di dalam komponen. */
  items: CreatorPortfolioItem[];
  error?: string | null;
  onRetry?: () => void;
}

/**
 * Platform diturunkan dari host tautan, bukan dari kolom yang tidak ada di
 * `creator_portfolios`. Tautan non-TikTok/Instagram sengaja tanpa badge.
 */
function platformFromUrl(url: string): "tiktok" | "instagram" | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
  } catch {
    // Tautan yang tidak bisa di-parse tetap ditampilkan, hanya tanpa badge.
  }
  return null;
}

function PlatformBadge({ platform }: { platform: "tiktok" | "instagram" }) {
  return (
    <div className="absolute top-3 right-3 z-10 h-6 w-6 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center border border-white/10">
      {platform === "tiktok" ? (
        <svg className="w-3.5 h-3.5 text-white fill-current" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm4.3 9.4a3.8 3.8 0 0 1-2.1-.6v4a3.5 3.5 0 1 1-3.5-3.5 3.4 3.4 0 0 1 1.7.5v-2.3a5.5 5.5 0 0 0-1.7-.3 5.5 5.5 0 1 0 5.5 5.5v-5.6a5.7 5.7 0 0 0 3.2.9v-2.1a3.6 3.6 0 0 1-3.1-.5z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      )}
    </div>
  );
}

export function CreatorPortfolioSection({ items, error, onRetry }: CreatorPortfolioSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm sm:text-base font-extrabold text-text-primary uppercase tracking-wider">
          Portofolio Konten Terbaru
        </h3>
        <p className="text-[10px] text-text-muted font-semibold">
          Daftar konten yang dibagikan kreator untuk menilai kecocokan kolaborasi.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-2xs">
          <p className="text-xs font-semibold text-red-600 mb-3">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs font-bold bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            >
              Coba Lagi
            </button>
          )}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong/60 bg-white/60 p-10 text-center shadow-2xs">
          <p className="text-xs font-semibold text-text-secondary">
            Kreator ini belum menambahkan portofolio konten.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const platform = platformFromUrl(item.url);
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl overflow-hidden border border-border-soft bg-neutral-100 aspect-[3/4] relative shadow-2xs transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-md hover:border-orange-300/30 cursor-pointer"
              >
                {item.thumbnailUrl ? (
                  // Host thumbnail milik kreator bebas (URL eksternal atau Appwrite
                  // storage) sehingga tidak bisa di-allowlist di next.config →
                  // <img>, sama seperti kartu portofolio sisi kreator.
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-300" />
                )}

                {/* Dark overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90" />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform duration-350">
                    <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                {platform && <PlatformBadge platform={platform} />}

                {/* Title & Description */}
                <div className="absolute bottom-3 left-3 right-3 z-10 space-y-1">
                  <h4 className="text-[10px] sm:text-xs font-bold text-white line-clamp-1">
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="text-[8px] font-semibold text-white/70 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
