"use client";

import { formatCompactNumber } from "@/lib/formatters";
import type { CreatorSocialAccount } from "@/types/umkm-dashboard.types";

interface CreatorSocialLinksCardProps {
  /** Akun dari getCreatorSocialAccounts() — bukan handle/follower karangan. */
  accounts: CreatorSocialAccount[];
  error?: string | null;
  onRetry?: () => void;
}

/** Label tampilan per platform; platform tak dikenal ditampilkan apa adanya. */
const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
};

/** URL profil hanya dibentuk untuk platform yang formatnya pasti. */
function profileUrl(platform: string, username: string): string | null {
  if (!username) return null;
  if (platform === "tiktok") return `https://www.tiktok.com/@${username}`;
  if (platform === "instagram") return `https://www.instagram.com/${username}`;
  if (platform === "youtube") return `https://www.youtube.com/@${username}`;
  return null;
}

const PLATFORM_STYLE: Record<string, { border: string; icon: string }> = {
  tiktok: { border: "border-neutral-200 bg-neutral-50/30", icon: "text-neutral-900" },
  instagram: { border: "border-pink-100 bg-pink-50/10", icon: "text-pink-600" },
};

function PlatformIcon({ platform }: { platform: string }) {
  const color = PLATFORM_STYLE[platform]?.icon ?? "text-neutral-500";

  if (platform === "tiktok") {
    return (
      <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.01 1.62 4.18.99 1.17 2.37 1.96 3.86 2.23v3.74c-1.42-.02-2.82-.41-4.04-1.15-.36-.21-.7-.47-1.01-.76v7.37c-.07 1.52-.64 3.01-1.66 4.14-1.02 1.13-2.45 1.83-3.98 1.99-1.53.16-3.11-.21-4.37-1.07A5.996 5.996 0 0 1 3.93 16.2c-.36-1.5-.16-3.11.58-4.47.74-1.36 1.99-2.38 3.48-2.83V12.7c-.52.12-1 .4-1.37.8-.37.4-.59.93-.62 1.48-.03.55.12 1.1.43 1.56.31.46.77.78 1.29.92.52.14 1.07.08 1.55-.16.48-.24.86-.66 1.06-1.17.16-.41.22-.85.22-1.29V0h2.01z" />
      </svg>
    );
  }

  if (platform === "instagram") {
    return (
      <svg className={`w-5 h-5 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    );
  }

  return (
    <svg className={`w-5 h-5 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" />
    </svg>
  );
}

export function CreatorSocialLinksCard({ accounts, error, onRetry }: CreatorSocialLinksCardProps) {
  return (
    <div className="rounded-2xl border border-border-soft bg-white p-5 space-y-4 shadow-2xs h-full flex flex-col transition-all duration-300 hover:scale-[1.015] hover:-translate-y-1 hover:shadow-md hover:border-orange-300/30">
      <span className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
        Saluran Media Sosial
      </span>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-[11px] font-semibold text-red-600 mb-2">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-[11px] font-bold bg-white text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            >
              Coba Lagi
            </button>
          )}
        </div>
      ) : accounts.length === 0 ? (
        <p className="text-[11px] font-semibold text-text-muted leading-relaxed">
          Kreator ini belum menghubungkan akun sosial media.
        </p>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => {
            const label = PLATFORM_LABEL[account.platform] ?? account.platform;
            const href = profileUrl(account.platform, account.username);
            const handle = account.username ? `@${account.username}` : "";

            return (
              <div
                key={account.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-colors ${PLATFORM_STYLE[account.platform]?.border ?? "border-border-subtle bg-white"}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center border border-border-subtle shrink-0 shadow-3xs">
                    <PlatformIcon platform={account.platform} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span className="block text-xs font-extrabold text-text-primary">{label}</span>
                    {href && handle ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[10px] text-text-muted font-bold hover:underline truncate"
                      >
                        {handle}
                      </a>
                    ) : (
                      <span className="block text-[10px] text-text-muted font-bold truncate">
                        {handle || "—"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right space-y-0.5 shrink-0">
                  <span className="block text-xs font-extrabold text-text-primary">
                    {account.followers > 0 ? formatCompactNumber(account.followers) : "—"}
                  </span>
                  <span className="block text-[8px] text-text-muted uppercase tracking-wider font-bold">
                    Followers
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
