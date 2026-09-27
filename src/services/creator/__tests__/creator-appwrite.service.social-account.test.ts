import { beforeEach, describe, expect, it, vi } from "vitest";

const { listDocumentsMock, createDocumentMock, updateDocumentMock, getSessionMock } = vi.hoisted(
  () => ({
    listDocumentsMock: vi.fn(),
    createDocumentMock: vi.fn(),
    updateDocumentMock: vi.fn(),
    getSessionMock: vi.fn(),
  })
);

vi.mock("@/lib/appwrite/databases", () => ({
  databases: {
    listDocuments: listDocumentsMock,
    createDocument: createDocumentMock,
    updateDocument: updateDocumentMock,
  },
}));

vi.mock("@/services/auth/session.service", () => ({ getSession: getSessionMock }));

import { upsertCreatorSocialAccountInAppwrite } from "../creator-appwrite.service";

describe("upsertCreatorSocialAccountInAppwrite — followers manual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ success: true, data: { userId: "user_1" } });
  });

  it("menyimpan followers di dokumen baru", async () => {
    listDocumentsMock.mockResolvedValue({ documents: [], total: 0 });
    createDocumentMock.mockResolvedValue({ $id: "soc_1" });

    const res = await upsertCreatorSocialAccountInAppwrite({
      platform: "tiktok",
      username: "sehanaf4",
      followers: 15400,
    });

    expect(res.success).toBe(true);
    expect(createDocumentMock).toHaveBeenCalledOnce();
    const payload = createDocumentMock.mock.calls[0][3] as Record<string, unknown>;
    expect(payload).toMatchObject({
      creatorId: "user_1",
      platform: "tiktok",
      username: "sehanaf4",
      followers: 15400,
    });
  });

  it("memperbarui followers pada dokumen yang sudah ada", async () => {
    listDocumentsMock.mockResolvedValue({ documents: [{ $id: "soc_1" }], total: 1 });
    updateDocumentMock.mockResolvedValue({ $id: "soc_1" });

    await upsertCreatorSocialAccountInAppwrite({
      platform: "tiktok",
      username: "sehanaf4",
      followers: 22000,
    });

    expect(createDocumentMock).not.toHaveBeenCalled();
    const patch = updateDocumentMock.mock.calls[0][3] as Record<string, unknown>;
    expect(patch).toMatchObject({ username: "sehanaf4", followers: 22000 });
  });

  it("tidak menulis followers saat tidak diisi (tetap nilai lama)", async () => {
    listDocumentsMock.mockResolvedValue({ documents: [{ $id: "soc_1" }], total: 1 });
    updateDocumentMock.mockResolvedValue({ $id: "soc_1" });

    await upsertCreatorSocialAccountInAppwrite({ platform: "tiktok", username: "sehanaf4" });

    const patch = updateDocumentMock.mock.calls[0][3] as Record<string, unknown>;
    expect(patch).toEqual({ username: "sehanaf4" });
    expect("followers" in patch).toBe(false);
  });

  it("menolak followers negatif sebagai input tidak valid", async () => {
    const res = await upsertCreatorSocialAccountInAppwrite({
      platform: "tiktok",
      username: "sehanaf4",
      followers: -1,
    });

    expect(res.success).toBe(false);
    expect(createDocumentMock).not.toHaveBeenCalled();
    expect(updateDocumentMock).not.toHaveBeenCalled();
  });
});
