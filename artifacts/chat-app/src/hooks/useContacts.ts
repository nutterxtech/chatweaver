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

  const addContact = async (phoneOrEmail: string): Promise<{ error?: string; user?: DBUser }> => {
    if (!user || !dbUser) return { error: "Not authenticated" };

    const isEmail = phoneOrEmail.includes("@");
    const { data: found } = await supabase
      .from("users")
      .select("*")
      .eq(isEmail ? "email" : "phone", phoneOrEmail.trim())
      .single();

    if (!found) return { error: "User not found" };
    if (found.id === user.id) return { error: "Cannot add yourself" };
    if (dbUser.friends?.includes(found.id)) return { error: "Already in contacts" };

    const newFriends = [...(dbUser.friends ?? []), found.id];
    const { error } = await supabase.from("users").update({ friends: newFriends }).eq("id", user.id);
    if (error) return { error: "Failed to add contact" };

    await refreshUser();
    await fetchContacts();
    return { user: found };
  };

  const startConversation = async (contactId: string): Promise<string | null> => {
    if (!user) return null;

    // Check for existing DM conversation
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

    // Create new conversation
    const { data: conv } = await supabase
      .from("conversations")
      .insert({ participants: [user.id, contactId], is_group: false })
      .select()
      .single();

    return conv?.id ?? null;
  };

  useEffect(() => {
    fetchContacts();
  }, [dbUser]);

  return { contacts, loading, addContact, startConversation, refetch: fetchContacts };
}
