import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminFunctionExecutionError as LegacyError } from "@/lib/admin/execute-function";
import { AdminFunctionExecutionError, callAdminApi } from "@/lib/api/call-api";
import { stubFetch } from "@/test/fetch-mock";

vi.mock("@/lib/admin/appwrite", () => ({ functions: { createExecution: vi.fn() } }));

const isItems = (v: unknown): v is { items: unknown[] } =>
  !!v && typeof v === "object" && Array.isArray((v as { items?: unknown }).items);

afterEach(() => vi.unstubAllGlobals());

describe("callAdminApi", () => {
  it("GET: payload → query string, nilai kosong dilewati", async () => {
    const api = stubFetch().respond(200, { items: [] });
    await expect(
      callAdminApi("getAdminWithdrawalQueue", { status: "all", limit: 100, offset: 0, x: undefined, y: "" }, isItems, "gagal"),
    ).resolves.toEqual({ items: [] });
    expect(api.calls).toEqual([{ url: "/api/admin/withdrawal-queue?status=all&limit=100&offset=0", method: "GET" }]);
  });

  it.each([401, 403, 409, 500])("HTTP %i → error dengan pesan route, kelas sama dengan executeAdminFunction", async (status) => {
    stubFetch().respond(status, { error: "Akses Admin ditolak.", code: "forbidden" });
    const err = await callAdminApi("getAdminDashboardSummary", {}, isItems, "gagal").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AdminFunctionExecutionError);
    expect(err).toBeInstanceOf(LegacyError);
    expect(err).toMatchObject({ statusCode: status, message: "Akses Admin ditolak." });
  });

  it("HTTP gagal tanpa pesan → fallback", async () => {
    stubFetch().respond(500, "");
    await expect(callAdminApi("getAdminDashboardSummary", {}, isItems, "Gagal memuat.")).rejects.toMatchObject({
      statusCode: 500,
      message: "Gagal memuat.",
    });
  });

  it("body bukan JSON / tidak valid / gagal jaringan → fail closed", async () => {
    stubFetch().respond(200, "<html>");
    await expect(callAdminApi("getAdminDashboardSummary", {}, isItems, "x")).rejects.toMatchObject({ statusCode: 200 });
    stubFetch().respond(200, { nope: true });
    await expect(callAdminApi("getAdminDashboardSummary", {}, isItems, "x")).rejects.toMatchObject({ statusCode: 502 });
    stubFetch().networkError();
    await expect(callAdminApi("getAdminDashboardSummary", {}, isItems, "x")).rejects.toMatchObject({ statusCode: 0 });
  });
});
