import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { DBUser, DBConversation } from "@/lib/database.types";

export interface ConversationWithDetails extends DBConversation {
  other_user: DBUser | null;
  participants_data: DBUser[];
  unread_count: number;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) return;

    const { data: convs, error } = await supabase
      .from("conversations")
      .select("*")
      .contains("participants", [user.id])
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error || !convs) { setLoading(false); return; }

    const allIds = [...new Set(convs.flatMap(c => c.participants))];
    const { data: users } = await supabase.from("users").select("*").in("id", allIds);
    const userMap = new Map(users?.map(u => [u.id, u]) ?? []);

    // Count unread messages: sent by others, not yet read by me
    const convIds = convs.map(c => c.id);
    const unreadMap = new Map<string, number>();
    if (convIds.length > 0) {
      const { data: unreadRows } = await supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", convIds)
        .neq("sender_id", user.id)
        .not("read_by", "cs", `{${user.id}}`);

      for (const row of unreadRows ?? []) {
        unreadMap.set(row.conversation_id, (unreadMap.get(row.conversation_id) ?? 0) + 1);
      }
    }

    const detailed: ConversationWithDetails[] = convs.map(conv => {
      const otherIds = conv.participants.filter(id => id !== user.id);
      const other_user = otherIds.length === 1 ? (userMap.get(otherIds[0]) ?? null) : null;
      const participants_data = conv.participants.map(id => userMap.get(id)).filter(Boolean) as DBUser[];
      const unread_count = unreadMap.get(conv.id) ?? 0;
      return { ...conv, other_user, participants_data, unread_count };
    });

    setConversations(detailed.filter(c => !c.is_admin_chat));
    setLoading(false);
  };

  // Instantly clear badge in local state; also clear unread_by in DB
  const markConversationRead = async (conversationId: string) => {
    setConversations(prev =>
      prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
    );
    if (user) {
      await supabase
        .from("conversations")
        .update({ unread_by: [] })
        .eq("id", conversationId);
    }
  };

  useEffect(() => {
    fetchConversations();

    const channelName = `convs-${user?.id}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => fetchConversations())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchConversations())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { conversations, loading, refetch: fetchConversations, markConversationRead };
}
