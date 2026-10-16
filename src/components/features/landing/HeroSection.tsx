import Image from "next/image";
import type { HeroContent } from "@/types/landing";
import { HeroMotion } from "./HeroMotion";
import { LandingHeroActions } from "./LandingHeroActions";

interface HeroSectionProps {
  content: HeroContent;
}

// Armor-style framed hero: an orange-to-ember glow with grain, white type on the left, the product render on the right,
// and the backdrop word sitting behind the phones (DontMatter-style depth).
export function HeroSection({ content }: HeroSectionProps) {
  return (
    <HeroMotion className="relative z-[12] bg-neutral-25 px-3 pt-3 md:px-4 md:pt-4">
      <div
        data-hero-frame
        className="landing-grain relative isolate flex min-h-[calc(100dvh-24px)] flex-col overflow-hidden rounded-[40px] bg-[#1d0e06] text-white will-change-transform md:min-h-[calc(100dvh-32px)]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(75%_95%_at_0%_0%,#fb923c_0%,#f97316_28%,rgba(234,88,12,0.75)_48%,rgba(124,45,18,0.35)_70%,transparent_88%),radial-gradient(55%_65%_at_100%_100%,rgba(154,52,18,0.55)_0%,transparent_70%)]"
        />

        <div data-hero-word-layer aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[-4%] -z-10 flex justify-end pr-[3%]">
          <div data-depth="4">
            <span
              data-hero-word
              data-hero-pre
              className="block select-none text-[clamp(7rem,23vw,23rem)] font-extrabold leading-[0.8] tracking-[-0.07em] text-white/[0.07]"
            >
              {content.backdropWord}
            </span>
          </div>
        </div>

        <div className="relative mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 items-center gap-10 px-5 pb-0 pt-28 md:px-10 lg:grid-cols-12 lg:gap-4 lg:pt-24">
          <div className="lg:col-span-6 lg:pb-16">
            <h1 data-hero-title className="text-[clamp(2.4rem,4.6vw,4.6rem)] font-extrabold leading-[1] tracking-[-0.045em] [text-wrap:balance]">
              {content.titleLead} {content.titleRest} <span className="text-[#ffd8b0]">{content.titleAccent}</span>
            </h1>
            <p data-hero-fade className="mt-7 max-w-md text-[17px] leading-relaxed text-white/80 [text-wrap:pretty] md:text-lg">
              {content.subtitle}
            </p>
            <div data-hero-fade className="mt-9">
              <LandingHeroActions ctaUmkm={content.ctaUmkm} ctaCreator={content.ctaCreator} dashboardCta={content.dashboardCta} tone="dark" />
            </div>
          </div>

          <div data-hero-phone-layer className="relative flex justify-center self-end lg:col-span-6 lg:justify-end">
            <div data-depth="10" className="w-[min(92vw,620px)] lg:w-[min(46vw,680px)]">
              <div data-hero-phone data-hero-pre>
                <Image
                  src={content.phone.image}
                  alt={content.phone.imageAlt}
                  width={1400}
                  height={1554}
                  priority
                  sizes="(min-width: 1024px) 46vw, 92vw"
                  className="h-auto w-full select-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </HeroMotion>
  );
}
