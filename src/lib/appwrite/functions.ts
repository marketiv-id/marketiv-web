/**
 * Appwrite Functions Service Wrapper
 *
 * Exposes Functions SDK for triggering trusted backend execution.
 * All sensitive mutations (claim campaign, escrow, withdrawal, payout)
 * must be triggered via Functions — never directly from frontend state.
 *
 * Agregasi/join baca yang tidak bisa dipetakan setia dari satu collection juga
 * lewat sini — lihat FUNCTION_IDS. Kontrak DTO: 00_BACKEND/functions/<id>/src/main.js.
 */
import { Functions, ExecutionMethod, AppwriteException } from "appwrite";
import { client } from "./client";
import type { ServiceErrorCode } from "@/types/domain";

export const functions = new Functions(client);

/** ID Function harus sama persis dengan `$id` di 00_BACKEND/appwrite.config.json. */
export const FUNCTION_IDS = {
  // ── Baca (DTO agregasi) ──────────────────────────────────────────────────
  umkmDashboardSummary: "get-umkm-dashboard-summary",
  umkmFinanceSummary: "get-umkm-finance-summary",
  umkmProfile: "get-umkm-profile",
  creatorDirectory: "get-creator-directory",
  creatorProfile: "get-creator-profile",
  creatorDashboardSummary: "get-creator-dashboard-summary",
  // Pasangan DTO ruang negosiasi. Keduanya di-key conversationId dan menjoin
  // offers → orders → escrows; yang berbeda hanya sisi peserta dan semantik fee
  // (seller-side, ADR-008). Lihat header masing-masing Function.
  creatorNegotiations: "get-creator-negotiations",
  umkmNegotiations: "get-umkm-negotiations",
  umkmRatecardReviews: "get-umkm-ratecard-reviews",
  // ── Tulis lintas-user (Sprint 8) ─────────────────────────────────────────
  /**
   * Aksi tulis berikut HARUS lewat server, bukan karena agregasi tapi karena
   * Appwrite melarang klien memasang permission untuk user lain — dari sesi
   * browser `permissions` hanya boleh menyebut `any`, `users`, dan role diri
   * sendiri. Sementara `conversations`/`messages`/`offers`/`campaign_*` tidak
   * punya izin di level koleksi, jadi lawan bicara cuma bisa mengaksesnya lewat
   * permission per-baris. `deliverables` juga harus memberi READ ke Creator +
   * UMKM dan UPDATE hanya ke UMKM pemilik order.
   *
   * Gejalanya kalau ada yang memindahkannya kembali ke klien:
   * `AppwriteException: Permissions must be one of: (any, users, user:<diri
   * sendiri>, ...)`, yang di UI tampil sebagai "Gagal menyimpan data".
   */
  createConversation: "create-conversation",
  patchConversationArchive: "patch-conversation-archive",
  sendMessage: "send-message",
  createOffer: "create-offer",
  submitCampaignProof: "submit-campaign-proof",
  submitRatecardDeliverable: "submit-ratecard-deliverable",
  requestRatecardRevision: "request-ratecard-revision",
  reviewSubmission: "review-submission",
  unclaimCampaign: "unclaim-campaign",
  markNotificationsRead: "mark-notifications-read",
  // ── Fix SEC-H1: guard campaign money fields (2026-08-08) ────────────────
  /**
   * Dua Function ini menggantikan client-side updateDocument pada koleksi campaigns.
   * Baris campaign tidak lagi punya Permission.update dari browser — semua mutasi
   * disalurkan lewat sini agar remainingBudget / spentAmount / status / totalClaims
   * tidak bisa diset sembarangan dari browser console.
   */
  patchCampaignDraft: "patch-campaign-draft",
  patchCampaignStatus: "patch-campaign-status",
  // ── Tulis / aksi (Sprint 3) ──────────────────────────────────────────────
  aiBrief: "ai-brief",
  createPayment: "create-payment",
  cancelPayment: "cancel-payment",
  cancelOrder: "cancel-order",
  requestWithdrawal: "request-withdrawal",
  validateAndUpload: "validate-and-upload",
  // ── Auth (Sprint 6) ──────────────────────────────────────────────────────
  /**
   * Dieksekusi SINKRON dari klien setelah account.updatePrefs, bukan lewat event
   * users.*.create: Function membaca role dari prefs, dan prefs baru ada setelah
   * sesi hidup — jadi saat event menyala prefs masih kosong dan Function menolak
   * 400. Lihat handoff-auth-sprint6.md §A-1.
   *
   * Butuh `execute` untuk role `users`; belum diberikan, jadi 401 sampai tim
   * backend bertindak. Kegagalannya sengaja tidak menggagalkan register.
   */
  createUserProfile: "create-user-profile",
  acceptTos: "accept-tos",
  /**
   * Update profil + hitung `isProfileCompleted` server-side. Client TIDAK boleh
   * menulis flag completion — Function membaca role dari users, evaluasi field
   * canonical (UMKM: businessName/category/city/desc≥20/phone; Creator:
   * displayName/niche/city/bio≥20 + TikTok), lalu set false→true saja
   * (never downgrade).
   */
  updateProfile: "update-profile",
  requestPasswordOtp: "request-password-otp",
  resetPasswordWithOtp: "reset-password-with-otp",
} as const;

export type FunctionId = (typeof FUNCTION_IDS)[keyof typeof FUNCTION_IDS];

/** Error eksekusi Function dengan `code` siap dipetakan ke ServiceResult. */
export class FunctionExecutionError extends Error {
  readonly code: ServiceErrorCode;
  readonly statusCode: number;
  readonly responseCode?: string;

  constructor(message: string, statusCode: number, code: ServiceErrorCode, responseCode?: string) {
    super(message);
    this.name = "FunctionExecutionError";
    this.statusCode = statusCode;
    this.code = code;
    this.responseCode = responseCode;
  }
}

const statusToCode = (statusCode: number): ServiceErrorCode => {
  if (statusCode === 401) return "auth";
  if (statusCode === 403) return "forbidden";
  if (statusCode === 404) return "not_found";
  // 409 = konflik yang bisa diperbaiki user (amount mismatch create-payment,
  // kuota penuh validate-and-upload, permintaan withdrawal duplikat).
  if (statusCode === 400 || statusCode === 409 || statusCode === 422) return "validation";
  if (statusCode >= 500) return "server";
  return "unknown";
};

/**
 * Eksekusi Function secara sinkron dan parse body JSON-nya.
 *
 * Function mengembalikan HTTP status di dalam `responseStatusCode` — bukan
 * sebagai exception SDK — jadi status non-2xx harus diperiksa manual.
 *
 * @throws FunctionExecutionError bila eksekusi gagal atau body bukan JSON valid.
 */
export async function executeFunction<T>(
  functionId: FunctionId,
  body?: unknown
): Promise<T> {
  let execution;
  try {
    execution = await functions.createExecution({
      functionId,
      body: body === undefined ? undefined : JSON.stringify(body),
      async: false,
      method: ExecutionMethod.POST,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const statusCode = err instanceof AppwriteException ? err.code : 0;
    throw new FunctionExecutionError(
      `Gagal menjalankan Function ${functionId}`,
      statusCode,
      statusCode ? statusToCode(statusCode) : "server"
    );
  }

  const statusCode = execution.responseStatusCode;

  let payload: unknown;
  try {
    payload = execution.responseBody ? JSON.parse(execution.responseBody) : null;
  } catch {
    payload = null;
  }

  /**
   * `status === "failed"` diperiksa SETELAH body-nya dibaca, bukan sebelum.
   *
   * Appwrite menandai eksekusi yang membalas 5xx sebagai "failed" sekalipun
   * Function-nya menutup rapat errornya dan membalas JSON yang benar. Versi
   * sebelumnya melempar di sini lebih dulu, sehingga `{error: "..."}` dari
   * Function tidak pernah dibaca dan semua kegagalan tampil sebagai kalimat
   * generik "gagal dieksekusi" — persis pola yang sudah dua kali menyembunyikan
   * penyebab asli. `execution.errors` berisi stderr Function dan hanya dicetak
   * di luar production.
   */
  if (execution.status === "failed") {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[function] ${functionId} status=failed code=${statusCode}`,
        execution.errors || execution.responseBody || "(tanpa keluaran)"
      );
    }
    const message =
      (payload as { error?: string } | null)?.error ?? `Function ${functionId} gagal dieksekusi`;
    throw new FunctionExecutionError(
      message,
      statusCode || 500,
      statusToCode(statusCode || 500),
      (payload as { code?: string } | null)?.code
    );
  }

  if (payload === null && execution.responseBody) {
    throw new FunctionExecutionError(
      `Function ${functionId} mengembalikan respons non-JSON`,
      statusCode,
      "server"
    );
  }

  if (statusCode < 200 || statusCode >= 300) {
    const message =
      (payload as { error?: string } | null)?.error ?? `Function ${functionId} mengembalikan ${statusCode}`;
    throw new FunctionExecutionError(
      message,
      statusCode,
      statusToCode(statusCode),
      (payload as { code?: string } | null)?.code
    );
  }

  return payload as T;
}
