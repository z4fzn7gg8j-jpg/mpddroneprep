import { describe, it, expect } from "vitest";
import { scoreAttempt } from "../scoring";
import type { Attempt, Question } from "../types";

function makeQuestion(id: string, area: Question["area"], correct = "A"): Question {
  return {
    id,
    version: 1,
    status: "published",
    area,
    topic: "t",
    subtopic: "s",
    acsCode: "X.1",
    difficulty: "standard",
    conceptFamilyId: `${id}-fam`,
    text: "q",
    choices: [
      { id: "A", text: "a", explanation: "" },
      { id: "B", text: "b", explanation: "" },
      { id: "C", text: "c", explanation: "" },
    ],
    correctChoiceId: correct,
    sourceUrls: [],
    resourceIds: [],
    lastReviewed: "2026-01-01",
  };
}

function makeAttempt(questions: Question[], answers: Record<string, string | null>): Attempt {
  return {
    id: "a1",
    officerId: "o1",
    mode: "simulation",
    questionIds: questions.map((q) => q.id),
    answers: Object.fromEntries(
      questions.map((q) => [
        q.id,
        { questionId: q.id, choiceId: answers[q.id] ?? null, flagged: false, answeredAt: null },
      ])
    ),
    startedAt: new Date().toISOString(),
    deadline: null,
    submittedAt: null,
    finalized: false,
  };
}

describe("scoreAttempt", () => {
  it("counts unanswered questions as incorrect", () => {
    const qs = [makeQuestion("Q1", "regulations"), makeQuestion("Q2", "regulations")];
    const attempt = makeAttempt(qs, { Q1: "A", Q2: null });
    const score = scoreAttempt(attempt, qs);
    expect(score.correct).toBe(1);
    expect(score.total).toBe(2);
    expect(score.percent).toBe(50);
  });

  it("does not round area percent upward", () => {
    // 2/3 = 66.666...% -> must floor to 66.6, never round up to 66.7 or 67.
    const qs = [
      makeQuestion("Q1", "weather"),
      makeQuestion("Q2", "weather"),
      makeQuestion("Q3", "weather"),
    ];
    const attempt = makeAttempt(qs, { Q1: "A", Q2: "A", Q3: "B" });
    const score = scoreAttempt(attempt, qs);
    const wx = score.byArea.find((a) => a.area === "weather")!;
    expect(wx.percent).toBeLessThanOrEqual(66.6);
    expect(wx.percent).toBeGreaterThan(66.5);
  });

  it("flags passedEveryArea only when every represented area clears the floor", () => {
    const qs = [
      makeQuestion("R1", "regulations"),
      makeQuestion("R2", "regulations"),
      makeQuestion("R3", "regulations"),
      makeQuestion("W1", "weather"),
    ];
    // regulations: 2/3 = 66.6% (below 75) -> should fail passedEveryArea
    const attempt = makeAttempt(qs, { R1: "A", R2: "A", R3: "B", W1: "A" });
    const score = scoreAttempt(attempt, qs);
    expect(score.passedEveryArea).toBe(false);
  });

  it("scores correctly regardless of choice presentation order (shuffled choices)", () => {
    const q = makeQuestion("Q1", "operations", "C");
    // Choices are still keyed by stable id -- shuffling display order must
    // not affect which choice id is "correct".
    const shuffledDisplay = [...q.choices].reverse();
    const attempt = makeAttempt([q], { Q1: "C" });
    const score = scoreAttempt(attempt, [{ ...q, choices: shuffledDisplay }]);
    expect(score.correct).toBe(1);
  });
});
