# Offers — Database

Sumber kebenaran skema tabel milik modul Offers. Satu fakta = satu lokasi. Skema canonical: `00_BACKEND/appwrite.config.json` (generator: `appwrite/generate_appwrite_json.cjs`).

---

## offers

Custom offer dalam sebuah percakapan. Relasi: Conversation (1) → Offers (N); Offer (1) → Order (0..1, `orders.offerId` unique); Message tipe `offer` (N) → Offer via `messages.offer_id`.

| Attribute            | Type         | Required | Catatan |
| -------------------- | ------------ | -------- | ------- |
| conversationId       | string(255)  | yes      | FK → `conversations.$id` (modul Chat) |
| umkmId               | string(255)  | yes      | user ID UMKM pembuat (dari `conversations.umkm_id`) |
| creatorId            | string(255)  | yes      | user ID creator penerima (dari `conversations.creator_id`) |
| title                | string(255)  | yes      | |
| description          | string(2000) | no       | lingkup pekerjaan; `""` jika kosong |
| price                | integer      | yes      | min 0, max 999.999.999 di skema; `create-offer` mensyaratkan ≥1 |
| deadline             | string(255)  | yes      | string tanggal ISO (bukan kolom datetime) |
| revisionLimit        | integer      | yes      | min 0, max 999.999.999 di skema |
| packageId            | string(255)  | no       | provenance paket rate card (opsional) |
| packageNameSnapshot  | string(100)  | no       | snapshot `rate_card_packages.name` saat offer dibuat |
| packagePriceSnapshot | integer      | no       | snapshot `rate_card_packages.price` (min 0, max 999.999.999) |
| status               | string(50)   | yes      | `pending` \| `accepted` \| `rejected` (tanpa enum di skema) |
| createdAt            | datetime     | no       | diisi `create-offer`; DTO & guard memakai `$createdAt` |

- Provenance paket hanya acuan; kontrak final tetap `title`, `description`, `price`, `deadline`, `revisionLimit`.

**Index**: `idx_conversationId` (`conversationId`), `idx_packageId` (`packageId`), `idx_status` (`status`), `idx_createdAt` (`createdAt` DESC).

**Permission**:

- Tabel: `create("users")`, `rowSecurity: true`, tanpa `read`/`update`/`delete` tabel.
- Row (ditulis `create-offer`): `read` UMKM + creator, `update` creator (accept/reject), `delete` UMKM (tarik offer). UMKM sengaja tanpa `update`.
- Row permission tidak membatasi kolom: creator secara teknis dapat mengubah kolom lain selain `status` dari browser.

> `conversationId` → `../Chat/50_Database.md`. Order dari accept → `../Orders/50_Database.md`. Status & validasi → `30_Business_Rules.md`.
