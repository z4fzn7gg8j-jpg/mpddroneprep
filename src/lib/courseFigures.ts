// Matches free-text supplement references from the course content (e.g.
// "Figure 23, Area 3", "FAA-CT-8080-2H Legend 1", "Figures 20-26") to a
// bundled figure asset id from src/lib/figures.ts, where one exists.
// Returns null for references we don't have a real asset for yet (e.g.
// "Figure 72" mentioned only as an optional aside, or generic "Figures
// 20-26" ranges where no single figure is intended) -- callers should
// show the clean placeholder + "Open FAA Supplement" fallback in that case,
// per the content contract ("Do not break the lesson").

const FIGURE_ID_MAP: Record<string, string> = {
  "legend 1": "faa-legend1-sectional-chart",
  "figure 2": "faa-fig2-load-factor-chart",
  "figure 12": "faa-fig12-metar",
  "figure 15": "faa-fig15-taf",
  "figure 20": "faa-fig20-sectional-excerpt-norfolk",
  "figure 21": "faa-fig21-sectional-excerpt-nd",
  "figure 22": "faa-fig22-sectional-excerpt-coeur-dalene",
  "figure 23": "faa-fig23-sectional-excerpt-savannah",
  "figure 24": "faa-fig24-sectional-excerpt-ne-texas",
  "figure 25": "faa-fig25-sectional-excerpt-dallas",
  "figure 26": "faa-fig26-sectional-excerpt-nd",
  "figure 59": "faa-fig59-sectional-excerpt-toledo",
  "figure 69": "faa-fig69-sectional-excerpt-corpus-christi",
  "figure 74": "faa-fig74-sectional-excerpt-san-jose",
  "figure 75": "faa-fig75-sectional-excerpt-buckeye-az",
  "figure 78": "faa-fig78-sectional-excerpt-sioux-city",
};

/** Returns every bundled figure id a reference string points to (a range
 * like "Figures 20-26" can match several). Empty array if none match. */
export function resolveSupplementReference(reference: string): string[] {
  const s = reference.toLowerCase();
  const matches: string[] = [];

  // Explicit range, e.g. "Figures 20-26" or "Figures 20-23"
  const rangeMatch = s.match(/figures?\s+(\d+)\s*[-\u2013]\s*(\d+)/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    for (let n = start; n <= end; n++) {
      const id = FIGURE_ID_MAP[`figure ${n}`];
      if (id) matches.push(id);
    }
    if (matches.length > 0) return matches;
  }

  for (const [key, id] of Object.entries(FIGURE_ID_MAP)) {
    if (s.includes(key)) matches.push(id);
  }
  return matches;
}
