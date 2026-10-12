# Chat — Database

Sumber kebenaran skema tabel milik modul Chat. Satu fakta = satu lokasi. Skema canonical: `00_BACKEND/appwrite.config.json` (generator: `appwrite/generate_appwrite_json.cjs`).

> `conversations` dan `messages` memakai kolom **snake_case** — satu-satunya tabel di skema yang begitu.

---

## conversations

Ruang negosiasi antara satu UMKM dan satu creator. Relasi: Conversation (1) → Messages (N); Conversation (1) → Offers (N).

| Attribute        | Type     | Required | Catatan |
| ---------------- | -------- | -------- | ------- |
| umkm_id          | string(255) | yes   | user ID Appwrite UMKM (caller `create-conversation`) |
| creator_id       | string(255) | yes   | user ID Appwrite creator |
| offer_id         | string(255) | no    | offer terakhir yang dibuat `create-offer`; tidak dibaca DTO (DTO memilih offer `$createdAt` terbaru) |
| last_message     | string(1000) | no   | denormalisasi; `""` saat dibuat |
| last_message_at  | datetime | no       | denormalisasi; diisi waktu pembuatan saat dibuat |
| umkm_archived    | boolean  | no       | default `false`; status arsip milik UMKM |
| creator_archived | boolean  | no       | default `false`; status arsip milik Creator |
| is_archived      | boolean  | no       | default `false`; **deprecated**, ditulis `false` saat dibuat, tidak authoritative |

**Index**: `idx_umkm_id` (`umkm_id`), `idx_creator_id` (`creator_id`), `idx_umkm_creator` unique (`umkm_id`, `creator_id`), `idx_offer_id` (`offer_id`).

- Tidak ada index `last_message_at`: query tidak boleh `orderDesc('last_message_at')`. DTO mengurutkan `$createdAt` di query lalu `lastMessageAt` DESC di memori.

**Permission**:

- Tabel: `create("users")`, `rowSecurity: true`, tanpa `read`/`update` tabel.
- Row (ditulis `create-conversation`): `read("user:{umkm_id}")`, `read("user:{creator_id}")`. Tidak ada `update`/`delete` untuk browser.

### Migrasi Archive Legacy

- `umkm_archived` dan `creator_archived` ditambahkan dengan default `false`; tidak di-backfill dari `is_archived` (actor lama tidak tersimpan).
- `is_archived` dipertahankan untuk kompatibilitas skema; jangan dihapus pada migrasi ini.

### Ops

- `appwrite/ops/inspect-conversations.mjs` — laporan baris live (API key admin): ID participant tidak sah & permission row yang hilang. `--fix` menulis ulang permission.
- Catatan: skrip masih mengharapkan `read` **dan** `update` untuk kedua participant, tidak sesuai model saat ini (read-only). Jangan jalankan `--fix` sebelum skrip diselaraskan.

---

## messages

Pesan dalam sebuah percakapan. Relasi: Conversation (1) → Messages (N); Message (0..1) → Offer.

| Attribute       | Type        | Required | Catatan |
| --------------- | ----------- | -------- | ------- |
| conversation_id | string(255) | yes      | FK → `conversations.$id` |
| sender_id       | string(255) | yes      | user ID pengirim |
| message_type    | string(50)  | yes      | `text` \| `offer` (ditulis); `system` belum ada penulis. Tidak ada enum di skema |
| content         | string(2000)| no       | teks pesan; untuk `offer` berisi `Penawaran Khusus: {title}` |
| offer_id        | string(255) | no       | FK → `offers.$id` untuk tipe `offer`; `null` untuk `text` |
| read_at         | datetime    | no       | `null` saat dibuat; diisi saat penerima membuka ruang |

**Index**: `idx_conversation_id`, `idx_sender_id`, `idx_read_at`.

**Permission**:

- Tabel: `create("users")`, `rowSecurity: true`, tanpa `read`/`update` tabel.
- Row pesan `text` (`send-message`): `read` kedua participant saja.
- Row pesan `offer` (`create-offer`): `read` + `update` kedua participant.
- Realtime hanya mengirim event untuk row yang boleh dibaca penerima, jadi row permission menentukan siapa yang menerima event.
