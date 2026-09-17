// POST /.netlify/functions/start-attempt
// Body: { mode: "study"|"practice"|"simulation", areaFilter?, skillCategory?, count? }
//
// STATUS: not yet executed against a live Supabase project -- see
// netlify/functions/_shared.ts header. The sampling logic mirrors
// src/lib/sampling.ts (kept as a separate implementation here since
// Netlify Functions and the Vite client build are bundled independently;
// see KNOWN_LIMITATIONS.md for the plan to share one implementation via a
// small internal package instead of duplicating this logic).

import type { Handler } from "@netlify/functions";
import { supabaseAdmin, requireOfficer, jsonResponse, errorResponse, HttpError, checkRateLimit } from "./_shared";

// Current PSI UAG blueprint (effective 2025-09-29): 48/20/5/2/25 --
// mirrors src/lib/types.ts's SIMULATION_DISTRIBUTION. Keep these two in
// sync if the blueprint ever changes again.
const SIMULATION_DISTRIBUTION: Record<string, number> = {
  regulations: 29,
  airspace: 12,
  weather: 3,
  loading_performance: 1,
  operations: 15,
};
const SIMULATION_TIME_LIMIT_MS = 2 * 60 * 60 * 1000;

// Mirrors src/lib/mapCategories.ts's classifyMapQuestion -- duplicated
// here for the same reason as SIMULATION_DISTRIBUTION above (functions
// and the client bundle separately). Keep in sync if that file changes.
function classifyMapQuestion(subtopic: string, topic: string): string {
  const s = (subtopic + " " + topic).toLowerCase();
  if (s.includes("class b")) return "Class B Airspace";
  if (s.includes("class c")) return "Class C Airspace";
  if (s.includes("class d")) return "Class D Airspace";
  if (s.includes("class e")) return "Class E Airspace";
  if (
    s.includes("ctaf") || s.includes("frequency") || s.includes("airport symbol") ||
    s.includes("airport elevation") || s.includes("private airport") || s.includes("airport data") ||
    s.includes("traffic pattern") || s.includes("tower monitoring") || s.includes("vfr checkpoint")
  ) {
    return "Airport Symbols, Frequencies & Traffic Patterns";
  }
  if (s.includes("latitude") || s.includes("longitude") || s.includes("coordinate")) {
    return "Lat/Long & Coordinates";
  }
  if (
    s.includes("moa") || s.includes("restricted") || s.includes("military training route") ||
    s.includes("special-use") || s.includes("special use") || s.includes("g route")
  ) {
    return "Special-Use Airspace (MOA/Restricted/Routes)";
  }
  if (s.includes("obstacle") || s.includes("terrain") || s.includes("mef") || s.includes("elevation figure") || s.includes("msl") || s.includes("agl")) {
    return "Obstacles, Terrain & Elevation";
  }
  if (s.includes("authorization") || s.includes("shelf") || s.includes("ceiling") || s.includes("layering") || s.includes("below floor") || s.includes("notam")) {
    return "Airspace Boundaries & Authorization";
  }
  if (s.includes("metar")) return "METAR";
  if (s.includes("taf")) return "TAF";
  if (s.includes("load factor") || s.includes("bank angle")) return "Load Factor Chart";
  return "General Chart Reading";
}

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
      const skillCategory = body.skillCategory as string | undefined;
      const flatMixed = body.flatMixed === true;
      let query = admin.from("part107_questions").select("id, subtopic, topic, figure").eq("status", "published");
      if (areaFilter) query = query.eq("area", areaFilter);
      const { data: pool, error } = await query;
      if (error) throw new HttpError(500, `Question lookup failed: ${error.message}`);
      let filtered = pool ?? [];
      if (skillCategory) {
        // Map & Chart Reading: cross-area, visual questions only, matched
        // by the same classifier the client uses.
        filtered = filtered.filter((q: any) => q.figure && classifyMapQuestion(q.subtopic, q.topic) === skillCategory);
      } else if (flatMixed && !areaFilter) {
        // Map & Chart Mastery Check: all visual questions, no area/blueprint
        // weighting (a flat blueprint weighting would badly under-fill this
        // pool since Regulations has no visual questions at all).
        filtered = filtered.filter((q: any) => q.figure);
      }
      const shuffled = shuffle(filtered);
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
