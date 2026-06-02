import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/lib/database.types";

type Message = Database["public"]["Tables"]["messages"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface MessageWithSender extends Message {
  sender: Profile | null;
  reply_to: MessageWithSender | null;
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Profile[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMessages = async () => {
    if (!conversationId) return;
    setLoading(true);

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!data) { setLoading(false); return; }

    const senderIds = [...new Set(data.map(m => m.sender_id))];
    const { data: profiles } = await supabase.from("profiles").select("*").in("id", senderIds);
    const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

    const replyIds = data.filter(m => m.reply_to_id).map(m => m.reply_to_id as string);
    const replyMap = new Map<string, MessageWithSender>();
    if (replyIds.length > 0) {
      const { data: replyMsgs } = await supabase.from("messages").select("*").in("id", replyIds);
      replyMsgs?.forEach(rm => {
        replyMap.set(rm.id, { ...rm, sender: profileMap.get(rm.sender_id) ?? null, reply_to: null });
      });
    }

    const withSenders: MessageWithSender[] = data.map(m => ({
      ...m,
      sender: profileMap.get(m.sender_id) ?? null,
      reply_to: m.reply_to_id ? replyMap.get(m.reply_to_id) ?? null : null,
    }));

    setMessages(withSenders);
    setLoading(false);

    if (user) {
      await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
    }
  };

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    fetchMessages();

    const msgChannel = supabase
      .channel(`messages-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const newMsg = payload.new as Message;
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", newMsg.sender_id).single();
        let reply_to: MessageWithSender | null = null;
        if (newMsg.reply_to_id) {
          const { data: replyMsg } = await supabase.from("messages").select("*").eq("id", newMsg.reply_to_id).single();
          if (replyMsg) {
            const { data: replyProfile } = await supabase.from("profiles").select("*").eq("id", replyMsg.sender_id).single();
            reply_to = { ...replyMsg, sender: replyProfile, reply_to: null };
          }
        }
        setMessages(prev => [...prev, { ...newMsg, sender: profile, reply_to }]);
        if (user && newMsg.sender_id !== user.id) {
          await supabase
            .from("conversation_participants")
            .update({ last_read_at: new Date().toISOString() })
            .eq("conversation_id", conversationId)
            .eq("user_id", user.id);
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
      })
      .subscribe();

    const typingChannel = supabase
      .channel(`typing-${conversationId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "typing_indicators",
        filter: `conversation_id=eq.${conversationId}`,
      }, async () => {
        const fiveSecsAgo = new Date(Date.now() - 5000).toISOString();
        const { data } = await supabase
          .from("typing_indicators")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", user?.id ?? "")
          .gt("updated_at", fiveSecsAgo);

        if (data?.length) {
          const { data: profiles } = await supabase.from("profiles").select("*").in("id", data.map(d => d.user_id));
          setTypingUsers(profiles ?? []);
        } else {
          setTypingUsers([]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [conversationId, user]);

  const sendMessage = async (content: string, replyToId?: string) => {
    if (!conversationId || !user || !content.trim()) return;
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      message_type: "text",
      reply_to_id: replyToId ?? null,
    });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    stopTyping();
  };

  const sendFile = async (file: File) => {
    if (!conversationId || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${conversationId}/${Date.now()}.${ext}`;
    const { data: uploaded, error } = await supabase.storage.from("chat-media").upload(path, file);
    if (error || !uploaded) return;
    const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(uploaded.path);
    const isImage = file.type.startsWith("image/");
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: null,
      message_type: isImage ? "image" : "file",
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
    });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  };

  const deleteMessage = async (messageId: string) => {
    await supabase.from("messages").update({ is_deleted: true, content: null }).eq("id", messageId);
  };

  const startTyping = async () => {
    if (!conversationId || !user) return;
    await supabase.from("typing_indicators").upsert(
      { conversation_id: conversationId, user_id: user.id, updated_at: new Date().toISOString() },
      { onConflict: "conversation_id,user_id" }
    );
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 4000);
  };

  const stopTyping = async () => {
    if (!conversationId || !user) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    await supabase.from("typing_indicators").delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
  };

  return { messages, loading, typingUsers, sendMessage, sendFile, deleteMessage, startTyping, stopTyping, refetch: fetchMessages };
}
