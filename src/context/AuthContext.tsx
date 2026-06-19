"use client";

import React, { createContext, useContext } from "react";
import { useE2EEAuth, E2EUser } from "../hooks/useE2EEAuth";

interface AuthContextType {
  user: E2EUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  hasLocalPrivateKey: boolean;
  setHasLocalPrivateKey: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useE2EEAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
