import { afterEach, describe, expect, it, vi } from "vitest";

import { callApi, FunctionExecutionError } from "@/lib/api/call-api";
import { FunctionExecutionError as LegacyFunctionExecutionError } from "@/lib/api/errors";

function mockFetch(status: number, body: unknown, raw?: string) {
  const fn = vi.fn(async () => new Response(raw ?? (body === undefined ? "" : JSON.stringify(body)), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callApi", () => {
  it("GET: body → query string, nilai kosong dilewati", async () => {
    const fetchFn = mockFetch(200, { items: [] });
    const data = await callApi<{ items: unknown[] }>("creatorDirectory", {
      limit: 12,
      cursor: "abc",
      creatorId: undefined,
      empty: "",
      nested: { a: 1 },
    });
    expect(data).toEqual({ items: [] });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/creator/directory?limit=12&cursor=abc");
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    expect(init.credentials).toBe("same-origin");
  });

  it("GET tanpa body → path polos", async () => {
    const fetchFn = mockFetch(200, { ok: true });
    await callApi("umkmProfile");
    expect((fetchFn.mock.calls[0] as unknown as [string])[0]).toBe("/api/umkm/profile");
  });

  it.each([
    [401, "auth"],
    [403, "forbidden"],
    [404, "not_found"],
    [400, "validation"],
    [409, "validation"],
    [500, "server"],
  ] as const)("status %i → FunctionExecutionError code %s dengan pesan route", async (status, code) => {
    mockFetch(status, { error: "Pesan dari route", code: "ignored", reason: "R1" });
    const err = await callApi("umkmProfile").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FunctionExecutionError);
    // kelas yang sama dengan yang dilempar executeFunction (Appwrite)
    expect(err).toBeInstanceOf(LegacyFunctionExecutionError);
    expect(err).toMatchObject({ statusCode: status, code, message: "Pesan dari route", responseCode: "R1" });
  });

  it("respons non-JSON → server error", async () => {
    mockFetch(200, undefined, "<html>");
    await expect(callApi("umkmProfile")).rejects.toMatchObject({ code: "server" });
  });

  it("gagal jaringan → server error dengan pesan manusiawi", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(callApi("umkmProfile")).rejects.toMatchObject({ code: "server", statusCode: 0 });
  });
});
