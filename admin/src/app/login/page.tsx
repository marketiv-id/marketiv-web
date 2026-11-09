"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { AdminAuthError } from "@/lib/admin/auth";
import { AdminAccessState, useAdminAuth } from "@/components/admin/AdminAuthBoundary";
import { MarketivLogo } from "@/components/ui/MarketivLogo";

function messageFrom(error: unknown): string {
  if (error instanceof AdminAuthError) return error.message;
  return "Masuk Admin gagal. Coba lagi.";
}

export default function AdminLoginPage() {
  const router = useRouter();
  const { state, signIn, logout } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = state === "loading";

  useEffect(() => {
    if (state === "authenticated") router.replace("/dashboard");
  }, [router, state]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    try {
      await signIn(email, password);
    } catch (reason) {
      setError(messageFrom(reason));
    }
  }

  if (state === "forbidden") {
    return (
      <AdminAccessState
        title="Akses Admin ditolak"
        detail="Akun ini bukan Admin Marketiv. Admin harus terdaftar di allowlist Marketiv (role admin di profil dan di app_metadata Supabase)."
        actionLabel="Ganti Akun"
        onAction={() => void logout()}
      />
    );
  }
  if (state === "suspended") {
    return (
      <AdminAccessState
        title="Akun Admin tidak aktif"
        detail="Hubungi Marketiv untuk mengaktifkan kembali akun."
        actionLabel="Ganti Akun"
        onAction={() => void logout()}
      />
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F3EE] p-5 sm:p-8">
      <section className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col items-center text-center">
          <MarketivLogo size={42} />
          <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#f97316]"><ShieldCheck className="h-6 w-6" aria-hidden="true" /></div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-[#0c172b]">Masuk Admin</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">Gunakan akun Admin Marketiv yang aktif untuk membuka control plane.</p>
        </div>

        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-bold text-stone-800">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending} className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-50" placeholder="admin@marketiv.id" /></label>
          <label className="block text-sm font-bold text-stone-800">Kata sandi<span className="relative mt-1.5 block"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" /><input required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} className="h-11 w-full rounded-xl border border-stone-200 bg-white py-0 pl-10 pr-11 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-50" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
          {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">{error}</p> : null}
          <button type="submit" disabled={pending} className="flex h-11 w-full items-center justify-center rounded-xl bg-[#0c172b] px-4 text-sm font-bold text-white transition hover:bg-[#172541] focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Memverifikasi…" : "Masuk ke Admin"}</button>
        </form>
      </section>
    </main>
  );
}
