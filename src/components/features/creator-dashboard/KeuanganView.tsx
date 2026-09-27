"use client";

import { useState } from "react";
import {
  Wallet,
  Clock,
  TrendingUp,
  Calendar,
  Megaphone,
  BadgeDollarSign,
  X,
  ChevronRight,
  ArrowDownToLine,
  AlertTriangle,
  Landmark,
  ReceiptText,
  CreditCard,
  Smartphone,
  User,
  ShieldCheck,
  Check,
} from "lucide-react";
import { CreatorMetric, CreatorTransaction } from "@/types/creator-dashboard";
import { CreatorStatusBadge } from "./CreatorStatusBadge";
import { CreatorEmptyState } from "./CreatorEmptyState";
import { MetricCard } from "@/components/ui/metric-card";
import { SearchToolbar, type SearchToolbarFilter } from "@/components/features/dashboard/shared";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatRupiahInput } from "@/lib/formatters";
import { getTransactionTypeLabel, getWithdrawalStatusLabel } from "@/lib/dashboard-labels";
import { cn } from "@/lib/utils";
import { MINIMUM_WITHDRAW } from "@/types/domain";
import { matchesCreatorTransactionStatusFilter } from "@/lib/creator-status";
import {
  withdrawalRequestSchema,
  PAYOUT_PROVIDERS,
  type PayoutMethod,
} from "@/lib/validations/withdrawal.schema";
import { parseOrErrors } from "@/lib/validations/to-field-errors";
import { requestWithdrawal } from "@/services/creator/creator-dashboard.service";
import { useTosConsent } from "@/components/providers/TosConsentProvider";

interface KeuanganViewProps {
  metrics: CreatorMetric;
  initialTransactions: CreatorTransaction[];
}

export function KeuanganView({ metrics, initialTransactions }: KeuanganViewProps) {
  const { ensureCurrentConsent } = useTosConsent();
  // Fallback 0, bukan angka contoh: ini nominal uang yang dibaca kreator.
  const [walletMetrics, setWalletMetrics] = useState<CreatorMetric>({
    ...metrics,
    totalEarnings: metrics.totalEarnings ?? 0,
    thisMonthEarnings: metrics.thisMonthEarnings ?? 0,
    campaignEarnings: metrics.campaignEarnings ?? 0,
    rateCardEarnings: metrics.rateCardEarnings ?? 0,
  });

  const [transactions, setTransactions] = useState<CreatorTransaction[]>(initialTransactions);

  // Withdrawal form states
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [bankName, setBankName] = useState("mandiri");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [amount, setAmount] = useState("");

  // Request acceptance bukan bukti transfer final oleh admin.
  const [withdrawStep, setWithdrawStep] = useState<"form" | "confirm" | "requested">("form");
  const [lastWithdrawalDetails, setLastWithdrawalDetails] = useState<{
    id: string;
    bank: string;
    number: string;
    holder: string;
    amount: number;
    fee: number;
    total: number;
  } | null>(null);

  // Detail Modal state
  const [selectedTx, setSelectedTx] = useState<CreatorTransaction | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [requestKey, setRequestKey] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("latest"); // "latest" | "oldest" | "highest" | "lowest"

  // Tidak ada biaya admin: Function request-withdrawal mendebit tepat `amount`
  // dan tidak menulis baris fee. ADMIN_FEE Rp2.500 sebelumnya karangan frontend.
  const numericAmount = Number(amount) || 0;
  const isAmountTooLow = numericAmount > 0 && numericAmount < MINIMUM_WITHDRAW;
  const isAmountTooHigh = numericAmount > 0 && numericAmount > walletMetrics.balance;
  const isAmountValid =
    numericAmount >= MINIMUM_WITHDRAW && numericAmount <= walletMetrics.balance;
  const maxWithdrawable = Math.max(0, walletMetrics.balance);

  const isWithdrawDisabled = walletMetrics.balance < MINIMUM_WITHDRAW;

  const selectedProvider = PAYOUT_PROVIDERS.find((p) => p.id === bankName);
  const isEwallet = selectedProvider?.method === "ewallet";

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAmountValid) return;
    // Kunci idempotensi dibuat SEKALI saat masuk langkah konfirmasi, sehingga
    // retry setelah error jaringan tidak menarik saldo dua kali.
    setRequestKey(crypto.randomUUID());
    setWithdrawError(null);
    setWithdrawStep("confirm");
  };

  const handleConfirmWithdrawal = async () => {
    const withdrawAmt = Number(amount);
    const method: PayoutMethod = isEwallet ? "ewallet" : "bank";

    // Pra-validasi Zod: feedback instan + satu-satunya sumber code "validation"
    // yang andal di klien.
    const parsed = parseOrErrors(withdrawalRequestSchema(walletMetrics.balance), {
      amount: withdrawAmt,
      payoutMethod: method,
      providerName: selectedProvider?.label ?? bankName,
      accountNumber,
      accountName: accountHolder,
    });
    if (!parsed.ok) {
      setWithdrawError(Object.values(parsed.errors)[0] ?? "Periksa kembali data penarikan.");
      return;
    }

    try {
      if (!(await ensureCurrentConsent())) {
        setWithdrawError("Gagal memverifikasi status persetujuan Syarat & Ketentuan. Coba lagi.");
        return;
      }
    } catch {
      setWithdrawError("Gagal memverifikasi status persetujuan Syarat & Ketentuan. Coba lagi.");
      return;
    }

    setWithdrawError(null);
    setIsSubmittingWithdraw(true);
    const res = await requestWithdrawal({ ...parsed.data, requestKey });
    setIsSubmittingWithdraw(false);

    if (!res.success || !res.data) {
      setWithdrawError(
        res.code === "auth"
          ? "Sesi berakhir, silakan login kembali."
          : res.error ?? "Gagal memproses penarikan."
      );
      return;
    }

    const receipt = res.data;

    // Saldo sesudah reserve hanya boleh berasal dari Function, bukan hitungan klien.
    setWalletMetrics((prev) => ({
      ...prev,
      balance: receipt.balanceAfter,
    }));

    const providerLabel = selectedProvider?.label ?? bankName;
    const newTx: CreatorTransaction = {
      id: receipt.transactionId ?? receipt.withdrawalId,
      type: "withdrawal",
      amount: receipt.amount,
      // Nilai yang benar-benar ditulis Function ke transactions.status.
      status: "pending",
      description: `Pengajuan penarikan saldo ke ${providerLabel} (${accountNumber})`,
      createdAt: receipt.requestedAt,
      source: "Withdrawal",
      notes: "Menunggu diproses tim Marketiv.",
    };

    setTransactions((current) => [newTx, ...current]);

    setLastWithdrawalDetails({
      id: receipt.withdrawalId,
      bank: bankName,
      number: accountNumber,
      holder: accountHolder,
      amount: receipt.amount,
      fee: 0,
      total: receipt.amount,
    });

    setWithdrawStep("requested");
  };

  const resetWithdrawForm = () => {
    setIsWithdrawOpen(false);
    setWithdrawStep("form");
    setAmount("");
    setAccountNumber("");
    setAccountHolder("");
    setLastWithdrawalDetails(null);
    setWithdrawError(null);
    setRequestKey("");
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    setFilterStatus("all");
    setSortBy("latest");
  };

  const isFilterActive = searchQuery !== "" || filterType !== "all" || filterStatus !== "all" || sortBy !== "latest";
  const toolbarFilters: SearchToolbarFilter[] = [
    {
      label: "Sumber",
      value: filterType,
      onChange: setFilterType,
      options: [
        { value: "all", label: "Semua Sumber" },
        { value: "campaign", label: "Kampanye" },
        { value: "rate card", label: "Paket Harga" },
        { value: "withdrawal", label: "Penarikan" },
      ],
    },
    {
      label: "Status",
      value: filterStatus,
      onChange: setFilterStatus,
      options: [
        { value: "all", label: "Semua Status" },
        { value: "success", label: "Berhasil" },
        { value: "pending", label: "Menunggu" },
        { value: "processing", label: "Diproses" },
        { value: "failed", label: "Gagal" },
      ],
    },
    {
      label: "Urutan",
      value: sortBy,
      onChange: setSortBy,
      options: [
        { value: "latest", label: "Terbaru" },
        { value: "oldest", label: "Terlama" },
        { value: "highest", label: "Jumlah Terbesar" },
        { value: "lowest", label: "Jumlah Terkecil" },
      ],
      prefix: "Urut",
    },
  ];

  // Filter and sort transactions
  const filteredTransactions = (() => {
    let result = [...transactions];

    // Search query filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.id.toLowerCase().includes(q) ||
          tx.description.toLowerCase().includes(q) ||
          (tx.relatedName && tx.relatedName.toLowerCase().includes(q))
      );
    }

    // Source type filter
    if (filterType !== "all") {
      result = result.filter((tx) => tx.source?.toLowerCase() === filterType.toLowerCase());
    }

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter((tx) =>
        matchesCreatorTransactionStatusFilter(tx.status, filterStatus)
      );
    }


    // Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      if (sortBy === "latest") return dateB - dateA;
      if (sortBy === "oldest") return dateA - dateB;
      if (sortBy === "highest") return b.amount - a.amount;
      if (sortBy === "lowest") return a.amount - b.amount;
      return 0;
    });

    return result;
  })();

  const TRANSACTION_SOURCE_LABELS: Record<string, string> = {
    campaign: "Kampanye",
    "rate card": "Paket Harga",
    withdrawal: "Penarikan",
  };

  const getSourceLabel = (source?: string) =>
    (source && TRANSACTION_SOURCE_LABELS[source.toLowerCase()]) || source || "";

  const getBankLabel = (code: string) =>
    PAYOUT_PROVIDERS.find((p) => p.id === code)?.label ?? code.toUpperCase();

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto relative">
      <div className="max-w-[1280px] mx-auto space-y-6">

        {/* Header — konsisten dengan gaya Campaign/Negosiasi */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-orange-600 text-[.74rem] font-[900] tracking-[.12em] uppercase mb-1.5">
              <span className="block w-[18px] h-0.5 rounded-full bg-orange-500" />
              Keuangan Kreator
            </div>
            <h2 className="font-display text-[clamp(1.5rem,2.8vw,2.1rem)] font-bold tracking-[-0.065em] text-ink-950 m-0 mb-1.5 leading-none">
              Keuangan &amp; Dompet
            </h2>
            <p className="text-ink-500 text-[.88rem] m-0 max-w-xl">
              Pantau saldo, riwayat penarikan, pendapatan kampanye, dan transaksi Dana Aman (dana ditahan sementara) dari Paket Harga Anda.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">
            <button
              onClick={() => {
                setIsWithdrawOpen(true);
                setWithdrawStep("form");
              }}
              disabled={isWithdrawDisabled}
              className={cn(
                "inline-flex items-center gap-2 min-h-[46px] px-[22px] rounded-xl font-[800] text-[.9rem] tracking-[-0.012em] transition-all duration-200 cursor-pointer whitespace-nowrap",
                isWithdrawDisabled
                  ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
                  : "border border-orange-900/20 bg-gradient-to-b from-finance-action to-primary-600 text-white shadow-finance-action hover:shadow-finance-action-hover hover:-translate-y-px"
              )}
            >
              <ArrowDownToLine size={17} />
              Ajukan Penarikan
            </button>
          </div>
        </div>

            {/* ===== Metrics Grid: 2 cols mobile → 3 cols sm+ ===== */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <>
                  {/* Saldo Tersedia — hero card, full width on mobile */}
                  <div className="col-span-2 sm:col-span-1 relative overflow-hidden rounded-2xl sm:rounded-[22px] border border-orange-900/20 bg-gradient-to-br from-finance-action to-primary-600 p-5 sm:p-6 text-white shadow-finance-action transition-all duration-300 hover:-translate-y-1 hover:shadow-finance-action-hover group">
                    <div
                      className="absolute inset-0 pointer-events-none opacity-70"
                      style={{
                        background:
                          "radial-gradient(circle at 85% 15%, rgba(255,255,255,.22) 0 22%, transparent 23%)," +
                          "radial-gradient(circle at 100% 65%, rgba(255,255,255,.12) 0 30%, transparent 31%)",
                      }}
                    />
                    <div className="relative">
                      <div className="flex items-center justify-between gap-3 mb-3.5">
                        <div className="w-10 h-10 rounded-[14px] grid place-items-center bg-white/15 border border-white/20 shadow-3xs transition-transform duration-300 group-hover:scale-105">
                          <Wallet size={18} />
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[.68rem] font-extrabold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                          Siap Ditarik
                        </span>
                      </div>
                      <div className="text-[.74rem] font-extrabold text-white/70 tracking-wide uppercase">
                        Saldo Tersedia
                      </div>
                      <div className="font-display text-[1.55rem] sm:text-[1.75rem] font-black tracking-tight leading-none mt-1.5 break-all">
                        {formatCurrency(walletMetrics.balance)}
                      </div>
                      <div className="text-[.72rem] text-white/70 font-semibold mt-2 leading-none">
                        Min. penarikan {formatCurrency(MINIMUM_WITHDRAW)} &bull; Tanpa biaya admin
                      </div>
                    </div>
                  </div>

                  <MetricCard
                    icon={<Clock />}
                    label="Pencairan Tertunda"
                    value={formatCurrency(walletMetrics.pendingPayouts)}
                    helper="Menunggu audit/validasi tayangan"
                    tone="warning"
                  />
                  <MetricCard
                    icon={<TrendingUp />}
                    label="Total Pendapatan"
                    value={formatCurrency(walletMetrics.totalEarnings || 0)}
                    helper="Akumulasi seluruh pendapatan"
                    tone="success"
                  />
                  <MetricCard
                    icon={<Calendar />}
                    label="Pendapatan Bulan Ini"
                    value={formatCurrency(walletMetrics.thisMonthEarnings || 0)}
                    helper="Bulan berjalan"
                    tone="info"
                  />
                  <MetricCard
                    icon={<Megaphone />}
                    label="Pendapatan Kampanye"
                    value={formatCurrency(walletMetrics.campaignEarnings || 0)}
                    helper="Dari pemasaran bayar per tayangan"
                    tone="primary"
                  />
                  <MetricCard
                    icon={<BadgeDollarSign />}
                    label="Pendapatan Paket Harga"
                    value={formatCurrency(walletMetrics.rateCardEarnings || 0)}
                    helper="Dari negosiasi premium"
                    tone="accent"
                  />
                </>
            </div>

            {/* ===== Ledger Workspace ===== */}
            <div className="bg-white border border-neutral-200/80 shadow-3xs rounded-2xl sm:rounded-[22px] p-4 sm:p-6">
              {/* Header + Toolbar */}
              <div className="flex flex-col gap-4 border-b border-neutral-100 pb-5 mb-5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="w-8 h-8 rounded-lg grid place-items-center bg-neutral-50 border border-neutral-200/60 text-neutral-500">
                    <ReceiptText size={15} />
                  </div>
                  <h3 className="font-display font-black text-neutral-900 text-[.95rem] tracking-tight">
                    Riwayat Transaksi Dompet
                  </h3>
                  <span className="inline-flex items-center justify-center min-w-[22px] h-[20px] rounded-full bg-neutral-100 text-neutral-500 text-[10px] font-extrabold px-1.5">
                    {filteredTransactions.length}
                  </span>
                </div>

                <SearchToolbar
                  searchValue={searchQuery}
                  onSearchChange={setSearchQuery}
                  searchPlaceholder="Cari ID, deskripsi, atau kampanye..."
                  filters={toolbarFilters}
                  onClearFilters={handleResetFilters}
                  hasActiveFilters={isFilterActive}
                  theme="kreator"
                />
              </div>
              {/* Ledger Table */}
              {filteredTransactions.length === 0 ? (
                <CreatorEmptyState
                  title={isFilterActive ? "Transaksi tidak ditemukan" : "Belum Ada Transaksi"}
                  description={
                    isFilterActive
                      ? "Tidak ada transaksi yang cocok dengan filter yang Anda pilih."
                      : "Anda belum punya riwayat transaksi di Marketiv."
                  }
                  actionButton={
                    isFilterActive ? (
                      <button
                        onClick={handleResetFilters}
                        className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-600 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-3xs"
                      >
                        <X size={12} /> Bersihkan Filter
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full min-w-[768px] text-left border-collapse text-xs font-semibold text-neutral-600">
                      <thead>
                        <tr className="border-b border-neutral-200 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                          <th className="pb-3 pr-4">ID Transaksi</th>
                          <th className="pb-3 pr-4">Tanggal</th>
                          <th className="pb-3 pr-4">Sumber</th>
                          <th className="pb-3 pr-4">Deskripsi</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 pr-4 text-right">Jumlah</th>
                          <th className="pb-3 w-6" aria-hidden="true"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {filteredTransactions.map((tx) => {
                          const isNegative = tx.type === "withdrawal";
                          return (
                            <tr
                              key={tx.id}
                              onClick={() => setSelectedTx(tx)}
                              className="hover:bg-orange-50/30 cursor-pointer transition-colors group"
                            >
                              <td className="py-4 pr-4 font-mono font-bold text-neutral-400 group-hover:text-primary transition-colors">
                                {tx.id}
                              </td>
                              <td className="py-4 pr-4 font-medium text-neutral-500">
                                {new Date(tx.createdAt).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="py-4 pr-4">
                                <span className="font-extrabold text-neutral-800">
                                  {getSourceLabel(tx.source) || getTransactionTypeLabel(tx.type)}
                                </span>
                              </td>
                              <td className="py-4 pr-4 font-medium text-neutral-500 max-w-[280px] truncate">
                                {tx.description}
                              </td>
                              <td className="py-4 pr-4">
                                <CreatorStatusBadge status={tx.status} type="transaction" />
                              </td>
                              <td
                                className={cn(
                                  "py-4 pr-4 text-right font-black text-sm tracking-tight whitespace-nowrap",
                                  isNegative ? "text-red-600" : "text-emerald-600"
                                )}
                              >
                                {isNegative ? "−" : "+"} {formatCurrency(tx.amount)}
                              </td>
                              <td className="py-4 text-neutral-300 group-hover:text-primary transition-colors">
                                <ChevronRight size={14} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Table footer info */}
                  <div className="flex items-center justify-between gap-3 pt-4 mt-1 border-t border-neutral-100">
                    <span className="text-[11px] font-bold text-neutral-400">
                      Menampilkan {filteredTransactions.length} dari {transactions.length} transaksi
                    </span>
                    <span className="text-[11px] font-semibold text-neutral-400 hidden sm:inline">
                      Klik baris untuk melihat rincian transaksi
                    </span>
                  </div>
                </>
              )}
            </div>

        {/* Withdrawal Simulation Dual-Modal (Form -> Confirm -> Success) */}
        {isWithdrawOpen && (
          <ResponsiveModal open={isWithdrawOpen} onOpenChange={(open) => !open && !isSubmittingWithdraw && resetWithdrawForm()}>
            <ResponsiveModalContent
              showCloseButton={false}
              className="max-w-lg w-full p-0 overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]"
            >
              <ResponsiveModalHeader className="sr-only">
                <ResponsiveModalTitle>Tarik Dana</ResponsiveModalTitle>
                <ResponsiveModalDescription>
                  Form penarikan saldo pendapatan kreator.
                </ResponsiveModalDescription>
              </ResponsiveModalHeader>

              {/* Modal Banner Header */}
              <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-[#120e24] via-[#1a1440] to-[#251352] p-5 sm:p-6 text-white">
                <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-violet-500/20 blur-2xl pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between gap-3 mb-3">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500/25 to-amber-500/15 px-3 py-1 text-[10px] font-extrabold text-orange-300 border border-orange-400/30 backdrop-blur-md">
                    <ArrowDownToLine className="w-3.5 h-3.5 text-orange-300" />
                    <span className="uppercase tracking-wider">Penarikan Saldo Kreator</span>
                  </div>
                  <button
                    type="button"
                    onClick={resetWithdrawForm}
                    disabled={isSubmittingWithdraw}
                    className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                    aria-label="Tutup"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="relative z-10">
                  <h3 className="font-display text-lg sm:text-xl font-black text-white leading-tight tracking-tight">
                    {withdrawStep === "form" && "Tarik Dana"}
                    {withdrawStep === "confirm" && "Konfirmasi Penarikan"}
                    {withdrawStep === "requested" && "Pengajuan Penarikan Terkirim"}
                  </h3>
                  <p className="text-xs text-white/75 font-medium mt-1">
                    {withdrawStep === "form" && "Pindahkan saldo hasil karya kreator ke rekening bank atau dompet digital."}
                    {withdrawStep === "confirm" && "Periksa kembali rincian data penerima sebelum pengajuan dikirim ke admin."}
                    {withdrawStep === "requested" && "Menunggu diproses admin Marketiv."}
                  </p>
                </div>
              </div>

              {/* Form Step */}
              {withdrawStep === "form" && (
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 sm:space-y-5">
                  {/* Saldo Tersedia Card */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-orange-50/80 via-amber-50/40 to-white rounded-2xl border border-orange-200/70 p-4 shadow-3xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500 text-white grid place-items-center shrink-0 shadow-sm shadow-orange-500/20">
                          <Wallet size={18} />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-orange-800/80 block">
                            Saldo Siap Ditarik
                          </span>
                          <span className="font-display text-lg font-black tracking-tight text-neutral-900 leading-tight">
                            {formatCurrency(walletMetrics.balance)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10px] font-extrabold text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Bebas Biaya Admin
                        </span>
                        <span className="block text-[10.5px] font-semibold text-neutral-400 mt-1">
                          Min. {formatCurrency(MINIMUM_WITHDRAW)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                    {/* Destination Dropdown */}
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-between text-xs font-bold text-neutral-700">
                        <span>Metode / Instansi Penerima</span>
                        <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                          {isEwallet ? "Dompet Digital" : "Transfer Bank"}
                        </span>
                      </label>
                      <Select value={bankName} onValueChange={(val) => setBankName(val)}>
                        <SelectTrigger
                          className="w-full min-h-[44px] h-auto px-3.5 py-2.5 bg-neutral-50/60 hover:bg-white focus:bg-white border border-neutral-200/80 rounded-xl text-xs font-bold text-neutral-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-3xs cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 text-left truncate">
                            <div className="text-neutral-400 shrink-0">
                              {isEwallet ? <Smartphone size={16} /> : <Landmark size={16} />}
                            </div>
                            <SelectValue placeholder="Pilih Bank / Dompet Digital" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="z-[110] max-h-64 rounded-2xl border border-neutral-200/80 bg-white p-1.5 shadow-2xl">
                          <SelectGroup>
                            <SelectLabel className="px-3 py-1.5 text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                              Transfer Bank
                            </SelectLabel>
                            {PAYOUT_PROVIDERS.filter((p) => p.method === "bank").map((p) => (
                              <SelectItem
                                key={p.id}
                                value={p.id}
                                className="rounded-xl px-3 py-2 text-xs font-bold text-neutral-800 cursor-pointer focus:bg-orange-50 focus:text-orange-600 data-[state=checked]:bg-orange-50 data-[state=checked]:text-orange-600 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <Landmark size={14} className="text-neutral-400 shrink-0" />
                                  <span>{p.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>

                          <SelectSeparator className="my-1 bg-neutral-100" />

                          <SelectGroup>
                            <SelectLabel className="px-3 py-1.5 text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                              Dompet Digital
                            </SelectLabel>
                            {PAYOUT_PROVIDERS.filter((p) => p.method === "ewallet").map((p) => (
                              <SelectItem
                                key={p.id}
                                value={p.id}
                                className="rounded-xl px-3 py-2 text-xs font-bold text-neutral-800 cursor-pointer focus:bg-orange-50 focus:text-orange-600 data-[state=checked]:bg-orange-50 data-[state=checked]:text-orange-600 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <Smartphone size={14} className="text-neutral-400 shrink-0" />
                                  <span>{p.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Account Number or HP */}
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-between text-xs font-bold text-neutral-700">
                        <span>{isEwallet ? "Nomor Handphone Dompet Digital" : "Nomor Rekening Bank"}</span>
                        <span className="text-[10px] text-neutral-400 font-semibold">Wajib Terdaftar</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-neutral-400">
                          {isEwallet ? <Smartphone size={16} /> : <CreditCard size={16} />}
                        </div>
                        <input
                          type="text"
                          required
                          inputMode="numeric"
                          placeholder={isEwallet ? "Contoh: 0812xxxxxxxx" : "Masukkan nomor rekening bank..."}
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ""))}
                          className="w-full pl-10 pr-4 py-2.5 bg-neutral-50/60 hover:bg-white focus:bg-white border border-neutral-200/80 rounded-xl text-xs font-mono font-bold text-neutral-800 placeholder:text-neutral-400 placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-3xs"
                        />
                      </div>
                    </div>

                    {/* Account Holder Name */}
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-between text-xs font-bold text-neutral-700">
                        <span>Nama Pemilik Rekening / Akun</span>
                        <span className="text-[10px] text-neutral-400 font-semibold">Sesuai KTP / Tabungan</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-neutral-400">
                          <User size={16} />
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: ANDI SURYA"
                          value={accountHolder}
                          onChange={(e) => setAccountHolder(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-neutral-50/60 hover:bg-white focus:bg-white border border-neutral-200/80 rounded-xl text-xs font-bold text-neutral-800 placeholder:text-neutral-400 placeholder:font-normal focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-3xs"
                        />
                      </div>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                      <label className="flex items-center justify-between text-xs font-bold text-neutral-700">
                        <span>Jumlah Penarikan</span>
                        <span className="text-[10px] font-bold text-neutral-400">
                          Maks: {formatCurrency(walletMetrics.balance)}
                        </span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <span className="text-xs font-black text-neutral-400">Rp</span>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          placeholder="0"
                          value={formatRupiahInput(amount)}
                          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                          className="w-full pl-11 pr-4 py-2.5 bg-neutral-50/60 hover:bg-white focus:bg-white border border-neutral-200/80 rounded-xl font-display text-base font-bold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-3xs"
                        />
                      </div>

                      {/* Quick amount chips */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {[50000, 100000, 250000, 500000].map((quick) => (
                          <button
                            key={quick}
                            type="button"
                            disabled={quick > walletMetrics.balance}
                            onClick={() => setAmount(String(quick))}
                            className={cn(
                              "px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer",
                              quick > walletMetrics.balance
                                ? "bg-neutral-50 border-neutral-200/50 text-neutral-300 cursor-not-allowed"
                                : Number(amount) === quick
                                  ? "bg-orange-50 border-orange-400 text-orange-700 shadow-3xs font-black ring-1 ring-orange-300"
                                  : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
                            )}
                          >
                            {formatCurrency(quick)}
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={maxWithdrawable < MINIMUM_WITHDRAW}
                          onClick={() => setAmount(String(maxWithdrawable))}
                          className={cn(
                            "px-3 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer",
                            maxWithdrawable < MINIMUM_WITHDRAW
                              ? "bg-neutral-50 border-neutral-200/50 text-neutral-300 cursor-not-allowed"
                              : Number(amount) === maxWithdrawable
                                ? "bg-orange-50 border-orange-400 text-orange-700 shadow-3xs font-black ring-1 ring-orange-300"
                                : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
                          )}
                        >
                          Tarik Semua (Maks)
                        </button>
                      </div>

                      {/* Inline warnings */}
                      {isAmountTooLow && (
                        <div className="flex items-center gap-1.5 text-[11px] text-red-600 font-bold bg-red-50/80 border border-red-200/60 rounded-lg px-2.5 py-1.5">
                          <AlertTriangle size={13} className="shrink-0 text-red-500" />
                          <span>Batas minimum penarikan adalah {formatCurrency(MINIMUM_WITHDRAW)}</span>
                        </div>
                      )}
                      {isAmountTooHigh && (
                        <div className="flex items-center gap-1.5 text-[11px] text-red-600 font-bold bg-red-50/80 border border-red-200/60 rounded-lg px-2.5 py-1.5">
                          <AlertTriangle size={13} className="shrink-0 text-red-500" />
                          <span>Nominal melebihi saldo yang tersedia ({formatCurrency(walletMetrics.balance)})</span>
                        </div>
                      )}
                    </div>

                    {/* Live Fee Breakdown Summary */}
                    {numericAmount > 0 && (
                      <div className="p-4 bg-gradient-to-b from-neutral-50/90 to-white border border-neutral-200/70 rounded-2xl space-y-2.5 shadow-3xs">
                        <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                          <span>Nominal Penarikan</span>
                          <span className="font-bold text-neutral-800">{formatCurrency(numericAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                          <span className="flex items-center gap-1">
                            Biaya Layanan Admin
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <Check size={12} />
                            Gratis (Rp 0)
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                          <span>Sisa Saldo Dompet</span>
                          <span className="font-mono font-semibold text-neutral-600">
                            {formatCurrency(Math.max(0, walletMetrics.balance - numericAmount))}
                          </span>
                        </div>
                        <div className="border-t border-dashed border-neutral-200 pt-2 flex items-center justify-between text-xs">
                          <span className="font-bold text-neutral-900">Total Potong Saldo</span>
                          <span className="font-display text-sm font-black text-orange-600 tracking-tight">
                            {formatCurrency(numericAmount)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={resetWithdrawForm}
                        className="flex-1 min-h-[44px] px-4 border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={!isAmountValid}
                        className={cn(
                          "flex-1 min-h-[44px] px-4 font-black text-xs rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
                          !isAmountValid
                            ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
                            : "border border-orange-900/20 bg-gradient-to-b from-finance-action to-primary-600 hover:from-orange-600 hover:to-primary-700 text-white shadow-finance-action-sm hover:shadow-finance-action-sm-hover hover:-translate-y-px"
                        )}
                      >
                        <span>Lanjutkan</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Confirmation Step */}
              {withdrawStep === "confirm" && (
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 sm:space-y-5">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/70 grid place-items-center text-amber-500 mx-auto mb-3 shadow-3xs">
                      <AlertTriangle size={26} />
                    </div>
                    <h3 className="font-display text-base font-black text-neutral-900 leading-tight tracking-tight">
                      Konfirmasi Penarikan Saldo
                    </h3>
                    <p className="text-xs text-neutral-500 font-medium mt-1 max-w-xs mx-auto">
                      Mohon verifikasi ulang data penerima sebelum melanjutkan penarikan.
                    </p>
                  </div>

                  <div className="space-y-3 bg-gradient-to-b from-neutral-50 to-white border border-neutral-200/70 rounded-2xl p-4 sm:p-5 text-xs shadow-3xs">
                    <div className="flex justify-between items-center gap-4">
                      <span className="font-medium text-neutral-400 inline-flex items-center gap-1.5">
                        <Landmark size={13} className="shrink-0 text-neutral-400" />
                        Instansi Penerima
                      </span>
                      <span className="font-extrabold text-neutral-800 uppercase">{getBankLabel(bankName)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="font-medium text-neutral-400 inline-flex items-center gap-1.5">
                        <CreditCard size={13} className="shrink-0 text-neutral-400" />
                        Nomor Rekening / HP
                      </span>
                      <span className="font-mono font-bold text-neutral-900">{accountNumber}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="font-medium text-neutral-400 inline-flex items-center gap-1.5">
                        <User size={13} className="shrink-0 text-neutral-400" />
                        Nama Penerima
                      </span>
                      <span className="font-extrabold text-neutral-900 uppercase">{accountHolder}</span>
                    </div>
                    <div className="border-t border-dashed border-neutral-200 my-2"></div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="font-medium text-neutral-400">Nominal Penarikan</span>
                      <span className="font-bold text-neutral-800">{formatCurrency(numericAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="font-medium text-neutral-400">Biaya Layanan Admin</span>
                      <span className="font-bold text-emerald-600">Gratis (Rp 0)</span>
                    </div>
                    <div className="border-t border-dashed border-neutral-200 my-2"></div>
                    <div className="flex justify-between items-center gap-4 text-neutral-950">
                      <span className="font-bold">Total Potong Saldo</span>
                      <span className="font-display text-base font-black text-orange-600 tracking-tight">
                        {formatCurrency(numericAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3.5 text-[11px] text-amber-900/90 font-medium leading-relaxed flex gap-2.5">
                    <ShieldCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Pastikan data rekening sudah valid. Data tujuan tidak dapat diubah setelah pengajuan dikirim.
                    </span>
                  </div>

                  {withdrawError && (
                    <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-700">
                      {withdrawError}
                    </div>
                  )}

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setWithdrawStep("form")}
                      disabled={isSubmittingWithdraw}
                      className="flex-1 min-h-[44px] border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Kembali
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmWithdrawal}
                      disabled={isSubmittingWithdraw}
                      className="flex-1 min-h-[44px] border border-orange-900/20 bg-gradient-to-b from-finance-action to-primary-600 text-white font-black text-xs rounded-xl transition-all duration-200 shadow-finance-action-sm hover:shadow-finance-action-sm-hover hover:-translate-y-px cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center justify-center gap-2"
                    >
                      {isSubmittingWithdraw ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Mengirim pengajuan…</span>
                        </>
                      ) : (
                        <>
                          <span>Konfirmasi &amp; Ajukan</span>
                          <ArrowDownToLine size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Request accepted step */}
              {withdrawStep === "requested" && lastWithdrawalDetails && (
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 sm:space-y-5 animate-in fade-in duration-300">
                  <div className="text-center my-2">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 grid place-items-center text-amber-500 mx-auto mb-3.5 shadow-sm shadow-amber-500/10">
                      <Clock size={32} />
                    </div>
                    <h3 className="font-display text-lg font-black text-neutral-900 leading-tight tracking-tight">
                      Pengajuan Penarikan Terkirim!
                    </h3>
                    <p className="text-xs text-neutral-500 font-medium mt-1.5 max-w-xs mx-auto leading-relaxed">
                      Pengajuan penarikan sebesar <span className="text-neutral-900 font-black">{formatCurrency(lastWithdrawalDetails.amount)}</span> telah diterima. Tim Marketiv umumnya memproses penarikan dalam 1–2 hari kerja.
                    </p>
                  </div>

                  <div className="bg-gradient-to-b from-neutral-50 to-white border border-neutral-200/70 rounded-2xl p-4 sm:p-5 text-xs text-neutral-600 space-y-2.5 shadow-3xs">
                    <div className="flex justify-between items-center gap-4">
                      <span className="font-medium text-neutral-400">ID Penarikan</span>
                      <span className="font-mono font-bold text-neutral-900">{lastWithdrawalDetails.id}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="font-medium text-neutral-400">Tujuan Penarikan</span>
                      <span className="font-extrabold text-neutral-900 uppercase">{getBankLabel(lastWithdrawalDetails.bank)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="font-medium text-neutral-400">Nomor Rekening / HP</span>
                      <span className="font-mono font-bold text-neutral-900">{lastWithdrawalDetails.number}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="font-medium text-neutral-400">Nama Penerima</span>
                      <span className="font-extrabold text-neutral-900 uppercase">{lastWithdrawalDetails.holder}</span>
                    </div>
                    <div className="border-t border-dashed border-neutral-200 my-1"></div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="font-medium text-neutral-400">Status Penarikan</span>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        {getWithdrawalStatusLabel("requested")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetWithdrawForm}
                    className="w-full h-11 bg-gradient-to-r from-neutral-900 to-neutral-800 hover:from-neutral-800 hover:to-neutral-700 text-white font-extrabold text-xs rounded-xl transition-all duration-200 shadow-sm cursor-pointer text-center flex items-center justify-center"
                  >
                    Kembali ke Dashboard Keuangan
                  </button>
                </div>
              )}

            </ResponsiveModalContent>
          </ResponsiveModal>
        )}

        {/* Transaction Detail Modal */}
        {selectedTx && (
          <ResponsiveModal open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
            <ResponsiveModalContent
              showCloseButton={false}
              className="max-w-md w-full rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <ResponsiveModalHeader className="sr-only">
                <ResponsiveModalTitle>Detail Transaksi Dompet</ResponsiveModalTitle>
                <ResponsiveModalDescription>
                  Rincian transaksi dompet kreator.
                </ResponsiveModalDescription>
              </ResponsiveModalHeader>

              {/* Modal Header Row */}
              <div className="flex justify-between items-start gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-violet-50 border border-violet-100 text-violet-600 grid place-items-center shrink-0 shadow-3xs">
                    <ReceiptText size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-black text-slate-900 leading-tight tracking-tight">
                      Detail Transaksi Dompet
                    </h3>
                    <p className="text-[10px] font-mono font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      ID: {selectedTx.id}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Tutup"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Status and Big Amount Card */}
                <div className="text-center py-5 px-4 bg-gradient-to-b from-slate-50/80 to-white rounded-2xl border border-slate-200/70 shadow-3xs">
                  <div className="mb-2">
                    <CreatorStatusBadge status={selectedTx.status} type="transaction" />
                  </div>
                  <h2
                    className={cn(
                      "font-display text-2xl sm:text-3xl font-black tracking-tight",
                      selectedTx.type === "withdrawal" ? "text-slate-900" : "text-emerald-600"
                    )}
                  >
                    {selectedTx.type === "withdrawal" ? "−" : "+"} {formatCurrency(selectedTx.amount)}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-1">
                    Jumlah Transaksi
                  </p>
                </div>

                {/* Metadata List */}
                <div className="space-y-2.5 text-xs text-slate-600 px-1 divide-y divide-slate-100">
                  <div className="flex justify-between items-start gap-4 pt-1">
                    <span className="font-semibold text-slate-400 whitespace-nowrap">Tanggal &amp; Waktu</span>
                    <span className="font-bold text-slate-800 text-right">
                      {new Date(selectedTx.createdAt).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-4 pt-2.5">
                    <span className="font-semibold text-slate-400">Sumber Transaksi</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-extrabold bg-violet-50 text-violet-700 border border-violet-200/60 uppercase tracking-wider">
                      {getSourceLabel(selectedTx.source) || getTransactionTypeLabel(selectedTx.type)}
                    </span>
                  </div>

                  {selectedTx.relatedName && (
                    <div className="flex justify-between items-start gap-4 pt-2.5">
                      <span className="font-semibold text-slate-400 whitespace-nowrap">Nama Terkait</span>
                      <span className="font-bold text-slate-800 text-right">
                        {selectedTx.relatedName}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-start gap-4 pt-2.5">
                    <span className="font-semibold text-slate-400 whitespace-nowrap">Deskripsi</span>
                    <span className="font-medium text-slate-700 text-right leading-relaxed max-w-[240px]">
                      {selectedTx.description}
                    </span>
                  </div>

                  {selectedTx.notes && (
                    <div className="p-3 bg-violet-50/60 rounded-xl border border-violet-200/50 mt-3 text-[11px] leading-relaxed text-slate-600 font-medium">
                      <span className="block text-[9px] font-black text-violet-700 uppercase tracking-wider mb-1">
                        Catatan Audit Dompet
                      </span>
                      {selectedTx.notes}
                    </div>
                  )}
                </div>

                {/* Action CTA */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTx(null)}
                    className="w-full h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer text-center flex items-center justify-center"
                  >
                    Tutup Rincian
                  </button>
                </div>
              </div>
            </ResponsiveModalContent>
          </ResponsiveModal>
        )}

      </div>
    </div>
  );
}
