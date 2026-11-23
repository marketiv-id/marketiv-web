import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/server/auth/http-error";
import { createWriteFake, type WriteFake } from "@/server/rate-cards/__tests__/write-fake";

const ME = "11111111-1111-4111-8111-111111111111";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  fake: null as unknown as { db: unknown },
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mocks.fake.db }));
vi.mock("@/server/auth/require-user", () => ({ requireUser: mocks.requireUser }));

import { DELETE as deleteSocial } from "../../creator/social-accounts/[accountId]/route";
import { PUT as upsertSocial } from "../../creator/social-accounts/route";
import { DELETE as deletePortfolio, PATCH as patchPortfolio } from "../../creator/portfolios/[portfolioId]/route";
import { POST as createPortfolio } from "../../creator/portfolios/route";
import { DELETE as deletePackage, PATCH as patchPackage } from "../[rateCardId]/packages/[packageId]/route";
import { POST as createPackage } from "../[rateCardId]/packages/route";
import { DELETE as deleteCard, PATCH as patchCard } from "../[rateCardId]/route";
import { POST as createCard } from "../route";

const req = (method: string, body?: unknown) =>
  new Request("http://localhost/api/x", {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
const params = <T,>(p: T) => ({ params: Promise.resolve(p) });

const validPackage = {
  name: "Paket A",
  description: "Deskripsi",
  output: "1 video",
  deliveryDays: 3,
  price: 150000,
  revisionLimit: 1,
  published: false,
};

let fake: WriteFake;

beforeEach(() => {
  vi.clearAllMocks();
  fake = createWriteFake({
    rate_cards: [{ id: "rc_me", creator_id: ME, title: "Lama", status: "draft" }],
    rate_card_packages: [{ id: "pkg_me", rate_card_id: "rc_me", name: "Lama", description: "d", output: "o", delivery_days: 1, price: 1000, revision_limit: 0 }],
    creator_portfolios: [],
    creator_social_accounts: [],
  });
  mocks.fake = fake;
  fake.base.setRpc("creator_create_rate_card", (a) => ({
    rate_card: { id: "rc_new", status: a.p_status },
    package: { id: "pkg_new", rate_card_id: "rc_new", name: a.p_name, description: a.p_description, output: a.p_output, delivery_days: a.p_delivery_days, price: a.p_price, revision_limit: a.p_revision_limit },
  }));
  fake.base.setRpc("creator_update_rate_card_package", (a) =>
    a.p_rate_card_id === "rc_me"
      ? { rate_card: { id: "rc_me", status: a.p_status }, package: { id: a.p_package_id, rate_card_id: "rc_me", name: a.p_name } }
      : null,
  );
  fake.base.setRpc("creator_delete_rate_card", (a) => a.p_rate_card_id === "rc_me");
  mocks.requireUser.mockResolvedValue({ user: { id: ME }, userRow: { id: ME, role: "creator", status: "active" } });
});

const cases = [
  ["POST /api/rate-cards", () => createCard(req("POST", validPackage))],
  ["PATCH /api/rate-cards/[id]", () => patchCard(req("PATCH", { status: "draft", packageId: "pkg_me" }), params({ rateCardId: "rc_me" }))],
  ["DELETE /api/rate-cards/[id]", () => deleteCard(req("DELETE"), params({ rateCardId: "rc_me" }))],
  ["POST …/packages", () => createPackage(req("POST", validPackage), params({ rateCardId: "rc_me" }))],
  ["PATCH …/packages/[id]", () => patchPackage(req("PATCH", validPackage), params({ rateCardId: "rc_me", packageId: "pkg_me" }))],
  ["DELETE …/packages/[id]", () => deletePackage(req("DELETE"), params({ rateCardId: "rc_me", packageId: "pkg_me" }))],
  ["POST /api/creator/portfolios", () => createPortfolio(req("POST", { title: "T", portfolioUrl: "https://a.test" }))],
  ["PATCH /api/creator/portfolios/[id]", () => patchPortfolio(req("PATCH", { title: "T", portfolioUrl: "https://a.test" }), params({ portfolioId: "p" }))],
  ["DELETE /api/creator/portfolios/[id]", () => deletePortfolio(req("DELETE"), params({ portfolioId: "p" }))],
  ["PUT /api/creator/social-accounts", () => upsertSocial(req("PUT", { platform: "tiktok", username: "a" }))],
  ["DELETE /api/creator/social-accounts/[id]", () => deleteSocial(req("DELETE"), params({ accountId: "s" }))],
] as const;

describe("route tulis kreator — guard", () => {
  it.each(cases)("%s: tanpa sesi → 401", async (_name, call) => {
    mocks.requireUser.mockRejectedValue(new HttpError(401, "Sesi tidak ditemukan. Silakan login."));
    const res = await call();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sesi tidak ditemukan. Silakan login.", code: "auth" });
    expect(fake.writes).toHaveLength(0);
    expect(fake.base.rpc).not.toHaveBeenCalled();
  });

  it.each(cases)("%s: wajib role creator (guard) → 403", async (_name, call) => {
    mocks.requireUser.mockRejectedValue(new HttpError(403, "Akun ini tidak punya akses untuk aksi tersebut."));
    expect((await call()).status).toBe(403);
    expect(mocks.requireUser).toHaveBeenCalledWith({ role: "creator" });
    expect(fake.writes).toHaveLength(0);
  });
});

describe("route tulis kreator — validasi & hasil", () => {
  it("POST /api/rate-cards: 201 + DTO; harga < 1000 → 400 dengan fieldErrors", async () => {
    const ok = await createCard(req("POST", validPackage));
    expect(ok.status).toBe(201);
    expect(await ok.json()).toMatchObject({ id: "pkg_new", rateCardId: "rc_new", status: "draft", estimatedDays: 3 });

    const bad = await createCard(req("POST", { ...validPackage, price: 10 }));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ code: "validation", fieldErrors: { price: expect.any(String) } });
  });

  it("body JSON rusak → 400", async () => {
    const res = await createCard(req("POST", "{not json"));
    expect(res.status).toBe(400);
  });

  it("PATCH status: status asing → 400; paket bukan milik → 403", async () => {
    expect((await patchCard(req("PATCH", { status: "archived", packageId: "pkg_me" }), params({ rateCardId: "rc_me" }))).status).toBe(400);
    const res = await patchCard(req("PATCH", { status: "published", packageId: "pkg_x" }), params({ rateCardId: "rc_me" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Paket tidak ditemukan atau bukan milik Anda.", code: "forbidden" });
  });

  it("PATCH paket: rate card orang lain → 403; milik sendiri → DTO", async () => {
    expect((await patchPackage(req("PATCH", validPackage), params({ rateCardId: "rc_x", packageId: "pkg_me" }))).status).toBe(403);
    const res = await patchPackage(req("PATCH", { ...validPackage, published: true }), params({ rateCardId: "rc_me", packageId: "pkg_me" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "pkg_me", status: "published" });
  });

  it("DELETE rate card: { deleted: true }; bukan milik → 403", async () => {
    const res = await deleteCard(req("DELETE"), params({ rateCardId: "rc_me" }));
    expect(await res.json()).toEqual({ deleted: true });
    expect((await deleteCard(req("DELETE"), params({ rateCardId: "rc_x" }))).status).toBe(403);
  });

  it("portofolio: URL non-https → 400; hapus yang tidak ada → 404; create → 201", async () => {
    expect((await createPortfolio(req("POST", { title: "T", portfolioUrl: "http://a.test" }))).status).toBe(400);
    expect((await deletePortfolio(req("DELETE"), params({ portfolioId: "nope" }))).status).toBe(404);
    const res = await createPortfolio(req("POST", { title: "T", portfolioUrl: "https://a.test" }));
    expect(res.status).toBe(201);
    expect(fake.tables.creator_portfolios[0]).toMatchObject({ creator_id: ME });
  });

  it("akun sosial: platform asing / followers negatif → 400; valid → upsert milik sesi", async () => {
    expect((await upsertSocial(req("PUT", { platform: "facebook", username: "a" }))).status).toBe(400);
    expect((await upsertSocial(req("PUT", { platform: "tiktok", username: "a", followers: -1 }))).status).toBe(400);
    const res = await upsertSocial(req("PUT", { platform: "tiktok", username: "a", followers: 3, creator_id: "evil" }));
    expect(res.status).toBe(200);
    expect(fake.tables.creator_social_accounts[0]).toMatchObject({ creator_id: ME, followers: 3 });
    expect((await deleteSocial(req("DELETE"), params({ accountId: "nope" }))).status).toBe(404);
  });
});
