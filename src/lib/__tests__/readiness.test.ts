import { describe, it, expect } from "vitest";
import { computeReadiness } from "../readiness";
import type { Attempt, AttemptScore } from "../types";

function makeScore(percent: number, everyAreaPass: boolean): AttemptScore {
  return {
    correct: Math.round((percent / 100) * 60),
    total: 60,
    percent,
    byArea: [
      { area: "regulations", correct: 10, total: 12, percent: everyAreaPass ? 83.3 : 60 },
      { area: "airspace", correct: 10, total: 12, percent: 83.3 },
      { area: "weather", correct: 6, total: 8, percent: 75 },
      { area: "loading_performance", correct: 5, total: 6, percent: 83.3 },
      { area: "operations", correct: 18, total: 22, percent: 81.8 },
    ],
    passedOverall: percent >= 85,
    passedEveryArea: everyAreaPass,
  };
}

function makeSimAttempt(id: string, daysAgo: number, score: AttemptScore): Attempt {
  const submitted = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  return {
    id,
    officerId: "o1",
    mode: "simulation",
    questionIds: [],
    answers: {},
    startedAt: submitted,
    deadline: null,
    submittedAt: submitted,
    finalized: true,
    score,
  };
}

describe("computeReadiness", () => {
  it("is 'developing' with no simulations", () => {
    expect(computeReadiness([], []).status).toBe("developing");
  });

  it("is 'nearly_ready' at >=70% but below the qualifying bar", () => {
    const attempts = [makeSimAttempt("a1", 1, makeScore(72, true))];
    expect(computeReadiness(attempts, []).status).toBe("nearly_ready");
  });

  it("is 'one_qualifying_attempt' with exactly one qualifying simulation", () => {
    const attempts = [makeSimAttempt("a1", 1, makeScore(88, true))];
    expect(computeReadiness(attempts, []).status).toBe("one_qualifying_attempt");
  });

  it("is 'recommended_to_schedule' with two qualifying simulations within 30 days", () => {
    const attempts = [makeSimAttempt("a1", 1, makeScore(88, true)), makeSimAttempt("a2", 10, makeScore(90, true))];
    expect(computeReadiness(attempts, []).status).toBe("recommended_to_schedule");
  });

  it("does not count a qualifying simulation older than 30 days", () => {
    const attempts = [makeSimAttempt("a1", 1, makeScore(88, true)), makeSimAttempt("a2", 40, makeScore(90, true))];
    const result = computeReadiness(attempts, []);
    expect(result.status).toBe("one_qualifying_attempt");
  });

  it("requires every area >=75% even if overall score clears 85%", () => {
    // Overall 86% but regulations area only 60% -- must not qualify.
    const attempts = [makeSimAttempt("a1", 1, makeScore(86, false))];
    const result = computeReadiness(attempts, []);
    expect(result.status).not.toBe("one_qualifying_attempt");
    expect(result.status).not.toBe("recommended_to_schedule");
  });
});
