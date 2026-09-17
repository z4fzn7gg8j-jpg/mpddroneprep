import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/**
 * Returns a Supabase client if VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * are configured (a real deployment), or null in local demo mode. Callers
 * should check isDemoMode() from lib/storage.ts first and only reach for
 * this when it's false.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = (import.meta as any).env?.VITE_SUPABASE_URL;
  const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}
