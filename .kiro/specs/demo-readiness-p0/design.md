# 🧩 DESIGN — Demo Readiness P0

> Pendamping `bugfix.md`. Isi: keputusan teknis per komponen, state flow sebelum/sesudah,
> inventaris berkas yang boleh berubah, strategi tes, dan rencana rollback.
>
> **Prinsip yang dipegang di seluruh perubahan**: tidak menambah fitur baru. Setiap tombol
> diperbaiki menjadi punya perilaku nyata ATAU dihapus; tidak ada tombol yang dibiarkan mati.
> Setiap keputusan visual diberi alasan satu baris.

---

## 1. Klaster A — Kontrol mati & navigasi salah

| ID | Before | After | Alasan satu baris |
|---|---|---|---|
| 1.1 | `onViewEscrow={() => showToast("Membuka rekam transaksi escrow...")}` | `onViewEscrow={() => router.push(routes.umkmFinance)}` | Riwayat transaksi memang tinggal di halaman keuangan; toast tidak membawa user ke mana pun |
| 1.2 | `href="/dashboard/kreator/job-pool"` | `href={routes.kreatorJobDetail(job.id)}` | Kartu merekomendasikan satu job tertentu, jadi tujuan harus job itu |
| 1.3 | `<button>` tanpa handler | Handler share + `aria-label` | Tombol tanpa perilaku adalah defek, bukan dekorasi |
| 1.4 | `<button>` "Urutkan dari" tanpa handler | Dihapus | Tidak ada daftar untuk diurutkan, jadi kontrolnya tidak punya arti |
| 1.5 | `<CreatorBtn disabled onClick={() => {}}>` | Dihapus | Tombol mati lebih buruk daripada tidak ada tombol; keterangan "segera hadir" sudah ada di atasnya |

### 1.1 — Detail design (share, 1.3)

```tsx
const handleShare = async () => {
  const url = `${window.location.origin}${routes.kreatorJobDetail(job.id)}`;
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: job.title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Tautan campaign disalin.");
  } catch {
    // User menutup dialog share → bukan kegagalan yang perlu dilaporkan.
  }
};
```

- `navigator.share` tidak ada di semua desktop → fallback clipboard wajib, bukan opsional.
- `catch` sengaja diam untuk kasus user menutup sheet share (perilaku normal), tetapi tetap tidak
  boleh menelan kegagalan clipboard tanpa jejak: JIKA clipboard gagal THEN tampilkan
  `toast.error("Gagal menyalin tautan.")`.
- Tombol wajib `aria-label="Bagikan campaign"` + `title` karena hanya berisi ikon.

---

## 2. Klaster B — Klaim & teks

| ID | Before | After | Alasan satu baris |
|---|---|---|---|
| 1.6 | `<span>Kreator Terverifikasi</span>` selalu dirender | `{creator.isVerified && (<span>…</span>)}` | Badge verifikasi adalah klaim; klaim palsu merusak kepercayaan |
| 1.7 | `<h4>URL Postingan Terverifikasi</h4>` | `<h4>URL Bukti Tayang</h4>` | Kartu ini menampilkan bukti yang belum tentu valid, jadi judulnya harus netral |
| 1.8 | "…ratusan kreator…", "…ribuan UMKM aktif" | "direktori kreator terverifikasi", "UMKM yang sedang aktif" | Angka skala tanpa sumber tidak boleh tampil |
| 1.9 | "Ratusan kreator aktif terverifikasi" | "Kreator aktif terverifikasi" | Sama seperti 1.8 |

Catatan 1.6: badge berada di dalam banner dengan `position: absolute` (`CreatorProfileHero.tsx:32-36`),
jadi menghilangkannya tidak menggeser layout apa pun.

---

## 3. Klaster C — Ketahanan interaksi

### 3.1 Checkbox aturan klaim (1.10) — before vs after

```
BEFORE                                          AFTER
┌───────────────────────────────┐               ┌───────────────────────────────┐
│ div onClick={() => toggle()}  │               │ label                         │
│  ├ div (kotak visual)         │               │  ├ input type=checkbox sr-only│
│  ├ span judul                 │               │  │   onChange={() => toggle()│
│  └ span deskripsi             │               │  ├ div (kotak visual)         │
└───────────────────────────────┘               │  ├ span judul                 │
  ❌ tidak bisa difokus Tab                      │  └ span deskripsi             │
  ❌ tidak ada peran ke SR                       └───────────────────────────────┘
                                                  ✅ Tab → Space/Enter
                                                  ✅ status terekspos sebagai checkbox
                                                  ✅ focus ring via peer-focus-visible
```

Implementasi:

```tsx
<label
  key={rule.key}
  className={cn(
    "group flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer select-none",
    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500/60 has-[:focus-visible]:ring-offset-2",
    isChecked ? "bg-violet-50/70 border-violet-300 shadow-2xs"
              : "bg-neutral-50/60 border-neutral-200/80 hover:bg-neutral-100/70 hover:border-neutral-300"
  )}
>
  <input
    type="checkbox"
    className="sr-only"
    checked={isChecked}
    onChange={() => toggleRule(rule.key)}
    aria-label={rule.title}
  />
  {/* kotak visual: className identik dengan versi sebelumnya */}
  …
</label>
```

- Memakai `label` + `input` asli, bukan `div role="checkbox"` + handler keyboard manual: semantik
  gratis (Space, Enter, screen reader, dan `:focus-visible`), dan tidak ada perilaku yang perlu
  dipelihara sendiri.
- Kotak visual tetap `div` dekoratif supaya tampilan tidak berubah (invariant 3.5).
- `toggleRule(rule.key)` dipakai apa adanya; tidak ada perubahan kontrak state.

### 3.2 State tombol klaim (1.11)

```
BEFORE: cards ──onClaim(id, title)──▶ setClaimingJobId(id) ──▶ (tombol kartu tetap aktif)
AFTER:  cards ──onClaim(id, title)──▶ setClaimingJobId(id) ──▶ Kartu: isClaiming={claimingJobId === job.id}
                                                              └─ tombol: disabled + "Mengklaim…"
```

- Prop baru `isClaiming: boolean` pada komponen kartu rekomendasi
  (`CreatorDashboardView.tsx`, definisi kartu di sekitar baris 180-313).
- Setelah permintaan selesai (sukses atau gagal) `claimingJobId` dikembalikan ke `null` oleh
  handler yang sudah ada; tombol kembali aktif.
- Alasan: mencegah dua klaim dari satu job yang sama saat user menekan dua kali.

---

## 4. Klaster D — Konsistensi data mock

### 4.1 Chat kreator kosong (1.12)

Tambah satu sumber mock baru di `src/mocks/creator-dashboard.mock.ts`:

```ts
/**
 * Riwayat pesan per conversationId untuk ruang negosiasi SISI KREATOR.
 * Harus konsisten dengan `mockCreatorNegotiations` (brand & lawan bicara yang sama);
 * jangan memakai `mockChatMessages` milik UMKM karena id-nya bertabrakan tetapi
 * isinya milik dunia berbeda.
 */
export const mockCreatorMessages: Record<string, ChatMessage[]> = {
  conv_001: [ /* 3-4 pesan: Batik Cantik Solo ↔ kreator */ ],
  conv_002: [ /* Herbal Glow Indonesia */ ],
  conv_003: [ /* Dapur Sehat Sukabumi */ ],
  conv_004: [ /* Anggun Apparel */ ],
};
```

Wiring di `creator-dashboard.service.ts:201-209`:

```ts
if (DATA_SOURCE_CONFIG.useMockData) {
  await mockDelay(300);
  return { success: true, data: mockCreatorMessages[conversationId] ?? [] };
}
```

- Ruang yang tidak punya pesan tetap mengembalikan `[]` (ruang baru memang kosong) — itu jujur,
  bukan karangan.
- `ChatMessage` yang dipakai sudah tipe bersama (`@/types/umkm-dashboard.types`, lihat impor
  `creator-dashboard.service.ts:9`), jadi tidak ada tipe baru yang perlu dibuat.

### 4.2 `conv_000` untuk kreator yang salah (1.13)

```ts
// BEFORE
const existing = mockNegotiations.find((n) => n.creatorId === creatorId);
return { success: true, data: existing?.conversationId ?? "conv_000" };

// AFTER
const existing = mockNegotiations.find((n) => n.creatorId === creatorId);
if (!existing) {
  return {
    success: false,
    data: null,
    code: "not_found",
    error: "Percakapan demo untuk kreator ini belum tersedia.",
  };
}
return { success: true, data: existing.conversationId };
```

- `StartNegotiationModal.tsx:40-46` sudah menangani `success: false` dengan `toast.error` dan tidak
  menavigasi, jadi tidak ada perubahan di komponen modal.
- Kreator yang punya ruang di mock: `creator_001` … `creator_010`
  (`src/mocks/umkm/negotiations.mock.ts`). Perilaku ini dicatat di ringkasan eksekusi supaya tim
  demo tahu kreator mana yang aman diklik.

### 4.3 KPI Overview bertentangan dengan daftar (1.14)

Helper murni di `src/mocks/umkm/overview.mock.ts`:

```ts
/**
 * KPI Overview diturunkan dari daftar campaign yang sedang dipakai layar, supaya
 * kartu KPI dan daftar campaign tidak saling bertentangan. Nilai yang tidak bisa
 * diturunkan dari daftar (belanja, saldo escrow, tayangan valid, submission pending)
 * tetap konstanta seed dan diberi komentar bahwa itu nilai demo.
 */
export function deriveOverviewKpis(campaigns: Campaign[]): UmkmOverviewData["kpis"] {
  return {
    ...MOCK_SEED_KPIS,                                    // nilai demo yang terdokumentasi
    campaignActive: campaigns.filter((c) => c.status === "active").length,
    campaignCompleted: campaigns.filter((c) => c.status === "completed").length,
    creatorJoined: campaigns.reduce((sum, c) => sum + (c.usedQuota ?? 0), 0),
  };
}
```

Wiring di facade `umkm-dashboard.service.ts:115-122`:

```ts
const store = getDemoStore();
return {
  success: true,
  data: { ...mockUmkmOverview, kpis: deriveOverviewKpis(store.campaigns), campaigns: store.campaigns },
};
```

- Efek tambahan yang diinginkan: ketika user demo membuat campaign baru di booth, KPI ikut berubah
  karena diturunkan saat pembacaan.
- `MOCK_SEED_KPIS` menyimpan `totalSpend`, `escrowBalance`, `viewsValid`, `pendingSubmissions`
  apa adanya + komentar bahwa keempatnya nilai demo, bukan turunan daftar.

### 4.4 Total Kampanye (1.15)

```tsx
// BEFORE
value={String(summary.activeCampaigns + summary.completedCampaigns + (summary.pendingPayments ?? 0))}
note="Semua status"

// AFTER
value={String(summary.activeCampaigns + summary.completedCampaigns)}
note="Aktif & selesai"
```

- `pendingPayments` adalah metrik negosiasi, bukan campaign → tidak boleh ikut dijumlahkan.
- Catatan diubah karena DTO summary belum punya hitungan semua status (termasuk draft/paused).
  Menambah `totalCampaigns` ke DTO = pekerjaan backend, dicatat sebagai follow-up di `tasks.md` §7.

### 4.5 Tarif mulai dari (1.16)

```tsx
value: lowestStartingPrice > 0 ? formatCompactCurrency(lowestStartingPrice) : "—",
unit: lowestStartingPrice > 0 ? "/ proyek" : "",
```

- Unit ikut dikosongkan karena "— / proyek" terbaca seperti nilai yang hilang sebagian.

---

## 5. Inventaris berkas

**Modified (frontend saja):**

| Berkas | Defect |
|---|---|
| `src/components/features/umkm-dashboard/campaign/detail/CampaignDetailPage.tsx` | 1.1 |
| `src/components/features/umkm-dashboard/campaign/CampaignsPage.tsx` | 1.9 |
| `src/components/features/creator-dashboard/CreatorDashboardView.tsx` | 1.2, 1.11 |
| `src/components/features/creator-dashboard/JobDetailView.tsx` | 1.3, 1.4 |
| `src/components/features/creator-dashboard/SettingsView.tsx` | 1.5 |
| `src/components/features/umkm-dashboard/creators/detail/CreatorProfileHero.tsx` | 1.6 |
| `src/components/features/creator-dashboard/ActiveWorkDetailView.tsx` | 1.7 |
| `src/components/features/auth/RoleChooser.tsx` | 1.8 |
| `src/components/features/creator-dashboard/modals/ClaimCampaignModal.tsx` | 1.10 |
| `src/mocks/creator-dashboard.mock.ts` | 1.12 |
| `src/services/creator/creator-dashboard.service.ts` | 1.12 |
| `src/services/umkm/umkm-dashboard.service.ts` | 1.13, 1.14 |
| `src/mocks/umkm/overview.mock.ts` | 1.14 |
| `src/components/features/umkm-dashboard/campaign/CampaignSummaryCards.tsx` | 1.15 |
| `src/components/features/umkm-dashboard/creators/CreatorSummaryCards.tsx` | 1.16 |

**New (tests):** satu berkas tes baru per klaster di `__tests__` terdekat, rincian di `tasks.md`.

**Tidak boleh berubah:** `src/types/**`, `src/lib/constants/routes.ts`, `00_BACKEND/**`,
`src/services/**/*-appwrite.service.ts`, dan berkas apa pun di luar tabel di atas.

---

## 6. Strategi tes

Prinsip: setiap defect mendapat tes yang **gagal sebelum** perbaikan (Red), lalu hijau setelahnya.

| Defect | Tes | Bentuk |
|---|---|---|
| 1.1 | `campaign/detail/__tests__/*` baru — klik tombol riwayat → `router.push(routes.umkmFinance)`, dan toast TIDAK dipanggil | jsdom + mock `next/navigation` |
| 1.2 | `creator-dashboard/__tests__/creator-dashboard-navigation.test.tsx` baru — render kartu rekomendasi → href = `/dashboard/kreator/job-pool/<id>` | jsdom |
| 1.3 | `creator-dashboard/__tests__/job-detail-controls.test.tsx` baru — clipboard fallback → toast salin; tombol punya `aria-label` | jsdom, stub `navigator.clipboard` |
| 1.4 | sama berkas: tombol "Urutkan dari" TIDAK ada di DOM | jsdom |
| 1.5 | `creator-dashboard/__tests__/settings-notification-panel.test.tsx` baru — tombol "Simpan Preferensi" tidak dirender, keterangan "segera hadir" tetap ada | jsdom |
| 1.6 | perluas `creators/detail/__tests__/creator-content-source.test.tsx` — `isVerified: false` → teks "Kreator Terverifikasi" tidak ada; `true` → ada | jsdom |
| 1.7 | `creator-dashboard/__tests__/active-work-honesty.test.tsx` baru — teks "Terverifikasi" tidak muncul untuk submission `pending` | jsdom |
| 1.8, 1.9 | `auth/__tests__/role-chooser-copy.test.tsx` + perluasan tes empty state campaign — tidak ada "ratusan"/"ribuan" | jsdom |
| 1.10 | `creator-dashboard/__tests__/claim-modal-keyboard.test.tsx` baru — baris aturan ada `input[type=checkbox]`, bisa di-`change` sehingga tombol klaim aktif | jsdom |
| 1.11 | `creator-dashboard/__tests__/creator-dashboard-claim-state.test.tsx` baru — saat `onClaim` pending, tombol `disabled` dan berlabel "Mengklaim…" | jsdom |
| 1.12 | `services/creator/__tests__/creator-mock-messages.test.ts` baru — mock mode mengembalikan pesan untuk `conv_001`, `[]` untuk id tak dikenal | node |
| 1.13 | `services/umkm/__tests__/create-conversation.mock.test.ts` baru — kreator tanpa ruang → `success:false`, `code:"not_found"`, bukan `conv_000` | node |
| 1.14 | `mocks/__tests__/derive-overview-kpis.test.ts` baru — 3 active / 1 completed / 7 slot dari store; plus tes bahwa facade memakai hasil turunan | node |
| 1.15 | `campaign/__tests__/CampaignSummaryCards.test.tsx` baru — nilai = aktif + selesai, `pendingPayments` tidak ikut | jsdom |
| 1.16 | perbarui `creators/__tests__/CreatorSummaryCards.test.tsx:82` → `—`, dan unit kosong | jsdom |

Catatan harness: beberapa tes halaman memakai pola `waitFor` (condition-based waiting) seperti pada
`creators/detail/__tests__/creator-content-source.test.tsx`; jangan memakai satu flush `act()` untuk
rantai `useEffect` async.

---

## 7. Risiko & rollback

| Risiko | Mitigasi |
|---|---|
| Menghapus tombol yang ternyata diharapkan pemilik produk | Keputusan D-1 dan D-2 diminta lebih dulu di `bugfix.md` §5 |
| Perubahan mock menurunkan "kepenuhan" data demo | Mock baru hanya menambah pesan kreator; KPI diturunkan dari daftar yang sudah ada, tidak mengurangi data |
| `navigator.clipboard` butuh HTTPS / izin | Selalu jalur `navigator.share` lebih dulu; kegagalan clipboard diberi toast error, bukan diam |
| Tes lama mengunci perilaku salah | Invariant 3.7 menyebut tes yang sengaja diperbarui beserta alasannya |
| Rollback | Semua perubahan frontend murni dan tidak mengubah kontrak: `git revert <commit>` per task sudah cukup, tanpa migrasi data |

---

## 8. Urutan eksekusi yang disarankan

1. Klaster B (teks & klaim) — perubahan paling kecil, paling terlihat, tanpa risiko perilaku.
2. Klaster A (kontrol & navigasi) — perilaku nyata menggantikan tombol mati.
3. Klaster C (keyboard & state pending) — menyentuh alur klaim, butuh tes lebih teliti.
4. Klaster D (mock & agregat) — menyentuh service dan mock; dijalankan terakhir supaya mode mock
   sudah stabil ketika diverifikasi manual.

Setiap klaster = satu commit, dengan tesnya, lalu dijalankan `npx tsc --noEmit` + tes terkait.
