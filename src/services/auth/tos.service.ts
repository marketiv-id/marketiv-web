import { DATA_SOURCE_CONFIG } from "@/config/data-source.config";
import { executeFunction, FUNCTION_IDS } from "@/lib/appwrite/functions";
import { mockDelay } from "@/lib/mock-delay";
import { createClient } from "@/lib/supabase/client";
import {
  fail,
  failFromError,
  failFromWriteError,
  noData,
  ok,
  requireUserId,
} from "@/services/shared/service-result";
import type { ServiceResult } from "@/types/domain";

export interface TosStatus {
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  needsConsent: boolean;
}

export interface TosAcceptResult {
  success: boolean;
  alreadyAccepted: boolean;
  tos_version: string;
}

/**
 * Versi T&C yang berlaku. Dulu dibaca Function `accept-tos` dari env server
 * `CURRENT_TOS_VERSION` (default "v3.1"). Status kini dibaca langsung dari
 * baris `users` milik sendiri (RLS), jadi versinya harus diketahui browser:
 * `NEXT_PUBLIC_CURRENT_TOS_VERSION`, default sama dengan Function lama.
 * Route accept (Fase 6) wajib memakai konstanta yang sama.
 */
export const CURRENT_TOS_VERSION = process.env.NEXT_PUBLIC_CURRENT_TOS_VERSION || "v3.1";

const MOCK_CURRENT_TOS_VERSION = "v3.1";
const MOCK_TOS_ACCEPTED_AT = "2026-09-01T00:00:00.000Z";

const getMockTosStatus = (): TosStatus => ({
  currentVersion: MOCK_CURRENT_TOS_VERSION,
  acceptedVersion: MOCK_CURRENT_TOS_VERSION,
  acceptedAt: MOCK_TOS_ACCEPTED_AT,
  needsConsent: false,
});

export async function getTosStatus(): Promise<ServiceResult<TosStatus>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(150);
    return ok(getMockTosStatus());
  }

  const auth = await requireUserId<TosStatus>(noData<TosStatus>());
  if (!auth.ok) return auth.result;

  // Port logika `accept-tos` action "status" (00_BACKEND/functions/accept-tos).
  try {
    const { data, error } = await createClient()
      .from("users")
      .select("tos_version, tos_accepted_at")
      .eq("id", auth.userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail("Profil pengguna tidak ditemukan.", "not_found", noData<TosStatus>());
    const acceptedVersion = data.tos_version || null;
    const acceptedAt = data.tos_accepted_at || null;
    return ok({
      currentVersion: CURRENT_TOS_VERSION,
      acceptedVersion,
      acceptedAt,
      needsConsent: acceptedVersion !== CURRENT_TOS_VERSION || !acceptedAt,
    });
  } catch (error) {
    return failFromError(error, noData<TosStatus>(), "tos.status");
  }
}

// TODO(fase-06): terima T&C → Route Handler (pakai CURRENT_TOS_VERSION).
export async function acceptCurrentTos(
  version: string
): Promise<ServiceResult<TosAcceptResult>> {
  if (DATA_SOURCE_CONFIG.useMockData) {
    await mockDelay(150);
    return ok({ success: true, alreadyAccepted: true, tos_version: MOCK_CURRENT_TOS_VERSION });
  }

  try {
    return ok(await executeFunction<TosAcceptResult>(FUNCTION_IDS.acceptTos, {
      action: "accept",
      tos_version: version,
    }));
  } catch (error) {
    return failFromWriteError(error, noData<TosAcceptResult>(), undefined, "tos.accept");
  }
}
