import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/server/auth/http-error";
import { createStorageStub } from "@/server/files/__tests__/storage-stub";
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

const K = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  db: null as unknown as FakeSupabase & { storage: unknown },
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mocks.db }));
vi.mock("@/server/auth/require-user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth/require-user")>()),
  requireUser: mocks.requireUser,
}));

import { DELETE as deleteFile } from "../[fileId]/route";
import { GET as fileUrl } from "../[fileId]/url/route";
import { POST as confirm } from "../confirm/route";
import { POST as uploadUrl } from "../upload-url/route";

const post = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const params = (fileId: string) => ({ params: Promise.resolve({ fileId }) });

let stub: ReturnType<typeof createStorageStub>;

beforeEach(() => {
  vi.clearAllMocks();
  stub = createStorageStub();
  const fake = createFakeSupabase({
    user_storage_usage: [{ user_id: K, used_bytes: 0, quota_bytes: 1000, file_count: 0 }],
    user_files: [
      { id: "f1", user_id: K, storage_file_id: `${K}/a.pdf`, bucket_id: "user-files", file_name: "a.pdf", mime_type: "application/pdf", status: "active", shared_with_order_id: null },
    ],
  });
  mocks.db = Object.assign(fake, { storage: stub.storage });
  mocks.requireUser.mockResolvedValue({
    user: { id: K, app_metadata: {} },
    userRow: { id: K, role: "creator", status: "active" },
  });
});

describe("/api/files/*", () => {
  it("tanpa sesi → 401 di semua route (sebelum body dibaca)", async () => {
    mocks.requireUser.mockRejectedValue(new HttpError(401, "Sesi tidak ditemukan. Silakan login."));
    const responses = await Promise.all([
      uploadUrl(post("/api/files/upload-url", {})),
      confirm(post("/api/files/confirm", {})),
      deleteFile(new Request("http://localhost/api/files/f1", { method: "DELETE" }), params("f1")),
      fileUrl(new Request("http://localhost/api/files/f1/url"), params("f1")),
    ]);
    for (const res of responses) {
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Sesi tidak ditemukan. Silakan login.", code: "auth" });
    }
  });

  it("upload-url: body valid → 200 { bucketId, path, token }", async () => {
    const res = await uploadUrl(post("/api/files/upload-url", { fileName: "a.pdf", mimeType: "application/pdf", sizeBytes: 10 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ bucketId: "user-files", token: expect.stringMatching(/^tok-/) });
    expect(body.path.startsWith(`${K}/`)).toBe(true);
  });

  it("upload-url: body tidak valid → 400 validation", async () => {
    const res = await uploadUrl(post("/api/files/upload-url", { fileName: "", mimeType: "application/pdf", sizeBytes: "x" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "validation" });
  });

  it("upload-url: melebihi kuota → 409", async () => {
    const res = await uploadUrl(post("/api/files/upload-url", { fileName: "a.pdf", mimeType: "application/pdf", sizeBytes: 5000 }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Kuota penyimpanan penuh.", code: "validation" });
  });

  it("confirm: sukses → 201; RPC menolak kuota → 409", async () => {
    mocks.db.setRpc("confirm_user_file", () => ({
      id: "f9", user_id: K, storage_file_id: `${K}/b.pdf`, bucket_id: "user-files", file_name: "b.pdf",
      mime_type: "application/pdf", size_bytes: 10, status: "active", shared_with_order_id: null, created_at: "t",
    }));
    const ok = await confirm(post("/api/files/confirm", { path: `${K}/b.pdf`, fileName: "b.pdf" }));
    expect(ok.status).toBe(201);
    expect((await ok.json()).file.$id).toBe("f9");

    mocks.db.rpc.mockImplementationOnce(async () => ({ data: null, error: { code: "P0001", message: "Kuota penyimpanan penuh.", hint: "quota_exceeded" } }));
    const full = await confirm(post("/api/files/confirm", { path: `${K}/c.pdf`, fileName: "c.pdf" }));
    expect(full.status).toBe(409);
  });

  it("DELETE: bukan pemilik → 403; pemilik → 200", async () => {
    mocks.db.rpc.mockImplementationOnce(async () => ({ data: null, error: { code: "P0001", message: "Akses ditolak.", hint: "forbidden" } }));
    const denied = await deleteFile(new Request("http://localhost/api/files/f1", { method: "DELETE" }), params("f1"));
    expect(denied.status).toBe(403);

    mocks.db.setRpc("delete_user_file", () => ({
      id: "f1", user_id: K, storage_file_id: `${K}/a.pdf`, bucket_id: "user-files", file_name: "a.pdf",
      mime_type: "application/pdf", size_bytes: 10, status: "deleted", shared_with_order_id: null, created_at: "t",
    }));
    const okRes = await deleteFile(new Request("http://localhost/api/files/f1", { method: "DELETE" }), params("f1"));
    expect(okRes.status).toBe(200);
    expect((await okRes.json()).file.status).toBe("deleted");
  });

  it("GET url: JSON; ?redirect=1 → 302 ke signed URL; tidak ada → 404", async () => {
    const res = await fileUrl(new Request("http://localhost/api/files/f1/url"), params("f1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ url: `https://sb.test/sign/user-files/${K}/a.pdf?ttl=300`, expiresIn: 300 });

    const redirect = await fileUrl(new Request("http://localhost/api/files/f1/url?redirect=1"), params("f1"));
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("location")).toBe(`https://sb.test/sign/user-files/${K}/a.pdf?ttl=300`);
    expect(redirect.headers.get("cache-control")).toBe("no-store");

    const missing = await fileUrl(new Request("http://localhost/api/files/zzz/url"), params("zzz"));
    expect(missing.status).toBe(404);
  });
});
