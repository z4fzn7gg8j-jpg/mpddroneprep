import { getSupabase } from "./supabaseClient";
import type { Question } from "./types";

function rowToQuestion(row: any): Question {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    area: row.area,
    topic: row.topic,
    subtopic: row.subtopic,
    acsCode: row.acs_code,
    difficulty: row.difficulty,
    conceptFamilyId: row.concept_family_id,
    text: row.text,
    choices: row.choices,
    correctChoiceId: row.correct_choice_id,
    sourceUrls: row.source_urls ?? [],
    figure: row.figure ?? undefined,
    resourceIds: row.resource_ids ?? [],
    lastReviewed: row.last_reviewed,
    teachingExplanation: row.teaching_explanation ?? undefined,
    howToSolve: row.how_to_solve ?? undefined,
    memoryTip: row.memory_tip ?? undefined,
    reviewPrompt: row.review_prompt ?? undefined,
  };
}

function questionToRow(q: Question) {
  return {
    id: q.id,
    version: q.version,
    status: q.status,
    area: q.area,
    topic: q.topic,
    subtopic: q.subtopic,
    acs_code: q.acsCode,
    difficulty: q.difficulty,
    concept_family_id: q.conceptFamilyId,
    text: q.text,
    choices: q.choices,
    correct_choice_id: q.correctChoiceId,
    source_urls: q.sourceUrls,
    figure: q.figure ?? null,
    resource_ids: q.resourceIds,
    last_reviewed: q.lastReviewed,
    teaching_explanation: q.teachingExplanation ?? null,
    how_to_solve: q.howToSolve ?? null,
    memory_tip: q.memoryTip ?? null,
    review_prompt: q.reviewPrompt ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function listAllQuestionsAdmin(): Promise<Question[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.from("part107_questions").select("*").order("id");
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToQuestion);
}

/**
 * Saves an edited question. Snapshots the pre-edit row into
 * part107_question_versions first (under the OLD version number) so a
 * historical attempt report that referenced the old wording still shows
 * it correctly, then writes the new row with version incremented.
 */
export async function saveQuestionAdmin(previous: Question, next: Question, changedBy: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Not connected to Supabase.");

  const { error: snapshotErr } = await supabase.from("part107_question_versions").insert({
    question_id: previous.id,
    version: previous.version,
    snapshot: questionToRow(previous),
    changed_by: changedBy,
  });
  if (snapshotErr) throw new Error(`Could not save version history: ${snapshotErr.message}`);

  const updated = { ...next, version: previous.version + 1 };
  const { error: updateErr } = await supabase.from("part107_questions").upsert(questionToRow(updated), { onConflict: "id" });
  if (updateErr) throw new Error(`Could not save question: ${updateErr.message}`);
}

export async function createQuestionAdmin(q: Question): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Not connected to Supabase.");
  const { error } = await supabase.from("part107_questions").insert(questionToRow(q));
  if (error) throw new Error(error.message);
}

export interface ProblemReport {
  id: string;
  questionId: string;
  reportedBy: string;
  attemptId: string | null;
  note: string;
  status: "open" | "reviewed" | "dismissed";
  createdAt: string;
  reporterEmail?: string;
}

export async function listProblemReports(): Promise<ProblemReport[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("part107_question_problem_reports")
    .select("*, part107_officers(email)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    questionId: r.question_id,
    reportedBy: r.reported_by,
    attemptId: r.attempt_id,
    note: r.note,
    status: r.status,
    createdAt: r.created_at,
    reporterEmail: r.part107_officers?.email,
  }));
}

export async function updateProblemReportStatus(id: string, status: "open" | "reviewed" | "dismissed"): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Not connected to Supabase.");
  const { error } = await supabase.from("part107_question_problem_reports").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}
