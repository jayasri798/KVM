"use client";

import React from "react";
import Image from "next/image";

interface StoryBubbleProps {
  displayName: string;
  avatarUrl: string;
  isCurrentUser?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

export default function StoryBubble({
  displayName,
  avatarUrl,
  isCurrentUser = false,
  isActive = true,
  onClick,
}: StoryBubbleProps) {
  // Clean handle for name display
  const shortName = isCurrentUser ? "Your Story" : displayName.split(" ")[0];

  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer select-none group"
    >
      {/* Avatar Wrapper with ring */}
      <div className="relative">
        <div
          className={`w-15 h-15 rounded-full p-[2.5px] transition-all duration-300 group-hover:scale-102
            ${isActive 
              ? "bg-gradient-to-tr from-emerald-500 to-teal-400 p-[3px] shadow-sm" 
              : "bg-slate-200 group-hover:bg-slate-300"
            }`}
        >
          <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-slate-50 relative">
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              sizes="60px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </div>

        {/* Emerald active indicator badge (bottom right) */}
        {isActive && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm shadow-emerald-500/10" />
        )}
      </div>

      {/* Text name label */}
      <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-900 text-center max-w-[68px] truncate transition-colors leading-none">
        {shortName}
      </span>
    </div>
  );
}
