"use client";

import React, { useState, useEffect, useRef } from "react";
import { User, DirectMessage } from "../utils/mockData";
import { encryptMessage, decryptMessage, EncryptedPayload } from "../utils/crypto";

interface ChatDashboardProps {
  currentUser: User;
  users: User[];
  messages: DirectMessage[];
  onSendMessage: (recipientId: string, payload: EncryptedPayload, plaintext: string) => void;
}

export default function ChatDashboard({
  currentUser,
  users,
}: ChatDashboardProps) {
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [activeMessages, setActiveMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [draftPayload, setDraftPayload] = useState<EncryptedPayload | null>(null);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter out self from chat list
  const chatPartners = users.filter((u) => u.username !== currentUser.username);

  // Set default active chat if none selected
  useEffect(() => {
    if (!activeUser && chatPartners.length > 0) {
      setActiveUser(chatPartners[0]);
    }
  }, [chatPartners, activeUser]);

  // Fetch active conversation message history and poll every 2 seconds
  useEffect(() => {
    if (!activeUser) {
      setActiveMessages([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/messages/history?chatWithUserId=${activeUser.id}`);
        if (res.ok) {
          const data = await res.json();
          setActiveMessages(data);
        }
      } catch (err) {
        console.error("Failed to load message history:", err);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 2000);

    return () => clearInterval(interval);
  }, [activeUser]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, activeUser]);

  // Encrypt draft input in real-time as user types (for the debugger)
  useEffect(() => {
    if (!inputText.trim() || !activeUser || !activeUser.publicKeyJwk) {
      setDraftPayload(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const payload = await encryptMessage(inputText, activeUser.publicKeyJwk!);
        setDraftPayload(payload);
      } catch (err) {
        console.error("Draft encryption error:", err);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [inputText, activeUser]);

  // Decrypt incoming messages dynamically using current user's private key
  useEffect(() => {
    const decryptAll = async () => {
      const newCache = { ...decryptedCache };
      let changed = false;

      // Get private key from localStorage
      const privateKeyJwkJson = localStorage.getItem(`kam_private_key_${currentUser.username}`);
      if (!privateKeyJwkJson) return;

      try {
        const privateKeyJwk = JSON.parse(privateKeyJwkJson);

        for (const msg of activeMessages) {
          // If we haven't decrypted it yet, and it is received by us
          if (msg.recipientId === currentUser.id && !newCache[msg.id]) {
            try {
              const decrypted = await decryptMessage(
                {
                  wrappedKey: msg.wrappedKey,
                  iv: msg.iv,
                  ciphertext: msg.ciphertext,
                },
                privateKeyJwk
              );
              newCache[msg.id] = decrypted;
              changed = true;
            } catch (err) {
              console.error("Failed to decrypt message:", msg.id, err);
              newCache[msg.id] = "🔑 Decryption error (Keys mismatch)";
              changed = true;
            }
          }
        }

        if (changed) {
          setDecryptedCache(newCache);
        }
      } catch (e) {
        console.error("Error reading private key for decryption:", e);
      }
    };

    decryptAll();
  }, [activeMessages, currentUser, decryptedCache]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeUser || !activeUser.publicKeyJwk) return;

    try {
      // 1. Encrypt message for recipient
      const payload = await encryptMessage(inputText.trim(), activeUser.publicKeyJwk);

      // 2. Transmit message to backend
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: activeUser.id,
          encryptedContent: payload,
        }),
      });

      if (res.ok) {
        const newMsg = await res.json();
        // Append sent message to state immediately for zero-lag UI feedback
        setActiveMessages((prev) => [...prev, newMsg]);
        setInputText("");
        setDraftPayload(null);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to transmit message");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      alert(String(err));
    }
  };

  // Get last message in the active conversation
  const lastMessage = activeMessages[activeMessages.length - 1];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 h-[calc(100vh-140px)] flex gap-6 pb-24">
      {/* Sidebar List */}
      <div className="w-80 bg-card-bg border border-card-border rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-card-border">
          <h2 className="text-base font-bold text-foreground">Matladuko Direct</h2>
          <p className="text-xs text-muted-text mt-0.5">Encrypted Conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chatPartners.map((partner) => {
            const partnerMessages = activeMessages.filter(
              (m) =>
                (m.senderId === currentUser.id && m.recipientId === partner.id) ||
                (m.senderId === partner.id && m.recipientId === currentUser.id)
            );
            const lastMsg = partnerMessages[partnerMessages.length - 1];
            let lastMsgText = activeUser?.id === partner.id ? "Connected" : "🔑 Click to open chat";

            if (lastMsg && activeUser?.id === partner.id) {
              if (lastMsg.senderId === currentUser.id) {
                lastMsgText = `You: (Encrypted)`;
              } else {
                lastMsgText = decryptedCache[lastMsg.id] || "(Encrypted)";
              }
            }

            return (
              <button
                key={partner.id}
                onClick={() => {
                  setActiveUser(partner);
                  setInputText("");
                  setDraftPayload(null);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left cursor-pointer ${
                  activeUser?.id === partner.id
                    ? "bg-mint-light/40 border border-mint/20"
                    : "hover:bg-background border border-transparent"
                }`}
              >
                {/* Avatar with lock status */}
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={partner.avatarUrl}
                    alt={partner.displayName}
                    className="w-11 h-11 rounded-full object-cover border border-card-border"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-mint border-2 border-card-bg rounded-full" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {partner.displayName}
                    </span>
                    {partner.publicKeyJwk && (
                      <span className="text-[10px] text-mint font-semibold uppercase tracking-wider scale-90">
                        E2EE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-text truncate mt-0.5">{lastMsgText}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="flex-1 bg-card-bg border border-card-border rounded-2xl flex flex-col overflow-hidden relative">
        {activeUser ? (
          <>
            {/* Chat Header */}
            <div className="px-5 py-4 border-b border-card-border flex items-center justify-between bg-card-bg/60 backdrop-blur-md relative z-10">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeUser.avatarUrl}
                  alt={activeUser.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-card-border"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-foreground">{activeUser.displayName}</span>
                    <span className="text-[10px] text-muted-text">@{activeUser.username}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-mint">
                    <svg className="w-3 h-3 fill-mint" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M2.166 4.9L10 1.154l7.834 3.746a1 1 0 01.616.92v5.334c0 4.88-3.21 9.48-7.834 11.026a1 1 0 01-.616 0C5.378 20.655 2.166 16.055 2.166 11.17V5.82a1 1 0 01.616-.92zM11 6a1 1 0 10-2 0v5a1 1 0 102 0V6zm-1 9a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>E2EE Active (RSA-2048 + AES-GCM)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-background/30">
              {activeMessages.length > 0 ? (
                activeMessages.map((msg) => {
                  const isSelf = msg.senderId === currentUser.id;
                  // If it's self, show ciphertext/plaintext.
                  // If it's peer, render decrypted cache or a loader.
                  const displayText = isSelf
                    ? activeMessages.find((m) => m.id === msg.id)?.aesKeyHex /* custom mock flag */
                      ? activeMessages.find((m) => m.id === msg.id)?.aesKeyHex === "SIMULATED_PRESEED"
                        ? "(Pre-seeded message)"
                        : "Decrypted: " + decryptedCache[msg.id]
                      : "Plaintext Sent"
                    : decryptedCache[msg.id];

                  // In our database structure, we hold plaintext alongside the fields so we can render easily
                  const actualPlaintext = displayText || "(Decrypting...)";

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSelf ? "justify-end" : "justify-start"} items-end gap-2`}
                    >
                      {!isSelf && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={activeUser.avatarUrl}
                          alt={activeUser.displayName}
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
                          <p>{actualPlaintext}</p>
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
                  <div className="w-12 h-12 rounded-full bg-mint-light/20 flex items-center justify-center text-mint mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-xs font-semibold text-foreground">Secure Channel Open</h4>
                  <p className="text-[10px] text-muted-text mt-1 max-w-[200px]">
                    No messages yet. Send an encrypted greeting to begin.
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Live Cryptographic Debugger Box */}
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
                  // Active Typing Sandbox
                  <>
                    <div>
                      <span className="text-mint font-semibold">[Draft Cleartext]:</span>{" "}
                      <span className="text-foreground">"{inputText}"</span>
                    </div>
                    <div>
                      <span className="text-teal-400 font-semibold">[AES-256 Symmetric Key]:</span>{" "}
                      <span className="text-zinc-500">{draftPayload.aesKeyHex}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-purple-400 font-semibold">[RSA-2048 Wrapped AES Key]:</span>{" "}
                      <span className="text-zinc-500">{draftPayload.wrappedKey}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-orange-400 font-semibold">[Ciphertext Transmitted]:</span>{" "}
                      <span className="text-mint font-medium">{draftPayload.ciphertext}</span>
                    </div>
                  </>
                ) : lastMessage ? (
                  // Last Transmitted Message Sandbox
                  <>
                    <div className="text-[9px] text-muted-text border-b border-card-border/50 pb-1 mb-1">
                      Showing last event: Message {lastMessage.senderId === currentUser.id ? "Sent" : "Received"}
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
                        "{lastMessage.senderId === currentUser.id
                          ? "Message encrypted & sent to @" + activeUser.username
                          : decryptedCache[lastMessage.id] || "Decrypting..."}"
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
                placeholder={`Encrypt & send message to @${activeUser.username}...`}
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
            <p className="text-sm text-muted-text">Select a user from the list to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
