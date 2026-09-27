"use client";

import { useState, useEffect, useCallback } from "react";
import { Transaction, UmkmFinanceSummary, EscrowOverview } from "@/types/umkm-dashboard.types";
import {
  getTransactions,
  getFinanceOverview,
  cancelPayment,
} from "@/services/umkm/umkm-dashboard.service";
import { toast } from "sonner";
import { FinanceHeader } from "./FinanceHeader";
import { FinanceSummaryCards } from "./FinanceSummaryCards";
import { EscrowOverviewCard } from "./EscrowOverviewCard";
import { FinanceToolbar } from "./FinanceToolbar";
import { TransactionHistorySection } from "./TransactionHistorySection";
import { FinancePageSkeleton } from "./FinancePageSkeleton";
import { FinanceErrorState } from "./FinanceErrorState";
import { TransactionDetailModal } from "./modals/TransactionDetailModal";
import { PendingPaymentModal } from "./modals/PendingPaymentModal";
import { ExportFinanceReportModal } from "./modals/ExportFinanceReportModal";
import { FinanceActionSuccessModal } from "./modals/FinanceActionSuccessModal";

export function FinanceOverviewPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<UmkmFinanceSummary | null>(null);
  const [escrowOverview, setEscrowOverview] = useState<EscrowOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [financeError, setFinanceError] = useState<string | null>(null);

  // Filter and Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [refFilter, setRefFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("date_desc");

  // Dialog / Modal States
  const [selectedTxDetail, setSelectedTxDetail] = useState<Transaction | null>(null);
  const [selectedTxPayment, setSelectedTxPayment] = useState<Transaction | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [successDialog, setSuccessDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  // Fetch transaksi + ringkasan finansial (dihitung backend, bukan di klien).
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Satu panggilan untuk finance + escrow — menghindari dua agregasi identik.
      const [txRes, financeRes] = await Promise.all([
        getTransactions(),
        getFinanceOverview(),
      ]);

      if (!txRes.success || !txRes.data) {
        setError(txRes.error || "Gagal mengambil data transaksi");
        return;
      }
      setTransactions(txRes.data);

      if (!financeRes.success) {
        setFinanceError(financeRes.error || "Gagal memuat ringkasan keuangan.");
        setSummary(null);
        setEscrowOverview(null);
      } else {
        setFinanceError(null);
        setSummary(financeRes.data?.finance ?? null);
        setEscrowOverview(financeRes.data?.escrow ?? null);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan sistem";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter & Sort computation
  const filteredTransactions = transactions
    .filter((tx) => {
      // 1. Search Query filter (ID or Description)
      const matchesSearch =
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.id.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Status filter
      const matchesStatus = statusFilter === "all" || tx.status === statusFilter;

      // 3. Type filter
      const matchesType = typeFilter === "all" || tx.type === typeFilter;

      // 4. Feature Reference filter
      const matchesRef = refFilter === "all" || tx.referenceType === refFilter;

      return matchesSearch && matchesStatus && matchesType && matchesRef;
    })
    .sort((a, b) => {
      // Sort logic
      if (sortOrder === "date_desc") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOrder === "date_asc") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOrder === "amount_desc") {
        return b.amount - a.amount;
      }
      if (sortOrder === "amount_asc") {
        return a.amount - b.amount;
      }
      return 0;
    });

  const hasFilters =
    searchQuery !== "" ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    refFilter !== "all";

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setRefFilter("all");
    setSortOrder("date_desc");
  };

  /**
   * Batalkan pembayaran yang masih `pending` lewat Function `cancel-payment`,
   * lalu muat ulang.
   *
   * MENGGANTIKAN handlePaymentSuccess, yang menandai transaksi lunas di state
   * lokal setelah `setTimeout` 1,5 detik — tanpa uang berpindah, dan statusnya
   * hilang begitu halaman dimuat ulang. Nomor Midtrans-nya pun dikarang
   * (`MID-DEMO-<id>`) saat kolom aslinya kosong.
   *
   * Melunasi pembayaran tidak bisa dilakukan dari sini: itu terjadi di halaman
   * Snap Midtrans, dan statusnya diperbarui webhook.
   */
  const handleCancelPayment = async (paymentId: string) => {
    const res = await cancelPayment(paymentId);
    if (!res.success) {
      toast.error(res.error ?? "Gagal membatalkan pembayaran.");
      return;
    }
    setSelectedTxPayment(null);
    toast.success("Pembayaran dibatalkan.");
    await loadData();
  };

  // Export success handler
  const handleExportSuccess = (filename: string) => {
    setIsExportOpen(false);
    setSuccessDialog({
      isOpen: true,
      title: "Laporan Berhasil Diunduh",
      message: "Laporan keuangan kemajuan P2MW Anda berhasil diekspor. File CSV telah terunduh ke komputer Anda.",
      details: `Nama file: ${filename}`,
    });
  };

  if (isLoading) {
    return <FinancePageSkeleton />;
  }

  if (error) {
    return <FinanceErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6 max-w-[1280px] mx-auto pb-20">
      {/* Header */}
      <FinanceHeader onTriggerExport={() => setIsExportOpen(true)} />

      {financeError && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
          <p className="text-sm font-semibold text-red-600 mb-3">{financeError}</p>
          <button
            onClick={loadData}
            className="text-xs font-bold bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            Coba Lagi Memuat Ringkasan
          </button>
        </div>
      )}

      {/* Summary metrics — dari service (getFinanceSummary), bukan hitung ulang klien */}
      {summary && !financeError && <FinanceSummaryCards summary={summary} />}

      {/* Escrow overview diagram — dari service (getEscrowOverview) */}
      {escrowOverview && !financeError && <EscrowOverviewCard overview={escrowOverview} />}

      {/* Control bar / Toolbar — sticky direct child of space-y-6 container */}
      <FinanceToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          refFilter={refFilter}
          setRefFilter={setRefFilter}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          onClearAll={handleClearAllFilters}
          hasFilters={hasFilters}
        />

      {/* Transaction list */}
      <TransactionHistorySection
        transactions={filteredTransactions}
        onOpenDetails={(tx) => setSelectedTxDetail(tx)}
        onOpenPayment={(tx) => setSelectedTxPayment(tx)}
        isFiltered={hasFilters}
        onResetFilters={handleClearAllFilters}
      />

      {/* Dialog: Detail Transaction */}
      {selectedTxDetail && (
        <TransactionDetailModal
          transaction={selectedTxDetail}
          isOpen={!!selectedTxDetail}
          onClose={() => setSelectedTxDetail(null)}
        />
      )}

      {/* Dialog: Payment checkout Sandbox */}
      {selectedTxPayment && (
        <PendingPaymentModal
          transaction={selectedTxPayment}
          isOpen={!!selectedTxPayment}
          onClose={() => setSelectedTxPayment(null)}
          onCancelPayment={handleCancelPayment}
        />
      )}

      {/* Dialog: Configure Export */}
      {isExportOpen && (
        <ExportFinanceReportModal
          transactions={transactions}
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          onExportSuccess={handleExportSuccess}
        />
      )}

      {/* Dialog: Transaction Complete confirmation */}
      {successDialog.isOpen && (
        <FinanceActionSuccessModal
          isOpen={successDialog.isOpen}
          title={successDialog.title}
          message={successDialog.message}
          details={successDialog.details}
          onClose={() => setSuccessDialog((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}
