import { Archivo, JetBrains_Mono } from "next/font/google";

// Loaded only by the landing route (owner decision D3): numbers, receipt lines, and section labels.
export const landingMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-landing-mono",
  display: "swap",
});

// Condensed display face for the uppercase headlines; the width axis lets long Indonesian words fit at poster size.
export const landingDisplay = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-landing-display",
  display: "swap",
});
