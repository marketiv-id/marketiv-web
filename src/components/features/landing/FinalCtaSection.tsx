import { routes } from "@/lib/constants/routes";
import type { FinalCtaContent } from "@/types/landing";
import { LandingButton } from "./motion/LandingButton";
import { MascotFloat } from "./motion/MascotFloat";
import { Reveal } from "./motion/Reveal";

interface FinalCtaSectionProps {
  content: FinalCtaContent;
}

// One flat orange band with a door per audience. The section itself is navy, the same as the footer below it,
// so the band's rounded corners open straight onto the footer with no light seam in between.
export function FinalCtaSection({ content }: FinalCtaSectionProps) {
  const doors = [
    { key: "umkm", ...content.umkm, href: routes.registerWithRole("umkm"), variant: "primary" as const, label: "Mulai", size: { w: 797, h: 1105 } },
    { key: "kreator", ...content.kreator, href: routes.registerWithRole("creator"), variant: "light" as const, label: "Daftar", size: { w: 786, h: 912 } },
  ];

  return (
    <section aria-labelledby="final-cta-title" className="relative z-[2] -mt-10 bg-secondary-900 px-3 pt-10 md:px-4">
      <div data-cursor-tone="ink" className="halftone relative overflow-hidden rounded-[24px] bg-primary-500 px-5 pb-6 pt-28 text-white [--ht-dir:210deg] [--ht-dot:rgba(255,255,255,0.3)] [--ht-size:11px] md:rounded-[40px] md:px-10 md:pb-10 md:pt-36">
        <div className="mx-auto max-w-[1600px]">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <Reveal as="h2" id="final-cta-title" mode="words" className="font-display-cond text-poster max-w-[12ch] lg:col-span-8">
              {content.titleLead} <span className="hl-box [--hl-bg:var(--color-secondary-900)]">{content.titleAccent}</span>
            </Reveal>
            <p data-lines className="max-w-sm text-[17px] leading-relaxed text-white/90 [text-wrap:pretty] lg:col-span-4 lg:pb-3">
              {content.subtitle}
            </p>
          </div>

          <ul className="mt-28 grid gap-24 md:mt-36 md:grid-cols-2 md:gap-4">
            {doors.map((door, index) => (
              <Reveal as="li" key={door.key} mode="fade" delay={index * 0.08}>
                <article data-cursor-tone="brand" className="group/door relative flex min-h-[260px] flex-col justify-between gap-8 rounded-[24px] bg-secondary-900 p-7 md:rounded-[32px] md:p-9">
                  <MascotFloat
                    src={door.mascot.src}
                    alt={door.mascot.alt}
                    width={door.size.w}
                    height={door.size.h}
                    sizes="(min-width: 1024px) 15vw, 40vw"
                    phase={index * 0.6}
                    className="absolute -top-20 right-3 w-[38%] max-w-[240px] group-hover/door:-translate-y-2 md:-top-28 md:right-6 md:w-[36%]"
                  />
                  <p className="text-caption-mono text-primary-400">0{index + 1}</p>
                  <div className="pr-[38%] md:pr-[36%]">
                    <p className="text-[clamp(1.3rem,2vw,1.75rem)] font-bold leading-snug tracking-[-0.02em] [text-wrap:balance]">{door.prompt}</p>
                    <div className="mt-7">
                      <LandingButton href={door.href} variant={door.variant} surface="dark" curtain arrow={index === 0} cursorLabel={door.label}>
                        {door.cta}
                      </LandingButton>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
