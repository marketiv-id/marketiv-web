import { JetBrains_Mono } from "next/font/google";

// Loaded only by the landing route (owner decision D3): numbers, receipt lines, and section labels.
export const landingMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-landing-mono",
  display: "swap",
});
