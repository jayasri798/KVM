"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { KeyRound, ShieldCheck, LogOut, Info, Share2, Copy, Check } from "lucide-react";

export default function ProfilePage() {
  const { user, logout, hasLocalPrivateKey } = useAuth();
  const [localPrivateKeyJwk, setLocalPrivateKeyJwk] = useState("Loading key...");
  const [copiedKey, setCopiedKey] = useState<"private" | "public" | null>(null);

  useEffect(() => {
    if (!user) return;

    // Read private key from local storage using current UID
    const privateKey = localStorage.getItem(`kam_private_key_${user.uid}`);
    if (privateKey) {
      try {
        const parsed = JSON.parse(privateKey);
        setLocalPrivateKeyJwk(JSON.stringify(parsed, null, 2));
      } catch (e) {
        setLocalPrivateKeyJwk(`Error formatting key: ${String(e)}`);
      }
    } else {
      setLocalPrivateKeyJwk(
        "Private Key not found on this browser profile! You cannot decrypt incoming messages unless you import or recover your key."
      );
    }
  }, [user]);

  if (!user) return null;

  const formattedPublicKeyJwk = user.publicKeyJwk
    ? JSON.stringify(user.publicKeyJwk, null, 2)
    : "No public key registered.";

  const handleCopy = (type: "private" | "public", text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(type);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 lg:py-10 space-y-6 font-sans">
      {/* 1. Header Overview Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full filter blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            {/* User Profile Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
            />
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">
                {user.displayName}
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-1.5">{user.email}</p>
              <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50/50 border border-emerald-100 text-emerald-600 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {hasLocalPrivateKey ? "Vault Connected" : "Missing Local Private Key"}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="px-5 py-2.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-500 border border-slate-200 hover:border-red-100 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* E2EE Info Warning Banner */}
        <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-3 text-xs leading-relaxed text-slate-600 font-medium">
          <Info className="w-5.5 h-5.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold text-slate-800">Zero-Trust Cryptographic Identity:</span> Your
            critical <strong className="text-slate-800">Private Key</strong> remains saved solely inside this
            browser's local sandboxed storage. It is never synced to cloud databases. If you sign in from another browser
            or clear storage, you must restore your private key to access your encrypted conversations.
          </div>
        </div>
      </div>

      {/* 2. Key Vault Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Private Key Console */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-[400px] shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-4.5 h-4.5 text-slate-400" />
                Local Private Key (RSA)
              </span>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Used for local decryption of messages</p>
            </div>
            <button
              onClick={() => handleCopy("private", localPrivateKeyJwk)}
              className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition-colors border border-slate-200 cursor-pointer flex items-center justify-center"
              title="Copy Private Key Block"
            >
              {copiedKey === "private" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex-1 bg-slate-950 rounded-xl p-4 border border-slate-900 overflow-y-auto font-mono text-[9px] text-slate-400 select-all scrollbar-thin">
            <pre className="whitespace-pre-wrap leading-relaxed">{localPrivateKeyJwk}</pre>
          </div>
        </div>

        {/* Public Key Console */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-[400px] shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-4.5 h-4.5 text-slate-400" />
                Identity Public Key (RSA)
              </span>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Registered in registry for peer connections</p>
            </div>
            <button
              onClick={() => handleCopy("public", formattedPublicKeyJwk)}
              className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition-colors border border-slate-200 cursor-pointer flex items-center justify-center"
              title="Copy Public Key Block"
            >
              {copiedKey === "public" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex-1 bg-slate-950 rounded-xl p-4 border border-slate-900 overflow-y-auto font-mono text-[9px] text-slate-400 select-all scrollbar-thin">
            <pre className="whitespace-pre-wrap leading-relaxed">{formattedPublicKeyJwk}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
