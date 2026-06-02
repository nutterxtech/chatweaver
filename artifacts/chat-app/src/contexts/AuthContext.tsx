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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDbUser = async (userId: string) => {
    const { data } = await supabase.from("users").select("*").eq("id", userId).single();
    setDbUser(data);
  };

  const refreshUser = async () => {
    if (user) await fetchDbUser(user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchDbUser(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchDbUser(session.user.id);
      else setDbUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Mark online/offline
  useEffect(() => {
    if (!user) return;
    supabase.from("users").update({ last_seen: new Date().toISOString() }).eq("id", user.id);

    const handleUnload = () => {
      supabase.from("users").update({ last_seen: new Date().toISOString() }).eq("id", user.id);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, dbUser, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
