import { describe, expect, it } from "vitest";

import { HttpError } from "@/server/http-error";
import { requireAdmin } from "@/server/require-admin";
import { createFakeSupabase } from "@/test/fake-supabase";

const ADMIN_ID = "33333333-3333-3333-3333-333333333333";

function setup(opts: {
  user?: { id: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null;
  row?: Record<string, unknown> | null;
}) {
  const db = createFakeSupabase({ users: opts.row ? [opts.row] : [] });
  db.setAuthUser(opts.user === undefined ? null : opts.user);
  return { db, run: () => requireAdmin({ clients: { server: db as never, admin: db as never } }) };
}

async function statusOf(promise: Promise<unknown>) {
  const err = await promise.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(HttpError);
  return { status: (err as HttpError).status, message: (err as HttpError).message };
}

describe("requireAdmin", () => {
  it("tanpa sesi → 401", async () => {
    const { run } = setup({ user: null });
    expect(await statusOf(run())).toEqual({ status: 401, message: "Unauthorized" });
  });

  it("admin aktif (app_metadata + users.role + active) → lolos dan memberi client service role", async () => {
    const { db, run } = setup({
      user: { id: ADMIN_ID, app_metadata: { role: "admin" } },
      row: { id: ADMIN_ID, role: "admin", status: "active" },
    });
    const ctx = await run();
    expect(ctx.user.id).toBe(ADMIN_ID);
    expect(ctx.db).toBe(db);
    expect(db.calls).toEqual([{ table: "users", filters: [`id.eq.${ADMIN_ID}`], count: undefined }]);
  });

  it("app_metadata admin tapi users.role bukan admin → 403", async () => {
    const { run } = setup({
      user: { id: ADMIN_ID, app_metadata: { role: "admin" } },
      row: { id: ADMIN_ID, role: "creator", status: "active" },
    });
    expect(await statusOf(run())).toEqual({ status: 403, message: "Akses Admin ditolak." });
  });

  it("app_metadata admin tanpa baris users → 403", async () => {
    const { run } = setup({ user: { id: ADMIN_ID, app_metadata: { role: "admin" } }, row: null });
    expect((await statusOf(run())).status).toBe(403);
  });

  it("users.role admin tapi app_metadata bukan admin → 403 tanpa membaca database", async () => {
    const { db, run } = setup({
      user: { id: ADMIN_ID, app_metadata: {}, user_metadata: { role: "admin" } },
      row: { id: ADMIN_ID, role: "admin", status: "active" },
    });
    expect((await statusOf(run())).status).toBe(403);
    expect(db.calls).toEqual([]);
  });

  it("user_metadata.role admin TIDAK pernah cukup", async () => {
    const { run } = setup({
      user: { id: ADMIN_ID, user_metadata: { role: "admin" } },
      row: { id: ADMIN_ID, role: "admin", status: "active" },
    });
    expect((await statusOf(run())).status).toBe(403);
  });

  it.each(["suspended", "terminated"])("admin berstatus %s → 403", async (status) => {
    const { run } = setup({
      user: { id: ADMIN_ID, app_metadata: { role: "admin" } },
      row: { id: ADMIN_ID, role: "admin", status },
    });
    expect((await statusOf(run())).status).toBe(403);
  });

  it("baca users gagal → error dilempar (jadi 500 di apiRoute)", async () => {
    const { db, run } = setup({ user: { id: ADMIN_ID, app_metadata: { role: "admin" } }, row: null });
    db.failTable("users", { code: "XX000", message: "boom" });
    await expect(run()).rejects.toMatchObject({ code: "XX000" });
  });
});
