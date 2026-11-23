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

describe("callApi — mutasi & :param", () => {
  it("POST: :param diisi dari body lalu dihapus, sisa body jadi JSON", async () => {
    const fetchFn = mockFetch(201, { id: "m1" });
    await callApi("sendMessage", { conversationId: "conv 1", content: "halo" });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/conversations/conv%201/messages");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ content: "halo" });
  });

  it("DELETE: param di path, sisa body di query", async () => {
    const fetchFn = mockFetch(200, { ok: true });
    await callApi("deleteCampaignAsset", { campaignId: "c1", assetId: "a1", force: true });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/campaigns/c1/assets/a1?force=true");
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });

  it("param hilang → validation error tanpa fetch", async () => {
    const fetchFn = mockFetch(200, {});
    await expect(callApi("sendMessage", { content: "x" })).rejects.toMatchObject({ code: "validation" });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
