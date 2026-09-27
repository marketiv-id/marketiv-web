"use client";

import { SearchToolbar, type SearchToolbarFilter } from "@/components/features/dashboard/shared";

interface CreatorToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
}

const CATEGORIES = [
  { value: "all", label: "Semua Kategori" },
  { value: "kuliner", label: "Kuliner" },
  { value: "fashion", label: "Fashion" },
  { value: "pariwisata", label: "Pariwisata" },
  { value: "edukasi", label: "Edukasi" },
  { value: "kecantikan", label: "Kecantikan" },
  { value: "lainnya", label: "Lainnya" },
];

const SORT_OPTIONS = [
  { value: "rating", label: "Peringkat Tertinggi" },
  { value: "price_asc", label: "Harga Terendah" },
  { value: "jobs", label: "Pesanan Terbanyak" },
  { value: "engagement", label: "Tingkat Keterlibatan Tertinggi" },
];

export function CreatorToolbar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortByChange,
}: CreatorToolbarProps) {
  const hasActiveFilters = searchQuery !== "" || selectedCategory !== "all" || sortBy !== "rating";
  const filters: SearchToolbarFilter[] = [
    {
      label: "Kategori",
      value: selectedCategory,
      onChange: onCategoryChange,
      options: CATEGORIES,
    },
    {
      label: "Urutan",
      value: sortBy,
      onChange: onSortByChange,
      options: SORT_OPTIONS,
      prefix: "Urut",
    },
  ];

  return (
    <SearchToolbar
      searchValue={searchQuery}
      onSearchChange={onSearchChange}
      searchPlaceholder="Cari nama kreator atau keahlian..."
      filters={filters}
      theme="umkm"
      onClearFilters={() => {
        onSearchChange("");
        onCategoryChange("all");
        onSortByChange("rating");
      }}
      hasActiveFilters={hasActiveFilters}
    />
  );
}
