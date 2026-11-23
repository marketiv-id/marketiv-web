import {
  CampaignSubmissionDomain,
  ReviewApprovePayload,
  ReviewRejectPayload,
  SubmissionStatus,
} from "../types";
import { FUNCTION_IDS } from "@/lib/admin/appwrite";
import { AdminFunctionExecutionError, callAdminApi } from "@/lib/api/call-api";
import { executeAdminFunction } from "@/lib/admin/execute-function";

export class AdminSubmissionReadError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "AdminSubmissionReadError";
  }
}

export interface ReviewMutationResult {
  success: true;
  message: string;
  refresh: { status: "refreshed"; submissions: CampaignSubmissionDomain[] } | { status: "failed"; error: AdminSubmissionReadError };
}

interface ReviewFunctionResponse {
  success: true;
  campaignId: string;
  status: "approved" | "rejected";
}

export async function getCampaignSubmissions(statusFilter?: SubmissionStatus | "all", searchQuery?: string): Promise<CampaignSubmissionDomain[]> {
  let body: { items: CampaignSubmissionDomain[]; total: number };
  try {
    body = await callAdminApi(
      "getAdminSubmissionQueue", { status: statusFilter || "pending", limit: 50 },
      isQueueResponse, "Gagal memuat antrean submission.",
    );
  } catch (error) {
    if (error instanceof AdminFunctionExecutionError) {
      throw new AdminSubmissionReadError(error.statusCode || 500, error.message);
    }
    throw new AdminSubmissionReadError(500, error instanceof Error ? error.message : "Gagal memuat antrean submission.");
  }
  return filterSubmissions(body.items, searchQuery);
}

export async function getCampaignSubmissionById(id: string): Promise<CampaignSubmissionDomain | null> {
  const submissions = await getCampaignSubmissions("all");
  return submissions.find((item) => item.id === id) || null;
}

export async function approveCampaignSubmission(payload: ReviewApprovePayload): Promise<ReviewMutationResult> {
  if (!Number.isSafeInteger(payload.verifiedViews) || payload.verifiedViews < 0) {
    throw new Error("Jumlah views terverifikasi harus bilangan bulat nol atau lebih.");
  }
  return reviewAndRefresh({ submissionId: payload.submissionId, status: "approved", views: payload.verifiedViews });
}

export async function rejectCampaignSubmission(payload: ReviewRejectPayload): Promise<ReviewMutationResult> {
  const notes = payload.rejectionReason.trim();
  if (!notes) throw new Error("Alasan penolakan wajib diisi.");
  return reviewAndRefresh({ submissionId: payload.submissionId, status: "rejected", notes });
}

async function reviewAndRefresh(payload: Record<string, unknown>): Promise<ReviewMutationResult> {
  // TODO(fase-07): tulis masih lewat Function Appwrite `review-submission`;
  // pindah ke POST /api/admin/submissions/[id]/review.
  const response = await executeAdminFunction(
    FUNCTION_IDS.reviewSubmission, payload, isReviewFunctionResponse, "Gagal menyimpan review submission.",
  );
  try {
    const submissions = await getCampaignSubmissions("all");
    return { success: true, message: reviewMessage(response.status), refresh: { status: "refreshed", submissions } };
  } catch (error) {
    const refreshError = error instanceof AdminSubmissionReadError
      ? error : new AdminSubmissionReadError(502, "Review tersimpan, tetapi antrean terbaru gagal dimuat.");
    return { success: true, message: reviewMessage(response.status), refresh: { status: "failed", error: refreshError } };
  }
}

function isReviewFunctionResponse(value: unknown): value is ReviewFunctionResponse {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return body.success === true && typeof body.campaignId === "string" &&
    (body.status === "approved" || body.status === "rejected");
}

function reviewMessage(status: ReviewFunctionResponse["status"]): string {
  return status === "approved" ? "Submission berhasil disetujui." : "Submission berhasil ditolak.";
}

function isQueueResponse(value: unknown): value is { items: CampaignSubmissionDomain[]; total: number } {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return Array.isArray(body.items) && typeof body.total === "number" && body.items.every(isSubmission);
}

function isSubmission(value: unknown): value is CampaignSubmissionDomain {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.campaignId === "string" && typeof item.status === "string" &&
    typeof item.submittedAt === "string" && isObject(item.creator) && isObject(item.campaign) && isObject(item.umkm);
}

function isObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object"; }

function filterSubmissions(items: CampaignSubmissionDomain[], searchQuery?: string): CampaignSubmissionDomain[] {
  if (!searchQuery?.trim()) return items;
  const query = searchQuery.toLowerCase().trim();
  return items.filter((item) => item.creator.name.toLowerCase().includes(query) || item.creator.username.toLowerCase().includes(query) ||
    item.campaign.title.toLowerCase().includes(query) || item.umkm.name.toLowerCase().includes(query));
}
