import Image from "next/image";
import { cn } from "@/lib/utils";
import type { PillarItem, PillarsContent } from "@/types/landing";
import { Parallax } from "./motion/Parallax";
import { Reveal } from "./motion/Reveal";

interface PillarsSectionProps {
  content: PillarsContent;
}

function StampVisual({ stamp }: { stamp: string }) {
  return (
    <div aria-hidden="true" className="relative flex h-full min-h-[260px] items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_55%)]" />
      <span className="-rotate-6 rounded-2xl px-6 py-3 font-mono-nota text-[clamp(2.25rem,5vw,4.5rem)] font-bold tracking-[0.08em] text-white ring-[5px] ring-inset ring-white/90">
        {stamp}
      </span>
    </div>
  );
}

function ImageVisual({ item, wide }: { item: PillarItem; wide: boolean }) {
  if (!item.image) return null;
  return (
    <div className={cn("relative overflow-hidden rounded-2xl", wide ? "aspect-[1400/211]" : "aspect-[560/667] max-h-[300px]")}>
      <Parallax speed={6} className="h-full w-full">
        <Image
          src={item.image}
          alt={item.imageAlt ?? ""}
          width={wide ? 1400 : 560}
          height={wide ? 211 : 667}
          sizes={wide ? "(min-width: 1024px) 40vw, 90vw" : "(min-width: 1024px) 24vw, 90vw"}
          className={cn("img-outline h-full w-full rounded-2xl", wide ? "object-contain" : "object-cover object-top")}
        />
      </Parallax>
    </div>
  );
}

// Three different jobs, three different cells: the escrow promise is the anchor, the other two show the product doing it.
export function PillarsSection({ content }: PillarsSectionProps) {
  const [escrow, results, creators] = content.items;
  return (
    <section
      id="solusi"
      data-section-label={content.label}
      aria-labelledby="solusi-title"
      className="relative z-[10] -mt-10 rounded-b-[24px] bg-neutral-100 px-5 pb-24 pt-32 md:rounded-b-[40px] md:px-10 md:pb-32 md:pt-40"
    >
      <div className="mx-auto max-w-[1400px]">
        <Reveal as="h2" id="solusi-title" mode="words" className="text-display-lg max-w-[18ch] text-secondary-900">
          {content.titleLead} <span className="text-primary-500">{content.titleAccent}</span>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-12 lg:grid-rows-[auto_auto]">
          <Reveal mode="clip" className="lg:col-span-5 lg:row-span-2">
            <article className="landing-grain relative flex h-full flex-col overflow-hidden rounded-3xl bg-primary-500 p-7 text-white md:p-9">
              <StampVisual stamp={escrow.stamp ?? ""} />
              <h3 className="mt-6 text-2xl font-extrabold tracking-[-0.02em] md:text-3xl">{escrow.title}</h3>
              <p className="mt-3 max-w-sm text-[16px] leading-relaxed text-white/85">{escrow.description}</p>
            </article>
          </Reveal>

          <Reveal mode="clip" delay={0.08} className="lg:col-span-7">
            <article className="flex h-full flex-col justify-between gap-8 rounded-3xl bg-white p-7 md:p-9">
              <ImageVisual item={results} wide />
              <div className="max-w-md">
                <h3 className="text-2xl font-extrabold tracking-[-0.02em] text-secondary-900">{results.title}</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-neutral-700">{results.description}</p>
              </div>
            </article>
          </Reveal>

          <Reveal mode="clip" delay={0.16} className="lg:col-span-7">
            <article className="grid h-full items-center gap-8 rounded-3xl bg-secondary-50 p-7 sm:grid-cols-[1fr_auto] md:p-9">
              <div className="max-w-sm">
                <h3 className="text-2xl font-extrabold tracking-[-0.02em] text-secondary-900">{creators.title}</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-neutral-700">{creators.description}</p>
              </div>
              <div className="w-full max-w-[240px] justify-self-center sm:justify-self-end">
                <ImageVisual item={creators} wide={false} />
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
