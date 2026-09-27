"use client";

import { useState } from "react";
import {
  EXPORT_FORMAT_OPTIONS,
  EXPORT_TYPE_OPTIONS,
} from "../finance.constants";
import { Transaction } from "@/types/umkm-dashboard.types";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal";

interface ExportFinanceReportModalProps {
  transactions: Transaction[];
  isOpen: boolean;
  onClose: () => void;
  onExportSuccess: (filename: string) => void;
}

const REPORT_HEADERS = [
  "ID Transaksi",
  "Tanggal",
  "Deskripsi",
  "Jenis Transaksi",
  "Kategori Fitur",
  "Nominal (IDR)",
  "Status",
  "ID Pesanan Midtrans",
];

function getDateRangeStart(dateRange: string): Date | null {
  const now = new Date();

  if (dateRange === "this_month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (dateRange === "last_30_days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return start;
  }

  if (dateRange === "last_3_months") {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 3);
    return start;
  }

  return null;
}

function escapeCsvCell(value: string | number): string {
  const stringValue = String(value);
  return /[",\n\r]/.test(stringValue)
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue;
}

export function ExportFinanceReportModal({
  transactions,
  isOpen,
  onClose,
  onExportSuccess,
}: ExportFinanceReportModalProps) {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedFormat, setSelectedFormat] = useState<string>("xlsx");
  const [dateRange, setDateRange] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      let filtered = [...transactions];
      if (selectedType === "campaign") {
        filtered = filtered.filter((tx) => tx.referenceType === "campaign");
      } else if (selectedType === "rate_card") {
        filtered = filtered.filter((tx) => tx.referenceType === "rate_card");
      } else if (selectedType === "refund") {
        filtered = filtered.filter((tx) => tx.type === "refund");
      }

      const rangeStart = getDateRangeStart(dateRange);
      if (rangeStart) {
        filtered = filtered.filter((tx) => {
          const transactionDate = new Date(tx.createdAt);
          return !Number.isNaN(transactionDate.getTime()) && transactionDate >= rangeStart;
        });
      }

      const rows = filtered.map((tx) => [
        tx.id,
        tx.createdAt,
        tx.description,
        tx.type,
        tx.referenceType,
        tx.amount,
        tx.status,
        tx.midtransOrderId || "-",
      ]);

      const filename = `laporan_keuangan_umkm_${selectedType}_${new Date()
        .toISOString()
        .slice(0, 10)}.${selectedFormat}`;

      let blob: Blob;
      if (selectedFormat === "xlsx") {
        const XLSX = await import("xlsx");
        const worksheet = XLSX.utils.aoa_to_sheet([REPORT_HEADERS, ...rows]);
        worksheet["!cols"] = REPORT_HEADERS.map((header) => ({ wch: Math.max(header.length + 2, 16) }));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Keuangan");
        const workbookBytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        blob = new Blob([workbookBytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
      } else {
        const csvContent = [
          REPORT_HEADERS.map(escapeCsvCell).join(","),
          ...rows.map((row) => row.map(escapeCsvCell).join(",")),
        ].join("\r\n");
        blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      }

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onExportSuccess(filename);
    } catch {
      setExportError("Laporan gagal dibuat. Coba lagi.");
    } finally {
      setIsExporting(false);
    }
  };

  const dateRangeOptions = [
    { value: "all", label: "Semua Riwayat Transaksi" },
    { value: "this_month", label: "Bulan Ini" },
    { value: "last_30_days", label: "30 Hari Terakhir" },
    { value: "last_3_months", label: "3 Bulan Terakhir" },
  ];

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wide">Unduh Laporan Keuangan</span>
            <h3 className="text-sm font-extrabold text-ink-950 tracking-tight mt-0.5">
              Pilih Jenis & Rentang Laporan
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <ResponsiveModalDescription className="hidden" />
          {exportError && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700 font-semibold">
              {exportError}
            </p>
          )}
          
          {/* Type Option */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wide block">
              Cakupan Data Transaksi
            </label>
            <div className="space-y-1.5">
              {EXPORT_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedType === opt.value
                      ? "bg-orange-50/80 border-orange-200/80 text-orange-950"
                      : "bg-white border-neutral-200/60 hover:bg-neutral-50 text-text-secondary"
                  }`}
                >
                  <input
                    type="radio"
                    name="export_type"
                    value={opt.value}
                    checked={selectedType === opt.value}
                    disabled={isExporting}
                    onChange={() => setSelectedType(opt.value)}
                    className="accent-orange-600"
                  />
                  <span className="font-bold">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wide block">
              Rentang Waktu Laporan
            </label>
            <select
              value={dateRange}
              disabled={isExporting}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-white border border-neutral-200/80 rounded-xl px-3 py-2.5 text-xs text-ink-950 font-bold focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {dateRangeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Format Option */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wide block">
              Format File
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {EXPORT_FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isExporting}
                  onClick={() => setSelectedFormat(opt.value)}
                  className={`p-3 rounded-xl border text-center font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    selectedFormat === opt.value
                      ? "bg-orange-50/80 border-orange-200/80 text-orange-600 shadow-2xs"
                      : "bg-white border-neutral-200/60 hover:bg-neutral-50 text-text-secondary"
                  }`}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-neutral-200/50 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 min-h-[44px] px-4 rounded-full border border-neutral-200/80 bg-white text-ink-950 text-xs font-bold shadow-2xs hover:bg-neutral-50 active:scale-[.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 min-h-[44px] px-4 rounded-full border border-orange-900/20 bg-gradient-to-b from-[#fb7a18] to-primary-600 text-white text-xs font-extrabold shadow-[0_10px_28px_rgba(234,88,12,.28),inset_0_1px_0_rgba(255,255,255,.22)] hover:shadow-[0_14px_36px_rgba(234,88,12,.36)] hover:-translate-y-px active:scale-[.98] transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none"
          >
            {isExporting ? "Mengunduh…" : "Unduh Laporan"}
          </button>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
