import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Attempt } from "../lib/types";
import { PUBLISHED_QUESTIONS, bankCounts } from "../lib/questionBank";
import { isExpired } from "../lib/attempts";
import { loadAttempts, getDemoOfficer, saveAttempt, isDemoMode } from "../lib/storage";
import { finalizeAttempt as finalizeAttemptLocal } from "../lib/attempts";
import { listMyAttempts } from "../lib/remoteAttempts";
import { ALL_QUESTIONS } from "../lib/questionBank";
import { useAttemptController } from "../lib/useAttemptController";
import { useAuth } from "../lib/auth";
import AttemptRunner from "../components/AttemptRunner";
import { SIMULATION_TOTAL, SIMULATION_DISTRIBUTION, FAA_AREA_LABELS } from "../lib/types";
import { completionMessage } from "../lib/motivation";

export default function ExamSimulation() {
  const navigate = useNavigate();
  const { officerId } = useAuth();
  const officer = getDemoOfficer();
  const { attempt, setAttempt, begin, select, toggleFlag, submit, busy, error, useRemote } = useAttemptController();
  const [resuming, setResuming] = useState(true);

  useEffect(() => {
    async function resume() {
      if (isDemoMode()) {
        const existing = loadAttempts().find((a) => a.officerId === officer.id && a.mode === "simulation" && !a.finalized);
        if (existing && isExpired(existing)) setAttempt(finalizeAttemptLocal(existing, ALL_QUESTIONS));
        else if (existing) setAttempt(existing);
      } else if (officerId) {
        const mine = await listMyAttempts();
        const existing = mine.find((a) => a.mode === "simulation" && !a.finalized);
        if (existing) setAttempt(existing);
      }
      setResuming(false);
    }
    resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officerId]);

  useEffect(() => {
    if (attempt && !attempt.finalized && isExpired(attempt)) {
      if (!useRemote) {
        const finalized = finalizeAttemptLocal(attempt, ALL_QUESTIONS);
        setAttempt(finalized);
        saveAttempt(finalized);
      } else {
        submit();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const counts = bankCounts();
  const bankTooSmall = counts.total < SIMULATION_TOTAL;

  if (resuming) return <p>Loading...</p>;

  if (attempt?.finalized) {
    const percent = attempt.score?.percent ?? 0;
    return (
      <div>
        <h1>Exam Simulation complete</h1>
        <p>
          Score: {attempt.score?.correct}/{attempt.score?.total} ({percent}%)
        </p>
        <p className="card" style={{ background: "var(--navy-100)" }}>
          {completionMessage(percent, "simulation")}
        </p>
        <button className="btn btn-primary" onClick={() => navigate(`/results/${attempt.id}`)}>
          View full report
        </button>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div>
        <h1>FAA Exam Simulation</h1>
        <p>
          Exactly {SIMULATION_TOTAL} questions using the distribution below. Two-hour timer. Refreshing or closing the
          browser will not reset the timer. No hints, answers, or explanations until you submit.
        </p>
        {error && <p style={{ color: "var(--danger-700)" }}>{error}</p>}
        <div className="card" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Area</th>
                <th>Questions on this simulation</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(SIMULATION_DISTRIBUTION) as (keyof typeof SIMULATION_DISTRIBUTION)[]).map((a) => (
                <tr key={a}>
                  <td>{FAA_AREA_LABELS[a]}</td>
                  <td>{SIMULATION_DISTRIBUTION[a]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bankTooSmall && (
          <div className="card" style={{ background: "var(--warn-100)", marginBottom: 16 }}>
            <strong>Note:</strong> the published question bank currently has {counts.total} questions, fewer than the
            {" "}{SIMULATION_TOTAL} a real simulation draws. You can still start one below for testing, but some
            questions may repeat within the attempt to fill the required distribution -- this will resolve as the
            bank grows toward 300. See KNOWN_LIMITATIONS.md.
          </div>
        )}
        <button className="btn btn-primary" disabled={busy || counts.total === 0} onClick={() => begin({ mode: "simulation", pool: PUBLISHED_QUESTIONS })}>
          Start exam simulation
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>FAA Exam Simulation</h1>
      <AttemptRunner
        attempt={attempt}
        onSelect={select}
        onToggleFlag={toggleFlag}
        onSubmit={submit}
        showFeedbackImmediately={false}
        showNavigator
        showTools
        showLegend
      />
    </div>
  );
}
