import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { DBUser } from "@/lib/database.types";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  dbUser: DBUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  deleteAccount: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDbUser = async (userId: string) => {
    const { data } = await supabase.from("users").select("*").eq("id", userId).single();
    setDbUser(data ?? null);
    return data ?? null;
  };

  const refreshUser = async () => {
    if (user) await fetchDbUser(user.id);
  };

  useEffect(() => {
    // Safety valve — never stay on loading screen more than 6 s
    const safetyTimer = setTimeout(() => setLoading(false), 6000);

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        // No valid session — go straight to login, no network call needed
        setSession(null);
        setUser(null);
        setDbUser(null);
        clearTimeout(safetyTimer);
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session.user);
      fetchDbUser(session.user.id).finally(() => {
        clearTimeout(safetyTimer);
        setLoading(false);
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // TOKEN_REFRESHED failure or explicit sign-out → clear everything
      if (event === "SIGNED_OUT" || !session) {
        setSession(null);
        setUser(null);
        setDbUser(null);
        return;
      }
      setSession(session);
      setUser(session.user);
      // On fresh sign-up the profile INSERT happens AFTER this event fires,
      // so fetchDbUser may return null. Retry up to 3× with back-off.
      const profile = await fetchDbUser(session.user.id);
      if (!profile && event === "SIGNED_IN") {
        for (const delay of [800, 1500, 3000]) {
          await new Promise(r => setTimeout(r, delay));
          const retry = await fetchDbUser(session.user.id);
          if (retry) break;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Mark online/offline
  useEffect(() => {
    if (!user) return;
    // Must await — Supabase JS v2 lazy promises never fire without await/.then()
    supabase.from("users").update({ last_seen: new Date().toISOString() }).eq("id", user.id).then();

    const handleUnload = () => {
      supabase.from("users").update({ last_seen: new Date().toISOString() }).eq("id", user.id).then();
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const deleteAccount = async (): Promise<{ error?: string }> => {
    if (!user) return { error: "Not authenticated" };
    // Remove user from all conversations (update participants arrays)
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, participants")
      .contains("participants", [user.id]);

    if (convs) {
      for (const conv of convs) {
        const updated = conv.participants.filter((id: string) => id !== user.id);
        if (updated.length === 0) {
          await supabase.from("conversations").delete().eq("id", conv.id);
        } else {
          await supabase.from("conversations").update({ participants: updated }).eq("id", conv.id);
        }
      }
    }

    // Delete user row
    const { error: delErr } = await supabase.from("users").delete().eq("id", user.id);
    if (delErr) return { error: delErr.message };

    // Sign out (Supabase Auth user deletion requires service role — sign out is sufficient for client)
    await supabase.auth.signOut();
    return {};
  };

  return (
    <AuthContext.Provider value={{ session, user, dbUser, loading, signOut, refreshUser, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
