import { useMemo, useState } from "react";
import type { Attempt } from "../lib/types";
import { ALL_QUESTIONS } from "../lib/questionBank";
import QuestionCard from "./QuestionCard";
import Timer from "./Timer";
import Calculator from "./Calculator";
import ScratchPad from "./ScratchPad";

interface AttemptRunnerProps {
  attempt: Attempt;
  onSelect: (questionId: string, choiceId: string) => void;
  onToggleFlag?: (questionId: string) => void;
  onSubmit: () => void;
  showFeedbackImmediately: boolean; // Study Mode = true; everything else = false until submit
  showNavigator: boolean; // Exam Simulation = true
  showTools: boolean; // calculator + scratch pad, available during simulation
}

export default function AttemptRunner({
  attempt,
  onSelect,
  onToggleFlag,
  onSubmit,
  showFeedbackImmediately,
  showNavigator,
  showTools,
}: AttemptRunnerProps) {
  const [index, setIndex] = useState(0);
  const questions = useMemo(
    () => attempt.questionIds.map((id) => ALL_QUESTIONS.find((q) => q.id === id)!).filter(Boolean),
    [attempt.questionIds]
  );
  const q = questions[index];
  const ans = q ? attempt.answers[q.id] : undefined;

  function handleExpire() {
    if (!attempt.finalized) onSubmit();
  }

  const unansweredCount = questions.filter((qq) => !attempt.answers[qq.id]?.choiceId).length;
  const flaggedCount = questions.filter((qq) => attempt.answers[qq.id]?.flagged).length;

  if (questions.length === 0) {
    return (
      <div className="card">
        <p>No questions matched this selection yet. Try a different area, or check back as the question bank grows.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: showNavigator || showTools ? "1fr 260px" : "1fr", gap: 20 }}>
      <div>
        {attempt.deadline && !attempt.finalized && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Timer deadlineIso={attempt.deadline} onExpire={handleExpire} />
          </div>
        )}

        <QuestionCard
          question={q}
          index={index}
          total={questions.length}
          selectedChoiceId={ans?.choiceId ?? null}
          flagged={ans?.flagged ?? false}
          showFeedback={showFeedbackImmediately}
          onSelect={(choiceId) => onSelect(q.id, choiceId)}
          onToggleFlag={showNavigator && onToggleFlag ? () => onToggleFlag(q.id) : undefined}
        />

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
          <button className="btn btn-outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
            ← Previous
          </button>
          <button
            className="btn btn-outline"
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            disabled={index === questions.length - 1}
          >
            Next →
          </button>
        </div>

        {!attempt.finalized && (
          <div className="card" style={{ marginTop: 16 }}>
            <p style={{ margin: 0 }}>
              {unansweredCount} unanswered{showNavigator ? `, ${flaggedCount} flagged` : ""} of {questions.length}.
              {unansweredCount > 0
                ? " Answer every question to enable Submit."
                : attempt.mode === "simulation" && " Unanswered questions count as incorrect at submission."}
            </p>
            <button className="btn btn-primary" onClick={onSubmit} disabled={unansweredCount > 0} style={{ marginTop: 10 }}>
              Submit {attempt.mode === "simulation" ? "exam" : "quiz"}
            </button>
          </div>
        )}
      </div>


      {(showNavigator || showTools) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {showNavigator && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Navigator</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                {questions.map((qq, i) => {
                  const a = attempt.answers[qq.id];
                  const bg = a?.flagged
                    ? "var(--gold-100)"
                    : a?.choiceId
                    ? "var(--navy-100)"
                    : "var(--white)";
                  return (
                    <button
                      key={qq.id}
                      className="btn btn-outline"
                      style={{ padding: "4px 0", background: bg, fontWeight: i === index ? 700 : 400 }}
                      onClick={() => setIndex(i)}
                      aria-current={i === index}
                      aria-label={`Question ${i + 1}${a?.flagged ? ", flagged" : ""}${a?.choiceId ? ", answered" : ", unanswered"}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {showTools && (
            <>
              <Calculator />
              <ScratchPad attemptId={attempt.id} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
