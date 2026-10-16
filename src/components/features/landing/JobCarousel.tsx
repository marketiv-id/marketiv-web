"use client";

import { useEffect, useRef, useState } from "react";
import type { JobCard, KreatorContent } from "@/types/landing";
import { TiltCard } from "./motion/TiltCard";

interface JobCarouselProps {
  title: string;
  sampleLabel: string;
  cta: string;
  labels: KreatorContent["jobLabels"];
  jobs: JobCard[];
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={direction === "left" ? "M16 10H5m4-5-5 5 5 5" : "M4 10h11m-4-5 5 5-5 5"} />
    </svg>
  );
}

// Native scroll-snap does the swiping; the buttons and progress bar only read and nudge its scroll position.
export function JobCarousel({ title, sampleLabel, cta, labels, jobs }: JobCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [progress, setProgress] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      setProgress(max > 0 ? track.scrollLeft / max : 1);
      setAtStart(track.scrollLeft <= 4);
      setAtEnd(track.scrollLeft >= max - 4);
    };
    update();
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      track.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const nudge = (direction: 1 | -1) => {
    const track = trackRef.current;
    const card = track?.querySelector("li");
    if (!track || !card) return;
    track.scrollBy({ left: direction * (card.getBoundingClientRect().width + 16), behavior: "smooth" });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono-nota text-[11px] uppercase tracking-[0.12em] text-neutral-600">
          {title} <span className="text-neutral-400">·</span> {sampleLabel}
        </p>
        <div className="flex items-center gap-3">
          <div aria-hidden="true" className="hidden h-px w-24 bg-secondary-900/15 sm:block">
            <div className="h-full origin-left bg-primary-500 transition-transform duration-300" style={{ transform: `scaleX(${Math.max(0.12, progress)})` }} />
          </div>
          <button
            type="button"
            aria-label={labels.previous}
            onClick={() => nudge(-1)}
            disabled={atStart}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-secondary-900 ring-1 ring-secondary-900/10 transition-colors hover:bg-secondary-900 hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-secondary-900"
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            aria-label={labels.next}
            onClick={() => nudge(1)}
            disabled={atEnd}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-secondary-900 ring-1 ring-secondary-900/10 transition-colors hover:bg-secondary-900 hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-secondary-900"
          >
            <ArrowIcon direction="right" />
          </button>
        </div>
      </div>

      <ul
        ref={trackRef}
        data-cursor-label="Geser"
        className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {jobs.map((job) => (
          <li key={job.id} className="w-[260px] shrink-0 snap-start sm:w-[280px]">
            <TiltCard className="flex h-full flex-col rounded-[24px] bg-white p-5 shadow-[0_1px_2px_rgba(16,32,51,0.04)] ring-1 ring-neutral-200">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700">{labels.badge}</span>
                <span className="font-mono-nota text-[11px] text-neutral-500">{job.id}</span>
              </div>
              <p className="mt-4 text-lg font-extrabold leading-tight tracking-[-0.02em] text-secondary-900">{job.title}</p>
              <p className="mt-1 text-[13px] text-neutral-600">{job.brand}</p>
              <dl className="mt-4 grid gap-1.5 text-[13px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-600">{labels.category}</dt>
                  <dd className="font-semibold text-secondary-900">{job.category}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-600">{labels.platform}</dt>
                  <dd className="font-semibold text-secondary-900">{job.platform}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-600">{labels.quota}</dt>
                  <dd className="font-semibold text-secondary-900">{job.quota}</dd>
                </div>
              </dl>
              <div className="mt-5 flex items-end justify-between gap-3 border-t border-dashed border-neutral-300 pt-4">
                <p>
                  <span className="block font-mono-nota text-xl font-bold text-secondary-900">{job.rate}</span>
                  <span className="text-[11px] text-neutral-600">{labels.perViews}</span>
                </p>
                <span className="rounded-full bg-secondary-900 px-3 py-1.5 text-[12px] font-bold text-white">{cta}</span>
              </div>
            </TiltCard>
          </li>
        ))}
      </ul>
    </div>
  );
}
