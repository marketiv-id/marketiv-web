# Working Glossary (id-ID) - Resolved

**Status: LOCKED.** The product owner approved the recommended defaults, so every row below is final. Do not invent alternatives.

Source of truth: `requirements.md` (Terminology Contract). Evidence: `docs/audits/language-baseline-glossary.md`.

## 1. Resolved decisions

| Code | Term | Final label |
|---|---|---|
| D1 | rate card | **Paket Harga** (route slug `/rate-card` unchanged) |
| D2 | job pool | **Lowongan**; page title **Lowongan Kampanye** |
| D3 | escrow | **Dana Aman**; first use on a screen adds the short gloss `dana ditahan sementara` |
| D4 | brief | **Arahan** |
| D5 | collab post | **Postingan Kolaborasi** |
| D6 | PPV / CPM | **Bayar per Tayangan** / **Tarif per 1.000 Tayangan**; the acronym may stay inside a tooltip |
| D7 | dashboard | keep **Dashboard** (eyebrows: `DASHBOARD KREATOR`, `DASHBOARD UMKM`) |
| D8 | draft | **Draf** (never `Konsep` for a status; `Konsep` is only the user-authored campaign concept) |
| D9 | review | **Tinjauan Pekerjaan** (nav + page title), verb **Tinjau** |

## 2. Term to label map

Use the left column only if it appears in a rendered string. Never rename code identifiers, prop names, route slugs, or state values.

| English / raw | Indonesian label |
|---|---|
| creator | Kreator |
| campaign | Kampanye |
| Campaign Mode | Mode Kampanye |
| Rate Card Mode | Mode Paket Harga |
| job (open) | Lowongan |
| job (claimed) | Pekerjaan |
| views | Tayangan |
| follower | Pengikut |
| reach | Jangkauan |
| engagement | Tingkat Keterlibatan |
| deadline | Batas Waktu |
| submit (verb) | Kirim |
| submission (act) | Pengiriman |
| submission (artifact) | Bukti Konten |
| deliverable | Hasil Kerja |
| review (noun) | Tinjauan |
| review (verb) | Tinjau |
| validation | Validasi |
| order | Pesanan |
| pending | Menunggu |
| draft | Draf |
| approve | Setujui |
| reject | Tolak |
| revision | Revisi |
| scope | Lingkup |
| niche | Kategori |
| brand | Merek |
| slot | Kuota |
| inbox | Kotak Masuk |
| insight | Wawasan |
| timeline | Riwayat |
| read-only | Hanya Baca |
| settings | Pengaturan |
| overview (nav home) | Ringkasan |
| profile | Profil |
| notification | Notifikasi |
| password | Kata Sandi |
| username | Nama Pengguna |
| thumbnail | Gambar Mini |
| wallet (balance) | Saldo |
| wallet (container) | Dompet |
| top-up | Isi Saldo |
| withdrawal (noun) | Penarikan |
| withdrawal (CTA) | Tarik Dana |
| payout / escrow release | Pencairan |
| refund | Pengembalian Dana |
| platform fee | Komisi Platform |
| transaction | Transaksi |
| fraud | Kecurangan |
| dispute | Sengketa |
| auto-approve | Setujui Otomatis |
| KYC | Verifikasi Identitas |
| footage | Rekaman |
| custom offer | Penawaran Khusus |
| marketplace | Toko |
| newsletter | Buletin |
| support | Bantuan |
| standard tier | Standar |
| bundle tier | Gabungan |
| exposure tier | Jangkauan |
| wizard | (drop the word entirely) |
| dashboard eyebrow | DASHBOARD KREATOR / DASHBOARD UMKM |
| CSV export | Ekspor CSV |

Keep untranslated (proper nouns): `Marketiv`, `TikTok`, `Instagram`, `Reels`, `P2MW`, `CSV`, `QRIS`, `Virtual Account`.

## 3. Status labels

Never hand-write a status string. Import from `@/lib/dashboard-labels`:

```ts
import {
  getCampaignStatusLabel, getClaimStatusLabel, getDeliverableStatusLabel,
  getEscrowStatusLabel, getFraudStatusLabel, getOfferStatusLabel,
  getOrderStatusLabel, getRateCardStatusLabel, getSubmissionStatusLabel,
  getTransactionStatusLabel, getTransactionTypeLabel, getValidationStatusLabel,
  getWithdrawalStatusLabel, resolveStatusLabel, resolveTransactionStatusLabel,
  UNKNOWN_STATUS_LABEL,
} from "@/lib/dashboard-labels";
```

If a screen currently renders `status.replaceAll("_", " ")`, a raw `status` variable, or its own local `Record<string, string>` label map, replace it with the shared function. Colour classes may stay local.

## 4. Copy rules

1. Formal address only: `Anda`. `kamu` must not appear anywhere. It currently appears 26 times.
2. Microcopy shape: state the situation, then the next action. Example: `Bukti tayang belum diunggah. Unggah tautan TikTok atau Instagram Reels.`
3. Casing: nav items, headings, badges, buttons use Title Case. Body and helper text use sentence case.
4. Source strings for badges are Title Case Indonesian. Do not rely on a CSS `capitalize` class to fix a lowercase enum. Uppercase visual styling via CSS `uppercase` is allowed, but the underlying string must already read correctly.
5. Numbers and money come only from `@/lib/formatters`: `formatCurrency`, `formatRupiahInput`, `formatCompactCurrency`, `formatCompactNumber`, `formatCompactViews`, `formatDate`, `formatRelativeTime`. Unit words around a number are copy: `1.000 tayangan`, never `1K views`.
6. Missing data renders `—`, never `0`.
7. No fabricated counts, no `ratusan`/`ribuan`, no viral or guaranteed earning promises.
8. No em dash in new copy. Use a period, comma, colon, or parentheses.
9. No chat or contact affordances: Campaign Mode forbids them.
10. Keep the Indonesian gloss for money-safety and package terms on first use per screen.

## 5. Hard scope limits

- Copy only. Do not change logic, props, state shape, routes, file names, or data keys.
- Do not touch `src/types/**`, `src/services/**`, `00_BACKEND/**`, `admin/**`.
- Do not add an i18n layer.
- Do not edit `.kiro/specs/**` or `docs/**` (the parent agent owns those).
- Leave a string alone if it is inside a code identifier, a test fixture value, or a route slug.
- When a `metadata.title` is added, use: `{Page Name} | Dashboard {Role} | Marketiv`.

## 6. Definition of done for a copy task

- `npx tsc --noEmit` reports zero errors after your edits.
- No new ESLint errors: `npx eslint src` must stay at 4 errors / 48 warnings.
- `grep -rn "kamu" <your files>` returns nothing.
- `grep -rn "replaceAll(\"_\"" <your files>` returns nothing.
- No English sentence, imperative, or label left in the strings you own.
