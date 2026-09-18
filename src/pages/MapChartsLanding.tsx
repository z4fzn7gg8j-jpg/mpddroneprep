import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import courseData from "../data/mapChartsCourse.json";
import type { CourseContent } from "../lib/courseTypes";
import { MAP_CATEGORIES, mapCategoryCounts, mapQuestions, type MapCategory } from "../lib/mapCategories";
import { PUBLISHED_QUESTIONS } from "../lib/questionBank";
import { useAttemptController } from "../lib/useAttemptController";
import { getAllLessonProgress, type LessonProgress } from "../lib/lessonProgress";
import AttemptRunner from "../components/AttemptRunner";

const course = courseData as unknown as CourseContent;

type Tab = "study" | "practice" | "mastery";

export default function MapChartsLanding() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("study");
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const { attempt, begin, select, submit, busy, error } = useAttemptController();

  useEffect(() => {
    getAllLessonProgress().then(setProgress);
  }, []);

  const counts = mapCategoryCounts(PUBLISHED_QUESTIONS);
  const totalVisual = mapQuestions(PUBLISHED_QUESTIONS).length;
  const completedCount = Object.keys(progress).length;

  if (attempt) {
    return (
      <div>
        <h1>Map & Chart Mastery Check</h1>
        {attempt.finalized ? (
          <div className="card">
            <p style={{ fontSize: "1.4rem", fontWeight: 700 }}>
              {attempt.score?.correct}/{attempt.score?.total} ({attempt.score?.percent}%)
            </p>
            <button className="btn btn-outline" onClick={() => navigate(`/results/${attempt.id}`)}>
              Full review
            </button>
          </div>
        ) : (
          <AttemptRunner attempt={attempt} onSelect={select} onSubmit={submit} showFeedbackImmediately={false} showNavigator showTools />
        )}
      </div>
    );
  }

  return (
    <div>
      <h1>Map & Chart Reading</h1>
      <p>
        Every question here uses a real FAA figure -- sectional excerpts, weather products, the load factor
        chart. The FAA's testing supplement stays available in every lesson.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--line)" }}>
        {(["study", "practice", "mastery"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === t ? "2px solid var(--gold-500)" : "2px solid transparent",
              padding: "8px 14px",
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? "var(--navy-900)" : "var(--slate-500)",
              cursor: "pointer",
            }}
          >
            {t === "study" ? "Study" : t === "practice" ? "Practice" : "Mastery Check"}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "var(--danger-700)" }}>{error}</p>}

      {tab === "study" && (
        <div>
          <p style={{ color: "var(--slate-500)" }}>
            {completedCount} of {course.lessons.length} lessons completed. Work through them in order, or jump to any topic.
          </p>
          <div className="card">
            {course.lessons.map((lesson, i) => {
              const done = progress[lesson.id];
              return (
                <Link
                  key={lesson.id}
                  to={`/study/map-charts/${lesson.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 4px",
                    borderTop: i === 0 ? "none" : "1px solid var(--line)",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span>
                    {lesson.title} <span style={{ color: "var(--slate-500)", fontSize: "0.85rem" }}>({lesson.estimated_minutes} min)</span>
                  </span>
                  {done ? (
                    <span className="badge badge-ready">Done -- {Math.round(done.bestKnowledgeCheckScore * 100)}%</span>
                  ) : (
                    <span style={{ color: "var(--slate-300)" }}>&rarr;</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {tab === "practice" && (
        <div>
          <p style={{ color: "var(--slate-500)" }}>Jump straight to practicing a category without the lesson, if you just want reps.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => begin({ mode: "study", areaFilter: "mixed", pool: PUBLISHED_QUESTIONS })}
              style={{ gridColumn: "1 / -1" }}
            >
              All map & chart questions mixed ({totalVisual})
            </button>
            {MAP_CATEGORIES.map((c) => (
              <button
                key={c}
                className="btn btn-outline"
                disabled={busy || counts[c] === 0}
                onClick={() => begin({ mode: "study", skillCategory: c, pool: PUBLISHED_QUESTIONS })}
              >
                {c} ({counts[c]})
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "mastery" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Mixed Mastery Check</h2>
          <p>
            Randomized questions drawn from all 13 map & chart categories, mixed together -- no hints until you
            submit. Not tracked toward FAA-exam readiness the way a full Exam Simulation is; this is specifically
            for chart-reading skill.
          </p>
          <label style={{ display: "block", marginBottom: 12, maxWidth: 240 }}>
            Number of questions
            <select id="mastery-count" defaultValue={30} style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}>
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={Math.min(60, totalVisual)}>{Math.min(60, totalVisual)} (all categories represented)</option>
            </select>
          </label>
          <button
            className="btn btn-gold"
            disabled={busy}
            onClick={() => {
              const el = document.getElementById("mastery-count") as HTMLSelectElement | null;
              const count = el ? Number(el.value) : 30;
              begin({ mode: "practice", flatMixed: true, count, pool: mapQuestions(PUBLISHED_QUESTIONS) });
            }}
          >
            Start Mastery Check
          </button>
        </div>
      )}
    </div>
  );
}

export type { MapCategory };
