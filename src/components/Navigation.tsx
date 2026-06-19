"use client";

import React from "react";

export type TabType = "feed" | "search" | "chat" | "vault";

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  unreadCount?: number;
}

export default function Navigation({ activeTab, setActiveTab, unreadCount = 0 }: NavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card-bg/85 backdrop-blur-lg border-t border-card-border py-2 px-6 z-40 flex items-center justify-around md:top-0 md:bottom-auto md:border-t-0 md:border-b md:py-3 select-none">
      {/* Brand logo (hidden on small screen bottom nav, shown on md header) */}
      <div className="hidden md:flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("feed")}>
        <div className="w-8 h-8 rounded-lg bg-mint flex items-center justify-center font-bold text-background text-sm tracking-wider">
          KAM
        </div>
        <span className="font-bold text-sm text-foreground tracking-tight hover:text-mint transition-colors">
          Kavalasina Antha Matladuko
        </span>
      </div>

      <div className="flex items-center gap-8 md:gap-12">
        {/* Feed Tab */}
        <button
          onClick={() => setActiveTab("feed")}
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 text-xs font-semibold cursor-pointer focus:outline-none ${
            activeTab === "feed"
              ? "text-mint bg-mint-light/20"
              : "text-muted-text hover:text-foreground"
          }`}
        >
          <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-[10px] md:text-xs">Feed</span>
        </button>

        {/* Search Tab */}
        <button
          onClick={() => setActiveTab("search")}
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 text-xs font-semibold cursor-pointer focus:outline-none ${
            activeTab === "search"
              ? "text-mint bg-mint-light/20"
              : "text-muted-text hover:text-foreground"
          }`}
        >
          <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="text-[10px] md:text-xs">Search</span>
        </button>

        {/* Chat Tab */}
        <button
          onClick={() => setActiveTab("chat")}
          className={`relative flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 text-xs font-semibold cursor-pointer focus:outline-none ${
            activeTab === "chat"
              ? "text-mint bg-mint-light/20"
              : "text-muted-text hover:text-foreground"
          }`}
        >
          <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-[10px] md:text-xs">Matladuko</span>
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-2 md:top-1.5 md:right-1.5 w-4 h-4 bg-mint text-background text-[9px] font-extrabold flex items-center justify-center rounded-full animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Key Vault Tab */}
        <button
          onClick={() => setActiveTab("vault")}
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 text-xs font-semibold cursor-pointer focus:outline-none ${
            activeTab === "vault"
              ? "text-mint bg-mint-light/20"
              : "text-muted-text hover:text-foreground"
          }`}
        >
          <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span className="text-[10px] md:text-xs">Key Vault</span>
        </button>
      </div>

      {/* Connection Indicator (hidden on mobile, shown on md header) */}
      <div className="hidden md:flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-mint" />
        </span>
        <span className="text-[10px] text-mint uppercase font-mono tracking-wider font-bold">
          E2EE Secured
        </span>
      </div>
    </nav>
  );
}
