"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageCircle, PlusSquare, KeyRound, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

interface SidebarProps {
  onCreateClick?: () => void;
}

export default function Sidebar({ onCreateClick }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Search", href: "/search", icon: Search },
    { name: "DMs", href: "/messages", icon: MessageCircle },
    { name: "Create", href: "#", icon: PlusSquare, onClick: onCreateClick },
    { name: "Profile", href: "/profile", icon: KeyRound },
  ];

  return (
    <aside className="fixed z-40 bg-white border-slate-200 transition-all duration-300
      /* Mobile bottom nav style */
      bottom-0 left-0 right-0 h-16 border-t flex flex-row items-center justify-around px-4
      /* Tablet/Desktop side sidebar style */
      md:top-0 md:bottom-0 md:left-0 md:right-auto md:h-full md:w-20 lg:w-64 md:border-t-0 md:border-r md:flex-col md:items-stretch md:justify-between md:py-8 md:px-4"
    >
      {/* Brand Logo - Top */}
      <div className="hidden md:flex items-center gap-3 px-3 mb-8 select-none">
        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-white shadow-md shadow-emerald-500/10">
          <span className="text-sm tracking-widest font-mono">K</span>
        </div>
        <div className="hidden lg:block">
          <h1 className="font-extrabold text-slate-900 tracking-wider text-lg font-sans">
            KAM
          </h1>
          <p className="text-[9px] text-slate-400 font-semibold tracking-wider -mt-1 uppercase">
            Encrypted Social
          </p>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex flex-row md:flex-col gap-1 w-full justify-around md:justify-start md:gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          const content = (
            <div className={`relative flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 select-none
              ${isActive 
                ? "text-emerald-600 bg-emerald-50/50" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r-md hidden lg:block"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`w-5.5 h-5.5 transition-transform duration-200 group-hover:scale-105 ${isActive ? "text-emerald-500 stroke-[2.5px]" : "stroke-[2px]"}`} />
              <span className="hidden lg:inline">{item.name}</span>
            </div>
          );

          if (item.onClick) {
            return (
              <button
                key={item.name}
                onClick={item.onClick}
                className="group w-full focus:outline-none cursor-pointer"
              >
                {content}
              </button>
            );
          }

          return (
            <Link key={item.name} href={item.href} className="group w-full block">
              {content}
            </Link>
          );
        })}
      </nav>

      {/* Logout / User Info - Bottom */}
      <div className="hidden md:flex flex-col gap-4 w-full px-2 mt-auto">
        <div className="hidden lg:flex items-center gap-3 p-2 bg-slate-50/50 border border-slate-100 rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="w-8 h-8 rounded-full object-cover border border-slate-200"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 truncate leading-none">
              {user.displayName}
            </p>
            <p className="text-[9px] text-slate-400 font-semibold truncate mt-1">
              @{user.displayName.toLowerCase().replace(/\s/g, "")}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50/50 transition-colors duration-200 w-full text-left cursor-pointer"
        >
          <LogOut className="w-5 h-5 stroke-[2px]" />
          <span className="hidden lg:inline">Logout</span>
        </button>
      </div>
    </aside>
  );
}
