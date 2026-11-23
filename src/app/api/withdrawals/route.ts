import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, readJsonBody } from "@/server/http";
import { parseRequestWithdrawalBody, requestWithdrawal } from "@/server/withdrawals/request-withdrawal";

export const dynamic = "force-dynamic";

/**
 * POST /api/withdrawals — ajukan penarikan saldo (port `request-withdrawal`).
 * Body `{ amount, payoutMethod, providerName, accountNumber, accountName,
 * requestKey, sourceOrigin? }` → `WithdrawalReceipt`. Kreator; UMKM hanya
 * dengan `sourceOrigin` umkm_refund/umkm_budget (dicek di RPC). Status akun,
 * ToS, saldo, idempotensi, dan limit dicek di RPC `request_withdrawal`.
 */
export const POST = apiRoute("withdrawals.request", async (request) => {
  const { user } = await requireUser({
    role: ["creator", "umkm"],
    allowInactive: true, // status nonaktif dijawab RPC dengan pesan lama (403)
    messages: { wrongRole: "Hanya kreator yang dapat menarik saldo." },
  });
  const input = parseRequestWithdrawalBody(await readJsonBody(request));
  return requestWithdrawal({ db: createAdminClient(), userId: user.id }, input);
});
