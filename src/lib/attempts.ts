import type {
  Attempt,
  AttemptMode,
  FaaArea,
  Question,
} from "./types";
import {
  SIMULATION_DISTRIBUTION,
  SIMULATION_TOTAL,
} from "./types";
import { sampleQuestions } from "./sampling";
import { loadAttempts, saveAttempt, getDemoOfficer } from "./storage";
import { scoreAttempt } from "./scoring";

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

export interface StartAttemptOptions {
  mode: AttemptMode;
  areaFilter?: FaaArea | "mixed";
  count?: number; // for practice quizzes: 10, 20, 30
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
    const pool = area ? opts.pool.filter((q) => q.area === area) : opts.pool;
    const published = pool.filter((q) => q.status === "published");
    const shuffled = [...published].sort(() => Math.random() - 0.5);
    questionIds = shuffled.slice(0, Math.min(count, shuffled.length)).map((q) => q.id);
  } else {
    // study mode: pull all published questions for the selected area/topic,
    // unrestricted practice, no fixed count.
    const area = opts.areaFilter && opts.areaFilter !== "mixed" ? opts.areaFilter : null;
    const pool = area ? opts.pool.filter((q) => q.area === area) : opts.pool;
    questionIds = pool.filter((q) => q.status === "published").map((q) => q.id);
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
  saveAttempt(attempt);
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
  saveAttempt(updated);
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
  saveAttempt(updated);
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
  saveAttempt(updated);
  return updated;
}

export function isExpired(attempt: Attempt, now: Date = new Date()): boolean {
  if (!attempt.deadline) return false;
  return now.getTime() >= new Date(attempt.deadline).getTime();
}

export const SIMULATION_META = { total: SIMULATION_TOTAL, distribution: SIMULATION_DISTRIBUTION };
