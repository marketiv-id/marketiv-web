import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { HttpError } from "../http-error";
import { isAdminUser, requireUser, type RequireUserOptions } from "../require-user";

type Clients = NonNullable<RequireUserOptions["clients"]>;

function clients(opts: {
  user?: Record<string, unknown> | null;
  row?: Record<string, unknown> | null;
}): Clients {
  const user = opts.user === undefined ? { id: "u-1", app_metadata: {} } : opts.user;
  const server = {
    auth: {
      getUser: vi.fn(async () =>
        user ? { data: { user }, error: null } : { data: { user: null }, error: { status: 400 } },
      ),
    },
  };
  const admin = {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: opts.row === undefined ? { id: "u-1", role: "umkm", status: "active" } : opts.row,
            error: null,
          }),
        }),
      }),
    })),
  };
  return { server, admin } as unknown as Clients;
}

async function expectStatus(promise: Promise<unknown>, status: number) {
  await expect(promise).rejects.toBeInstanceOf(HttpError);
  await expect(promise).rejects.toMatchObject({ status });
}

describe("requireUser (port require-active-role)", () => {
  it("401 without a valid session", async () => {
    await expectStatus(requireUser({ clients: clients({ user: null }) }), 401);
  });

  it("404 when the users row is missing", async () => {
    await expectStatus(requireUser({ clients: clients({ row: null }) }), 404);
  });

  it("403 for suspended/terminated accounts unless allowInactive", async () => {
    await expectStatus(
      requireUser({ clients: clients({ row: { id: "u-1", role: "umkm", status: "suspended" } }) }),
      403,
    );
    await expect(
      requireUser({
        allowInactive: true,
        clients: clients({ row: { id: "u-1", role: "umkm", status: "terminated" } }),
      }),
    ).resolves.toMatchObject({ userRow: { status: "terminated" } });
  });

  it("403 for the wrong role", async () => {
    await expectStatus(requireUser({ role: "creator", clients: clients({}) }), 403);
  });

  it("accepts any listed role", async () => {
    await expect(requireUser({ role: ["creator", "umkm"], clients: clients({}) })).resolves.toMatchObject({
      user: { id: "u-1" },
      userRow: { role: "umkm" },
    });
  });

  it("admin needs users.role AND app_metadata.role (never user_metadata)", async () => {
    const adminRow = { id: "u-1", role: "admin", status: "active" };
    await expectStatus(
      requireUser({
        role: "admin",
        clients: clients({ user: { id: "u-1", app_metadata: {}, user_metadata: { role: "admin" } }, row: adminRow }),
      }),
      403,
    );
    await expect(
      requireUser({
        role: "admin",
        clients: clients({ user: { id: "u-1", app_metadata: { role: "admin" } }, row: adminRow }),
      }),
    ).resolves.toMatchObject({ userRow: { role: "admin" } });
  });

  it("isAdminUser rejects app_metadata without users.role", () => {
    expect(isAdminUser({ app_metadata: { role: "admin" } }, { role: "umkm" })).toBe(false);
    expect(isAdminUser({ app_metadata: { role: "admin" } }, null)).toBe(false);
    expect(isAdminUser({ app_metadata: { role: "admin" } }, { role: "admin" })).toBe(true);
  });
});
