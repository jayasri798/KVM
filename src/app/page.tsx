"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import StoryBubble from "../components/StoryBubble";
import { INITIAL_POSTS, INITIAL_USERS } from "../utils/mockData";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Sparkles } from "lucide-react";

export default function HomeFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dragY, setDragY] = useState(0);

  // Subscribe to newly created posts from the layout's publish action
  useEffect(() => {
    if (!user) return;

    const handleNewPost = (e: Event) => {
      const customEvent = e as CustomEvent<{ imageUrl: string; caption: string }>;
      if (!customEvent.detail) return;

      const newPost = {
        id: `post-${Date.now()}`,
        userId: user.uid,
        username: user.displayName.toLowerCase().replace(/\s/g, ""),
        userAvatar: user.photoURL,
        imageUrl: customEvent.detail.imageUrl,
        caption: customEvent.detail.caption,
        likesCount: 0,
        hasLiked: false,
        timestamp: "Just now",
        comments: [],
      };

      setPosts((prev) => [newPost, ...prev]);
    };

    window.addEventListener("kam_new_post", handleNewPost);
    return () => window.removeEventListener("kam_new_post", handleNewPost);
  }, [user]);

  // Handle local post likes
  const handleLike = (postId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const hasLiked = !post.hasLiked;
          return {
            ...post,
            hasLiked,
            likesCount: hasLiked ? post.likesCount + 1 : post.likesCount - 1,
          };
        }
        return post;
      })
    );
  };

  // Handle local comment additions
  const handleAddComment = (postId: string, text: string) => {
    if (!user) return;
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const newComment = {
            id: `comment-${Date.now()}`,
            username: user.displayName.toLowerCase().replace(/\s/g, ""),
            userAvatar: user.photoURL,
            text,
            timestamp: "Just now",
          };
          return {
            ...post,
            comments: [...post.comments, newComment],
          };
        }
        return post;
      })
    );
  };

  // Trigger Refresh Action
  const triggerRefresh = async () => {
    setIsRefreshing(true);
    // Simulate server response delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Preset pool of refresh images
    const presetImages = [
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80"
    ];

    const randomImg = presetImages[Math.floor(Math.random() * presetImages.length)];
    const randomUser = INITIAL_USERS[Math.floor(Math.random() * INITIAL_USERS.length)];

    const newPost = {
      id: `post-ref-${Date.now()}`,
      userId: randomUser.id,
      username: randomUser.username,
      userAvatar: randomUser.avatarUrl,
      imageUrl: randomImg,
      caption: "Refreshed secure feed. Established hybrid encryption protocol handshake successfully. 🛡️✨",
      likesCount: Math.floor(Math.random() * 80) + 12,
      hasLiked: false,
      timestamp: "Just now",
      comments: [],
    };

    setPosts((prev) => [newPost, ...prev]);
    setIsRefreshing(false);
    setDragY(0);
  };

  if (!user) return null;

  const currentUsername = user.displayName.toLowerCase().replace(/\s/g, "");

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 md:py-10 relative">
      {/* Pull-To-Refresh Indicator bar */}
      <AnimatePresence>
        {(dragY > 40 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 45 }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl mb-4 text-emerald-500 font-extrabold select-none text-xs"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Syncing feed..." : "Release to refresh feed"}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bar with Refresh button */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-500 fill-emerald-500/10" />
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            Secure Roster Feed
          </span>
        </div>
        <button
          onClick={triggerRefresh}
          disabled={isRefreshing}
          className="text-slate-400 hover:text-emerald-500 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          title="Refresh Feed"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-500" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Drag-to-Pull Refresh Wrapper */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.4}
        onDrag={(event, info) => {
          if (!isRefreshing && info.offset.y > 0) {
            setDragY(info.offset.y);
          }
        }}
        onDragEnd={(event, info) => {
          if (dragY > 80 && !isRefreshing) {
            triggerRefresh();
          } else {
            setDragY(0);
          }
        }}
        animate={{ y: isRefreshing ? 0 : 0 }}
        className="space-y-6"
      >
        {/* 1. TOP ROW: Stories Tray */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 mb-6 overflow-x-auto flex gap-4 scrollbar-none select-none">
          {/* Self Story */}
          <StoryBubble
            displayName={user.displayName}
            avatarUrl={user.photoURL}
            isCurrentUser={true}
            isActive={false}
          />

          {/* Mock other active users */}
          {INITIAL_USERS.filter((u) => u.username !== "ammu").map((mockUser) => (
            <StoryBubble
              key={mockUser.id}
              displayName={mockUser.displayName}
              avatarUrl={mockUser.avatarUrl}
              isActive={mockUser.username === "kalyan" || mockUser.username === "siri"}
            />
          ))}
        </div>

        {/* 2. VERTICAL FEED - Scroll optimized with paint containment */}
        <div className="space-y-6 contain-paint">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUsername={currentUsername}
              onLike={handleLike}
              onAddComment={handleAddComment}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
