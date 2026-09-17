// POST /.netlify/functions/report-question-problem
// Body: { questionId, attemptId?, note }
//
// STATUS: not yet executed against a live project. See _shared.ts header.

import type { Handler } from "@netlify/functions";
import { supabaseAdmin, requireOfficer, jsonResponse, errorResponse, HttpError, checkRateLimit } from "./_shared";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return jsonResponse(405, { error: "POST only." });
    const officer = await requireOfficer(event.headers.authorization);
    await checkRateLimit(officer.id, "report-question-problem");

    const { questionId, attemptId, note } = JSON.parse(event.body ?? "{}");
    if (!questionId || !note || typeof note !== "string" || note.trim().length === 0) {
      throw new HttpError(400, "questionId and a non-empty note are required.");
    }

    const admin = supabaseAdmin();
    const { error } = await admin.from("part107_question_problem_reports").insert({
      question_id: questionId,
      reported_by: officer.id,
      attempt_id: attemptId ?? null,
      note: note.trim().slice(0, 2000),
    });
    if (error) throw new HttpError(500, `Could not save report: ${error.message}`);

    return jsonResponse(200, { ok: true });
  } catch (err) {
    return errorResponse(err);
  }
};
