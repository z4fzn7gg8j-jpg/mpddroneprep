import type { Attempt, ReadinessResult, ReadinessStatus, Question } from "./types";
import { chartQuestionPerformance } from "./scoring";

// Kept configurable per spec section 6 ("Keep thresholds configurable").
// Change these in one place; the coordinator dashboard should eventually
// expose them as an editable setting backed by the database rather than
// this constant, once a server exists to store the override.
export const READINESS_CONFIG = {
  overallPercentMin: 85,
  areaPercentMin: 75,
  recentWindowDays: 30,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isWithinWindow(iso: string, days: number, now: Date): boolean {
  const t = new Date(iso).getTime();
  return now.getTime() - t <= days * DAY_MS;
}

export function computeReadiness(
  allAttempts: Attempt[],
  questions: Question[],
  now: Date = new Date()
): ReadinessResult {
  const simulations = allAttempts
    .filter((a) => a.mode === "simulation" && a.finalized && a.score)
    .sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime());

  const latest = simulations[0] ?? null;
  const latestPercent = latest?.score?.percent ?? null;

  const qualifies = (a: Attempt) =>
    !!a.score &&
    a.score.percent >= READINESS_CONFIG.overallPercentMin &&
    a.score.passedEveryArea &&
    isWithinWindow(a.submittedAt ?? a.startedAt, READINESS_CONFIG.recentWindowDays, now);
  // Note: "without a paused timer" is enforced upstream at submission time
  // (the server must reject/flag attempts where the deadline was tampered
  // with or extended); this function trusts attempt.finalized + score as
  // already having passed that check.

  const qualifyingAttempts = simulations.filter(qualifies).slice(0, 2);

  let status: ReadinessStatus = "developing";
  const remaining: string[] = [];

  if (qualifyingAttempts.length >= 2) {
    status = "recommended_to_schedule";
  } else if (qualifyingAttempts.length === 1) {
    status = "one_qualifying_attempt";
    remaining.push(
      "One more qualifying timed simulation (>=85% overall, >=75% in every area) within the last 30 days."
    );
  } else if (latestPercent !== null && latestPercent >= 70) {
    status = "nearly_ready";
    if (latest?.score) {
      if (latest.score.percent < READINESS_CONFIG.overallPercentMin) {
        remaining.push(
          `Raise overall score to at least ${READINESS_CONFIG.overallPercentMin}% (currently ${latest.score.percent}%).`
        );
      }
      const weakAreas = latest.score.byArea.filter((a) => a.percent < READINESS_CONFIG.areaPercentMin);
      if (weakAreas.length > 0) {
        remaining.push(
          `Bring every area to at least ${READINESS_CONFIG.areaPercentMin}%: ${weakAreas
            .map((a) => `${a.area} (${a.percent}%)`)
            .join(", ")}.`
        );
      }
      if (!isWithinWindow(latest.submittedAt ?? latest.startedAt, READINESS_CONFIG.recentWindowDays, now)) {
        remaining.push("Latest simulation is older than 30 days and no longer counts as recent.");
      }
    }
    remaining.push("Then repeat with a second qualifying simulation within 30 days of the first.");
  } else {
    status = "developing";
    remaining.push("Complete a timed 60-question FAA Exam Simulation to establish a baseline.");
  }

  const chart = latest ? chartQuestionPerformance(latest, questions) : null;

  return {
    status,
    latestSimulationPercent: latestPercent,
    qualifyingAttempts,
    remaining,
    chartQuestionPerformance: chart,
  };
}

export const READINESS_LABELS: Record<ReadinessStatus, string> = {
  developing: "Developing",
  nearly_ready: "Nearly Ready",
  one_qualifying_attempt: "One Qualifying Attempt",
  recommended_to_schedule: "Recommended to Schedule",
};
