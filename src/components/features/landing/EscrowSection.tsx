"use client";

import { useRef } from "react";
import { DESKTOP_MOTION, gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { EscrowContent } from "@/types/landing";
import { Reveal } from "./motion/Reveal";
import { ScreenSlice } from "./motion/ScreenSlice";
import { Spotlight } from "./motion/Spotlight";

interface EscrowSectionProps {
  content: EscrowContent;
}

const STAMP_TONES: Record<string, string> = {
  DITAHAN: "text-primary-600 ring-primary-600",
  TERVALIDASI: "text-secondary-700 ring-secondary-700",
  DICAIRKAN: "text-success ring-success",
};

function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

// The server HTML is the finished receipt (all steps done, last stamp shown); desktop motion rewinds it and replays it with scroll.
export function EscrowSection({ content }: EscrowSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const stampedSteps = content.steps.map((step, index) => ({ ...step, index })).filter((step) => step.stamp);
  const lastStamp = stampedSteps[stampedSteps.length - 1]?.stamp;

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();

      mm.add(DESKTOP_MOTION, () => {
        const steps = q("[data-escrow-step]");
        const rows = q("[data-escrow-row]");
        const stamps = q("[data-escrow-stamp]");
        gsap.set(steps, { opacity: 0.32 });
        gsap.set(q("[data-escrow-dot]"), { scale: 0.4, backgroundColor: "rgba(255,255,255,0.2)" });
        gsap.set(rows, { autoAlpha: 0, x: -16 });
        gsap.set(stamps, { autoAlpha: 0, scale: 1.5, rotate: -14 });
        gsap.set(q("[data-escrow-line]"), { drawSVG: "0%" });
        gsap.set(q("[data-escrow-receipt]"), { y: 60, rotate: 2 });

        const tl = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: {
            trigger: q("[data-escrow-pin]")[0],
            start: "top top",
            end: "+=260%",
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });
        tl.to(q("[data-escrow-receipt]"), { y: 0, rotate: -1.5, duration: 1, ease: "none" }, 0);
        tl.to(q("[data-escrow-line]"), { drawSVG: "100%", duration: content.steps.length, ease: "none" }, 0.2);

        content.steps.forEach((step, index) => {
          const at = 0.2 + index;
          tl.to(steps[index], { opacity: 1, duration: 0.4 }, at);
          tl.to(q("[data-escrow-dot]")[index], { scale: 1, backgroundColor: "#f97316", duration: 0.4 }, at);
          tl.to(rows[index], { autoAlpha: 1, x: 0, duration: 0.5 }, at + 0.1);
          if (index > 0) tl.to(steps[index - 1], { opacity: 0.55, duration: 0.4 }, at);
          if (step.stamp) {
            const stamp = root.querySelector(`[data-escrow-stamp="${step.stamp}"]`);
            const previous = stampedSteps.filter((s) => s.index < index).map((s) => root.querySelector(`[data-escrow-stamp="${s.stamp}"]`));
            if (previous.length) tl.to(previous, { autoAlpha: 0, scale: 0.9, duration: 0.25 }, at + 0.15);
            tl.to(stamp, { autoAlpha: 1, scale: 1, rotate: -6, duration: 0.45, ease: "expo.out" }, at + 0.25);
          }
        });
        // A short hold after the last stamp so it can be read before the pin releases.
        tl.to({}, { duration: 0.6 });
      });

      mm.add("(prefers-reduced-motion: no-preference) and (max-width: 1023px)", () => {
        gsap.from(q("[data-escrow-step]"), {
          y: 24,
          autoAlpha: 0,
          duration: 0.9,
          ease: "expo.out",
          stagger: 0.1,
          scrollTrigger: { trigger: q("[data-escrow-steps]")[0], start: "top 80%", once: true },
        });
      });

      mm.add(MOTION_OK, () => {
        gsap.from(q("[data-escrow-note]"), {
          y: 20,
          autoAlpha: 0,
          duration: 1,
          ease: "expo.out",
          scrollTrigger: { trigger: q("[data-escrow-note]")[0], start: "top 92%", once: true },
        });
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      id="escrow"
      data-section-label={content.label}
      aria-labelledby="escrow-title"
      className="landing-grain relative isolate z-[8] -mt-10 overflow-hidden rounded-b-[24px] bg-secondary-900 text-white md:rounded-b-[40px]"
    >
      <ScreenSlice colorClassName="bg-neutral-25" />
      <div data-escrow-pin className="relative flex min-h-svh items-center px-5 pb-20 pt-32 md:px-10 lg:pb-12 lg:pt-28">
        <Spotlight />
        <div className="relative z-[2] mx-auto grid w-full max-w-[1400px] gap-14 lg:grid-cols-12 lg:items-center lg:gap-8">
          <div className="lg:col-span-6">
            <p className="text-[15px] font-bold text-primary-400">{content.label}</p>
            <Reveal as="h2" id="escrow-title" mode="words" className="text-display-md mt-5 max-w-[18ch]">
              {content.titleLead} <span className="text-primary-400">{content.titleAccent}</span>
            </Reveal>

            <div className="relative mt-10">
              <svg aria-hidden="true" className="absolute left-[15px] top-4 h-[calc(100%-2rem)] w-[2px] overflow-visible" preserveAspectRatio="none" viewBox="0 0 2 100">
                <line x1="1" y1="0" x2="1" y2="100" stroke="rgba(255,255,255,0.12)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <line data-escrow-line x1="1" y1="0" x2="1" y2="100" stroke="#f97316" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
              <ol data-escrow-steps className="relative grid gap-6">
                {content.steps.map((step, index) => (
                  <li key={step.title} data-escrow-step className="flex gap-5">
                    <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
                      <span data-escrow-dot className="absolute inset-0 rounded-full bg-primary-500" />
                      <span className="relative font-mono-nota text-xs font-bold text-white">{index + 1}</span>
                    </span>
                    <div>
                      <h3 className="text-lg font-bold tracking-[-0.01em] md:text-xl">{step.title}</h3>
                      <p className="mt-1 max-w-md text-[15px] leading-relaxed text-white/65">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="flex justify-center lg:col-span-6">
            <div
              data-escrow-receipt
              className="nota-edge relative w-full max-w-[400px] -rotate-[1.5deg] rounded-t-3xl bg-neutral-25 px-7 pb-9 pt-7 text-secondary-900 shadow-[0_40px_90px_rgba(0,0,0,0.45)] [--nota-bg:#fffdf9]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono-nota text-[12px] text-neutral-600">{content.receipt.title}</p>
                  <p className="mt-1 font-mono-nota text-lg font-bold">{content.receipt.code}</p>
                </div>
                <span className="text-[11px] font-medium text-neutral-500">
                  {content.receipt.sampleLabel}
                </span>
              </div>

              <dl className="mt-6 grid gap-2 border-y border-dashed border-neutral-400 py-4 font-mono-nota text-[13px]">
                {content.receipt.rows.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4">
                    <dt className="text-neutral-600">{row.label}</dt>
                    <dd className="font-semibold">{row.value}</dd>
                  </div>
                ))}
              </dl>

              <ol className="grid gap-2.5 py-5">
                {content.steps.map((step, index) => (
                  <li key={step.title} data-escrow-row className="flex items-center gap-3 text-[13px] font-semibold">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-strong">
                      <Check />
                    </span>
                    <span className="flex-1">{step.title}</span>
                    <span className="font-mono-nota text-[11px] text-neutral-500">0{index + 1}</span>
                  </li>
                ))}
              </ol>

              <div className="flex items-end justify-between gap-4 border-t border-dashed border-neutral-400 pt-4">
                <span className="text-sm text-neutral-600">{content.receipt.totalLabel}</span>
                <span className="font-mono-nota text-2xl font-bold">{content.receipt.totalValue}</span>
              </div>

              <div aria-hidden="true" className="pointer-events-none absolute -right-5 bottom-[30%]">
                {stampedSteps.map((step) => (
                  <span
                    key={step.stamp}
                    data-escrow-stamp={step.stamp}
                    className={cn(
                      "absolute right-0 top-0 -rotate-6 whitespace-nowrap rounded-lg bg-neutral-25/85 px-3 py-1.5 font-mono-nota text-lg font-black tracking-[0.12em] ring-[3px] ring-inset",
                      STAMP_TONES[step.stamp ?? ""],
                      step.stamp !== lastStamp && "opacity-0",
                    )}
                  >
                    {step.stamp}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-[2] mx-auto max-w-[1400px] px-5 pb-24 md:px-10 lg:pb-28">
        <p data-escrow-note className="max-w-3xl text-[15px] leading-relaxed text-white/60 [text-wrap:pretty]">
          {content.disputeNote}
        </p>
      </div>
    </section>
  );
}
