"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import CreatePostModal from "./CreatePostModal";
import { ShieldCheck, Lock, Key, ServerCrash } from "lucide-react";
import { isSimulated as firebaseSimulated } from "@/lib/firebase";

export default function ClientAppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signInWithGoogle, hasLocalPrivateKey } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSim, setIsSim] = useState(false);

  useEffect(() => {
    setIsSim(firebaseSimulated);
  }, []);

  // Post creation event dispatcher
  const handlePostCreated = (imageUrl: string, caption: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kam_new_post", {
          detail: { imageUrl, caption },
        })
      );
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans">
        <div className="text-center space-y-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-500/10 shadow-sm animate-pulse mb-2">
            <span className="text-emerald-500 font-extrabold text-2xl tracking-wider">KAM</span>
          </div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            Opening Cryptographic Identity...
          </h2>
          <div className="w-24 h-1 bg-slate-100 rounded-full mx-auto overflow-hidden relative">
            <div className="h-full bg-emerald-500 absolute left-0 top-0 w-1/2 animate-loading-bar" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Landing Page
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12 relative overflow-hidden font-sans">
        {/* Soft Ambient Decorative Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/3 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/3 rounded-full filter blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-8 shadow-xl relative z-10 text-center">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-500/10 mb-4 select-none">
            <span className="text-emerald-500 font-extrabold text-2xl tracking-wider">KAM</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">
            Kavalasina Antha Matladuko
          </h1>
          <p className="text-xs text-slate-400 font-bold Telugu mb-6 tracking-wide">
            ಕಾవలసినంత మాట్లాడుకో
          </p>

          {/* Secure Protocols Spec Box */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-xs text-left text-slate-600 mb-8 space-y-4 leading-relaxed">
            <h3 className="font-extrabold text-slate-800 text-center border-b border-slate-200/60 pb-2 mb-2 uppercase tracking-wider text-[10px] text-emerald-600 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              E2EE Security Protocol
            </h3>
            <div className="flex gap-3 items-start">
              <Lock className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Firebase Auth</strong>: Secured by Google OAuth provider.
              </span>
            </div>
            <div className="flex gap-3 items-start">
              <Key className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>RSA-2048 Identity Keys</strong>: Client-side key pairs are generated on enrollment.
              </span>
            </div>
            <div className="flex gap-3 items-start">
              <ServerCrash className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Zero-Knowledge Storage</strong>: Private keys remain locally stored on your browser profile and are never synced to databases.
              </span>
            </div>
          </div>

          {/* Simulated Mode Banner inside Login box */}
          {isSim && (
            <div className="mb-6 p-2 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold rounded-lg uppercase tracking-wider">
              ⚡ Running in Sandbox Simulation Mode
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={signInWithGoogle}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-3 border border-emerald-600/10"
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

  // 3. Authenticated Layout
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col md:flex-row">
      {/* Simulation Banner Notice (Floating/Fixed) */}
      {isSim && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/10 border-b border-amber-500/20 py-2 px-6 text-center text-[10px] text-amber-700 font-bold uppercase tracking-wider font-mono select-none">
          ⚡ Sandbox Simulation Active (Private Storage Mode)
        </div>
      )}

      {/* Panel A: Sidebar Navigation */}
      <Sidebar onCreateClick={() => setIsCreateOpen(true)} />

      {/* Panel B: Content Pane */}
      <main className="flex-1 md:pl-20 lg:pl-64 pb-16 md:pb-0 min-h-screen bg-white relative">
        <div className="h-full">
          {children}
        </div>
      </main>

      {/* Global Post Creation Modal overlay */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}
