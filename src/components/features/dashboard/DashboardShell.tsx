"use client";

import { type ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PageTransition } from "@/components/ui/page-transition";

interface DashboardShellProps {
  children: ReactNode;
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
  sidebar: ReactNode;
  topbar: ReactNode;
  variant?: "umkm" | "kreator";
}

export function DashboardShell({
  children,
  sidebar,
  topbar,
  variant = "umkm",
}: DashboardShellProps) {
  const bgStyle =
    variant === "kreator"
      ? [
          "radial-gradient(circle at 12% 0%, rgba(37,99,235,.07), transparent 28rem)",
          "radial-gradient(circle at 96% 10%, rgba(147,51,234,.07), transparent 32rem)",
          "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
        ].join(", ")
      : [
          "radial-gradient(circle at 12% 0%, rgba(249,115,22,.09), transparent 28rem)",
          "radial-gradient(circle at 96% 10%, rgba(30,58,95,.09), transparent 32rem)",
          "linear-gradient(180deg, #fffaf3 0%, #fbf7ef 42%, #f6eee3 100%)",
        ].join(", ");

  return (
    <SidebarProvider defaultOpen={true}>
      {/*
       * Root wrapper: full viewport, NO overflow-x, fixed background.
       * max-w-full + overflow-x-hidden prevents horizontal scroll regardless
       * of sidebar collapse animation.
       */}
      <div
        className="flex h-svh w-screen overflow-hidden text-neutral-900 antialiased font-sans"
        style={{
          background: bgStyle,
        }}
      >
        {/* Subtle grid texture overlay — purely decorative, pointer-events none */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(17,24,39,.022) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,.022) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage: "linear-gradient(180deg, rgba(0,0,0,.45), transparent 55%)",
          }}
        />

        {/* Sidebar */}
        {sidebar}

        {/*
         * SidebarInset handles the left margin shift automatically when sidebar
         * collapses. h-svh + overflow-hidden keeps content scrolling contained.
         */}
        <SidebarInset
          className="relative z-10 flex flex-col min-w-0 h-svh overflow-hidden !bg-transparent"
          style={{ maxWidth: "100%" }}
        >
          {topbar}

          {/* Scrollable page body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <PageTransition>{children}</PageTransition>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
