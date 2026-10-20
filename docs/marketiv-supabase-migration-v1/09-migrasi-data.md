# Fase 9 — Tooling migrasi data & gladi resik

**Bobot:** L

## Tujuan
- Skrip migrasi data, user, dan file yang bisa diulang (idempoten).
- Rekonsiliasi otomatis yang menghasilkan go/no-go.
- Bukti dari minimal dua kali gladi resik.

## Skrip (`scripts/migration/`)
1. [ ] `export-appwrite.ts`: semua tabel ke `out/<table>.jsonl`, plus manifest berisi jumlah baris. Dari Fase 2, dimatangkan di sini.
2. [ ] `export-storage.ts`: unduh semua file per bucket beserta metadata (owner dari `$permissions`, mime, size).
3. [ ] `import-users.ts`:
   - Buat `auth.users` lewat Admin API. Isi: email, `email_confirm` sesuai `emailVerification`, hash password sesuai hasil Spike 1, dan `app_metadata.role`.
   - Isi `legacy_user_map(legacy_id → uuid)`.
   - Idempoten: user yang sudah ada dilewati.
4. [ ] `transform-load.ts`:
   - Ganti semua kolom user ID lewat `legacy_user_map`. Daftar kolomnya: `userId`, `umkmId`, `creatorId`, `umkm_id`, `creator_id`, `sender_id`, `user_id`, `requestedBy`, `reviewedBy`, `processed_by`, `ownerUserId`.
   - Ubah nama kolom ke snake_case. Parse JSON-string ke `jsonb`. Ubah `deadline` ke `timestamptz`. Salin `$createdAt`/`$updatedAt` ke `created_at`/`updated_at`.
   - Gabung `campaign_briefs` + v2 (v2 menang bila `campaignId` sama).
   - Load sesuai urutan dependensi:

     | Tahap | Tabel |
     |---|---|
     | 0 | `auth.users` + `legacy_user_map` |
     | 1 | `users`, profil, `wallets`, `rate_cards`, `campaigns`, … |
     | 2 | `user_files`, `rate_card_packages`, `briefs`, `assets`, `claims`, `conversations` (`offer_id` = null) |
     | 3 | `offers`, `messages`, lalu backfill `conversations.offer_id` |
     | 4 | `submissions`, `orders` |
     | 5 | `fraud_checks`, `payments`, `escrows`, `deliverables`, `revisions` |
     | 6 | `validations`, `withdrawals`, `transactions` |

   - Pakai `COPY` atau batch insert. Baris yatim masuk tabel `migration_rejects` dan **tidak** dibuang diam-diam.
5. [ ] `copy-storage.ts`:
   - Upload ulang ke `{bucket}/{new_user_id}/{legacy_file_id}.{ext}`.
   - Tulis ulang kolom URL yang cocok dengan pola `…/storage/buckets/{b}/files/{id}/view?project=…` ke URL publik Supabase atau ke referensi path untuk file privat. Kolomnya: `logo_url`, `avatar_url`, `banner_url`, `thumbnail_url`, `file_url`, `evidence_url_snapshot`.
   - Pindahkan file privat yang nyasar di `campaign-assets` ke bucket privat.
6. [ ] `reconcile.ts` menghasilkan laporan `out/reconcile-<timestamp>.md`:
   - Jumlah baris per tabel (sumber vs target − rejects).
   - Total dan per-user `wallets.balance`.
   - Total escrow `held`.
   - Jumlah dan total payment `paid`.
   - Withdrawal `requested`/`processing`.
   - Jumlah file per bucket.
   - Semua URL di DB bisa di-resolve (HEAD 200).
   - **Satu selisih saja = NO-GO.**

## Gladi resik
- [ ] Gladi 1 di Supabase staging dengan salinan data prod terbaru. Catat durasi tiap skrip.
- [ ] Perbaiki temuan, lalu gladi 2 dari kondisi kosong (`supabase db reset` di staging).
- [ ] QA penuh di preview staging, termasuk login memakai akun hasil migrasi dengan password lama (atau alur reset paksa bila memakai rencana B).
- [ ] Tetapkan durasi jendela maintenance = durasi gladi × 1,5.
- [ ] Tulis runbook cutover final di `10-cutover.md`, berisi perintah persis dan siapa melakukan apa.

## Catatan keamanan data
- Dump hasil export berisi PII dan hash password. Simpan terenkripsi, jangan di-commit, dan hapus setelah cutover + 30 hari.
- API key Appwrite dan service role Supabase hanya ada di mesin operator saat migrasi berjalan.
