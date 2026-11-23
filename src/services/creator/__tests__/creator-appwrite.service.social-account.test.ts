import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tulis Fase 6 di creator-appwrite.service: rate card, profil, akun sosial,
 * portofolio, upload publik. Semua lewat `callApi` (Route Handler) atau
 * `@/lib/supabase/storage` — tidak boleh menyentuh Appwrite lagi.
 */

const mocks = vi.hoisted(() => ({
  callApi: vi.fn(),
  uploadPublicFile: vi.fn(),
  userId: "user_1" as string | null,
  appwrite: {
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getDocument: vi.fn(),
  },
}));

vi.mock("@/lib/api/call-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/call-api")>()),
  callApi: mocks.callApi,
}));

vi.mock("@/lib/supabase/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase/storage")>()),
  uploadPublicFile: mocks.uploadPublicFile,
}));

vi.mock("@/lib/appwrite/databases", () => ({ databases: mocks.appwrite }));

vi.mock("@/services/auth/session.service", () => ({
  getSession: vi.fn(),
  getCurrentUserId: async () => mocks.userId,
}));

import { FunctionExecutionError } from "@/lib/api/errors";
import { FileRuleError } from "@/lib/supabase/storage";

import {
  createCreatorPortfolioInAppwrite,
  createCreatorRateCardPackageInAppwrite,
  deleteCreatorPortfolioInAppwrite,
  deleteCreatorRateCardPackageInAppwrite,
  setCreatorRateCardPackageStatusInAppwrite,
  updateCreatorPortfolioInAppwrite,
  updateCreatorProfileInAppwrite,
  updateCreatorRateCardPackageInAppwrite,
  uploadCreatorAvatarInAppwrite,
  uploadCreatorBannerInAppwrite,
  uploadCreatorPortfolioThumbnailInAppwrite,
  upsertCreatorSocialAccountInAppwrite,
} from "../creator-appwrite.service";

const input = {
  name: "Paket A",
  description: "Deskripsi",
  output: "1 video",
  deliveryDays: 3,
  price: 150000,
  revisionLimit: 1,
  published: true,
};

const dto = {
  id: "pkg_1",
  rateCardId: "rc_1",
  name: "Paket A",
  description: "Deskripsi",
  price: 150000,
  deliverable: "1 video",
  estimatedDays: 3,
  status: "published",
  revisionCount: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userId = "user_1";
});

assertNoAppwriteAfterEach();

function assertNoAppwriteAfterEach() {
  // Setiap test di file ini tidak boleh memanggil Appwrite sama sekali.
  beforeEach(() => {
    return () => {
      for (const fn of Object.values(mocks.appwrite)) expect(fn).not.toHaveBeenCalled();
    };
  });
}

describe("akun sosial — PUT /api/creator/social-accounts", () => {
  it("mengirim followers bila diisi", async () => {
    mocks.callApi.mockResolvedValue({ id: "soc_1" });
    const res = await upsertCreatorSocialAccountInAppwrite({ platform: "tiktok", username: "sehanaf4", followers: 15400 });
    expect(res).toEqual({ success: true, data: null });
    expect(mocks.callApi).toHaveBeenCalledWith("upsertSocialAccount", {
      platform: "tiktok",
      username: "sehanaf4",
      followers: 15400,
    });
  });

  it("tidak mengirim followers saat tidak diisi (server mempertahankan nilai lama)", async () => {
    mocks.callApi.mockResolvedValue({ id: "soc_1" });
    await upsertCreatorSocialAccountInAppwrite({ platform: "tiktok", username: "sehanaf4" });
    const body = mocks.callApi.mock.calls[0][1] as Record<string, unknown>;
    expect(body).toEqual({ platform: "tiktok", username: "sehanaf4" });
  });

  it("menolak followers negatif tanpa request", async () => {
    const res = await upsertCreatorSocialAccountInAppwrite({ platform: "tiktok", username: "x", followers: -1 });
    expect(res).toMatchObject({ success: false, code: "validation" });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });

  it("tanpa sesi → auth tanpa request", async () => {
    mocks.userId = null;
    const res = await upsertCreatorSocialAccountInAppwrite({ platform: "tiktok", username: "x" });
    expect(res).toMatchObject({ success: false, code: "auth" });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });
});

describe("rate card — /api/rate-cards/**", () => {
  it("create → createRateCard, DTO diteruskan", async () => {
    mocks.callApi.mockResolvedValue(dto);
    expect(await createCreatorRateCardPackageInAppwrite(input)).toEqual({ success: true, data: dto });
    expect(mocks.callApi).toHaveBeenCalledWith("createRateCard", input);
  });

  it("update → updateRateCardPackage dengan rateCardId + packageId di path", async () => {
    mocks.callApi.mockResolvedValue(dto);
    await updateCreatorRateCardPackageInAppwrite({ id: "pkg_1", rateCardId: "rc_1" }, input);
    expect(mocks.callApi).toHaveBeenCalledWith("updateRateCardPackage", {
      ...input,
      rateCardId: "rc_1",
      packageId: "pkg_1",
    });
  });

  it("status → updateRateCard { status, packageId }", async () => {
    mocks.callApi.mockResolvedValue({ ...dto, status: "draft" });
    const res = await setCreatorRateCardPackageStatusInAppwrite({ id: "pkg_1", rateCardId: "rc_1" }, "draft");
    expect(res.data).toMatchObject({ status: "draft" });
    expect(mocks.callApi).toHaveBeenCalledWith("updateRateCard", { rateCardId: "rc_1", packageId: "pkg_1", status: "draft" });
  });

  it("hapus → deleteRateCard; 409 order berjalan → validation dengan pesan route", async () => {
    mocks.callApi.mockRejectedValue(
      new FunctionExecutionError(
        "Paket tidak bisa dihapus karena masih ada order berjalan. Jadikan Draft saja.",
        409,
        "validation",
      ),
    );
    const res = await deleteCreatorRateCardPackageInAppwrite({ id: "pkg_1", rateCardId: "rc_1" });
    expect(mocks.callApi).toHaveBeenCalledWith("deleteRateCard", { rateCardId: "rc_1" });
    expect(res).toMatchObject({
      success: false,
      code: "validation",
      error: "Paket tidak bisa dihapus karena masih ada order berjalan. Jadikan Draft saja.",
    });
  });

  it("batas 3 paket (409) → pesan route diteruskan", async () => {
    mocks.callApi.mockRejectedValue(new FunctionExecutionError("Maksimal 3 paket. Hapus satu paket dulu.", 409, "validation"));
    const res = await createCreatorRateCardPackageInAppwrite(input);
    expect(res).toMatchObject({ success: false, code: "validation", error: "Maksimal 3 paket. Hapus satu paket dulu." });
  });
});

describe("profil — PATCH /api/profile", () => {
  it("hanya kolom yang diizinkan dikirim, lalu profil dibaca ulang", async () => {
    mocks.callApi.mockImplementation(async (name: string) =>
      name === "creatorProfile" ? { id: "user_1", name: "Baru" } : { status: "ok" },
    );
    const res = await updateCreatorProfileInAppwrite({
      displayName: "Baru",
      bio: "bio",
      isProfileCompleted: "true",
    } as never);
    expect(mocks.callApi).toHaveBeenNthCalledWith(1, "updateProfile", { displayName: "Baru", bio: "bio" });
    expect(mocks.callApi).toHaveBeenNthCalledWith(2, "creatorProfile");
    expect(res).toEqual({ success: true, data: { id: "user_1", name: "Baru" } });
  });

  it("tanpa perubahan → validation tanpa request", async () => {
    const res = await updateCreatorProfileInAppwrite({});
    expect(res).toMatchObject({ success: false, code: "validation" });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });
});

describe("portofolio — /api/creator/portfolios", () => {
  const item = { id: "p1", title: "T", url: "https://x.test", description: "", thumbnailUrl: undefined };

  it("create / update / delete memanggil route yang benar", async () => {
    mocks.callApi.mockResolvedValue(item);
    await createCreatorPortfolioInAppwrite({ title: "T", portfolioUrl: "https://x.test" });
    await updateCreatorPortfolioInAppwrite("p1", { title: "T", portfolioUrl: "https://x.test" });
    mocks.callApi.mockResolvedValue({ deleted: true });
    expect(await deleteCreatorPortfolioInAppwrite("p1")).toEqual({ success: true, data: null });
    expect(mocks.callApi.mock.calls).toEqual([
      ["createPortfolio", { title: "T", portfolioUrl: "https://x.test" }],
      ["updatePortfolio", { title: "T", portfolioUrl: "https://x.test", portfolioId: "p1" }],
      ["deletePortfolio", { portfolioId: "p1" }],
    ]);
  });

  it("404 dari route → not_found", async () => {
    mocks.callApi.mockRejectedValue(new FunctionExecutionError("Portofolio tidak ditemukan.", 404, "not_found"));
    expect(await deleteCreatorPortfolioInAppwrite("p1")).toMatchObject({ success: false, code: "not_found" });
  });
});

describe("upload publik — Supabase Storage", () => {
  const file = new File(["x"], "a.png", { type: "image/png" });

  it.each([
    ["avatar", uploadCreatorAvatarInAppwrite, "avatars"],
    ["banner", uploadCreatorBannerInAppwrite, "creatorBanners"],
    ["portfolio", uploadCreatorPortfolioThumbnailInAppwrite, "portfolios"],
  ] as const)("%s → bucket %s di folder user, URL publik dikembalikan", async (_n, fn, bucket) => {
    mocks.uploadPublicFile.mockResolvedValue({ url: "https://cdn.test/a.png" });
    expect(await fn(file)).toEqual({ success: true, data: "https://cdn.test/a.png" });
    expect(mocks.uploadPublicFile).toHaveBeenCalledWith(bucket, file, "user_1");
  });

  it("FileRuleError → validation dengan pesan aturan", async () => {
    mocks.uploadPublicFile.mockRejectedValue(new FileRuleError("Ukuran file melebihi batas 5 MB."));
    expect(await uploadCreatorAvatarInAppwrite(file)).toMatchObject({
      success: false,
      code: "validation",
      error: "Ukuran file melebihi batas 5 MB.",
    });
  });
});
