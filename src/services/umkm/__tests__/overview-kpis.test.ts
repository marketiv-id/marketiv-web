import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/data-source.config", () => ({ DATA_SOURCE_CONFIG: { useMockData: true } }));
vi.mock("@/lib/appwrite/databases", () => ({
  databases: {
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}));
vi.mock("@/lib/appwrite/functions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/appwrite/functions")>(
    "@/lib/appwrite/functions"
  );
  return { ...actual, executeFunction: vi.fn() };
});
vi.mock("@/lib/appwrite/storage", () => ({
  uploadPublicFile: vi.fn(),
  FileRuleError: class FileRuleError extends Error {},
}));
vi.mock("@/services/shared/conversation-appwrite.service", () => ({
  sendMessageInAppwrite: vi.fn(),
  getMessagesByConversationIdInAppwrite: vi.fn(),
}));
vi.mock("@/services/shared/notification-appwrite.service", () => ({
  getNotificationsFromAppwrite: vi.fn(),
}));

import { deriveOverviewKpis } from "@/mocks/umkm/overview.mock";
import { getOverview } from "../umkm-dashboard.service";

describe("KPI overview mode mock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menurunkan KPI dari daftar campaign, bukan konstanta statis", () => {
    const campaigns = [
      { status: "active", usedQuota: 1 },
      { status: "active", usedQuota: 0 },
      { status: "active", usedQuota: 2 },
      { status: "completed", usedQuota: 4 },
    ] as Parameters<typeof deriveOverviewKpis>[0];

    const kpis = deriveOverviewKpis(campaigns);

    expect(kpis.campaignActive).toBe(3);
    expect(kpis.campaignCompleted).toBe(1);
    expect(kpis.creatorJoined).toBe(7);
  });

  it("facade memakai KPI turunan sehingga KPI dan daftar campaign konsisten", async () => {
    const res = await getOverview();

    expect(res.success).toBe(true);
    const data = res.data!;
    const joined = data.campaigns.reduce((sum, c) => sum + c.usedQuota, 0);

    expect(data.kpis.creatorJoined).toBe(joined);
    expect(data.kpis.campaignActive).toBe(
      data.campaigns.filter((c) => c.status === "active").length
    );
  });
});
