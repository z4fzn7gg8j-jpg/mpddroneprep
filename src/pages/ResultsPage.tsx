import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getAttempt, loadAttempts, getDemoOfficer, isDemoMode } from "../lib/storage";
import { ALL_QUESTIONS, RESOURCES } from "../lib/questionBank";
import { FAA_AREA_LABELS, FAA_PUBLISHED_RANGE, type Attempt } from "../lib/types";
import { computeReadiness } from "../lib/readiness";
import ReadinessBadge from "../components/ReadinessBadge";
import { useAuth } from "../lib/auth";
import { getAttemptRemote, listMyAttempts } from "../lib/remoteAttempts";
import ReportProblemButton from "../components/ReportProblemButton";

export default function ResultsPage() {
  const { attemptId } = useParams();
  const demo = isDemoMode();
  const { officerId, officerEmail, officerName } = useAuth();
  const [attempt, setAttempt] = useState<Attempt | null | undefined>(undefined);
  const [allMine, setAllMine] = useState<Attempt[]>([]);

  useEffect(() => {
    async function load() {
      if (!attemptId) return;
      if (demo) {
        setAttempt(getAttempt(attemptId));
        const officer = getDemoOfficer();
        setAllMine(loadAttempts().filter((a) => a.officerId === officer.id));
      } else if (officerId) {
        const [a, mine] = await Promise.all([getAttemptRemote(attemptId), listMyAttempts()]);
        setAttempt(a);
        setAllMine(mine);
      }
    }
    load();
  }, [attemptId, demo, officerId]);

  const officerLabel = demo ? getDemoOfficer().name : officerName ?? officerEmail ?? "Officer";

  if (attempt === undefined) return <p>Loading...</p>;

  if (!attempt || !attempt.score) {
    return (
      <div className="card">
        <p>No results found for this attempt.</p>
        <Link to="/" className="btn btn-outline">
          Back home
        </Link>
      </div>
    );
  }

  const readiness = attempt.mode === "simulation" ? computeReadiness(allMine, ALL_QUESTIONS) : null;

  const attemptsOfMode = allMine.filter((a) => a.mode === attempt.mode && a.finalized);
  const attemptNumber = attemptsOfMode.findIndex((a) => a.id === attempt.id) + 1;

  const questions = attempt.questionIds.map((id) => ALL_QUESTIONS.find((q) => q.id === id)!).filter(Boolean);

  // Prioritized "what to study next": weakest area with the most weight.
  const weakestFirst = [...attempt.score.byArea].sort((a, b) => a.percent - b.percent);

  return (
    <div>
      <h1>Attempt Report</h1>
      <p style={{ color: "var(--slate-500)" }}>
        This is an internal MPD study recommendation, not an FAA certification or a guarantee of passing the
        official exam.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="section-title">Summary</h2>
        <table>
          <tbody>
            <tr>
              <th>Officer</th>
              <td>{officerLabel}</td>
            </tr>
            <tr>
              <th>Date</th>
              <td>{new Date(attempt.submittedAt!).toLocaleString()}</td>
            </tr>
            <tr>
              <th>Assessment type</th>
              <td>{attempt.mode}</td>
            </tr>
            <tr>
              <th>Attempt number (this mode)</th>
              <td>{attemptNumber > 0 ? attemptNumber : "—"}</td>
            </tr>
            <tr>
              <th>Overall score</th>
              <td>
                {attempt.score.correct}/{attempt.score.total} ({attempt.score.percent}%)
              </td>
            </tr>
            {readiness && (
              <tr>
                <th>Readiness status</th>
                <td>
                  <ReadinessBadge status={readiness.status} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {readiness && readiness.remaining.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <strong>What remains to qualify:</strong>
            <ul>
              {readiness.remaining.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="section-title">Results by FAA area</h2>
        <table>
          <thead>
            <tr>
              <th>Area</th>
              <th>Correct</th>
              <th>Questions on this attempt</th>
              <th>Score</th>
              <th>Blueprint weight</th>
            </tr>
          </thead>
          <tbody>
            {attempt.score.byArea.map((a) => (
              <tr key={a.area}>
                <td>{FAA_AREA_LABELS[a.area]}</td>
                <td>{a.correct}</td>
                <td>{a.total}</td>
                <td>{a.percent}%</td>
                <td>
                  {FAA_PUBLISHED_RANGE[a.area][0]}% of the exam
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="section-title">Prioritized: what to study next</h2>
        <ol>
          {weakestFirst.slice(0, 3).map((a) => (
            <li key={a.area}>
              {FAA_AREA_LABELS[a.area]} — {a.percent}% on this attempt.{" "}
              <Link to={`/study?area=${a.area}`}>Targeted practice</Link>
            </li>
          ))}
        </ol>
      </div>

      <div className="card">
        <h2 className="section-title">Question-by-question review</h2>
        {questions.map((q, i) => {
          const a = attempt.answers[q.id];
          const status = !a?.choiceId ? "Unanswered" : a.choiceId === q.correctChoiceId ? "Correct" : "Incorrect";
          const resources = q.resourceIds.map((rid) => RESOURCES.find((r) => r.id === rid)).filter(Boolean);
          return (
            <div key={q.id} style={{ borderTop: "1px solid var(--line)", padding: "14px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong>
                  Q{i + 1}. {q.text}
                </strong>
                <span
                  className="badge"
                  style={{
                    background: status === "Correct" ? "var(--success-100)" : status === "Incorrect" ? "var(--danger-100)" : "var(--warn-100)",
                    color: status === "Correct" ? "var(--success-700)" : status === "Incorrect" ? "var(--danger-700)" : "var(--warn-700)",
                  }}
                >
                  {status}
                </span>
              </div>
              <ul style={{ listStyle: "none", paddingLeft: 0 }}>
                {q.choices.map((c) => (
                  <li
                    key={c.id}
                    style={{
                      padding: "4px 0",
                      fontWeight: c.id === q.correctChoiceId ? 700 : 400,
                      color: c.id === a?.choiceId && c.id !== q.correctChoiceId ? "var(--danger-700)" : undefined,
                    }}
                  >
                    {c.id}. {c.text}
                    {c.id === a?.choiceId && " (your answer)"}
                    {c.id === q.correctChoiceId && " (correct answer)"}
                    <div style={{ fontWeight: 400, fontSize: "0.88rem", color: "var(--slate-500)", marginTop: 2 }}>
                      {c.explanation}
                    </div>
                  </li>
                ))}
              </ul>
              {(q.teachingExplanation || q.howToSolve || q.memoryTip) && (
                status === "Correct" ? (
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ cursor: "pointer", fontSize: "0.9rem", color: "var(--navy-700)" }}>
                      Show reasoning
                    </summary>
                    <div style={{ marginTop: 6, padding: "10px 12px", background: "var(--mist)", borderRadius: 6 }}>
                      {q.teachingExplanation && <p style={{ margin: "0 0 8px" }}>{q.teachingExplanation}</p>}
                      {q.howToSolve && (
                        <p style={{ margin: "0 0 8px", fontSize: "0.9rem" }}>
                          <strong>How to solve it:</strong> {q.howToSolve}
                        </p>
                      )}
                      {q.memoryTip && (
                        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--gold-600)" }}>
                          <strong>Remember:</strong> {q.memoryTip}
                        </p>
                      )}
                    </div>
                  </details>
                ) : (
                  <div style={{ marginTop: 6, padding: "10px 12px", background: "var(--mist)", borderRadius: 6 }}>
                    {q.teachingExplanation && <p style={{ margin: "0 0 8px" }}>{q.teachingExplanation}</p>}
                    {q.howToSolve && (
                      <p style={{ margin: "0 0 8px", fontSize: "0.9rem" }}>
                        <strong>How to solve it:</strong> {q.howToSolve}
                      </p>
                    )}
                    {q.memoryTip && (
                      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--gold-600)" }}>
                        <strong>Remember:</strong> {q.memoryTip}
                      </p>
                    )}
                  </div>
                )
              )}
              <p style={{ fontSize: "0.9rem", color: "var(--slate-500)", margin: "8px 0 4px" }}>
                {FAA_AREA_LABELS[q.area]} &middot; {q.topic} &middot; ACS {q.acsCode}
                {q.figure && " \u00b7 includes a figure"}
              </p>
              {resources.length > 0 && (
                <p style={{ fontSize: "0.9rem" }}>
                  Learn more:{" "}
                  {resources.map((r, idx) => (
                    <span key={r!.id}>
                      <a href={r!.url} target="_blank" rel="noreferrer">
                        {r!.title}
                      </a>
                      {idx < resources.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </p>
              )}
              <ReportProblemButton questionId={q.id} attemptId={attempt.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
