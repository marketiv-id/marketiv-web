import type { Metadata } from "next";
import { Navbar } from "@/components/layouts/Navbar";
import { Footer } from "@/components/layouts/Footer";
import { HeroSection } from "@/components/features/landing/HeroSection";
import { ProblemSection } from "@/components/features/landing/ProblemSection";
import { PillarsSection } from "@/components/features/landing/PillarsSection";
import { ModesSection } from "@/components/features/landing/ModesSection";
import { EscrowSection } from "@/components/features/landing/EscrowSection";
import { PreviewSection } from "@/components/features/landing/PreviewSection";
import { AudienceSection } from "@/components/features/landing/AudienceSection";
import { ContextSection } from "@/components/features/landing/ContextSection";
import { FAQSection } from "@/components/features/landing/FAQSection";
import { FinalCtaSection } from "@/components/features/landing/FinalCtaSection";
import { landingMono } from "@/components/features/landing/fonts";
import { SmoothScroll } from "@/components/features/landing/motion/SmoothScroll";
import { SectionObserver } from "@/components/features/landing/motion/SectionObserver";
import { Cursor } from "@/components/features/landing/motion/Cursor";
import { IntroCurtain } from "@/components/features/landing/motion/IntroCurtain";
import { PageCurtain } from "@/components/features/landing/motion/PageCurtain";
import { INTRO_INLINE_SCRIPT } from "@/components/features/landing/motion/intro-state";
import { LANDING_CONTENT, NAVBAR_CONTENT } from "@/data/content";

export const metadata: Metadata = {
  title: "Marketiv | Promosi UMKM lewat kreator lokal, dana aman di escrow",
  description:
    "Marketiv mempertemukan UMKM dengan kreator lokal lewat Campaign Mode yang dibayar per views dan Rate Card Mode dengan harga tetap. Dana ditahan escrow sampai konten terbukti tayang.",
  openGraph: {
    title: "Marketiv | Promosi UMKM lewat kreator lokal",
    description: "Campaign dibayar per views atau pesan kreator dengan harga tetap. Dana ditahan escrow sampai terbukti tayang.",
    locale: "id_ID",
    type: "website",
  },
};

export default function LandingPage() {
  const content = LANDING_CONTENT;

  return (
    <div className={landingMono.variable}>
      {/* Must run before the hero paints so the intro curtain and hidden decorations never flash. */}
      <script dangerouslySetInnerHTML={{ __html: INTRO_INLINE_SCRIPT }} />
      <a
        href="#konten"
        className="sr-only z-[100] rounded-full bg-secondary-900 px-5 py-3 text-sm font-bold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {NAVBAR_CONTENT.skipLink}
      </a>
      <SmoothScroll />
      <SectionObserver />
      <IntroCurtain />
      <PageCurtain />
      <Cursor />
      <Navbar />
      <main id="konten" className="relative z-10">
        <HeroSection content={content.hero} />
        <ProblemSection content={content.problem} />
        <PillarsSection content={content.pillars} />
        <ModesSection content={content.modes} />
        <EscrowSection content={content.escrow} />
        <PreviewSection content={content.preview} />
        <AudienceSection umkm={content.umkm} kreator={content.kreator} />
        <ContextSection content={content.context} />
        <FAQSection content={content.faq} />
        <FinalCtaSection content={content.finalCta} />
      </main>
      <Footer reveal />
    </div>
  );
}
