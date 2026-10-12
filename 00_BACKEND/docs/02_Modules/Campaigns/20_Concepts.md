# Campaigns — Concepts

## Istilah

- **Campaign** — proyek promosi UMKM dengan sistem Pay-Per-View (PPV).
- **Pay-Per-View (PPV)** — model pembayaran di mana creator dibayar berdasarkan jumlah views konten.
- **Top-Up / Funding** — UMKM membayar `budget + fee` via Midtrans; `budget` masuk ke `campaigns.remainingBudget` (dana campaign), bukan ke wallet.
- **Publish** — draft yang sudah didanai penuh (`remainingBudget >= budget`) menjadi `active` dan tampil di Job Pool.
- **Job Pool** — daftar campaign `active` yang bisa di-claim kreator.
- **Claim** — aksi creator mengambil campaign untuk dikerjakan; memakan satu slot `claimLimit`.
- **Unclaim** — creator membatalkan claim yang belum disubmit; baris claim dihapus dan slot kembali.
- **Submission (Bukti Kerja)** — URL konten publik yang dikirim creator untuk satu claim.
- **Fraud Precheck** — analisis otomatis risiko submission (`fraudScore`, `fraudStatus`); hanya metadata pendukung.
- **Periode Observasi** — jeda minimum (default 72 jam) sejak submission dibuat sebelum Admin boleh mengunci views.
- **Views Terkunci (Locked Views)** — views final yang ditetapkan Admin saat approve (`views_count`, `views_final = true`, `views_source = manual_admin`).
- **Reward** — kompensasi creator = `min(floor(views × rewardPer1000Views / 1000), remainingBudget)`, masuk langsung ke saldo tersedia wallet.
- **CPM** — Cost Per Mille (per seribu views) = `rewardPer1000Views`.

## Tipe Campaign

- **UGC (User Generated Content)** — Creator membuat konten video baru dari 0 dengan memanfaatkan aset digital produk (foto/video mentah/katalog) yang disediakan UMKM. Cocok untuk format *Green Screen, Talking Head, Voiceover*, atau *Slideshow Montage*.
- **Clipping** — Creator bertindak sebagai video editor yang memotong/mengedit ulang konten panjang (*long-form video* seperti rekaman *Live Shopping*, podcast, atau YouTube) milik UMKM menjadi klip pendek viral (30–60 detik) dengan *dynamic subtitle* dan *hook*.

## Aturan Tanpa Sampel Fisik (*Digital Asset-Based*)

- Seluruh campaign PPV MVP bersifat **100% berbasis aset digital**.
- **Tidak ada pengiriman sampel produk fisik** dari UMKM ke creator.
- Creator berkreasi menggunakan materi digital dari tautan folder cloud (`campaign_assets`) yang disediakan UMKM.

## Status Campaign

```text
draft ──publish──▶ active ◀──resume── paused
                     │ └────pause────▶ │
                     └── remainingBudget ≤ 0 ──▶ completed
```

`completed` ditulis `calculate-campaign-reward` setelah reward membuat sisa budget ≤ 0 (berlaku juga bila campaign sedang `paused`).

## Status Claim

```text
claimed ──submit──▶ submitted ──Admin──▶ approved | rejected
   ├── deadline / kuota penuh ──▶ expired
   └── unclaim ──▶ (baris dihapus)
```

## Status Submission

`pending → approved | rejected` (keputusan Admin Marketiv via `review-submission`).

## Fraud Status

`safe (0–30) | review (31–70) | rejected (71–100)` — terpisah dari status submission.
