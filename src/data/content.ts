import type { LandingContent, LandingNavContent } from "@/types/landing";

export const NAVBAR_CONTENT: LandingNavContent = {
  skipLink: "Langsung ke konten",
  mainLabel: "Navigasi utama",
  homeLabel: "Marketiv, ke beranda",
  openMenuLabel: "Buka menu navigasi",
  closeMenuLabel: "Tutup menu navigasi",
  audienceUmkm: { label: "Saya UMKM", href: "/#umkm" },
  audienceKreator: { label: "Saya Kreator", href: "/#kreator" },
  menu: [
    { label: "Cara kerja", href: "/#mode" },
    { label: "Escrow", href: "/#escrow" },
    { label: "Lihat aplikasi", href: "/#preview" },
    { label: "FAQ", href: "/#faq" },
  ],
  menuLabel: "Menu",
  closeLabel: "Tutup",
  login: "Masuk",
  register: "Daftar",
  registerMobile: "Daftar Sekarang",
  dashboard: "Dashboard",
  clockCity: "Sukabumi",
  mobileCtaUmkm: { label: "Buat Campaign", href: "/register?role=umkm" },
  mobileCtaKreator: { label: "Daftar Kreator", href: "/register?role=creator" },
};

// Facts on this page come from src/content/terms.ts; mockup numbers are labelled "Contoh" on screen.
export const LANDING_CONTENT: LandingContent = {
  hero: {
    eyebrow: "Platform kolaborasi UMKM dan kreator lokal",
    titleLead: "Kreator lokal promosikan produkmu.",
    titleRest: "Dananya ditahan sampai",
    titleAccent: "terbukti tayang.",
    subtitle:
      "Buka campaign yang dibayar per views, atau pesan kreator pilihanmu dengan harga tetap. Uangmu disimpan di escrow Marketiv, bukan langsung ke kreator.",
    ctaUmkm: "Mulai Buat Campaign",
    ctaCreator: "Daftar sebagai Kreator",
    dashboardCta: "Buka Dashboard",
    note: "Pembayaran lewat Midtrans · Konten di TikTok dan Instagram",
    backdropWord: "TAYANG",
    sampleLabel: "Contoh",
    chips: [
      { label: "Dana ditahan", value: "Rp 1.500.000", tone: "navy" },
      { label: "Bukti tayang terkirim", value: "tiktok.com/@kreator", tone: "white" },
      { label: "Views tervalidasi", value: "100.000", tone: "orange" },
    ],
    phone: {
      title: "Lowongan Kampanye",
      subtitle: "Pilih kampanye UMKM yang cocok",
      image: "/landing/jobpool-card.webp",
      imageAlt: "Kartu lowongan kampanye di aplikasi Marketiv, data contoh",
    },
  },
  problem: {
    label: "01 / Masalahnya",
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
    label: "02 / Cara Marketiv menjawabnya",
    titleLead: "Tiga pegangan supaya promosi",
    titleAccent: "tidak boncos.",
    items: [
      {
        no: "01",
        title: "Bayar sesuai hasil",
        description: "Di Campaign Mode, reward kreator dihitung dari views yang lolos validasi.",
        icon: "chart",
      },
      {
        no: "02",
        title: "Dana ditahan escrow",
        description: "Pembayaran lewat Midtrans masuk ke escrow. Kreator menerima dana setelah kerjanya tervalidasi.",
        icon: "shield",
      },
      {
        no: "03",
        title: "Kreator lokal dapat kerja",
        description: "Kreator mikro bisa klaim job campaign atau membuka rate card sendiri.",
        icon: "users",
      },
    ],
  },
  modes: {
    label: "03 / Dua cara kerja sama",
    titleLead: "Pilih cara yang cocok dengan",
    titleAccent: "budget dan waktumu.",
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
      rules: ["Tanpa chat", "Tanpa revisi", "Biaya platform 2% ditanggung UMKM"],
      tone: "umkm",
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
      rules: ["Ada chat negosiasi", "Wajib Collab Post", "Biaya platform 2% dipotong dari pendapatan kreator"],
      tone: "kreator",
    },
    compare: {
      caption: "Perbandingan Campaign Mode dan Rate Card Mode",
      headers: ["", "Campaign Mode", "Rate Card Mode"],
      rows: [
        ["Cara bayar", "Per 1.000 views tervalidasi", "Harga tetap per paket"],
        ["Chat dengan kreator", "Tidak ada", "Ada, untuk negosiasi"],
        ["Revisi", "Tidak ada", "Sesuai batas paket"],
        ["Yang menyetujui hasil", "Sistem dan tim Marketiv", "UMKM, otomatis setelah 3 hari"],
        ["Biaya platform 2%", "Ditanggung UMKM", "Dipotong dari pendapatan kreator"],
        ["Tempat posting", "Akun kreator", "Collab Post di akun kreator dan UMKM"],
      ],
    },
  },
  escrow: {
    label: "04 / Uangmu ke mana?",
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
    label: "05 / Lihat aplikasinya",
    titleLead: "Bukan janji di brosur.",
    titleAccent: "Aplikasinya sudah jalan.",
    intro: "Dua tampilan yang paling sering dibuka: ringkasan UMKM dan lowongan kampanye untuk kreator.",
    caption: "Tampilan aplikasi Marketiv. Data pada gambar adalah contoh.",
    scrollHint: "Scroll untuk menggeser",
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
    label: "06 / Untuk UMKM",
    titleLead: "Bikin brief, atur budget, lalu",
    titleAccent: "pantau hasilnya.",
    points: [
      "AI Brief Assistant membantu menulis brief dari deskripsi produkmu.",
      "Kamu yang menentukan budget dan tarif per 1.000 views.",
      "Pantau setiap bukti tayang yang masuk tanpa harus mengejar kreator.",
      "Sisa budget yang tidak terpakai kembali ke dompetmu.",
    ],
    cta: "Mulai Buat Campaign",
    brief: {
      title: "Buat Campaign",
      productLabel: "Produk",
      productValue: "Sambal roa pedas",
      budgetLabel: "Budget",
      budgetValue: "Rp 500.000",
      rateLabel: "Tarif per 1.000 views",
      rateValue: "Rp 15.000",
      aiLabel: "Saran brief dari AI",
      aiText:
        "Tunjukkan reaksi pertama saat mencoba sambal, sebut level pedasnya, dan tutup dengan cara pesan. Durasi 15 sampai 30 detik.",
      sampleLabel: "Contoh",
    },
  },
  kreator: {
    label: "07 / Untuk kreator",
    titleLead: "Ambil job dari UMKM, atau",
    titleAccent: "buka rate card sendiri.",
    points: [
      "Klaim campaign yang cocok dengan nichemu di Job Pool.",
      "Buat sampai 3 paket rate card dengan harga tetap.",
      "Setiap job selesai jadi portofolio di profilmu.",
      "Tarik saldo mulai Rp 50.000 ke rekening bank atau e-wallet.",
    ],
    cta: "Daftar sebagai Kreator",
    jobsTitle: "Lowongan di Job Pool",
    jobsSampleLabel: "Contoh campaign",
    jobCta: "Lihat Detail",
    jobLabels: {
      badge: "Baru",
      category: "Kategori",
      platform: "Platform",
      quota: "Sisa",
      perViews: "per 1.000 views",
      previous: "Lowongan sebelumnya",
      next: "Lowongan berikutnya",
    },
    jobs: [
      { id: "CMP-1042", title: "Review jujur sambal roa", brand: "Dapur rumahan", category: "Kuliner", platform: "TikTok", rate: "Rp 15.000", quota: "3 kuota" },
      { id: "CMP-1043", title: "Koleksi kemeja batik", brand: "Butik batik tulis", category: "Fashion", platform: "Instagram", rate: "Rp 20.000", quota: "2 kuota" },
      { id: "CMP-1044", title: "Unboxing tas anyaman", brand: "Kriya lokal", category: "Handmade", platform: "TikTok", rate: "Rp 12.000", quota: "4 kuota" },
      { id: "CMP-1045", title: "Rutinitas skincare pagi", brand: "Brand kosmetik lokal", category: "Kosmetik", platform: "Instagram", rate: "Rp 18.000", quota: "2 kuota" },
    ],
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
    label: "08 / Dari mana kami mulai",
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
    categoriesTop: ["Kuliner", "Fashion", "Handmade", "Kosmetik"],
    categoriesBottom: ["TikTok", "Instagram", "Campaign Mode", "Rate Card"],
  },
  faq: {
    label: "09 / FAQ",
    title: "Pertanyaan yang sering ditanyakan",
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
