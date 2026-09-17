import { isDemoMode } from "./storage";
import { getSupabase } from "./supabaseClient";

export interface LessonProgress {
  lessonId: string;
  completedAt: string;
  bestKnowledgeCheckScore: number; // 0-1
}

const LOCAL_KEY = "mpd107_demo_lesson_progress_v1";

function loadLocal(): Record<string, LessonProgress> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocal(all: Record<string, LessonProgress>) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
}

export async function getAllLessonProgress(): Promise<Record<string, LessonProgress>> {
  if (isDemoMode()) return loadLocal();
  const supabase = getSupabase();
  if (!supabase) return {};
  const { data, error } = await supabase.from("part107_lesson_progress").select("*");
  if (error || !data) return {};
  const result: Record<string, LessonProgress> = {};
  for (const row of data) {
    result[row.lesson_id] = {
      lessonId: row.lesson_id,
      completedAt: row.completed_at,
      bestKnowledgeCheckScore: row.best_score,
    };
  }
  return result;
}

/** Records a lesson's knowledge-check completion. Keeps the best score if
 * the lesson was already completed before (doesn't overwrite a better
 * past attempt with a worse one). */
export async function recordLessonComplete(lessonId: string, score: number): Promise<void> {
  if (isDemoMode()) {
    const all = loadLocal();
    const prevBest = all[lessonId]?.bestKnowledgeCheckScore ?? 0;
    all[lessonId] = {
      lessonId,
      completedAt: new Date().toISOString(),
      bestKnowledgeCheckScore: Math.max(prevBest, score),
    };
    saveLocal(all);
    return;
  }
  const supabase = getSupabase();
  if (!supabase) return;
  const { data: userData } = await supabase.auth.getUser();
  const officerId = userData?.user?.id;
  if (!officerId) return;
  const { data: existing } = await supabase
    .from("part107_lesson_progress")
    .select("best_score")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  const prevBest = existing?.best_score ?? 0;
  await supabase.from("part107_lesson_progress").upsert(
    {
      officer_id: officerId,
      lesson_id: lessonId,
      completed_at: new Date().toISOString(),
      best_score: Math.max(prevBest, score),
    },
    { onConflict: "officer_id,lesson_id" }
  );
}
