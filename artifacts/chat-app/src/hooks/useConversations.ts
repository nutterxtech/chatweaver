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

    const detailed: ConversationWithDetails[] = convs.map(conv => {
      const otherIds = conv.participants.filter(id => id !== user.id);
      const other_user = otherIds.length === 1 ? (userMap.get(otherIds[0]) ?? null) : null;
      const participants_data = conv.participants.map(id => userMap.get(id)).filter(Boolean) as DBUser[];
      // Use conversations.unread_by[] — avoids per-message RLS issues
      const unread_count = conv.unread_by?.includes(user.id) ? 1 : 0;
      return { ...conv, other_user, participants_data, unread_count };
    });

    setConversations(detailed.filter(c => !c.is_admin_chat));
    setLoading(false);
  };

  // Instantly zero the badge in local state + clear unread_by in DB
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
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { conversations, loading, refetch: fetchConversations, markConversationRead };
}
