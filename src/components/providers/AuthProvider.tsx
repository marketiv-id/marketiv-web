"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  getSession,
  logout as logoutSession,
  type SessionUser,
} from "@/services/auth/session.service";
import { setCachedSessionUserId } from "@/services/auth/session-cache";
import type { ServiceErrorCode, ServiceResult } from "@/types/domain";

export interface RefreshOptions {
  /** Jangan menyalakan loading global untuk refresh yang tidak boleh melepas guard aktif. */
  background?: boolean;
  /** Pertahankan sesi terakhir bila pembacaan ulang gagal. */
  preserveUserOnError?: boolean;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  /** Kode error terakhir — UI memetakan code, bukan teks pesan (R3). */
  errorCode: ServiceErrorCode | null;
  error: string | null;
  refresh: (options?: RefreshOptions) => Promise<ServiceResult<SessionUser>>;
  logout: () => Promise<ServiceResult<null>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<ServiceErrorCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySession = useCallback(
    (res: Awaited<ReturnType<typeof getSession>>, options?: RefreshOptions) => {
      if (res.success && res.data) {
        setCachedSessionUserId(res.data.userId);
        setUser(res.data);
        setErrorCode(null);
        setError(null);
      } else {
        if (!options?.preserveUserOnError) {
          setCachedSessionUserId(null);
          setUser(null);
        }
        setErrorCode(res.code ?? "unknown");
        setError(res.error ?? null);
      }
      if (!options?.background) setLoading(false);
    },
    []
  );

  /** Refresh manual (dipanggil dari event handler, bukan dari body effect). */
  const refresh = useCallback(async (options?: RefreshOptions) => {
    if (!options?.background) setLoading(true);
    const res = await getSession();
    applySession(res, options);
    return res;
  }, [applySession]);

  // Fetch awal: state hanya diubah setelah promise selesai, bukan sinkron di
  // dalam body effect (menghindari cascading render).
  useEffect(() => {
    let cancelled = false;
    void getSession().then((res) => {
      if (!cancelled) applySession(res);
    });
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const logout = useCallback(async () => {
    const result = await logoutSession();
    setCachedSessionUserId(null);
    setUser(null);
    // errorCode/error harus ikut dibersihkan: RedirectIfAuthenticated dan
    // RoleGuard sama-sama bercabang di errorCode, jadi sisa "not_found" dari
    // sesi sebelumnya akan salah dibaca sebagai profil yang belum terbentuk.
    setErrorCode(null);
    setError(null);
    return result;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, errorCode, error, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth harus dipakai di dalam <AuthProvider>.");
  }
  return ctx;
}
