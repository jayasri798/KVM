"use client";

import React, { useState } from "react";
import { Clock, Trash2, UserCheck } from "lucide-react";

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
  updatedAt?: any;
  timestamp?: any;
}

interface PendingRequestsProps {
  user: { uid: string };
  connections: Record<string, Connection>;
  allUsers: SearchUser[];
  onAccept: (connId: string) => Promise<void>;
  onDecline: (connId: string) => Promise<void>;
  submittingId: string | null;
  getConnectionId: (partnerUid: string) => string;
}

export default function PendingRequests({
  user,
  connections,
  allUsers,
  onAccept,
  onDecline,
  submittingId,
  getConnectionId,
}: PendingRequestsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"incoming" | "outgoing">("incoming");

  // Filter incoming pending requests
  const listIncoming = allUsers.filter((u) => {
    const conn = connections[getConnectionId(u.uid)];
    return conn && conn.status === "PENDING" && conn.receiverUid === user.uid;
  });

  // Filter outgoing pending requests
  const listOutgoing = allUsers.filter((u) => {
    const conn = connections[getConnectionId(u.uid)];
    return conn && conn.status === "PENDING" && conn.senderUid === user.uid;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-[420px] shadow-sm font-sans">
      {/* Header Tabs */}
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
                      onClick={() => onAccept(connId)}
                      disabled={isSubmitting}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => onDecline(connId)}
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
                    <span className="block text-[9px] text-slate-400 font-semibold truncate mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Requested
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onDecline(connId)}
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
  );
}
