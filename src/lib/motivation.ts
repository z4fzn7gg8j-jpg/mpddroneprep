import type { ReadinessStatus } from "./types";

/**
 * Completion message shown right after a quiz/exam is scored, tiered by
 * how the officer did. All original copy. Struggling scores are reframed
 * as useful information now rather than on the real test, not as failure.
 */
export function completionMessage(percent: number, mode: "simulation" | "practice"): string {
  const examLike = mode === "simulation";
  if (percent >= 90) {
    return examLike
      ? "That's a strong result. Whatever you're doing to study, keep doing it."
      : "Excellent run. That's the kind of score that carries straight into a real simulation.";
  }
  if (percent >= 85) {
    return examLike
      ? "Right at the qualifying line. One more like this and you're looking at Recommended to Schedule."
      : "Solid work -- you're operating right around exam-ready territory.";
  }
  if (percent >= 70) {
    return "You're past the FAA's own passing line. The gap left is between passing and being genuinely sharp -- worth closing before test day.";
  }
  if (percent >= 50) {
    return "This is exactly what practice is for -- better to find the gaps here than in the actual testing room. Look at the areas below and go targeted.";
  }
  return "Rough one, and that's fine -- this is the low-stakes place to have it happen. Pick the weakest area below and start there.";
}

/**
 * A short, warm line for every readiness status, not just the top one --
 * the app shouldn't go quiet just because someone isn't there yet.
 */
export function readinessEncouragement(status: ReadinessStatus): string {
  switch (status) {
    case "developing":
      return "Everyone starts here. The first timed simulation is mostly about finding out what to study next.";
    case "nearly_ready":
      return "You're close. The areas below are the specific things standing between you and a qualifying attempt.";
    case "one_qualifying_attempt":
      return "One qualifying simulation down. One more like it, within 30 days, and you're recommended to schedule.";
    case "recommended_to_schedule":
      return "You've cleared the bar twice. That's not luck -- that's consistency.";
  }
}
