// POST /.netlify/functions/start-attempt
// Body: { mode: "study"|"practice"|"simulation", areaFilter?, count? }
//
// STATUS: not yet executed against a live Supabase project -- see
// netlify/functions/_shared.ts header. The sampling logic mirrors
// src/lib/sampling.ts (kept as a separate implementation here since
// Netlify Functions and the Vite client build are bundled independently;
// see KNOWN_LIMITATIONS.md for the plan to share one implementation via a
// small internal package instead of duplicating this logic).

import type { Handler } from "@netlify/functions";
import { supabaseAdmin, requireOfficer, jsonResponse, errorResponse, HttpError, checkRateLimit } from "./_shared";

const SIMULATION_DISTRIBUTION: Record<string, number> = {
  regulations: 12,
  airspace: 12,
  weather: 8,
  loading_performance: 6,
  operations: 22,
};
const SIMULATION_TIME_LIMIT_MS = 2 * 60 * 60 * 1000;

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return jsonResponse(405, { error: "POST only." });
    const officer = await requireOfficer(event.headers.authorization);
    await checkRateLimit(officer.id, "start-attempt");

    const body = JSON.parse(event.body ?? "{}");
    const mode = body.mode as string;
    if (!["study", "practice", "simulation"].includes(mode)) {
      throw new HttpError(400, "Invalid mode.");
    }

    const admin = supabaseAdmin();

    // Pull the officer's recently seen question ids to bias sampling away
    // from repeats (spec section 4: "prefer questions not encountered in
    // recent attempts").
    const { data: recentAttempts } = await admin
      .from("part107_attempts")
      .select("question_ids")
      .eq("officer_id", officer.id)
      .eq("finalized", true)
      .order("submitted_at", { ascending: false })
      .limit(3);
    const recentIds = new Set((recentAttempts ?? []).flatMap((a: any) => a.question_ids as string[]));

    let questionIds: string[] = [];
    let deadline: string | null = null;

    if (mode === "simulation") {
      const distribution = SIMULATION_DISTRIBUTION;
      for (const area of Object.keys(distribution)) {
        const need = distribution[area];
        const { data: areaQuestions, error } = await admin
          .from("part107_questions")
          .select("id, concept_family_id")
          .eq("status", "published")
          .eq("area", area);
        if (error) throw new HttpError(500, `Question lookup failed: ${error.message}`);
        const pool = areaQuestions ?? [];
        const fresh = shuffle(pool.filter((q: any) => !recentIds.has(q.id)));
        const seen = shuffle(pool.filter((q: any) => recentIds.has(q.id)));
        const candidates = [...fresh, ...seen];
        const chosen: any[] = [];
        const usedFamilies = new Set<string>();
        for (const q of candidates) {
          if (chosen.length >= need) break;
          if (usedFamilies.has(q.concept_family_id)) continue;
          chosen.push(q);
          usedFamilies.add(q.concept_family_id);
        }
        for (const q of candidates) {
          if (chosen.length >= need) break;
          if (chosen.some((c) => c.id === q.id)) continue;
          chosen.push(q);
        }
        questionIds.push(...chosen.map((q) => q.id));
      }
      questionIds = shuffle(questionIds);
      deadline = new Date(Date.now() + SIMULATION_TIME_LIMIT_MS).toISOString();
    } else {
      // study / practice
      const areaFilter = body.areaFilter && body.areaFilter !== "mixed" ? body.areaFilter : null;
      let query = admin.from("part107_questions").select("id").eq("status", "published");
      if (areaFilter) query = query.eq("area", areaFilter);
      const { data: pool, error } = await query;
      if (error) throw new HttpError(500, `Question lookup failed: ${error.message}`);
      const shuffled = shuffle(pool ?? []);
      const count = mode === "practice" ? Math.min(body.count ?? 20, shuffled.length) : shuffled.length;
      questionIds = shuffled.slice(0, count).map((q: any) => q.id);
    }

    const { data: attempt, error: insertErr } = await admin
      .from("part107_attempts")
      .insert({
        officer_id: officer.id,
        mode,
        area_filter: body.areaFilter ?? null,
        question_ids: questionIds,
        deadline,
      })
      .select()
      .single();
    if (insertErr) throw new HttpError(500, `Could not create attempt: ${insertErr.message}`);

    // For simulation/practice, the browser must NOT receive
    // correct_choice_id or per-choice explanations yet. Study Mode is the
    // one exception (immediate feedback is the whole point), so it returns
    // full question content; the others return sanitized question content
    // only. This is enforced here, not just in the UI.
    const { data: questionRows } = await admin
      .from("part107_questions")
      .select("id, area, topic, subtopic, text, choices, figure, acs_code")
      .in("id", questionIds);

    const sanitized = (questionRows ?? []).map((q: any) => ({
      id: q.id,
      area: q.area,
      topic: q.topic,
      subtopic: q.subtopic,
      text: q.text,
      figure: q.figure,
      acsCode: q.acs_code,
      choices: q.choices.map((c: any) => ({
        id: c.id,
        text: c.text,
        // Explanation and which choice is correct are withheld outside
        // Study Mode until the attempt is finalized (spec section 11).
        explanation: mode === "study" ? c.explanation : undefined,
      })),
    }));

    return jsonResponse(200, { attempt, questions: sanitized });
  } catch (err) {
    return errorResponse(err);
  }
};
