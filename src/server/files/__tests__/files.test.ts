import { beforeEach, describe, expect, it } from "vitest";

import { HttpError } from "@/server/auth/http-error";
import { confirmUserFileUpload } from "@/server/files/confirm";
import { deleteUserFile } from "@/server/files/delete";
import type { FilesDb } from "@/server/files/shared";
import { getUserFileSignedUrl } from "@/server/files/signed-url";
import { createUserFileUploadUrl } from "@/server/files/upload-url";
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

import { createStorageStub } from "./storage-stub";

const K = "22222222-2222-4222-8222-222222222222"; // kreator (pengunggah)
const U = "11111111-1111-4111-8111-111111111111"; // UMKM pihak order
const X = "33333333-3333-4333-8333-333333333333"; // orang lain

let fake: FakeSupabase;
let stub: ReturnType<typeof createStorageStub>;
let db: FilesDb;

/**
 * Error RPC bergaya PostgREST (`code` + `hint`). `fake.setRpc` membuang `hint`,
 * jadi ditimpa langsung lewat mock (sekali pakai).
 */
function failRpc(message: string, hint: string) {
  fake.rpc.mockImplementationOnce(async () => ({ data: null, error: { code: "P0001", message, hint } }));
}

const fileRow = (over: Record<string, unknown> = {}) => ({
  id: "f1",
  user_id: K,
  storage_file_id: `${K}/abc.pdf`,
  bucket_id: "user-files",
  file_name: "Brief.pdf",
  mime_type: "application/pdf",
  size_bytes: 600,
  status: "active",
  shared_with_order_id: "ord1",
  created_at: "2026-11-23T00:00:00+00:00",
  ...over,
});

beforeEach(() => {
  fake = createFakeSupabase({
    user_storage_usage: [{ user_id: K, used_bytes: 400, quota_bytes: 1000, file_count: 3 }],
    user_files: [fileRow(), fileRow({ id: "f-del", status: "deleted", storage_file_id: `${K}/old.pdf` })],
    orders: [{ id: "ord1", umkm_id: U, creator_id: K }],
  });
  stub = createStorageStub();
  db = Object.assign(fake, { storage: stub.storage }) as unknown as FilesDb;
});

const ctx = (userId = K, isAdmin = false) => ({ db, userId, isAdmin });

describe("createUserFileUploadUrl", () => {
  it("path <uid>/<uuid>.<ext> di bucket user-files, token dari signed upload URL", async () => {
    const res = await createUserFileUploadUrl(ctx(), { fileName: "Laporan Akhir.PDF", mimeType: "application/pdf", sizeBytes: 500 });
    expect(res.bucketId).toBe("user-files");
    expect(res.path).toMatch(new RegExp(`^${K}/[0-9a-f-]{36}\\.pdf$`));
    expect(res.token).toBe(`tok-${res.path}`);
    expect(stub.calls).toEqual([{ bucket: "user-files", op: "createSignedUploadUrl", args: [res.path] }]);
    expect(fake.calls[0]).toMatchObject({ table: "user_storage_usage", filters: [`user_id.eq.${K}`] });
  });

  it("ekstensi aneh dibuang dari path", async () => {
    const res = await createUserFileUploadUrl(ctx(), { fileName: "x.p/../df", mimeType: "application/pdf", sizeBytes: 1 });
    expect(res.path).toMatch(new RegExp(`^${K}/[0-9a-f-]{36}$`));
  });

  it.each([
    [{ mimeType: "application/x-msdownload", sizeBytes: 10 }, 400, "Tipe file tidak diizinkan."],
    [{ mimeType: "application/vnd.ms-excel", sizeBytes: 10 }, 400, "Tipe file tidak diizinkan."],
    [{ mimeType: "application/pdf", sizeBytes: 20 * 1024 * 1024 + 1 }, 400, "Ukuran file maksimal 20 MB."],
    [{ mimeType: "application/pdf", sizeBytes: 601 }, 409, "Kuota penyimpanan penuh."],
  ])("ditolak %o → %i", async (input, status, message) => {
    const err = await createUserFileUploadUrl(ctx(), { fileName: "a.pdf", ...input }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toMatchObject({ status, message });
    expect(stub.calls).toHaveLength(0);
  });

  it("batas 100 file aktif → 409; kuota tidak ada → 404", async () => {
    fake.tables.user_storage_usage[0].file_count = 100;
    await expect(createUserFileUploadUrl(ctx(), { fileName: "a.pdf", mimeType: "application/pdf", sizeBytes: 1 })).rejects.toMatchObject({ status: 409 });
    await expect(createUserFileUploadUrl(ctx(X), { fileName: "a.pdf", mimeType: "application/pdf", sizeBytes: 1 })).rejects.toMatchObject({ status: 404 });
  });
});

describe("confirmUserFileUpload", () => {
  it("memanggil RPC dengan userId sesi; DTO file", async () => {
    let args: Record<string, unknown> = {};
    fake.setRpc("confirm_user_file", (a) => {
      args = a;
      return fileRow();
    });
    const res = await confirmUserFileUpload(ctx(), { path: `${K}/abc.pdf`, fileName: "Brief.pdf", shareWithOrderId: "ord1" });
    expect(args).toEqual({ p_user_id: K, p_path: `${K}/abc.pdf`, p_file_name: "Brief.pdf", p_shared_with_order_id: "ord1" });
    expect(res).toEqual({
      status: "ok",
      file: {
        $id: "f1",
        fileName: "Brief.pdf",
        mimeType: "application/pdf",
        sizeBytes: 600,
        bucketId: "user-files",
        storageFileId: `${K}/abc.pdf`,
        status: "active",
        sharedWithOrderId: "ord1",
        createdAt: "2026-11-23T00:00:00+00:00",
      },
    });
  });

  it("kuota penuh → 409 dan objek yang ditolak dihapus", async () => {
    failRpc("Kuota penyimpanan penuh.", "quota_exceeded");
    const err = await confirmUserFileUpload(ctx(), { path: `${K}/abc.pdf`, fileName: "a.pdf" }).catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 409, message: "Kuota penyimpanan penuh." });
    expect(stub.calls).toEqual([{ bucket: "user-files", op: "remove", args: [[`${K}/abc.pdf`]] }]);
  });

  it("path milik orang lain → 403 dan TIDAK menghapus apa pun", async () => {
    failRpc("Path file tidak valid.", "forbidden");
    await expect(confirmUserFileUpload(ctx(), { path: `${X}/abc.pdf`, fileName: "a.pdf" })).rejects.toMatchObject({ status: 403 });
    expect(stub.calls).toHaveLength(0);
  });

  it("objek belum ada → 404; file tidak valid → 400", async () => {
    failRpc("File belum diunggah.", "not_found");
    await expect(confirmUserFileUpload(ctx(), { path: `${K}/x`, fileName: "a" })).rejects.toMatchObject({ status: 404 });
    failRpc("Tipe file tidak diizinkan.", "invalid_file");
    await expect(confirmUserFileUpload(ctx(), { path: `${K}/x`, fileName: "a" })).rejects.toMatchObject({ status: 400 });
  });
});

describe("deleteUserFile", () => {
  it("RPC lalu hapus objek storage", async () => {
    fake.setRpc("delete_user_file", (a) => fileRow({ id: String(a.p_file_id), status: "deleted" }));
    const res = await deleteUserFile(ctx(), "f1");
    expect(res.file).toMatchObject({ $id: "f1", status: "deleted" });
    expect(fake.rpc).toHaveBeenCalledWith("delete_user_file", { p_user_id: K, p_file_id: "f1" });
    expect(stub.calls).toEqual([{ bucket: "user-files", op: "remove", args: [[`${K}/abc.pdf`]] }]);
  });

  it("bukan pemilik → 403 tanpa menyentuh storage", async () => {
    failRpc("Akses ditolak.", "forbidden");
    await expect(deleteUserFile(ctx(X), "f1")).rejects.toMatchObject({ status: 403 });
    expect(stub.calls).toHaveLength(0);
  });

  it("gagal hapus objek tidak menggagalkan respons (baris sudah deleted)", async () => {
    fake.setRpc("delete_user_file", () => fileRow({ status: "deleted" }));
    stub.failures.remove = { message: "boom" };
    await expect(deleteUserFile(ctx(), "f1")).resolves.toMatchObject({ status: "ok" });
  });
});

describe("getUserFileSignedUrl", () => {
  it.each([
    ["pemilik", K, false],
    ["pihak order yang dibagikan", U, false],
    ["admin", X, true],
  ])("%s → signed URL 300 detik", async (_name, userId, isAdmin) => {
    const res = await getUserFileSignedUrl(ctx(userId, isAdmin), "f1");
    expect(res).toEqual({
      url: `https://sb.test/sign/user-files/${K}/abc.pdf?ttl=300`,
      expiresIn: 300,
      fileName: "Brief.pdf",
      mimeType: "application/pdf",
    });
  });

  it("orang lain → 403; tidak dibagikan → 403", async () => {
    await expect(getUserFileSignedUrl(ctx(X), "f1")).rejects.toMatchObject({ status: 403 });
    fake.tables.user_files[0].shared_with_order_id = null;
    await expect(getUserFileSignedUrl(ctx(U), "f1")).rejects.toMatchObject({ status: 403 });
    expect(stub.calls).toHaveLength(0);
  });

  it("file deleted / tidak ada → 404", async () => {
    await expect(getUserFileSignedUrl(ctx(), "f-del")).rejects.toMatchObject({ status: 404 });
    await expect(getUserFileSignedUrl(ctx(), "nope")).rejects.toMatchObject({ status: 404 });
  });
});
