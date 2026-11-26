import { describe, expect, it } from "vitest";

import { HttpError } from "@/server/http";
import {
  parseRequestWithdrawalBody,
  requestWithdrawal,
  withdrawalPolicyFromEnv,
} from "@/server/withdrawals/request-withdrawal";
import { createFakeSupabase } from "@/test/fake-supabase";

const ME = "11111111-1111-4111-8111-111111111111";
const body = {
  amount: 60000,
  payoutMethod: "bank",
  providerName: " BCA ",
  accountNumber: "1234567890",
  accountName: "Kreator",
  requestKey: "key-aaaa-0001",
};

describe("request-withdrawal (Fase 8)", () => {
  it("parse body: trim + validasi bentuk", () => {
    expect(parseRequestWithdrawalBody(body)).toMatchObject({ providerName: "BCA", amount: 60000 });
    expect(() => parseRequestWithdrawalBody({ ...body, accountNumber: "12ab" })).toThrowError(/Nomor rekening/);
    expect(() => parseRequestWithdrawalBody({ ...body, requestKey: "x" })).toThrowError(/requestKey/);
    expect(() => parseRequestWithdrawalBody({ ...body, payoutMethod: "cash" })).toThrowError(HttpError);
  });

  it("kebijakan dari env, default = Function lama", () => {
    expect(withdrawalPolicyFromEnv({} as NodeJS.ProcessEnv)).toEqual({
      minimum: 50000, advancedGuards: false, kycThreshold: 5000000, perDayLimit: 3, coolingDays: 3,
    });
    expect(withdrawalPolicyFromEnv({ MINIMUM_WITHDRAW: "75000", WITHDRAWAL_ADVANCED_GUARDS_ENABLED: "TRUE" } as unknown as NodeJS.ProcessEnv))
      .toMatchObject({ minimum: 75000, advancedGuards: true });
  });

  it("memanggil RPC dengan userId sesi + kebijakan, mengembalikan WithdrawalReceipt", async () => {
    const db = createFakeSupabase();
    let args: Record<string, unknown> = {};
    db.setRpc("request_withdrawal", (a) => {
      args = a;
      return { withdrawalId: "wd1", amount: 60000, status: "requested", requestedAt: "t", balanceAfter: 140000, transactionId: "tx1", alreadyRequested: false };
    });
    const input = parseRequestWithdrawalBody(body);
    const receipt = await requestWithdrawal({ db: db as never, userId: ME }, input, withdrawalPolicyFromEnv({} as NodeJS.ProcessEnv), "v3.1");
    expect(receipt).toEqual({ withdrawalId: "wd1", amount: 60000, status: "requested", requestedAt: "t", balanceAfter: 140000, transactionId: "tx1" });
    expect(args).toMatchObject({ p_user_id: ME, p_request_key: "key-aaaa-0001", p_amount: 60000, p_provider_name: "BCA", p_tos_version: "v3.1", p_source_origin: null, p_minimum: 50000, p_advanced_guards: false });
  });

  it.each([
    [{ code: "P0001", message: "Saldo tidak mencukupi" }, 409],
    [{ code: "P0001", message: "Batas penarikan harian tercapai (3/hari).", hint: "rate_limited" }, 429],
    [{ code: "42501", message: "Setujui T&C terbaru terlebih dahulu." }, 403],
    [{ code: "22023", message: "Minimum penarikan Rp50.000" }, 400],
    [{ code: "P0002", message: "Wallet tidak ditemukan" }, 404],
  ])("error RPC %o → %i", async (err, status) => {
    const db = createFakeSupabase();
    db.setRpc("request_withdrawal", () => {
      throw Object.assign(new Error(err.message), err);
    });
    const error = await requestWithdrawal({ db: db as never, userId: ME }, parseRequestWithdrawalBody(body)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status, message: err.message });
  });
});
