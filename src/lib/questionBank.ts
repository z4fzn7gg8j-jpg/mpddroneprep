import questionsRaw from "../data/questions.json";
import resourcesRaw from "../data/resources.json";
import type { Question, LearningResource, FaaArea } from "./types";

export const ALL_QUESTIONS = questionsRaw as unknown as Question[];
export const PUBLISHED_QUESTIONS = ALL_QUESTIONS.filter((q) => q.status === "published");
export const RESOURCES = resourcesRaw as unknown as LearningResource[];

export const TOTAL_TARGET = 300; // spec section 4 long-run target

export function bankCounts() {
  const byArea: Record<FaaArea, number> = {
    regulations: 0,
    airspace: 0,
    weather: 0,
    loading_performance: 0,
    operations: 0,
  };
  for (const q of PUBLISHED_QUESTIONS) byArea[q.area] += 1;
  return { total: PUBLISHED_QUESTIONS.length, byArea, draftCount: ALL_QUESTIONS.length - PUBLISHED_QUESTIONS.length };
}

export function questionById(id: string): Question | undefined {
  return ALL_QUESTIONS.find((q) => q.id === id);
}

export function resourceById(id: string): LearningResource | undefined {
  return RESOURCES.find((r) => r.id === id);
}
