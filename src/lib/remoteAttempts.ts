import type { Attempt, AttemptMode, FaaArea } from "./types";
import { getSupabase } from "./supabaseClient";

async function authHeader(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function callFunction(name: string, body: unknown) {
  const headers = { "Content-Type": "application/json", ...(await authHeader()) };
  const res = await fetch(`/.netlify/functions/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `${name} failed (${res.status})`);
  return json;
}

// Row shape from part107_attempts, translated into the app's Attempt type.
function rowToAttempt(row: any, answers: Record<string, { choiceId: string | null; flagged: boolean; answeredAt: string | null }>): Attempt {
  return {
    id: row.id,
    officerId: row.officer_id,
    mode: row.mode,
    areaFilter: row.area_filter ?? undefined,
    questionIds: row.question_ids,
    answers: Object.fromEntries(
      row.question_ids.map((id: string) => [
        id,
        { questionId: id, choiceId: answers[id]?.choiceId ?? null, flagged: answers[id]?.flagged ?? false, answeredAt: answers[id]?.answeredAt ?? null },
      ])
    ),
    startedAt: row.started_at,
    deadline: row.deadline,
    submittedAt: row.submitted_at,
    finalized: row.finalized,
    score: row.score ?? undefined,
  };
}

export async function startAttemptRemote(opts: {
  mode: AttemptMode;
  areaFilter?: FaaArea | "mixed";
  skillCategory?: string;
  flatMixed?: boolean;
  count?: number;
}): Promise<Attempt> {
  const result = await callFunction("start-attempt", opts);
  return rowToAttempt(result.attempt, {});
}

export async function submitAnswerRemote(attemptId: string, questionId: string, choiceId: string | null, flagged: boolean): Promise<void> {
  await callFunction("submit-answer", { attemptId, questionId, choiceId, flagged });
}

export async function finalizeAttemptRemote(attemptId: string): Promise<Attempt> {
  const result = await callFunction("finalize-attempt", { attemptId });
  const supabase = getSupabase();
  let answers: Record<string, any> = {};
  if (supabase) {
    const { data } = await supabase.from("part107_attempt_answers").select("*").eq("attempt_id", attemptId);
    for (const a of data ?? []) {
      answers[a.question_id] = { choiceId: a.choice_id, flagged: a.flagged, answeredAt: a.answered_at };
    }
  }
  return rowToAttempt(result.attempt, answers);
}

export async function resendReportRemote(attemptId: string): Promise<void> {
  await callFunction("resend-report", { attemptId });
}

export async function reportQuestionProblemRemote(questionId: string, attemptId: string | undefined, note: string): Promise<void> {
  await callFunction("report-question-problem", { questionId, attemptId, note });
}

export async function deleteAttemptRemote(attemptId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Not connected to Supabase.");
  const { error } = await supabase.from("part107_attempts").delete().eq("id", attemptId);
  if (error) throw new Error(error.message);
}

export async function resetSharedPasswordRemote(newPassword: string): Promise<{ updated: number; total: number; failed: string[] }> {
  return callFunction("reset-shared-password", { newPassword });
}

/** Reads the signed-in officer's own attempts directly via RLS (no function needed for reads). */
export async function listMyAttempts(): Promise<Attempt[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: attemptRows, error } = await supabase
    .from("part107_attempts")
    .select("*")
    .order("started_at", { ascending: false });
  if (error || !attemptRows) return [];
  const results: Attempt[] = [];
  for (const row of attemptRows) {
    const { data: answerRows } = await supabase.from("part107_attempt_answers").select("*").eq("attempt_id", row.id);
    const answers: Record<string, any> = {};
    for (const a of answerRows ?? []) {
      answers[a.question_id] = { choiceId: a.choice_id, flagged: a.flagged, answeredAt: a.answered_at };
    }
    results.push(rowToAttempt(row, answers));
  }
  return results;
}

export async function getAttemptRemote(attemptId: string): Promise<Attempt | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: row } = await supabase.from("part107_attempts").select("*").eq("id", attemptId).single();
  if (!row) return null;
  const { data: answerRows } = await supabase.from("part107_attempt_answers").select("*").eq("attempt_id", attemptId);
  const answers: Record<string, any> = {};
  for (const a of answerRows ?? []) {
    answers[a.question_id] = { choiceId: a.choice_id, flagged: a.flagged, answeredAt: a.answered_at };
  }
  return rowToAttempt(row, answers);
}

/** Coordinator-only: every officer's attempts (RLS allows this for role='coordinator'). */
export async function listAllAttemptsForCoordinator(): Promise<{ attempts: Attempt[]; officers: Record<string, { name: string; email: string }> }> {
  const supabase = getSupabase();
  if (!supabase) return { attempts: [], officers: {} };
  const { data: attemptRows } = await supabase.from("part107_attempts").select("*").order("started_at", { ascending: false });
  const { data: officerRows } = await supabase.from("part107_officers").select("id, name, email");
  const officers: Record<string, { name: string; email: string }> = {};
  for (const o of officerRows ?? []) officers[o.id] = { name: o.name, email: o.email };
  const attempts = (attemptRows ?? []).map((row: any) => rowToAttempt(row, {}));
  return { attempts, officers };
}
