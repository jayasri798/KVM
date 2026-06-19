"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import StoryBubble from "../components/StoryBubble";
import { INITIAL_POSTS, INITIAL_USERS } from "../utils/mockData";

export default function HomeFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState(INITIAL_POSTS);

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

  if (!user) return null;

  const currentUsername = user.displayName.toLowerCase().replace(/\s/g, "");

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 md:py-10">
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
    </div>
  );
}
