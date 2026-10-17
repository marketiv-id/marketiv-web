import { routes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { FinalCtaContent } from "@/types/landing";
import { LandingButton } from "./motion/LandingButton";
import { MascotFloat } from "./motion/MascotFloat";
import { Reveal } from "./motion/Reveal";

interface FinalCtaSectionProps {
  content: FinalCtaContent;
}

// Full-bleed orange band with one rounded edge per seam: the FAQ's rounded bottom opens onto the band, and the band's
// rounded bottom opens onto the navy footer, so no third colour ever shows between sections.
export function FinalCtaSection({ content }: FinalCtaSectionProps) {
  const doors = [
    {
      key: "umkm",
      ...content.umkm,
      href: routes.registerWithRole("umkm"),
      variant: "primary" as const,
      surface: "dark" as const,
      label: "Mulai",
      size: { w: 797, h: 1105 },
      tone: "halftone bg-secondary-900 text-white [--ht-dir:20deg] [--ht-dot:rgba(249,115,22,0.32)]",
    },
    {
      key: "kreator",
      ...content.kreator,
      href: routes.registerWithRole("creator"),
      variant: "dark" as const,
      surface: "light" as const,
      label: "Daftar",
      size: { w: 786, h: 912 },
      tone: "bg-white text-secondary-900",
    },
  ];

  return (
    <section aria-labelledby="final-cta-title" className="relative z-[2] -mt-10 bg-secondary-900">
      <div
        data-cursor-tone="ink"
        className="halftone relative overflow-hidden rounded-b-[24px] bg-primary-500 px-5 pb-10 pt-36 text-white [--ht-dir:210deg] [--ht-dot:rgba(255,255,255,0.3)] [--ht-size:11px] md:rounded-b-[40px] md:px-10 md:pb-14 md:pt-44"
      >
        <div className="mx-auto max-w-[1600px]">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <Reveal as="h2" id="final-cta-title" mode="words" className="font-display-cond text-poster max-w-[12ch] lg:col-span-8">
              {content.titleLead} <span className="hl-box [--hl-bg:var(--color-secondary-900)]">{content.titleAccent}</span>
            </Reveal>
            <p data-lines className="max-w-sm text-[17px] leading-relaxed text-white/90 [text-wrap:pretty] lg:col-span-4 lg:pb-3">
              {content.subtitle}
            </p>
          </div>

          <ul className="mt-24 grid gap-20 md:mt-32 md:grid-cols-2 md:gap-4">
            {doors.map((door, index) => (
              <Reveal as="li" key={door.key} mode="fade" delay={index * 0.08}>
                <article
                  data-cursor-tone="brand"
                  className={cn("group/door relative flex min-h-[320px] flex-col justify-between rounded-[28px] p-7 md:min-h-[360px] md:rounded-[36px] md:p-10", door.tone)}
                >
                  {/* The clip box ends at the card's bottom edge: the mascot's head rises above the card, its feet stay hidden below it. */}
                  <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-1 h-[160%] w-[38%] max-w-[400px] overflow-hidden md:right-6 md:w-[54%]">
                    <MascotFloat
                      src={door.mascot.src}
                      alt=""
                      width={door.size.w}
                      height={door.size.h}
                      sizes="(min-width: 768px) 26vw, 38vw"
                      phase={index * 0.6}
                      className="absolute inset-x-0 bottom-0 translate-y-[20%] group-hover/door:translate-y-[16%]"
                    />
                  </div>

                  <div className="relative z-[2] max-w-[62%] md:max-w-[50%]">
                    <p className={cn("text-caption-mono", door.key === "umkm" ? "text-primary-400" : "text-primary-600")}>
                      0{index + 1} · {door.name}
                    </p>
                    <p className="font-display-cond mt-4 text-[clamp(2.8rem,min(5.4vw,10vh),5.5rem)] leading-[0.86]">{door.name}</p>
                    <p className={cn("mt-5 text-[17px] font-semibold leading-snug [text-wrap:balance] md:text-[19px]", door.key === "umkm" ? "text-white/85" : "text-neutral-700")}>
                      {door.prompt}
                    </p>
                  </div>
                  <div className="relative z-[2] mt-10">
                    <LandingButton href={door.href} variant={door.variant} surface={door.surface} curtain arrow={index === 0} cursorLabel={door.label}>
                      {door.cta}
                    </LandingButton>
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
