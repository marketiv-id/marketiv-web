import { AdminFunctionExecutionError, callAdminApi } from "@/lib/api/call-api";

export interface DashboardMetrics {
  pendingSubmissionsCount: number;
  reviewedSubmissionsCount: number;
  activeCampaignsCount: number;
}

export class AdminReadError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "AdminReadError";
  }
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    return await callAdminApi("getAdminDashboardSummary", {}, isMetrics, "Gagal memuat ringkasan Admin.");
  } catch (error) {
    if (error instanceof AdminFunctionExecutionError) {
      throw new AdminReadError(error.statusCode || 500, error.message);
    }
    throw new AdminReadError(500, error instanceof Error ? error.message : "Gagal memuat ringkasan Admin.");
  }
}

function isMetrics(value: unknown): value is DashboardMetrics {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return ["pendingSubmissionsCount", "reviewedSubmissionsCount", "activeCampaignsCount"].every(
    (key) => typeof body[key] === "number" && Number.isFinite(body[key]),
  );
}
