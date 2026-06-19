"use client";

import React from "react";
import PostCard from "./PostCard";
import { Post, User } from "../utils/mockData";

interface FeedProps {
  posts: Post[];
  currentUser: User;
  users: User[];
  onLike: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onSwitchUser?: (username: string) => void;
}

export default function Feed({
  posts,
  currentUser,
  users,
  onLike,
  onAddComment,
  onSwitchUser,
}: FeedProps) {
  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 pb-24">
      {/* Secure Stories/Active Users Tray */}
      <div className="bg-card-bg border border-card-border rounded-2xl p-4 mb-6 overflow-x-auto flex gap-4 scrollbar-none select-none">
        {/* Current User (Self) */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer">
          <div className="relative w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-mint to-teal-400">
            <div className="w-full h-full rounded-full border-2 border-card-bg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-mint border-2 border-card-bg rounded-full" />
          </div>
          <span className="text-[10px] font-semibold text-foreground text-center max-w-[65px] truncate">
            You
          </span>
        </div>

        {/* Other Users */}
        {users
          .filter((u) => u.username !== currentUser.username)
          .map((user) => (
            <div
              key={user.id}
              onClick={() => onSwitchUser && onSwitchUser(user.username)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
              title={`Switch account to ${user.displayName}`}
            >
              <div className="relative w-14 h-14 rounded-full p-[2px] border border-card-border group-hover:border-mint transition-all duration-300">
                <div className="w-full h-full rounded-full border-2 border-card-bg overflow-hidden group-hover:scale-95 transition-transform">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-card-border group-hover:bg-mint border-2 border-card-bg rounded-full transition-colors" />
              </div>
              <span className="text-[10px] font-medium text-muted-text group-hover:text-foreground text-center max-w-[65px] truncate transition-colors">
                @{user.username}
              </span>
            </div>
          ))}
      </div>

      {/* Photo Feed */}
      <div className="space-y-6">
        {posts.length > 0 ? (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUsername={currentUser.username}
              onLike={onLike}
              onAddComment={onAddComment}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-card-bg border border-card-border rounded-2xl p-8">
            <svg
              className="w-12 h-12 text-muted-text mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm font-semibold text-foreground mb-1">No Posts Available</p>
            <p className="text-xs text-muted-text">There are no posts to display in the feed.</p>
          </div>
        )}
      </div>
    </div>
  );
}
