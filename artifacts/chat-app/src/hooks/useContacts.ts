import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { DBUser } from "@/lib/database.types";

export function useContacts() {
  const { user, dbUser, refreshUser } = useAuth();
  const [contacts, setContacts] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    if (!dbUser) { setLoading(false); return; }
    if (!dbUser.friends?.length) { setContacts([]); setLoading(false); return; }

    const { data } = await supabase.from("users").select("*").in("id", dbUser.friends);
    setContacts(data ?? []);
    setLoading(false);
  };

  // Search ALL platform users — empty query returns all (up to 60), otherwise filters
  const searchUsers = async (query: string): Promise<DBUser[]> => {
    const q = query.trim();
    let req = supabase
      .from("users")
      .select("*")
      .neq("id", user?.id ?? "")
      .limit(60);

    if (q.length >= 2) {
      req = req.or(`name.ilike.%${q}%,phone.ilike.%${q}%,username.ilike.%${q}%,email.ilike.%${q}%`);
    }

    const { data } = await req.order("name", { ascending: true });
    return data ?? [];
  };

  const addContact = async (userId: string): Promise<{ error?: string; user?: DBUser }> => {
    if (!user || !dbUser) return { error: "Not authenticated" };
    if (userId === user.id) return { error: "Cannot add yourself" };
    if (dbUser.friends?.includes(userId)) return { error: "Already in contacts" };

    const { data: found } = await supabase.from("users").select("*").eq("id", userId).single();
    if (!found) return { error: "User not found" };

    const newFriends = [...(dbUser.friends ?? []), userId];
    const { error } = await supabase.from("users").update({ friends: newFriends }).eq("id", user.id);
    if (error) return { error: "Failed to add contact" };

    await refreshUser();
    await fetchContacts();
    return { user: found };
  };

  const startConversation = async (contactId: string): Promise<string | null> => {
    if (!user) return null;

    const { data: existing } = await supabase
      .from("conversations")
      .select("id, participants")
      .contains("participants", [user.id])
      .eq("is_group", false);

    if (existing) {
      const dm = existing.find(c =>
        c.participants.length === 2 && c.participants.includes(contactId)
      );
      if (dm) return dm.id;
    }

    const now = new Date().toISOString();
    const { data: conv } = await supabase
      .from("conversations")
      .insert({ participants: [user.id, contactId], is_group: false, last_message_at: now, updated_at: now })
      .select()
      .single();

    return conv?.id ?? null;
  };

  useEffect(() => {
    fetchContacts();
  }, [dbUser]);

  return { contacts, loading, addContact, searchUsers, startConversation, refetch: fetchContacts };
}
