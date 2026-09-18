import type { Question, FaaArea, Difficulty, QuestionStatus } from "./types";
import { resolveSupplementReference } from "./courseFigures";
import { getSupabase } from "./supabaseClient";

const AREA_MAP: Record<string, FaaArea> = {
  "Regulations": "regulations",
  "Airspace Classification & Operating Requirements": "airspace",
  "Weather": "weather",
  "Loading & Performance": "loading_performance",
  "Operations": "operations",
};

const DIFF_MAP: Record<string, Difficulty> = { Easy: "intro", Medium: "standard", Hard: "advanced" };

const SUPPLEMENT_SOURCE =
  "https://www.faa.gov/sites/faa.gov/files/training_testing/testing/supplements/sport_rec_private_akts.pdf";
const SUPPLEMENT_EDITION =
  "Airman Knowledge Testing Supplement for Sport Pilot, Recreational Pilot, Remote Pilot, and Private Pilot (FAA, 2018 ed.) -- verify against the FAA's current edition before relying on symbology as up to date";

const FIGURE_TITLES: Record<string, string> = {
  "faa-legend1-sectional-chart": "Legend 1. Sectional Aeronautical Chart",
  "faa-fig2-load-factor-chart": "Figure 2. Load Factor Chart",
  "faa-fig8-density-altitude-chart": "Figure 8. Density Altitude Chart",
  "faa-fig12-metar": "Figure 12. Aviation Routine Weather Reports (METAR)",
  "faa-fig15-taf": "Figure 15. Terminal Aerodrome Forecasts (TAF)",
  "faa-fig17-winds-temps-aloft": "Figure 17. Winds and Temperatures Aloft Forecast",
  "faa-fig20-sectional-excerpt-norfolk": "Figure 20. Sectional Chart Excerpt (Norfolk, VA area)",
  "faa-fig21-sectional-excerpt-nd": "Figure 21. Sectional Chart Excerpt (north-central North Dakota)",
  "faa-fig22-sectional-excerpt-coeur-dalene": "Figure 22. Sectional Chart Excerpt (Coeur d'Alene, ID area)",
  "faa-fig23-sectional-excerpt-savannah": "Figure 23. Sectional Chart Excerpt (Savannah, GA area)",
  "faa-fig24-sectional-excerpt-ne-texas": "Figure 24. Sectional Chart Excerpt (northeast Texas)",
  "faa-fig25-sectional-excerpt-dallas": "Figure 25. Sectional Chart Excerpt (Dallas/Fort Worth, TX area)",
  "faa-fig26-sectional-excerpt-nd": "Figure 26. Sectional Chart Excerpt (Cooperstown/Jamestown, ND area)",
  "faa-fig59-sectional-excerpt-toledo": "Figure 59. Sectional Chart Excerpt (Toledo, OH area)",
  "faa-fig69-sectional-excerpt-corpus-christi": "Figure 69. Sectional Chart Excerpt (Corpus Christi, TX area)",
  "faa-fig74-sectional-excerpt-san-jose": "Figure 74. Sectional Chart Excerpt (San Jose/Bay Area, CA)",
  "faa-fig75-sectional-excerpt-buckeye-az": "Figure 75. Sectional Chart Excerpt (Buckeye/Gila Bend, AZ area)",
  "faa-fig78-sectional-excerpt-sioux-city": "Figure 78. Sectional Chart Excerpt (Sioux City, IA area)",
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export interface ImportSummary {
  total: number;
  published: number;
  draft: number;
  byArea: Record<string, number>;
  errors: string[];
}

/**
 * Converts the raw ChatGPT-generated question format (question_id,
 * choice_a/b/c, why_a/b/c, teaching_explanation, etc.) into this app's
 * Question schema. This is the same conversion that was previously done
 * by hand with a Python script each time a new bank was uploaded -- now
 * built into the app itself.
 */
export function parseRawQuestions(raw: any[]): { questions: Question[]; summary: ImportSummary } {
  const questions: Question[] = [];
  const errors: string[] = [];
  const byArea: Record<string, number> = {};
  let draftCount = 0;

  for (const d of raw) {
    try {
      const area = AREA_MAP[d.area];
      if (!area) {
        errors.push(`${d.question_id ?? "(unknown id)"}: unrecognized area "${d.area}"`);
        continue;
      }
      const correct = String(d.correct_answer ?? "").trim().toUpperCase();
      const choices = (["A", "B", "C"] as const).map((letter) => {
        const text = d[`choice_${letter.toLowerCase()}`] ?? "";
        const why = (d[`why_${letter.toLowerCase()}`] ?? "").trim();
        const explanation =
          why ||
          (letter === correct
            ? (d.explanation ?? "").trim()
            : "This is not the best answer here -- see the explanation on the correct answer above.");
        return { id: letter, text: String(text), explanation };
      });
      if (!choices.some((c) => c.id === correct)) {
        errors.push(`${d.question_id}: correct_answer "${d.correct_answer}" doesn't match any choice`);
        continue;
      }

      const visual = d.visual_required === "Yes";
      const figName = (d.supplement_figure ?? "").trim();
      const resolvedIds = visual && figName ? resolveSupplementReference(figName) : [];
      const figureId = resolvedIds[0];
      let status: QuestionStatus = "published";
      let figure: Question["figure"] | undefined = undefined;
      if (visual) {
        if (figureId) {
          figure = {
            figureId,
            title: FIGURE_TITLES[figureId] ?? figName,
            editionOrDate: SUPPLEMENT_EDITION,
            sourceUrl: SUPPLEMENT_SOURCE,
            isHistoricalTrainingCopy: true,
          };
        } else {
          status = "draft";
          draftCount++;
        }
      }

      const subtopic = (d.subtopic || d.skill_tag || "General").trim();
      const sourceUrls = [d.primary_source_url, d.supplement_source_url].map((s) => (s ?? "").trim()).filter(Boolean);

      const q: Question = {
        id: String(d.question_id),
        version: 1,
        status,
        area,
        topic: subtopic,
        subtopic,
        acsCode: (d.acs_code ?? "").trim(),
        difficulty: DIFF_MAP[d.difficulty] ?? "standard",
        conceptFamilyId: `${area}-${slugify(subtopic)}`,
        text: String(d.question ?? "").trim(),
        choices,
        correctChoiceId: correct,
        sourceUrls: sourceUrls.length > 0 ? sourceUrls : [SUPPLEMENT_SOURCE],
        figure,
        resourceIds: ["RES-AKTS-SUPPLEMENT"],
        lastReviewed: d.current_as_of ?? new Date().toISOString().slice(0, 10),
        teachingExplanation: (d.teaching_explanation ?? "").trim() || undefined,
        howToSolve: (d.how_to_solve ?? "").trim() || undefined,
        memoryTip: (d.memory_tip ?? "").trim() || undefined,
        reviewPrompt: (d.review_prompt ?? "").trim() || undefined,
      };
      questions.push(q);
      byArea[area] = (byArea[area] ?? 0) + 1;
    } catch (e: any) {
      errors.push(`${d.question_id ?? "(unknown id)"}: ${e.message}`);
    }
  }

  return {
    questions,
    summary: {
      total: raw.length,
      published: questions.length - draftCount,
      draft: draftCount,
      byArea,
      errors,
    },
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

export interface UpsertProgress {
  done: number;
  total: number;
}

/**
 * Upserts questions into Supabase in chunks (so one huge request doesn't
 * time out, and so the UI can show progress). Matches by id -- an
 * existing question with the same id gets overwritten with the new
 * content; nothing is deleted. Does NOT write version-history snapshots
 * (that would be 400 extra writes for a full bank) -- a real, documented
 * tradeoff of bulk import vs the single-question editor.
 */
export async function bulkUpsertQuestions(
  questions: Question[],
  onProgress?: (p: UpsertProgress) => void
): Promise<{ succeeded: number; failed: string[] }> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Not connected to Supabase.");
  const CHUNK = 25;
  let done = 0;
  const failed: string[] = [];
  for (let i = 0; i < questions.length; i += CHUNK) {
    const chunk = questions.slice(i, i + CHUNK);
    const { error } = await supabase.from("part107_questions").upsert(
      chunk.map(questionToRow),
      { onConflict: "id" }
    );
    if (error) {
      failed.push(...chunk.map((q) => `${q.id}: ${error.message}`));
    }
    done += chunk.length;
    onProgress?.({ done, total: questions.length });
  }
  return { succeeded: questions.length - failed.length, failed };
}
