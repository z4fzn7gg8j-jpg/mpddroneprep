import type { Question } from "./types";

export const MAP_CATEGORIES = [
  "Class B Airspace",
  "Class C Airspace",
  "Class D Airspace",
  "Class E Airspace",
  "Airspace Boundaries & Authorization",
  "Special-Use Airspace (MOA/Restricted/Routes)",
  "Airport Symbols, Frequencies & Traffic Patterns",
  "Lat/Long & Coordinates",
  "Obstacles, Terrain & Elevation",
  "METAR",
  "TAF",
  "Load Factor Chart",
  "General Chart Reading",
] as const;

export type MapCategory = (typeof MAP_CATEGORIES)[number];

/**
 * Classifies a visual (figure-backed) question into one of the categories
 * above, based on its subtopic/topic text. Data-driven: built and tuned
 * against the actual 130 visual questions in the current bank (see the
 * analysis in KNOWN_LIMITATIONS.md / chat history) -- re-check bucket
 * sizes if the bank grows a lot, since new subtopic wording could land in
 * "General Chart Reading" by default rather than a specific bucket.
 */
export function classifyMapQuestion(q: Question): MapCategory {
  const s = (q.subtopic + " " + q.topic).toLowerCase();
  if (s.includes("class b")) return "Class B Airspace";
  if (s.includes("class c")) return "Class C Airspace";
  if (s.includes("class d")) return "Class D Airspace";
  if (s.includes("class e")) return "Class E Airspace";
  if (
    s.includes("ctaf") || s.includes("frequency") || s.includes("airport symbol") ||
    s.includes("airport elevation") || s.includes("private airport") || s.includes("airport data") ||
    s.includes("traffic pattern") || s.includes("tower monitoring") || s.includes("vfr checkpoint")
  ) {
    return "Airport Symbols, Frequencies & Traffic Patterns";
  }
  if (s.includes("latitude") || s.includes("longitude") || s.includes("coordinate")) {
    return "Lat/Long & Coordinates";
  }
  if (
    s.includes("moa") || s.includes("restricted") || s.includes("military training route") ||
    s.includes("special-use") || s.includes("special use") || s.includes("g route")
  ) {
    return "Special-Use Airspace (MOA/Restricted/Routes)";
  }
  if (s.includes("obstacle") || s.includes("terrain") || s.includes("mef") || s.includes("elevation figure") || s.includes("msl") || s.includes("agl")) {
    return "Obstacles, Terrain & Elevation";
  }
  if (s.includes("authorization") || s.includes("shelf") || s.includes("ceiling") || s.includes("layering") || s.includes("below floor") || s.includes("notam")) {
    return "Airspace Boundaries & Authorization";
  }
  if (s.includes("metar")) return "METAR";
  if (s.includes("taf")) return "TAF";
  if (s.includes("load factor") || s.includes("bank angle")) return "Load Factor Chart";
  return "General Chart Reading";
}

export function mapQuestions(pool: Question[]): Question[] {
  return pool.filter((q) => q.figure);
}

export function mapQuestionsInCategory(pool: Question[], category: MapCategory): Question[] {
  return mapQuestions(pool).filter((q) => classifyMapQuestion(q) === category);
}

export function mapCategoryCounts(pool: Question[]): Record<MapCategory, number> {
  const counts = Object.fromEntries(MAP_CATEGORIES.map((c) => [c, 0])) as Record<MapCategory, number>;
  for (const q of mapQuestions(pool)) counts[classifyMapQuestion(q)]++;
  return counts;
}

/**
 * A lesson's question_bank_categories can list one or more MAP_CATEGORY
 * names, plus occasionally a plain FAA area name (e.g. "non-visual
 * Weather", "Loading & Performance") meaning "also include that area's
 * non-visual questions." This resolves the full practice pool for a
 * lesson from that mixed list.
 */
export function lessonPracticePool(pool: Question[], categoryTags: string[]): Question[] {
  const result = new Set<Question>();
  for (const tag of categoryTags) {
    const mapCategory = MAP_CATEGORIES.find((c) => tag.startsWith(c) || c.startsWith(tag));
    if (mapCategory) {
      for (const q of mapQuestionsInCategory(pool, mapCategory)) result.add(q);
      continue;
    }
    const t = tag.toLowerCase();
    if (t.includes("weather")) {
      for (const q of pool) if (q.area === "weather" && !q.figure) result.add(q);
    } else if (t.includes("loading") || t.includes("performance")) {
      for (const q of pool) if (q.area === "loading_performance" && !q.figure) result.add(q);
    } else if (t.includes("operations")) {
      for (const q of pool) if (q.area === "operations" && !q.figure) result.add(q);
    } else if (t.includes("regulation")) {
      for (const q of pool) if (q.area === "regulations" && !q.figure) result.add(q);
    }
  }
  return Array.from(result);
}
