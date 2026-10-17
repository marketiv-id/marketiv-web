"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, MOTION_OK, ScrollTrigger } from "@/lib/gsap";

let instance: Lenis | null = null;

// Leaves room for the fixed navbar when jumping to a section.
const ANCHOR_OFFSET = -88;

export function scrollToHash(hash: string): boolean {
  const target = document.querySelector<HTMLElement>(hash);
  if (!target) return false;
  if (instance) {
    instance.scrollTo(target, { offset: ANCHOR_OFFSET, duration: 1.4 });
    return true;
  }
  const top = target.getBoundingClientRect().top + window.scrollY + ANCHOR_OFFSET;
  window.scrollTo({ top, behavior: window.matchMedia(MOTION_OK).matches ? "smooth" : "auto" });
  return true;
}

// Instant jump used while a transition covers the screen.
export function jumpToHash(hash: string): boolean {
  const target = document.querySelector<HTMLElement>(hash);
  if (!target) return false;
  if (instance) {
    instance.scrollTo(target, { offset: ANCHOR_OFFSET, immediate: true, force: true });
    return true;
  }
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + ANCHOR_OFFSET, behavior: "auto" });
  return true;
}

export function setScrollLocked(locked: boolean) {
  if (instance) {
    if (locked) instance.stop();
    else instance.start();
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

export function SmoothScroll() {
  useEffect(() => {
    // Same-page anchor links are routed through Lenis so they keep the navbar offset; modified clicks stay native.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      if (scrollToHash(url.hash)) {
        event.preventDefault();
        window.history.replaceState(null, "", url.hash);
      }
    };
    document.addEventListener("click", onClick);

    // Under reduced motion the native scroll is the final state; Lenis never starts.
    if (!window.matchMedia(MOTION_OK).matches) {
      return () => document.removeEventListener("click", onClick);
    }

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    instance = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Fonts and lazy images change section heights after the first measure.
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("load", refresh);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      instance = null;
    };
  }, []);

  return null;
}
