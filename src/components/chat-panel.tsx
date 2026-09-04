"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ConversationSummary {
  id: string;
  otherName: string;
}

export interface ContactOption {
  id: string;
  name: string;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export function ChatPanel({
  conversations,
  meId,
  role,
  newContacts,
}: {
  conversations: ConversationSummary[];
  meId: string;
  role: "STUDENT" | "FACULTY";
  newContacts?: ContactOption[];
}) {
  const supabase = createClient();
  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id ?? null);
  const [pendingContact, setPendingContact] = useState<ContactOption | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localConversations, setLocalConversations] = useState(conversations);

  useEffect(() => {
    let cancelled = false;

    if (!selectedId) {
      Promise.resolve().then(() => {
        if (!cancelled) setMessages([]);
      });
      return () => {
        cancelled = true;
      };
    }

    supabase
      .from("messages")
      .select("id, sender_id, content, created_at")
      .eq("conversation_id", selectedId)
      .order("created_at")
      .then(({ data }) => {
        if (!cancelled) setMessages(data ?? []);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function selectConversation(id: string) {
    setPendingContact(null);
    setSelectedId(id);
  }

  function selectContact(contact: ContactOption) {
    const existing = localConversations.find((c) => c.otherName === contact.name);
    if (existing) {
      selectConversation(existing.id);
      return;
    }
    setSelectedId(null);
    setPendingContact(contact);
    setMessages([]);
  }

  async function handleSend() {
    if (!input.trim()) return;
    setSending(true);
    setError(null);

    let conversationId = selectedId;

    if (!conversationId && pendingContact) {
      const insertPayload =
        role === "STUDENT"
          ? { student_id: meId, faculty_id: pendingContact.id }
          : { student_id: pendingContact.id, faculty_id: meId };

      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .insert(insertPayload)
        .select("id")
        .single();

      if (convError || !conv) {
        setError(convError?.message ?? "Could not start conversation.");
        setSending(false);
        return;
      }
      conversationId = conv.id;
      setSelectedId(conv.id);
      setLocalConversations((prev) => [...prev, { id: conv.id, otherName: pendingContact.name }]);
      setPendingContact(null);
    }

    if (!conversationId) {
      setSending(false);
      return;
    }

    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: meId, content: input.trim() })
      .select("id, sender_id, content, created_at")
      .single();

    setSending(false);
    if (msgError) {
      setError(msgError.message);
      return;
    }
    setMessages((prev) => [...prev, message]);
    setInput("");
  }

  const activeName =
    localConversations.find((c) => c.id === selectedId)?.otherName ?? pendingContact?.name;

  return (
    <div className="flex h-[32rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="w-56 shrink-0 overflow-y-auto border-r border-slate-200">
        {localConversations.map((c) => (
          <button
            key={c.id}
            onClick={() => selectConversation(c.id)}
            className={`block w-full px-4 py-3 text-left text-sm ${
              selectedId === c.id ? "bg-slate-100 font-medium" : "hover:bg-slate-50"
            }`}
          >
            {c.otherName}
          </button>
        ))}
        {newContacts && newContacts.length > 0 && (
          <div className="border-t border-slate-200 px-4 py-2 text-xs font-medium text-slate-400">
            Start a chat
          </div>
        )}
        {newContacts?.map((c) => (
          <button
            key={c.id}
            onClick={() => selectContact(c)}
            className={`block w-full px-4 py-3 text-left text-sm ${
              pendingContact?.id === c.id ? "bg-slate-100 font-medium" : "hover:bg-slate-50"
            }`}
          >
            {c.name}
          </button>
        ))}
        {localConversations.length === 0 && (!newContacts || newContacts.length === 0) && (
          <p className="p-4 text-sm text-slate-400">No conversations yet.</p>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        {activeName ? (
          <>
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
              {activeName}
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    m.sender_id === meId
                      ? "ml-auto bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-sm text-slate-400">No messages yet — say hello.</p>
              )}
            </div>
            {error && <p className="px-4 text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 border-t border-slate-200 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={sending}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Select a conversation to start chatting.
          </div>
        )}
      </div>
    </div>
  );
}
