import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import courseData from "../data/mapChartsCourse.json";
import type { CourseContent } from "../lib/courseTypes";
import SupplementFigurePanel from "../components/SupplementFigurePanel";
import KnowledgeCheck from "../components/KnowledgeCheck";
import { recordLessonComplete } from "../lib/lessonProgress";
import { lessonPracticePool } from "../lib/mapCategories";
import { PUBLISHED_QUESTIONS } from "../lib/questionBank";
import { useAttemptController } from "../lib/useAttemptController";
import AttemptRunner from "../components/AttemptRunner";

const course = courseData as unknown as CourseContent;

const FAA_SUPPLEMENT_PDF = "https://www.faa.gov/sites/faa.gov/files/training_testing/testing/supplements/sport_rec_private_akts.pdf";
const FAA_CHART_USERS_GUIDE = "https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/aero_guide/";
const FAA_REMOTE_PILOT_STUDY_GUIDE = "https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/remote_pilot_study_guide.pdf";

export default function LessonPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const lessonIndex = course.lessons.findIndex((l) => l.id === lessonId);
  const lesson = course.lessons[lessonIndex];
  const prevLesson = course.lessons[lessonIndex - 1];
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
    begin({ mode: "study", count: Math.min(15, pool.length), pool });
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
          <AttemptRunner
            attempt={attempt}
            onSelect={select}
            onSubmit={submit}
            showFeedbackImmediately
            showNavigator={false}
            showTools={false}
            onStudyDone={() => setPracticing(false)}
          />
        )}
      </div>
    );
  }

  const cover = lesson.what_you_will_cover ?? lesson.learning_objectives;
  const practiceItems = lesson.student_practice ?? [...lesson.visual_drills, ...lesson.worked_examples.map((w) => w.prompt)];

  return (
    <div>
      <p>
        <Link to="/study/map-charts">&larr; Back to Map & Chart Reading</Link>
      </p>

      {/* 1. Title + progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ marginBottom: 4 }}>{lesson.title}</h1>
        <span style={{ color: "var(--slate-500)", fontSize: "0.9rem" }}>
          Lesson {lessonIndex + 1} of {course.lessons.length} &middot; ~{lesson.estimated_minutes} min
        </span>
      </div>

      {/* 2. What you'll cover */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="section-title" style={{ fontSize: "1rem" }}>
          What you'll cover
        </h2>
        <ul style={{ marginBottom: 0 }}>
          {cover.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      </div>

      {/* 3. Main lesson content -- each section, with its figure directly below it if it has one */}
      {lesson.lesson_sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{s.heading}</h3>
            <p style={{ margin: 0 }}>{s.body}</p>
          </div>
          {s.inline_resource && (
            <SupplementFigurePanel reference={{ reference: s.inline_resource.reference, use: s.inline_resource.note ?? s.inline_resource.label }} />
          )}
        </div>
      ))}

      {/* 4. Try it */}
      {practiceItems.length > 0 && (
        <div className="card" style={{ marginBottom: 16, background: "var(--navy-100)" }}>
          <h3 style={{ marginTop: 0 }}>Try it</h3>
          <ul style={{ marginBottom: 0 }}>
            {practiceItems.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Common Test Trap */}
      {lesson.common_test_traps.length > 0 && (
        <div className="card" style={{ marginBottom: 16, background: "var(--warn-100)" }}>
          <h3 style={{ marginTop: 0, color: "var(--warn-700)" }}>Common test trap</h3>
          <ul style={{ marginBottom: 0 }}>
            {lesson.common_test_traps.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Knowledge Check */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="section-title" style={{ fontSize: "1rem" }}>
          Quick knowledge check
        </h2>
        <KnowledgeCheck key={lesson.id} items={lesson.knowledge_check} onComplete={handleComplete} />
        {checkScore !== null && (
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span className="badge badge-ready">Knowledge check: {Math.round(checkScore * 100)}%</span>
            <button className="btn btn-primary" disabled={busy} onClick={startPractice}>
              Practice This Topic
            </button>
          </div>
        )}
      </div>

      {/* 7. More resources */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="section-title" style={{ fontSize: "1rem" }}>
          More resources
        </h2>
        {lesson.recommended_videos.map((v, i) => (
          <p key={i} style={{ margin: "4px 0" }}>
            <a href={v.url} target="_blank" rel="noopener noreferrer">
              {v.title}
            </a>{" "}
            <span style={{ color: "var(--slate-500)" }}>-- {v.channel}</span>
          </p>
        ))}
        <p style={{ margin: "8px 0 0", fontSize: "0.85rem" }}>
          <a href={FAA_SUPPLEMENT_PDF} target="_blank" rel="noopener noreferrer">
            FAA-CT-8080-2H testing supplement (full PDF)
          </a>
          {" \u00b7 "}
          <a href={FAA_CHART_USERS_GUIDE} target="_blank" rel="noopener noreferrer">
            FAA Chart User's Guide
          </a>
          {" \u00b7 "}
          <a href={FAA_REMOTE_PILOT_STUDY_GUIDE} target="_blank" rel="noopener noreferrer">
            FAA Remote Pilot Study Guide
          </a>
        </p>
      </div>

      {/* 8. Bottom navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: 16 }}>
        {prevLesson ? (
          <button className="btn btn-outline" onClick={() => navigate(`/study/map-charts/${prevLesson.id}`)}>
            &larr; Previous lesson
          </button>
        ) : (
          <span />
        )}
        {nextLesson ? (
          <button className="btn btn-primary" onClick={() => navigate(`/study/map-charts/${nextLesson.id}`)}>
            Next lesson &rarr;
          </button>
        ) : (
          <button className="btn btn-gold" onClick={() => navigate("/study/map-charts")}>
            Finish course &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
