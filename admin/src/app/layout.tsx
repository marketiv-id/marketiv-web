import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AdminAuthGate, AdminAuthProvider } from "@/components/admin/AdminAuthBoundary";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "Marketiv Admin Control Plane",
  description: "Marketiv Operational Admin Dashboard",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${plusJakartaSans.className} ${sora.variable} antialiased`}>
        <AdminAuthProvider>
          <AdminAuthGate>{children}</AdminAuthGate>
        </AdminAuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
