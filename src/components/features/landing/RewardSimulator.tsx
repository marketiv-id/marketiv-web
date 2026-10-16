"use client";

import { useEffect, useId, useRef, useState } from "react";
import { gsap, MOTION_OK } from "@/lib/gsap";
import type { KreatorContent } from "@/types/landing";

interface RewardSimulatorProps {
  content: KreatorContent["simulator"];
}

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("id-ID");

// Campaign rewards are views / 1000 x rate; the creator keeps the full reward because the 2% fee is charged to the UMKM.
export function RewardSimulator({ content }: RewardSimulatorProps) {
  const [views, setViews] = useState(content.defaultViews);
  const [rate, setRate] = useState(content.defaultRate);
  const outputRef = useRef<HTMLOutputElement>(null);
  const shown = useRef((content.defaultViews / 1000) * content.defaultRate);
  const viewsId = useId();
  const rateId = useId();
  const reward = Math.round((views / 1000) * rate);

  // Counts toward the new total instead of re-rendering a jumping number; text only, no layout properties.
  useEffect(() => {
    const el = outputRef.current;
    if (!el) return;
    if (!window.matchMedia(MOTION_OK).matches) {
      shown.current = reward;
      el.textContent = rupiah.format(reward);
      return;
    }
    const state = { value: shown.current };
    const tween = gsap.to(state, {
      value: reward,
      duration: 0.6,
      ease: "power3.out",
      onUpdate: () => {
        shown.current = state.value;
        el.textContent = rupiah.format(Math.round(state.value));
      },
    });
    return () => {
      tween.kill();
    };
  }, [reward]);

  const clampRate = (value: number) => Math.min(content.maxRate, Math.max(content.minRate, Number.isFinite(value) ? value : content.minRate));

  return (
    <div className="nota-edge relative rounded-t-3xl bg-white p-6 shadow-[0_24px_60px_rgba(16,32,51,0.12)] ring-1 ring-neutral-200 [--nota-bg:#ffffff] md:p-7">
      <p className="text-[15px] font-bold text-secondary-900">{content.title}</p>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor={viewsId} className="text-sm font-semibold text-secondary-900">
            {content.viewsLabel}
          </label>
          <span className="font-mono-nota text-sm font-bold text-secondary-900">{number.format(views)}</span>
        </div>
        <input
          id={viewsId}
          type="range"
          min={content.minViews}
          max={content.maxViews}
          step={content.stepViews}
          value={views}
          onChange={(event) => setViews(Number(event.target.value))}
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-primary-500"
          style={{
            background: `linear-gradient(to right, var(--color-primary-500) ${((views - content.minViews) / (content.maxViews - content.minViews)) * 100}%, var(--color-neutral-200) 0)`,
          }}
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <label htmlFor={rateId} className="text-sm font-semibold text-secondary-900">
          {content.rateLabel}
        </label>
        <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1.5 ring-1 ring-neutral-200 focus-within:ring-2 focus-within:ring-primary-500">
          <span className="font-mono-nota text-sm text-neutral-600">Rp</span>
          <input
            id={rateId}
            type="number"
            inputMode="numeric"
            min={content.minRate}
            max={content.maxRate}
            step={500}
            value={rate}
            onChange={(event) => setRate(clampRate(Number(event.target.value)))}
            className="w-24 bg-transparent font-mono-nota text-sm font-bold text-secondary-900 outline-none"
          />
        </div>
      </div>

      <div className="mt-6 border-t border-dashed border-neutral-300 pt-5">
        <p className="text-sm text-neutral-600">{content.resultLabel}</p>
        <output ref={outputRef} htmlFor={`${viewsId} ${rateId}`} aria-live="polite" className="mt-1 block font-mono-nota text-4xl font-bold tracking-[-0.03em] text-secondary-900 [font-variant-numeric:tabular-nums]">
          {rupiah.format(reward)}
        </output>
        <p className="mt-3 font-mono-nota text-[12px] text-neutral-600">
          {content.formulaLabel}: ({number.format(views)} ÷ 1.000) × {rupiah.format(rate)}
        </p>
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-neutral-600">{content.note}</p>
    </div>
  );
}
