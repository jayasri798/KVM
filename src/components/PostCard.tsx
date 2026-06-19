"use client";

import React, { useState, useRef } from "react";
import { Post, Comment } from "../utils/mockData";

interface PostCardProps {
  post: Post;
  currentUsername: string;
  onLike: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
}

export default function PostCard({ post, currentUsername, onLike, onAddComment }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const lastTap = useRef<number>(0);

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
      if (!post.hasLiked) {
        onLike(post.id);
      }
      setShowHeartOverlay(true);
      setTimeout(() => setShowHeartOverlay(false), 800);
    }
    lastTap.current = now;
  };

  const handleLikeClick = () => {
    onLike(post.id);
    if (!post.hasLiked) {
      setShowHeartOverlay(true);
      setTimeout(() => setShowHeartOverlay(false), 800);
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(post.id, commentText.trim());
    setCommentText("");
  };

  return (
    <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/20 w-full max-w-xl mx-auto mb-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-card-border">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.userAvatar}
            alt={post.username}
            className="w-10 h-10 rounded-full object-cover border border-card-border"
          />
          <div>
            <span className="font-semibold text-sm hover:text-mint cursor-pointer text-foreground">
              {post.username}
            </span>
            <span className="block text-[10px] text-muted-text">{post.timestamp}</span>
          </div>
        </div>
        <button className="text-muted-text hover:text-foreground p-1.5 rounded-lg hover:bg-background transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        </button>
      </div>

      {/* Image Area */}
      <div
        className="relative aspect-square bg-neutral-900 overflow-hidden cursor-pointer select-none"
        onClick={handleDoubleTap}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.imageUrl}
          alt="Post content"
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          loading="lazy"
        />

        {/* Double Tap Heart Overlay */}
        {showHeartOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-fade-in pointer-events-none">
            <svg
              className="w-24 h-24 text-mint fill-mint drop-shadow-[0_0_15px_rgba(16,185,129,0.6)] scale-[0.3] animate-ping-once"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-4 p-4">
        <button
          onClick={handleLikeClick}
          className="group focus:outline-none transition-transform active:scale-75"
        >
          <svg
            className={`w-6 h-6 transition-all duration-300 ${
              post.hasLiked
                ? "text-mint fill-mint drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                : "text-foreground hover:text-mint"
            }`}
            fill={post.hasLiked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        <button
          onClick={() => setShowComments(true)}
          className="focus:outline-none text-foreground hover:text-mint transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>

        <button className="ml-auto focus:outline-none text-foreground hover:text-mint transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>

      {/* Caption & Likes */}
      <div className="px-4 pb-4 space-y-2 text-sm">
        <div className="font-semibold text-foreground">{post.likesCount} likes</div>
        <div>
          <span className="font-semibold text-foreground mr-2 cursor-pointer hover:text-mint">
            {post.username}
          </span>
          <span className="text-zinc-300 leading-relaxed">{post.caption}</span>
        </div>

        {post.comments.length > 0 ? (
          <button
            onClick={() => setShowComments(true)}
            className="text-xs text-muted-text hover:text-mint transition-colors"
          >
            View all {post.comments.length} comments
          </button>
        ) : (
          <span className="text-xs text-muted-text">No comments yet. Be the first to share!</span>
        )}
      </div>

      {/* Slide-up Comments Drawer */}
      {showComments && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col justify-end transition-all duration-300">
          {/* Dismiss area */}
          <div className="flex-1" onClick={() => setShowComments(false)} />

          {/* Drawer Panel */}
          <div className="bg-card-bg border-t border-card-border rounded-t-2xl max-h-[75%] flex flex-col w-full animate-slide-up relative">
            <div className="w-12 h-1 bg-card-border rounded-full mx-auto my-3" />
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-card-border">
              <span className="font-bold text-sm text-foreground">Comments</span>
              <button
                onClick={() => setShowComments(false)}
                className="text-muted-text hover:text-foreground p-1 hover:bg-background rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
              {post.comments.length > 0 ? (
                post.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 text-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={comment.userAvatar}
                      alt={comment.username}
                      className="w-8 h-8 rounded-full object-cover border border-card-border mt-0.5"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-xs text-foreground">{comment.username}</span>
                        <span className="text-[10px] text-muted-text">{comment.timestamp}</span>
                      </div>
                      <p className="text-zinc-300 text-xs leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-text">
                  No comments yet. Say something!
                </div>
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSubmitComment}
              className="p-4 border-t border-card-border bg-background flex items-center gap-3"
            >
              <input
                type="text"
                placeholder={`Comment as @${currentUsername}...`}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-card-bg border border-card-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-mint transition-colors"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-4 py-2.5 bg-mint hover:bg-mint-hover disabled:bg-mint/45 disabled:text-background/50 text-background font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Post
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
