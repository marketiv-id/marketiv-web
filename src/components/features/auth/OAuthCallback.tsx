"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthErrorBanner } from "@/components/auth/AuthField";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/AuthProvider";
import { provisionUserProfile } from "@/services/auth/auth.service";
import { resolveOAuthCallbackDecision } from "@/services/auth/oauth-callback.service";
import { routes } from "@/lib/constants/routes";

/**
 * Pendaratan setelah OAuth Google.
 *
 * Alur berdasarkan `role` yang diteruskan via success URL:
 *   - Akun lama (user sudah ada):    → next || dashboard sesuai role
 *   - Akun baru + role=umkm/creator: → POST /api/auth/provision {role} → /onboarding
 *   - Akun baru tanpa role:          → /register (pilih role dulu)
 *
 * UMKM & Kreator kini identik: seluruh data usaha (termasuk WhatsApp) diisi
 * sekali di wizard /onboarding, bukan lagi di form perantara terpisah.
 */
export function OAuthCallback({
  next,
  role,
}: {
  next?: string;
  role?: "umkm" | "creator";
}) {
  const router = useRouter();
  const { refresh, logout } = useAuth();
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const ranRef = useRef(false);

  const resolve = useCallback(async () => {
    setRecoveryError(null);
    const session = await refresh();
    let decision = resolveOAuthCallbackDecision({
      user: session.success ? session.data : null,
      errorCode: session.success ? null : session.code,
      next,
      role,
    });

    if (decision.action === "provision" && role) {
      // Role di-whitelist ulang di server (umkm/creator), tidak pernah admin.
      const provision = await provisionUserProfile(role);
      if (!provision.success) {
        decision = resolveOAuthCallbackDecision({
          user: null,
          errorCode: "not_found",
          role,
          provisioningSucceeded: false,
        });
        setRecoveryError(
          provision.error ??
            "Akun Google sudah terhubung, tetapi profil Marketiv belum bisa dibuat. Coba lagi atau hubungi admin."
        );
      } else {
        await refresh();
        decision = resolveOAuthCallbackDecision({
          user: null,
          errorCode: "not_found",
          role,
          provisioningSucceeded: true,
        });
      }
    }

    if (decision.action === "redirect") {
      router.replace(decision.href);
      return;
    }

    if (decision.action === "role_mismatch") {
      const cleanup = await logout();
      if (cleanup.success && role) {
        const params = new URLSearchParams({
          role,
          error: "role_mismatch",
          actualRole: decision.actualRole,
        });
        router.replace(`${routes.login}?${params.toString()}`);
        return;
      }
      setRecoveryError(
        "Kami tidak dapat mengakhiri sesi ini. Tutup browser, lalu coba masuk kembali."
      );
      return;
    }

    setRecoveryError(
      "Akun Google sudah terhubung, tetapi profil Marketiv belum bisa dibuat. Coba lagi atau hubungi admin."
    );
  }, [next, role, router, refresh, logout]);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    void Promise.resolve().then(resolve);
  }, [resolve]);

  async function handleRetry() {
    setRetrying(true);
    await resolve();
    setRetrying(false);
  }

  async function handleLogout() {
    await logout();
    router.replace(routes.login);
  }

  if (recoveryError) {
    return (
      <AuthCard
        title="Profil belum bisa dibuat"
        description="Akun Google sudah masuk, tetapi data profil Marketiv belum tersedia."
      >
        <div className="space-y-4">
          <AuthErrorBanner message={recoveryError} />
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="min-h-[46px] w-full rounded-full bg-orange-500 px-6 text-sm font-extrabold text-white transition-all hover:bg-orange-600 disabled:pointer-events-none disabled:opacity-60"
          >
            {retrying ? "Mencoba lagi…" : "Coba lagi buat profil"}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={retrying}
            className="min-h-[46px] w-full rounded-full border border-neutral-200 px-6 text-sm font-extrabold text-ink-700 transition-all hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-60"
          >
            Keluar dan pakai akun lain
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Menyiapkan akun kamu…"
      description="Sebentar ya, kami sedang memverifikasi sesi Google kamu."
    >
      <div className="space-y-3">
        <Skeleton className="h-[44px] w-full rounded-xl" />
        <Skeleton className="h-[44px] w-2/3 rounded-xl" />
      </div>
    </AuthCard>
  );
}
