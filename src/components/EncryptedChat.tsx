"use client";

import React, { useState, useEffect, useRef } from "react";
import { db, isSimulated } from "@/lib/firebase";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import {
  getSimUsers,
  getSimConnections,
  getSimMessages,
  saveSimMessage,
  SimMessage,
} from "@/lib/simulator";
import { E2EUser } from "@/hooks/useE2EEAuth";
import { encryptMessage, decryptMessage, EncryptedPayload } from "@/utils/crypto";

interface EncryptedChatProps {
  currentUser: E2EUser;
}

interface ChatPartner {
  uid: string;
  displayName: string;
  photoURL: string;
  publicKeyJwk: JsonWebKey;
}

interface FirestoreMessage {
  id: string;
  senderId: string;
  receiverId: string;
  encryptedPayload: string; // JSON string payload
  timestamp: any;
}

interface DecryptedMessage {
  id: string;
  senderId: string;
  receiverId: string;
  plaintext: string;
  wrappedKey: string;
  iv: string;
  ciphertext: string;
  aesKeyHex: string;
  timestampStr: string;
}

export default function EncryptedChat({ currentUser }: EncryptedChatProps) {
  const [chatPartners, setChatPartners] = useState<ChatPartner[]>([]);
  const [activePartner, setActivePartner] = useState<ChatPartner | null>(null);
  const [inputText, setInputText] = useState("");
  const [draftPayload, setDraftPayload] = useState<EncryptedPayload | null>(null);
  const [decryptedMessages, setDecryptedMessages] = useState<DecryptedMessage[]>([]);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Connection Id / Chat Id Generator
  const getChatId = (partnerUid: string) => {
    return [currentUser.uid, partnerUid].sort().join("_");
  };

  // 1. Fetch connections and build list of "ACCEPTED" partners
  useEffect(() => {
    if (isSimulated) {
      // --- SIMULATED CHAT PARTNERS ---
      const syncSimPartners = () => {
        const allConns = getSimConnections();
        const acceptedConns = allConns.filter(
          (c) =>
            (c.senderUid === currentUser.uid || c.receiverUid === currentUser.uid) &&
            c.status === "ACCEPTED"
        );
        const partnerUids = acceptedConns.map((c) =>
          c.senderUid === currentUser.uid ? c.receiverUid : c.senderUid
        );

        const allUsersList = getSimUsers();
        const list: ChatPartner[] = [];
        partnerUids.forEach((uid) => {
          const match = allUsersList.find((u) => u.uid === uid);
          if (match) {
            list.push({
              uid: match.uid,
              displayName: match.displayName,
              photoURL: match.photoURL,
              publicKeyJwk: JSON.parse(match.publicKey),
            });
          }
        });

        setChatPartners(list);
        setSidebarLoading(false);

        if (list.length > 0 && !activePartner) {
          setActivePartner(list[0]);
        }
      };

      syncSimPartners();
      window.addEventListener("kam_sim_db_update", syncSimPartners);
      return () => window.removeEventListener("kam_sim_db_update", syncSimPartners);
    }

    // --- REAL FIRESTORE CHAT PARTNERS ---
    if (!db) return;
    const connectionsRef = collection(db, "connections");
    const qSent = query(connectionsRef, where("senderUid", "==", currentUser.uid), where("status", "==", "ACCEPTED"));
    const qRecv = query(connectionsRef, where("receiverUid", "==", currentUser.uid), where("status", "==", "ACCEPTED"));

    const partnerUids = new Set<string>();

    const fetchPartnerDetails = async (uids: string[]) => {
      const list: ChatPartner[] = [];
      for (const partnerUid of uids) {
        try {
          const userDoc = await getDoc(doc(db, "users", partnerUid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            list.push({
              uid: data.uid,
              displayName: data.displayName,
              photoURL: data.photoURL,
              publicKeyJwk: JSON.parse(data.publicKey),
            });
          }
        } catch (e) {
          console.error("Error loading partner details:", partnerUid, e);
        }
      }
      setChatPartners(list);
      setSidebarLoading(false);

      if (list.length > 0 && !activePartner) {
        setActivePartner(list[0]);
      }
    };

    const syncConnections = () => {
      const uidsArray = Array.from(partnerUids);
      fetchPartnerDetails(uidsArray);
    };

    const unsubSent = onSnapshot(qSent, (snap) => {
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        partnerUids.add(data.receiverUid);
      });
      syncConnections();
    });

    const unsubRecv = onSnapshot(qRecv, (snap) => {
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        partnerUids.add(data.senderUid);
      });
      syncConnections();
    });

    return () => {
      unsubSent();
      unsubRecv();
    };
  }, [currentUser]);

  // 2. Fetch and decrypt chat messages (Real-time)
  useEffect(() => {
    if (!activePartner) {
      setDecryptedMessages([]);
      return;
    }

    const chatId = getChatId(activePartner.uid);
    const privateKeyJwkJson = localStorage.getItem(`kam_private_key_${currentUser.uid}`);
    if (!privateKeyJwkJson) return;
    const privateKeyJwk = JSON.parse(privateKeyJwkJson);

    // Decrypt processor
    const processAndDecryptMessages = async (rawMsgs: FirestoreMessage[]) => {
      const decryptedList: DecryptedMessage[] = await Promise.all(
        rawMsgs.map(async (msg) => {
          let parsedPayload = { wrappedKey: "", iv: "", ciphertext: "", aesKeyHex: "" };
          try {
            parsedPayload = JSON.parse(msg.encryptedPayload);
          } catch (e) {
            console.error("Payload parse error:", e);
          }

          let plaintext = decryptedCache[msg.id] || "";

          if (!plaintext) {
            if (msg.senderId === currentUser.uid) {
              plaintext = "Plaintext Sent";
            } else {
              try {
                plaintext = await decryptMessage(parsedPayload, privateKeyJwk);
                setDecryptedCache((prev) => ({ ...prev, [msg.id]: plaintext }));
              } catch (err) {
                console.error("Decryption error:", err);
                plaintext = "🔑 Decryption error (Keys mismatch)";
              }
            }
          }

          let time = "Just now";
          if (msg.timestamp) {
            if (typeof msg.timestamp === "string") {
              time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (msg.timestamp.toDate) {
              time = msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
          }

          return {
            id: msg.id,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            plaintext,
            wrappedKey: parsedPayload.wrappedKey,
            iv: parsedPayload.iv,
            ciphertext: parsedPayload.ciphertext,
            aesKeyHex: parsedPayload.aesKeyHex || "",
            timestampStr: time,
          };
        })
      );
      setDecryptedMessages(decryptedList);
    };

    if (isSimulated) {
      // --- SIMULATED REAL-TIME MESSAGE FETCH ---
      const loadSimMessages = () => {
        const simMsgs = getSimMessages(chatId);
        const mapped: FirestoreMessage[] = simMsgs.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          receiverId: m.receiverId,
          encryptedPayload: m.encryptedPayload,
          timestamp: m.timestamp,
        }));
        processAndDecryptMessages(mapped);
      };

      loadSimMessages();

      const handleNewSimMessage = (e: any) => {
        if (e.detail?.chatId === chatId) {
          loadSimMessages();
        }
      };

      window.addEventListener("kam_sim_new_message", handleNewSimMessage);
      window.addEventListener("kam_sim_db_update", loadSimMessages);

      return () => {
        window.removeEventListener("kam_sim_new_message", handleNewSimMessage);
        window.removeEventListener("kam_sim_db_update", loadSimMessages);
      };
    }

    // --- REAL FIRESTORE MESSAGE FETCH ---
    if (!db) return;
    const messagesQuery = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const list: FirestoreMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          encryptedPayload: data.encryptedPayload,
          timestamp: data.timestamp,
        });
      });
      processAndDecryptMessages(list);
    });

    return () => unsubscribe();
  }, [activePartner, currentUser]);

  // 3. Encrypt draft in real-time as user types (for the debugger)
  useEffect(() => {
    if (!inputText.trim() || !activePartner) {
      setDraftPayload(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const payload = await encryptMessage(inputText.trim(), activePartner.publicKeyJwk);
        setDraftPayload(payload);
      } catch (err) {
        console.error("Draft encryption error:", err);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [inputText, activePartner]);

  // 4. Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [decryptedMessages, activePartner]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activePartner) return;

    try {
      const payload = await encryptMessage(inputText.trim(), activePartner.publicKeyJwk);
      const chatId = getChatId(activePartner.uid);

      if (isSimulated) {
        // Simulated push
        saveSimMessage(chatId, {
          id: `sim-msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          senderId: currentUser.uid,
          receiverId: activePartner.uid,
          encryptedPayload: JSON.stringify(payload),
          timestamp: new Date().toISOString(),
        });
        setInputText("");
        setDraftPayload(null);
        return;
      }

      // Real Firebase push
      if (!db) return;
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.uid,
        receiverId: activePartner.uid,
        encryptedPayload: JSON.stringify(payload),
        timestamp: serverTimestamp(),
      });

      setInputText("");
      setDraftPayload(null);
    } catch (e) {
      console.error(e);
      alert("Failed to send encrypted message.");
    }
  };

  const lastMessage = decryptedMessages[decryptedMessages.length - 1];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 h-[calc(100vh-140px)] flex gap-6 pb-24 font-sans">
      {/* Sidebar - Connection List */}
      <div className="w-80 bg-card-bg border border-card-border rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-card-border">
          <h2 className="text-base font-bold text-foreground">Secure Chats</h2>
          <p className="text-xs text-muted-text mt-0.5">Approved Connections Only</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sidebarLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-text">
              Loading secure channels...
            </div>
          ) : chatPartners.length > 0 ? (
            chatPartners.map((partner) => {
              const isActive = activePartner?.uid === partner.uid;
              return (
                <button
                  key={partner.uid}
                  onClick={() => {
                    setActivePartner(partner);
                    setInputText("");
                    setDraftPayload(null);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left cursor-pointer ${
                    isActive
                      ? "bg-mint-light/40 border border-mint/20"
                      : "hover:bg-background border border-transparent"
                  }`}
                >
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={partner.photoURL}
                      alt={partner.displayName}
                      className="w-11 h-11 rounded-full object-cover border border-card-border"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-mint border-2 border-card-bg rounded-full animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground truncate">
                        {partner.displayName}
                      </span>
                      <span className="text-[9px] text-mint font-semibold uppercase tracking-wider scale-90">
                        E2EE
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-text truncate mt-0.5">
                      {isActive ? "Connected" : "🔑 Click to open chat"}
                    </p>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500">
              <svg className="w-10 h-10 text-muted-text/30 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h4 className="text-xs font-bold text-foreground">No Approved DMs</h4>
              <p className="text-[10px] text-muted-text mt-1.5 leading-relaxed">
                Connect with users in the search tab to open a private end-to-end encrypted direct messaging channel.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Pane */}
      <div className="flex-1 bg-card-bg border border-card-border rounded-2xl flex flex-col overflow-hidden relative">
        {activePartner ? (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-card-border flex items-center justify-between bg-card-bg/60 backdrop-blur-md relative z-10">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activePartner.photoURL}
                  alt={activePartner.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-card-border"
                />
                <div>
                  <h3 className="font-bold text-xs text-foreground">{activePartner.displayName}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-mint mt-0.5">
                    <svg className="w-3 h-3 fill-mint" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.9L10 1.154l7.834 3.746a1 1 0 01.616.92v5.334c0 4.88-3.21 9.48-7.834 11.026a1 1 0 01-.616 0C5.378 20.655 2.166 16.055 2.166 11.17V5.82a1 1 0 01.616-.92zM11 6a1 1 0 10-2 0v5a1 1 0 102 0V6zm-1 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span>Dynamic E2EE Channel (RSA-2048 + AES-256)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-background/30">
              {decryptedMessages.length > 0 ? (
                decryptedMessages.map((msg) => {
                  const isSelf = msg.senderId === currentUser.uid;
                  return (
                    <div key={msg.id} className={`flex ${isSelf ? "justify-end" : "justify-start"} items-end gap-2`}>
                      {!isSelf && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={activePartner.photoURL}
                          alt={activePartner.displayName}
                          className="w-7 h-7 rounded-full object-cover border border-card-border mb-1"
                        />
                      )}
                      <div className="max-w-[70%]">
                        <div
                          className={`px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-lg ${
                            isSelf
                              ? "bg-card-bg border border-mint/20 text-foreground rounded-br-none"
                              : "bg-card-border text-foreground rounded-bl-none"
                          }`}
                        >
                          <p>{msg.plaintext}</p>
                          <span className="block text-[8px] text-muted-text text-right mt-1.5 uppercase font-mono tracking-wider">
                            {isSelf ? "Encrypted Sent" : "Decrypted Recv"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-10 h-10 rounded-full bg-mint-light/20 flex items-center justify-center text-mint mb-3 animate-pulse">
                    🔑
                  </div>
                  <h4 className="text-xs font-semibold text-foreground">Secure Session Started</h4>
                  <p className="text-[10px] text-muted-text mt-1 max-w-[200px]">
                    No messages yet. Send an encrypted greeting to begin.
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Cryptographic Debugger */}
            <div className="bg-card-bg border-t border-card-border p-4 font-mono text-[10px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-mint uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-mint" />
                  Live Cryptographic Debugger
                </span>
                <span className="text-[9px] text-muted-text">Real-time Web Crypto Sandbox</span>
              </div>
              <div className="bg-[#08080a] rounded-xl p-3 border border-card-border space-y-2 max-h-[160px] overflow-y-auto text-zinc-400">
                {inputText.trim() && draftPayload ? (
                  <>
                    <div>
                      <span className="text-mint font-semibold">[Draft Cleartext]:</span>{" "}
                      <span className="text-foreground">"{inputText}"</span>
                    </div>
                    <div>
                      <span className="text-teal-400 font-semibold">[AES-256 Session Key]:</span>{" "}
                      <span className="text-zinc-500">{draftPayload.aesKeyHex}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-purple-400 font-semibold">[RSA-Wrapped AES Key]:</span>{" "}
                      <span className="text-zinc-500">{draftPayload.wrappedKey}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-orange-400 font-semibold">[Ciphertext Transmitted]:</span>{" "}
                      <span className="text-mint font-medium">{draftPayload.ciphertext}</span>
                    </div>
                  </>
                ) : lastMessage ? (
                  <>
                    <div className="text-[9px] text-muted-text border-b border-card-border/50 pb-1 mb-1">
                      Showing last event: Message {lastMessage.senderId === currentUser.uid ? "Sent" : "Received"}
                    </div>
                    <div className="truncate">
                      <span className="text-orange-400 font-semibold">[Ciphertext Payload]:</span>{" "}
                      <span className="text-zinc-500">{lastMessage.ciphertext}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-purple-400 font-semibold">[RSA-Wrapped AES Key]:</span>{" "}
                      <span className="text-zinc-500">{lastMessage.wrappedKey}</span>
                    </div>
                    <div>
                      <span className="text-teal-400 font-semibold">[Decrypted Session Key]:</span>{" "}
                      <span className="text-zinc-500">{lastMessage.aesKeyHex || "0x98f2b7... (Session Key)"}</span>
                    </div>
                    <div>
                      <span className="text-mint font-semibold">[Cleartext Output]:</span>{" "}
                      <span className="text-foreground">
                        "{lastMessage.senderId === currentUser.uid
                          ? "Message encrypted & sent to @" + activePartner.displayName
                          : lastMessage.plaintext}"
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-text/50">
                    Type a message to see the Web Crypto engine perform asymmetric wrapping and AES encryption in real-time.
                  </div>
                )}
              </div>
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-4 border-t border-card-border bg-card-bg flex items-center gap-3">
              <input
                type="text"
                placeholder={`Encrypt & send message to @${activePartner.displayName}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-background border border-card-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-mint transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-5 py-3 bg-mint hover:bg-mint-hover disabled:bg-mint/45 disabled:text-background/50 text-background font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-mint/10"
              >
                <span>Send</span>
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <p className="text-sm text-muted-text">Select an approved secure connection from the list to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
