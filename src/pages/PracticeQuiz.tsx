import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Attempt, FaaArea } from "../lib/types";
import { FAA_AREA_LABELS } from "../lib/types";
import { PUBLISHED_QUESTIONS, ALL_QUESTIONS } from "../lib/questionBank";
import { useAttemptController } from "../lib/useAttemptController";
import AttemptRunner from "../components/AttemptRunner";

const AREAS = Object.keys(FAA_AREA_LABELS) as FaaArea[];

export default function PracticeQuiz() {
  const navigate = useNavigate();
  const [count, setCount] = useState<10 | 20 | 30>(10);
  const [area, setArea] = useState<FaaArea | "mixed">("mixed");
  const { attempt, begin, select, submit, busy, error } = useAttemptController();

  function retryMissed(finished: Attempt) {
    const missedIds = finished.questionIds.filter((id) => finished.answers[id]?.choiceId !== ALL_QUESTIONS.find((q) => q.id === id)?.correctChoiceId);
    if (missedIds.length === 0) return;
    const pool = ALL_QUESTIONS.filter((q) => missedIds.includes(q.id));
    begin({ mode: "practice", areaFilter: "mixed", count: pool.length, pool });
  }

  function practiceMissedTopic(finished: Attempt) {
    const missed = finished.questionIds
      .map((id) => ALL_QUESTIONS.find((q) => q.id === id)!)
      .filter((q) => finished.answers[q.id]?.choiceId !== q.correctChoiceId);
    if (missed.length === 0) return;
    const tally: Record<string, number> = {};
    for (const q of missed) tally[q.area] = (tally[q.area] ?? 0) + 1;
    const weakest = (Object.keys(tally) as FaaArea[]).sort((a, b) => tally[b] - tally[a])[0];
    setArea(weakest);
  }

  if (attempt?.finalized) {
    return (
      <div>
        <h1>Practice Quiz results</h1>
        <p style={{ color: "var(--slate-500)" }}>This attempt does not count toward readiness.</p>
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>
            {attempt.score?.correct}/{attempt.score?.total} ({attempt.score?.percent}%)
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => retryMissed(attempt)}>
            Retry missed questions
          </button>
          <button className="btn btn-outline" onClick={() => practiceMissedTopic(attempt)}>
            Practice missed topics
          </button>
          <button className="btn btn-outline" onClick={() => navigate(`/results/${attempt.id}`)}>
            Full review
          </button>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div>
        <h1>Practice Quiz</h1>
        <p>Choose a length and a subject. Results show after you submit. These attempts don't count toward readiness.</p>
        {error && <p style={{ color: "var(--danger-700)" }}>{error}</p>}
        <div className="card" style={{ maxWidth: 420 }}>
          <label style={{ display: "block", marginBottom: 12 }}>
            Number of questions
            <select value={count} onChange={(e) => setCount(Number(e.target.value) as 10 | 20 | 30)} style={{ display: "block", marginTop: 4, width: "100%", padding: 8 }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
            </select>
          </label>
          <label style={{ display: "block", marginBottom: 16 }}>
            Subject
            <select value={area} onChange={(e) => setArea(e.target.value as FaaArea | "mixed")} style={{ display: "block", marginTop: 4, width: "100%", padding: 8 }}>
              <option value="mixed">Balanced mixed quiz</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {FAA_AREA_LABELS[a]}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" disabled={busy} onClick={() => begin({ mode: "practice", areaFilter: area, count, pool: PUBLISHED_QUESTIONS })}>
            Start quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Practice Quiz</h1>
      <AttemptRunner
        attempt={attempt}
        onSelect={select}
        onSubmit={submit}
        showFeedbackImmediately={false}
        showNavigator={false}
        showTools={false}
      />
    </div>
  );
}
