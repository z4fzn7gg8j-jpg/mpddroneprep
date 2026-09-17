// Core domain types for MPD Part 107 Readiness.
// These types are shared conceptually between the client demo-mode engine
// (src/lib/*) and the Netlify Functions / Supabase schema (netlify/functions,
// supabase/schema.sql). Keep them in sync if the schema changes.

export type FaaArea =
  | "regulations"
  | "airspace"
  | "weather"
  | "loading_performance"
  | "operations";

export const FAA_AREA_LABELS: Record<FaaArea, string> = {
  regulations: "Regulations",
  airspace: "Airspace Classification and Operating Requirements",
  weather: "Weather",
  loading_performance: "Loading and Performance",
  operations: "Operations",
};

// Published content-percentage blueprint from PSI's Applicant Information
// Bulletin (the FAA's testing vendor), effective September 29, 2025. This
// superseded the older FAA-S-ACS-10B percentage-range table -- the FAA's
// August 2025 Airman Testing Community Advisory states that older table
// is now obsolete and directs applicants to the PSI bulletin instead:
// https://media.psiexams.com/faa/UAG_Information_Bulletin.pdf
// Verified against independent current sources in September 2026.
// Re-verify before each content review cycle -- the app does not
// auto-check this, and the FAA/PSI can revise the blueprint again.
export const FAA_PUBLISHED_RANGE: Record<FaaArea, [number, number]> = {
  regulations: [48, 48],
  airspace: [20, 20],
  weather: [5, 5],
  loading_performance: [2, 2],
  operations: [25, 25],
};

// Closest whole-question representation of the 48/20/5/2/25 blueprint at
// 60 questions (the same count as the real UAG exam's scored questions).
// The real exam also includes 5 unscored "validation" questions mixed in
// indistinguishably (65 total, all counted toward the 120-minute time
// limit) -- this simulation does not replicate those, since they carry no
// study value: the examinee cannot tell them apart from scored ones, and
// reproducing that indistinguishability would only add complexity without
// teaching anything.
export const SIMULATION_DISTRIBUTION: Record<FaaArea, number> = {
  regulations: 29,
  airspace: 12,
  weather: 3,
  loading_performance: 1,
  operations: 15,
};
export const SIMULATION_TOTAL = 60;


export type QuestionStatus = "draft" | "published" | "retired";
export type Difficulty = "intro" | "standard" | "advanced";

export interface AnswerChoice {
  id: string; // stable choice id, e.g. "A" | "B" | "C" -- stable within the question, not globally unique
  text: string;
  explanation: string; // why this choice is right/wrong
}

export interface FigureRef {
  figureId: string; // e.g. "faa-sectional-excerpt-04"
  title: string;
  editionOrDate: string;
  sourceUrl: string;
  isHistoricalTrainingCopy: boolean; // true => must be visually labeled "training material, not current"
}

export interface LearningResource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  topic: string;
  timestampNote?: string;
  lastReviewed: string; // ISO date
  status: "ok" | "flagged_broken" | "flagged_outdated";
}

export interface Question {
  id: string; // stable id, e.g. "REG-0007"
  version: number;
  status: QuestionStatus;
  area: FaaArea;
  topic: string;
  subtopic: string;
  acsCode: string; // verified ACS reference code
  difficulty: Difficulty;
  conceptFamilyId: string; // groups near-duplicate variants so sampling can avoid clustering
  text: string;
  choices: AnswerChoice[]; // exactly 3, per spec
  correctChoiceId: string;
  sourceUrls: string[];
  figure?: FigureRef;
  resourceIds: string[]; // links into resources.json
  lastReviewed: string; // ISO date
  // Teaching fields (optional -- older data may not have them).
  teachingExplanation?: string; // full explanation tying the answer to the rule/figure
  howToSolve?: string; // repeatable method for this type of question
  memoryTip?: string; // short takeaway/mnemonic
  reviewPrompt?: string; // prompts the learner to restate the reasoning
}

export type AttemptMode = "study" | "practice" | "simulation";

export interface AttemptAnswer {
  questionId: string;
  choiceId: string | null; // null = unanswered
  flagged: boolean;
  answeredAt: string | null;
}

export interface Attempt {
  id: string;
  officerId: string;
  mode: AttemptMode;
  areaFilter?: FaaArea | "mixed";
  questionIds: string[]; // order as presented, persisted at start
  answers: Record<string, AttemptAnswer>;
  startedAt: string;
  deadline: string | null; // server-computed for simulation mode; null for untimed modes
  submittedAt: string | null;
  finalized: boolean;
  score?: AttemptScore;
}

export interface AreaScore {
  area: FaaArea;
  correct: number;
  total: number;
  percent: number;
}

export interface AttemptScore {
  correct: number;
  total: number;
  percent: number;
  byArea: AreaScore[];
  passedOverall: boolean; // >= 85% for simulation-readiness purposes; see readiness.ts
  passedEveryArea: boolean; // every area >= 75%, no upward rounding
}

export type ReadinessStatus =
  | "developing"
  | "nearly_ready"
  | "one_qualifying_attempt"
  | "recommended_to_schedule";

export interface ReadinessResult {
  status: ReadinessStatus;
  latestSimulationPercent: number | null;
  qualifyingAttempts: Attempt[]; // 0, 1, or 2 attempts counted
  remaining: string[]; // human-readable list of what's left to qualify
  chartQuestionPerformance: { correct: number; total: number; percent: number } | null;
}

export interface Officer {
  id: string;
  name: string;
  email: string;
  role: "officer" | "coordinator";
}
