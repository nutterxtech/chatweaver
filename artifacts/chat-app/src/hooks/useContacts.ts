import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface ContactWithProfile {
  id: string;
  contact_id: string;
  nickname: string | null;
  profile: Profile;
}

export function useContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    if (!user) return;
    const { data } = await supabase.from("contacts").select("*").eq("user_id", user.id);
    if (!data?.length) { setContacts([]); setLoading(false); return; }

    const ids = data.map(c => c.contact_id);
    const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
    const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

    const withProfiles: ContactWithProfile[] = data
      .filter(c => profileMap.has(c.contact_id))
      .map(c => ({ ...c, profile: profileMap.get(c.contact_id)! }));

    setContacts(withProfiles);
    setLoading(false);
  };

  const addContact = async (phoneOrEmail: string) => {
    if (!user) return { error: "Not authenticated" };

    const isEmail = phoneOrEmail.includes("@");
    const { data: found } = await supabase
      .from("profiles")
      .select("*")
      .eq(isEmail ? "email" : "phone", phoneOrEmail)
      .single();

    if (!found) return { error: "User not found" };
    if (found.id === user.id) return { error: "Cannot add yourself" };

    const { error } = await supabase.from("contacts").insert({ user_id: user.id, contact_id: found.id });
    if (error) return { error: "Contact already added or error occurred" };

    await fetchContacts();
    return { profile: found };
  };

  const startConversation = async (contactId: string): Promise<string | null> => {
    if (!user) return null;

    const { data: myParts } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myParts?.length) {
      const myConvIds = myParts.map(p => p.conversation_id);
      const { data: theirParts } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", contactId)
        .in("conversation_id", myConvIds);

      if (theirParts?.length) {
        for (const part of theirParts) {
          const { data: conv } = await supabase
            .from("conversations")
            .select("*")
            .eq("id", part.conversation_id)
            .eq("is_group", false)
            .single();
          if (conv) return conv.id;
        }
      }
    }

    const { data: conv } = await supabase
      .from("conversations")
      .insert({ created_by: user.id, is_group: false })
      .select()
      .single();

    if (!conv) return null;

    await supabase.from("conversation_participants").insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: contactId },
    ]);

    return conv.id;
  };

  useEffect(() => {
    fetchContacts();
  }, [user]);

  return { contacts, loading, addContact, startConversation, refetch: fetchContacts };
}
