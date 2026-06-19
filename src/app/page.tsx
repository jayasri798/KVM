"use client";

import React, { useState } from "react";
import { useE2EEAuth } from "../hooks/useE2EEAuth";
import Navigation, { TabType } from "../components/Navigation";
import Feed from "../components/Feed";
import EncryptedChat from "../components/EncryptedChat";
import KeyVault from "../components/KeyVault";
import SearchPage from "./search/page";
import { INITIAL_POSTS } from "../utils/mockData";

export default function Home() {
  const { user, loading, signInWithGoogle, logout, hasLocalPrivateKey } = useE2EEAuth();
  const [activeTab, setActiveTab] = useState<TabType>("feed");
  const [posts, setPosts] = useState(INITIAL_POSTS);

  // Handle local post likes in client state
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

  // Handle local comments additions
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-mint-light border border-mint/20 animate-pulse mb-2">
            <span className="text-mint font-bold text-2xl tracking-wider">KAM</span>
          </div>
          <h2 className="text-sm font-semibold text-foreground">Opening Cryptographic Identity...</h2>
          <div className="w-24 h-1 bg-card-border rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-mint animate-loading-bar w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // 1. UNSIGNED LANDING AND AUTHORIZATION SCREEN
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden font-sans">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-mint/5 rounded-full filter blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-mint/5 rounded-full filter blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md bg-card-bg border border-card-border rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-mint-light border border-mint/20 mb-4 animate-pulse">
            <span className="text-mint font-bold text-2xl tracking-wider">KAM</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">
            Kavalasina Antha Matladuko
          </h1>
          <p className="text-xs text-muted-text font-medium Telugu mb-6">
            కావలసినంత మాట్లాడుకో
          </p>

          <div className="bg-[#08080a] border border-card-border rounded-xl p-4 text-xs text-left text-zinc-400 mb-8 space-y-3 leading-relaxed">
            <h3 className="font-bold text-foreground text-center border-b border-card-border/50 pb-2 mb-2 uppercase tracking-wider text-[9px] text-mint">
              E2EE Security Protocol
            </h3>
            <div className="flex gap-2">
              <span className="text-mint font-black">1.</span>
              <span>Authentication is powered securely by Google Firebase Auth.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-mint font-black">2.</span>
              <span>Signing up automatically generates a client-side 2048-bit RSA-OAEP Key Pair.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-mint font-black">3.</span>
              <span>Public key is registered in Firestore. Private key is saved strictly in browser local storage.</span>
            </div>
          </div>

          <button
            onClick={signInWithGoogle}
            className="w-full py-3.5 bg-mint hover:bg-mint-hover text-background font-bold text-xs rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-mint/10 hover:shadow-mint/20 active:scale-[0.98] flex items-center justify-center gap-2.5"
          >
            {/* Google Icon */}
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.51 0-6.386-2.876-6.386-6.39s2.876-6.386 6.386-6.386c1.642 0 3.125.617 4.28 1.63L21.365 4.3C19.123 2.19 16.036 1 12.24 1 5.866 1 .7 6.166.7 12.54s5.166 11.54 11.54 11.54c6.64 0 11.378-4.665 11.378-11.54 0-.79-.08-1.572-.222-2.255H12.24z" />
            </svg>
            <span>Authorize with Google Account</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. SIGNED IN MAIN DASHBOARD
  const mappedCurrentUser = {
    id: user.uid,
    username: user.displayName.toLowerCase().replace(/\s/g, ""),
    displayName: user.displayName,
    avatarUrl: user.photoURL,
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-16 md:pb-0 md:pt-16">
      {/* Top Header */}
      <header className="md:hidden bg-card-bg border-b border-card-border py-3.5 px-4 flex items-center justify-between sticky top-0 z-30 font-sans">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-mint flex items-center justify-center font-bold text-background text-xs tracking-wider">
            KAM
          </div>
          <span className="font-bold text-xs tracking-tight">Kavalasina Antha Matladuko</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
          <span className="text-[8px] font-mono text-mint uppercase tracking-wider font-bold">Secure</span>
        </div>
      </header>

      {/* Navigation */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Tab Routing */}
      <main className="flex-1 overflow-x-hidden">
        {activeTab === "feed" && (
          <Feed
            posts={posts}
            currentUser={mappedCurrentUser}
            users={[]} // Handled dynamically in Feed stories bar
            onLike={handleLike}
            onAddComment={handleAddComment}
          />
        )}

        {activeTab === "search" && <SearchPage />}

        {activeTab === "chat" && <EncryptedChat currentUser={user} />}

        {activeTab === "vault" && (
          <KeyVault
            currentUser={user}
            logout={logout}
            hasLocalPrivateKey={hasLocalPrivateKey}
          />
        )}
      </main>
    </div>
  );
}
