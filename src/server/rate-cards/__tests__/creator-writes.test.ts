import { beforeEach, describe, expect, it } from "vitest";

import { HttpError } from "@/server/auth/http-error";
import { createPortfolio, deletePortfolio, updatePortfolio } from "@/server/creator/writes/portfolios";
import { deleteSocialAccount, upsertSocialAccount } from "@/server/creator/writes/social-accounts";
import {
  createRateCard,
  createRateCardPackage,
  deleteRateCard,
  NOT_OWNED,
  setRateCardStatus,
  updateRateCardPackage,
} from "@/server/rate-cards/rate-cards";

import { createWriteFake, type WriteFake } from "./write-fake";

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const body = {
  name: "  Paket A ",
  description: " Deskripsi ",
  output: " 1 video ",
  deliveryDays: 3,
  price: 150000,
  revisionLimit: 1,
  published: true,
};

let fake: WriteFake;
const ctx = () => ({ db: fake.db, userId: ME });

beforeEach(() => {
  fake = createWriteFake({
    rate_cards: [
      { id: "rc_me", creator_id: ME, title: "Lama", status: "draft" },
      { id: "rc_other", creator_id: OTHER, title: "Orang lain", status: "published" },
    ],
    rate_card_packages: [
      { id: "pkg_me", rate_card_id: "rc_me", name: "Lama", description: "d", output: "o", delivery_days: 2, price: 1000, revision_limit: 0 },
      { id: "pkg_other", rate_card_id: "rc_other", name: "X", description: "d", output: "o", delivery_days: 2, price: 1000, revision_limit: 0 },
    ],
    creator_portfolios: [
      { id: "pf_me", creator_id: ME, title: "Lama", portfolio_url: "https://a.test" },
      { id: "pf_other", creator_id: OTHER, title: "X", portfolio_url: "https://b.test" },
    ],
    creator_social_accounts: [{ id: "sa_other", creator_id: OTHER, platform: "tiktok", username: "x", followers: 5 }],
  });
});

const pkgRow = { id: "pkg_new", rate_card_id: "rc_new", name: "Paket A", description: "Deskripsi", output: "1 video", delivery_days: 3, price: 150000, revision_limit: 1 };

describe("rate card", () => {
  it("create: argumen RPC ter-trim, userId dari sesi, DTO sama dengan mapRcPackage lama", async () => {
    let args: Record<string, unknown> = {};
    fake.base.setRpc("creator_create_rate_card", (a) => {
      args = a;
      return { rate_card: { id: "rc_new", status: "published" }, package: pkgRow };
    });
    const dto = await createRateCard(ctx(), body);
    expect(args).toEqual({
      p_creator_id: ME,
      p_name: "Paket A",
      p_description: "Deskripsi",
      p_output: "1 video",
      p_delivery_days: 3,
      p_price: 150000,
      p_revision_limit: 1,
      p_status: "published",
    });
    expect(dto).toEqual({
      id: "pkg_new",
      rateCardId: "rc_new",
      name: "Paket A",
      description: "Deskripsi",
      price: 150000,
      deliverable: "1 video",
      estimatedDays: 3,
      status: "published",
      revisionCount: 1,
    });
  });

  it("create: batas 3 paket (raise P0001) → 409 dengan pesan RPC", async () => {
    fake.base.setRpc("creator_create_rate_card", () => {
      throw Object.assign(new Error("Maksimal 3 paket. Hapus satu paket dulu."), { code: "P0001" });
    });
    await expect(createRateCard(ctx(), body)).rejects.toMatchObject({
      status: 409,
      message: "Maksimal 3 paket. Hapus satu paket dulu.",
    });
  });

  it("update: RPC null (bukan milik) → 403 pesan lama; sukses → DTO", async () => {
    fake.base.setRpc("creator_update_rate_card_package", () => null);
    await expect(updateRateCardPackage(ctx(), { rateCardId: "rc_other", packageId: "pkg_other" }, body)).rejects.toEqual(
      new HttpError(403, NOT_OWNED),
    );
    fake.base.setRpc("creator_update_rate_card_package", (a) => ({
      rate_card: { id: a.p_rate_card_id, status: a.p_status },
      package: { ...pkgRow, id: a.p_package_id, rate_card_id: a.p_rate_card_id },
    }));
    const dto = await updateRateCardPackage(ctx(), { rateCardId: "rc_me", packageId: "pkg_me" }, { ...body, published: false });
    expect(dto).toMatchObject({ id: "pkg_me", rateCardId: "rc_me", status: "draft" });
  });

  it("status: milik orang lain → 403 tanpa menulis; milik sendiri → parent diubah, DTO paket", async () => {
    await expect(setRateCardStatus(ctx(), "rc_other", { status: "draft", packageId: "pkg_other" })).rejects.toEqual(
      new HttpError(403, NOT_OWNED),
    );
    expect(fake.writes).toHaveLength(0);

    await expect(setRateCardStatus(ctx(), "rc_me", { status: "published", packageId: "pkg_other" })).rejects.toEqual(
      new HttpError(403, NOT_OWNED),
    );

    const dto = await setRateCardStatus(ctx(), "rc_me", { status: "published", packageId: "pkg_me" });
    expect(dto).toMatchObject({ id: "pkg_me", rateCardId: "rc_me", status: "published", price: 1000 });
    expect(fake.tables.rate_cards.find((r) => r.id === "rc_me")?.status).toBe("published");
    expect(fake.tables.rate_cards.find((r) => r.id === "rc_other")?.status).toBe("published");
    expect(fake.writes).toEqual([
      { table: "rate_cards", op: "update", values: { status: "published" }, filters: [["id", "rc_me"], ["creator_id", ME]] },
    ]);
  });

  it("delete: RPC false → 403; true → { deleted }; package id diteruskan", async () => {
    const calls: Record<string, unknown>[] = [];
    fake.base.setRpc("creator_delete_rate_card", (a) => {
      calls.push(a);
      return a.p_rate_card_id === "rc_me";
    });
    await expect(deleteRateCard(ctx(), { rateCardId: "rc_other" })).rejects.toEqual(new HttpError(403, NOT_OWNED));
    expect(await deleteRateCard(ctx(), { rateCardId: "rc_me", packageId: "pkg_me" })).toEqual({ deleted: true });
    expect(calls).toEqual([
      { p_creator_id: ME, p_rate_card_id: "rc_other", p_package_id: null },
      { p_creator_id: ME, p_rate_card_id: "rc_me", p_package_id: "pkg_me" },
    ]);
  });

  it("tambah paket: hanya ke rate card sendiri; status dari parent", async () => {
    await expect(createRateCardPackage(ctx(), "rc_other", body)).rejects.toEqual(new HttpError(403, NOT_OWNED));
    const dto = await createRateCardPackage(ctx(), "rc_me", body);
    expect(dto).toMatchObject({ rateCardId: "rc_me", name: "Paket A", status: "draft", deliverable: "1 video" });
    expect(fake.tables.rate_card_packages).toHaveLength(3);
  });
});

describe("portofolio", () => {
  const input = { title: " Karya ", portfolioUrl: " https://c.test ", description: " desk " };

  it("create: creator_id = sesi, trim, thumbnail kosong → null; DTO view-model", async () => {
    const dto = await createPortfolio(ctx(), input);
    const row = fake.tables.creator_portfolios.at(-1)!;
    expect(row).toMatchObject({ creator_id: ME, title: "Karya", portfolio_url: "https://c.test", description: "desk", thumbnail_url: null });
    expect(dto).toEqual({ id: row.id, title: "Karya", url: "https://c.test", description: "desk", thumbnailUrl: undefined });
  });

  it("update/delete milik orang lain → 404 dan baris tidak berubah", async () => {
    await expect(updatePortfolio(ctx(), "pf_other", input)).rejects.toMatchObject({ status: 404 });
    await expect(deletePortfolio(ctx(), "pf_other")).rejects.toMatchObject({ status: 404 });
    expect(fake.tables.creator_portfolios.find((r) => r.id === "pf_other")).toMatchObject({ title: "X" });
  });

  it("update/delete milik sendiri", async () => {
    expect(await updatePortfolio(ctx(), "pf_me", { ...input, thumbnailUrl: "https://t.test/a.png" })).toMatchObject({
      id: "pf_me",
      title: "Karya",
      thumbnailUrl: "https://t.test/a.png",
    });
    expect(await deletePortfolio(ctx(), "pf_me")).toEqual({ deleted: true });
    expect(fake.tables.creator_portfolios.map((r) => r.id)).toEqual(["pf_other"]);
  });
});

describe("akun sosial", () => {
  it("upsert pada (creator_id, platform): baris kedua memperbarui, tidak menggandakan", async () => {
    const first = await upsertSocialAccount(ctx(), { platform: "tiktok", username: " satu ", followers: 10 });
    const second = await upsertSocialAccount(ctx(), { platform: "tiktok", username: "dua" });
    const mine = fake.tables.creator_social_accounts.filter((r) => r.creator_id === ME);
    expect(mine).toHaveLength(1);
    expect(second.id).toBe(first.id);
    // followers tidak dikirim → nilai lama dipertahankan
    expect(mine[0]).toMatchObject({ username: "dua", followers: 10 });
    expect(fake.writes.map((w) => w.values)).toEqual([
      { creator_id: ME, platform: "tiktok", username: "satu", followers: 10 },
      { creator_id: ME, platform: "tiktok", username: "dua" },
    ]);
    // akun kreator lain tidak tersentuh
    expect(fake.tables.creator_social_accounts.find((r) => r.id === "sa_other")).toMatchObject({ username: "x" });
  });

  it("hapus milik orang lain → 404", async () => {
    await expect(deleteSocialAccount(ctx(), "sa_other")).rejects.toMatchObject({ status: 404 });
  });
});
