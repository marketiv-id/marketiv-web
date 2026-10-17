import type { LandingContent, LandingNavContent } from "@/types/landing";

export const NAVBAR_CONTENT: LandingNavContent = {
  skipLink: "Langsung ke konten",
  mainLabel: "Navigasi utama",
  homeLabel: "Marketiv, ke beranda",
  openMenuLabel: "Buka menu navigasi",
  closeMenuLabel: "Tutup menu navigasi",
  menu: [
    { label: "Cara kerja", href: "/#mode" },
    { label: "Escrow", href: "/#escrow" },
    { label: "Untuk UMKM", href: "/#umkm" },
    { label: "Untuk kreator", href: "/#kreator" },
    { label: "FAQ", href: "/#faq" },
  ],
  menuLabel: "Menu",
  closeLabel: "Tutup",
  login: "Masuk",
  register: "Daftar",
  registerMobile: "Daftar",
  dashboard: "Dashboard",
};

// Facts on this page come from src/content/terms.ts; mockup numbers are labelled "Contoh" on screen.
export const LANDING_CONTENT: LandingContent = {
  hero: {
    meta: ["Marketplace UMKM × kreator lokal", "Campaign Mode · Rate Card Mode", "Sukabumi, Jawa Barat"],
    titleLead: "Kreator lokal promosikan produkmu.",
    titleRest: "Dananya ditahan sampai",
    titleAccent: "terbukti tayang.",
    subtitle:
      "Pilih campaign yang dibayar per views atau pesan kreator dengan harga tetap. Dananya disimpan escrow, bukan langsung ke kreator.",
    ctaUmkm: "Mulai Buat Campaign",
    ctaCreator: "Daftar sebagai Kreator",
    dashboardCta: "Buka Dashboard",
    proof: ["Pembayaran lewat Midtrans", "Konten tayang di TikTok dan Instagram", "Biaya platform 2%"],
    // Photos are Unsplash illustrations of the setting, not Marketiv users; credits are in docs/landing-revamp/PLAN.md.
    strip: [
      { kind: "photo", src: "/landing/photos/umkm-penjual-jagung.webp", alt: "Pedagang jagung di Lombok memegang dagangannya" },
      { kind: "screen", src: "/landing/renders/phone-kreator.webp", alt: "Layar ringkasan kreator di aplikasi Marketiv, data contoh" },
      { kind: "photo", src: "/landing/photos/kategori-handmade.webp", alt: "Perempuan membatik kain dengan canting" },
      { kind: "photo", src: "/landing/photos/kreator-dslr.webp", alt: "Perempuan berhijab memegang kamera di jembatan gantung" },
      { kind: "screen", src: "/landing/renders/phone-buat.webp", alt: "Layar Buat Kampanye Baru di aplikasi Marketiv, data contoh" },
      { kind: "photo", src: "/landing/photos/kategori-kosmetik.webp", alt: "Produk perawatan kulit dengan daun hijau" },
    ],
    stripCaption: "Foto ilustrasi dari Unsplash, layar aplikasi berisi data contoh",
  },
  problem: {
    label: "Masalah",
    statement: [
      { text: "Banyak UMKM sudah keluar uang buat promosi, tapi " },
      { text: "tidak tahu hasilnya", mark: true },
      { text: ". Banyak kreator bisa bikin konten bagus, tapi " },
      { text: "belum punya klien pertama", mark: true },
      { text: "." },
    ],
    umkm: {
      title: "Yang dirasakan UMKM",
      items: [
        "Biaya promosi tidak terukur.",
        "Susah membedakan kreator asli dan akun buzzer.",
        "Bayar di muka tanpa kepastian konten tayang.",
      ],
    },
    kreator: {
      title: "Yang dirasakan kreator",
      items: [
        "Sulit dapat job pertama tanpa portofolio.",
        "Negosiasi dan revisi tanpa batas.",
        "Pembayaran telat atau tidak cair.",
      ],
    },
  },
  pillars: {
    label: "Solusi",
    titleLead: "Tiga pegangan supaya promosi",
    titleAccent: "tidak boncos.",
    intro: "Uang UMKM aman, hasil kampanye terukur, dan kreator lokal dapat pekerjaan yang jelas.",
    items: [
      {
        title: "Dana ditahan escrow",
        description: "Pembayaran lewat Midtrans masuk ke escrow. Kreator menerima dana setelah kerjanya tervalidasi.",
        image: "/landing/umkm-dashboard.webp",
        imageAlt: "Ringkasan kampanye dan dana berjalan di dashboard UMKM, data contoh",
      },
      {
        title: "Bayar sesuai hasil",
        description: "Di Campaign Mode, reward kreator dihitung dari views yang lolos validasi.",
        image: "/landing/kreator-jobpool.webp",
        imageAlt: "Lowongan kampanye dengan imbalan per 1.000 tayangan, data contoh",
      },
      {
        title: "Kreator lokal dapat kerja",
        description: "Kreator mikro bisa klaim job campaign atau membuka rate card sendiri.",
        image: "/landing/photos/kreator-dslr.webp",
        imageAlt: "Perempuan berhijab memegang kamera di jembatan gantung",
      },
    ],
  },
  modes: {
    label: "Cara kerja",
    titleLead: "Pilih cara yang cocok dengan",
    titleAccent: "budget dan waktumu.",
    intro: "Dua mode, satu escrow. Campaign Mode untuk jangkauan luas, Rate Card Mode untuk kreator yang sudah kamu pilih.",
    campaign: {
      id: "campaign",
      tag: "Campaign Mode",
      title: "Bayar per views",
      audience: "Untuk UMKM yang ingin jangkauan luas tanpa memilih kreator satu per satu.",
      steps: [
        "UMKM menulis brief, bisa dibantu AI, lalu menyetor budget mulai Rp 50.000.",
        "Kreator klaim job. Siapa cepat dia dapat.",
        "Kreator posting di akun TikTok atau Instagram miliknya, lalu kirim link dalam 24 jam.",
        "Views divalidasi, reward masuk ke dompet kreator.",
      ],
      rules: ["Tanpa chat", "Tanpa revisi", "Divalidasi sistem dan tim Marketiv", "Biaya platform 2% ditanggung UMKM"],
      tone: "umkm",
      image: "/landing/renders/phone-buat.webp",
      imageAlt: "Layar Buat Kampanye Baru di aplikasi Marketiv, data contoh",
    },
    rateCard: {
      id: "rate-card",
      tag: "Rate Card Mode",
      title: "Harga tetap",
      audience: "Untuk UMKM yang sudah tahu kreator mana yang cocok dengan produknya.",
      steps: [
        "UMKM memilih kreator dan paketnya dari katalog.",
        "Pesan langsung, atau negosiasi lewat chat sampai jadi Custom Offer.",
        "UMKM bayar, dana ditahan escrow. Kreator mengerjakan dan posting sebagai Collab Post.",
        "UMKM menyetujui hasil, atau otomatis disetujui setelah 3 hari tanpa tanggapan. Dana dilepas ke kreator.",
      ],
      rules: ["Ada chat negosiasi", "Revisi sesuai batas paket", "Disetujui UMKM", "Biaya platform 2% dipotong dari pendapatan kreator"],
      tone: "kreator",
      image: "/landing/renders/phone-nego.webp",
      imageAlt: "Layar Negosiasi Paket Harga di aplikasi Marketiv, data contoh",
    },
  },
  escrow: {
    label: "Uangmu ke mana?",
    titleLead: "Uangmu tidak langsung ke kreator.",
    titleAccent: "Marketiv menahannya dulu.",
    steps: [
      {
        title: "UMKM bayar lewat Midtrans",
        description: "Dana masuk ke escrow Marketiv, bukan ke rekening kreator.",
        stamp: "DITAHAN",
      },
      {
        title: "Kreator mengerjakan dan posting",
        description: "Konten tayang di akun kreator, lalu link-nya dikirim ke Marketiv.",
        stamp: null,
      },
      {
        title: "Bukti tayang divalidasi",
        description: "Campaign divalidasi sistem dan tim Marketiv. Rate Card disetujui oleh UMKM.",
        stamp: "TERVALIDASI",
      },
      {
        title: "Dana dicairkan ke dompet kreator",
        description: "Kreator bisa menarik saldo mulai Rp 50.000 ke rekening bank atau e-wallet.",
        stamp: "DICAIRKAN",
      },
    ],
    receipt: {
      title: "Nota Escrow",
      code: "ESC-0001",
      rows: [
        { label: "Mode", value: "Rate Card" },
        { label: "Paket", value: "1 video TikTok" },
        { label: "Metode", value: "Midtrans" },
      ],
      totalLabel: "Dana ditahan",
      totalValue: "Rp 750.000",
      sampleLabel: "Contoh",
    },
    disputeNote:
      "Ada masalah? Ajukan sengketa. Selama ditinjau, dana dibekukan dan tidak bisa dicairkan siapa pun. Jika UMKM menang sengketa atau campaign dihentikan, sisa dana kembali 100% ke dompet UMKM. Biaya platform yang sudah terpakai tidak dikembalikan.",
  },
  preview: {
    label: "Lihat aplikasinya",
    titleLead: "Bukan janji di brosur.",
    titleAccent: "Aplikasinya sudah jalan.",
    intro: "Dua tampilan yang paling sering dibuka: ringkasan UMKM dan lowongan kampanye untuk kreator.",
    caption: "Tampilan aplikasi Marketiv. Data pada gambar adalah contoh.",
    panels: [
      {
        id: "umkm",
        tag: "Dashboard UMKM",
        title: "Pantau kampanye, tayangan, dan dana dalam satu layar.",
        description: "Ringkasan kampanye aktif, total tayangan, kreator yang ikut, dan dana yang sedang berjalan.",
        image: "/landing/umkm-dashboard.webp",
        alt: "Dashboard UMKM Marketiv berisi ringkasan kampanye, tayangan, dan dana berjalan, data contoh",
      },
      {
        id: "kreator",
        tag: "Lowongan Kreator",
        title: "Kreator memilih kampanye yang cocok, lalu klaim.",
        description: "Setiap lowongan menampilkan imbalan per 1.000 tayangan, kategori, dan sisa kuota.",
        image: "/landing/kreator-jobpool.webp",
        alt: "Halaman lowongan kampanye untuk kreator di Marketiv, data contoh",
      },
    ],
  },
  umkm: {
    label: "Untuk UMKM",
    titleLead: "Bikin brief, atur budget, lalu",
    titleAccent: "pantau hasilnya.",
    points: [
      "AI Brief Assistant membantu menulis brief dari deskripsi produkmu.",
      "Kamu yang menentukan budget dan tarif per 1.000 views.",
      "Pantau setiap bukti tayang yang masuk tanpa harus mengejar kreator.",
      "Sisa budget yang tidak terpakai kembali ke dompetmu.",
    ],
    cta: "Mulai Buat Campaign",
    image: "/landing/renders/phone-keuangan.webp",
    imageAlt: "Layar Keuangan Saya di aplikasi Marketiv untuk UMKM, data contoh",
    // Unsplash, foto oleh @p_kuzovkova (Lombok). Ilustrasi suasana, bukan pengguna Marketiv.
    photo: "/landing/photos/umkm-penjual-jagung.webp",
    photoAlt: "Pedagang jagung di Lombok memegang dagangannya",
    photoCaption: "Ilustrasi · Pedagang jagung, Lombok",
    // Unsplash, foto oleh @anisa_flg. Ilustrasi suasana, bukan pengguna Marketiv.
    secondPhoto: "/landing/photos/kategori-handmade.webp",
    secondPhotoAlt: "Perempuan membatik kain dengan canting",
    brief: {
      title: "Contoh saran brief dari AI",
      meta: [
        { label: "Produk", value: "Sambal roa pedas" },
        { label: "Budget", value: "Rp 500.000" },
        { label: "Tarif", value: "Rp 15.000 per 1.000 views" },
      ],
      text: "Tunjukkan reaksi pertama saat mencoba sambal, sebut level pedasnya, lalu tutup dengan cara pesan. Durasi 15 sampai 30 detik.",
      sampleLabel: "Contoh",
    },
  },
  kreator: {
    label: "Untuk kreator",
    titleLead: "Ambil job dari UMKM, atau",
    titleAccent: "buka rate card sendiri.",
    points: [
      "Klaim campaign yang cocok dengan nichemu di Job Pool.",
      "Buat sampai 3 paket rate card dengan harga tetap.",
      "Setiap job selesai jadi portofolio di profilmu.",
      "Tarik saldo mulai Rp 50.000 ke rekening bank atau e-wallet.",
    ],
    cta: "Daftar sebagai Kreator",
    jobImage: "/landing/renders/phone-kreator.webp",
    jobImageAlt: "Layar ringkasan kreator di aplikasi Marketiv, data contoh",
    // Unsplash, foto oleh @mruqi (Bandung). Ilustrasi suasana, bukan pengguna Marketiv.
    photo: "/landing/photos/kreator-dslr.webp",
    photoAlt: "Perempuan berhijab memegang kamera di jembatan gantung",
    photoCaption: "Ilustrasi · Kreator, Bandung",
    simulator: {
      title: "Simulasi reward campaign",
      viewsLabel: "Views yang lolos validasi",
      rateLabel: "Tarif per 1.000 views",
      resultLabel: "Simulasi reward",
      formulaLabel: "Rumus",
      note: "Ini simulasi, bukan jaminan penghasilan. Tarif ditentukan oleh tiap campaign dan reward hanya dihitung dari views yang lolos validasi.",
      defaultViews: 50000,
      minViews: 1000,
      maxViews: 500000,
      stepViews: 1000,
      defaultRate: 15000,
      minRate: 1000,
      maxRate: 50000,
    },
  },
  context: {
    label: "Konteks",
    titleLead: "Dibangun di Sukabumi,",
    titleAccent: "untuk UMKM daerah.",
    facts: [
      "Bagian dari Program P2MW bersama Universitas Nusa Putra.",
      "Mendukung SDG 8: membuka kerja layak bagi kreator lokal dan memperkuat ekonomi UMKM.",
    ],
    mapLabel: "Mulai dari sini",
    mapCity: "Sukabumi",
    mapRegion: "Jawa Barat",
    coordinates: "6°55′ LS · 106°56′ BT",
    // Same niche list as NICHE_OPTIONS in the create-campaign form.
    categoriesTop: ["Kuliner", "Fashion", "Kecantikan", "Pariwisata", "Edukasi"],
    categoriesBottom: ["TikTok", "Instagram", "Campaign Mode", "Rate Card"],
    categoriesTitle: "Niche yang bisa dipilih saat membuat campaign",
    categoriesNote: "Foto ilustrasi dari Unsplash",
    categoryCards: [
      { label: "Kuliner", description: "Makanan dan minuman" },
      { label: "Fashion", description: "Pakaian dan aksesori", image: "/landing/photos/kategori-fashion.webp", imageAlt: "Kain batik motif bunga dan burung" },
      { label: "Kecantikan", description: "Kosmetik dan skin care", image: "/landing/photos/kategori-kosmetik.webp", imageAlt: "Produk perawatan kulit dengan daun hijau" },
      { label: "Lainnya", description: "Pariwisata, edukasi, serta umum dan jasa" },
    ],
  },
  faq: {
    label: "FAQ",
    title: "Pertanyaan yang sering ditanyakan",
    contactTitle: "Belum terjawab?",
    contactText: "Kirim pertanyaanmu lewat email. Tim kami membalas paling lambat 3 hari kerja.",
    contactEmail: "hello@marketiv.id",
    items: [
      {
        q: "Bagaimana dana saya diamankan?",
        a: "Pembayaran lewat Midtrans masuk ke escrow Marketiv, tidak langsung ke kreator. Status escrow hanya diubah oleh sistem dan admin Marketiv. Dana dilepas setelah bukti tayang tervalidasi atau pekerjaan disetujui.",
      },
      {
        q: "Kapan kreator menerima bayaran?",
        a: "Di Campaign Mode, reward masuk ke dompet kreator setelah bukti tayang tervalidasi. Di Rate Card Mode, dana dilepas setelah UMKM menyetujui hasil, atau otomatis setelah 3 hari jika UMKM tidak menanggapi.",
      },
      {
        q: "Apakah UMKM dan kreator bisa chat?",
        a: "Di Campaign Mode tidak ada chat sama sekali, supaya tidak ada drama revisi. Di Rate Card Mode ada chat untuk negosiasi harga dan deliverable sampai menjadi Custom Offer.",
      },
      {
        q: "Bagaimana cara membuat campaign?",
        a: "Daftar sebagai UMKM, tulis brief produkmu (AI Brief Assistant bisa membantu), tentukan budget mulai Rp 50.000 dan tarif per 1.000 views, lalu bayar lewat Midtrans. Setelah dana masuk, publikasikan campaign dan campaign-mu tampil di Job Pool kreator.",
      },
      {
        q: "Bagaimana kreator mengirim bukti tayang?",
        a: "Setelah klaim job, kreator posting di akun TikTok atau Instagram miliknya, lalu mengirim URL publik postingan dalam 24 jam. Video tidak boleh dihapus selama masa verifikasi.",
      },
      {
        q: "Berapa biaya platform Marketiv?",
        a: "2% per transaksi. Di Campaign Mode, biaya ditanggung UMKM saat menyetor budget dan kreator menerima reward penuh. Di Rate Card Mode, UMKM membayar sesuai harga paket dan 2% dipotong dari pendapatan kreator saat dana dilepas.",
      },
      {
        q: "Bagaimana cara menarik saldo?",
        a: "Saldo bisa ditarik mulai Rp 50.000 per transaksi ke rekening bank atau e-wallet. Penarikan Rp 5.000.000 atau lebih melalui verifikasi manual oleh admin Marketiv.",
      },
    ],
  },
  finalCta: {
    titleLead: "Mulai dari",
    titleAccent: "peranmu.",
    subtitle: "Daftar gratis. Kamu baru membayar saat membuat campaign atau memesan kreator.",
    umkm: { prompt: "Punya produk yang perlu dikenal lebih banyak orang?", cta: "Mulai Buat Campaign" },
    kreator: { prompt: "Bisa bikin konten dan ingin dibayar dengan aman?", cta: "Daftar sebagai Kreator" },
  },
  footer: {
    tagline: "Marketplace yang mempertemukan UMKM dengan kreator lokal, dengan dana yang ditahan escrow sampai kerjanya terbukti.",
    liveLine: {
      prefix: "Sekarang pukul",
      city: "Sukabumi",
      suffix: "Tim kami membalas pesan paling lambat 3 hari kerja.",
    },
    nav: {
      title: "Jelajahi",
      links: [
        { label: "Cara kerja", href: "/#mode" },
        { label: "Escrow", href: "/#escrow" },
        { label: "Untuk UMKM", href: "/#umkm" },
        { label: "Untuk kreator", href: "/#kreator" },
        { label: "FAQ", href: "/#faq" },
      ],
    },
    legal: {
      title: "Legal",
      links: [
        { label: "Syarat & Ketentuan", href: "/syarat-ketentuan" },
        { label: "Kebijakan Privasi", href: "/kebijakan-privasi" },
      ],
    },
    contact: {
      title: "Kontak",
      email: "hello@marketiv.id",
      instagram: "@marketiv_id",
      instagramHref: "https://www.instagram.com/marketiv_id/",
    },
    program: "Didukung Program P2MW",
    copyright: "© 2026 Marketiv.",
    wordmark: "marketiv",
  },
};

export const UMKM_CONTENT = {
  hero: {
    title: "Temukan Kolaborasi Bisnis Impianmu",
    subtitle: "Jelajahi berbagai campaign konten kreator untuk promosi produk yang lebih berdampak",
    searchPlaceholder: "Cari Campaign.........",
  },
  grid: {
    title: "Temuan Campaign UMKM",
  },
};

export const CREATOR_CONTENT = {
  hero: {
    title: "Temukan Campaign untuk Konten Kreator",
    subtitle: "Jelajahi campaign dari UMKM dan dapatkan kesempatan kolaborasi yang menguntungkan",
    searchPlaceholder: "Search Campaign...",
  },
  grid: {
    title: "Temuan Campaign Konten Kreator",
  },
};

export const CARD_CONTENT = {
  labels: {
    rate: "Rate",
    minView: "Min. View",
    budgetUsed: "Budget Terpakai",
    from: "dari",
    ctaPrimary: "Ambil Campaign",
    ctaSecondary: "Detail",
  },
};
