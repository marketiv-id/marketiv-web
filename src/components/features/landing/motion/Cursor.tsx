"use client";

import { useRef } from "react";
import { FINE_POINTER, gsap, useGSAP } from "@/lib/gsap";

// Trailing follower that appears only over buttons, links and media (owner asked for it on buttons).
// The native cursor always stays visible, so a failed script never leaves the visitor without one.
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      const dot = root?.querySelector<HTMLElement>("[data-cursor-dot]");
      const ring = root?.querySelector<HTMLElement>("[data-cursor-ring]");
      const label = root?.querySelector<HTMLElement>("[data-cursor-text]");
      if (!root || !dot || !ring || !label) return;

      const mm = gsap.matchMedia();
      mm.add(FINE_POINTER, () => {
        gsap.set([dot, ring], { xPercent: -50, yPercent: -50, autoAlpha: 0 });
        const dotX = gsap.quickTo(dot, "x", { duration: 0.15, ease: "power3.out" });
        const dotY = gsap.quickTo(dot, "y", { duration: 0.15, ease: "power3.out" });
        const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
        const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });
        let visible = false;

        const setState = (state: "idle" | "link" | "label" | "hidden", text = "", ink = false) => {
          const color = ink ? "16,32,51" : "249,115,22";
          label.textContent = text;
          if (state === "hidden") {
            gsap.to([dot, ring], { autoAlpha: 0, duration: 0.2 });
            return;
          }
          gsap.to(dot, { autoAlpha: state === "label" ? 0 : 1, scale: state === "link" ? 0.5 : 1, backgroundColor: `rgb(${color})`, duration: 0.25 });
          gsap.to(ring, {
            autoAlpha: 1,
            scale: state === "label" ? 2.6 : state === "link" ? 1.7 : 1,
            backgroundColor: state === "label" ? `rgba(${color},0.95)` : `rgba(${color},0)`,
            borderColor: state === "label" ? `rgba(${color},0)` : `rgba(${color},0.85)`,
            duration: 0.35,
            ease: "power3.out",
          });
          gsap.to(label, { autoAlpha: state === "label" ? 1 : 0, duration: 0.2 });
        };

        const onMove = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          dotX(event.clientX);
          dotY(event.clientY);
          ringX(event.clientX);
          ringY(event.clientY);
          if (!visible) {
            visible = true;
            gsap.set([dot, ring], { x: event.clientX, y: event.clientY });
          }
        };

        const onOver = (event: PointerEvent) => {
          const target = event.target as Element | null;
          if (!target?.closest) return;
          if (target.closest("input, textarea, select, [data-cursor='none']")) {
            setState("hidden");
            return;
          }
          // Orange surfaces and orange hover fills opt into a navy cursor with data-cursor-tone="ink".
          const ink = target.closest<HTMLElement>("[data-cursor-tone]")?.dataset.cursorTone === "ink";
          const labelled = target.closest<HTMLElement>("[data-cursor-label]");
          if (labelled?.dataset.cursorLabel) {
            setState("label", labelled.dataset.cursorLabel, ink);
            return;
          }
          if (target.closest("a, button, [role='button'], [role='tab'], [data-cursor]")) {
            setState("link", "", ink);
            return;
          }
          setState("hidden");
        };

        const hide = () => {
          visible = false;
          gsap.to([dot, ring], { autoAlpha: 0, duration: 0.2 });
        };
        const onVisibility = () => {
          if (document.hidden) hide();
        };

        window.addEventListener("pointermove", onMove, { passive: true });
        document.addEventListener("pointerover", onOver);
        document.documentElement.addEventListener("pointerleave", hide);
        window.addEventListener("blur", hide);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
          window.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerover", onOver);
          document.documentElement.removeEventListener("pointerleave", hide);
          window.removeEventListener("blur", hide);
          document.removeEventListener("visibilitychange", onVisibility);
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} aria-hidden="true" className="landing-cursor pointer-events-none fixed inset-0 z-[80]">
      <div data-cursor-ring className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-primary-500/85">
        <span data-cursor-text className="scale-[0.385] whitespace-nowrap text-[13px] font-bold text-white opacity-0" />
      </div>
      <div data-cursor-dot className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-primary-500" />
    </div>
  );
}
