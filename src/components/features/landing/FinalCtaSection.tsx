import { routes } from "@/lib/constants/routes";
import type { FinalCtaContent } from "@/types/landing";
import { LandingButton } from "./motion/LandingButton";
import { Reveal } from "./motion/Reveal";
import { ScrollScale } from "./motion/ScrollScale";

interface FinalCtaSectionProps {
  content: FinalCtaContent;
}

export function FinalCtaSection({ content }: FinalCtaSectionProps) {
  return (
    <section aria-labelledby="final-cta-title" className="relative z-[3] -mt-10 rounded-b-[24px] bg-neutral-25 md:rounded-b-[40px]">
      <ScrollScale from={0.9} className="origin-top">
        <div className="landing-grain relative overflow-hidden rounded-b-[24px] rounded-t-[28px] bg-[linear-gradient(160deg,var(--color-primary-100)_0%,var(--color-primary-200)_55%,var(--color-primary-300)_100%)] px-5 pb-24 pt-32 md:rounded-b-[40px] md:rounded-t-[40px] md:px-10 md:pb-32 md:pt-40">
          <div className="relative mx-auto max-w-[1400px] text-center">
            <Reveal as="h2" id="final-cta-title" mode="words" className="text-display-xl mx-auto text-secondary-900">
              {content.titleLead} <span className="text-primary-600">{content.titleAccent}</span>
            </Reveal>
            <Reveal mode="fade" delay={0.1}>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-secondary-800">{content.subtitle}</p>
            </Reveal>

            <div className="mx-auto mt-14 grid max-w-4xl gap-4 md:grid-cols-2">
              <Reveal mode="fade" delay={0.15}>
                <div className="flex h-full flex-col items-center justify-between gap-8 rounded-[28px] bg-white/70 p-8 ring-1 ring-white backdrop-blur">
                  <p className="text-xl font-bold tracking-[-0.02em] text-secondary-900">{content.umkm.prompt}</p>
                  <LandingButton href={routes.registerWithRole("umkm")} variant="primary" curtain cursorLabel="Mulai">
                    {content.umkm.cta}
                  </LandingButton>
                </div>
              </Reveal>
              <Reveal mode="fade" delay={0.25}>
                <div className="flex h-full flex-col items-center justify-between gap-8 rounded-[28px] bg-secondary-900 p-8 text-white">
                  <p className="text-xl font-bold tracking-[-0.02em]">{content.kreator.prompt}</p>
                  <LandingButton href={routes.registerWithRole("creator")} variant="light" curtain cursorLabel="Daftar">
                    {content.kreator.cta}
                  </LandingButton>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </ScrollScale>
    </section>
  );
}
