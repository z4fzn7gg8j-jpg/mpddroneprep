import type { FaaArea, Question } from "./types";

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Simple seeded RNG (mulberry32) so a given seed reproduces a given draw,
// while different attempts get different seeds by default.
export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SampleOptions {
  distribution: Record<FaaArea, number>;
  pool: Question[]; // published questions only
  recentQuestionIds: string[]; // ids seen in the officer's recent attempts, most recent first
  seed?: number;
}

/**
 * Selects questions per the required area distribution, avoiding duplicates
 * within the attempt, preferring questions not seen recently, and spreading
 * selections across concept families to avoid clustering near-duplicate
 * variants in one attempt.
 */
export function sampleQuestions(opts: SampleOptions): Question[] {
  const { distribution, pool, recentQuestionIds } = opts;
  const rng = mulberry32(opts.seed ?? Date.now() ^ Math.floor(Math.random() * 1e9));
  const recentSet = new Set(recentQuestionIds);
  const selected: Question[] = [];

  (Object.keys(distribution) as FaaArea[]).forEach((area) => {
    const need = distribution[area];
    const areaPool = pool.filter((q) => q.area === area && q.status === "published");

    // Prefer not-recently-seen questions; fall back to recently seen ones if
    // the pool is too small to avoid repeats entirely (small initial bank).
    const fresh = shuffle(
      areaPool.filter((q) => !recentSet.has(q.id)),
      rng
    );
    const seen = shuffle(
      areaPool.filter((q) => recentSet.has(q.id)),
      rng
    );

    const candidates = [...fresh, ...seen];
    const chosen: Question[] = [];
    const usedFamilies = new Set<string>();

    // First pass: avoid picking two questions from the same concept family.
    for (const q of candidates) {
      if (chosen.length >= need) break;
      if (usedFamilies.has(q.conceptFamilyId)) continue;
      chosen.push(q);
      usedFamilies.add(q.conceptFamilyId);
    }
    // Second pass: relax the "no repeated concept family" preference, but
    // NEVER duplicate a question id within the attempt -- that rule is
    // absolute. If the area's published pool is smaller than `need` (a
    // symptom of the initial partial question bank), the attempt simply
    // contains fewer questions in that area than the target distribution,
    // rather than repeating one. Callers must surface the actual per-area
    // count used, not assume it always equals the target (see spec section
    // 8's "actual number of questions in each area on this attempt").
    if (chosen.length < need) {
      for (const q of candidates) {
        if (chosen.length >= need) break;
        if (chosen.some((c) => c.id === q.id)) continue;
        chosen.push(q);
      }
    }
    selected.push(...chosen);
  });

  return shuffle(selected, rng);
}

export function shuffleChoices<T extends { id: string }>(choices: T[], seed: number): T[] {
  return shuffle(choices, mulberry32(seed));
}
