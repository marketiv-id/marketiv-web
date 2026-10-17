import { routes } from "@/lib/constants/routes";
import type { FinalCtaContent } from "@/types/landing";
import { LandingButton } from "./motion/LandingButton";
import { Reveal } from "./motion/Reveal";
import { ScrollScale } from "./motion/ScrollScale";

interface FinalCtaSectionProps {
  content: FinalCtaContent;
}

// b2p-style closing band: one flat orange field with a halftone corner, a poster line, and one door per audience.
export function FinalCtaSection({ content }: FinalCtaSectionProps) {
  const doors = [
    { key: "umkm", prompt: content.umkm.prompt, cta: content.umkm.cta, href: routes.registerWithRole("umkm"), variant: "dark" as const, label: "Mulai" },
    { key: "kreator", prompt: content.kreator.prompt, cta: content.kreator.cta, href: routes.registerWithRole("creator"), variant: "light" as const, label: "Daftar" },
  ];

  return (
    <section aria-labelledby="final-cta-title" className="relative z-[3] -mt-10 rounded-b-[24px] bg-white px-3 pb-3 md:rounded-b-[40px] md:px-4 md:pb-4">
      <ScrollScale from={0.92} className="origin-bottom">
        <div className="halftone relative overflow-hidden rounded-[24px] bg-primary-500 px-5 pb-10 pt-28 text-white [--ht-dir:210deg] [--ht-dot:rgba(255,255,255,0.32)] [--ht-size:11px] md:rounded-[40px] md:px-10 md:pb-12 md:pt-36">
          <div className="mx-auto max-w-[1600px]">
            <Reveal as="h2" id="final-cta-title" mode="words" className="font-display-cond text-poster max-w-[12ch]">
              {content.titleLead} <span className="hl-box [--hl-bg:var(--color-secondary-900)]">{content.titleAccent}</span>
            </Reveal>
            <Reveal mode="fade" delay={0.1}>
              <p className="mt-8 max-w-lg text-[17px] leading-relaxed text-white/90 [text-wrap:pretty] md:text-lg">{content.subtitle}</p>
            </Reveal>

            <div className="mt-16 grid border-t border-white/30 md:mt-24 md:grid-cols-2">
              {doors.map((door, index) => (
                <Reveal key={door.key} mode="fade" delay={0.12 + index * 0.08} className="flex flex-col justify-between gap-6 border-b border-white/30 py-8 md:border-b-0 md:py-10 md:odd:border-r md:odd:pr-10 md:even:pl-10">
                  <p className="max-w-sm text-[clamp(1.3rem,2vw,1.75rem)] font-bold leading-snug tracking-[-0.02em] [text-wrap:balance]">{door.prompt}</p>
                  <div>
                    <LandingButton href={door.href} variant={door.variant} curtain arrow={index === 0} cursorLabel={door.label}>
                      {door.cta}
                    </LandingButton>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </ScrollScale>
    </section>
  );
}
