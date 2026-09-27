"use client";

import { LayoutGrid, List } from "lucide-react";
import { SearchToolbar, type SearchToolbarFilter } from "@/components/features/dashboard/shared";
import { cn } from "@/lib/utils";
import { CREATOR_NICHE_OPTIONS } from "@/constants/umkm-dashboard.constants";
import { getCampaignStatusLabel } from "@/lib/dashboard-labels";

const STATUS_TABS = [
  { value: "all", label: "Semua Status" },
  { value: "active", label: getCampaignStatusLabel("active") },
  { value: "draft", label: getCampaignStatusLabel("draft") },
  // Nilai "full" dan "cancelled" belum ada di CampaignStatus, jadi labelnya
  // ditulis manual sampai kosakata backend disatukan.
  { value: "full", label: "Penuh" },
  { value: "completed", label: getCampaignStatusLabel("completed") },
  { value: "cancelled", label: "Dibatalkan" },
] as const;

const SORT_OPTIONS = [
  { value: "latest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
  { value: "budget_desc", label: "Anggaran Tertinggi" },
  { value: "views_desc", label: "Tayangan Terbanyak" },
] as const;

interface CampaignToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedStatus: string;
  onStatusChange: (val: string) => void;
  selectedNiche: string;
  onNicheChange: (val: string) => void;
  sortBy: string;
  onSortChange: (val: string) => void;
  viewMode: "card" | "table";
  onViewModeChange: (mode: "card" | "table") => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  statusCounts?: Partial<Record<string, number>>;
}

export function CampaignToolbar({
  search,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedNiche,
  onNicheChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  onClearFilters,
  hasActiveFilters,
  statusCounts = {},
}: CampaignToolbarProps) {
  const filters: SearchToolbarFilter[] = [
    {
      label: "Status",
      value: selectedStatus,
      onChange: onStatusChange,
      options: STATUS_TABS.map((status) => ({
        value: status.value,
        label: status.label,
        count: statusCounts[status.value],
      })),
    },
    {
      label: "Kategori",
      value: selectedNiche,
      onChange: onNicheChange,
      options: CREATOR_NICHE_OPTIONS,
    },
    {
      label: "Urutan",
      value: sortBy,
      onChange: onSortChange,
      options: SORT_OPTIONS,
      prefix: "Urut",
    },
  ];

  return (
    <SearchToolbar
      searchValue={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Cari nama kampanye atau produk..."
      filters={filters}
      onClearFilters={onClearFilters}
      hasActiveFilters={hasActiveFilters}
      theme="umkm"
      extraActions={
        <div className="flex h-10 shrink-0 items-center gap-0.5 rounded-xl border border-neutral-200 bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => onViewModeChange("card")}
            className={cn(
              "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all",
              viewMode === "card" ? "bg-white text-primary-600 shadow-3xs" : "text-neutral-400 hover:text-neutral-600",
            )}
            aria-label="Tampilan Kartu"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={cn(
              "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all",
              viewMode === "table" ? "bg-white text-primary-600 shadow-3xs" : "text-neutral-400 hover:text-neutral-600",
            )}
            aria-label="Tampilan Tabel"
          >
            <List size={15} />
          </button>
        </div>
      }
    />
  );
}
