# Fase 11 — Bersih-bersih

**Bobot:** S. Dikerjakan setelah cutover stabil selama 7 hari.

## Task

### Kode
- [ ] Hapus dependency `appwrite` dari `package.json` di root dan `admin/`.
- [ ] Hapus `src/lib/appwrite/` dan `admin/src/lib/admin/appwrite.ts`.
- [ ] Hapus `execute-function.ts` versi Appwrite.
- [ ] Hapus mock `@/lib/appwrite/*` di test.
- [ ] Ganti nama file service `*-appwrite.service.ts` menjadi `*-supabase.service.ts`, atau langsung pakai nama domain.
- [ ] Hapus `NEXT_PUBLIC_APPWRITE_*` dari `.env.example`, Netlify, dan `next.config.ts` (`remotePatterns`).

### Backend lama
Setelah 30 hari, hapus dari `main`; history git tetap menyimpannya.
- [ ] `00_BACKEND/functions/`
- [ ] `00_BACKEND/appwrite*.json`
- [ ] `00_BACKEND/appwrite/`
- [ ] `00_BACKEND/scripts/`

### Dokumentasi & agent
- [ ] `AGENTS.md`
- [ ] `00_BACKEND/AGENTS.md` dan `00_BACKEND/CLAUDE.md`
- [ ] `.claude/agents/marketiv*.md`: `marketiv-appwrite` menjadi `marketiv-supabase`. Perbarui juga deskripsi `marketiv`, `marketiv-backend`, `marketiv-debug`, `marketiv-feature`.
- [ ] `.codex/agents/*.toml`
- [ ] Skill `.claude/skills/marketiv-appwrite-integration` dan `marketiv-cloud-functions` menjadi panduan Supabase + Route Handler. Perbarui juga mirror-nya di `.agents/`.
- [ ] `.agents/rules/appwrite-standards.md` menjadi `supabase-standards.md`.
- [ ] `docs/marketiv-md/database/*` dan `docs/marketiv-md/technical-guidelines/04-appwrite-backend-standards.md`.

### Operasional
- [ ] Hapus project Appwrite setelah 30 hari read-only. Ambil export arsip terakhir sebelum dihapus.
- [ ] Hapus dump migrasi yang berisi PII.
- [ ] Jalankan `get_advisors` lagi dan tambahkan index yang disarankan.
- [ ] Pastikan backup harian dan PITR aktif di Supabase prod.

## Verifikasi
- `grep -ri appwrite src admin/src` tidak menemukan apa pun.
- Lint, typecheck, test, dan build lulus.
