import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { BetaTesterModal } from "@/components/ui/BetaTesterModal";
import { ChatbotFab } from "@/components/features/chatbot/ChatbotFab";
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
  title: "Marketiv",
  description: "Marketplace for UMKM and Creators",
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakartaSans.className} ${sora.variable} antialiased`}>
        <AuthProvider>
          {children}
          <BetaTesterModal />
          <ChatbotFab />
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
