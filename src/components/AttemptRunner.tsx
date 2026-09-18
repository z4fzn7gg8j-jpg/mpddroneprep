import { useMemo, useState } from "react";
import type { Attempt } from "../lib/types";
import { ALL_QUESTIONS } from "../lib/questionBank";
import QuestionCard from "./QuestionCard";
import Timer from "./Timer";
import Calculator from "./Calculator";
import ScratchPad from "./ScratchPad";
import { figureSrc } from "../lib/figures";

interface AttemptRunnerProps {
  attempt: Attempt;
  onSelect: (questionId: string, choiceId: string) => void;
  onToggleFlag?: (questionId: string) => void;
  onSubmit: () => void;
  showFeedbackImmediately: boolean; // Study Mode = submit each answer, then reveal feedback
  showNavigator: boolean; // Exam Simulation = true
  showTools: boolean; // calculator + scratch pad, available during simulation
  showLegend?: boolean; // quick-access sectional chart legend, for symbol lookups mid-question (Practice + Exam)
  onStudyDone?: () => void;
}

function ChartLegendButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <button type="button" className="btn btn-outline" onClick={() => setOpen(true)} style={{ width: "100%" }}>
        View Sectional Chart Legend
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(7,26,51,0.92)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "95vw", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button type="button" className="btn btn-gold" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <img src={figureSrc("faa-legend1-sectional-chart")} alt="Sectional chart legend" style={{ maxWidth: "100%", maxHeight: "80vh" }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AttemptRunner({
  attempt,
  onSelect,
  onToggleFlag,
  onSubmit,
  showFeedbackImmediately,
  showNavigator,
  showTools,
  showLegend,
  onStudyDone,
}: AttemptRunnerProps) {
  const [index, setIndex] = useState(0);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const questions = useMemo(
    () => attempt.questionIds.map((id) => ALL_QUESTIONS.find((q) => q.id === id)!).filter(Boolean),
    [attempt.questionIds]
  );
  const q = questions[index];
  const ans = q ? attempt.answers[q.id] : undefined;
  const currentAnswerRevealed = !!(q && showFeedbackImmediately && revealedAnswers[q.id]);

  // Current streak of consecutive submitted-and-correct Study Mode answers.
  let streak = 0;
  if (showFeedbackImmediately) {
    for (let i = index; i >= 0; i--) {
      const qq = questions[i];
      if (!revealedAnswers[qq.id]) break;
      const a = attempt.answers[qq.id];
      if (a?.choiceId && a.choiceId === qq.correctChoiceId) streak++;
      else break;
    }
  }

  function handleExpire() {
    if (!attempt.finalized) onSubmit();
  }

  function revealCurrentAnswer() {
    if (!q || !ans?.choiceId) return;
    setRevealedAnswers((prev) => ({ ...prev, [q.id]: true }));
  }

  function goToNextStudyQuestion() {
    setIndex((i) => Math.min(questions.length - 1, i + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    <div className={`attempt-layout${showNavigator || showTools || showLegend ? " attempt-layout--with-sidebar" : ""}`}>
      <div>
        {attempt.deadline && !attempt.finalized && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Timer deadlineIso={attempt.deadline} onExpire={handleExpire} />
          </div>
        )}

        {showFeedbackImmediately && streak >= 2 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <span className="badge badge-ready">{streak} in a row</span>
          </div>
        )}

        <QuestionCard
          question={q}
          index={index}
          total={questions.length}
          selectedChoiceId={ans?.choiceId ?? null}
          flagged={ans?.flagged ?? false}
          showFeedback={currentAnswerRevealed}
          selectionLocked={currentAnswerRevealed}
          onSelect={(choiceId) => onSelect(q.id, choiceId)}
          onToggleFlag={showNavigator && onToggleFlag ? () => onToggleFlag(q.id) : undefined}
        />

        {showFeedbackImmediately ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            {!currentAnswerRevealed ? (
              <button className="btn btn-primary" onClick={revealCurrentAnswer} disabled={!ans?.choiceId}>
                Submit answer
              </button>
            ) : index < questions.length - 1 ? (
              <button className="btn btn-primary" onClick={goToNextStudyQuestion}>
                Next question →
              </button>
            ) : (
              <button className="btn btn-gold" onClick={onStudyDone}>
                Finish study
              </button>
            )}
            {!currentAnswerRevealed && !ans?.choiceId && (
              <span style={{ color: "var(--slate-500)", fontSize: "0.9rem" }}>Choose an answer first.</span>
            )}
            {index < questions.length - 1 && onStudyDone && (
              <button className="btn btn-outline" onClick={onStudyDone}>
                End study
              </button>
            )}
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {(showNavigator || showTools || showLegend) && (
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
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {showLegend && <ChartLegendButton />}
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
