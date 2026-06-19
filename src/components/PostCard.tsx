"use client";

import React, { useState, useRef } from "react";
import { Heart, MessageCircle, Send, MoreHorizontal } from "lucide-react";
import { Post } from "../utils/mockData";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

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
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden w-full max-w-lg mx-auto mb-6 relative">
      {/* Top Row: 40px circle avatar, Username (Bold), subtle (...) menu icon */}
      <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-200">
            <Image
              src={post.userAvatar}
              alt={post.username}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-800 hover:text-emerald-600 cursor-pointer transition-colors block">
              {post.username}
            </span>
            <span className="block text-[10px] text-slate-400 font-semibold">{post.timestamp}</span>
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
          <MoreHorizontal className="w-5 h-5 stroke-[2px]" />
        </button>
      </div>

      {/* Middle: Full width, square Aspect Ratio (1:1) image holder with rounded corners (4px) */}
      <div
        className="relative aspect-square bg-slate-50 overflow-hidden cursor-pointer select-none px-3 pt-3"
        onClick={handleDoubleTap}
      >
        <div className="w-full h-full rounded-[4px] overflow-hidden border border-slate-100">
          <Image
            src={post.imageUrl}
            alt="Post content"
            fill
            sizes="(max-width: 512px) 100vw, 512px"
            className="object-cover transition-transform duration-700 hover:scale-103"
            priority={post.id === "post-1"}
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmMWY1ZjkiLz48L3N2Zz4="
          />
        </div>

        {/* Double Tap Heart Overlay */}
        <AnimatePresence>
          {showHeartOverlay && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1.1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-[1px] pointer-events-none"
            >
              <Heart
                className="w-20 h-20 text-emerald-500 fill-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                strokeWidth={1.5}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Bar & Caption Area */}
      <div className="p-3.5 pt-2">
        {/* Bottom row: Standard Icon row (Like-Heart, Comment-Bubble, Send-Plane). Left-aligned. */}
        <div className="flex items-center gap-3.5 pb-2.5">
          <button
            onClick={handleLikeClick}
            className="focus:outline-none transition-transform active:scale-90"
          >
            <Heart
              className={`w-6 h-6 transition-all duration-300 ${
                post.hasLiked
                  ? "text-emerald-500 fill-emerald-500"
                  : "text-slate-600 hover:text-emerald-500"
              }`}
              strokeWidth={post.hasLiked ? 2.5 : 2}
            />
          </button>

          <button
            onClick={() => setShowComments(true)}
            className="focus:outline-none text-slate-600 hover:text-emerald-500 transition-colors"
          >
            <MessageCircle className="w-6 h-6" />
          </button>

          <button className="focus:outline-none text-slate-600 hover:text-emerald-500 transition-colors">
            <Send className="w-6 h-6" />
          </button>
        </div>

        {/* Caption & Likes details */}
        <div className="space-y-1.5 text-xs text-slate-800">
          <div className="font-extrabold text-slate-900 select-none">
            Liked by {post.likesCount} users
          </div>
          <div>
            <span className="font-extrabold text-slate-900 mr-2 hover:text-emerald-600 cursor-pointer">
              {post.username}
            </span>
            <span className="text-slate-600 leading-relaxed font-medium">{post.caption}</span>
          </div>

          {post.comments.length > 0 ? (
            <button
              onClick={() => setShowComments(true)}
              className="text-[11px] font-bold text-slate-400 hover:text-emerald-600 transition-colors block mt-1"
            >
              View all {post.comments.length} comments
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400 block mt-1">No comments yet.</span>
          )}
        </div>
      </div>

      {/* Slide-up Comments Drawer */}
      <AnimatePresence>
        {showComments && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs z-20 flex flex-col justify-end">
            {/* Dismiss area */}
            <div className="flex-1" onClick={() => setShowComments(false)} />

            {/* Drawer Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white border-t border-slate-200 rounded-t-2xl max-h-[75%] flex flex-col w-full relative"
            >
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3" />
              
              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3.5 border-b border-slate-100">
                <span className="font-extrabold text-sm text-slate-800">Comments</span>
                <button
                  onClick={() => setShowComments(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  <span className="text-xs font-bold px-2 py-1">Close</span>
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4.5 min-h-[220px]">
                {post.comments.length > 0 ? (
                  post.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-xs">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-200 mt-0.5">
                        <Image
                          src={comment.userAvatar}
                          alt={comment.username}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-extrabold text-slate-900">{comment.username}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{comment.timestamp}</span>
                        </div>
                        <p className="text-slate-600 font-medium leading-relaxed">{comment.text}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                    No comments yet. Say something!
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form
                onSubmit={handleSubmitComment}
                className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-3"
              >
                <input
                  type="text"
                  placeholder={`Comment as @${currentUsername}...`}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Post
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </article>
  );
}
