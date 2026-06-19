"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, isSimulated } from "@/lib/firebase";
import { ShieldCheck, MessageCircle, Send, ArrowLeft, ShieldAlert } from "lucide-react";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  getSimUsers,
  getSimConnections,
  getSimMessages,
  saveSimMessage,
} from "@/lib/simulator";
import { encryptMessage, decryptMessage, EncryptedPayload } from "@/utils/crypto";

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
  encryptedPayload: string; // JSON string
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

export default function EncryptedChat() {
  const { user } = useAuth();
  const [chatPartners, setChatPartners] = useState<ChatPartner[]>([]);
  const [activePartner, setActivePartner] = useState<ChatPartner | null>(null);
  const [inputText, setInputText] = useState("");
  const [draftPayload, setDraftPayload] = useState<EncryptedPayload | null>(null);
  const [decryptedMessages, setDecryptedMessages] = useState<DecryptedMessage[]>([]);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getChatId = (partnerUid: string) => {
    if (!user) return "";
    return [user.uid, partnerUid].sort().join("_");
  };

  // 1. Fetch connection list where status is ACCEPTED
  useEffect(() => {
    if (!user) return;

    if (isSimulated) {
      const syncSimPartners = () => {
        const allConns = getSimConnections();
        const acceptedConns = allConns.filter(
          (c) =>
            (c.senderUid === user.uid || c.receiverUid === user.uid) &&
            c.status === "ACCEPTED"
        );
        const partnerUids = acceptedConns.map((c) =>
          c.senderUid === user.uid ? c.receiverUid : c.senderUid
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

    // Real Firestore accepted partners query
    if (!db) return;
    const connectionsRef = collection(db, "connections");
    const qSent = query(connectionsRef, where("senderUid", "==", user.uid), where("status", "==", "ACCEPTED"));
    const qRecv = query(connectionsRef, where("receiverUid", "==", user.uid), where("status", "==", "ACCEPTED"));

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
        partnerUids.add(docSnap.data().receiverUid);
      });
      syncConnections();
    });

    const unsubRecv = onSnapshot(qRecv, (snap) => {
      snap.forEach((docSnap) => {
        partnerUids.add(docSnap.data().senderUid);
      });
      syncConnections();
    });

    return () => {
      unsubSent();
      unsubRecv();
    };
  }, [user]);

  // 2. Fetch and decrypt chat thread messages
  useEffect(() => {
    if (!user || !activePartner) {
      setDecryptedMessages([]);
      return;
    }

    const chatId = getChatId(activePartner.uid);
    const privateKeyJwkJson = localStorage.getItem(`kam_private_key_${user.uid}`);
    if (!privateKeyJwkJson) return;
    const privateKeyJwk = JSON.parse(privateKeyJwkJson);

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
            if (msg.senderId === user.uid) {
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
              time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            } else if (msg.timestamp.toDate) {
              time = msg.timestamp.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
  }, [activePartner, user]);

  // 3. Encrypt message in real-time as user types
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
    if (!inputText.trim() || !activePartner || !user) return;

    try {
      const payload = await encryptMessage(inputText.trim(), activePartner.publicKeyJwk);
      const chatId = getChatId(activePartner.uid);

      if (isSimulated) {
        saveSimMessage(chatId, {
          id: `sim-msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          senderId: user.uid,
          receiverId: activePartner.uid,
          encryptedPayload: JSON.stringify(payload),
          timestamp: new Date().toISOString(),
        });
        setInputText("");
        setDraftPayload(null);
        return;
      }

      if (!db) return;
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: user.uid,
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

  if (!user) return null;

  const lastMessage = decryptedMessages[decryptedMessages.length - 1];

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen bg-white font-sans overflow-hidden">
      {/* LEFT PANEL: 1/3 Width Chat List */}
      <section
        className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col flex-shrink-0 bg-white
          ${mobileView === "chat" ? "hidden md:flex" : "flex"}`}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">Direct Messages</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              E2EE Secure Active
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
          {sidebarLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold">
              Loading secure connections...
            </div>
          ) : chatPartners.length > 0 ? (
            chatPartners.map((partner) => {
              const isActive = activePartner?.uid === partner.uid;
              const partnerMessages = decryptedMessages.filter(
                (m) =>
                  (m.senderId === user.uid && m.receiverId === partner.uid) ||
                  (m.senderId === partner.uid && m.receiverId === user.uid)
              );
              const lastMsg = partnerMessages[partnerMessages.length - 1];
              
              let lastMsgSnippet = "Tap to open chat";
              if (lastMsg) {
                lastMsgSnippet = lastMsg.senderId === user.uid ? `You: ${lastMsg.plaintext}` : lastMsg.plaintext;
              }

              return (
                <button
                  key={partner.uid}
                  onClick={() => {
                    setActivePartner(partner);
                    setInputText("");
                    setDraftPayload(null);
                    setMobileView("chat");
                  }}
                  className={`w-full flex items-center gap-3.5 p-3 rounded-xl transition-all duration-200 text-left cursor-pointer
                    ${isActive
                      ? "bg-slate-50 border border-slate-100"
                      : "hover:bg-slate-50/50 border border-transparent"
                    }`}
                >
                  <div className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={partner.photoURL}
                      alt={partner.displayName}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-800 truncate block">
                        {partner.displayName}
                      </span>
                      <span className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded-md scale-90">
                        Secure
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5 max-w-[170px]">
                      {lastMsgSnippet}
                    </p>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <ShieldAlert className="w-9 h-9 text-slate-300 mb-2" />
              <h4 className="text-xs font-bold text-slate-800">No Approved Chats</h4>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed max-w-[200px] mx-auto">
                Discover contacts in the search tab to establish an approved end-to-end encrypted messaging channel.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* RIGHT PANEL: 2/3 Width Chat Panel */}
      <section
        className={`flex-1 flex flex-col h-full bg-slate-50/30
          ${mobileView === "list" ? "hidden md:flex" : "flex"}`}
      >
        {activePartner ? (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3 bg-white">
              <button
                onClick={() => setMobileView("list")}
                className="md:hidden text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors mr-1 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePartner.photoURL}
                alt={activePartner.displayName}
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
              />
              <div>
                <h3 className="font-extrabold text-xs text-slate-800 leading-tight">
                  {activePartner.displayName}
                </h3>
                <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5 select-none">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  E2EE Channel (RSA-2048 + AES-GCM)
                </p>
              </div>
            </div>

            {/* Chat History Thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
              {decryptedMessages.length > 0 ? (
                decryptedMessages.map((msg) => {
                  const isSelf = msg.senderId === user.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSelf ? "justify-end" : "justify-start"} items-end gap-2`}
                    >
                      {!isSelf && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={activePartner.photoURL}
                          alt={activePartner.displayName}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 mb-1"
                        />
                      )}
                      <div className="max-w-[70%]">
                        <div
                          className={`px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm border
                            ${isSelf
                              ? "bg-emerald-500 border-emerald-600/10 text-white rounded-br-none"
                              : "bg-white border-slate-200/60 text-slate-800 rounded-bl-none"
                            }`}
                        >
                          <p className="font-medium whitespace-pre-wrap">{msg.plaintext}</p>
                          <span className={`block text-[8px] text-right mt-1.5 uppercase font-mono tracking-wider font-bold
                            ${isSelf ? "text-emerald-100" : "text-slate-400"}`}
                          >
                            {isSelf ? "Encrypted Sent" : "Decrypted Recv"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white border border-slate-100 rounded-2xl max-w-sm mx-auto my-auto shadow-sm">
                  <ShieldCheck className="w-10 h-10 text-emerald-500 fill-emerald-500/10 mb-3" />
                  <h4 className="text-xs font-bold text-slate-800">Secure Vault Session Open</h4>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed max-w-[200px] font-semibold">
                    Send a private message to establish secure communication.
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Cryptographic Visualization Debugger Box */}
            <div className="bg-white border-t border-slate-200 p-4 font-mono text-[10px] select-none">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Cryptographic Debugger
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">Web Crypto API Sandbox</span>
              </div>
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2 max-h-[140px] overflow-y-auto text-slate-400">
                {inputText.trim() && draftPayload ? (
                  <>
                    <div className="flex gap-2">
                      <span className="text-emerald-400 font-bold flex-shrink-0">[Cleartext Input]:</span>
                      <span className="text-white">"{inputText}"</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-teal-400 font-bold flex-shrink-0">[AES Session Key]:</span>
                      <span className="text-slate-500 break-all">{draftPayload.aesKeyHex}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-purple-400 font-bold flex-shrink-0">[RSA-Wrapped AES Key]:</span>
                      <span className="text-slate-500 break-all">{draftPayload.wrappedKey}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-orange-400 font-bold flex-shrink-0">[Ciphertext Transmitted]:</span>
                      <span className="text-emerald-500 break-all font-medium">{draftPayload.ciphertext}</span>
                    </div>
                  </>
                ) : lastMessage ? (
                  <>
                    <div className="text-[9px] text-slate-500 border-b border-slate-800 pb-1 mb-1 font-semibold">
                      Last Action: Message {lastMessage.senderId === user.uid ? "Encrypted & Sent" : "Received & Decrypted"}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-orange-400 font-bold flex-shrink-0">[Ciphertext Payload]:</span>
                      <span className="text-slate-500 break-all">{lastMessage.ciphertext}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-purple-400 font-bold flex-shrink-0">[RSA-Wrapped AES Key]:</span>
                      <span className="text-slate-500 break-all">{lastMessage.wrappedKey}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-teal-400 font-bold flex-shrink-0">[Decrypted AES Key]:</span>
                      <span className="text-slate-500 break-all">{lastMessage.aesKeyHex || "0x98f2b7... (Session Key)"}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-emerald-400 font-bold flex-shrink-0">[Decrypted Output]:</span>
                      <span className="text-white">
                        "{lastMessage.senderId === user.uid
                          ? "Message encrypted & sent to @" + activePartner.displayName
                          : lastMessage.plaintext}"
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-slate-500 font-semibold">
                    Type a message to trace the SubtleCrypto engine perform asymmetric envelope wrapping in real-time.
                  </div>
                )}
              </div>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSend}
              className="p-4 border-t border-slate-200 bg-white flex items-center gap-3"
            >
              <input
                type="text"
                placeholder={`Type secure message to @${activePartner.displayName}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 active:scale-[0.98]"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/10">
            <MessageCircle className="w-12 h-12 text-slate-300 mb-2 animate-bounce" />
            <h3 className="font-extrabold text-sm text-slate-800">Your Secure Messenger</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px] font-semibold">
              Select a contact from the panel to open a dynamic E2EE chat tunnel.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
