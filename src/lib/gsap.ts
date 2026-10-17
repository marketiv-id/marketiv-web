"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useGSAP } from "@gsap/react";

// Registered once here so every client component shares the same plugin instances.
gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin, useGSAP);

export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const FINE_POINTER = "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)";
export const DESKTOP_MOTION = "(prefers-reduced-motion: no-preference) and (min-width: 1024px)";
export const MOBILE_MOTION = "(prefers-reduced-motion: no-preference) and (max-width: 1023px)";
// Pinned scenes need room: on a short laptop at 100% zoom (about 620px of viewport) they fall back to the unpinned layout.
export const PIN_MOTION = "(prefers-reduced-motion: no-preference) and (min-width: 1024px) and (min-height: 620px)";
export const NO_PIN_MOTION = "(prefers-reduced-motion: no-preference) and (max-width: 1023px), (prefers-reduced-motion: no-preference) and (max-height: 619px)";
export const EASE_OUT = "expo.out";
export const EASE_SOFT = "power3.out";

export { gsap, ScrollTrigger, SplitText, useGSAP };
