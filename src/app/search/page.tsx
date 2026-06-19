"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, isSimulated } from "@/lib/firebase";
import { Search, UserPlus, Check, Clock, MessageSquare, Trash2 } from "lucide-react";
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
} from "@/lib/simulator";

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
  const { user } = useAuth();
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
      const syncSimData = () => {
        const allConns = getSimConnections();
        const userConns = allConns.filter(
          (c) => c.senderUid === user.uid || c.receiverUid === user.uid
        );
        const mapping: Record<string, Connection> = {};
        userConns.forEach((c) => {
          mapping[c.id] = c as Connection;
        });
        setConnections(mapping);

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

    // Real Firestore Sync
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

  if (!user) return null;

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
      deleteSimConnection(connId);
      setSubmittingId(null);
      return;
    }

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
    <div className="w-full max-w-4xl mx-auto px-4 py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-3 gap-8 font-sans">
      {/* Left Column: Search Input & Users Discovery */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-extrabold text-slate-800 tracking-tight mb-1">
            Discover Contacts
          </h2>
          <p className="text-xs text-slate-400 font-semibold mb-5 leading-relaxed">
            Search secure directory to connect. Approved connections unlock direct end-to-end encrypted chats.
          </p>

          {/* Pill-shaped search input bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by display name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
            />
            <Search className="w-4.5 h-4.5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Results List */}
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
                    className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between transition-all hover:border-slate-300"
                  >
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={target.photoURL}
                        alt={target.displayName}
                        className="w-12 h-12 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-800 leading-tight">
                          {target.displayName}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{target.email}</p>
                      </div>
                    </div>

                    {/* Emerald Active Connection Button */}
                    <div className="flex items-center gap-2">
                      {!conn ? (
                        <button
                          onClick={() => handleConnect(target)}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-500/5"
                        >
                          Send Request
                        </button>
                      ) : conn.status === "PENDING" ? (
                        conn.senderUid === user.uid ? (
                          <span className="px-4 py-2 border border-slate-200 text-slate-400 text-[11px] font-bold rounded-xl bg-slate-50 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Requested
                          </span>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAccept(connId)}
                              disabled={isSubmitting}
                              className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] rounded-lg transition-colors cursor-pointer"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDecline(connId)}
                              disabled={isSubmitting}
                              className="px-3 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-500 font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                            >
                              Ignore
                            </button>
                          </div>
                        )
                      ) : conn.status === "ACCEPTED" ? (
                        <button
                          onClick={() => (window.location.href = "/messages")}
                          className="px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 hover:bg-emerald-100/50 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnect(target)}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-emerald-500 text-white font-extrabold text-xs rounded-xl cursor-pointer"
                        >
                          Retry Connect
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl text-xs text-slate-400 font-semibold">
                No users found matching "{searchQuery}".
              </div>
            )
          ) : (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl p-6 text-slate-400">
              <UserPlus className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold">Type a search query above to filter user profiles.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Connection Request Manager Dashboard */}
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-[420px]">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 text-center select-none bg-slate-50/50">
            <button
              onClick={() => setActiveSubTab("incoming")}
              className={`flex-1 py-4 text-xs font-extrabold transition-all relative focus:outline-none cursor-pointer ${
                activeSubTab === "incoming" ? "text-emerald-600" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              Incoming Requests
              {listIncoming.length > 0 && (
                <span className="ml-1.5 px-2 py-0.5 bg-emerald-500 text-white font-black text-[9px] rounded-full">
                  {listIncoming.length}
                </span>
              )}
              {activeSubTab === "incoming" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
              )}
            </button>
            <button
              onClick={() => setActiveSubTab("outgoing")}
              className={`flex-1 py-4 text-xs font-extrabold transition-all relative focus:outline-none cursor-pointer ${
                activeSubTab === "outgoing" ? "text-emerald-600" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              Sent Requests
              {listOutgoing.length > 0 && (
                <span className="ml-1.5 px-2 py-0.5 bg-slate-200 text-slate-600 font-black text-[9px] rounded-full">
                  {listOutgoing.length}
                </span>
              )}
              {activeSubTab === "outgoing" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
              )}
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeSubTab === "incoming" ? (
              listIncoming.length > 0 ? (
                listIncoming.map((requester) => {
                  const connId = getConnectionId(requester.uid);
                  const isSubmitting = submittingId === connId;

                  return (
                    <div
                      key={requester.uid}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={requester.photoURL}
                          alt={requester.displayName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block font-extrabold text-xs text-slate-800 truncate leading-none">
                            {requester.displayName}
                          </span>
                          <span className="block text-[9px] text-slate-400 font-semibold truncate mt-1">
                            {requester.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(connId)}
                          disabled={isSubmitting}
                          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] rounded-lg transition-colors cursor-pointer text-center"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(connId)}
                          disabled={isSubmitting}
                          className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-500 hover:border-red-100 font-extrabold text-[10px] rounded-lg transition-colors cursor-pointer text-center"
                        >
                          Ignore
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center text-center text-xs text-slate-400 font-semibold py-12">
                  No pending incoming requests.
                </div>
              )
            ) : listOutgoing.length > 0 ? (
              listOutgoing.map((target) => {
                const connId = getConnectionId(target.uid);
                const isSubmitting = submittingId === connId;

                return (
                  <div
                    key={target.uid}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={target.photoURL}
                        alt={target.displayName}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block font-extrabold text-xs text-slate-800 truncate leading-none">
                          {target.displayName}
                        </span>
                        <span className="block text-[9px] text-slate-400 font-semibold truncate mt-1">
                          {target.email}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDecline(connId)}
                      disabled={isSubmitting}
                      className="p-1.5 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-100 rounded-lg cursor-pointer transition-colors"
                      title="Cancel Request"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-center text-xs text-slate-400 font-semibold py-12">
                No outgoing requests.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
