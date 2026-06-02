import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { DBMessage, DBUser } from "@/lib/database.types";

export interface MessageWithSender extends DBMessage {
  sender: DBUser | null;
  reply_to_message: MessageWithSender | null;
}

// Simple in-memory typing state (no DB table needed)
const typingUsers = new Map<string, Map<string, { user: DBUser; expiry: number }>>();

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(false);
  const [typingList, setTypingList] = useState<DBUser[]>([]);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const buildWithSenders = async (rawMessages: DBMessage[]): Promise<MessageWithSender[]> => {
    const senderIds = [...new Set(rawMessages.map(m => m.sender_id))];
    const replyIds = rawMessages.filter(m => m.reply_to).map(m => m.reply_to as string);
    const allIds = [...new Set([...senderIds, ...replyIds])];

    const { data: users } = await supabase.from("users").select("*").in("id", allIds);
    const userMap = new Map(users?.map(u => [u.id, u]) ?? []);

    let replyMessages: DBMessage[] = [];
    if (replyIds.length > 0) {
      const { data } = await supabase.from("messages").select("*").in("id", replyIds);
      replyMessages = data ?? [];
    }
    const replyMap = new Map(replyMessages.map(m => [m.id, m]));

    return rawMessages.map(m => ({
      ...m,
      sender: userMap.get(m.sender_id) ?? null,
      reply_to_message: m.reply_to
        ? { ...(replyMap.get(m.reply_to) ?? m), sender: userMap.get(replyMap.get(m.reply_to)?.sender_id ?? "") ?? null, reply_to_message: null }
        : null,
    }));
  };

  const fetchMessages = async () => {
    if (!conversationId) return;
    setLoading(true);

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!data) { setLoading(false); return; }

    const withSenders = await buildWithSenders(data);
    setMessages(withSenders);
    setLoading(false);

    // Mark messages as read
    if (user) {
      const unread = data.filter(m => m.sender_id !== user.id && !m.read_by?.includes(user.id));
      for (const msg of unread) {
        const newReadBy = [...(msg.read_by ?? []), user.id];
        supabase.from("messages").update({ read_by: newReadBy }).eq("id", msg.id);
      }
      // Clear unread flag on conversation
      supabase.from("conversations")
        .update({ unread_by: [] })
        .eq("id", conversationId);
    }
  };

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    fetchMessages();

    // Real-time message subscription
    const msgChannel = supabase
      .channel(`msgs-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const newMsg = payload.new as DBMessage;
        const built = await buildWithSenders([newMsg]);
        setMessages(prev => [...prev, ...built]);
        // Mark as read if window is open
        if (user && newMsg.sender_id !== user.id) {
          const newReadBy = [...(newMsg.read_by ?? []), user.id];
          supabase.from("messages").update({ read_by: newReadBy }).eq("id", newMsg.id);
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as DBMessage;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
      })
      .subscribe();

    // Typing via broadcast (no DB table needed)
    const typingChannel = supabase
      .channel(`typing-bc-${conversationId}`)
      .on("broadcast", { event: "typing" }, async ({ payload }) => {
        if (!payload?.userId || payload.userId === user?.id) return;
        // Fetch user if not cached
        const { data: typingUser } = await supabase.from("users").select("*").eq("id", payload.userId).single();
        if (!typingUser) return;

        if (!typingUsers.has(conversationId)) typingUsers.set(conversationId, new Map());
        const convTyping = typingUsers.get(conversationId)!;
        convTyping.set(payload.userId, { user: typingUser, expiry: Date.now() + 4000 });
        setTypingList([...convTyping.values()].filter(t => t.expiry > Date.now()).map(t => t.user));

        setTimeout(() => {
          convTyping.delete(payload.userId);
          setTypingList([...convTyping.values()].filter(t => t.expiry > Date.now()).map(t => t.user));
        }, 4000);
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(typingChannel);
      typingUsers.delete(conversationId);
      setTypingList([]);
    };
  }, [conversationId, user]);

  const sendMessage = async (content: string, replyToId?: string) => {
    if (!conversationId || !user || !content.trim()) return;

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      reply_to: replyToId ?? null,
      read_by: [user.id],
    });

    await supabase.from("conversations").update({
      last_message: content.trim().slice(0, 100),
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", conversationId);

    stopTyping();
  };

  const deleteMessage = async (messageId: string) => {
    await supabase.from("messages").update({
      content: null,
      is_edited: true,
      updated_at: new Date().toISOString(),
    }).eq("id", messageId);
  };

  const startTyping = async () => {
    if (!conversationId || !user || !typingChannelRef.current) return;
    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id },
    });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(stopTyping, 3500);
  };

  const stopTyping = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  };

  return { messages, loading, typingUsers: typingList, sendMessage, deleteMessage, startTyping, stopTyping, refetch: fetchMessages };
}
