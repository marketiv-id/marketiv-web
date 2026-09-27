"use client";

import { MessageCircle, Users, ExternalLink, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal";
import { cn } from "@/lib/utils";

export interface HelpAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: "umkm" | "kreator";
}

export function HelpAdminModal({ open, onOpenChange, role }: HelpAdminModalProps) {
  const isUmkm = role === "umkm";

  const handleGroupClick = (e: React.MouseEvent) => {
    if (!isUmkm) {
      e.preventDefault();
      toast.info("Tautan grup WhatsApp Konten Kreator akan segera tersedia!");
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-md w-full rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-2xl bg-white">
        <ResponsiveModalHeader className="space-y-2 text-left pb-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.7rem] font-black uppercase tracking-wider",
                isUmkm
                  ? "bg-orange-100 text-orange-700 border border-orange-200"
                  : "bg-violet-100 text-violet-700 border border-violet-200"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isUmkm ? "Pusat Bantuan UMKM" : "Pusat Bantuan Kreator"}
            </span>
          </div>
          <ResponsiveModalTitle className="text-xl font-black text-neutral-900 tracking-tight">
            Hubungi Admin & Komunitas
          </ResponsiveModalTitle>
          <ResponsiveModalDescription className="text-xs text-neutral-500 leading-relaxed">
            {isUmkm
              ? "Pilih opsi bantuan langsung dari Admin WhatsApp resmi Marketiv atau bergabung dengan grup komunitas UMKM."
              : "Pilih opsi bantuan langsung dari Admin WhatsApp resmi Marketiv atau bergabung dengan grup komunitas Konten Kreator."}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="flex flex-col gap-3.5 mt-3">
          {/* Opsi 1: WhatsApp Direct Admin (Berlaku untuk UMKM & Kreator) */}
          <a
            href="https://wa.me/628212244157"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpenChange(false)}
            className="group relative flex items-start gap-4 p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200 no-underline shadow-xs hover:shadow-md"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-extrabold text-neutral-900 group-hover:text-emerald-800 transition-colors">
                  Chat Admin Marketiv
                </h4>
                <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Respon Cepat
                </span>
              </div>
              <p className="text-[0.78rem] text-neutral-600 font-medium mt-1 leading-snug">
                Hubungi WhatsApp resmi Admin Marketiv (08212244157) untuk bantuan langsung & kendala akun.
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-600 shrink-0 mt-1 opacity-60 group-hover:opacity-100 transition-opacity" />
          </a>

          {/* Opsi 2: Grup WhatsApp Komunitas (Terisolasi per Role) */}
          {isUmkm ? (
            <a
              href="https://chat.whatsapp.com/KOXrodvuxmECxdze5mYiLn"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOpenChange(false)}
              className="group relative flex items-start gap-4 p-4 rounded-2xl border border-orange-200/80 bg-orange-50/40 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 no-underline shadow-xs hover:shadow-md"
            >
              <div className="w-11 h-11 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-extrabold text-neutral-900 group-hover:text-orange-900 transition-colors">
                    Grup WhatsApp UMKM
                  </h4>
                  <span className="text-[0.65rem] font-bold text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-md shrink-0">
                    Komunitas UMKM
                  </span>
                </div>
                <p className="text-[0.78rem] text-neutral-600 font-medium mt-1 leading-snug">
                  Bergabung dengan grup WhatsApp sesama pemilik UMKM Marketiv untuk berbagi info & strategi bisnis.
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-orange-600 shrink-0 mt-1 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
          ) : (
            <a
              href="https://chat.whatsapp.com/B55DUe8JbH1DB2GB8BvQRE?s=cl&p=i&mlu=4&amv=0"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOpenChange(false)}
              className="group relative flex items-start gap-4 p-4 rounded-2xl border border-violet-200/80 bg-violet-50/40 hover:bg-violet-50 hover:border-violet-300 transition-all duration-200 no-underline shadow-xs hover:shadow-md"
            >
              <div className="w-11 h-11 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-600/20 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-extrabold text-neutral-900 group-hover:text-violet-950 transition-colors">
                    Grup WhatsApp Konten Kreator
                  </h4>
                  <span className="text-[0.65rem] font-bold text-violet-700 bg-violet-100/80 px-2 py-0.5 rounded-md shrink-0">
                    Komunitas Kreator
                  </span>
                </div>
                <p className="text-[0.78rem] text-neutral-600 font-medium mt-1 leading-snug">
                  Bergabung dengan grup WhatsApp komunitas Konten Kreator Marketiv untuk berbagi peluang & kolaborasi.
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-violet-600 shrink-0 mt-1 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
          )}
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
