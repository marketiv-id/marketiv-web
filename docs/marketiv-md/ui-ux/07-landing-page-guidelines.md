# 07 — Landing Page Guidelines Marketiv

> Dokumen ini mendefinisikan arah landing page baru Marketiv dalam light mode.

## 1. Peran Landing Page

Landing page adalah halaman publik untuk menjelaskan nilai Marketiv kepada UMKM dan Kreator.
Landing page bukan prioritas implementasi pertama jika dashboard MVP belum stabil.
Namun arah visual landing page harus konsisten dengan Marketiv Light OS.
Landing page harus menjelaskan dua mode utama: Campaign Mode dan Rate Card Mode.
Landing page juga harus membangun trust terhadap escrow.

## 2. Landing Page Personality

- Clear.
- Persuasive.
- Warm.
- Modern.
- Trust-building.
- Marketplace-oriented.

## 3. Hero Section

Hero harus langsung menjelaskan manfaat Marketiv.
Headline harus bicara tentang UMKM bertemu kreator untuk pemasaran konten.
Subheadline menjelaskan escrow dan campaign berbasis hasil.
CTA utama: `Mulai Buat Campaign`.
CTA sekunder: `Daftar sebagai Kreator` atau `Pelajari Cara Kerja`.

### Hero Visual

Hero visual menggunakan preview dashboard atau floating cards.
Floating cards boleh menampilkan campaign card, payout card, creator card, dan escrow status.
Visual harus light, clean, dan tidak terlalu ramai.
Jangan menggunakan ilustrasi random yang tidak menjelaskan produk.

## 4. Hero Copy Example

```txt
Bantu UMKM tumbuh lewat konten kreator lokal.
Marketiv menghubungkan UMKM dengan kreator mikro untuk campaign video pendek, dengan dana aman melalui escrow.
```

Copy final boleh disesuaikan, tetapi harus sederhana dan mudah dipahami.

## 5. Problem Section

Problem section harus menjelaskan masalah nyata UMKM dan kreator.
UMKM sering kesulitan promosi digital dan rentan salah memilih buzzer.
Kreator mikro sulit mendapat job awal walaupun punya skill editing dan konten.
Marketiv menjadi jembatan dengan sistem job pool, rate card, dan escrow.

## 6. Solution Section

Solution section menjelaskan Marketiv sebagai marketplace hibrida.
Gunakan 3 benefit cards.

### Benefit Cards

```txt
Campaign berbasis hasil
Dana aman di escrow
Kreator lokal lebih mudah mendapat job
```

Setiap card harus memiliki icon, title, description pendek, dan visual support minimal.

## 7. Two Modes Section

Marketiv memiliki dua mode utama.
Section ini wajib jelas karena fitur dan aturan kedua mode berbeda.

### Campaign Mode Card

Campaign Mode untuk UMKM yang ingin campaign berbasis views.
UMKM membuat brief, kreator klaim job, kreator posting, lalu submit bukti tayang.
Tidak ada chat di Campaign Mode.

### Rate Card Mode Card

Rate Card Mode untuk UMKM yang ingin memilih kreator tertentu.
UMKM melihat profil kreator, negosiasi via chat, dan menyepakati custom offer.
Live chat hanya aktif di Rate Card Mode.

## 8. Escrow Trust Section

Escrow harus menjadi section utama landing page.
Jelaskan bahwa dana UMKM ditahan sementara oleh sistem.
Dana cair setelah bukti tayang atau collab post tervalidasi.
Gunakan visual step-by-step agar mudah dipahami.

### Escrow Steps

```txt
UMKM bayar ke escrow
Kreator mengerjakan campaign
Bukti tayang divalidasi
Dana dicairkan ke kreator
```

## 9. Creator Opportunity Section

Section ini ditujukan untuk kreator mikro.
Tekankan bahwa kreator bisa menemukan campaign dan membuat rate card.
Jangan menjanjikan penghasilan pasti.
Gunakan copy seperti peluang, job, portofolio, dan monetisasi awal.

## 10. UMKM Growth Section

Section ini ditujukan untuk UMKM.
Tekankan kemudahan membuat brief, memilih budget, dan memantau hasil.
Jelaskan AI Brief Assistant secara sederhana.
Jangan membuat UI terasa terlalu teknis.

## 11. Product Preview Section

Product preview harus menampilkan dashboard asli atau mockup yang realistis.
Preview minimal: dashboard UMKM, Job Pool Kreator, dan Keuangan/Escrow.
Gunakan card putih dengan border subtle.
Jangan memakai screenshot palsu yang tidak sesuai implementasi.

## 12. Social Proof Section

Untuk MVP awal, social proof bisa berupa target pasar dan use case.
Jika belum ada testimonial asli, jangan membuat testimonial palsu.
Boleh menampilkan `Dibangun untuk UMKM lokal Sukabumi` jika sesuai konteks proyek.

## 13. FAQ Section

FAQ harus menjawab ketakutan utama user.
Pertanyaan wajib: bagaimana dana diamankan, bagaimana kreator dibayar, apakah ada chat, bagaimana cara membuat campaign, dan bagaimana kreator submit bukti.
FAQ harus memakai bahasa sederhana.

## 14. Final CTA Section

Final CTA harus mengulang pilihan role.
CTA UMKM: `Mulai Buat Campaign`.
CTA Kreator: `Daftar sebagai Kreator`.
Background boleh primary soft atau navy very dark dengan card light, tetapi tetap hati-hati agar tidak keluar dari light mode.

## 15. Landing Page Sections Order

Urutan yang berlaku sejak revamp 2026-10-16 (`docs/landing-revamp/PLAN.md`):

```txt
1. Navbar
2. Hero
3. Masalah (Problem)
4. Tiga Pegangan (Solution Benefits)
5. Dua Mode
6. Escrow
7. Lihat Aplikasinya (Product Preview)
8. Untuk UMKM (UMKM Growth)
9. Untuk Kreator (Creator Opportunity)
10. Konteks (pengganti Social Proof sampai ada data asli)
11. FAQ
12. Final CTA
13. Footer
```

## 16. Navbar

Navbar harus clean dan ringan.
Menu utama: Tentang, Cara Kerja, Untuk UMKM, Untuk Kreator, Login.
CTA register ditempatkan di kanan desktop dan full-width di mobile drawer.
Navbar sticky boleh digunakan tetapi harus shadow minimal.

## 17. Footer

Footer berisi logo, deskripsi pendek, link halaman, dan kontak.
Footer tidak perlu terlalu kompleks untuk MVP.
Gunakan background secondary navy atau neutral soft.
Pastikan kontras tetap terbaca.

## 18. Landing Visual Rules

Gunakan warm off-white background.
Gunakan card putih.
Gunakan orange untuk CTA.
Gunakan navy untuk heading penting.
Gunakan ilustrasi hanya jika mendukung penjelasan produk.
Hindari gradient berlebihan.
Hindari dark hero full-screen.

## 19. Implementation Priority Landing

Owner menyatakan MVP selesai pada 2026-10-16, sehingga landing boleh motion-led.
Stack motion landing: GSAP + ScrollTrigger + Lenis, hanya di route `/`, dengan katalog efek dan guardrail di `docs/landing-revamp/PLAN.md` bagian 5.
Setiap efek wajib punya jalur reduced motion dan touch, dan konten harus terbaca tanpa JavaScript.
Dashboard tetap memakai motion token pendek di `02-design-tokens.md` §18.
