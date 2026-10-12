# Rate Cards — Events

## Event yang Diterbitkan

Tidak ada Function yang mendengarkan event `rate_cards`/`rate_card_packages`. Perubahan status (`draft ⇄ published`) hanyalah perubahan data yang dibaca saat query:

| Perubahan data | Pemicu | Efek |
| --- | --- | --- |
| `rate_cards.status` → `published` | Toggle/simpan paket oleh Creator | Paket tampil di profil Creator, dihitung `startingPrice`, sah sebagai `packageId` offer |
| `rate_cards.status` → `draft` | Toggle oleh Creator | Paket hilang dari profil & `startingPrice`; `create-offer` menolak paket ini (422) |

## Event yang Dikonsumsi

Rate Cards tidak mengonsumsi event dari modul lain.

## Lihat Juga

- Paket sebagai acuan offer → `../Offers/90_Events.md`; order dibuat dari offer → `../Orders/90_Events.md`.
- Discovery creator → `../Users/60_API.md`.
- Direct Order dari paket **belum diimplementasikan**.
