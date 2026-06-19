"use client";

import { User as MockUser, INITIAL_POSTS, INITIAL_USERS } from "@/utils/mockData";

export interface SimUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  publicKey: string; // JWK JSON string
}

export interface SimConnection {
  id: string;
  senderUid: string;
  receiverUid: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  updatedAt: string;
}

export interface SimMessage {
  id: string;
  senderId: string;
  receiverId: string;
  encryptedPayload: string; // Serialized envelope
  timestamp: string;
}

// Check if Firebase config is simulated
export function isFirebaseSimulated(): boolean {
  if (typeof window === "undefined") return true;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  return !apiKey || apiKey.startsWith("mock") || apiKey === "";
}

// 1. Users Simulated Database
export function getSimUsers(): SimUser[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("kam_sim_users");
  if (!stored) {
    // Seed database on first run
    const seed = INITIAL_USERS.map((u) => ({
      uid: u.id,
      displayName: u.displayName,
      email: `${u.username}@kam.secure`,
      photoURL: u.avatarUrl,
      // Default RSA-OAEP public key placeholder
      publicKey: JSON.stringify({
        kty: "RSA",
        n: "u1W...mock-n-string",
        e: "AQAB",
        alg: "RSA-OAEP-256",
        ext: true,
      }),
    }));
    localStorage.setItem("kam_sim_users", JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(stored);
}

export function saveSimUser(user: SimUser) {
  const users = getSimUsers();
  const filtered = users.filter((u) => u.uid !== user.uid);
  filtered.push(user);
  localStorage.setItem("kam_sim_users", JSON.stringify(filtered));
  window.dispatchEvent(new Event("kam_sim_db_update"));
}

// 2. Connections Simulated Database
export function getSimConnections(): SimConnection[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("kam_sim_connections");
  return stored ? JSON.parse(stored) : [];
}

export function saveSimConnection(conn: SimConnection) {
  const conns = getSimConnections();
  const filtered = conns.filter((c) => c.id !== conn.id);
  filtered.push(conn);
  localStorage.setItem("kam_sim_connections", JSON.stringify(filtered));
  window.dispatchEvent(new Event("kam_sim_db_update"));
}

export function deleteSimConnection(connId: string) {
  const conns = getSimConnections();
  const filtered = conns.filter((c) => c.id !== connId);
  localStorage.setItem("kam_sim_connections", JSON.stringify(filtered));
  window.dispatchEvent(new Event("kam_sim_db_update"));
}

// 3. Messages Simulated Database
export function getSimMessages(chatId: string): SimMessage[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(`kam_sim_messages_${chatId}`);
  return stored ? JSON.parse(stored) : [];
}

export function saveSimMessage(chatId: string, msg: SimMessage) {
  const msgs = getSimMessages(chatId);
  msgs.push(msg);
  localStorage.setItem(`kam_sim_messages_${chatId}`, JSON.stringify(msgs));
  // Broadcast custom event so other components know a new message was written
  window.dispatchEvent(new CustomEvent("kam_sim_new_message", { detail: { chatId } }));
}
