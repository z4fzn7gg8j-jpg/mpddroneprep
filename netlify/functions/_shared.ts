// Shared helpers for Netlify Functions.
//
// STATUS: written against the schema in supabase/schema.sql and the
// Supabase JS client's documented API, but NOT executed against a live
// Supabase project as part of this delivery -- no project was configured
// for this session. Treat every function in this folder as "should be
// correct, needs integration testing" rather than "verified working."
// See KNOWN_LIMITATIONS.md and DEPLOYMENT.md.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Service-role client. This key must only ever be read from the Netlify
 * Function's server-side environment (never sent to or embedded in the
 * browser bundle) -- it bypasses Row Level Security, which is exactly why
 * it's the only client allowed to score attempts, enforce deadlines, and
 * write email_queue rows. See supabase/policies.sql for what the anon-key
 * client (used by the browser directly for reads) is and isn't allowed to
 * touch.
 */
export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the function's environment.");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

export interface AuthedOfficer {
  id: string;
  role: "officer" | "coordinator";
}

/**
 * Verifies the bearer token from the Authorization header against Supabase
 * Auth and loads the officer row. Every function that touches attempt or
 * officer data must call this and use the returned id for ownership checks
 * -- never trust an officer id passed in the request body.
 */
export async function requireOfficer(authHeader: string | undefined): Promise<AuthedOfficer> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing or malformed Authorization header.");
  }
  const token = authHeader.slice("Bearer ".length);
  const admin = supabaseAdmin();
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    throw new HttpError(401, "Invalid or expired session.");
  }
  const { data: officerRow, error: officerErr } = await admin
    .from("part107_officers")
    .select("id, role")
    .eq("id", userData.user.id)
    .single();
  if (officerErr || !officerRow) {
    throw new HttpError(403, "No officer record for this account.");
  }
  return officerRow as AuthedOfficer;
}

export function requireCoordinator(officer: AuthedOfficer) {
  if (officer.role !== "coordinator") {
    throw new HttpError(403, "Coordinator access required.");
  }
}

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return jsonResponse(err.statusCode, { error: err.message });
  }
  // Do not leak internal error detail (stack traces, DB error text) to the
  // client; log server-side instead.
  // eslint-disable-next-line no-console
  console.error(err);
  return jsonResponse(500, { error: "Internal server error." });
}

/**
 * Simple in-memory-per-invocation rate limiting is not durable across
 * Netlify's stateless function instances. Use a Supabase table (or a
 * dedicated rate-limit service) keyed by officer id + action for real
 * enforcement. This helper is a placeholder that documents the shape of
 * the check each function should perform; it is intentionally not wired
 * up as a fake pass-through, since a limiter that always allows the
 * request would be misleading. Replace with a real implementation before
 * relying on it -- see KNOWN_LIMITATIONS.md.
 */
export async function checkRateLimit(_officerId: string, _action: string): Promise<void> {
  // Intentionally unimplemented. See doc comment above.
  return;
}
