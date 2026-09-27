"use client";

import { useState, useEffect, useTransition } from "react";
import { getNegotiations } from "@/services/umkm/umkm-dashboard.service";
import { NegotiationOrder } from "@/types/umkm-dashboard.types";
import { NegotiationHeader } from "./NegotiationHeader";
import { NegotiationSummaryCards } from "./NegotiationSummaryCards";
import { NegotiationToolbar } from "./NegotiationToolbar";
import { NegotiationRoomCard } from "./NegotiationRoomCard";
import { NegotiationListSkeleton } from "./NegotiationListSkeleton";
import { NegotiationEmptyState } from "./NegotiationEmptyState";
import { NegotiationErrorState } from "./NegotiationErrorState";
import { setConversationArchived } from "@/services/shared/conversation.service";
import { toast } from "sonner";

export function NegotiationListPage() {
  const [negotiations, setNegotiations] = useState<NegotiationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showArchived, setShowArchived] = useState(false);
  const [, startTransition] = useTransition();

  const loadNegotiations = async () => {
    setLoading(true);
    setError(null);
    try {
      // Satu panggilan saja. Dulu `conversations` harus dimuat terpisah karena
      // daftar ini di-key orderId sementara status arsip ada di percakapan;
      // sejak DTO di-key conversationId dan membawa `isArchived` sendiri,
      // jembatan itu tidak diperlukan lagi.
      const res = await getNegotiations();
      if (res.success && res.data) {
        setNegotiations(res.data);
      } else {
        setError(res.error || "Gagal memuat daftar negosiasi.");
      }
    } catch {
      setError("Terjadi kesalahan sistem saat memuat data.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleArchive = async (order: NegotiationOrder) => {
    const next = !order.isArchived;
    const res = await setConversationArchived(order.conversationId, next);
    if (!res.success) {
      toast.error(res.error ?? "Gagal mengubah status arsip.");
      return;
    }
    setNegotiations((prev) =>
      prev.map((n) => (n.conversationId === order.conversationId ? { ...n, isArchived: next } : n))
    );
    toast.success(next ? "Percakapan diarsipkan." : "Percakapan dikembalikan ke Kotak Masuk.");
  };

  useEffect(() => {
    loadNegotiations();
  }, []);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedStatus("all");
    setSortBy("newest");
  };

  const hasActiveFilters = searchQuery.trim() !== "" || selectedStatus !== "all";

  // Hitungan status mengikuti tab arsip yang sedang aktif — badge yang
  // menghitung baris tak terlihat akan menyesatkan.
  const scopedNegotiations = negotiations.filter((n) => n.isArchived === showArchived);
  const archivedCount = negotiations.filter((n) => n.isArchived).length;

  const statusCounts: Partial<Record<string, number>> = {
    all: scopedNegotiations.length,
    chatting: scopedNegotiations.filter((n) => n.stage === "chatting").length,
    offer_pending: scopedNegotiations.filter((n) => n.stage === "offer_pending").length,
    offer_rejected: scopedNegotiations.filter((n) => n.stage === "offer_rejected").length,
    awaiting_order: scopedNegotiations.filter((n) => n.stage === "awaiting_order").length,
    pending_payment: scopedNegotiations.filter((n) => n.stage === "pending_payment").length,
    in_progress: scopedNegotiations.filter((n) => n.stage === "in_progress").length,
    escrow: scopedNegotiations.filter((n) => n.stage === "escrow").length,
    revision: scopedNegotiations.filter((n) => n.stage === "revision").length,
    approved: scopedNegotiations.filter((n) => n.stage === "approved").length,
    completed: scopedNegotiations.filter((n) => n.stage === "completed").length,
    cancelled: scopedNegotiations.filter((n) => n.stage === "cancelled").length,
  };

  // Filter & Sort operations
  const filteredNegotiations = negotiations
    .filter((n) => {
      const matchSearch =
        n.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        selectedStatus === "all" || n.stage.toLowerCase() === selectedStatus.toLowerCase();

      return matchSearch && matchStatus && n.isArchived === showArchived;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      }
      if (sortBy === "deadline") {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (sortBy === "price_desc") {
        return b.finalPrice - a.finalPrice;
      }
      if (sortBy === "unread") {
        return b.unreadCount - a.unreadCount;
      }
      return 0;
    });

  if (loading) {
    return <NegotiationListSkeleton />;
  }

  if (error) {
    return <NegotiationErrorState message={error} onRetry={loadNegotiations} />;
  }

  return (
    <div className="space-y-6 max-w-[1280px] mx-auto pb-8 px-1">
      {/* Header */}
      <NegotiationHeader />

      {/* Summary metric cards */}
      <NegotiationSummaryCards negotiations={negotiations} />

      {/* Toolbar filters — sticky direct child of space-y-6 container */}
      <NegotiationToolbar
          searchQuery={searchQuery}
          onSearchChange={(q) => startTransition(() => setSearchQuery(q))}
          selectedStatus={selectedStatus}
          onStatusChange={(status) => startTransition(() => setSelectedStatus(status))}
          sortBy={sortBy}
          onSortByChange={(s) => startTransition(() => setSortBy(s))}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
          statusCounts={statusCounts}
        />

      {/* Tab Kotak Masuk / Arsip */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowArchived(false)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer border ${
            showArchived
              ? "border-border-soft text-text-muted hover:bg-neutral-50"
              : "border-transparent bg-primary text-white"
          }`}
        >
          Kotak Masuk
        </button>
        <button
          onClick={() => setShowArchived(true)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer border ${
            showArchived
              ? "border-transparent bg-primary text-white"
              : "border-border-soft text-text-muted hover:bg-neutral-50"
          }`}
        >
          Arsip{archivedCount > 0 ? ` (${archivedCount})` : ""}
        </button>
      </div>

      {/* List content */}
      {filteredNegotiations.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filteredNegotiations.map((order) => (
            <NegotiationRoomCard
              key={order.id}
              order={order}
              isArchived={order.isArchived}
              onToggleArchive={() => handleToggleArchive(order)}
            />
          ))}
        </div>
      ) : (
        <NegotiationEmptyState
          isFiltered={hasActiveFilters}
          onReset={handleClearFilters}
        />
      )}
    </div>
  );
}
