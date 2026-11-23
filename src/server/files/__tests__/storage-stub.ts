import { vi } from "vitest";

/** Stub `db.storage` lokal untuk test modul file (fake-supabase tidak punya storage). */
export function createStorageStub() {
  const calls: { bucket: string; op: string; args: unknown[] }[] = [];
  const failures: Partial<Record<"createSignedUploadUrl" | "createSignedUrl" | "remove", { message: string }>> = {};
  const storage = {
    from: vi.fn((bucket: string) => ({
      createSignedUploadUrl: vi.fn(async (path: string) => {
        calls.push({ bucket, op: "createSignedUploadUrl", args: [path] });
        if (failures.createSignedUploadUrl) return { data: null, error: failures.createSignedUploadUrl };
        return { data: { path, token: `tok-${path}`, signedUrl: `https://sb.test/upload/${path}` }, error: null };
      }),
      createSignedUrl: vi.fn(async (path: string, expiresIn: number) => {
        calls.push({ bucket, op: "createSignedUrl", args: [path, expiresIn] });
        if (failures.createSignedUrl) return { data: null, error: failures.createSignedUrl };
        return { data: { signedUrl: `https://sb.test/sign/${bucket}/${path}?ttl=${expiresIn}` }, error: null };
      }),
      remove: vi.fn(async (paths: string[]) => {
        calls.push({ bucket, op: "remove", args: [paths] });
        if (failures.remove) return { data: null, error: failures.remove };
        return { data: [], error: null };
      }),
    })),
  };
  return { storage, calls, failures };
}
