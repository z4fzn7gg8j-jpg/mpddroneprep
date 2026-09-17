import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import courseData from "../data/mapChartsCourse.json";
import type { CourseContent } from "../lib/courseTypes";
import SupplementFigurePanel from "../components/SupplementFigurePanel";
import KnowledgeCheck from "../components/KnowledgeCheck";
import { recordLessonComplete, getAllLessonProgress } from "../lib/lessonProgress";
import { lessonPracticePool } from "../lib/mapCategories";
import { PUBLISHED_QUESTIONS } from "../lib/questionBank";
import { useAttemptController } from "../lib/useAttemptController";
import AttemptRunner from "../components/AttemptRunner";

const course = courseData as unknown as CourseContent;

export default function LessonPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const lessonIndex = course.lessons.findIndex((l) => l.id === lessonId);
  const lesson = course.lessons[lessonIndex];
  const nextLesson = course.lessons[lessonIndex + 1];

  const [checkScore, setCheckScore] = useState<number | null>(null);
  const [practicing, setPracticing] = useState(false);
  const { attempt, begin, select, submit, busy } = useAttemptController();

  useEffect(() => {
    setCheckScore(null);
    setPracticing(false);
    window.scrollTo(0, 0);
  }, [lessonId]);

  if (!lesson) {
    return (
      <div className="card">
        <p>Lesson not found.</p>
        <Link to="/study/map-charts">&larr; Back to Map & Chart Reading</Link>
      </div>
    );
  }

  async function handleComplete(score: number) {
    setCheckScore(score);
    await recordLessonComplete(lesson.id, score);
  }

  function startPractice() {
    const pool = lessonPracticePool(PUBLISHED_QUESTIONS, lesson.question_bank_categories);
    setPracticing(true);
    begin({ mode: "practice", count: Math.min(15, pool.length), pool });
  }

  if (practicing && attempt) {
    return (
      <div>
        <h1>Practicing: {lesson.title}</h1>
        {attempt.finalized ? (
          <div className="card">
            <p style={{ fontSize: "1.3rem", fontWeight: 700 }}>
              {attempt.score?.correct}/{attempt.score?.total} ({attempt.score?.percent}%)
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setPracticing(false)}>
                Back to lesson
              </button>
              {nextLesson && (
                <button className="btn btn-primary" onClick={() => navigate(`/study/map-charts/${nextLesson.id}`)}>
                  Next lesson &rarr;
                </button>
              )}
            </div>
          </div>
        ) : (
          <AttemptRunner attempt={attempt} onSelect={select} onSubmit={submit} showFeedbackImmediately={false} showNavigator={false} showTools={false} />
        )}
      </div>
    );
  }

  return (
    <div>
      <p>
        <Link to="/study/map-charts">&larr; Back to Map & Chart Reading</Link>
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ marginBottom: 4 }}>{lesson.title}</h1>
        <span style={{ color: "var(--slate-500)", fontSize: "0.9rem" }}>
          Lesson {lessonIndex + 1} of {course.lessons.length} &middot; ~{lesson.estimated_minutes} min
        </span>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="section-title" style={{ fontSize: "1rem" }}>
          Why this matters
        </h2>
        <ul style={{ marginBottom: 0 }}>
          {lesson.learning_objectives.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      </div>

      {lesson.supplement_references.map((ref, i) => (
        <SupplementFigurePanel key={i} reference={ref} />
      ))}

      {lesson.lesson_sections.map((s, i) => (
        <div key={i} className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>{s.heading}</h3>
          <p style={{ margin: 0 }}>{s.body}</p>
        </div>
      ))}

      {lesson.visual_drills.length > 0 && (
        <div className="card" style={{ marginBottom: 16, background: "var(--navy-100)" }}>
          <h3 style={{ marginTop: 0 }}>Visual drills</h3>
          <ul style={{ marginBottom: 0 }}>
            {lesson.visual_drills.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {lesson.worked_examples.map((ex, i) => (
        <div key={i} className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Worked example</h3>
          <p style={{ fontWeight: 600 }}>{ex.prompt}</p>
          <ol>
            {ex.steps.map((step, si) => (
              <li key={si}>{step}</li>
            ))}
          </ol>
          <p style={{ margin: 0, color: "var(--success-700)" }}>
            <strong>Answer:</strong> {ex.answer}
          </p>
        </div>
      ))}

      {lesson.common_test_traps.length > 0 && (
        <div className="card" style={{ marginBottom: 16, background: "var(--warn-100)" }}>
          <h3 style={{ marginTop: 0, color: "var(--warn-700)" }}>Common test traps</h3>
          <ul style={{ marginBottom: 0 }}>
            {lesson.common_test_traps.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="section-title" style={{ fontSize: "1rem" }}>
          Quick knowledge check
        </h2>
        <KnowledgeCheck items={lesson.knowledge_check} onComplete={handleComplete} />
      </div>

      {checkScore !== null && (
        <>
          {lesson.recommended_videos.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 className="section-title" style={{ fontSize: "1rem" }}>
                Watch a video (optional)
              </h2>
              {lesson.recommended_videos.map((v, i) => (
                <p key={i} style={{ margin: "4px 0" }}>
                  <a href={v.url} target="_blank" rel="noreferrer">
                    {v.title}
                  </a>{" "}
                  <span style={{ color: "var(--slate-500)" }}>-- {v.channel}</span>
                </p>
              ))}
            </div>
          )}

          <div className="card" style={{ marginBottom: 16, background: "var(--gold-100)" }}>
            <h2 style={{ marginTop: 0 }}>Knowledge check: {Math.round(checkScore * 100)}%</h2>
            <p style={{ margin: "0 0 12px" }}>
              Mastery standard: {lesson.mastery_standard}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-primary" disabled={busy} onClick={startPractice}>
                Practice This Topic
              </button>
              {nextLesson && (
                <button className="btn btn-outline" onClick={() => navigate(`/study/map-charts/${nextLesson.id}`)}>
                  Next lesson: {nextLesson.title.replace(/^\d+\.\s*/, "")} &rarr;
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Re-exported so the landing page can show real completion state without
// a second data-fetch implementation.
export { getAllLessonProgress };
