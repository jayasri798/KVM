"use client";

import React, { useState } from "react";
import { generateE2EKeyPair, exportKeyPairToJwk } from "../utils/crypto";
import { User } from "../utils/mockData";

interface AuthScreenProps {
  onRegister: (newUser: User) => void;
}

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
];

export default function AuthScreen({ onRegister }: AuthScreenProps) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_PRESETS[0]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");

  const steps = [
    "Initializing Web Crypto Subtle engine...",
    "Generating 2048-bit RSA-OAEP Key Pair...",
    "Saving Private Key securely inside browser Storage...",
    "Exporting Public Key for peer network discovery...",
    "Registering cryptographic identity..."
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim()) {
      setError("Please fill out all fields.");
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanUsername) {
      setError("Username must contain letters, numbers, or underscores.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Step-by-step E2EE registration simulation
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Generate the cryptographic keys
      const keyPair = await generateE2EKeyPair();
      const jwks = await exportKeyPairToJwk(keyPair);

      // Save Private Key locally (must never leave browser storage)
      localStorage.setItem(`kam_private_key_${cleanUsername}`, JSON.stringify(jwks.privateKey));

      // Build user object (Public Key is shared)
      const newUser: User = {
        id: `user-${cleanUsername}-${Date.now()}`,
        username: cleanUsername,
        displayName: displayName.trim(),
        avatarUrl: avatar,
        publicKeyJwk: jwks.publicKey,
      };

      onRegister(newUser);
    } catch (err) {
      console.error(err);
      setError("Cryptographic key generation failed. Please ensure your browser supports SubtleCrypto.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-mint/5 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-mint/5 rounded-full filter blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-card-bg border border-card-border rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-mint-light border border-mint/20 mb-4 animate-pulse">
            <span className="text-mint font-bold text-2xl tracking-wider">KAM</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">
            Kavalasina Antha Matladuko
          </h1>
          <p className="text-sm text-muted-text font-medium Telugu font-sans">
            కావలసినంత మాట్లాడుకో
          </p>
          <p className="text-xs text-muted-text mt-3 px-4 leading-relaxed">
            Zero-knowledge, client-side end-to-end encrypted networking. Your private key never leaves this device.
          </p>
        </div>

        {!loading ? (
          <form onSubmit={handleRegister} className="space-y-6">
            {error && (
              <div className="p-3 text-xs bg-red-950/40 border border-red-900/60 text-red-400 rounded-lg text-center font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-text mb-2">
                Choose Avatar
              </label>
              <div className="flex items-center gap-4 justify-center">
                {AVATAR_PRESETS.map((preset, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setAvatar(preset)}
                    className={`relative rounded-full overflow-hidden w-14 h-14 border-2 transition-all duration-300 hover:scale-105 ${
                      avatar === preset
                        ? "border-mint ring-4 ring-mint/20 scale-105"
                        : "border-card-border"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preset} alt={`Avatar Preset ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-text mb-2">
                Pick a Handle (Username)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-text font-medium">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="w-full pl-8 pr-4 py-3 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:border-mint focus:ring-1 focus:ring-mint text-foreground transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-text mb-2">
                Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Amareswar"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:border-mint focus:ring-1 focus:ring-mint text-foreground transition-all duration-200"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-mint hover:bg-mint-hover text-background font-bold text-sm rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-mint/10 hover:shadow-mint/20 active:scale-[0.98] mt-2"
            >
              Generate Cryptographic Vault
            </button>
          </form>
        ) : (
          <div className="py-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-12 h-12 border-4 border-mint-light border-t-mint rounded-full animate-spin" />
            </div>
            <div className="space-y-3 px-4">
              <h3 className="text-sm font-semibold text-foreground">Creating Secure Identity</h3>
              <div className="h-1.5 w-full bg-card-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-mint transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>
              <ul className="text-xs text-left space-y-2 mt-4 max-w-[280px] mx-auto">
                {steps.map((step, index) => (
                  <li
                    key={index}
                    className={`flex items-start gap-2 transition-all duration-300 ${
                      index < currentStep
                        ? "text-mint font-medium"
                        : index === currentStep
                        ? "text-foreground font-semibold"
                        : "text-muted-text/40"
                    }`}
                  >
                    <span>{index < currentStep ? "✓" : index === currentStep ? "→" : "○"}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
