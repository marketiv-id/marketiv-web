# Prompt per Fase

Setiap fase migrasi dikerjakan di **sesi chat baru**. Folder ini berisi satu prompt per fase yang sudah lengkap: setiap prompt menunjuk ke dokumen fase, membawa aturan arsitektur, dan mewajibkan sesi membaca log fase-fase sebelumnya.

## Cara pakai
1. Pastikan **prasyarat** fase sudah terpenuhi. Prasyarat ditulis di bagian atas setiap file prompt.
2. Buka sesi baru di repo `marketiv-web`.
3. Salin **seluruh blok `text`** dari `fase-NN.md`, lalu kirim sebagai pesan pertama.
4. Sesi akan membaca dokumen, lalu mengajukan rencana untuk kamu setujui sebelum mengubah kode.
5. Di akhir fase, sesi menulis log `../progress/fase-NN.md` dan membuka PR ke `migrasi-supabase`.
6. Review dan merge PR itu **sebelum** membuka sesi fase berikutnya, karena fase berikutnya membaca log tersebut.

## Urutan & dependensi

| Fase | Prompt | Butuh selesai dulu | Catatan |
|---|---|---|---|
| 0 | [fase-00.md](./fase-00.md) | — | Membuat branch `migrasi-supabase`, spike, audit |
| 1 | [fase-01.md](./fase-01.md) | 0 | Boleh paralel dengan Fase 2 |
| 2 | [fase-02.md](./fase-02.md) | 0 | Boleh paralel dengan Fase 1 |
| 3 | [fase-03.md](./fase-03.md) | 2 | |
| 4 | [fase-04.md](./fase-04.md) | 3 (dan 1 untuk preview Vercel) | |
| 5 | [fase-05.md](./fase-05.md) | 4 | |
| 6 | [fase-06.md](./fase-06.md) | 5 | |
| 7 | [fase-07.md](./fase-07.md) | 6 | |
| 8 | [fase-08.md](./fase-08.md) | 7 | Fase paling berisiko, jangan dipercepat |
| 9 | [fase-09.md](./fase-09.md) | 8 | |
| 10 | [fase-10.md](./fase-10.md) | 9 | Butuh operator manusia hadir |
| 11 | [fase-11.md](./fase-11.md) | 10 + stabil 7 hari | |

## Langkah satu kali sebelum Fase 0

Folder `docs/marketiv-supabase-migration-v1/` saat ini baru ada di branch `claude/zealous-knuth-n10z1y`. Pilih salah satu:

- Merge branch itu ke `main` (disarankan), **atau**
- Biarkan Fase 0 membuat `migrasi-supabase` dari branch itu.

Setiap prompt sudah berisi fallback `git fetch` bila folder docs tidak ada di checkout sesi baru.

## Bila sesi menyimpang
- Ingatkan sesi untuk kembali ke dokumen fase dan bagian **Aturan** di prompt.
- Jika rencana memang perlu diubah, minta sesi mencatat perubahan itu di bagian "Keputusan & deviasi" pada log progres, supaya fase berikutnya tahu.
