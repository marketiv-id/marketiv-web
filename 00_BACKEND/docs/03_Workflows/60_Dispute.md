# Workflow: Dispute, Banding Akun & Refund Manual

> **Diverifikasi terhadap kode: 2026-10-12.** Sumber kebenaran:
> `00_BACKEND/functions/{suspend-user,unsuspend-user,create-appeal,review-appeal,refund-order,refund-escrow}`,
> `src/components/features/dashboard/shared/HelpAdminModal.tsx`, izin di `00_BACKEND/appwrite.config.json`.

## Purpose

Menjelaskan apa yang **benar-benar ada** untuk sengketa:

1. **Sengketa order / banding submission** — tidak ada fitur di platform. User menghubungi Admin via WhatsApp; Admin menyelesaikan manual (termasuk refund).
2. **Banding suspensi akun** — ada di backend (`appeals`), tetapi belum punya UI.

## Modules Involved

- [Orders](../02_Modules/Orders/00_Index.md) — order yang dipersengketakan.
- [Payments](../02_Modules/Payments/00_Index.md) — refund escrow / sisa budget.
- [Users](../02_Modules/Users/00_Index.md) — `users.status`, `suspended_at`, `appeals`.
- [Notifications](../02_Modules/Notifications/00_Index.md) — notifikasi suspensi & banding.

## Trigger

- Sengketa order / submission: user membuka modal "Hubungi Admin & Komunitas" dari sidebar dashboard.
- Banding akun: Admin menangguhkan akun lewat `suspend-user`.

## Data Model — Collection yang Terlibat

| Collection | Aksi | Ditulis oleh |
|---|---|---|
| `users` | `status: active ↔ suspended \| terminated`, `suspended_at` | `suspend-user`, `unsuspend-user`, `review-appeal` |
| `appeals` | insert `submitted`; update `approved \| rejected` + `decision`, `decidedAt` | `create-appeal`, `review-appeal` |
| `escrows`, `transactions`, `wallets` | refund | `refund-order`, `refund-escrow` |
| `notifications` | insert | Function terkait |

## Step-by-step Flow

### A. Sengketa Order / Banding Submission (di luar platform)

1. **Frontend** — `HelpAdminModal` (sidebar dashboard UMKM & Kreator) menampilkan tautan statis `https://wa.me/628212244157` dan grup komunitas.
   - Tidak ada tombol "Hubungi Admin" di halaman detail order, tidak ada pesan otomatis berisi ID order, dan tidak ada konstanta `ADMIN_WHATSAPP_NUMBER` — **belum diimplementasikan**.
2. Admin menangani percakapan di WhatsApp. Tidak ada status `dispute` yang ditulis ke `orders` (tidak ada Function yang menulisnya); tipe UI `dispute` di `EscrowStatusCard`/`DashboardBadge` tidak punya sumber data backend.
3. Bila Admin memutuskan refund untuk order yang sudah dibayar:
   - ubah `orders.status` menjadi `cancelled` (atau `expired`) lewat Console → **event `orders.rows.*.update`** → `refund-order` merefund escrow `held` ke wallet UMKM; atau
   - panggil manual `refund-escrow` `{ escrowId | orderId }` atau `refund-order` `{ orderId }` (keduanya `execute: []`). `refund-escrow` tidak mengubah status order.
   - Refund = `escrow.amount` utuh (tanpa fee), escrow `held → refunded`, ledger `refund`, notifikasi `refund_escrow`.
4. Bila Admin memutuskan kreator tetap dibayar: Admin memvalidasi deliverable `valid` dan UMKM menyetujui (atau menunggu auto-approve) sehingga `release-escrow` berjalan. Tidak ada jalur "force release" khusus.
5. Banding submission campaign yang ditolak juga lewat WhatsApp (T&C `src/content/terms.ts`). `review-submission` hanya menerima submission `pending`, jadi keputusan yang sudah final tidak bisa dibalik lewat Function.

### B. Suspensi & Banding Akun (backend tersedia, UI belum)

6. **Users** — Admin memanggil `suspend-user` `{ userId, status: suspended|terminated, reason }` (`execute: []`): hanya untuk akun `active`; set `status`, `suspended_at`; notifikasi `account_suspended` / `account_terminated` dengan batas banding 14 hari.
7. Efek status non-aktif: login ditolak (`auth.service.ts`), dan Function finansial menolak (mis. `create-payment`, `submit-campaign-proof`, `request-withdrawal`, `create-offer`, `create-conversation`, `cancel-order`, `unclaim-campaign`, `request-ratecard-revision`).
8. **Users** — User memanggil `create-appeal` `{ reason, evidence?, actionRef? }` (`execute: ["users"]`): akun harus non-aktif, `suspended_at` ada, masih ≤ 14 hari, dan tidak ada banding `submitted|under_review`. Buat `appeals` `submitted` dengan `deadlineAt` (+14 hari dari suspensi) dan `slaDecidedAt` (+7 hari). Notifikasi `appeal_submitted`.
   - **Belum diimplementasikan di frontend:** tidak ada layar/servis yang memanggil `create-appeal`; karena login ditolak untuk akun `suspended`, user praktis harus menghubungi Admin via WhatsApp.
9. **Users** — Admin memanggil `review-appeal` `{ appealId, decision: approved|rejected, note? }` (`execute: []`):
   - `approved` → `users.status = active` (termasuk `terminated`), notifikasi `account_restored`.
   - `rejected` → status akun tetap, notifikasi `appeal_rejected`.
10. Alternatif tanpa banding: `unsuspend-user` `{ userId, note? }` (`execute: []`) memulihkan akun `suspended` (bukan `terminated`) → `active`, notifikasi `account_restored`.

## State Transitions

```text
USERS.status: active → suspended | terminated          (suspend-user)
              suspended → active                        (unsuspend-user | review-appeal approved)
              terminated → active                       (review-appeal approved saja)
APPEALS.status: submitted → approved | rejected         (under_review ada di enum, tanpa penulis)
ESCROW (refund manual): held → refunded
```

## Events / Functions

| Trigger | Function | Aksi |
|---|---|---|
| API key / Console | `suspend-user`, `unsuspend-user` | Ubah status akun |
| HTTP (`users`) | `create-appeal` | Ajukan banding (belum dipanggil frontend) |
| API key / Console | `review-appeal` | Putus banding |
| `orders.rows.*.update` | `refund-order` | Refund escrow saat order `cancelled|expired` |
| API key / Console | `refund-escrow`, `refund-order` | Refund manual |

Tidak ada UI Admin untuk suspensi, banding, atau refund — admin app (`admin/`) hanya mencakup submission, validasi deliverable Rate Card, withdrawal, dan dashboard.

## Validation Rules per Langkah

| Langkah | Validasi | Gagal → |
|---|---|---|
| `suspend-user` | `status ∈ suspended|terminated`; `reason` wajib; akun masih `active` | 400 / 409 |
| `create-appeal` | Akun non-aktif; `suspended_at` ada; ≤ 14 hari; tidak ada banding terbuka | 403 / 400 / 409 |
| `review-appeal` | `decision ∈ approved|rejected`; banding belum diputus | 400 / 409 |
| `unsuspend-user` | Akun bukan `terminated` dan bukan `active` | 409 |
| Refund | Order `cancelled|expired` (refund-order); escrow `held` | `ignored` / 409 |

## Notifikasi

| Titik | Kind | Penerima |
|---|---|---|
| Akun ditangguhkan/dihentikan | `account_suspended` / `account_terminated` | User |
| Banding diterima | `appeal_submitted` | User |
| Banding disetujui / unsuspend | `account_restored` | User |
| Banding ditolak | `appeal_rejected` | User |
| Refund escrow | `refund_escrow` | UMKM |

## Edge Cases

- Semua keputusan sengketa order final di tangan Admin dan dicatat di luar platform (tidak ada audit log sengketa di database).
- Order `pending_payment` tidak perlu sengketa — UMKM cukup `cancel-order`.
- Order `completed` tidak bisa direfund lewat Function (escrow sudah `released`).
- Notifikasi suspensi memakai id deterministik per (baris `users`, kind): suspensi kedua untuk user yang sama tidak menghasilkan notifikasi baru.

## Links

- [RateCard Order workflow](30_RateCard_Order.md)
- [Submission Fraud workflow](40_Submission_Fraud.md)
- [Orders](../02_Modules/Orders/00_Index.md)
- [Users](../02_Modules/Users/00_Index.md)
