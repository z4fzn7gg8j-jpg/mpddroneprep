import { describe, it, expect } from "vitest";
import { ALL_QUESTIONS, RESOURCES } from "../questionBank";

describe("question bank integrity", () => {
  it("has unique question ids", () => {
    const ids = ALL_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every question exactly three choices with a valid correct choice id", () => {
    for (const q of ALL_QUESTIONS) {
      expect(q.choices.length, `${q.id} choice count`).toBe(3);
      const choiceIds = q.choices.map((c) => c.id);
      expect(new Set(choiceIds).size, `${q.id} unique choice ids`).toBe(3);
      expect(choiceIds, `${q.id} correct choice must be one of its own choices`).toContain(q.correctChoiceId);
    }
  });

  it("gives every choice a non-empty explanation", () => {
    for (const q of ALL_QUESTIONS) {
      for (const c of q.choices) {
        expect(c.explanation.length, `${q.id} choice ${c.id} explanation`).toBeGreaterThan(0);
      }
    }
  });

  it("references only resource ids that exist in the resource library", () => {
    const resourceIds = new Set(RESOURCES.map((r) => r.id));
    for (const q of ALL_QUESTIONS) {
      for (const rid of q.resourceIds) {
        expect(resourceIds.has(rid), `${q.id} references missing resource ${rid}`).toBe(true);
      }
    }
  });

  it("only marks a question published if it has no unresolved placeholder figure asset", () => {
    for (const q of ALL_QUESTIONS) {
      if (q.status === "published" && q.figure) {
        expect(q.figure.editionOrDate.toLowerCase()).not.toContain("not yet sourced");
      }
    }
  });
});
