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
        <div className="landing-grain relative overflow-hidden rounded-[24px] bg-[radial-gradient(120%_90%_at_15%_0%,var(--color-primary-200)_0%,var(--color-primary-100)_45%,var(--color-neutral-100)_100%)] px-5 pb-20 pt-28 md:rounded-[40px] md:px-10 md:pb-28 md:pt-36">
          <div className="relative mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6">
              <Reveal as="h2" id="final-cta-title" mode="words" className="text-[clamp(2.75rem,6vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.05em] text-secondary-900">
                {content.titleLead} <span className="text-primary-600">{content.titleAccent}</span>
              </Reveal>
              <Reveal mode="fade" delay={0.1}>
                <p className="mt-6 max-w-md text-[17px] leading-relaxed text-secondary-800 [text-wrap:pretty]">{content.subtitle}</p>
              </Reveal>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-6">
              <Reveal mode="fade" delay={0.15}>
                <div className="flex h-full flex-col justify-between gap-10 rounded-3xl bg-white p-7">
                  <p className="text-[19px] font-bold leading-snug tracking-[-0.015em] text-secondary-900 [text-wrap:balance]">{content.umkm.prompt}</p>
                  <LandingButton href={routes.registerWithRole("umkm")} variant="primary" size="md" curtain cursorLabel="Mulai">
                    {content.umkm.cta}
                  </LandingButton>
                </div>
              </Reveal>
              <Reveal mode="fade" delay={0.25}>
                <div className="flex h-full flex-col justify-between gap-10 rounded-3xl bg-secondary-900 p-7 text-white">
                  <p className="text-[19px] font-bold leading-snug tracking-[-0.015em] [text-wrap:balance]">{content.kreator.prompt}</p>
                  <LandingButton href={routes.registerWithRole("creator")} variant="light" size="md" curtain cursorLabel="Daftar">
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
