"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { Search, SlidersHorizontal, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketivDropdown } from "@/components/ui/marketiv-select";

export interface SearchToolbarOption {
  value: string;
  label: string;
  count?: number;
}

export interface SearchToolbarFilter {
  value: string;
  onChange: (value: string) => void;
  options: readonly SearchToolbarOption[];
  label: string;
  ariaLabel?: string;
  prefix?: string;
}

export interface SearchToolbarQuickFilter {
  id: string;
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}

export interface SearchToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filters?: SearchToolbarFilter[];
  quickFilters?: SearchToolbarQuickFilter[];
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  extraActions?: ReactNode;
  className?: string;
  searchWidthClass?: string;
  debounceMs?: number;
  theme?: "default" | "kreator" | "umkm";
}

export function SearchToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters = [],
  quickFilters,
  onClearFilters,
  hasActiveFilters = false,
  extraActions,
  className,
  searchWidthClass,
  debounceMs = 300,
  theme = "default",
}: SearchToolbarProps) {
  // Local state for smooth typing & built-in debounce
  const [internalValue, setInternalValue] = useState(searchValue);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const isFirstMount = useRef(true);

  // Sync internal value when external searchValue changes (e.g. from Clear Filters)
  useEffect(() => {
    setInternalValue(searchValue);
  }, [searchValue]);

  // Debounce notification to parent onSearchChange
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (internalValue === searchValue) return;

    const timer = setTimeout(() => {
      onSearchChange(internalValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, searchValue, onSearchChange, debounceMs]);

  const handleClearSearch = () => {
    setInternalValue("");
    onSearchChange("");
  };

  const hasFilterControls = filters.length > 0 || Boolean(extraActions) || (quickFilters && quickFilters.length > 0);

  // Count active non-default filters for mobile indicator
  const activeFiltersCount = filters.filter((f) => f.value && f.value !== "all" && f.value !== "").length + (searchValue ? 1 : 0);

  const focusRingCls =
    theme === "kreator"
      ? "focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
      : theme === "umkm"
      ? "focus:border-brand-coral focus:ring-1 focus:ring-brand-coral"
      : "focus:border-slate-400 focus:ring-1 focus:ring-slate-400";

  return (
    <div
      className={cn(
        "shrink-0 rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4 shadow-2xs transition-all",
        className
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Search Input Box — Compact & proportional width */}
        <div className={cn("relative min-w-0 w-full shrink-0", searchWidthClass ?? "md:w-72 lg:w-84")}>
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={internalValue}
            onChange={(event) => setInternalValue(event.target.value)}
            className={cn(
              "h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-9 text-xs font-semibold text-slate-900 shadow-3xs transition-all placeholder:text-slate-400 hover:bg-white hover:border-slate-300",
              focusRingCls
            )}
          />
          {internalValue && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters and Controls */}
        {hasFilterControls && (
          <div className="flex flex-col md:flex-row md:items-center gap-2 flex-1 md:justify-end">
            {/* Mobile Filter Toggle Button */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen((prev) => !prev)}
                className={cn(
                  "flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition-all shadow-3xs",
                  hasActiveFilters || isMobileFiltersOpen
                    ? theme === "umkm"
                      ? "border-orange-300 bg-orange-50 text-orange-700"
                      : "border-violet-300 bg-violet-50 text-violet-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                <SlidersHorizontal size={14} />
                <span>Filter &amp; Opsi</span>
                {activeFiltersCount > 0 && (
                  <span
                    className={cn(
                      "h-5 min-w-[20px] px-1 rounded-full text-[10px] font-black text-white flex items-center justify-center",
                      theme === "umkm" ? "bg-orange-600" : "bg-violet-600"
                    )}
                  >
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {hasActiveFilters && onClearFilters && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-600 shadow-3xs transition-all hover:bg-rose-100/80"
                >
                  <X size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Filter Dropdowns Container (Desktop inline, Mobile collapsible) */}
            <div
              className={cn(
                "flex-wrap items-center gap-2 min-w-0",
                isMobileFiltersOpen ? "flex" : "hidden md:flex md:flex-wrap lg:flex-nowrap"
              )}
            >
              {filters.map((filter) => (
                <MarketivDropdown
                  key={filter.label}
                  value={filter.value}
                  onChange={filter.onChange}
                  options={filter.options}
                  label={filter.ariaLabel ?? filter.label}
                  prefix={filter.prefix}
                  theme={theme}
                  className="min-w-[140px] flex-1 md:flex-none"
                />
              ))}

              {extraActions}

              {hasActiveFilters && onClearFilters && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="hidden md:inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-600 shadow-3xs transition-all hover:bg-rose-100/80"
                >
                  <X size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Optional Quick Filter Chips below search */}
      {quickFilters && quickFilters.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 no-scrollbar">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Filter size={11} />
            Kategori:
          </span>
          {quickFilters.map((qf) => (
            <button
              key={qf.id}
              type="button"
              onClick={qf.onClick}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer shadow-3xs",
                qf.active
                  ? "bg-violet-600 text-white shadow-xs"
                  : "bg-slate-100/80 hover:bg-slate-200/80 text-slate-600"
              )}
            >
              <span>{qf.label}</span>
              {qf.count !== undefined && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-black",
                    qf.active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                  )}
                >
                  {qf.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
