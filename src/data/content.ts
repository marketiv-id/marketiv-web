import type { LandingContent, LandingNavContent } from "@/types/landing";

export const NAVBAR_CONTENT: LandingNavContent = {
  skipLink: "Langsung ke konten",
  mainLabel: "Navigasi utama",
  homeLabel: "Marketiv, ke beranda",
  openMenuLabel: "Buka menu navigasi",
  closeMenuLabel: "Tutup menu navigasi",
  menu: [
    { label: "Cara kerja", href: "/#mode" },
    { label: "Dana Aman", href: "/#escrow" },
    { label: "Untuk UMKM", href: "/#umkm" },
    { label: "Untuk kreator", href: "/#kreator" },
    { label: "Tanya jawab", href: "/#faq" },
  ],
  menuLabel: "Menu",
  closeLabel: "Tutup",
  login: "Masuk",
  register: "Daftar",
  registerMobile: "Daftar",
  dashboard: "Dasbor",
};

// Facts on this page come from src/content/terms.ts; mockup numbers are labelled "Contoh" on screen.
export const LANDING_CONTENT: LandingContent = {
  hero: {
    // Taglines from the owner's KMI EXPO booth banner and table banner, so the hero speaks in the brand's own voice.
    meta: ["Kolaborasi hebat, bisnis melesat", "Mode Kampanye · Mode Paket Harga", "Berkarya · Terhubung · Bertumbuh"],
    titleLead: "Dari kreasi konten jadi omset nyata.",
    titleRest: "Kreator lokal promosikan produkmu, dananya ditahan sampai",
    titleAccent: "terbukti tayang.",
    subtitle:
      "Marketiv mempertemukan UMKM dengan kreator lokal di seluruh Indonesia. Pilih kampanye yang dibayar per tayangan, atau pesan kreator dengan harga tetap lewat Paket Harga.",
    ctaUmkm: "Mulai Buat Kampanye",
    ctaCreator: "Daftar sebagai Kreator",
    dashboardCta: "Buka Dasbor",
    proof: ["Pembayaran lewat Midtrans", "Konten tayang di TikTok dan Instagram", "Biaya layanan 2%"],
    // Photos are Unsplash illustrations of the setting, not Marketiv users; credits are in docs/landing-revamp/PLAN.md.
    strip: [
      { kind: "photo", src: "/landing/photos/umkm-penjual-jagung.webp", alt: "Pedagang jagung di Lombok memegang dagangannya" },
      { kind: "screen", src: "/landing/renders/phone-kreator.webp", alt: "Layar ringkasan kreator di aplikasi Marketiv, data contoh" },
      { kind: "photo", src: "/landing/photos/kategori-handmade.webp", alt: "Perempuan membatik kain dengan canting" },
      { kind: "photo", src: "/landing/photos/kreator-dslr.webp", alt: "Perempuan berhijab memegang kamera di jembatan gantung" },
      { kind: "screen", src: "/landing/renders/phone-umkm.webp", alt: "Layar ringkasan UMKM di aplikasi Marketiv, data contoh" },
      { kind: "photo", src: "/landing/photos/kategori-kosmetik.webp", alt: "Produk perawatan kulit dengan daun hijau" },
    ],
    stripCaption: "Layar aplikasi berisi data contoh",
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
        "Susah membedakan kreator asli dan akun pendengung bayaran.",
        "Bayar di muka tanpa kepastian konten tayang.",
      ],
    },
    kreator: {
      title: "Yang dirasakan kreator",
      items: [
        "Sulit dapat pekerjaan pertama tanpa portofolio.",
        "Negosiasi dan revisi tanpa batas.",
        "Pembayaran telat atau tidak cair.",
      ],
    },
  },
  pillars: {
    label: "Solusi",
    titleLead: "Tiga pegangan supaya promosi",
    titleAccent: "tidak boncos.",
    intro: "Uang UMKM ditahan dulu sampai konten tayang, hasil kampanye terukur, dan kreator mikro dapat pekerjaan yang jelas.",
    items: [
      {
        title: "Dana ditahan dulu",
        description: "Pembayaran lewat Midtrans masuk ke Dana Aman Marketiv. Kreator baru menerima dana setelah kerjanya tervalidasi atau disetujui UMKM.",
        image: "/landing/pillar-escrow.webp",
        imageAlt: "Kartu Sistem Dana Aman di aplikasi Marketiv: dana disimpan, ditahan, lalu dicairkan ke kreator",
      },
      {
        title: "Bayar sesuai hasil",
        description: "Di Mode Kampanye, imbalan kreator dihitung dari tayangan yang lolos validasi.",
        image: "/landing/pillar-views.webp",
        imageAlt: "Kartu lowongan kampanye dengan imbalan Rp 20.000 per 1.000 tayangan, data contoh",
      },
      {
        title: "Kreator dapat pekerjaan",
        description: "Kreator mikro bisa mengambil kampanye di menu Lowongan, atau membuka Paket Harga sendiri dengan tarif tetap.",
        image: "/landing/photos/kreator-dslr.webp",
        imageAlt: "Perempuan berhijab memegang kamera di jembatan gantung",
      },
    ],
  },
  modes: {
    label: "Cara kerja",
    titleLead: "Pilih cara yang cocok dengan",
    titleAccent: "anggaran dan waktumu.",
    intro: "Dua mode, satu Dana Aman. Mode Kampanye untuk jangkauan luas, Mode Paket Harga untuk kreator yang sudah kamu pilih.",
    campaign: {
      id: "campaign",
      tag: "Mode Kampanye",
      title: "Bayar per tayangan",
      audience: "Untuk UMKM yang ingin jangkauan luas tanpa memilih kreator satu per satu.",
      steps: [
        "UMKM menulis arahan konten, bisa dibantu AI, lalu menyetor anggaran mulai Rp 50.000.",
        "Kreator mengambil lowongan. Siapa cepat dia dapat.",
        "Kreator mengunggah konten di akun TikTok atau Instagram miliknya, lalu mengirim tautannya dalam 24 jam.",
        "Tayangan divalidasi, imbalan masuk ke dompet kreator.",
      ],
      rules: ["Tanpa obrolan", "Tanpa revisi", "Divalidasi sistem dan tim Marketiv", "Biaya layanan 2% ditanggung UMKM"],
      tone: "umkm",
      image: "/landing/renders/phone-jobpool.webp",
      imageAlt: "Layar Lowongan Kampanye dengan imbalan per 1.000 tayangan di aplikasi Marketiv, data contoh",
    },
    rateCard: {
      id: "rate-card",
      tag: "Mode Paket Harga",
      title: "Harga tetap",
      audience: "Untuk UMKM yang sudah tahu kreator mana yang cocok dengan produknya.",
      steps: [
        "UMKM memilih kreator dan paketnya dari katalog.",
        "Pesan langsung, atau tawar lewat obrolan sampai jadi Penawaran Khusus.",
        "UMKM bayar, dana ditahan di Dana Aman. Kreator mengerjakan lalu mengunggahnya sebagai Postingan Bersama, jadi tampil di akun kreator dan akun UMKM.",
        "UMKM menyetujui hasil, atau otomatis disetujui setelah 3 hari tanpa tanggapan. Dana dilepas ke kreator.",
      ],
      rules: ["Ada obrolan untuk tawar-menawar", "Revisi sesuai batas paket", "Disetujui UMKM", "Biaya layanan 2% dipotong dari pendapatan kreator"],
      tone: "kreator",
      image: "/landing/renders/phone-ratecard.webp",
      imageAlt: "Layar Paket Harga Jasa kreator di aplikasi Marketiv, data contoh",
    },
  },
  escrow: {
    label: "Uangmu ke mana?",
    titleLead: "Uangmu tidak langsung ke kreator.",
    titleAccent: "Marketiv menahannya dulu.",
    steps: [
      {
        title: "UMKM bayar lewat Midtrans",
        description: "Dana masuk ke Dana Aman Marketiv, bukan ke rekening kreator.",
        stamp: "DITAHAN",
      },
      {
        title: "Kreator membuat dan mengunggah konten",
        description: "Konten tayang di akun kreator, lalu tautannya dikirim ke Marketiv.",
        stamp: null,
      },
      {
        title: "Bukti tayang divalidasi",
        description: "Kampanye divalidasi sistem dan tim Marketiv. Pesanan Paket Harga disetujui oleh UMKM.",
        stamp: "TERVALIDASI",
      },
      {
        title: "Dana dicairkan ke dompet kreator",
        description: "Kreator bisa menarik saldo mulai Rp 50.000 ke rekening bank atau dompet digital.",
        stamp: "DICAIRKAN",
      },
    ],
    receipt: {
      title: "Nota Dana Aman",
      code: "DA-0001",
      rows: [
        { label: "Mode", value: "Paket Harga" },
        { label: "Paket", value: "1 video TikTok" },
        { label: "Metode", value: "Midtrans" },
      ],
      totalLabel: "Dana ditahan",
      totalValue: "Rp 750.000",
      sampleLabel: "Contoh",
    },
    disputeNote:
      "Ada masalah? Ajukan sengketa. Selama ditinjau, dana dibekukan dan tidak bisa dicairkan siapa pun. Jika UMKM menang sengketa atau kampanye dihentikan, sisa dana kembali 100% ke dompet UMKM. Biaya layanan yang sudah terpakai tidak dikembalikan.",
  },
  preview: {
    label: "Lihat aplikasinya",
    titleLead: "Lihat langsung,",
    titleAccent: "aplikasinya sudah jalan.",
    intro: "Dua layar utama: ringkasan kampanye untuk UMKM dan daftar lowongan untuk kreator.",
    caption: "Tampilan aplikasi Marketiv. Data pada gambar adalah contoh.",
    panels: [
      {
        id: "umkm",
        tag: "Dasbor UMKM",
        title: "Pantau kampanye, tayangan, dan dana dalam satu layar.",
        description: "Ringkasan kampanye aktif, total tayangan, kreator yang ikut, dan dana yang sedang berjalan.",
        image: "/landing/umkm-dashboard.webp",
        alt: "Dasbor UMKM Marketiv berisi ringkasan kampanye, tayangan, dan dana berjalan, data contoh",
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
    titleLead: "Tulis arahan, atur anggaran, lalu",
    titleAccent: "pantau hasilnya.",
    points: [
      "Asisten AI membantu menulis arahan konten dari deskripsi produkmu.",
      "Kamu yang menentukan anggaran dan tarif per 1.000 tayangan.",
      "Pantau setiap bukti tayang yang masuk tanpa harus mengejar kreator.",
      "Sisa anggaran yang tidak terpakai kembali ke dompetmu.",
    ],
    cta: "Mulai Buat Kampanye",
    image: "/landing/renders/phone-keuangan.webp",
    imageAlt: "Layar Keuangan Saya di aplikasi Marketiv untuk UMKM, data contoh",
    // Unsplash, foto oleh @p_kuzovkova (Lombok). Ilustrasi suasana, bukan pengguna Marketiv.
    photo: "/landing/photos/umkm-penjual-jagung.webp",
    photoAlt: "Pedagang jagung di Lombok memegang dagangannya",
    // Unsplash, foto oleh @anisa_flg. Ilustrasi suasana, bukan pengguna Marketiv.
    secondPhoto: "/landing/photos/kategori-handmade.webp",
    secondPhotoAlt: "Perempuan membatik kain dengan canting",
    brief: {
      title: "Contoh arahan konten dari AI",
      meta: [
        { label: "Produk", value: "Sambal roa pedas" },
        { label: "Anggaran", value: "Rp 500.000" },
        { label: "Tarif", value: "Rp 15.000 per 1.000 tayangan" },
      ],
      text: "Tunjukkan reaksi pertama saat mencoba sambal, sebut level pedasnya, lalu tutup dengan cara pesan. Durasi 15 sampai 30 detik.",
      sampleLabel: "Contoh",
    },
  },
  kreator: {
    label: "Untuk kreator",
    titleLead: "Ambil kampanye dari UMKM, atau",
    titleAccent: "buka paket harga sendiri.",
    points: [
      "Ambil kampanye yang cocok dengan kategorimu di menu Lowongan.",
      "Buat sampai 3 paket harga dengan tarif tetap.",
      "Setiap pekerjaan yang selesai masuk ke portofolio di profilmu.",
      "Tarik saldo mulai Rp 50.000 ke rekening bank atau dompet digital.",
    ],
    cta: "Daftar sebagai Kreator",
    jobImage: "/landing/renders/phone-dompet.webp",
    jobImageAlt: "Layar Keuangan dan Dompet kreator dengan saldo siap ditarik, data contoh",
    // Unsplash, foto oleh @mruqi (Bandung). Ilustrasi suasana, bukan pengguna Marketiv.
    photo: "/landing/photos/kreator-dslr.webp",
    photoAlt: "Perempuan berhijab memegang kamera di jembatan gantung",
    simulator: {
      title: "Simulasi imbalan kampanye",
      viewsLabel: "Tayangan yang lolos validasi",
      rateLabel: "Tarif per 1.000 tayangan",
      resultLabel: "Simulasi imbalan",
      formulaLabel: "Rumus",
      note: "Ini simulasi, bukan jaminan penghasilan. Tarif ditentukan oleh tiap kampanye dan imbalan hanya dihitung dari tayangan yang lolos validasi.",
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
    label: "Asal dan jangkauan",
    titleLead: "Dibangun di Sukabumi,",
    titleAccent: "terbuka untuk Indonesia.",
    intro:
      "Tim Marketiv berbasis di Sukabumi, tapi pendaftarannya tidak dibatasi wilayah. UMKM dan kreator dari kota mana pun bisa bergabung, membuat kampanye, dan bertransaksi sepenuhnya daring.",
    origin: {
      label: "Berawal dari",
      city: "Sukabumi",
      region: "Jawa Barat",
      coordinates: "6°55′ LS · 106°56′ BT",
      text: "Dikembangkan oleh mahasiswa Universitas Nusa Putra.",
    },
    // Registration is not region-gated; the create-campaign form lets UMKM narrow creators by domicile (ProductInfoStep).
    reach: {
      label: "Terbuka untuk",
      title: "Seluruh Indonesia",
      text: "Usahamu hanya melayani daerah tertentu? Pilih domisili kreator saat membuat kampanye.",
      chips: ["Daftar daring", "Transaksi daring", "Saring domisili kreator"],
    },
    program: {
      label: "Program",
      title: "P2MW",
      text: "Bagian dari Program Pembinaan Mahasiswa Wirausaha bersama Universitas Nusa Putra.",
    },
    sdg: {
      label: "Mendukung",
      number: "8",
      title: "Pekerjaan layak dan pertumbuhan ekonomi",
      text: "Membuka kerja layak bagi kreator mikro dan memperkuat ekonomi UMKM.",
    },
    // Same niche list as NICHE_OPTIONS in the create-campaign form.
    categoriesTop: ["Kuliner", "Busana", "Kecantikan", "Pariwisata", "Edukasi"],
    categoriesBottom: ["TikTok", "Instagram", "Mode Kampanye", "Paket Harga"],
    categoriesTitle: "Kategori yang bisa dipilih saat membuat kampanye",
    categoryCards: [
      { label: "Kuliner", description: "Makanan dan minuman", image: "/landing/photos/kategori-kuliner.webp", imageAlt: "Pedagang soto melayani pembeli di gerobak biru" },
      { label: "Busana", description: "Pakaian dan aksesori", image: "/landing/photos/kategori-fashion.webp", imageAlt: "Kain batik motif bunga dan burung" },
      { label: "Kecantikan", description: "Kosmetik dan perawatan kulit", image: "/landing/photos/kategori-kosmetik.webp", imageAlt: "Produk perawatan kulit dengan daun hijau" },
      {
        label: "Lainnya",
        description: "Pariwisata, edukasi, serta umum dan jasa",
        images: [
          { src: "/landing/photos/kategori-pariwisata.webp", alt: "Pura Ulun Danu Bratan di tepi danau, Bali" },
          { src: "/landing/photos/kategori-edukasi.webp", alt: "Guru berhijab mendampingi murid sekolah dasar belajar" },
          { src: "/landing/photos/kategori-jasa.webp", alt: "Tukang cukur melayani pelanggan di pinggir jalan" },
          { src: "/landing/photos/kategori-umum.webp", alt: "Warung dengan angklung gantung dan rak minuman di Bali" },
        ],
      },
    ],
  },
  // Source: about-me/09_ACHIEVEMENT_EVIDENCE_LOG.md entry 1 (VERIFIED).
  achievement: {
    label: "Prestasi",
    titleLead: "Juara Harapan 2",
    titleAccent: "KMI EXPO 2026.",
    intro: "Marketiv mewakili Universitas Nusa Putra di KMI EXPO XVII 2026 dan meraih Juara Harapan 2 di Kategori Bisnis Digital Tahapan Awal.",
    facts: [
      { label: "Penghargaan", value: "Juara Harapan 2" },
      { label: "Kategori", value: "Bisnis Digital, Tahapan Awal" },
      { label: "Tempat", value: "Universitas Jenderal Soedirman, Purwokerto" },
      { label: "Tanggal", value: "29 September sampai 1 Oktober 2026" },
    ],
    // Team photos from the owner (p2mw-tim-1..3). Order fits the collage: landscape, portrait, landscape.
    photos: [
      {
        src: "/landing/prestasi/tim-panggung-kmi.webp",
        alt: "Tim Marketiv bersama kontingen Universitas Nusa Putra berfoto di depan panggung KMI EXPO XVII 2026 dengan papan Juara Harapan 2 dan bendera kampus",
        caption: "Bersama kontingen Nusa Putra",
        note: "Panggung KMI EXPO XVII",
        width: 1280,
        height: 720,
      },
      {
        src: "/landing/prestasi/tim-tribun-unsoed.webp",
        alt: "Tiga anggota tim Marketiv di tribun Universitas Jenderal Soedirman memegang piala, bendera Universitas Nusa Putra, dan papan Juara Harapan 2",
        caption: "Piala pulang ke Sukabumi",
        note: "Unsoed, Purwokerto",
        width: 900,
        height: 1200,
      },
      {
        src: "/landing/prestasi/tim-penyerahan-juara.webp",
        alt: "Penyerahan papan Juara Harapan 2 Kategori Bisnis Digital Tahapan Awal kepada tim Marketiv",
        caption: "Penyerahan Juara Harapan 2",
        note: "1 Oktober 2026",
        width: 1200,
        height: 676,
      },
    ],
    badge: { top: "Juara Harapan 2", bottom: "KMI EXPO 2026" },
  },
  faq: {
    label: "Tanya jawab",
    title: "Pertanyaan yang sering ditanyakan",
    contactTitle: "Belum terjawab?",
    contactText: "Kirim pertanyaanmu lewat surel. Tim kami membalas paling lambat 3 hari kerja.",
    contactEmail: "hello@marketiv.id",
    items: [
      {
        q: "Bagaimana dana saya diamankan?",
        a: "Pembayaran lewat Midtrans masuk ke Dana Aman Marketiv, tidak langsung ke kreator. Status Dana Aman hanya diubah oleh sistem dan admin Marketiv. Dana dilepas setelah bukti tayang tervalidasi atau pekerjaan disetujui.",
      },
      {
        q: "Kapan kreator menerima bayaran?",
        a: "Di Mode Kampanye, imbalan masuk ke dompet kreator setelah bukti tayang tervalidasi. Di Mode Paket Harga, dana dilepas setelah UMKM menyetujui hasil, atau otomatis setelah 3 hari jika UMKM tidak menanggapi.",
      },
      {
        q: "Apakah UMKM dan kreator bisa saling berkirim pesan?",
        a: "Di Mode Kampanye tidak ada obrolan sama sekali, supaya tidak ada drama revisi. Di Mode Paket Harga ada obrolan untuk tawar-menawar harga dan hasil kerja sampai menjadi Penawaran Khusus.",
      },
      {
        q: "Bagaimana cara membuat kampanye?",
        a: "Daftar sebagai UMKM, tulis arahan untuk produkmu (asisten AI bisa membantu), tentukan anggaran mulai Rp 50.000 dan tarif per 1.000 tayangan, lalu bayar lewat Midtrans. Setelah dana masuk, terbitkan kampanye supaya tampil di menu Lowongan kreator.",
      },
      {
        q: "Bagaimana kreator mengirim bukti tayang?",
        a: "Setelah mengambil lowongan, kreator mengunggah konten di akun TikTok atau Instagram miliknya, lalu mengirim tautan publik postingan dalam 24 jam. Video tidak boleh dihapus selama masa verifikasi.",
      },
      {
        q: "Berapa biaya layanan Marketiv?",
        a: "2% per transaksi. Di Mode Kampanye, biaya ditanggung UMKM saat menyetor anggaran dan kreator menerima imbalan penuh. Di Mode Paket Harga, UMKM membayar sesuai harga paket dan 2% dipotong dari pendapatan kreator saat dana dilepas.",
      },
      {
        q: "Bagaimana cara menarik saldo?",
        a: "Saldo bisa ditarik mulai Rp 50.000 per transaksi ke rekening bank atau dompet digital. Penarikan Rp 5.000.000 atau lebih melalui verifikasi manual oleh admin Marketiv.",
      },
    ],
  },
  finalCta: {
    titleLead: "Mulai dari",
    titleAccent: "peranmu.",
    subtitle: "Daftar gratis. Kamu baru membayar saat membuat kampanye atau memesan kreator.",
    umkm: {
      name: "UMKM",
      prompt: "Punya produk yang perlu dikenal lebih banyak orang?",
      cta: "Mulai Buat Kampanye",
      mascot: { src: "/brand/maskot-umkm.webp", alt: "Maskot Marketiv, burung hantu oranye bertopi yang sedang melihat ponsel" },
    },
    kreator: {
      name: "Kreator",
      prompt: "Bisa bikin konten dan ingin dibayar dengan aman?",
      cta: "Daftar sebagai Kreator",
      mascot: { src: "/brand/maskot-kreator.webp", alt: "Maskot Marketiv, burung hantu oranye berkacamata yang memegang kamera dan mengacungkan jempol" },
    },
  },
  footer: {
    tagline: "Pasar daring yang mempertemukan UMKM dengan kreator mikro di seluruh Indonesia. Dana ditahan sampai kerjanya terbukti.",
    liveLine: {
      city: "Sukabumi",
      suffix: "Ada pertanyaan soal kampanye, paket harga, atau pencairan dana? Kirim pesan, kami balas paling lambat 3 hari kerja.",
    },
    nav: {
      title: "Jelajahi",
      links: [
        { label: "Cara kerja", href: "/#mode" },
        { label: "Dana Aman", href: "/#escrow" },
        { label: "Untuk UMKM", href: "/#umkm" },
        { label: "Untuk kreator", href: "/#kreator" },
        { label: "Tanya jawab", href: "/#faq" },
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
