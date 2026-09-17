import { describe, it, expect } from "vitest";
import { sampleQuestions } from "../sampling";
import { PUBLISHED_QUESTIONS } from "../questionBank";
import { SIMULATION_DISTRIBUTION } from "../types";

describe("sampleQuestions", () => {
  it("never returns a duplicate question id within one attempt (simulation distribution)", () => {
    const qs = sampleQuestions({ distribution: SIMULATION_DISTRIBUTION, pool: PUBLISHED_QUESTIONS, recentQuestionIds: [], seed: 42 });
    const ids = qs.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never selects more questions in an area than that area's published pool contains", () => {
    const qs = sampleQuestions({ distribution: SIMULATION_DISTRIBUTION, pool: PUBLISHED_QUESTIONS, recentQuestionIds: [], seed: 1 });
    const byArea: Record<string, number> = {};
    for (const q of qs) byArea[q.area] = (byArea[q.area] ?? 0) + 1;
    for (const area of Object.keys(byArea)) {
      const poolSize = PUBLISHED_QUESTIONS.filter((q) => q.area === area).length;
      expect(byArea[area]).toBeLessThanOrEqual(poolSize);
    }
  });

  it("prefers questions not seen in the officer's recent attempts when enough exist", () => {
    const regQuestions = PUBLISHED_QUESTIONS.filter((q) => q.area === "regulations");
    const recent = regQuestions.slice(0, 3).map((q) => q.id);
    const qs = sampleQuestions({
      distribution: { regulations: 2, airspace: 0, weather: 0, loading_performance: 0, operations: 0 },
      pool: PUBLISHED_QUESTIONS,
      recentQuestionIds: recent,
      seed: 99,
    });
    const overlapWithRecent = qs.filter((q) => recent.includes(q.id));
    // With more than enough non-recent questions available, none of the
    // recently seen ones should be selected.
    expect(overlapWithRecent.length).toBe(0);
  });
});
