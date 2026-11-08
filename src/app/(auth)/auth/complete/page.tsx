import type { Metadata } from "next";
import { OAuthCallback } from "@/components/features/auth/OAuthCallback";

export const metadata: Metadata = {
  title: "Menyiapkan akun — Marketiv",
};

export default async function OAuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; role?: string }>;
}) {
  const { next, role } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const safeRole =
    role === "umkm" || role === "creator" ? (role as "umkm" | "creator") : undefined;

  return <OAuthCallback next={safeNext} role={safeRole} />;
}
