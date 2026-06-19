"use client";

import React, { useEffect, useState } from "react";
import { E2EUser } from "../hooks/useE2EEAuth";

interface KeyVaultProps {
  currentUser: E2EUser;
  logout: () => void;
  hasLocalPrivateKey: boolean;
}

export default function KeyVault({ currentUser, logout, hasLocalPrivateKey }: KeyVaultProps) {
  const [localPrivateKeyJwk, setLocalPrivateKeyJwk] = useState<string>("Loading key...");

  useEffect(() => {
    // Read private key from localStorage using the Firebase UID
    const privateKey = localStorage.getItem(`kam_private_key_${currentUser.uid}`);
    if (privateKey) {
      try {
        const parsed = JSON.parse(privateKey);
        setLocalPrivateKeyJwk(JSON.stringify(parsed, null, 2));
      } catch (e) {
        setLocalPrivateKeyJwk(`Error formatting key: ${String(e)}`);
      }
    } else {
      setLocalPrivateKeyJwk(
        "Private Key not found on this browser profile! You cannot decrypt incoming messages unless you import your key."
      );
    }
  }, [currentUser]);

  const formattedPublicKeyJwk = currentUser.publicKeyJwk
    ? JSON.stringify(currentUser.publicKeyJwk, null, 2)
    : "No public key registered.";

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24 font-sans">
      {/* Overview Card */}
      <div className="bg-card-bg border border-card-border rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-mint/5 rounded-full filter blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName}
              className="w-16 h-16 rounded-full object-cover border-2 border-mint"
            />
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-lg font-bold text-foreground">{currentUser.displayName}</h2>
              <p className="text-xs text-muted-text">{currentUser.email}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-mint-light/30 border border-mint/20 text-mint text-[10px] font-semibold rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
                {hasLocalPrivateKey ? "Vault Connected" : "Missing Local Private Key"}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="px-5 py-2.5 bg-card-border hover:bg-red-950/20 hover:text-red-400 border border-card-border hover:border-red-900/30 text-foreground font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-black/10 active:scale-[0.98]"
          >
            Sign Out
          </button>
        </div>

        {/* Warning Banner */}
        <div className="mt-6 p-4 bg-yellow-950/20 border border-yellow-700/30 rounded-xl flex gap-3 text-xs leading-relaxed text-yellow-300">
          <svg className="w-5.5 h-5.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <span className="font-bold">Zero-Trust Protocol:</span> Your **Private Key** is kept strictly inside
            your browser's local store. If you sign in from a different browser or device, your messages cannot be
            decrypted unless you backup and import this private key block.
          </div>
        </div>
      </div>

      {/* Keys Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Private Key Box */}
        <div className="bg-card-bg border border-card-border rounded-2xl p-5 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Local Private Key</span>
              <p className="text-[10px] text-muted-text mt-0.5">Used for decrypting incoming messages</p>
            </div>
            <span className="text-[9px] bg-red-950/40 text-red-400 border border-red-900/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">
              Strictly Secret
            </span>
          </div>
          <div className="flex-1 bg-[#08080a] rounded-xl p-4 border border-card-border overflow-y-auto font-mono text-[9px] text-zinc-400 scrollbar-thin">
            <pre className="whitespace-pre-wrap select-all">{localPrivateKeyJwk}</pre>
          </div>
        </div>

        {/* Public Key Box */}
        <div className="bg-card-bg border border-card-border rounded-2xl p-5 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold text-mint uppercase tracking-wider">Identity Public Key</span>
              <p className="text-[10px] text-muted-text mt-0.5">Stored in Firestore for connection discovery</p>
            </div>
            <span className="text-[9px] bg-mint-light/40 text-mint border border-mint/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">
              Shareable
            </span>
          </div>
          <div className="flex-1 bg-[#08080a] rounded-xl p-4 border border-card-border overflow-y-auto font-mono text-[9px] text-zinc-400 scrollbar-thin">
            <pre className="whitespace-pre-wrap select-all">{formattedPublicKeyJwk}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
