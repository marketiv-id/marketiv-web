"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  FileText,
  Clock,
  Hash,
  Ban,
  ShieldAlert,
  ShieldCheck,
  Share2,
  Search,
  X,
  BookOpen,
  Scale,
  HelpCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TERMS_CHAPTERS } from "@/content/terms";

type TabType = "rules" | "faq" | "terms";

const POPULAR_KEYWORDS = [
  "penarikan",
  "dana aman",
  "5%",
  "kolaborasi",
  "setujui otomatis",
  "sengketa",
  "pasal 11",
  "verifikasi identitas",
];

const RULES_DATA = [
  {
    id: 1,
    title: "Konten Wajib Orisinal & Mengikuti Arahan",
    desc: "Setiap video harus karya orisinal milik Anda dan sesuai dengan Arahan kampanye. Dilarang menjiplak atau mengklaim karya Kreator lain.",
    Icon: FileText,
    color: "#2563eb",
    bg: "#eff6ff",
    border: "rgba(37, 99, 235, 0.08)",
  },
  {
    id: 2,
    title: "Kirim Tautan Video Maksimum 24 Jam Setelah Posting",
    desc: "Di Mode Kampanye, kirimkan tautan tayang media sosial (TikTok/Instagram) dalam 24 jam sejak diposting. Dilarang mengunggah berkas video mentah ke sistem.",
    Icon: Clock,
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "rgba(22, 163, 74, 0.08)",
  },
  {
    id: 3,
    title: "Wajib Pakai Seluruh Tagar Kampanye",
    desc: "Caption video harus mengandung seluruh tagar wajib pada saat pengajuan. Tanpa tagar wajib, video tidak akan terdeteksi oleh sistem.",
    Icon: Hash,
    color: "#d97706",
    bg: "#fef3c7",
    border: "rgba(217, 119, 6, 0.08)",
  },
  {
    id: 4,
    title: "Mode Kampanye Tanpa Obrolan (Tanpa Revisi)",
    desc: "Di Mode Kampanye, tidak ada fitur obrolan, revisi, atau persetujuan. Anda mengambil lowongan, mengedit video, dan memposting di akun media sosial milik Anda sendiri.",
    Icon: Ban,
    color: "#dc2626",
    bg: "#fee2e2",
    border: "rgba(220, 38, 38, 0.08)",
  },
  {
    id: 5,
    title: "Mode Paket Harga Wajib Postingan Kolaborasi",
    desc: "Untuk pesanan Mode Paket Harga, konten WAJIB dipublikasikan menggunakan fitur Postingan Kolaborasi (Instagram/TikTok) agar UMKM mendapat trafik langsung.",
    Icon: Share2,
    color: "#0891b2",
    bg: "#ecfeff",
    border: "rgba(8, 145, 178, 0.08)",
  },
  {
    id: 6,
    title: "Tidak Ada Manipulasi Tayangan, Bot, atau Penggalakan Iklan Ilegal",
    desc: "Dilarang menggunakan bot, ladang tayangan, membeli tayangan, atau penggalakan iklan tidak sah. Video dengan tayangan palsu akan dibatalkan imbalannya dan akun berisiko ditangguhkan.",
    Icon: ShieldAlert,
    color: "#7c3aed",
    bg: "#faf5ff",
    border: "rgba(124, 58, 237, 0.08)",
  },
  {
    id: 7,
    title: "Perlindungan Dana lewat Sistem Dana Aman",
    desc: "Seluruh pembayaran pesanan ditahan aman di Dana Aman Marketiv (dana ditahan sementara) sampai hasil kerja tervalidasi atau disetujui, melindungi Kreator dari risiko tidak dibayar.",
    Icon: ShieldCheck,
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "rgba(22, 163, 74, 0.08)",
  },
];

const FAQ_DATA = [
  {
    question: "Berapa potongan biaya platform untuk Kreator?",
    answer: "Biaya platform resmi Marketiv adalah 5% per transaksi (Pasal 9.1 S&K v3.1). Di Mode Kampanye, Kreator menerima imbalan 100% penuh tanpa potongan (5% dibayar UMKM di awal). Di Mode Paket Harga, biaya platform 5% dipotong dari penghasilan Kreator saat pencairan dana dari sistem Dana Aman.",
  },
  {
    question: "Berapa minimum penarikan dana?",
    answer: "Minimum penarikan saldo adalah Rp 50.000 per transaksi, dengan batas maksimal 3 kali penarikan per hari (Pasal 11). Penarikan nominal Rp 5.000.000 atau lebih membutuhkan Verifikasi Identitas manual via WhatsApp Admin.",
  },
  {
    question: "Kapan saldo Dana Aman Paket Harga cair?",
    answer: "Saldo Dana Aman cair setelah UMKM menyetujui hasil kerja secara manual, ATAU secara otomatis oleh sistem (Setujui Otomatis) dalam 3 hari kalender jika UMKM tidak memberikan tanggapan (Pasal 7.2.g).",
  },
  {
    question: "Bagaimana jika ada masalah pembayaran atau sengketa?",
    answer: "Anda dilindungi oleh sistem Sengketa. Jika UMKM menolak pengiriman tanpa alasan yang sah atau membatalkan pesanan sepihak, Anda dapat mengajukan sengketa via WhatsApp Admin Marketiv dalam 7 hari (Pasal 14).",
  },
  {
    question: "Apa bedanya tipe Kampanye UGC dan Kliping?",
    answer: "Di Mode Kampanye UGC, Anda memikirkan konsep dan membuat video dari awal. Di tipe Kliping, UMKM menyediakan video mentah/aset mentah, dan Anda bertugas mengedit/menggubahnya menjadi konten menarik.",
  },
  {
    question: "Apakah Kreator boleh bertransaksi di luar Marketiv?",
    answer: "DILARANG KERAS. Bertransaksi di luar platform menghilangkan perlindungan Dana Aman dan dapat menyebabkan akun ditangguhkan secara permanen.",
  },
];

export default function KreatorPanduanPage() {
  const [activeTab, setActiveTab] = useState<TabType>("rules");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChapterId, setActiveChapterId] = useState<string>("bab-1");
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQIndex(openFAQIndex === index ? null : index);
  };

  // Global Keyword Search Calculations across all 3 domains
  const matchingRules = useMemo(() => {
    if (!searchQuery.trim()) return RULES_DATA;
    const q = searchQuery.toLowerCase();
    return RULES_DATA.filter(
      (r) => r.title.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const matchingFAQ = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_DATA;
    const q = searchQuery.toLowerCase();
    return FAQ_DATA.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const matchingPasalList = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const result: { pasalNumber: string; title: string; itemText: string }[] = [];

    TERMS_CHAPTERS.forEach((ch) => {
      ch.pasalList.forEach((p) => {
        const matchPasalName =
          p.pasalNumber.toLowerCase().includes(q) || p.title.toLowerCase().includes(q);
        const matchItem = p.items.filter((it) => it.toLowerCase().includes(q));

        if (matchPasalName || matchItem.length > 0) {
          result.push({
            pasalNumber: p.pasalNumber,
            title: p.title,
            itemText: matchItem.length > 0 ? matchItem.join(" | ") : p.items[0],
          });
        }
      });
    });

    return result;
  }, [searchQuery]);

  const matchingChapters = useMemo(() => {
    if (!searchQuery.trim()) return TERMS_CHAPTERS;
    const q = searchQuery.toLowerCase();

    return TERMS_CHAPTERS.map((ch) => {
      const matchingPasal = ch.pasalList.filter(
        (p) =>
          p.pasalNumber.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.items.some((it) => it.toLowerCase().includes(q))
      );
      return { ...ch, pasalList: matchingPasal };
    }).filter((ch) => ch.pasalList.length > 0);
  }, [searchQuery]);

  const totalMatches =
    matchingRules.length + matchingFAQ.length + matchingPasalList.length;

  const scrollToChapter = (chapterId: string) => {
    setActiveChapterId(chapterId);
    const el = document.getElementById(chapterId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden min-w-0 max-w-full">
      <div className="w-full max-w-[960px] mx-auto space-y-5 sm:space-y-6 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 min-w-0">
          <div className="space-y-1 min-w-0">
            <span className="text-[0.68rem] font-[800] text-violet-600 uppercase tracking-widest block">
              Pusat Informasi &amp; Hukum Kreator
            </span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-[850] text-ink-900 leading-tight tracking-tight font-display break-words">
              FAQ, Aturan &amp; Syarat Ketentuan Kreator
            </h1>
            <p className="text-xs sm:text-sm text-ink-500 font-medium leading-relaxed">
              Pencarian kata kunci lintas Aturan Kreator, FAQ Penghasilan, dan 22 Pasal S&amp;K Versi 3.1.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-200/80 text-violet-800 text-xs font-bold shrink-0 self-start sm:self-auto">
            <CheckCircle2 size={14} className="text-violet-600 shrink-0" />
            <span className="whitespace-nowrap">Versi Resmi 3.1 (Agustus 2026)</span>
          </div>
        </div>

        {/* Global Keyword Search Box */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-neutral-200/90 shadow-sm space-y-3 min-w-0">
          <div className="relative flex items-center min-w-0">
            <Search size={18} className="absolute left-3.5 sm:left-4 text-slate-400 pointer-events-none shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kata kunci (misal: 'penarikan', 'dana aman', '5%')..."
              className="w-full pl-10 sm:pl-11 pr-10 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-neutral-50 border border-neutral-200/80 text-xs sm:text-sm font-semibold text-ink-900 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:bg-white transition-all shadow-2xs min-w-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 p-1.5 rounded-lg bg-neutral-200/70 hover:bg-neutral-300 text-slate-600 transition-colors cursor-pointer"
                aria-label="Bersihkan pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Popular Search Suggestions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs pt-1">
            <span className="text-[10.5px] sm:text-[11px] font-extrabold text-ink-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Tag size={12} className="text-violet-600" />
              Kata Kunci Populer:
            </span>
            {POPULAR_KEYWORDS.map((kw) => (
              <button
                key={kw}
                onClick={() => setSearchQuery(kw)}
                className={cn(
                  "px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer border",
                  searchQuery.toLowerCase() === kw
                    ? "bg-violet-600 text-white border-violet-600 shadow-xs"
                    : "bg-neutral-100/80 hover:bg-violet-50 text-ink-700 hover:text-violet-700 border-neutral-200/80"
                )}
              >
                {kw}
              </button>
            ))}
          </div>

          {/* Search Result Feedback Indicator */}
          {searchQuery && (
            <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold">
              <p className="text-violet-900 bg-violet-50 px-3 py-1.5 rounded-xl border border-violet-200/60 break-words">
                Ditemukan <strong className="font-extrabold">{totalMatches}</strong> hasil pencarian kata kunci &quot;<span className="font-bold">{searchQuery}</span>&quot;
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-slate-500 hover:text-violet-600 font-bold underline cursor-pointer self-start sm:self-auto"
              >
                Setel Ulang Pencarian
              </button>
            </div>
          )}
        </div>

        {/* Global Keyword Search Results Mode (When Search is Active) */}
        {searchQuery.trim() ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 min-w-0">
            {totalMatches === 0 ? (
              <div className="p-8 sm:p-10 text-center bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/80 space-y-2">
                <p className="text-sm sm:text-base font-bold text-ink-900">
                  Kata kunci &quot;{searchQuery}&quot; tidak ditemukan.
                </p>
                <p className="text-xs text-ink-500 font-medium">
                  Coba kata kunci lain seperti <button onClick={() => setSearchQuery("penarikan")} className="text-violet-600 font-bold underline cursor-pointer">penarikan</button>, <button onClick={() => setSearchQuery("5%")} className="text-violet-600 font-bold underline cursor-pointer">5%</button>, atau <button onClick={() => setSearchQuery("dana aman")} className="text-violet-600 font-bold underline cursor-pointer">dana aman</button>.
                </p>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8 min-w-0">
                {/* Match Group 1: Aturan Kreator */}
                {matchingRules.length > 0 && (
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-center gap-2 border-b border-neutral-200/60 pb-2">
                      <ShieldCheck size={16} className="text-violet-600 shrink-0" />
                      <h2 className="text-xs sm:text-sm font-extrabold text-ink-900 font-display uppercase tracking-wider">
                        Hasil di Aturan Kreator ({matchingRules.length})
                      </h2>
                    </div>

                    <div className="grid gap-3">
                      {matchingRules.map((rule) => {
                        const RuleIcon = rule.Icon;
                        return (
                          <div
                            key={rule.id}
                            className="flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-2xs hover:border-violet-300 transition-all min-w-0"
                          >
                            <div
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
                              style={{ background: rule.bg, borderColor: rule.border }}
                            >
                              <RuleIcon size={16} color={rule.color} />
                            </div>
                            <div className="space-y-1 min-w-0 flex-1">
                              <h3 className="text-xs sm:text-sm font-bold text-ink-900 break-words">
                                {rule.title}
                              </h3>
                              <p className="text-[11.5px] sm:text-xs text-ink-600 font-semibold leading-relaxed break-words">
                                {rule.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Match Group 2: FAQ Penghasilan */}
                {matchingFAQ.length > 0 && (
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-center gap-2 border-b border-neutral-200/60 pb-2">
                      <HelpCircle size={16} className="text-violet-600 shrink-0" />
                      <h2 className="text-xs sm:text-sm font-extrabold text-ink-900 font-display uppercase tracking-wider">
                        Hasil di FAQ Penghasilan ({matchingFAQ.length})
                      </h2>
                    </div>

                    <div className="grid gap-3">
                      {matchingFAQ.map((faq, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-1.5 min-w-0"
                        >
                          <h3 className="text-xs sm:text-sm font-extrabold text-ink-900 flex items-start gap-2 break-words">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-600 mt-1.5 shrink-0" />
                            <span className="flex-1 min-w-0">{faq.question}</span>
                          </h3>
                          <p className="text-[11.5px] sm:text-xs text-ink-600 font-semibold leading-relaxed pl-3.5 break-words">
                            {faq.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Match Group 3: Syarat & Ketentuan (Pasal 1 - 22) */}
                {matchingPasalList.length > 0 && (
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-center gap-2 border-b border-neutral-200/60 pb-2">
                      <Scale size={16} className="text-violet-600 shrink-0" />
                      <h2 className="text-xs sm:text-sm font-extrabold text-ink-900 font-display uppercase tracking-wider">
                        Hasil di Syarat &amp; Ketentuan Pasal ({matchingPasalList.length})
                      </h2>
                    </div>

                    <div className="grid gap-3">
                      {matchingPasalList.map((p, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-2 min-w-0"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700 text-[11px] font-black font-mono">
                              {p.pasalNumber}
                            </span>
                            <h3 className="text-xs sm:text-sm font-bold text-ink-900 break-words">
                              {p.title}
                            </h3>
                          </div>
                          <p className="text-[11.5px] sm:text-xs text-ink-700 font-semibold leading-relaxed bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 break-words">
                            {p.itemText}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Standard Tabbed Mode (When Search Input is Empty) */
          <>
            {/* Navigation Tabs (Responsive Scrollable on Mobile) */}
            <div className="w-full max-w-full overflow-x-auto no-scrollbar py-0.5">
              <div className="inline-flex sm:flex p-1 sm:p-1.5 rounded-2xl bg-neutral-100 border border-neutral-200/60 min-w-full sm:min-w-0 sm:max-w-xl shadow-3xs gap-1">
                {[
                  { id: "rules", label: "Aturan Kreator", icon: ShieldCheck },
                  { id: "faq", label: "FAQ Penghasilan", icon: HelpCircle },
                  { id: "terms", label: "Syarat & Ketentuan", sublabel: "(Pasal 1-22)", icon: Scale },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={cn(
                        "flex-1 py-2 sm:py-2.5 px-3 sm:px-3.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 sm:shrink",
                        isActive
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/10"
                          : "text-ink-600 hover:text-ink-900 hover:bg-white/60"
                      )}
                    >
                      <TabIcon size={14} className="shrink-0" />
                      <span>{tab.label}</span>
                      {tab.sublabel && (
                        <span className="hidden md:inline text-[10px] opacity-80">{tab.sublabel}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab 1: Rules Panel */}
            {activeTab === "rules" && (
              <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 min-w-0">
                <div className="flex justify-between items-center border-b border-neutral-200/60 pb-3">
                  <h2 className="text-[0.95rem] sm:text-[1.05rem] font-[800] text-ink-900 font-display">
                    Aturan Utama Kerja Kreator
                  </h2>
                  <span className="text-[0.7rem] sm:text-[0.74rem] font-bold text-ink-400">
                    Versi Resmi 3.1
                  </span>
                </div>

                <div className="grid gap-3 sm:gap-4">
                  {RULES_DATA.map((rule) => {
                    const RuleIcon = rule.Icon;
                    return (
                      <div
                        key={rule.id}
                        className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-[26px] bg-white border border-neutral-200/60 shadow-3xs sm:shadow-[0_4px_16px_rgba(15,23,42,.05)] hover:-translate-y-0.5 hover:shadow-md hover:border-neutral-300/80 transition-all duration-300 min-w-0"
                      >
                        <div
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
                          style={{
                            background: rule.bg,
                            borderColor: rule.border,
                          }}
                        >
                          <RuleIcon size={18} color={rule.color} />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <h3 className="text-xs sm:text-[0.92rem] font-bold text-ink-900 leading-snug break-words">
                            {rule.id}. {rule.title}
                          </h3>
                          <p className="text-[11.5px] sm:text-[0.84rem] text-ink-600 leading-relaxed font-semibold break-words">
                            {rule.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: FAQ Panel */}
            {activeTab === "faq" && (
              <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 min-w-0">
                <div className="flex justify-between items-center border-b border-neutral-200/60 pb-3">
                  <h2 className="text-[0.95rem] sm:text-[1.05rem] font-[800] text-ink-900 font-display">
                    FAQ Penghasilan &amp; Pekerjaan
                  </h2>
                  <span className="text-[0.7rem] sm:text-[0.74rem] font-bold text-ink-400">
                    Versi Resmi 3.1
                  </span>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <span className="block text-[0.66rem] font-[800] text-ink-400 uppercase tracking-widest mb-1.5 sm:mb-2.5">
                    Penghasilan &amp; Dana Aman (Biaya Platform 5%, Penarikan)
                  </span>

                  <div className="grid gap-2.5 sm:gap-3.5">
                    {FAQ_DATA.map((faq, idx) => {
                      const isOpen = openFAQIndex === idx;
                      return (
                        <div
                          key={idx}
                          className="rounded-2xl sm:rounded-[26px] border border-neutral-200/60 bg-white overflow-hidden shadow-3xs sm:shadow-[0_4px_16px_rgba(15,23,42,.05)] hover:-translate-y-0.5 hover:shadow-md hover:border-neutral-300/80 transition-all duration-300 min-w-0"
                        >
                          <button
                            onClick={() => toggleFAQ(idx)}
                            className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-xs sm:text-[0.9rem] text-ink-900 hover:bg-neutral-50/50 transition-all cursor-pointer gap-3 min-w-0"
                          >
                            <span className="break-words min-w-0 flex-1">{faq.question}</span>
                            <ChevronDown
                              size={16}
                              className={cn(
                                "text-ink-400 transition-transform duration-200 shrink-0",
                                isOpen && "rotate-180 text-violet-600"
                              )}
                            />
                          </button>
                          {isOpen && (
                            <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 text-[11.5px] sm:text-[0.84rem] text-ink-600 leading-relaxed font-semibold border-t border-neutral-100 bg-neutral-50/20 animate-in fade-in slide-in-from-top-1 duration-200 break-words">
                              {faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Terms & Conditions (Clean 2-Column Reader View for Pasal 1 - 22) */}
            {activeTab === "terms" && (
              <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 min-w-0">
                {/* Callout Summary Box */}
                <div className="p-4 sm:p-5 rounded-2xl border border-violet-200 bg-violet-50/60 text-xs sm:text-[0.84rem] leading-relaxed text-violet-900 relative overflow-hidden shadow-xs">
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-violet-600" />
                  <span className="block font-bold mb-1 text-violet-800 uppercase tracking-wider text-[0.68rem] sm:text-[0.72rem]">
                    Ketentuan Pendapatan Kreator &amp; Biaya Platform 5% (S&amp;K Versi 3.1)
                  </span>
                  (a) Di Mode Kampanye, Kreator menerima 100% penuh imbalan tanpa potongan (5% dibayar UMKM di awal). <br />
                  (b) Di Mode Paket Harga, biaya platform 5% dipotong dari pendapatan Kreator saat Dana Aman dirilis ke Dompet. Penarikan min Rp 50.000 (Pasal 11).
                </div>

                {/* 2-Column Reader Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start min-w-0">
                  {/* Left Column: Jump Navigation BAB (Sticky TOC on Desktop, Horizontal Scroll on Mobile) */}
                  <div className="lg:col-span-4 lg:sticky lg:top-6 bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-neutral-200/80 shadow-sm space-y-2.5 sm:space-y-3 min-w-0">
                    <span className="text-[0.68rem] font-[800] text-ink-400 uppercase tracking-widest block px-1 sm:px-2">
                      Daftar BAB S&amp;K (Pasal 1 - 22)
                    </span>
                    <div className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar lg:overflow-visible pb-1 lg:pb-0">
                      {TERMS_CHAPTERS.map((ch) => {
                        const isActive = activeChapterId === ch.id;
                        return (
                          <button
                            key={ch.id}
                            onClick={() => scrollToChapter(ch.id)}
                            className={cn(
                              "text-left p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-2 border text-xs font-bold shrink-0 lg:shrink lg:w-full min-w-[160px] lg:min-w-0",
                              isActive
                                ? "bg-violet-50 border-violet-300 text-violet-900 shadow-xs"
                                : "bg-neutral-50/60 border-neutral-200/60 text-ink-700 hover:bg-neutral-100 hover:text-ink-900"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-black text-violet-600 block uppercase font-mono">
                                {ch.bab}
                              </span>
                              <span className="truncate block font-extrabold">{ch.title}</span>
                            </div>
                            <ChevronRight
                              size={14}
                              className={cn("hidden lg:block shrink-0 text-slate-400", isActive && "text-violet-600")}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Continuous Document Stream */}
                  <div className="lg:col-span-8 space-y-6 sm:space-y-8 bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-neutral-200/80 shadow-sm min-w-0">
                    {matchingChapters.map((ch) => (
                      <div id={ch.id} key={ch.id} className="space-y-4 sm:space-y-6 pt-2 first:pt-0 min-w-0">
                        {/* Chapter Title Header */}
                        <div className="border-b-2 border-violet-500/20 pb-3 min-w-0">
                          <span className="text-xs font-black text-violet-600 tracking-wider font-mono uppercase">
                            {ch.bab}
                          </span>
                          <h2 className="text-base sm:text-lg lg:text-xl font-black text-ink-900 font-display break-words">
                            {ch.title}
                          </h2>
                        </div>

                        {/* Pasal Stream */}
                        <div className="space-y-4 sm:space-y-6 min-w-0">
                          {ch.pasalList.map((p, pIdx) => (
                            <div
                              key={pIdx}
                              className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-neutral-50/70 border border-neutral-200/70 space-y-2.5 sm:space-y-3 min-w-0"
                            >
                              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                                <span className="px-2 sm:px-2.5 py-0.5 rounded-md bg-violet-600 text-white text-[11px] sm:text-xs font-black font-mono">
                                  {p.pasalNumber}
                                </span>
                                <h3 className="text-xs sm:text-sm lg:text-base font-bold text-ink-900 break-words">
                                  {p.title}
                                </h3>
                              </div>

                              <div className="space-y-2 text-xs sm:text-sm text-ink-700 leading-relaxed font-semibold pl-0.5 sm:pl-1">
                                {p.items.map((it, itIdx) => (
                                  <div key={itIdx} className="flex items-start gap-2 sm:gap-2.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600 mt-1.5 sm:mt-2 shrink-0" />
                                    <span className="break-words min-w-0 flex-1">{it}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Support Card */}
        <div className="mt-6 sm:mt-8 p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-5 shadow-lg min-w-0">
          <div className="space-y-1 text-center md:text-left min-w-0">
            <h4 className="text-sm sm:text-base font-bold font-display flex items-center justify-center md:justify-start gap-2">
              <BookOpen size={18} className="text-violet-400 shrink-0" />
              <span>Punya Pertanyaan Seputar Pekerjaan atau Pencairan?</span>
            </h4>
            <p className="text-xs text-slate-300 font-medium max-w-lg leading-relaxed break-words">
              Tim Dukungan Kreator Marketiv siap membantu menjawab kendala teknis atau sengketa pekerjaan lewat surel di <strong className="text-white">marketiv.official@gmail.com</strong> atau WhatsApp resmi Admin.
            </p>
          </div>

          <a
            href="mailto:marketiv.official@gmail.com"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs transition-colors shrink-0 no-underline shadow-md shadow-violet-500/20"
          >
            <span>Hubungi Dukungan Kreator</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
