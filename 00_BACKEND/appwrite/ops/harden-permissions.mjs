// Fase 5 (M-3) — cabut read("users") level koleksi pada tabel yang membocorkan
// baris antar-user.
//
// HANYA tabel yang penulisnya SUDAH memasang permission per-baris.
//
// Gelombang 1 (sudah diterapkan): wallets, payments, users, withdrawals,
// user_files, user_storage_usage.
//
// Gelombang 2 (ditambahkan setelah jalur create-nya diperbaiki): orders,
// messages, conversations, offers. Keempatnya kini memasang row perm saat
// create, dan live masih 0 baris — jadi tidak ada pemilik yang bisa terkunci
// dari datanya sendiri.
//
// Gelombang 3 (2026-07-28, prasyarat Sprint 4 Alur B): deliverables, revisions.
// Row perm revisions dipasang order.service.ts. Create deliverables kini hanya
// lewat submit-ratecard-deliverable agar permission lintas-user dan authorization
// order selalu berasal dari server.
//
// Gelombang 4 (2026-07-28): bucket `user-files`. Bukan tabel — endpoint dan
// bentuk payloadnya berbeda, jadi ditangani blok BUCKET_TARGETS terpisah di
// bawah.
//
// Gelombang 5 (2026-07-29, audit Sprint 8): koleksi Alur A + rate card/profil.
// Semuanya masih punya `update("users")` — lubang yang identik dengan yang
// ditutup gelombang 3 untuk `deliverables`, tapi sisi Campaign Mode terlewat.
// Yang dicabut HANYA `update("users")`; `read("any")` sengaja DIPERTAHANKAN
// karena Job Pool, direktori kreator, dan katalog rate card memang bergantung
// padanya. Kebocoran baca draft campaign adalah pekerjaan terpisah.
//
// Jalankan dengan --dry untuk melihat rencana tanpa menulis.
import { aw, DB } from "./client.mjs";

const DRY = process.argv.includes("--dry");

const TARGETS = [
  {
    id: "wallets",
    permissions: [],
    rowSecurity: true, // saat ini false → row perm diabaikan server
    why: 'saldo semua user terbaca; rowSecurity=false membuat Permission.read per-baris diabaikan',
  },
  {
    id: "payments",
    permissions: [],
    rowSecurity: true,
    why: "snap_token, redirect_url, nominal semua user terbaca",
  },
  {
    id: "users",
    permissions: [],
    rowSecurity: true,
    why: "email & telepon semua user terbaca",
  },
  {
    id: "withdrawals",
    permissions: ['create("users")'],
    rowSecurity: true,
    why: "rekening & nominal penarikan semua user terbaca",
  },
  {
    id: "user_files",
    permissions: [],
    rowSecurity: true,
    why: "daftar berkas semua user terbaca",
  },
  {
    id: "user_storage_usage",
    permissions: [],
    rowSecurity: true,
    why: "kuota & pemakaian semua user terbaca",
  },

  // ── Gelombang 2 ────────────────────────────────────────────────────────
  {
    id: "conversations",
    permissions: ['create("users")'],
    rowSecurity: true,
    why: "daftar lawan bicara semua user terbaca; row perm dipasang chat.service.ts:123",
  },
  {
    id: "messages",
    permissions: ['create("users")'],
    rowSecurity: true,
    why: "SELURUH isi chat semua user terbaca; row perm dipasang chat.service.ts:160",
  },
  {
    id: "offers",
    permissions: ['create("users")'],
    rowSecurity: true,
    why: "nilai & isi penawaran semua user terbaca; row perm dipasang offer.service.ts:147",
  },
  {
    id: "orders",
    // Tidak ada create("users"): baris orders hanya dibuat Function create-order,
    // tidak pernah dari browser.
    permissions: [],
    rowSecurity: true,
    why: "nominal & pihak order semua user terbaca; row perm dipasang create-order:32",
  },

  // ── Gelombang 3 ────────────────────────────────────────────────────────
  {
    id: "deliverables",
    permissions: [],
    rowSecurity: true,
    why:
      'create/update("users") melewati trusted submit dan bisa memalsukan status/order; ' +
      "row perm dipasang submit-ratecard-deliverable, approval tetap hanya UMKM order",
  },
  {
    id: "revisions",
    permissions: [],
    rowSecurity: true,
    why: "browser create/update ditutup; row read permission dipasang request-ratecard-revision untuk kedua participant",
  },

  // ── Gelombang 5 ────────────────────────────────────────────────────────
  //
  // read("any") DIPERTAHANKAN di semua entri di bawah — itu memang kontraknya
  // (Job Pool, direktori kreator, katalog rate card publik). Yang dicabut hanya
  // update("users").
  {
    id: "campaign_submissions",
    permissions: ['read("any")', 'create("users")'],
    rowSecurity: true,
    why:
      'update("users") = SIAPA PUN yang login bisa menulis status:"approved" + views besar ke submission siapa pun, ' +
      "dan update itulah yang memicu calculate-campaign-reward menambah pendingBalance kreator lalu bisa ditarik. " +
      "Kembaran persis lubang deliverables gelombang 3; row perm dipasang creator-appwrite.service.ts:submitProof",
  },
  {
    id: "campaigns",
    permissions: ['create("users")'],
    rowSecurity: true,
    why:
      'update("users") = siapa pun bisa menulis status:"active" + remainingBudget ke campaign siapa pun, ' +
      "melewati Midtrans, create-escrow, dan guard remainingBudget>0 di publishCampaign sekaligus. " +
      "Row perm read(owner)/update+delete(owner) dipasang umkm-appwrite.service.ts:createCampaignDraft",
  },
  {
    id: "campaign_claims",
    permissions: ['read("any")', 'create("users")'],
    rowSecurity: true,
    why:
      'update("users") = siapa pun bisa mengubah status klaim siapa pun (mis. membebaskan kuota atau ' +
      "menandai klaim orang lain expired); row perm kreator+UMKM dipasang creator-appwrite.service.ts:claimCampaign",
  },
  {
    id: "campaign_briefs",
    permissions: ['create("users")'],
    rowSecurity: true,
    why: 'update("users") = siapa pun bisa mengubah brief campaign orang lain setelah kreator mengklaimnya; row perm sama dengan campaigns',
  },
  // Collection brief aktif (migrasi 2026-09-24). Collection lama di atas
  // dipertahankan untuk data legacy; harden ikut menutup v2 agar permission
  // konsisten dengan kontrak campaign_briefs.
  {
    id: "6ab530d00018edb50097",
    permissions: ['create("users")'],
    rowSecurity: true,
    why: 'campaign_briefs_v2 — collection brief aktif runtime; ikut ditutup update("users") seperti campaign_briefs lama',
  },
  {
    id: "campaign_assets",
    permissions: ['create("users")'],
    rowSecurity: true,
    why: 'update("users") = siapa pun bisa mengganti tautan materi campaign orang lain; row perm sama dengan campaigns',
  },
  {
    id: "rate_cards",
    permissions: ['read("any")', 'create("users")'],
    rowSecurity: true,
    why:
      'update("users") = siapa pun bisa menerbitkan/menarik rate card kreator lain, atau mengubah judulnya; ' +
      "row perm dipasang creator-appwrite.service.ts:createCreatorRateCardPackage",
  },
  {
    id: "rate_card_packages",
    permissions: ['read("any")', 'create("users")'],
    rowSecurity: true,
    why: 'update("users") = siapa pun bisa mengubah HARGA paket kreator lain; row perm sama dengan rate_cards',
  },
  {
    id: "creator_profiles",
    permissions: ['read("any")', 'create("users")'],
    rowSecurity: true,
    why:
      'update("users") = siapa pun bisa mengubah profil kreator lain, termasuk menyetel isProfileCompleted ' +
      "(gerbang direktori & klaim campaign); row perm dipasang create-user-profile:publicOwnerPermissions",
  },
  {
    id: "creator_portfolios",
    permissions: ['read("any")', 'create("users")'],
    rowSecurity: true,
    why: 'update("users") = siapa pun bisa mengubah portofolio kreator lain; row perm dipasang creator-appwrite.service.ts:1038',
  },
  {
    id: "creator_social_accounts",
    permissions: ['read("any")', 'create("users")'],
    rowSecurity: true,
    why:
      'update("users") = siapa pun bisa mengganti username TikTok kreator lain, dan username itulah yang ' +
      "ditampilkan get-creator-directory ke UMKM; row perm dipasang creator-appwrite.service.ts:988",
  },
  {
    id: "umkm_profiles",
    permissions: ['read("any")', 'create("users")'],
    rowSecurity: true,
    why:
      'update("users") = siapa pun bisa mengubah nama usaha/kategori UMKM lain, atau menyetel isProfileCompleted-nya; ' +
      "row perm dipasang create-user-profile:publicOwnerPermissions",
  },
];

/**
 * Bucket storage. Dipisah dari TARGETS karena endpointnya `/storage/buckets/{id}`
 * dan payload PUT-nya butuh `fileSecurity` + `enabled`, bukan `rowSecurity`.
 */
const BUCKET_TARGETS = [
  {
    id: "user-files",
    permissions: ['create("users")'],
    fileSecurity: true,
    why:
      'read("users") level bucket = SIAPA PUN yang login bisa mengunduh berkas siapa pun, ' +
      "termasuk deliverable order orang lain; permission per-berkas dipasang validate-and-upload:44",
  },
];

for (const t of TARGETS) {
  const live = await aw(`/tablesdb/${DB}/tables/${t.id}`);
  const before = `perms=${JSON.stringify(live.$permissions)} rowSecurity=${live.rowSecurity}`;
  const after = `perms=${JSON.stringify(t.permissions)} rowSecurity=${t.rowSecurity}`;

  if (
    JSON.stringify(live.$permissions) === JSON.stringify(t.permissions) &&
    live.rowSecurity === t.rowSecurity
  ) {
    console.log(`SKIP ${t.id.padEnd(20)} sudah sesuai`);
    continue;
  }

  if (DRY) {
    console.log(`WOULD ${t.id.padEnd(20)} ${before}  ->  ${after}\n      alasan: ${t.why}`);
    continue;
  }

  try {
    const r = await aw(`/tablesdb/${DB}/tables/${t.id}`, {
      method: "PUT",
      body: {
        name: live.name,
        permissions: t.permissions,
        rowSecurity: t.rowSecurity,
        enabled: live.enabled,
      },
    });
    console.log(
      `OK   ${t.id.padEnd(20)} perms=${JSON.stringify(r.$permissions)} rowSecurity=${r.rowSecurity}`
    );
  } catch (e) {
    console.log(`ERR  ${t.id.padEnd(20)} ${e.message.slice(0, 300)}`);
  }
}

for (const t of BUCKET_TARGETS) {
  // Bucket bisa saja belum ada di live sekalipun dideklarasikan config — persis
  // kasus `user-files` (2026-07-29). Dulu 404-nya melempar dan mematikan seluruh
  // script SETELAH blok tabel selesai menulis, jadi keluarannya stacktrace dan
  // bukan laporan. Laporkan lalu lanjut; pembuatannya urusan ensure-buckets.mjs.
  let live;
  try {
    live = await aw(`/storage/buckets/${t.id}`);
  } catch (e) {
    if (String(e.message).startsWith("404")) {
      console.log(`MISS bucket:${t.id.padEnd(13)} belum ada di live — jalankan 'node appwrite/ops/ensure-buckets.mjs' dulu`);
      continue;
    }
    throw e;
  }

  const before = `perms=${JSON.stringify(live.$permissions)} fileSecurity=${live.fileSecurity}`;
  const after = `perms=${JSON.stringify(t.permissions)} fileSecurity=${t.fileSecurity}`;

  if (
    JSON.stringify(live.$permissions) === JSON.stringify(t.permissions) &&
    live.fileSecurity === t.fileSecurity
  ) {
    console.log(`SKIP bucket:${t.id.padEnd(13)} sudah sesuai`);
    continue;
  }

  if (DRY) {
    console.log(`WOULD bucket:${t.id.padEnd(13)} ${before}  ->  ${after}
      alasan: ${t.why}`);
    continue;
  }

  try {
    // PUT bersifat replace — field yang tidak dikirim akan di-reset ke default.
    // Karena itu seluruh setelan bucket dibawa ulang dari live apa adanya,
    // kecuali dua yang memang sedang diubah. Pelajaran yang sama dengan
    // insiden `appwrite push functions` 2026-07-27.
    const r = await aw(`/storage/buckets/${t.id}`, {
      method: "PUT",
      body: {
        name: live.name,
        permissions: t.permissions,
        fileSecurity: t.fileSecurity,
        enabled: live.enabled,
        maximumFileSize: live.maximumFileSize,
        allowedFileExtensions: live.allowedFileExtensions,
        compression: live.compression,
        encryption: live.encryption,
        antivirus: live.antivirus,
      },
    });
    console.log(
      `OK   bucket:${t.id.padEnd(13)} perms=${JSON.stringify(r.$permissions)} fileSecurity=${r.fileSecurity}`
    );
  } catch (e) {
    console.log(`ERR  bucket:${t.id.padEnd(13)} ${e.message.slice(0, 300)}`);
  }
}
