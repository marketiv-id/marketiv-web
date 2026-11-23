import { beforeEach, describe, expect, it, vi } from "vitest";

const { callApiMock, getSessionMock } = vi.hoisted(() => ({
  callApiMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

vi.mock("@/lib/api/call-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/call-api")>("@/lib/api/call-api");
  return { ...actual, callApi: callApiMock };
});

vi.mock("@/services/auth/session.service", () => ({
  getSession: getSessionMock,
  getCurrentUserId: async () => {
    const session = await getSessionMock();
    return session?.success ? session.data.userId : null;
  },
}));

import { FunctionExecutionError } from "@/lib/api/errors";
import {
  approveDeliverableInAppwrite,
  requestRevisionInAppwrite,
  uploadDeliverableInAppwrite,
} from "../deliverable-appwrite.service";

const input = {
  orderId: "order_1",
  source: "external_url" as const,
  fileUrl: "https://drive.example.test/deliverable",
  notes: "Versi final",
};

const response = {
  id: "deliverable_1",
  orderId: "order_1",
  source: "external_url" as const,
  fileUrl: "https://drive.example.test/deliverable",
  notes: "Versi final",
  version: 2,
  status: "submitted" as const,
  createdAt: "2026-09-02T03:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  getSessionMock.mockResolvedValue({ success: true, data: { userId: "creator_1" } });
});

describe("uploadDeliverableInAppwrite", () => {
  it("mengirim lewat route (orderId → path), tanpa tulis dari browser", async () => {
    callApiMock.mockResolvedValue(response);

    const result = await uploadDeliverableInAppwrite(input);

    expect(result).toEqual({ success: true, data: response });
    expect(callApiMock).toHaveBeenCalledWith("submitDeliverable", input);
  });

  it("validasi klien: storage tanpa fileId tidak memanggil route", async () => {
    const result = await uploadDeliverableInAppwrite({ orderId: "order_1", source: "storage", fileUrl: "x" });
    expect(result).toMatchObject({ success: false, code: "validation", error: "Berkas belum terunggah." });
    expect(callApiMock).not.toHaveBeenCalled();
  });

  it("meneruskan pesan error route ke ServiceResult", async () => {
    callApiMock.mockRejectedValue(
      new FunctionExecutionError("Hanya kreator pengerja yang dapat mengirim deliverable.", 403, "forbidden"),
    );

    const result = await uploadDeliverableInAppwrite(input);

    expect(result).toMatchObject({
      success: false,
      code: "forbidden",
      error: "Hanya kreator pengerja yang dapat mengirim deliverable.",
    });
  });

  it("tanpa sesi → auth, route tidak dipanggil", async () => {
    getSessionMock.mockResolvedValue({ success: false });
    const result = await uploadDeliverableInAppwrite(input);
    expect(result).toMatchObject({ success: false, code: "auth" });
    expect(callApiMock).not.toHaveBeenCalled();
  });
});

describe("requestRevisionInAppwrite", () => {
  const revisionInput = { orderId: "order_1", message: "Perbaiki hook pembuka." };
  const revisionResponse = {
    id: "revision_1",
    orderId: "order_1",
    requestedBy: "umkm_1",
    message: revisionInput.message,
    status: "open" as const,
    createdAt: "2026-09-04T03:00:00.000Z",
  };

  it("hanya mengirim orderId + message (field palsu dibuang zod)", async () => {
    callApiMock.mockResolvedValue(revisionResponse);

    const result = await requestRevisionInAppwrite({
      ...revisionInput,
      umkmId: "forged_umkm",
      creatorId: "forged_creator",
      role: "creator",
    } as typeof revisionInput);

    expect(result).toEqual({ success: true, data: revisionResponse });
    expect(callApiMock).toHaveBeenCalledWith("requestRevision", revisionInput);
  });

  it("batas revisi (409) diteruskan sebagai validation dengan pesan route", async () => {
    callApiMock.mockRejectedValue(
      new FunctionExecutionError("Batas revisi (2) sudah tercapai. Setujui apa adanya atau buka sengketa.", 409, "validation"),
    );
    const result = await requestRevisionInAppwrite(revisionInput);
    expect(result).toMatchObject({
      success: false,
      code: "validation",
      error: "Batas revisi (2) sudah tercapai. Setujui apa adanya atau buka sengketa.",
    });
  });
});

describe("approveDeliverableInAppwrite", () => {
  it("deliverableId → path, orderId dicocokkan server", async () => {
    callApiMock.mockResolvedValue({ ok: true });
    const result = await approveDeliverableInAppwrite("order_1", "dlv_1");
    expect(result).toEqual({ success: true, data: null });
    expect(callApiMock).toHaveBeenCalledWith("approveDeliverable", { deliverableId: "dlv_1", orderId: "order_1" });
  });

  it("pesan route diteruskan (mis. sudah disetujui)", async () => {
    callApiMock.mockRejectedValue(new FunctionExecutionError("Deliverable ini sudah disetujui.", 409, "validation"));
    const result = await approveDeliverableInAppwrite("order_1", "dlv_1");
    expect(result).toMatchObject({ success: false, error: "Deliverable ini sudah disetujui." });
  });
});
