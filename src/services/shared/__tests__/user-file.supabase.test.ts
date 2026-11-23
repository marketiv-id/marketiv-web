import { beforeEach, describe, expect, it, vi } from "vitest";

import { FunctionExecutionError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  callApi: vi.fn(),
  uploadToSignedUrl: vi.fn(),
  from: vi.fn(),
  getCurrentUserId: vi.fn(async (): Promise<string | null> => "user-1"),
}));

vi.mock("@/lib/api/call-api", () => ({ callApi: mocks.callApi }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ storage: { from: mocks.from } }),
}));
vi.mock("@/services/auth/session.service", () => ({ getCurrentUserId: mocks.getCurrentUserId }));

import {
  MAX_USER_FILE_BYTES,
  uploadUserFileInAppwrite,
  userFileUrl,
} from "@/services/shared/user-file-appwrite.service";

const file = (size: number, name = "Laporan.pdf", type = "application/pdf") =>
  new File([new Uint8Array(size)], name, { type });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue({ uploadToSignedUrl: mocks.uploadToSignedUrl });
  mocks.uploadToSignedUrl.mockResolvedValue({ data: { path: "p" }, error: null });
  mocks.callApi.mockImplementation(async (name: string) => {
    if (name === "createUploadUrl") return { bucketId: "user-files", path: "user-1/abc.pdf", token: "tok" };
    if (name === "confirmUpload") return { status: "ok", file: { $id: "uf-1", fileName: "Laporan.pdf" } };
    throw new Error(`unexpected ${name}`);
  });
});

describe("uploadUserFileInAppwrite (Supabase signed upload)", () => {
  it("upload-url → uploadToSignedUrl → confirm; fileUrl = URL stabil route", async () => {
    const f = file(10);
    const res = await uploadUserFileInAppwrite({ file: f, shareWithOrderId: "ord1" });

    expect(mocks.callApi).toHaveBeenNthCalledWith(1, "createUploadUrl", {
      fileName: "Laporan.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10,
    });
    expect(mocks.from).toHaveBeenCalledWith("user-files");
    expect(mocks.uploadToSignedUrl).toHaveBeenCalledWith("user-1/abc.pdf", "tok", f, { contentType: "application/pdf" });
    expect(mocks.callApi).toHaveBeenNthCalledWith(2, "confirmUpload", {
      path: "user-1/abc.pdf",
      fileName: "Laporan.pdf",
      shareWithOrderId: "ord1",
    });
    expect(res).toEqual({
      success: true,
      data: { fileId: "uf-1", fileUrl: userFileUrl("uf-1"), fileName: "Laporan.pdf" },
    });
    expect(userFileUrl("uf-1")).toBe("/api/files/uf-1/url?redirect=1");
  });

  it("berkas kosong / terlalu besar → validation tanpa request", async () => {
    expect(await uploadUserFileInAppwrite({ file: file(0) })).toMatchObject({ success: false, code: "validation", error: "Berkas kosong." });
    const big = { name: "x.pdf", type: "application/pdf", size: MAX_USER_FILE_BYTES + 1 } as File;
    expect(await uploadUserFileInAppwrite({ file: big })).toMatchObject({ success: false, code: "validation" });
    expect(mocks.callApi).not.toHaveBeenCalled();
  });

  it("tanpa sesi → auth", async () => {
    mocks.getCurrentUserId.mockResolvedValueOnce(null);
    expect(await uploadUserFileInAppwrite({ file: file(1) })).toMatchObject({ success: false, code: "auth" });
  });

  it("kuota penuh dari route → pesan route diteruskan (validation)", async () => {
    mocks.callApi.mockRejectedValueOnce(new FunctionExecutionError("Kuota penyimpanan penuh.", 409, "validation"));
    expect(await uploadUserFileInAppwrite({ file: file(1) })).toMatchObject({
      success: false,
      code: "validation",
      error: "Kuota penyimpanan penuh.",
    });
    expect(mocks.uploadToSignedUrl).not.toHaveBeenCalled();
  });

  it("Storage menolak unggahan → server error, confirm tidak dipanggil", async () => {
    mocks.uploadToSignedUrl.mockResolvedValueOnce({ data: null, error: { message: "mime type not supported" } });
    expect(await uploadUserFileInAppwrite({ file: file(1) })).toMatchObject({ success: false, code: "server" });
    expect(mocks.callApi).toHaveBeenCalledTimes(1);
  });
});
