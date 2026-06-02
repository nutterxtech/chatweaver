import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Message = Database["public"]["Tables"]["messages"]["Row"];

export interface ConversationWithDetails {
  id: string;
  is_group: boolean;
  group_name: string | null;
  group_avatar_url: string | null;
  created_at: string;
  updated_at: string;
  other_user: Profile | null;
  last_message: Message | null;
  unread_count: number;
  participants: Profile[];
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) return;

    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!participations?.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = participations.map(p => p.conversation_id);

    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .in("id", convIds)
      .order("updated_at", { ascending: false });

    if (!convs) { setLoading(false); return; }

    const detailed: ConversationWithDetails[] = await Promise.all(
      convs.map(async (conv) => {
        const { data: parts } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conv.id);

        const participantIds = parts?.map(p => p.user_id) ?? [];
        const otherIds = participantIds.filter(id => id !== user.id);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", participantIds);

        const otherUser = profiles?.find(p => p.id !== user.id) ?? null;

        const { data: lastMsgs } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastMessage = lastMsgs?.[0] ?? null;

        const { data: myPart } = await supabase
          .from("conversation_participants")
          .select("last_read_at")
          .eq("conversation_id", conv.id)
          .eq("user_id", user.id)
          .single();

        let unread_count = 0;
        if (myPart?.last_read_at) {
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_id", user.id)
            .eq("is_deleted", false)
            .gt("created_at", myPart.last_read_at);
          unread_count = count ?? 0;
        } else {
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_id", user.id)
            .eq("is_deleted", false);
          unread_count = count ?? 0;
        }

        return {
          ...conv,
          other_user: otherUser,
          last_message: lastMessage,
          unread_count,
          participants: profiles ?? [],
        };
      })
    );

    setConversations(detailed.sort((a, b) => {
      const aTime = a.last_message?.created_at ?? a.updated_at;
      const bTime = b.last_message?.created_at ?? b.updated_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    }));
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel("conversations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchConversations();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { conversations, loading, refetch: fetchConversations };
}
