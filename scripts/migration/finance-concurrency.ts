/**
 * Uji konkurensi RPC uang Fase 8 terhadap Postgres LOKAL.
 *
 * Menembak `release_escrow` dan `credit_campaign_reward` masing-masing 20×
 * PARALEL dari 20 koneksi berbeda (pool), lalu memastikan:
 *   - hanya SATU kredit per escrow / submission (ledger + saldo),
 *   - semua panggilan selesai tanpa error (pemenang kredit, sisanya no-op),
 *   - `finance_reconciliation` 0 selisih untuk akun uji.
 * Data uji dibuat dan dihapus oleh skrip ini.
 *
 * Pakai (stack lokal hidup, migration 0025–0026 sudah diterapkan):
 *   cd scripts/migration && node finance-concurrency.ts
 * Env opsional: DATABASE_URL (default postgresql://postgres:postgres@127.0.0.1:54322/postgres).
 * Menolak jalan bila host bukan localhost/127.0.0.1.
 */
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const host = new URL(DATABASE_URL).hostname;
if (host !== "127.0.0.1" && host !== "localhost") {
  console.error(`✖ Hanya untuk DB lokal (host: ${host}).`);
  process.exit(1);
}

const PARALLEL = 20;
const UMKM = "00000000-0000-0000-0000-00000000cc01";
const CREATOR = "00000000-0000-0000-0000-00000000cc02";
const ADMIN = "00000000-0000-0000-0000-00000000cc03";

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: PARALLEL });

async function seed(): Promise<void> {
  await pool.query(`
    insert into auth.users (id, email) values
      ('${UMKM}', 'cc-umkm@example.test'), ('${CREATOR}', 'cc-creator@example.test'), ('${ADMIN}', 'cc-admin@example.test');
    insert into public.users (id, role, status, email) values
      ('${UMKM}', 'umkm', 'active', 'cc-umkm@example.test'),
      ('${CREATOR}', 'creator', 'active', 'cc-creator@example.test'),
      ('${ADMIN}', 'admin', 'active', 'cc-admin@example.test');
    insert into public.wallets (user_id) values ('${UMKM}'), ('${CREATOR}');
    insert into public.orders (id, umkm_id, creator_id, amount, status)
      values ('cc-order', '${UMKM}', '${CREATOR}', 100000, 'in_progress');
    insert into public.escrows (id, order_id, amount, status, fee_rate) values ('cc-escrow', 'cc-order', 100000, 'held', 0.02);
    insert into public.deliverables (id, order_id, source, file_url, version, status)
      values ('cc-deliv', 'cc-order', 'external_url', 'https://cc.test/1', 1, 'approved');
    insert into public.ratecard_deliverable_validations
      (deliverable_id, order_id, deliverable_version, source_snapshot, evidence_url_snapshot, status, reviewed_by)
      values ('cc-deliv', 'cc-order', 1, 'external_url', 'https://cc.test/1', 'valid', '${ADMIN}');
    insert into public.campaigns (id, umkm_id, title, category, type, platforms, budget, reward_per_1000_views, claim_limit, status, remaining_budget)
      values ('cc-camp', '${UMKM}', 'CC', 'kuliner', 'ugc', array['tiktok'], 100000, 5000, 5, 'active', 100000);
    insert into public.campaign_claims (id, campaign_id, creator_id, status) values ('cc-claim', 'cc-camp', '${CREATOR}', 'approved');
    insert into public.campaign_submissions (id, claim_id, campaign_id, creator_id, platform, post_url, status, views_count, views_final)
      values ('cc-sub', 'cc-claim', 'cc-camp', '${CREATOR}', 'tiktok', 'https://t.test/cc', 'approved', 4000, true);
  `);
}

async function cleanup(): Promise<void> {
  await pool.query(`
    delete from public.notifications where user_id in ('${UMKM}', '${CREATOR}', '${ADMIN}');
    delete from public.transactions where user_id in ('${UMKM}', '${CREATOR}');
    delete from public.campaign_submissions where id = 'cc-sub';
    delete from public.campaign_claims where id = 'cc-claim';
    delete from public.campaigns where id = 'cc-camp';
    delete from public.ratecard_deliverable_validations where deliverable_id = 'cc-deliv';
    delete from public.deliverables where id = 'cc-deliv';
    delete from public.escrows where id = 'cc-escrow';
    delete from public.orders where id = 'cc-order';
    delete from public.wallets where user_id in ('${UMKM}', '${CREATOR}');
    delete from public.users where id in ('${UMKM}', '${CREATOR}', '${ADMIN}');
    delete from auth.users where id in ('${UMKM}', '${CREATOR}', '${ADMIN}');
  `);
}

async function fire(sql: string, arg: string): Promise<{ ok: number; errors: string[]; statuses: Record<string, number> }> {
  const clients = await Promise.all(Array.from({ length: PARALLEL }, () => pool.connect()));
  const statuses: Record<string, number> = {};
  const errors: string[] = [];
  let ok = 0;
  try {
    // Semua koneksi siap dulu, baru ditembak bersamaan.
    const results = await Promise.allSettled(clients.map((c) => c.query(sql, [arg])));
    for (const r of results) {
      if (r.status === "fulfilled") {
        ok += 1;
        const status = String((r.value.rows[0]?.result as { status?: string } | undefined)?.status ?? "?");
        statuses[status] = (statuses[status] ?? 0) + 1;
      } else {
        errors.push(String((r.reason as Error).message));
      }
    }
  } finally {
    for (const c of clients) c.release();
  }
  return { ok, errors, statuses };
}

let failed = 0;
function check(name: string, cond: boolean, detail: unknown = ""): void {
  console.log(`${cond ? "✔" : "✖"} ${name}${cond ? "" : ` — ${JSON.stringify(detail)}`}`);
  if (!cond) failed += 1;
}

async function main(): Promise<void> {
  await cleanup();
  await seed();
  try {
    const rel = await fire("select public.release_escrow($1) as result", "cc-order");
    check(`release_escrow ${PARALLEL}× paralel: semua selesai tanpa error`, rel.ok === PARALLEL, rel.errors);
    check("tepat satu 'released', sisanya 'already_released'", rel.statuses.released === 1 && rel.statuses.already_released === PARALLEL - 1, rel.statuses);

    const rew = await fire("select public.credit_campaign_reward($1) as result", "cc-sub");
    check(`credit_campaign_reward ${PARALLEL}× paralel: semua selesai tanpa error`, rew.ok === PARALLEL, rew.errors);
    check("tepat satu 'credited', sisanya 'already_credited'", rew.statuses.credited === 1 && rew.statuses.already_credited === PARALLEL - 1, rew.statuses);

    const { rows: ledger } = await pool.query(
      `select type, reference_id, count(*)::int as n, sum(amount)::bigint as total
         from public.transactions where user_id = $1 group by 1, 2 order by 1, 2`,
      [CREATOR],
    );
    check("ledger: satu release escrow, satu fee, satu release reward", ledger.length === 3 && ledger.every((r) => r.n === 1), ledger);

    const { rows: [wallet] } = await pool.query("select balance::bigint as balance from public.wallets where user_id = $1", [CREATOR]);
    // 100000 − floor(2%) = 98000; reward = floor(4000/1000 × 5000) = 20000.
    check("saldo kreator = 98000 + 20000", Number(wallet.balance) === 118000, wallet);

    const { rows: [camp] } = await pool.query("select remaining_budget::bigint as r, spent_amount::bigint as s from public.campaigns where id = 'cc-camp'");
    check("budget campaign dikurangi sekali", Number(camp.r) === 80000 && Number(camp.s) === 20000, camp);

    const { rows: recon } = await pool.query(
      "select user_id, diff from public.finance_reconciliation where user_id in ($1, $2) and diff <> 0",
      [UMKM, CREATOR],
    );
    check("finance_reconciliation 0 selisih", recon.length === 0, recon);
  } finally {
    await cleanup();
    await pool.end();
  }
  console.log(failed ? `\n${failed} cek GAGAL` : "\nSemua cek konkurensi lulus.");
  if (failed) process.exit(1);
}

await main();
