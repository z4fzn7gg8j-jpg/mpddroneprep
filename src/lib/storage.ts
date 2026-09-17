import type { Attempt } from "./types";

/**
 * DEMO MODE ONLY.
 *
 * This module persists attempts in the browser's localStorage so the app is
 * fully usable for study/practice/review without Supabase, Netlify
 * Functions, or Resend configured. It intentionally:
 *   - does NOT authenticate anyone (there is a single implied "demo officer")
 *   - does NOT share data between devices or users
 *   - does NOT send email
 *   - computes scores in the browser, which is fine here because there is no
 *     server to defend against a browser in demo mode, but is NOT how the
 *     real deployment should work (see netlify/functions/submit-attempt.ts
 *     and src/lib/scoring.ts's header comment)
 *
 * A banner in the UI must make this mode obvious at all times (see
 * src/components/DemoModeBanner in App.tsx). When VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are configured, the app should route through a real
 * API client instead -- that wiring is left as a clearly marked follow-up in
 * KNOWN_LIMITATIONS.md, since it depends on an actual Supabase project.
 */

const KEY_ATTEMPTS = "mpd107_demo_attempts_v1";
const KEY_OFFICER = "mpd107_demo_officer_v1";

export function isDemoMode(): boolean {
  const url = (import.meta as any).env?.VITE_SUPABASE_URL;
  const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  return !url || !key;
}

export function loadAttempts(): Attempt[] {
  try {
    const raw = localStorage.getItem(KEY_ATTEMPTS);
    return raw ? (JSON.parse(raw) as Attempt[]) : [];
  } catch {
    return [];
  }
}

export function saveAttempt(attempt: Attempt): void {
  const attempts = loadAttempts();
  const idx = attempts.findIndex((a) => a.id === attempt.id);
  if (idx >= 0) attempts[idx] = attempt;
  else attempts.push(attempt);
  localStorage.setItem(KEY_ATTEMPTS, JSON.stringify(attempts));
}

export function getAttempt(id: string): Attempt | null {
  return loadAttempts().find((a) => a.id === id) ?? null;
}

export function deleteAllDemoData(): void {
  localStorage.removeItem(KEY_ATTEMPTS);
  localStorage.removeItem(KEY_OFFICER);
}

export interface DemoOfficer {
  id: string;
  name: string;
}

export function getDemoOfficer(): DemoOfficer {
  try {
    const raw = localStorage.getItem(KEY_OFFICER);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through */
  }
  const officer = { id: "demo-officer", name: "Demo Officer" };
  localStorage.setItem(KEY_OFFICER, JSON.stringify(officer));
  return officer;
}

export function setDemoOfficerName(name: string): void {
  const officer = getDemoOfficer();
  officer.name = name;
  localStorage.setItem(KEY_OFFICER, JSON.stringify(officer));
}
