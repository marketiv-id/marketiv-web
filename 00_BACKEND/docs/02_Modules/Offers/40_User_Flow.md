# Offers — User Flow

## Kirim Offer (UMKM)

```text
UMKM di ruang negosiasi, stage chatting / offer_rejected / completed / cancelled
↓
Quick action "Kirim Penawaran Khusus" → SendCustomOfferModal
  (bisa prefill dari ?packageId bila paket masih published)
↓
Isi: lingkup (scope), harga, jumlah revisi, deadline + centang persetujuan
↓
createOffer → Function create-offer
  title = scope (≤255) atau "Kolaborasi dengan {creatorName}", description = scope
↓
offers (pending) + pesan tipe offer "Penawaran Khusus: {title}" di chat
↓
send-chat-notification → creator mendapat notifikasi chat_message
```

## Tarik Offer (UMKM)

```text
CustomOfferCard offer pending → "Batalkan Penawaran"
↓
deleteOffer → hapus row offers (Client SDK)
↓
Stage dihitung ulang dari offer tersisa (mis. chatting / offer_rejected / completed); UMKM boleh kirim offer baru
```

Pesan `offer` lama di chat dan `conversations.offer_id` tidak ikut dihapus; kartu offer kehilangan data join (`offerData` kosong).

## Jawab Offer (Creator)

```text
Creator melihat offer di ruang negosiasi
├─ Terima → cek consent T&C di UI → update status accepted
│     ↓
│   create-order (asinkron) → order pending_payment + notifikasi UMKM "Penawaran Diterima"
│     ↓
│   Ruang poll DTO tiap 2 detik selama awaiting_order (maks 20 detik)
└─ Tolak → update status rejected
      ↓
    create-order → notifikasi UMKM "Penawaran Ditolak"; UMKM boleh menawar ulang
```

Setelah order `pending_payment`, alur lanjut ke pembayaran → `../../03_Workflows/30_RateCard_Order.md`.
