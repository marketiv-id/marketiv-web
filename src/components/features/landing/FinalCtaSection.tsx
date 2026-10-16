import { routes } from "@/lib/constants/routes";
import type { FinalCtaContent } from "@/types/landing";
import { LandingButton } from "./motion/LandingButton";
import { Reveal } from "./motion/Reveal";
import { ScrollScale } from "./motion/ScrollScale";

interface FinalCtaSectionProps {
  content: FinalCtaContent;
}

// Sphere-style closing sheet: one centred line and both audiences side by side, sitting on top of the footer.
export function FinalCtaSection({ content }: FinalCtaSectionProps) {
  return (
    <section aria-labelledby="final-cta-title" className="relative z-[3] -mt-10 rounded-b-[24px] bg-neutral-25 px-3 pb-3 md:rounded-b-[40px] md:px-4 md:pb-4">
      <ScrollScale from={0.92} className="origin-bottom">
        <div className="landing-grain relative isolate overflow-hidden rounded-[24px] px-5 pb-24 pt-32 md:rounded-[40px] md:px-10 md:pb-32 md:pt-40">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(80%_100%_at_10%_0%,#fdba74_0%,#fed7aa_35%,transparent_70%),radial-gradient(70%_90%_at_95%_100%,#fb923c_0%,#ffedd5_55%,transparent_80%),#fff7ed]"
          />
          <div className="mx-auto max-w-4xl text-center">
            <Reveal as="h2" id="final-cta-title" mode="words" className="text-[clamp(2.75rem,6.5vw,6rem)] font-extrabold leading-[0.95] tracking-[-0.05em] text-secondary-900 [text-wrap:balance]">
              {content.titleLead} <span className="text-primary-600">{content.titleAccent}</span>
            </Reveal>
            <Reveal mode="fade" delay={0.1}>
              <p className="mx-auto mt-7 max-w-lg text-[17px] leading-relaxed text-secondary-800 [text-wrap:pretty]">{content.subtitle}</p>
            </Reveal>
            <Reveal mode="fade" delay={0.18}>
              <div className="mt-11 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <LandingButton href={routes.registerWithRole("umkm")} variant="primary" curtain arrow cursorLabel="Mulai">
                  {content.umkm.cta}
                </LandingButton>
                <LandingButton href={routes.registerWithRole("creator")} variant="dark" curtain cursorLabel="Daftar">
                  {content.kreator.cta}
                </LandingButton>
              </div>
            </Reveal>
          </div>
        </div>
      </ScrollScale>
    </section>
  );
}
