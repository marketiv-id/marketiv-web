import { describe, expect, it, vi } from "vitest";
import {
  AdminAuthError,
  logoutAdminSession,
  resolveAdminSession,
  signInAdminSession,
} from "./auth";
import { canLoadProtectedAdminData } from "@/components/admin/AdminAuthBoundary";

type Row = { role?: string; status?: string } | null;

function dependencies(options: {
  getUser?: () => Promise<unknown>;
  signIn?: () => Promise<unknown>;
  appRole?: string | undefined;
  userMetadataRole?: string;
  row?: Row;
  rowError?: unknown;
} = {}) {
  const appRole = "appRole" in options ? options.appRole : "admin";
  const getUser = vi.fn(
    options.getUser ??
      (async () => ({
        data: {
          user: {
            id: "admin-1",
            email: "admin@example.test",
            app_metadata: appRole ? { role: appRole } : {},
            user_metadata: options.userMetadataRole ? { role: options.userMetadataRole } : {},
          },
        },
        error: null,
      })),
  );
  const signInWithPassword = vi.fn(options.signIn ?? (async () => ({ data: {}, error: null })));
  const signOut = vi.fn(async () => ({ error: null }));
  const maybeSingle = vi.fn(async () => ({
    data: options.row === undefined ? { role: "admin", status: "active" } : options.row,
    error: options.rowError ?? null,
  }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return {
    supabase: { auth: { getUser, signInWithPassword, signOut }, from },
  } as unknown as NonNullable<Parameters<typeof resolveAdminSession>[0]> & {
    supabase: {
      auth: { getUser: typeof getUser; signInWithPassword: typeof signInWithPassword; signOut: typeof signOut };
      from: typeof from;
    };
  };
}

async function expectFailure(
  subject: Promise<unknown>,
  kind: AdminAuthError["kind"],
) {
  await expect(subject).rejects.toMatchObject({ kind });
}

describe("Admin authorization service (Supabase)", () => {
  it("fails closed for anonymous sessions", async () => {
    await expectFailure(
      resolveAdminSession(
        dependencies({
          getUser: async () => ({ data: { user: null }, error: { name: "AuthSessionMissingError", status: 400 } }),
        }),
      ),
      "unauthenticated",
    );
  });

  it("denies UMKM and Creator roles", async () => {
    await expectFailure(resolveAdminSession(dependencies({ row: { role: "umkm", status: "active" } })), "forbidden");
    await expectFailure(resolveAdminSession(dependencies({ row: { role: "creator", status: "active" } })), "forbidden");
  });

  it("denies a users.role admin without app_metadata.role admin", async () => {
    await expectFailure(resolveAdminSession(dependencies({ appRole: undefined })), "forbidden");
  });

  it("ignores user_metadata.role and missing users rows (no label/prefs fallback)", async () => {
    await expectFailure(
      resolveAdminSession(dependencies({ appRole: undefined, userMetadataRole: "admin", row: null })),
      "forbidden",
    );
    await expectFailure(resolveAdminSession(dependencies({ row: null })), "forbidden");
  });

  it("denies suspended Admins", async () => {
    await expectFailure(resolveAdminSession(dependencies({ row: { role: "admin", status: "suspended" } })), "suspended");
  });

  it("fails closed for Supabase failures", async () => {
    await expectFailure(
      resolveAdminSession(dependencies({ getUser: async () => { throw new Error("offline"); } })),
      "error",
    );
    await expectFailure(resolveAdminSession(dependencies({ rowError: { message: "boom" } })), "error");
  });

  it("allows active Admins with both users.role and app_metadata.role", async () => {
    await expect(resolveAdminSession(dependencies())).resolves.toMatchObject({
      userId: "admin-1",
      email: "admin@example.test",
      role: "admin",
      status: "active",
    });
  });

  it("creates then validates an Admin session before allowing access", async () => {
    const deps = dependencies();

    await expect(signInAdminSession(" admin@example.test ", "secret", deps)).resolves.toMatchObject({
      userId: "admin-1",
      isAdmin: true,
    });
    expect(deps.supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.test",
      password: "secret",
    });
  });

  it("removes a newly-created session if its account is not an active Admin", async () => {
    const deps = dependencies({ row: { role: "creator", status: "active" } });

    await expectFailure(signInAdminSession("creator@example.test", "secret", deps), "forbidden");
    expect(deps.supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("does not expose credential details when Supabase rejects sign-in", async () => {
    const deps = dependencies({
      signIn: async () => ({ data: {}, error: { status: 400, code: "invalid_credentials" } }),
    });

    await expect(signInAdminSession("admin@example.test", "wrong", deps)).rejects.toMatchObject({
      kind: "unauthenticated",
      message: "Email atau kata sandi salah, atau akun tidak dapat masuk.",
    });
    expect(deps.supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it("signs out the local session on logout", async () => {
    const deps = dependencies();
    await logoutAdminSession(deps);
    expect(deps.supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("allows protected loads only after active Admin authorization", () => {
    expect(canLoadProtectedAdminData("authenticated")).toBe(true);
    expect(canLoadProtectedAdminData("loading")).toBe(false);
    expect(canLoadProtectedAdminData("unauthenticated")).toBe(false);
    expect(canLoadProtectedAdminData("forbidden")).toBe(false);
    expect(canLoadProtectedAdminData("suspended")).toBe(false);
    expect(canLoadProtectedAdminData("error")).toBe(false);
  });
});
