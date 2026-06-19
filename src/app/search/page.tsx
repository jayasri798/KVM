"use client";

import React, { useState, useEffect } from "react";
import { useE2EEAuth } from "@/hooks/useE2EEAuth";
import { db, isSimulated } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import {
  getSimUsers,
  getSimConnections,
  saveSimConnection,
  deleteSimConnection,
  SimConnection,
} from "@/lib/simulator";
import Navigation from "@/components/Navigation";

interface SearchUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  publicKeyJwk: JsonWebKey;
}

interface Connection {
  id: string;
  senderUid: string;
  receiverUid: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  updatedAt: any;
}

export default function SearchPage() {
  const { user, loading: authLoading } = useE2EEAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<SearchUser[]>([]);
  const [connections, setConnections] = useState<Record<string, Connection>>({});
  const [activeSubTab, setActiveSubTab] = useState<"incoming" | "outgoing">("incoming");
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Connection Id Generator (Unique sorted key for a user pair)
  const getConnectionId = (partnerUid: string) => {
    if (!user) return "";
    return [user.uid, partnerUid].sort().join("_");
  };

  // 1. Fetch registered users & connections (supports both simulator and real Firestore)
  useEffect(() => {
    if (!user) return;

    if (isSimulated) {
      // --- SIMULATED DATA SYNC ---
      const syncSimData = () => {
        // Fetch connections involving current user
        const allConns = getSimConnections();
        const userConns = allConns.filter(
          (c) => c.senderUid === user.uid || c.receiverUid === user.uid
        );
        const mapping: Record<string, Connection> = {};
        userConns.forEach((c) => {
          mapping[c.id] = c as Connection;
        });
        setConnections(mapping);

        // Fetch other users in simulated registry
        const allUsersList = getSimUsers().filter((u) => u.uid !== user.uid);
        const mapped = allUsersList.map((u) => ({
          uid: u.uid,
          displayName: u.displayName,
          email: u.email,
          photoURL: u.photoURL,
          publicKeyJwk: JSON.parse(u.publicKey),
        }));
        setAllUsers(mapped);
      };

      syncSimData();
      window.addEventListener("kam_sim_db_update", syncSimData);
      return () => window.removeEventListener("kam_sim_db_update", syncSimData);
    }

    // --- REAL FIRESTORE SYNC ---
    const fetchRealUsers = async () => {
      try {
        if (!db) return;
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersList: SearchUser[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.uid !== user.uid) {
            usersList.push({
              uid: data.uid,
              displayName: data.displayName,
              email: data.email,
              photoURL: data.photoURL,
              publicKeyJwk: JSON.parse(data.publicKey),
            });
          }
        });
        setAllUsers(usersList);
      } catch (err) {
        console.error("Error fetching users roster:", err);
      }
    };

    fetchRealUsers();

    if (!db) return;
    const connectionsRef = collection(db, "connections");

    // Listen to connections sent by current user
    const qSent = query(connectionsRef, where("senderUid", "==", user.uid));
    const unsubSent = onSnapshot(qSent, (snap) => {
      setConnections((prev) => {
        const next = { ...prev };
        snap.forEach((docSnap) => {
          next[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as Connection;
        });
        return next;
      });
    });

    // Listen to connections received by current user
    const qRecv = query(connectionsRef, where("receiverUid", "==", user.uid));
    const unsubRecv = onSnapshot(qRecv, (snap) => {
      setConnections((prev) => {
        const next = { ...prev };
        snap.forEach((docSnap) => {
          next[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as Connection;
        });
        return next;
      });
    });

    return () => {
      unsubSent();
      unsubRecv();
    };
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-mint-light border-t-mint rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-14 h-14 rounded-2xl bg-mint-light border border-mint/20 flex items-center justify-center text-mint font-bold text-xl mb-4">
          KAM
        </div>
        <h2 className="text-base font-bold text-foreground">Secure Vault Locked</h2>
        <p className="text-xs text-muted-text mt-1.5 max-w-xs leading-relaxed">
          Please log in with your Google account on the main dashboard to access user directories and secure channels.
        </p>
        <a
          href="/"
          className="mt-6 px-6 py-2.5 bg-mint hover:bg-mint-hover text-background font-bold text-xs rounded-xl transition-all duration-200 shadow-md shadow-mint/10"
        >
          Go to Authorization
        </a>
      </div>
    );
  }

  // Filter users based on query
  const filteredUsers = allUsers.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Connect request trigger
  const handleConnect = async (targetUser: SearchUser) => {
    const connId = getConnectionId(targetUser.uid);
    setSubmittingId(targetUser.uid);

    if (isSimulated) {
      // Simulator write
      saveSimConnection({
        id: connId,
        senderUid: user.uid,
        receiverUid: targetUser.uid,
        status: "PENDING",
        updatedAt: new Date().toISOString(),
      });
      setSubmittingId(null);
      return;
    }

    // Real Firebase write
    try {
      if (!db) return;
      await setDoc(doc(db, "connections", connId), {
        senderUid: user.uid,
        receiverUid: targetUser.uid,
        status: "PENDING",
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert("Failed to send connection request.");
    } finally {
      setSubmittingId(null);
    }
  };

  // Accept Connection request
  const handleAccept = async (connId: string) => {
    setSubmittingId(connId);

    if (isSimulated) {
      // Simulator Accept
      const allConns = getSimConnections();
      const match = allConns.find((c) => c.id === connId);
      if (match) {
        saveSimConnection({
          ...match,
          status: "ACCEPTED",
          updatedAt: new Date().toISOString(),
        });
      }
      setSubmittingId(null);
      return;
    }

    // Real Firebase Accept
    try {
      if (!db) return;
      await updateDoc(doc(db, "connections", connId), {
        status: "ACCEPTED",
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert("Failed to accept connection.");
    } finally {
      setSubmittingId(null);
    }
  };

  // Decline Connection request
  const handleDecline = async (connId: string) => {
    setSubmittingId(connId);

    if (isSimulated) {
      // Simulator Delete
      deleteSimConnection(connId);
      setSubmittingId(null);
      return;
    }

    // Real Firebase Delete
    try {
      if (!db) return;
      await deleteDoc(doc(db, "connections", connId));
      setConnections((prev) => {
        const next = { ...prev };
        delete next[connId];
        return next;
      });
    } catch (e) {
      console.error(e);
      alert("Failed to ignore connection.");
    } finally {
      setSubmittingId(null);
    }
  };

  // Filter pending requests lists
  const listIncoming = allUsers.filter((u) => {
    const conn = connections[getConnectionId(u.uid)];
    return conn && conn.status === "PENDING" && conn.receiverUid === user.uid;
  });

  const listOutgoing = allUsers.filter((u) => {
    const conn = connections[getConnectionId(u.uid)];
    return conn && conn.status === "PENDING" && conn.senderUid === user.uid;
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24 md:pt-16">
      {/* Simulation Banner Notice */}
      {isSimulated && (
        <div className="bg-mint-light/10 border-b border-mint/20 py-2 px-6 text-center text-[10px] text-mint font-bold uppercase tracking-wider font-mono">
          ⚡ Sandbox Simulation Mode Active (No Cloud DB Setup Required)
        </div>
      )}

      {/* Top Header */}
      <header className="bg-card-bg border-b border-card-border py-4 px-6 sticky top-0 z-30 flex items-center justify-between md:hidden font-sans">
        <span className="font-bold text-sm tracking-tight">Kavalasina Antha Matladuko</span>
        <span className="text-[10px] text-mint uppercase font-mono tracking-wider font-bold">Secure</span>
      </header>

      {/* Navigation */}
      <div className="hidden md:block">
        <Navigation activeTab="search" setActiveTab={() => (window.location.href = "/")} />
      </div>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 font-sans">
        {/* Left Column: Search & Users Directory */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card-bg border border-card-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-1">Discover Secure Contacts</h2>
            <p className="text-xs text-muted-text mb-4">
              Search users by name or email. Connect to open an asymmetric E2EE chat tunnel.
            </p>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Type display name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-card-border rounded-xl text-xs text-foreground focus:outline-none focus:border-mint transition-colors"
              />
              <svg
                className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Directory Users List */}
          <div className="space-y-3">
            {searchQuery ? (
              filteredUsers.length > 0 ? (
                filteredUsers.map((target) => {
                  const connId = getConnectionId(target.uid);
                  const conn = connections[connId];
                  const isSubmitting = submittingId === target.uid || submittingId === connId;

                  return (
                    <div
                      key={target.uid}
                      className="bg-card-bg border border-card-border rounded-2xl p-4 flex items-center justify-between transition-all hover:border-card-border/80"
                    >
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={target.photoURL}
                          alt={target.displayName}
                          className="w-12 h-12 rounded-full object-cover border border-card-border"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-foreground">{target.displayName}</h4>
                          <p className="text-[10px] text-muted-text">{target.email}</p>
                        </div>
                      </div>

                      {/* Connection Buttons */}
                      <div className="flex items-center gap-2">
                        {!conn ? (
                          <button
                            onClick={() => handleConnect(target)}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-mint hover:bg-mint-hover disabled:bg-mint/40 text-background font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            {isSubmitting ? "Connecting..." : "Connect"}
                          </button>
                        ) : conn.status === "PENDING" ? (
                          conn.senderUid === user.uid ? (
                            <span className="px-4 py-2 border border-card-border text-muted-text text-[11px] font-semibold rounded-xl bg-background/25">
                              Requested
                            </span>
                          ) : (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleAccept(connId)}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 bg-mint text-background font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleDecline(connId)}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 bg-card-border text-foreground hover:bg-red-950/20 hover:text-red-400 font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                              >
                                Ignore
                              </button>
                            </div>
                          )
                        ) : conn.status === "ACCEPTED" ? (
                          <button
                            onClick={() => (window.location.href = "/?tab=chat")}
                            className="px-4 py-2 bg-mint-light/20 border border-mint/20 text-mint font-bold text-xs rounded-xl transition-all flex items-center gap-1 hover:bg-mint/10 cursor-pointer"
                          >
                            <span>Chat Now</span>
                            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnect(target)}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-mint text-background font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Retry Connect
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 bg-card-bg border border-card-border rounded-2xl text-xs text-muted-text">
                  No users found matching "{searchQuery}".
                </div>
              )
            ) : (
              <div className="text-center py-12 bg-card-bg border border-card-border rounded-2xl p-6 text-zinc-500">
                <svg className="w-8 h-8 mx-auto mb-2 text-muted-text/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 01-6-6v-1zm0 0a6 6 0 00-6-6v1z" />
                </svg>
                <p className="text-xs">Type a query in the box above to filter user profiles.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Connection Request Manager */}
        <div className="space-y-6">
          <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden flex flex-col h-[400px]">
            {/* Header Tabs */}
            <div className="flex border-b border-card-border text-center select-none bg-background/20">
              <button
                onClick={() => setActiveSubTab("incoming")}
                className={`flex-1 py-3.5 text-xs font-bold transition-all relative focus:outline-none cursor-pointer ${
                  activeSubTab === "incoming" ? "text-mint" : "text-muted-text hover:text-foreground"
                }`}
              >
                Incoming
                {listIncoming.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-mint text-background font-black text-[9px] rounded-full">
                    {listIncoming.length}
                  </span>
                )}
                {activeSubTab === "incoming" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-mint" />
                )}
              </button>
              <button
                onClick={() => setActiveSubTab("outgoing")}
                className={`flex-1 py-3.5 text-xs font-bold transition-all relative focus:outline-none cursor-pointer ${
                  activeSubTab === "outgoing" ? "text-mint" : "text-muted-text hover:text-foreground"
                }`}
              >
                Sent Requests
                {activeSubTab === "outgoing" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-mint" />
                )}
              </button>
            </div>

            {/* List Panels */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeSubTab === "incoming" ? (
                listIncoming.length > 0 ? (
                  listIncoming.map((requester) => {
                    const connId = getConnectionId(requester.uid);
                    const isSubmitting = submittingId === connId;

                    return (
                      <div
                        key={requester.uid}
                        className="p-3 bg-background border border-card-border rounded-xl flex flex-col gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={requester.photoURL}
                            alt={requester.displayName}
                            className="w-8 h-8 rounded-full object-cover border border-card-border"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="block font-bold text-xs text-foreground truncate">
                              {requester.displayName}
                            </span>
                            <span className="block text-[9px] text-muted-text truncate">
                              {requester.email}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccept(connId)}
                            disabled={isSubmitting}
                            className="flex-1 py-1.5 bg-mint text-background font-bold text-[10px] rounded-lg transition-colors cursor-pointer text-center"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDecline(connId)}
                            disabled={isSubmitting}
                            className="flex-1 py-1.5 bg-card-border text-foreground hover:bg-red-950/20 hover:text-red-400 font-bold text-[10px] rounded-lg transition-colors cursor-pointer text-center"
                          >
                            Ignore
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-xs text-muted-text py-12">
                    No pending incoming connection requests.
                  </div>
                )
              ) : listOutgoing.length > 0 ? (
                listOutgoing.map((target) => {
                  const connId = getConnectionId(target.uid);
                  const isSubmitting = submittingId === connId;

                  return (
                    <div
                      key={target.uid}
                      className="p-3 bg-background border border-card-border rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={target.photoURL}
                          alt={target.displayName}
                          className="w-8 h-8 rounded-full object-cover border border-card-border"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block font-bold text-xs text-foreground truncate">
                            {target.displayName}
                          </span>
                          <span className="block text-[9px] text-muted-text truncate">{target.email}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDecline(connId)}
                        disabled={isSubmitting}
                        className="px-2 py-1.5 bg-card-border text-muted-text hover:text-red-400 font-semibold text-[9px] rounded-lg cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center text-center text-xs text-muted-text py-12">
                  You haven't sent any pending requests.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Floating navigation for mobile */}
      <div className="md:hidden">
        <Navigation activeTab="search" setActiveTab={() => (window.location.href = "/")} />
      </div>
    </div>
  );
}
