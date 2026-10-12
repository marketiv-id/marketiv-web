# 01_Global — Index

Standar global lintas-modul untuk Marketiv (platform UMKM ↔ Content Creator untuk promosi digital: Campaign PPV & Rate Card/Order dengan Escrow, di atas Appwrite + Next.js). Dokumen di sini adalah pemilik tunggal (single owner) untuk istilah, konvensi, struktur, keamanan, dan design token. Modul tidak boleh menduplikasi isinya — cukup cross-link.

## Daftar Dokumen

- [`10_Glossary.md`](10_Glossary.md) — Definisi istilah inti domain (UMKM, Creator, Admin, Campaign, Escrow, Validasi Deliverable, Appeal, KYC, dll), satu baris per istilah.
- [`20_Coding_Standards.md`](20_Coding_Standards.md) — Standar coding: service layer (facade + `*-appwrite.service.ts`, `ServiceResult`), `executeFunction`, Zod, standar kode Appwrite Function (guard, idempotensi, atomik).
- [`30_Naming_Convention.md`](30_Naming_Convention.md) — Konvensi penamaan tabel, kolom (termasuk pengecualian snake_case), file/komponen, route Next.js, Appwrite Function, env var.
- [`40_Folder_Structure.md`](40_Folder_Structure.md) — Pemilik struktur folder: repo, frontend `src/`, admin `admin/`, backend `00_BACKEND/` (`functions/`, `appwrite/`, `tests/`), 8 storage bucket, env vars.
- [`50_Security_Guidelines.md`](50_Security_Guidelines.md) — Pemilik permission: role guard & status akun, permission level tabel (config), pola permission baris, storage, scope API key dinamis per Function, risiko terbuka.
- [`60_Error_Handling.md`](60_Error_Handling.md) — Konvensi respons error Function (`{ error }` + HTTP status), `executeFunction`, `ServiceResult`/`ServiceErrorCode`, penyajian di UI.
- [`70_Testing_Strategy.md`](70_Testing_Strategy.md) — Strategi testing: Vitest (backend & frontend), Playwright, `node:test` per Function, perintah, CI, fokus per layer.
- [`80_Deployment.md`](80_Deployment.md) — Deployment: Frontend & Admin → Appwrite Sites, Backend → Appwrite Cloud, config kanonis, deploy/sync Function (`appwrite/ops`), env vars Function.
- [`90_Design_System.md`](90_Design_System.md) — Pemilik design token (Tailwind 4 `@theme` di `src/app/globals.css`): warna, tipografi, radius, shadow, inventaris komponen, layout dashboard.
