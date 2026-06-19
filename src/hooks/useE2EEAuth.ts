"use client";

import { useState, useEffect } from "react";
import { auth, db, googleProvider, isSimulated } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { generateE2EKeyPair, exportKeyPairToJwk } from "@/utils/crypto";
import { saveSimUser, getSimUsers, SimUser } from "@/lib/simulator";
import { getPrivateKey, savePrivateKey } from "@/utils/indexedDB";

export interface E2EUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  publicKeyJwk: JsonWebKey;
}

export function useE2EEAuth() {
  const [user, setUser] = useState<E2EUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLocalPrivateKey, setHasLocalPrivateKey] = useState<boolean>(true);

  // Sign In (supports Google Auth popup and Sandbox Switch Prompt)
  const signInWithGoogle = async () => {
    setLoading(true);
    
    if (isSimulated) {
      // --- SANDBOX SIMULATOR SIGN IN ---
      try {
        const name = prompt(
          "Sandbox Mode (Firebase Config Not Found):\n\nEnter your name/handle to sign in (e.g. Ammu, Kalyan, Siri):"
        );
        if (!name || !name.trim()) {
          setLoading(false);
          return;
        }

        const cleanName = name.trim();
        const username = cleanName.toLowerCase().replace(/[^a-z0-9_]/g, "");
        const uid = `sim-user-${username}`;
        
        // Check if user already registered in simulator database
        const simUsers = getSimUsers();
        const existing = simUsers.find((u) => u.uid === uid);

        let publicKeyJwk: JsonWebKey;

        if (!existing) {
          // New Registration
          const keyPair = await generateE2EKeyPair();
          const jwks = await exportKeyPairToJwk(keyPair);

          // Save Private key locally (IndexedDB V2)
          await savePrivateKey(uid, jwks.privateKey);
          setHasLocalPrivateKey(true);
          publicKeyJwk = jwks.publicKey;

          // Save to simulated database
          const newSimUser: SimUser = {
            uid,
            displayName: cleanName,
            email: `${username}@kam.secure`,
            photoURL: `https://images.unsplash.com/photo-${
              username === "ammu" ? "1535713875002-d1d0cf377fde" : "1570295999919-56ceb5ecca61"
            }?w=150&h=150&fit=crop&crop=face`,
            publicKey: JSON.stringify(jwks.publicKey),
          };
          saveSimUser(newSimUser);
        } else {
          // Returning User
          publicKeyJwk = JSON.parse(existing.publicKey);
          const storedPrivateKey = await getPrivateKey(uid);
          if (!storedPrivateKey) {
            setHasLocalPrivateKey(false);
          } else {
            setHasLocalPrivateKey(true);
          }
        }

        const e2eUser: E2EUser = {
          uid,
          displayName: cleanName,
          email: `${username}@kam.secure`,
          photoURL: existing?.photoURL || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face`,
          publicKeyJwk,
        };

        localStorage.setItem("kam_sim_auth_user", JSON.stringify(e2eUser));
        setUser(e2eUser);
      } catch (err) {
        console.error("Sandbox login failed:", err);
      } finally {
        setLoading(false);
      }
      return;
    }

    // --- REAL GOOGLE FIREBASE AUTH ---
    try {
      if (!auth) throw new Error("Firebase Auth has not been initialized");
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      await handleUserSync(fbUser);
    } catch (err) {
      console.error("Firebase Google login failed:", err);
      setLoading(false);
      throw err;
    }
  };

  // Sign Out
  const logout = async () => {
    setLoading(true);
    
    if (isSimulated) {
      localStorage.removeItem("kam_sim_auth_user");
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      if (auth) await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Synchronize Auth User and Cryptographic Identity (Real Firebase only)
  const handleUserSync = async (fbUser: FirebaseUser) => {
    if (!db) return;
    try {
      const userRef = doc(db, "users", fbUser.uid);
      const userSnap = await getDoc(userRef);

      let publicKeyJwk: JsonWebKey;

      if (!userSnap.exists()) {
        const keyPair = await generateE2EKeyPair();
        const jwks = await exportKeyPairToJwk(keyPair);

        await savePrivateKey(fbUser.uid, jwks.privateKey);
        setHasLocalPrivateKey(true);

        publicKeyJwk = jwks.publicKey;

        await setDoc(userRef, {
          uid: fbUser.uid,
          displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "Anonymous",
          email: fbUser.email || "",
          photoURL: fbUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
          publicKey: JSON.stringify(jwks.publicKey),
          createdAt: serverTimestamp(),
        });
      } else {
        const data = userSnap.data();
        publicKeyJwk = JSON.parse(data.publicKey);

        const storedPrivateKey = await getPrivateKey(fbUser.uid);
        if (!storedPrivateKey) {
          setHasLocalPrivateKey(false);
        } else {
          setHasLocalPrivateKey(true);
        }
      }

      setUser({
        uid: fbUser.uid,
        displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "Anonymous",
        email: fbUser.email || "",
        photoURL: fbUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
        publicKeyJwk,
      });
    } catch (err) {
      console.error("Error synchronizing E2EE User Identity:", err);
    }
  };

  // Listen for Auth status changes (Supports both modes)
  useEffect(() => {
    let unsub: (() => void) | undefined;

    const initAuth = async () => {
      if (isSimulated) {
        const stored = localStorage.getItem("kam_sim_auth_user");
        if (stored) {
          try {
            const parsed: E2EUser = JSON.parse(stored);
            const storedPrivateKey = await getPrivateKey(parsed.uid);
            setHasLocalPrivateKey(!!storedPrivateKey);
            setUser(parsed);
          } catch (e) {
            console.error("Failed to load simulated session:", e);
          }
        }
        setLoading(false);
        return;
      }

      if (!auth) {
        setLoading(false);
        return;
      }

      unsub = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          await handleUserSync(fbUser);
        } else {
          setUser(null);
          setHasLocalPrivateKey(true);
        }
        setLoading(false);
      });
    };

    initAuth();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  return {
    user,
    loading,
    signInWithGoogle,
    logout,
    hasLocalPrivateKey,
    setHasLocalPrivateKey,
  };
}
