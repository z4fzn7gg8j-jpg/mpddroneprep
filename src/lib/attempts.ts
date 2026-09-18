import type {
  Attempt,
  AttemptMode,
  FaaArea,
  Question,
} from "./types";
import {
  SIMULATION_DISTRIBUTION,
  SIMULATION_TOTAL,
  FAA_PUBLISHED_RANGE,
} from "./types";
import { sampleQuestions } from "./sampling";
import { loadAttempts, saveAttempt, getDemoOfficer } from "./storage";
import { scoreAttempt } from "./scoring";
import { mapQuestionsInCategory, type MapCategory } from "./mapCategories";

const SIMULATION_TIME_LIMIT_MS = 2 * 60 * 60 * 1000;

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function recentQuestionIds(officerId: string, limit = 3): string[] {
  const attempts = loadAttempts()
    .filter((a) => a.officerId === officerId && a.finalized)
    .sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime())
    .slice(0, limit);
  return attempts.flatMap((a) => a.questionIds);
}

/**
 * Scales the blueprint percentages to a whole-question distribution for an
 * arbitrary quiz size, using largest-remainder rounding so the parts
 * always sum exactly to `count` (matches how the 60-question simulation's
 * fixed 29/12/3/1/15 mix was derived from 48/20/5/2/25, just generalized
 * to any requested length).
 */
export function weightedDistribution(count: number): Record<FaaArea, number> {
  const areas = Object.keys(FAA_PUBLISHED_RANGE) as FaaArea[];
  const raw = areas.map((a) => ({ area: a, exact: (FAA_PUBLISHED_RANGE[a][0] / 100) * count }));
  const floors = raw.map((r) => ({ area: r.area, base: Math.floor(r.exact), remainder: r.exact - Math.floor(r.exact) }));
  let assigned = floors.reduce((sum, f) => sum + f.base, 0);
  let remaining = count - assigned;
  const byRemainder = [...floors].sort((a, b) => b.remainder - a.remainder);
  const result: Record<FaaArea, number> = {
    regulations: 0,
    airspace: 0,
    weather: 0,
    loading_performance: 0,
    operations: 0,
  };
  for (const f of floors) result[f.area] = f.base;
  for (let i = 0; i < byRemainder.length && remaining > 0; i++, remaining--) {
    result[byRemainder[i].area] += 1;
  }
  return result;
}

export interface StartAttemptOptions {
  mode: AttemptMode;
  areaFilter?: FaaArea | "mixed";
  skillCategory?: string; // for Study Mode's Map & Chart Reading sub-categories, cuts across areas
  flatMixed?: boolean; // bypass blueprint area-weighting and just flat-shuffle the given pool (e.g. Map & Chart Mastery Check, which is pre-filtered to visual questions and shouldn't be re-weighted by FAA area percentages)
  count?: number; // for practice quizzes: 10, 20, 30, 40, 50, or custom
  pool: Question[];
}

export function startAttempt(opts: StartAttemptOptions): Attempt {
  const officer = getDemoOfficer();
  const recent = recentQuestionIds(officer.id);
  let questionIds: string[] = [];
  let deadline: string | null = null;

  if (opts.mode === "simulation") {
    const qs = sampleQuestions({
      distribution: SIMULATION_DISTRIBUTION,
      pool: opts.pool,
      recentQuestionIds: recent,
    });
    questionIds = qs.map((q) => q.id);
    // Deadline is computed at start time. In the real deployment this MUST
    // be computed and stored server-side, and the server -- not the browser
    // clock -- must be the source of truth for whether the deadline has
    // passed. See netlify/functions/start-attempt.ts.
    deadline = new Date(Date.now() + SIMULATION_TIME_LIMIT_MS).toISOString();
  } else if (opts.mode === "practice") {
    const count = opts.count ?? 20;
    const area = opts.areaFilter && opts.areaFilter !== "mixed" ? opts.areaFilter : null;
    if (area || opts.flatMixed) {
      const published = opts.pool.filter((q) => (area ? q.area === area : true) && q.status === "published");
      const shuffled = [...published].sort(() => Math.random() - 0.5);
      questionIds = shuffled.slice(0, Math.min(count, shuffled.length)).map((q) => q.id);
    } else {
      // "All Categories": weighted by the current blueprint, not a flat
      // shuffle -- otherwise a quiz would over-represent small-share areas
      // like Loading & Performance relative to the real exam.
      const qs = sampleQuestions({
        distribution: weightedDistribution(count),
        pool: opts.pool,
        recentQuestionIds: recent,
      });
      questionIds = qs.map((q) => q.id);
    }
  } else {
    // Study mode stays local/temporary and may be started from an exact
    // lesson-specific pool. Shuffle it so repeat study sessions are not
    // always presented in the same order, and honor an optional count.
    let studyPool: Question[];
    if (opts.skillCategory) {
      const published = opts.pool.filter((q) => q.status === "published");
      studyPool = mapQuestionsInCategory(published, opts.skillCategory as MapCategory);
    } else {
      const area = opts.areaFilter && opts.areaFilter !== "mixed" ? opts.areaFilter : null;
      studyPool = (area ? opts.pool.filter((q) => q.area === area) : opts.pool).filter((q) => q.status === "published");
    }
    const shuffled = [...studyPool].sort(() => Math.random() - 0.5);
    const count = opts.count == null ? shuffled.length : Math.min(opts.count, shuffled.length);
    questionIds = shuffled.slice(0, count).map((q) => q.id);
  }

  const attempt: Attempt = {
    id: uid("attempt"),
    officerId: officer.id,
    mode: opts.mode,
    areaFilter: opts.areaFilter,
    questionIds,
    answers: Object.fromEntries(
      questionIds.map((id) => [id, { questionId: id, choiceId: null, flagged: false, answeredAt: null }])
    ),
    startedAt: new Date().toISOString(),
    deadline,
    submittedAt: null,
    finalized: false,
  };
  if (attempt.mode !== "study") saveAttempt(attempt);
  return attempt;
}

export function recordAnswer(attempt: Attempt, questionId: string, choiceId: string): Attempt {
  const updated: Attempt = {
    ...attempt,
    answers: {
      ...attempt.answers,
      [questionId]: {
        ...attempt.answers[questionId],
        choiceId,
        answeredAt: new Date().toISOString(),
      },
    },
  };
  if (attempt.mode !== "study") saveAttempt(updated);
  return updated;
}

export function toggleFlag(attempt: Attempt, questionId: string): Attempt {
  const current = attempt.answers[questionId];
  const updated: Attempt = {
    ...attempt,
    answers: {
      ...attempt.answers,
      [questionId]: { ...current, flagged: !current.flagged },
    },
  };
  if (attempt.mode !== "study") saveAttempt(updated);
  return updated;
}

export function finalizeAttempt(attempt: Attempt, questions: Question[]): Attempt {
  const score = scoreAttempt(attempt, questions);
  const updated: Attempt = {
    ...attempt,
    submittedAt: new Date().toISOString(),
    finalized: true,
    score,
  };
  if (attempt.mode !== "study") saveAttempt(updated);
  return updated;
}

export function isExpired(attempt: Attempt, now: Date = new Date()): boolean {
  if (!attempt.deadline) return false;
  return now.getTime() >= new Date(attempt.deadline).getTime();
}

export const SIMULATION_META = { total: SIMULATION_TOTAL, distribution: SIMULATION_DISTRIBUTION };
