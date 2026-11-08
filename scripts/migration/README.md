# Tooling migrasi Appwrite → Supabase

Paket terisolasi (tidak memengaruhi `package.json` root). Butuh Node ≥ 22.18 karena file `.ts` dijalankan langsung dengan type stripping bawaan Node.

```bash
cd scripts/migration && npm ci
```

Di sesi cloud yang memakai proxy, tambahkan `NODE_USE_ENV_PROXY=1` di depan perintah yang memanggil jaringan.

| File | Fungsi |
|---|---|
| `export-appwrite.ts` | Export semua tabel Appwrite + akun Auth ke JSONL (read-only, paginasi cursor). |
| `load-staging.ts` | Muat hasil export ke Supabase lokal/staging, hitung baris yang ditolak beserta alasannya. |
| `mapping.ts` | Peta tabel/kolom Appwrite → Postgres (dipakai loader, nanti Fase 9). |
| `make-fixture.ts` | Fixture sintetis berbentuk export Appwrite (tanpa PII) untuk uji skema + loader. |

Folder `.data/` di-.gitignore. Hasil export berisi PII dan hash password: jangan di-commit atau dibagikan.

## Export

```bash
node export-appwrite.ts --target staging
```

```bash
node export-appwrite.ts --target prod --no-auth
```

Target wajib eksplisit, karena default repo (`appwrite.config.json`, `00_BACKEND/appwrite/ops/client.mjs`) menunjuk project staging. Env per target ada di komentar kepala skrip.

## Muat ke Supabase

Lokal (setelah `supabase start` + `supabase db reset` di root repo):

```bash
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY dari `supabase status -o json`> node load-staging.ts --target local --dir .data/<folder-export>
```

Staging (butuh konfirmasi ref project):

```bash
node load-staging.ts --target staging --confirm-ref <ref> --dir .data/<folder-export>
```

- Idempoten: aman dijalankan ulang (upsert per `id`; akun Auth dipetakan ulang lewat `legacy_user_map`).
- `--with-passwords` mengimpor hash Argon2 sehingga user bisa login dengan password lama.
- Laporan: `<folder-export>/load-report-<target>-<waktu>.json`. Exit code 1 bila ada baris yang ditolak karena FK.

## Uji tanpa Appwrite

```bash
node make-fixture.ts --out .data/fixture-clean
```

```bash
node make-fixture.ts --out .data/fixture-anomali --anomalies
```

Fixture bersih harus termuat 100%. Fixture anomali menulis `expected.json` berisi baris rusak dan alasan penolakan yang diharapkan.
