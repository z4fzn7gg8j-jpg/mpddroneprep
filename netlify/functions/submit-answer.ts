// POST /.netlify/functions/submit-answer
// Body: { attemptId, questionId, choiceId, flagged? }
//
// STATUS: not yet executed against a live Supabase project. See
// netlify/functions/_shared.ts header.

import type { Handler } from "@netlify/functions";
import { supabaseAdmin, requireOfficer, jsonResponse, errorResponse, HttpError, checkRateLimit } from "./_shared";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return jsonResponse(405, { error: "POST only." });
    const officer = await requireOfficer(event.headers.authorization);
    await checkRateLimit(officer.id, "submit-answer");

    const body = JSON.parse(event.body ?? "{}");
    const { attemptId, questionId, choiceId, flagged } = body;
    if (!attemptId || !questionId) throw new HttpError(400, "attemptId and questionId are required.");

    const admin = supabaseAdmin();

    // Ownership + deadline check (spec section 11: "check attempt
    // ownership", "enforce deadlines server-side").
    const { data: attempt, error: attemptErr } = await admin
      .from("part107_attempts")
      .select("id, officer_id, question_ids, deadline, finalized")
      .eq("id", attemptId)
      .single();
    if (attemptErr || !attempt) throw new HttpError(404, "Attempt not found.");
    if (attempt.officer_id !== officer.id) throw new HttpError(403, "This attempt does not belong to you.");
    if (attempt.finalized) throw new HttpError(409, "This attempt has already been submitted.");
    if (attempt.deadline && new Date(attempt.deadline).getTime() <= Date.now()) {
      throw new HttpError(409, "This attempt's deadline has passed; it will be auto-finalized.");
    }

    // Only accept answers for questions actually assigned to this attempt
    // (spec section 11).
    if (!attempt.question_ids.includes(questionId)) {
      throw new HttpError(400, "That question is not part of this attempt.");
    }

    // Only accept a choice id that actually belongs to that question.
    if (choiceId) {
      const { data: q, error: qErr } = await admin.from("part107_questions").select("choices").eq("id", questionId).single();
      if (qErr || !q) throw new HttpError(404, "Question not found.");
      const validChoiceIds = (q.choices as any[]).map((c) => c.id);
      if (!validChoiceIds.includes(choiceId)) throw new HttpError(400, "That choice does not belong to this question.");
    }

    const { error: upsertErr } = await admin.from("part107_attempt_answers").upsert(
      {
        attempt_id: attemptId,
        question_id: questionId,
        choice_id: choiceId ?? null,
        flagged: !!flagged,
        answered_at: choiceId ? new Date().toISOString() : null,
      },
      { onConflict: "attempt_id,question_id" }
    );
    if (upsertErr) throw new HttpError(500, `Could not save answer: ${upsertErr.message}`);

    return jsonResponse(200, { ok: true });
  } catch (err) {
    return errorResponse(err);
  }
};
