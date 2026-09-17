// POST /.netlify/functions/finalize-attempt
// Body: { attemptId }
//
// STATUS: not yet executed against a live Supabase project. See
// netlify/functions/_shared.ts header.
//
// This is the one function most worth getting right: it is the only place
// a score is computed and persisted. The browser's own tally (used only
// for the in-progress UI, e.g. "12 unanswered") is never written here or
// trusted as the source of truth.

import type { Handler } from "@netlify/functions";
import { supabaseAdmin, requireOfficer, jsonResponse, errorResponse, HttpError, checkRateLimit } from "./_shared";

const FAA_AREAS = ["regulations", "airspace", "weather", "loading_performance", "operations"] as const;

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return jsonResponse(405, { error: "POST only." });
    const officer = await requireOfficer(event.headers.authorization);
    await checkRateLimit(officer.id, "finalize-attempt");

    const { attemptId } = JSON.parse(event.body ?? "{}");
    if (!attemptId) throw new HttpError(400, "attemptId is required.");

    const admin = supabaseAdmin();

    const { data: attempt, error: attemptErr } = await admin
      .from("part107_attempts")
      .select("*")
      .eq("id", attemptId)
      .single();
    if (attemptErr || !attempt) throw new HttpError(404, "Attempt not found.");
    if (attempt.officer_id !== officer.id) throw new HttpError(403, "This attempt does not belong to you.");

    // Idempotent: finalizing an already-finalized attempt just returns the
    // existing result rather than rescoring or re-queueing email (spec
    // section 11: "finalize submissions idempotently"; section 8: "prevent
    // duplicate emails on repeated submission").
    if (attempt.finalized) {
      return jsonResponse(200, { attempt });
    }

    // Deadline / "no paused timer" enforcement: the server's own clock and
    // stored deadline decide whether this is on time, never the client. A
    // timed attempt submitted after its stored deadline is still scored
    // (so the officer isn't left with nothing) but is flagged so it cannot
    // count toward readiness.
    const now = new Date();
    const timerTampered = !!attempt.deadline && now.getTime() > new Date(attempt.deadline).getTime() + 5000; // 5s grace for request latency

    const { data: questionRows, error: qErr } = await admin
      .from("part107_questions")
      .select("id, area, correct_choice_id")
      .in("id", attempt.question_ids);
    if (qErr) throw new HttpError(500, `Could not load questions for scoring: ${qErr.message}`);

    const { data: answers } = await admin
      .from("part107_attempt_answers")
      .select("question_id, choice_id")
      .eq("attempt_id", attemptId);
    const answerByQuestion = new Map((answers ?? []).map((a: any) => [a.question_id, a.choice_id]));

    const byArea: Record<string, { correct: number; total: number }> = Object.fromEntries(
      FAA_AREAS.map((a) => [a, { correct: 0, total: 0 }])
    );
    let correct = 0;
    for (const q of questionRows ?? []) {
      const chosen = answerByQuestion.get(q.id) ?? null;
      byArea[q.area].total += 1;
      if (chosen && chosen === q.correct_choice_id) {
        byArea[q.area].correct += 1;
        correct += 1;
      }
      // Unanswered (chosen === null) simply doesn't add to correct.
    }
    const total = (questionRows ?? []).length;
    const percent = total > 0 ? Math.floor((correct / total) * 1000) / 10 : 0;
    const byAreaArr = FAA_AREAS.filter((a) => byArea[a].total > 0).map((a) => ({
      area: a,
      correct: byArea[a].correct,
      total: byArea[a].total,
      percent: Math.floor((byArea[a].correct / byArea[a].total) * 1000) / 10, // no upward rounding
    }));
    const passedEveryArea = byAreaArr.every((a) => a.percent >= 75);
    const score = {
      correct,
      total,
      percent,
      byArea: byAreaArr,
      passedOverall: percent >= 85,
      // A tampered-timer attempt never counts as a qualifying simulation,
      // regardless of score.
      passedEveryArea: timerTampered ? false : passedEveryArea,
    };

    const { data: updated, error: updateErr } = await admin
      .from("part107_attempts")
      .update({
        finalized: true,
        submitted_at: now.toISOString(),
        score,
        timer_tampered: timerTampered,
      })
      .eq("id", attemptId)
      .eq("finalized", false) // guards against a race between two concurrent finalize calls
      .select()
      .single();
    if (updateErr || !updated) {
      // Someone else's concurrent request won the race; return the
      // now-finalized row rather than erroring.
      const { data: raced } = await admin.from("part107_attempts").select("*").eq("id", attemptId).single();
      return jsonResponse(200, { attempt: raced });
    }

    // Queue officer + coordinator emails, deduped by attempt id + kind so a
    // retried finalize call (e.g. a flaky network) never double-sends.
    await admin.from("part107_email_queue").upsert(
      [
        {
          attempt_id: attemptId,
          kind: "officer_report",
          recipient: "__officer__", // resolved to the officer's email at send time by the worker
          dedupe_key: `${attemptId}:officer_report`,
        },
        {
          attempt_id: attemptId,
          kind: "coordinator_summary",
          recipient: "__coordinator__", // resolved server-side from COORDINATOR_EMAIL env var, never client-supplied
          dedupe_key: `${attemptId}:coordinator_summary`,
        },
      ],
      { onConflict: "dedupe_key", ignoreDuplicates: true }
    );

    return jsonResponse(200, { attempt: updated });
  } catch (err) {
    return errorResponse(err);
  }
};
