# Plan Revamp Landing Page Marketiv

Status: DISETUJUI ARAHNYA, belum dieksekusi. Tanggal: 2026-10-16. Owner: Sehan (CTO).

Dokumen ini adalah rencana penggantian total landing page `/`. Belum ada kode yang diubah. D1, D2, D3, D6 sudah diputuskan; D4, D5, D7 masih terbuka tapi tidak memblokir P1 (bagian 10). Referensi owner (Armor, Sphere, DontMatter) sudah dipetakan di bagian 3.1 dan diterapkan di bagian 4 dan 6.

## 1. Kenapa landing sekarang perlu diganti

Ringkasan audit kode dan copy (detail file:line ada di riwayat sesi riset):

**Isi dan klaim**

- Klaim tanpa bukti: "Dipercaya Oleh Banyak UMKM Di Seluruh Indonesia" (`content.ts:23`), "terpercaya di Indonesia" (`content.ts:164`), "Rp 500 Juta+ total budget campaign aktif" (`content.ts:96`), "CPM rata-rata Marketiv" (`CuanEstimatorSection.tsx:138`). Melanggar `07-landing-page-guidelines.md` §9 dan §12.
- Tabel "Live Submission Kreator" berisi akun palsu (`@kopi_budi_tt` dst.) dengan badge "Live". Angkanya juga tidak konsisten (total payout 3,9 jt tapi sisa budget 64%).
- Salah alur produk: "Setelah UMKM menyetujui, reward langsung masuk" untuk Campaign. Faktanya di Campaign, validasi dilakukan sistem berbasis risiko dan admin Marketiv; UMKM hanya observer read-only (`campaign-submission-admin-authority-ui/requirements.md` R-01, `terms.ts:177`). UMKM baru jadi pihak yang menyetujui di Rate Card.
- Kata "escrow" tidak muncul sama sekali, padahal guideline §8 mewajibkan escrow jadi section utama.
- Hanya menyebut TikTok, padahal T&C menyebut TikTok/Instagram (`terms.ts:59`).
- Nomor WhatsApp footer `+62 812-3456-7890` terlihat placeholder tapi tertaut ke wa.me.
- Bahasa campur: "Live", "Real-Time", "Pending/Approved/Rejected", "Buka Dashboard"; register campur ("Gimana", "dapet" lalu "dapat" di kalimat yang sama); Title Case di subjudul.

**Visual dan teknis**

- Hero full-bleed foto AI: ada watermark sparkle di pojok kanan bawah, poster "THE DARK KNIGHT/BATMAN" terlihat (risiko IP). Total 5,6 MB PNG, dua-duanya `priority`, dan `images.unoptimized: true`.
- `Logo.tsx` 2,3 MB (base64 PNG dalam SVG) masuk bundle client Navbar dan Footer di semua halaman publik.
- Semua animasi pakai `framer-motion` `useInView` per section, variant `fadeUp` di-copy 5 kali, tanpa reduced-motion untuk JS. Progress bar menganimasikan `width` (properti layout).
- Section tidak sesuai urutan guideline §15: tidak ada Problem, Escrow, Product Preview, UMKM Growth, Creator Opportunity, Final CTA.
- Navbar: 3 dari 4 link menuju halaman placeholder atau redirect (`/panduan` redirect ke dashboard UMKM). Tidak ada link ke anchor section.
- A11y: hamburger tanpa `aria-expanded`, link menu mobile tetap fokus saat tertutup, slider tanpa label, tab tanpa `role="tablist"`, tombol palsu yang bisa difokus di mockup.

## 2. Konflik dokumen yang perlu diputuskan, bukan diselesaikan diam-diam

| # | Konflik | Rekomendasi |
|---|---|---|
| K1 | `07-landing-page-guidelines.md` §19: "Jangan habiskan waktu membuat animasi kompleks sebelum fitur MVP selesai." Permintaan sekarang justru revamp motion-led. | Owner memutuskan. Jika lanjut, update §19 dan §15 di dokumen yang sama setelah plan disetujui. |
| K2 | `02-design-tokens.md` §18 motion token 120/180/240 ms (untuk feedback UI dashboard). Landing cinematic butuh 0,8 sampai 1,2 detik. | Tambah sub-bagian "Landing motion tokens" terpisah. Token dashboard tetap. |
| K3 | `.github/copilot-instructions.md` berjudul "Awwwards Portfolio" dan menyebut Supabase/GraphQL (stale, project lain). Tapi aturan animasinya (GSAP + Lenis untuk makro, `useGSAP` + scope ref, import via `@/lib/gsap`) cocok dengan rencana ini. | Pakai aturan animasinya. Header file tetap dianggap stale; rapikan di task terpisah. |
| K4 | `.agents/rules/strict-rules.md` §2: tidak boleh menambah package tanpa permintaan eksplisit. | Butuh persetujuan eksplisit untuk `gsap`, `@gsap/react`, `lenis` (bagian 10). |
| K5 | Skill `build-awwwards-quality-sites` menyarankan ikon Solar via Iconify. Project sudah punya `@phosphor-icons/react` dan `lucide-react`. | Pakai ikon yang sudah ada. Tidak menambah sumber ikon baru. |
| K6 | `.agents/rules/marketiv-context.md` dan `p2mw-compliance.md` menyebut P2MW 2025; footer menulis "P2MW 2026". | Owner konfirmasi tahun yang benar. |

## 3. Referensi gaya dan sumber skill

- **Skill yang dipakai** (sama dengan portfolio `sechan-portfolio`): `build-awwwards-quality-sites` (acceptance bar, honest assets, a11y) dan `cinematic-gsap-lenis-motion-system` (motion taste, token, choreography). Pendukung: `cinematic-scroll-storytelling` (sticky stack, scrub), `gsap-scrolltrigger`, `antislop-copywriting` (copy).
- **Skill `awwwards-landing-page` tidak dipakai.** Isinya hanya instruksi `git clone` template portfolio Locomotive Scroll ke direktori kosong. Tidak cocok untuk repo yang sudah ada dan akan menimpa file.
- **Referensi visual yang sudah ditetapkan di docs** (`01-visual-direction.md`): Acctual untuk clean financial trust, Konten.com untuk energi creator marketplace. Diambil trait tingkat tinggi saja (hierarki, whitespace, kejelasan angka), bukan layout, aset, atau copy.
- **Pola motion yang sudah terbukti di portfolio** (`sechan-portfolio/src/components/motion/`): `SmoothScroll` (Lenis digerakkan ticker GSAP, mati saat reduced motion), `Reveal` (mode words/fade/clip via `SplitText` + `gsap.matchMedia`), `Magnetic`, `Marquee` berbasis scroll velocity. Pola ini di-port, bukan di-copy mentah: token dan warna ikut Marketiv.
- Pencarian web untuk referensi Awwwards khusus creator marketplace atau escrow tidak menemukan contoh yang relevan. Arah di bawah dibangun dari brief Marketiv sendiri plus tiga referensi owner (bagian 3.1).

### 3.1 Referensi dari owner (diinspeksi 2026-10-16, desktop 1440x900)

Yang diambil hanya pola tingkat tinggi. Tidak ada aset, copy, foto, logo, atau kode yang disalin.

| Situs | Stack terdeteksi | Kenapa relevan |
|---|---|---|
| armor-bd.com (teknologi perbankan) | Vite SPA, Lenis, font Unbounded + Manrope | Satu-satunya yang sewarna dengan Marketiv: oranye + warm dark. Membuktikan oranye bisa terasa aman dan premium untuk produk uang. |
| spheredigitalrecruitment.com (rekrutmen) | WordPress + jQuery, Google Sans | Marketplace dua sisi seperti Marketiv (perusahaan dan kandidat = UMKM dan kreator). |
| dontmatter.eu (agensi) | GSAP 3.14 + ScrollTrigger + Lenis, custom cursor, 5 video | Stack sama persis dengan rencana ini. Paling kuat di craft motion dan personality. |

**Armor, yang diambil**

- Hero di dalam **frame rounded** (margin sekitar 16 px dari tepi layar), navbar pill melayang di dalam frame.
- **Ritme section terang dan gelap bergantian**: krem hangat, lalu panel gelap hangat dengan **radial glow oranye + grain**. Gelapnya bukan hitam murni.
- Section "label kecil di kiri, pernyataan besar di kanan" untuk teks penjelas.
- **Kartu bernomor zigzag** (`01`, `02`, ...) dengan ikon garis tipis di atas panel glow.
- **Foto produk dalam konteks dengan hotspot**: titik di foto membuka kartu kecil penjelasan.
- Baris wordmark raksasa bergantian outline dan solid.
- Peta dengan pin sebagai bukti jangkauan.

**Armor, yang tidak diambil:** preloader "loading experience" (menunda konten), logo wall klien, bento statistik besar (Marketiv belum punya angka asli).

**Sphere, yang diambil**

- **CTA dua audiens permanen di navbar** (dua pill berwarna beda, satu per audiens), lalu diulang di Final CTA.
- **Section sebagai "lembaran" rounded yang saling menumpuk**: tiap section punya sudut bawah radius besar dan menimpa section berikutnya. Identitas struktural yang kuat, murah secara performa, aman di mobile.
- Headline besar terpusat dengan **satu kata beraksen warna**.
- **Carousel horizontal dengan progress bar + tombol panah** untuk kartu (pola kartu lowongan: badge waktu, ID kecil, baris meta berikon, tombol aksi).
- **Catatan pendiri** (foto asli + kutipan + nama dan jabatan) sebagai pengganti testimoni.
- Final CTA berupa panel gradient besar di atas footer gelap.

**Sphere, yang tidak diambil:** palet lilac/violet dan mint, logo wall klien, statistik bulanan.

**DontMatter, yang diambil**

- **Hero berlapis**: tipografi raksasa di belakang, objek produk di depan, elemen kecil melayang di sekitarnya (kedalaman parallax).
- Pernyataan "tentang" dengan **kata kunci bergaris bawah**.
- **Panel layanan full-viewport yang ditumpuk dengan CSS `position: sticky`**, bukan pin GSAP (17 ScrollTrigger, 0 pin). Pola ini ringan dan jadi acuan untuk section Dua Mode, Untuk UMKM, Untuk Kreator.
- **Indikator section kontekstual**: dock kecil yang labelnya berganti sesuai section yang sedang dibaca.
- **Footer dengan wordmark raksasa + kalimat hidup** berisi jam lokal ("Right now, it's ...").
- Jam lokal di header sebagai detail personality.

**DontMatter, yang tidak diambil:** strip thumbnail portofolio sebagai pemilih hero (Marketiv bukan agensi), custom cursor sebagai default (opsional, hanya di Preview), foto dan video proyek.

## 4. Arah visual

**Visual thesis: "Nota Kolaborasi".** Landing terasa seperti meja kerja UMKM yang rapi: kertas krem hangat, tipografi navy besar yang yakin, dan oranye dipakai seperti tinta stempel, hanya untuk aksi dan status penting. Motif pembeda adalah **nota/struk**: garis putus-putus, angka monospace, dan stempel status (`DITAHAN`, `TERVALIDASI`, `DICAIRKAN`). Motif ini lokal, mudah dipahami UMKM, dan langsung menjelaskan escrow tanpa ilustrasi random.

| Elemen | Keputusan |
|---|---|
| Background | `neutral-25 #fffdf9` dan `neutral-100 #f8f5ef` bergantian per section. Tanpa gradient blob. |
| Teks | Heading `secondary-900 #102033` (navy), body `neutral-700 #525252`. |
| Aksen | `primary-500 #f97316` untuk CTA, stempel, progress. `primary-700 #c2410c` untuk teks oranye kecil (kontras AA di atas krem). |
| Section gelap | Dari Armor: tiga momen gelap saja, yaitu **Tiga Pegangan**, **Escrow**, dan **Footer**. Warnanya navy `secondary-900 #102033` dengan radial glow oranye `primary-500` opasitas 35 sampai 45% + grain halus (SVG noise, bukan gambar). Hero tetap terang (guideline §18 melarang dark hero). |
| Struktur section | Dari Sphere: tiap section adalah **lembaran** dengan radius bawah 40 px (desktop) / 24 px (mobile) yang menimpa section berikutnya (`relative z-*` + margin negatif). Pergantian krem ke navy terasa seperti membuka halaman nota. |
| Frame hero | Dari Armor: hero di dalam frame rounded 28 px, inset 12 px (mobile) / 16 px (desktop) dari tepi viewport. |
| Penekanan teks | Satu kata beraksen oranye per heading besar (Sphere). Kata kunci di paragraf pernyataan diberi garis bawah tebal `primary-500` (DontMatter). |
| Display type | Plus Jakarta Sans ExtraBold 800, tracking rapat (`-0.035em`), skala `clamp(44px, 7.5vw, 112px)` untuk H1. |
| Label dan angka | Font monospace untuk nominal, label section (`01 / MASALAH`), dan isi nota. Opsi: JetBrains Mono via `next/font` (keputusan D3). |
| Grid | 12 kolom desktop, gutter 24 px, margin 16 px mobile. Section padding `clamp(80px, 12vw, 160px)`. |
| Kartu | Putih, border `#e8e2d8`, radius 20 sampai 24 px, shadow `sm` saja. |
| Gambar | Tidak ada foto stok atau foto AI. Visual utama adalah UI produk asli (kartu dan screenshot dashboard dengan data contoh berlabel). Maskot dari banner KMI dipakai jika ada file PNG transparan (keputusan D4). |

**Motion narrative.** Uang bergerak dari UMKM, ditahan, lalu dilepas ke kreator. Seluruh choreography mengikuti alur itu: hero memperlihatkan kartu-kartu transaksi melayang, section Escrow mengunci layar dan "mencetak" nota langkah demi langkah, dan footer menutup dengan wordmark besar yang naik perlahan.

## 5. Stack motion dan arsitektur

| Hal | Keputusan |
|---|---|
| Animasi makro | GSAP 3 + `@gsap/react` (`useGSAP`), plugin ScrollTrigger, SplitText, ScrambleText. Semua plugin GSAP gratis termasuk untuk komersial sejak diakuisisi Webflow (konfirmasi teks lisensi di gsap.com sebelum rilis). |
| Smooth scroll | Lenis, digerakkan `gsap.ticker`, `lenis.on("scroll", ScrollTrigger.update)`. Satu engine saja. Tidak memakai Locomotive. |
| Cakupan Lenis | Hanya di route `/`. `<SmoothScroll />` dipasang di `src/app/page.tsx`, bukan di root layout, supaya dashboard tidak terpengaruh. |
| Framer Motion | Tidak dipakai di landing. Tetap dipakai dashboard (`page-transition.tsx`) dan `AuthSplit.tsx`. Duplikasi `motion` + `framer-motion` di `package.json` jadi task terpisah. |
| Mikro-interaksi | CSS (hover, focus, accordion via `grid-template-rows`). GSAP hanya untuk magnetic CTA di pointer halus. |
| Reduced motion | `gsap.matchMedia("(prefers-reduced-motion: no-preference)")`. Saat reduce: Lenis tidak start, tidak ada pin/scrub, konten langsung di state akhir. |
| Tanpa JS | Semua teks dan CTA terlihat di HTML server. Animasi hanya menambah. |
| Konflik CSS | `html { scroll-behavior: smooth }` (`globals.css:199`) bentrok dengan Lenis. Override `html.lenis { scroll-behavior: auto }` (Lenis menambah class `lenis` ke `<html>`), dashboard tidak berubah. |
| Overlay global | `ChatbotFab`, `FloatingDemoBar`, `BetaTesterModal` diberi `data-lenis-prevent` di area scroll-nya dan dicek tidak menutupi section yang di-pin. |

**Struktur file (rencana)**

```txt
src/lib/gsap.ts                                    baru: register plugin sekali, konstanta MOTION_OK, ease
src/types/landing.ts                               baru: tipe LandingContent
src/data/content.ts                                LANDING_CONTENT ditulis ulang (typed, as const)
src/app/page.tsx                                   urutan section baru, metadata, <SmoothScroll />
src/components/features/landing/motion/
  SmoothScroll.tsx, Reveal.tsx, SplitHeading.tsx, ScrollHighlight.tsx, Scramble.tsx,
  Marquee.tsx, ParallaxLayer.tsx, ScrollScale.tsx, HorizontalTrack.tsx, StickyStack.tsx,
  IntroCurtain.tsx, ScreenSlice.tsx, PageCurtainLink.tsx, Cursor.tsx, Magnetic.tsx,
  LiquidButton.tsx, RollText.tsx, DistortImage.tsx, Spotlight.tsx, TiltCard.tsx, CountUp.tsx
src/components/features/landing/
  HeroSection.tsx (tulis ulang), ProblemSection.tsx, BenefitsSection.tsx, ModesSection.tsx,
  EscrowSection.tsx, ProductPreviewSection.tsx, UmkmSection.tsx, CreatorSection.tsx,
  ProofSection.tsx, FAQSection.tsx (tulis ulang), FinalCtaSection.tsx
src/components/layouts/Navbar.tsx, Footer.tsx      redesign, logo diganti MarketivLogo ringan
dihapus: HowItWorksSection, FeaturesSection, CuanEstimatorSection, TransparencySection
```

Section statis tetap Server Component. Hanya pembungkus motion yang `"use client"` dan berukuran leaf. Semua copy dari `LANDING_CONTENT`, diteruskan sebagai props (pola `strict-rules.md` §1).

**Landing motion tokens** (usulan untuk `02-design-tokens.md`, keputusan K2)

```txt
ease enter      expo.out / power3.out
reveal          0.9s sampai 1.1s, offset y 32px
word stagger    0.04s
card stagger    0.08s
trigger         start "top 82%", once: true
scrub           0.8 sampai 1.2 (hanya scene Problem, Escrow, Preview)
hover           0.35s sampai 0.5s
```

### 5.1 Katalog efek motion

Owner meminta landing kaya animasi (2026-10-16). Efek di bawah adalah katalog resmi. Tiap section punya **satu efek utama** dan beberapa efek pendukung, supaya halaman terasa hidup tanpa jadi ramai (aturan `cinematic-gsap-lenis-motion-system`: "too many simultaneous scroll effects" dihindari).

| ID | Efek | Implementasi | Desktop | Mobile / touch | Reduced motion |
|---|---|---|---|---|---|
| M1 | **Curtain wipe** (intro hero) | 2 panel penuh (oranye lalu krem) `yPercent` 0 ke -100, stagger 0,12, total sekitar 0,9 detik. Hanya kunjungan pertama per sesi (`sessionStorage`). | Ya | Ya, lebih cepat (0,6 detik) | Tidak dibuat |
| M2 | **Screen slice** (transisi masuk section gelap) | 6 irisan vertikal navy di tepi atas section, `scaleY` 0 ke 1 dari bawah, stagger 0,05, scrub saat batas section melewati viewport. | Ya | 4 irisan | Pergantian warna langsung |
| M3 | **Curtain transisi halaman** (klik CTA daftar) | Overlay oranye naik menutup layar 0,45 detik, lalu `router.push`. Link tetap `<a href>` biasa sehingga buka tab baru, klik tengah, dan tanpa JS tetap jalan. | Ya | Ya | Navigasi langsung |
| M4 | **Parallax mouse berlapis** | `gsap.quickTo` x/y per lapis, kecepatan beda per lapis, throttle via ticker. | Ya (pointer halus) | Tidak | Tidak dibuat |
| M5 | **Parallax scroll** | `yPercent` per lapis dengan `scrub`, gambar bergerak di dalam mask (`overflow: hidden`). | Ya | Ya, amplitudo setengah | Statis |
| M6 | **Scroll-linked scale** | `scale` + `borderRadius` mengikuti progress scroll (`scrub: 1`). | Ya | Ya, rentang lebih kecil | Statis di skala 1 |
| M7 | **Horizontal scroll section** | Section di-pin, track digeser `xPercent` sejauh lebar track, `scrub: 1`, `invalidateOnRefresh`. Panel dalam track memakai `containerAnimation` untuk reveal-nya. | Ya (>= 1024 px) | Diganti carousel swipe Embla | Daftar vertikal biasa |
| M8 | **Custom cursor trailing** | Dot (`quickTo` 0,15 detik) + ring yang menyusul (`quickTo` 0,4 detik). State: default, `link` (ring membesar 2,2x), `button` (ring berisi label aksi seperti `Mulai`), `media` (label `Lihat` atau `Geser`), disembunyikan di atas input teks. Cursor native **tetap tampil** (follower bersifat tambahan) agar tidak ada risiko kursor hilang. | Ya | Tidak dirender (`(hover: none)` atau `(pointer: coarse)`) | Tidak dirender |
| M9 | **Magnetic button** | Tombol dan isinya tertarik ke pointer (faktor 0,3 dan 0,15), kembali ke posisi dengan `expo.out`. Tidak memakai ease `elastic` atau bounce. | Ya | Tidak | Tidak dibuat |
| M10 | **Liquid fill button** | Lingkaran oranye/navy membesar dari titik masuk pointer (`clip-path: circle()` dari koordinat mouse), menyusut ke titik keluar. Fokus keyboard memakai fill dari tengah. | Ya | Fill dari tengah saat tap | Ganti warna instan |
| M11 | **Hover distortion / liquid image** | Filter SVG `feTurbulence` + `feDisplacementMap` pada gambar, `scale` displacement ditween 0 ke 24 ke 0 saat hover. Filter hanya aktif selama hover, dilepas setelahnya. Opsi WebGL ada di D8. | Ya | Tidak | Tidak dibuat |
| M12 | **Split text reveal** | `SplitText` words + mask lines, `yPercent` 110 ke 0, stagger 0,04, `aria: "auto"`. Dipakai di semua H1/H2. | Ya | Ya | Teks langsung tampil |
| M13 | **Scroll highlight text** | Opasitas warna per kata `neutral-400` ke navy mengikuti scrub. | Ya | Ya | Langsung navy |
| M14 | **Scramble text** | `ScrambleTextPlugin` untuk nominal, ID campaign, dan teks brief AI. Sekali per masuk viewport. | Ya | Ya | Teks final langsung |
| M15 | **Roll text hover** | Label link/tombol diduplikasi, versi atas naik keluar dan versi bawah naik masuk (CSS `translateY`, 0,4 detik). Duplikat `aria-hidden`. | Ya | Tidak (hover saja) | Tidak dibuat |
| M16 | **SVG line draw** | `DrawSVGPlugin` untuk garis alur escrow dan garis bawah kata kunci. | Ya | Ya | Garis penuh |
| M17 | **Stamp** | Stempel status `scale` 1,4 ke 1 + `rotate` -8 ke -3 derajat + sedikit `opacity` flash. | Ya | Ya | Stempel statis |
| M18 | **Sticky stack** | CSS `position: sticky` untuk panel full-viewport, GSAP hanya menambah skala dan redup pada panel yang tertutup. | Ya | Ya, tanpa skala | Panel berurutan |
| M19 | **Velocity marquee** | Loop `xPercent` dengan `timeScale` mengikuti `ScrollTrigger.getVelocity()`, dua baris berlawanan arah. | Ya | Ya | Baris statis |
| M20 | **Spotlight glow** | Radial gradient oranye di section gelap mengikuti pointer (`quickTo` pada CSS variable `--x`/`--y` di satu layer). | Ya | Glow statis | Glow statis |
| M21 | **Tilt card** | Kartu miring maks 6 derajat mengikuti pointer (`rotateX/Y`, `transformPerspective` 800). | Ya | Tidak | Tidak dibuat |
| M22 | **Count up** | Angka simulasi dan nominal nota dihitung naik (`snap: 1`, format Rupiah di `onUpdate` tanpa `setState`). | Ya | Ya | Angka final |
| M23 | **Clip reveal media** | `clipPath: inset(100% 0 0 0)` ke `inset(0)` + `scale` 1,15 ke 1 pada gambar di dalamnya. | Ya | Ya | Langsung tampil |
| M24 | **Footer reveal** | Konten terakhir bergeser naik membuka footer yang `position: sticky; bottom: 0` di belakangnya, wordmark naik dari mask. | Ya | Ya, tanpa sticky | Footer biasa |
| M25 | **Navbar hide/show + section label** | Navbar sembunyi saat scroll turun, muncul saat naik; label section berganti dengan roll text. | Ya | Hide/show saja | Navbar selalu tampil |

GSAP plugin yang dibutuhkan: ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin. Semua ada di paket `gsap` (gratis). Tidak perlu dependency tambahan selain yang sudah disetujui di D1, kecuali opsi WebGL di D8.

### 5.2 Peta motion per section

| Section | Efek utama | Efek pendukung |
|---|---|---|
| Navbar | M25 | M15 di link, M10 + M9 di tombol `Masuk` dan pill audiens |
| Hero | M1 lalu M4 (tiga lapis) | M12 di H1, M6 (frame mengecil 1 ke 0,92 dan radius 28 ke 48 px saat scroll keluar), M5 (kata raksasa `TAYANG.` turun lebih lambat dari HP), M14 di nominal chip, M10 + M9 di CTA |
| Masalah | M13 | M12 di label, M16 garis bawah kata kunci |
| Tiga Pegangan (gelap) | M2 saat masuk | M5 zigzag (kartu tengah lebih cepat), M20 spotlight, M21 tilt kartu |
| Dua Mode | M18 (Campaign ditimpa Rate Card) | M12 heading, M23 mockup di tiap panel, langkah 1 sampai 4 stagger |
| Escrow (gelap) | Pin + nota tercetak (timeline scrub) | M2 saat masuk, M16 garis alur antar langkah, M17 stempel tiap status, M14 + M22 nominal, M20 spotlight di belakang nota |
| Lihat Aplikasinya | M7 horizontal scroll 3 panel | M6 (screenshot pertama membesar 0,85 ke 1 sebelum track mulai bergeser), M11 distortion saat hover screenshot, M8 state `Geser` |
| Untuk UMKM | M18 (lanjutan tumpukan) | M14 brief AI, M5 foto di dalam mask (jika D7b ada), hotspot berdenyut CSS, M11 pada foto |
| Untuk Kreator | M18 (panel terakhir tumpukan) | Carousel drag dengan progress bar, M21 tilt kartu job, M22 simulasi reward, M8 state `Geser` di carousel |
| Konteks | M19 dua baris outline/solid | Pin peta `expo.out`, M23 foto pendiri (jika D7a ada) |
| FAQ | M12 heading | Accordion CSS `grid-template-rows`, M15 di pertanyaan |
| Final CTA | M6 (lembaran membesar 0,9 ke 1 saat masuk) | M12 heading, M10 + M9 + M8 state `button` di dua tombol audiens |
| Footer (gelap) | M24 | Wordmark naik dari mask, jam berganti menit dengan M15 |
| Seluruh halaman | M8 custom cursor | M3 curtain saat klik CTA daftar |

### 5.3 Guardrail motion

- **Satu engine per properti.** GSAP memegang `transform`, `opacity`, `clip-path`. CSS hanya untuk hover sederhana yang tidak disentuh GSAP. Tidak ada Framer Motion di landing.
- **Hanya properti murah** saat scroll: `transform`, `opacity`, `clip-path`. Filter SVG (M11) dan `backdrop-filter` hanya saat hover dan dilepas setelahnya, tidak pernah di-scrub.
- **Pin maksimal 2** (Escrow, Preview), hanya desktop >= 1024 px. Sisanya sticky CSS.
- **Semua efek ber-ID** di atas dibangun di dalam `gsap.matchMedia()` dengan tiga kondisi: `(prefers-reduced-motion: reduce)`, `(hover: hover) and (pointer: fine)`, dan `(min-width: 1024px)`. Kolom Mobile dan Reduced motion di 5.1 adalah perilaku wajib, bukan saran.
- **Konten tidak menunggu animasi.** H1, sub, dan CTA hero ada di HTML server dan bisa diklik sejak awal. M1 menutup layar paling lama 0,9 detik dan hanya sekali per sesi. Dampaknya ke LCP diukur di P4; jika LCP mobile melewati 2,5 detik, M1 dihapus.
- **Pembersihan.** Semua animasi di dalam `useGSAP` dengan scope ref. Cursor, spotlight, dan magnetic melepas listener saat unmount, saat `visibilitychange` hidden, dan saat window blur.
- **Uji di perangkat mid-range Android.** Jika di bawah 50 fps, urutan yang dimatikan di mobile: M5, M21, M2, lalu M18 skala.
- **Overlay global**: `ChatbotFab` dan `FloatingDemoBar` diberi `data-lenis-prevent` di area scroll, z-index di bawah curtain M1/M3 dan di atas konten.

## 6. Plan per section

Bagian "Motion" di tiap section di bawah adalah rincian awal. Jika berbeda, **bagian 5.2 yang berlaku.**

Urutan mengikuti guideline §15 dengan dua penyesuaian: Solution digabung jadi "Tiga Pegangan", dan Social Proof diganti "Konteks" karena belum ada testimoni asli. Semua draft copy di bawah memakai sapaan "kamu", tanpa em dash, tanpa angka yang tidak bersumber.

### 6.0 Navbar

- **Tujuan:** navigasi ringan, CTA daftar selalu terlihat.
- **Konten:** logo, lalu **dua pill audiens** tepat di sebelahnya (pola Sphere): `Saya UMKM` (oranye, ke #umkm) dan `Saya Kreator` (navy, ke #kreator). Di kanan: jam lokal kecil `Sukabumi 13.28 WIB` (pola DontMatter, desktop saja), `Masuk`, dan tombol `Menu` yang membuka panel link anchor `Cara Kerja` (#mode), `Escrow` (#escrow), `FAQ` (#faq). Saat login: `Buka Dashboard` menggantikan `Masuk` (logika auth-aware dipertahankan). `Jelajah`, `Panduan`, `Tentang Kami` keluar dari navbar sampai halamannya nyata.
- **Visual:** pill putih melayang di dalam frame hero (pola Armor), jadi bar solid + border tipis setelah keluar dari hero.
- **Indikator section** (pola DontMatter, desktop): label kecil di navbar berganti sesuai section aktif, misalnya `04 / Escrow`. Tidak memakai dock bawah karena area bawah sudah dipakai `ChatbotFab` dan `FloatingDemoBar`.
- **Motion:** sembunyi saat scroll turun, muncul saat scroll naik (ScrollTrigger `onUpdate` direction). Link anchor memakai `lenis.scrollTo`. Menu buka-tutup CSS. Label section berganti dengan roll-text (teks lama naik keluar, teks baru naik masuk).
- **Mobile:** pill audiens pindah ke bar CTA bawah yang muncul setelah hero lewat: `Buat Campaign` dan `Daftar Kreator`, dengan offset agar tidak menutupi `ChatbotFab`.
- **Perbaikan wajib:** `aria-expanded`, `aria-controls`, `inert` pada menu tertutup, logo 2,3 MB diganti.

### 6.1 Hero

- **Tujuan:** dalam 5 detik pengunjung tahu ini platform UMKM x kreator dan dananya aman.
- **Konten (draft):**
  - Eyebrow: `Platform kolaborasi UMKM dan kreator lokal`
  - H1 opsi A (rekomendasi): `Kreator lokal promosikan produkmu. Dananya ditahan sampai terbukti tayang.`
  - H1 opsi B: `Bayar promosi dari views yang benar-benar tayang.` (fokus Campaign, kurang mewakili Rate Card)
  - H1 opsi C: `Dari kreasi konten jadi omset nyata.` (sama dengan banner KMI; "omset nyata" berbunyi janji hasil, bertentangan dengan `terms.ts:228`)
  - Sub: `Buka campaign yang dibayar per views, atau pesan kreator pilihanmu dengan harga tetap. Uangmu disimpan di escrow Marketiv, bukan langsung ke kreator.`
  - CTA utama: `Mulai Buat Campaign` ke `/register?role=umkm`. CTA kedua: `Daftar sebagai Kreator` ke `/register?role=creator`.
  - Baris kecil di bawah CTA: `Pembayaran lewat Midtrans · Konten di TikTok dan Instagram`
- **Visual (gabungan tiga referensi):**
  - Frame rounded krem dengan radial glow oranye lembut di satu sudut (Armor).
  - Tiga lapis kedalaman (DontMatter): lapis belakang kata raksasa dekoratif `TAYANG.` (Plus Jakarta 800, `primary-100`, `aria-hidden`), lapis tengah mockup HP berisi screenshot asli Job Pool Marketiv, lapis depan 3 chip melayang: `Dana ditahan`, `Bukti tayang terkirim`, `Views tervalidasi`, masing-masing dengan nominal berlabel contoh dalam font mono.
  - H1 semantik di kiri bawah frame, sub dan dua CTA di kanan bawah (komposisi Armor: headline besar kiri, paragraf + CTA kanan).
  - Mobile: kata raksasa diperkecil di belakang HP, chip jadi 2, H1 di atas HP.
- **Motion:** intro timeline 1,2 detik: frame clip-open dari tengah, kata raksasa naik pelan, HP naik, chip muncul stagger 0,08, lalu H1 per kata (mask line), sub, CTA terakhir. Teks sudah terbaca walau timeline belum selesai. Desktop pointer halus: tiga lapis bergerak parallax beda kecepatan (belakang 4 px, HP 8 px, chip 14 px). Saat scroll keluar: kata raksasa turun lebih lambat dari HP (scroll parallax, scrub 1), frame mengecil ke skala 0,96.
- **Catatan:** H1 adalah kandidat LCP, jadi tidak boleh disembunyikan sebelum hydrate. Tidak ada preloader (menahan LCP dan konversi).

### 6.2 Masalah (#masalah)

- **Tujuan:** pengunjung merasa masalahnya dipahami.
- **Konten (draft):**
  - Label: `01 / Masalahnya`
  - Pernyataan besar: `Banyak UMKM sudah keluar uang buat promosi, tapi tidak tahu hasilnya. Banyak kreator bisa bikin konten bagus, tapi belum punya klien pertama.`
  - Dua kolom kecil:
    - UMKM: `Biaya promosi tidak terukur.` / `Susah membedakan kreator asli dan akun buzzer.` / `Bayar di muka tanpa jaminan konten tayang.`
    - Kreator: `Sulit dapat job pertama tanpa portofolio.` / `Negosiasi dan revisi tanpa batas.` / `Pembayaran telat atau tidak cair.`
- **Visual:** tata letak Armor: label kecil di kolom kiri (4 kolom), pernyataan besar di kolom kanan (8 kolom), tanpa gambar. Frasa `tidak tahu hasilnya` dan `belum punya klien pertama` diberi garis bawah oranye tebal (DontMatter). Dua kolom pain kecil di bawah garis pemisah.
- **Motion:** desktop: kata-kata pernyataan berubah dari `neutral-400` ke navy mengikuti scroll (scrub, tanpa pin agar tidak terasa ditahan). Garis bawah tumbuh dari kiri saat frasa aktif (`scaleX`). Mobile: reveal per baris biasa. Reduced motion: semua kata langsung navy, garis bawah langsung penuh.

### 6.3 Tiga Pegangan (#solusi)

- **Tujuan:** tiga alasan inti, sesuai guideline §6.
- **Konten (draft):**
  - Label: `02 / Cara Marketiv menjawabnya`
  - `01 Bayar sesuai hasil.` Di Campaign Mode, reward kreator dihitung dari views yang lolos validasi.
  - `02 Dana ditahan escrow.` Pembayaran lewat Midtrans masuk ke escrow. Kreator menerima dana setelah kerjanya tervalidasi.
  - `03 Kreator lokal dapat kerja.` Kreator mikro bisa klaim job campaign atau membuka rate card sendiri.
- **Visual:** momen gelap pertama (Armor). Lembaran navy dengan glow oranye + grain. Tiga kartu kaca gelap (`white/5`, border `white/10`) disusun **zigzag**: kartu 1 dan 3 sejajar atas, kartu 2 turun 80 px. Judul kartu `01 / Bayar sesuai hasil` dalam mono, ikon Phosphor weight `thin` ukuran besar di tengah kartu, deskripsi di bawah.
- **Motion:** glow oranye bergeser pelan mengikuti scroll (background-position via transform pada layer, scrub). Kartu naik stagger 0,08 dengan offset zigzag ikut bergerak (kartu tengah naik lebih jauh, parallax ringan). Hover CSS: border kartu menyala oranye.

### 6.4 Dua Mode (#mode)

- **Tujuan:** perbedaan dua mode jelas, termasuk aturan chat (wajib, guideline §7).
- **Konten (draft, fakta dari `terms.ts:93-94`):**
  - Label: `03 / Dua cara kerja sama`
  - Heading: `Pilih cara yang cocok dengan budget dan waktumu.`
  - **Campaign Mode, bayar per views:**
    1. UMKM menulis brief (bisa dibantu AI) dan menyetor budget mulai Rp 50.000.
    2. Kreator klaim job. Siapa cepat dia dapat.
    3. Kreator posting di akun TikTok atau Instagram miliknya, lalu kirim link dalam 24 jam.
    4. Views divalidasi, reward masuk ke dompet kreator.
    - Chip aturan: `Tanpa chat` · `Tanpa revisi` · `Kreator dapat reward penuh, biaya platform 2% ditanggung UMKM`
  - **Rate Card Mode, harga tetap:**
    1. UMKM pilih kreator dari katalog dan paketnya.
    2. Pesan langsung, atau negosiasi lewat chat sampai jadi Custom Offer.
    3. UMKM bayar, dana ditahan escrow. Kreator mengerjakan dan posting sebagai Collab Post.
    4. UMKM menyetujui hasil (otomatis disetujui setelah 3 hari jika tidak ada tanggapan), dana dilepas ke kreator.
    - Chip aturan: `Ada chat negosiasi` · `Wajib Collab Post` · `Biaya platform 2% dipotong dari pendapatan kreator`
  - Tabel ringkas perbandingan di bawahnya (semantic `<table>`, untuk pembaca layar dan pembaca cepat).
- **Visual:** dua kartu besar, Campaign berlabel role UMKM oranye, Rate Card berlabel navy.
- **Motion:** pola DontMatter, panel full-viewport ditumpuk dengan CSS `position: sticky` (bukan pin GSAP, lebih ringan dan tidak bentrok dengan Lenis). Panel Campaign menempel, panel Rate Card naik menutupinya. GSAP hanya menambah efek: panel yang tertutup mengecil ke skala 0,94 dan meredup (scrub). Langkah 1 sampai 4 di tiap panel muncul stagger saat panel aktif. Mobile: sticky tetap jalan tapi tanpa efek skala. Reduced motion: dua panel berurutan biasa.

### 6.5 Escrow (#escrow), scene utama

- **Tujuan:** membangun trust. Ini momen paling "Awwwards" di halaman.
- **Konten (draft, fakta dari `terms.ts:104-105, 150, 186`):**
  - Label: `04 / Uangmu ke mana?`
  - Heading: `Uangmu tidak langsung ke kreator. Marketiv menahannya dulu.`
  - Langkah:
    1. `UMKM bayar lewat Midtrans.` Dana masuk escrow. Stempel: `DITAHAN`
    2. `Kreator mengerjakan dan posting.` Konten tayang di akun kreator, link dikirim ke Marketiv.
    3. `Bukti tayang divalidasi.` Campaign divalidasi sistem dan tim Marketiv. Rate Card disetujui UMKM. Stempel: `TERVALIDASI`
    4. `Dana dicairkan ke dompet kreator.` Kreator bisa tarik mulai Rp 50.000. Stempel: `DICAIRKAN`
  - Catatan kecil: `Ada masalah? Ajukan sengketa. Selama ditinjau, dana dibekukan dan tidak bisa dicairkan siapa pun. Jika UMKM menang sengketa atau campaign dihentikan, sisa dana kembali 100% ke dompet UMKM (biaya platform tidak dikembalikan).`
- **Visual:** momen gelap kedua. Lembaran navy dengan glow oranye di belakang nota (Armor). Nota putih krem di tengah (motif struk: tepi bergerigi, angka monospace, garis putus-putus) sehingga kontrasnya paling tinggi di halaman, daftar 4 langkah di kiri dalam teks terang.
- **Motion:** desktop: section di-pin sekitar 250vh. Scroll menggerakkan nota "tercetak" baris demi baris, stempel berganti dengan scale 1,2 ke 1 dan rotasi kecil, langkah aktif di kiri menyala. ScrambleText dipakai sekali untuk nominal saat status berubah. Mobile: tanpa pin, timeline vertikal dengan reveal per langkah, stempel muncul saat langkah masuk viewport. Reduced motion: nota statis menampilkan keempat status sebagai daftar.

### 6.6 Lihat Aplikasinya (#preview)

- **Tujuan:** bukti bahwa produknya ada, sesuai guideline §11.
- **Konten:** 3 screenshot asli dari aplikasi dengan data contoh: Dashboard UMKM, Job Pool Kreator, Keuangan/Escrow. Caption: `Tampilan aplikasi Marketiv. Data pada gambar adalah contoh.`
- **Visual:** frame browser minimal, kartu putih border halus.
- **Motion:** desktop: horizontal scroll pinned (3 panel, scrub). Mobile: carousel swipe biasa (Embla sudah terpasang) atau tumpukan vertikal dengan clip reveal.
- **Aset:** screenshot diambil dari `npm run dev` dengan `NEXT_PUBLIC_USE_MOCK_DATA=true`, ekspor WebP 1600 px, `next/image` lazy.

### 6.7 Untuk UMKM (#umkm)

- **Tujuan:** UMKM merasa prosesnya mudah, sesuai guideline §10.
- **Konten (draft):**
  - Label: `05 / Untuk UMKM`
  - Heading: `Bikin brief, atur budget, lalu pantau hasilnya dari satu dashboard.`
  - Poin: `AI Brief Assistant membantu menulis brief dari deskripsi produkmu.` / `Kamu yang menentukan budget dan tarif per 1.000 views.` / `Pantau setiap bukti tayang yang masuk, tanpa harus mengejar kreator.` / `Sisa budget yang tidak terpakai kembali ke dompetmu.`
  - CTA: `Mulai Buat Campaign`
- **Visual:** panel sticky full-viewport (lanjutan tumpukan Dua Mode, pola DontMatter). Kiri: heading + poin + CTA. Kanan: mockup wizard brief.
- **Opsi hotspot (pola Armor, butuh foto asli):** foto UMKM mitra di tempat usahanya, dengan 3 titik hotspot yang membuka kartu kecil `Brief dibuat`, `Kreator klaim job`, `Bukti tayang masuk`. Hanya dipakai jika owner punya foto asli dengan izin dari UMKM terkait (keputusan D7). Tanpa foto, panel tetap memakai mockup wizard.
- **Motion:** teks brief muncul dengan efek ketik (ScrambleText), sekali saat masuk viewport. Hotspot berdenyut pelan (CSS `scale`, berhenti saat reduced motion), kartu hotspot terbuka dengan klik atau fokus keyboard, bukan hover saja.

### 6.8 Untuk Kreator (#kreator)

- **Tujuan:** kreator melihat peluang kerja tanpa janji penghasilan, sesuai guideline §9.
- **Konten (draft):**
  - Label: `06 / Untuk Kreator`
  - Heading: `Ambil job dari UMKM, atau buka rate card sendiri.`
  - Poin: `Klaim campaign yang cocok dengan nichemu di Job Pool.` / `Buat sampai 3 paket rate card dengan harga tetap.` / `Setiap job selesai jadi portofolio di profilmu.` / `Tarik saldo mulai Rp 50.000 ke rekening bank atau e-wallet.`
  - **Simulasi reward** (pengganti kalkulator lama): dua input, `Views` (slider) dan `Tarif per 1.000 views` (input angka, contoh awal ditandai "contoh"). Output: `Simulasi reward: Rp X`. Rumus ditampilkan. Catatan: `Ini simulasi. Tarif ditentukan oleh tiap campaign dan reward hanya dihitung dari views yang lolos validasi.` Tidak ada "Rp 500 Juta+", tidak ada "CPM rata-rata Marketiv".
  - CTA: `Daftar sebagai Kreator`
- **Visual:** panel sticky terakhir dalam tumpukan. **Carousel kartu Job Pool** (pola kartu lowongan Sphere): badge `Baru`, ID campaign mono, baris meta berikon (kategori, platform TikTok/Instagram, tarif per 1.000 views, sisa kuota), tombol `Lihat Detail`. Header carousel memakai progress bar + tombol panah. Semua kartu berlabel `Contoh campaign`. Di bawahnya kartu simulasi berbentuk nota.
- **Motion:** carousel digeser dengan drag/swipe atau panah (Embla yang sudah terpasang), progress bar ikut. Kartu masuk stagger saat panel aktif. Angka hasil simulasi beranimasi count (GSAP, teks saja), bukan remount.
- **A11y:** slider punya `<label>`, output memakai `aria-live="polite"`.

### 6.9 Konteks (#konteks), pengganti social proof

- **Tujuan:** kredibilitas yang jujur.
- **Konten (draft, semua perlu konfirmasi owner):**
  - `Dibangun di Sukabumi untuk UMKM daerah.`
  - `Bagian dari Program P2MW [tahun] bersama Universitas Nusa Putra.`
  - `Mendukung SDG 8: membuka kerja layak bagi kreator lokal dan memperkuat ekonomi UMKM.` (dari banner KMI)
  - Marquee kategori UMKM yang dilayani, misalnya kuliner, kopi, fashion, kriya, kecantikan (owner konfirmasi daftarnya).
  - **Peta dengan satu pin** (pola Armor, versi jujur): siluet Pulau Jawa, satu pin di Sukabumi berlabel `Mulai dari sini`. Pin bertambah hanya jika ada data kota aktif yang asli.
  - **Catatan pendiri** (pola Sphere): foto asli pendiri, kutipan 2 sampai 3 kalimat yang ditulis sendiri oleh owner, nama dan jabatan. Menggantikan testimoni sampai ada pengguna yang bersedia dikutip (keputusan D7).
- **Visual:** baris kategori dibuat dua baris wordmark besar bergantian outline dan solid (pola Armor), misalnya `KULINER  KOPI  FASHION` lalu `KRIYA  KECANTIKAN  JASA`.
- **Motion:** marquee berbasis scroll velocity seperti portfolio F-007, baris atas dan bawah berlawanan arah, melambat saat hover, statis saat reduced motion. Pin peta turun ke posisinya dengan `expo.out` sekali saat masuk viewport (tanpa bounce, sesuai motion taste skill).
- **Dilarang:** logo wall, testimoni, jumlah pengguna, sampai ada data asli.

### 6.10 FAQ (#faq)

- **Tujuan:** menjawab ketakutan utama, sesuai guideline §13.
- **Pertanyaan (jawaban disusun dari `terms.ts`):**
  1. `Bagaimana dana saya diamankan?`
  2. `Kapan kreator menerima bayaran?`
  3. `Apakah UMKM dan kreator bisa chat?` (Campaign tidak, Rate Card ya)
  4. `Bagaimana cara membuat campaign?`
  5. `Bagaimana kreator mengirim bukti tayang?`
  6. `Berapa biaya platform Marketiv?` (2%, siapa yang menanggung per mode)
  7. `Bagaimana cara menarik saldo?`
- **Motion:** accordion CSS `grid-template-rows: 0fr` ke `1fr`, ikon plus berputar. Header reveal per kata.
- **A11y:** `<button aria-expanded>` + `aria-controls`; semua tertutup di awal kecuali pertama.

### 6.11 Final CTA

- **Tujuan:** mengulang pilihan role, sesuai guideline §14.
- **Konten (draft):**
  - Heading: `Mulai dari peranmu.`
  - Kartu UMKM: `Punya produk yang perlu dikenal lebih banyak orang?` CTA `Mulai Buat Campaign`
  - Kartu Kreator: `Punya skill bikin konten dan mau dibayar dengan aman?` CTA `Daftar sebagai Kreator`
- **Visual:** pola Sphere: lembaran besar dengan gradient hangat (`primary-100` ke `primary-300`, satu arah, tanpa blob) yang menimpa footer navy. Heading terpusat dengan satu kata beraksen, dua tombol audiens berdampingan dengan warna yang sama seperti pill di navbar.
- **Motion:** heading reveal per kata, dua tombol masuk stagger, tombol magnetic di pointer halus.

### 6.12 Footer

- **Konten:** logo, satu kalimat deskripsi tanpa klaim "terpercaya", link (Cara Kerja, FAQ, Syarat & Ketentuan, Kebijakan Privasi), email `hello@marketiv.id`, WhatsApp asli (perlu nomor dari owner), Instagram `@marketiv_id`, baris P2MW, copyright.
- **Kalimat hidup** (pola DontMatter): `Sekarang pukul 13.28 WIB di Sukabumi. Tim kami membalas pesan maksimal 3 hari kerja.` Jam dihitung di client dari zona `Asia/Jakarta`; janji balasan diambil dari SLA `terms.ts:254`. Tidak ada data cuaca (butuh API dan tidak menambah trust).
- **Visual:** momen gelap ketiga, navy `secondary-900`, wordmark "marketiv" raksasa selebar layar di dasar.
- **Motion:** footer reveal: konten di atasnya bergeser naik, wordmark naik dari mask (scrub pendek). Jam berganti menit dengan roll-text.

## 7. Aturan copy

- Bahasa Indonesia sepenuhnya. Istilah produk yang memang dipakai di aplikasi tetap: Campaign Mode, Rate Card Mode, Collab Post, escrow, Job Pool.
- Satu istilah per konsep: "kreator" (bukan "konten kreator" atau "kreator konten"), "bukti tayang", "dompet", "dicairkan".
- Status pakai bahasa Indonesia: Menunggu, Disetujui, Ditolak.
- Sentence case untuk heading dan subjudul. Label kecil boleh uppercase.
- Tanpa angka, testimoni, atau klaim volume yang tidak bersumber. Semua angka di mockup diberi label "contoh".
- Tanpa janji hasil penjualan atau penghasilan (`terms.ts:228`).
- Satu file sumber: `src/data/content.ts`.

## 8. Anggaran performa dan aksesibilitas

| Target | Nilai |
|---|---|
| LCP mobile | di bawah 2,5 detik (`06-performance-and-scalability.md`) |
| CLS | di bawah 0,1 |
| JS tambahan landing | GSAP core + ScrollTrigger + SplitText + ScrambleText + DrawSVG + Lenis + kode motion (cursor, magnetic, liquid fill), perkiraan 50 sampai 65 KB gzip (estimasi; ukur dengan output build di P4) |
| Frame rate | Target 60 fps desktop, minimal 50 fps di Android mid-range saat scroll scene Escrow dan Preview |
| Gambar | Tidak ada gambar hero raster. Screenshot preview WebP lazy. Logo diganti versi ringan. |
| Animasi | Hanya `transform`, `opacity`, `clip-path` singkat. Tidak ada animasi `width` atau `height` saat scroll. |
| Pin | Hanya 2 scene memakai pin GSAP (Escrow, Preview), desktop >= 1024 px. Tumpukan Dua Mode, Untuk UMKM, Untuk Kreator memakai CSS `position: sticky`. Scene Masalah memakai scrub tanpa pin. |
| Viewport uji | 375, 768, 1024, 1440 px. |
| A11y | Fokus terlihat, urutan tab logis, SplitText dengan `aria: "auto"`, kontras AA, semua interaksi bisa keyboard, konten utuh tanpa JS dan dengan reduced motion. |

## 9. Fase eksekusi

| Fase | Isi | Selesai bila |
|---|---|---|
| P0 Keputusan | Owner menjawab bagian 10, menyerahkan aset (maskot, nomor WA, konfirmasi P2MW). | Semua D1 sampai D6 terjawab. |
| P1 Fondasi | Install dependency, `src/lib/gsap.ts`, motion primitives, tipe dan `LANDING_CONTENT` baru, `page.tsx` dengan semua section **statis** (tanpa animasi). | Typecheck, lint, build hijau. Halaman lengkap dan terbaca di 375 sampai 1440 px tanpa motion. |
| P2 Copy dan visual | Semua section final secara visual dan copy, Navbar dan Footer baru, screenshot preview. | Review owner atas copy dan tampilan statis. |
| P3a Motion inti | Primitives M12, M13, M14, M16, M17, M22, M23; sticky stack M18; pin Escrow; horizontal Preview M7; scroll-linked scale M6; parallax M5; marquee M19; footer reveal M24; navbar M25. | Semua efek punya jalur mobile dan reduced motion sesuai tabel 5.1. |
| P3b Motion interaksi | Curtain M1, screen slice M2, curtain halaman M3, parallax mouse M4, cursor M8, magnetic M9, liquid fill M10, distortion M11, roll text M15, spotlight M20, tilt M21. | Semua efek mati di touch dan reduced motion; listener dilepas saat unmount. |
| P4 QA | Keyboard, reduced motion, tanpa JS, mobile, Lighthouse, cek overlay ChatbotFab. Update test `landing-auth-visibility.test.tsx` untuk teks CTA baru. | `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` hijau dan hasilnya dicatat. |
| P5 Dokumen | Update `07-landing-page-guidelines.md` (urutan section, §19), tambah landing motion tokens di `02-design-tokens.md`, hapus section lama. | Docs dan kode sinkron. |

Satu PR per fase ke `staging` supaya review tetap kecil.

**Di luar cakupan, dicatat sebagai task terpisah:**

- `layout.tsx` memakai `.className` bukan `.variable` untuk Plus Jakarta Sans, dan `--font-plus-jakarta-sans` di `globals.css:207` merujuk dirinya sendiri. Akibatnya `font-display` (Sora) di 71 file kemungkinan tidak pernah tampil. Memperbaikinya akan mengubah tampilan dashboard, jadi perlu keputusan sendiri.
- `<html lang="en">` dan meta description bahasa Inggris (berlaku global).
- `images.unoptimized: true` di `next.config.ts` (berlaku global).
- Duplikasi `framer-motion` dan `motion` di `package.json`.
- Halaman placeholder `tentang-kami`, `jelajah`, `kebijakan-privasi`, dan `/panduan` yang redirect ke dashboard UMKM.
- `scripts/animation-audit.js` tidak mendeteksi `useInView` dan regex `whileInView\s*\(` tidak pernah cocok.

## 10. Keputusan owner

| # | Pertanyaan | Status |
|---|---|---|
| D1 | Setuju menambah `gsap`, `@gsap/react`, `lenis` ke `package.json`? | **Disetujui** owner, 2026-10-16. Memenuhi K4. |
| D2 | Arah H1 hero: A, B, atau C? | **A**, 2026-10-16. |
| D3 | Tambah font monospace (JetBrains Mono via `next/font`) untuk angka dan nota? | **Disetujui**, khusus landing, 2026-10-16. |
| D4 | Ada file PNG transparan maskot dari banner KMI? | Terbuka. Jika ada, dipakai di hero dan Final CTA. Jika tidak, landing tetap jalan dengan UI produk. Tidak memblokir P1. |
| D5 | Data asli: nomor WhatsApp admin, tahun P2MW (2025 atau 2026), daftar kategori UMKM, dan apakah ada angka nyata (jumlah UMKM/kreator terdaftar) yang boleh ditampilkan? | Terbuka. Memblokir copy final Footer dan section Konteks (P2), tidak memblokir P1. |
| D6 | Konflik K1: lanjut revamp motion-led walau guideline §19 menyarankan menunda? | **Lanjut.** Owner, 2026-10-16: MVP sudah selesai, landing dibuat sebagus mungkin. Premis §19 tidak berlaku lagi; §19 dan §15 diperbarui di P5. |
| D8 | Hover distortion (M11) cukup dengan filter SVG, atau pakai WebGL (shader displacement) lewat library kecil seperti `ogl`? | Mulai dengan filter SVG (tanpa dependency baru). WebGL hanya jika hasil SVG kurang halus setelah dicoba di P3; dependency baru tetap butuh persetujuan owner. |
| D7 | Foto asli: (a) foto pendiri + kutipan yang ditulis owner untuk Catatan Pendiri, (b) foto UMKM mitra di tempat usahanya (dengan izin) untuk hotspot Untuk UMKM. | Terbuka. Tanpa (a), Catatan Pendiri dihapus. Tanpa (b), panel UMKM memakai mockup wizard. Tidak memblokir P1. |
