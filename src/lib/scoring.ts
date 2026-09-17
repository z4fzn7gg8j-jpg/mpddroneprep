import type { Attempt, AttemptScore, AreaScore, FaaArea, Question } from "./types";

/**
 * Scores an attempt from persisted answers and the assigned question set.
 *
 * IMPORTANT: In the real deployment this function (or an equivalent) must
 * run inside a Netlify Function against the server's copy of the question
 * bank and the server's persisted answer/deadline records -- never trust a
 * score computed in, or submitted by, the browser. This module is used
 * directly by the client only in local demo mode, where there is no server
 * to trust in the first place. See netlify/functions/submit-attempt.ts.
 */
export function scoreAttempt(attempt: Attempt, questions: Question[]): AttemptScore {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const areaTallies: Record<FaaArea, { correct: number; total: number }> = {
    regulations: { correct: 0, total: 0 },
    airspace: { correct: 0, total: 0 },
    weather: { correct: 0, total: 0 },
    loading_performance: { correct: 0, total: 0 },
    operations: { correct: 0, total: 0 },
  };

  let correct = 0;
  for (const qid of attempt.questionIds) {
    const q = byId.get(qid);
    if (!q) continue;
    const ans = attempt.answers[qid];
    const isCorrect = !!ans?.choiceId && ans.choiceId === q.correctChoiceId;
    areaTallies[q.area].total += 1;
    if (isCorrect) {
      areaTallies[q.area].correct += 1;
      correct += 1;
    }
    // Unanswered questions count as incorrect -- they simply don't add to `correct`.
  }

  const total = attempt.questionIds.length;
  const byArea: AreaScore[] = (Object.keys(areaTallies) as FaaArea[])
    .filter((a) => areaTallies[a].total > 0)
    .map((a) => ({
      area: a,
      correct: areaTallies[a].correct,
      total: areaTallies[a].total,
      // No upward rounding: floor to one decimal-safe integer percent.
      percent: Math.floor((areaTallies[a].correct / areaTallies[a].total) * 1000) / 10,
    }));

  const percent = total > 0 ? Math.floor((correct / total) * 1000) / 10 : 0;
  const passedOverall = percent >= 85;
  const passedEveryArea = byArea.every((a) => a.percent >= 75);

  return { correct, total, percent, byArea, passedOverall, passedEveryArea };
}

export function chartQuestionPerformance(
  attempt: Attempt,
  questions: Question[]
): { correct: number; total: number; percent: number } | null {
  const byId = new Map(questions.map((q) => [q.id, q]));
  let correct = 0;
  let total = 0;
  for (const qid of attempt.questionIds) {
    const q = byId.get(qid);
    if (!q?.figure) continue;
    total += 1;
    const ans = attempt.answers[qid];
    if (ans?.choiceId && ans.choiceId === q.correctChoiceId) correct += 1;
  }
  if (total === 0) return null;
  return { correct, total, percent: Math.floor((correct / total) * 1000) / 10 };
}
