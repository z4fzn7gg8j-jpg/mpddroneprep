import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabaseClient";
import { isDemoMode } from "./storage";

interface AuthState {
  loading: boolean;
  session: Session | null;
  officerId: string | null;
  officerEmail: string | null;
  officerName: string | null;
  officerRole: "officer" | "coordinator" | null;
  signOut: () => Promise<void>;
  refreshOfficerRow: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  loading: false,
  session: null,
  officerId: null,
  officerEmail: null,
  officerName: null,
  officerRole: null,
  signOut: async () => {},
  refreshOfficerRow: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(!isDemoMode());
  const [session, setSession] = useState<Session | null>(null);
  const [officerName, setOfficerName] = useState<string | null>(null);
  const [officerRole, setOfficerRole] = useState<"officer" | "coordinator" | null>(null);

  async function ensureOfficerRow(currentSession: Session) {
    const supabase = getSupabase();
    if (!supabase) return;
    const email = currentSession.user.email ?? "";
    // Create this officer's row on first sign-in (RLS only allows a user
    // to insert a row for themselves, with role forced to 'officer' --
    // see the part107_officers_insert_self policy). Safe to call every
    // time; upsert is a no-op if the row already exists.
    const { error: upsertErr } = await supabase
      .from("part107_officers")
      .upsert(
        { id: currentSession.user.id, email, name: email.split("@")[0], role: "officer" },
        { onConflict: "id", ignoreDuplicates: true }
      );
    if (upsertErr) {
      // Row likely already exists (ignoreDuplicates should prevent this,
      // but some client versions still report it) -- not fatal.
      console.warn("officer row upsert:", upsertErr.message);
    }
    const { data: row } = await supabase
      .from("part107_officers")
      .select("name, role")
      .eq("id", currentSession.user.id)
      .single();
    if (row) {
      setOfficerName(row.name);
      setOfficerRole(row.role);
    }
  }

  useEffect(() => {
    if (isDemoMode()) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await ensureOfficerRow(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) await ensureOfficerRow(newSession);
      else {
        setOfficerName(null);
        setOfficerRole(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setOfficerName(null);
    setOfficerRole(null);
  }

  async function refreshOfficerRow() {
    if (session) await ensureOfficerRow(session);
  }

  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        officerId: session?.user.id ?? null,
        officerEmail: session?.user.email ?? null,
        officerName,
        officerRole,
        signOut,
        refreshOfficerRow,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
