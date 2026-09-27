import Link from "next/link";
import { ArrowRight, Store, Video, CheckCircle2 } from "lucide-react";
import { routes } from "@/lib/constants/routes";

const ROLES = [
  {
    role: "umkm" as const,
    icon: Store,
    title: "Pemilik UMKM",
    tagline: "Kelola bisnis & temukan kreator konten berkualitas",
    cta: "Daftar Jadi Pemilik UMKM",
    bullets: [
      "Buat campaign PPV dengan anggaran fleksibel",
      "Akses direktori kreator terverifikasi",
      "Pembayaran aman via sistem escrow",
      "Pantau performa konten secara real-time",
    ],
    cardGradient: "from-orange-500/10 via-amber-500/5 to-white",
    border: "border-orange-200/80 hover:border-orange-500/80 hover:shadow-orange-500/10",
    iconBg: "from-orange-400 to-orange-600 text-white shadow-orange-500/20",
    ctaClass: "bg-orange-500 hover:bg-orange-600 focus-visible:outline-orange-500/40 shadow-orange-500/20",
    badge: "bg-orange-100/80 text-orange-800 border-orange-200",
    badgeLabel: "Untuk Bisnis",
    accentDot: "bg-orange-500",
  },
  {
    role: "creator" as const,
    icon: Video,
    title: "Konten Kreator",
    tagline: "Ubah kontenmu jadi penghasilan",
    cta: "Daftar Jadi Kreator",
    bullets: [
      "Ambil campaign dari UMKM yang sedang aktif",
      "Buat & jual rate card paket kontenmu",
      "Terima pembayaran langsung ke saldo",
      "Cairkan penghasilan kapan saja tanpa ribet",
    ],
    cardGradient: "from-violet-500/10 via-indigo-500/5 to-white",
    border: "border-violet-200/80 hover:border-violet-500/80 hover:shadow-violet-500/10",
    iconBg: "from-violet-500 to-blue-600 text-white shadow-violet-500/20",
    ctaClass: "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 focus-visible:outline-violet-500/40 shadow-violet-500/20",
    badge: "bg-violet-100/80 text-violet-800 border-violet-200",
    badgeLabel: "Untuk Kreator",
    accentDot: "bg-violet-500",
  },
] as const;

/**
 * Halaman pilih peran di /register (tanpa ?role=).
 * Tampilan kartu split terinspirasi Konten.com dengan token visual Marketiv.
 */
export function RoleChooser() {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center px-4 py-4">
      {/* Header */}
      <div className="mb-8 text-center max-w-lg">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-1 text-xs font-[800] text-orange-700 mb-3">
          ✨ Selamat Datang di Marketiv
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-[900] leading-tight tracking-tight text-ink-900">
          Kamu ingin daftar sebagai apa?
        </h1>
        <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-ink-500">
          Pilih peranmu untuk mulai. Profil bisa dilengkapi nanti.
        </p>
      </div>

      {/* Role cards grid */}
      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
        {ROLES.map(
          ({
            role,
            icon: IconComp,
            title,
            tagline,
            cta,
            bullets,
            cardGradient,
            border,
            iconBg,
            ctaClass,
            badge,
            badgeLabel,
            accentDot,
          }) => (
            <div
              key={role}
              className={`group flex flex-col justify-between rounded-3xl border bg-gradient-to-b ${cardGradient} ${border} p-6 sm:p-7 shadow-soft-1 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl`}
            >
              {/* Card Header */}
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${iconBg} shadow-md transition-transform duration-300 group-hover:scale-110`}>
                    <IconComp className="h-6 w-6" />
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[0.68rem] font-[800] ${badge}`}>
                    {badgeLabel}
                  </span>
                </div>

                <h2 className="font-display text-xl font-[900] tracking-tight text-ink-900">
                  {title}
                </h2>
                <p className="mt-1 text-xs font-medium leading-snug text-ink-500">
                  {tagline}
                </p>

                {/* Benefits */}
                <ul className="my-6 space-y-2.5">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 text-ink-400 ${accentDot.replace('bg-', 'text-')}`} />
                      <span className="text-xs font-semibold leading-snug text-ink-700">
                        {b}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <Link
                href={routes.registerWithRole(role)}
                className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-xs sm:text-sm font-[800] text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${ctaClass}`}
              >
                {cta}
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-xs font-semibold text-ink-500">
        Sudah punya akun?{" "}
        <Link href={routes.login} className="font-[800] text-orange-600 hover:underline">
          Masuk Sekarang
        </Link>
      </p>
    </div>
  );
}
