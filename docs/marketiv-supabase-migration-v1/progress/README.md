# Log Progres per Fase

Setiap fase **wajib** menulis `fase-NN.md` di folder ini sebelum membuka PR. Log ini menjadi satu-satunya jembatan konteks antar sesi chat. Fase berikutnya membaca semua log yang sudah ada sebelum mulai bekerja.

Aturan:
- Tulis apa adanya. Task yang gagal, dilewati, atau ditunda tetap dicatat.
- Jangan menulis nilai secret, data pribadi, atau isi dump.
- Bila log berbeda dengan dokumen fase, log yang lebih baru yang berlaku. Jelaskan perbedaannya di bagian "Keputusan & deviasi".

## Template

```markdown
# Fase NN — <Judul>

- Tanggal: YYYY-MM-DD
- PR: <link>
- Status: selesai | sebagian | diblokir

## Status task
<salin checkbox dari dokumen fase, dengan status terbaru>

## File dibuat / diubah
- `path` — ringkasan perubahan

## Keputusan & deviasi dari rencana
- <apa> — <alasan> — <dampak ke fase lain>

## Hasil verifikasi
| Perintah / skenario | Hasil |
|---|---|
| `npm run typecheck` | lulus |

## Env / secret baru (nama saja)
- `NAMA_ENV` — dipakai di mana

## Isu terbuka
- <isu> — <usulan>

## Isu untuk fase lain
- Fase X: <isu>

## Catatan serah-terima untuk fase berikutnya
- <yang perlu diketahui sesi berikutnya sebelum mulai>
```
