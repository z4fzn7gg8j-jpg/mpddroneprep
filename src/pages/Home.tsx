import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadAttempts, getDemoOfficer, isDemoMode } from "../lib/storage";
import { ALL_QUESTIONS } from "../lib/questionBank";
import { computeReadiness, READINESS_CONFIG } from "../lib/readiness";
import ReadinessBadge from "../components/ReadinessBadge";
import { FAA_AREA_LABELS, type FaaArea, type Attempt } from "../lib/types";
import { useAuth } from "../lib/auth";
import { listMyAttempts } from "../lib/remoteAttempts";
import { readinessEncouragement } from "../lib/motivation";

export default function Home() {
  const demo = isDemoMode();
  const { officerId, officerName } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    if (demo) {
      const officer = getDemoOfficer();
      setAttempts(loadAttempts().filter((a) => a.officerId === officer.id));
    } else if (officerId) {
      listMyAttempts().then(setAttempts);
    }
  }, [demo, officerId]);

  const readiness = computeReadiness(attempts, ALL_QUESTIONS);
  const finalizedSimulations = attempts.filter((a) => a.mode === "simulation" && a.finalized && a.score);
  const recentSimulations = finalizedSimulations
    .slice()
    .sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime())
    .slice(0, 5);

  // Personal performance stats, computed from timed simulations only --
  // practice quizzes are lower-stakes and would understate how ready
  // someone actually is for the real thing.
  const scores = finalizedSimulations.map((a) => a.score!.percent);
  const averageScore = scores.length > 0 ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10 : null;
  const highestScore = scores.length > 0 ? Math.max(...scores) : null;

  const areaTally: Record<FaaArea, { correct: number; total: number }> = {
    regulations: { correct: 0, total: 0 },
    airspace: { correct: 0, total: 0 },
    weather: { correct: 0, total: 0 },
    loading_performance: { correct: 0, total: 0 },
    operations: { correct: 0, total: 0 },
  };
  for (const a of finalizedSimulations) {
    for (const s of a.score!.byArea) {
      areaTally[s.area].correct += s.correct;
      areaTally[s.area].total += s.total;
    }
  }
  const areaBreakdown = (Object.keys(areaTally) as FaaArea[])
    .filter((a) => areaTally[a].total > 0)
    .map((a) => ({ area: a, correct: areaTally[a].correct, total: areaTally[a].total, percent: Math.round((areaTally[a].correct / areaTally[a].total) * 100) }))
    .sort((a, b) => a.percent - b.percent);
  const needsStudy = areaBreakdown.filter((a) => a.percent < READINESS_CONFIG.areaPercentMin);

  const isReady = readiness.status === "recommended_to_schedule";

  // Progress-over-time: compare the earliest and latest simulation scores
  // so this reflects the officer's own real history, not a canned line.
  const chronological = finalizedSimulations
    .slice()
    .sort((a, b) => new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime());
  const progressDelta =
    chronological.length >= 2
      ? Math.round((chronological[chronological.length - 1].score!.percent - chronological[0].score!.percent) * 10) / 10
      : null;

  return (
    <div>
      {demo && (
        <div className="card" style={{ background: "var(--warn-100)", borderColor: "var(--warn-700)", marginBottom: 20 }}>
          <strong>Local demo mode.</strong> No account is required, and nothing is shared with a coordinator. Progress
          is saved only in this browser. Connect Supabase, Netlify Functions, and Resend to enable real accounts,
          shared reports, and email — see README.md.
        </div>
      )}

      {isReady && (
        <div className="card" style={{ background: "var(--gold-100)", borderColor: "var(--gold-500)", borderWidth: 2, marginBottom: 20 }}>
          <h2 style={{ marginTop: 0, color: "var(--gold-600)" }}>You look ready to schedule the FAA exam</h2>
          <p style={{ margin: 0 }}>
            Your two most recent timed simulations both scored at least {READINESS_CONFIG.overallPercentMin}% overall
            with every area at or above {READINESS_CONFIG.areaPercentMin}%, within the last {READINESS_CONFIG.recentWindowDays} days.
            Talk to your coordinator about scheduling the official test.
          </p>
        </div>
      )}

      <h1>MPD Part 107 Readiness{!demo && officerName ? ` — ${officerName}` : ""}</h1>
      <p>
        Study for the FAA Unmanned Aircraft General (UAG) knowledge test and track when you're ready to schedule it.
        This is an internal study tool, not an FAA certification or a guarantee of passing the official exam.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="section-title">Your status</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <ReadinessBadge status={readiness.status} />
          {readiness.latestSimulationPercent !== null && (
            <span style={{ color: "var(--slate-500)" }}>
              Latest timed simulation: {readiness.latestSimulationPercent}%
            </span>
          )}
        </div>
        <p style={{ margin: "0 0 12px" }}>{readinessEncouragement(readiness.status)}</p>
        {progressDelta !== null && progressDelta !== 0 && (
          <p style={{ color: progressDelta > 0 ? "var(--success-700)" : "var(--slate-500)", fontWeight: 600, marginTop: -6 }}>
            {progressDelta > 0
              ? `Up ${progressDelta} points since your first simulation.`
              : `Down ${Math.abs(progressDelta)} points from your first simulation -- worth a look at what changed.`}
          </p>
        )}
        <p style={{ color: "var(--slate-500)", fontSize: "0.9rem" }}>
          General guidance: you'll want to see multiple timed simulation scores of {READINESS_CONFIG.overallPercentMin}%
          or higher -- with every area at or above {READINESS_CONFIG.areaPercentMin}% -- before scheduling the real
          FAA exam. Two qualifying scores within {READINESS_CONFIG.recentWindowDays} days earns
          "Recommended to Schedule" status above.
        </p>

        {scores.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, margin: "14px 0" }}>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--navy-800)" }}>{averageScore}%</div>
              <div style={{ color: "var(--slate-500)", fontSize: "0.85rem" }}>Average score ({scores.length} simulation{scores.length === 1 ? "" : "s"})</div>
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--navy-800)" }}>{highestScore}%</div>
              <div style={{ color: "var(--slate-500)", fontSize: "0.85rem" }}>Highest score</div>
            </div>
          </div>
        )}

        {readiness.remaining.length > 0 && (
          <ul>
            {readiness.remaining.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}

        {areaBreakdown.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <strong>Your area breakdown (across timed simulations):</strong>
            <table style={{ marginTop: 6 }}>
              <thead>
                <tr><th>Area</th><th>Score</th><th></th></tr>
              </thead>
              <tbody>
                {areaBreakdown.map((a) => (
                  <tr key={a.area}>
                    <td>{FAA_AREA_LABELS[a.area]}</td>
                    <td style={{ color: a.percent < READINESS_CONFIG.areaPercentMin ? "var(--danger-700)" : "var(--success-700)" }}>
                      {a.correct}/{a.total} ({a.percent}%)
                    </td>
                    <td>
                      {a.percent < READINESS_CONFIG.areaPercentMin && (
                        <Link to={`/study?area=${a.area}`}>Study this area</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {needsStudy.length > 0 && (
          <p style={{ marginTop: 10, background: "var(--warn-100)", padding: "8px 12px", borderRadius: 6 }}>
            <strong>Spend more time on:</strong>{" "}
            {needsStudy.map((a) => FAA_AREA_LABELS[a.area]).join(", ")} -- below {READINESS_CONFIG.areaPercentMin}% so far.
          </p>
        )}

        {readiness.chartQuestionPerformance && (
          <p style={{ color: "var(--slate-500)" }}>
            Chart-question performance (reported separately, not a qualification gate):{" "}
            {readiness.chartQuestionPerformance.correct}/{readiness.chartQuestionPerformance.total} (
            {readiness.chartQuestionPerformance.percent}%)
          </p>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
        <ModeCard to="/study" title="Study Mode" desc="Pick an area or topic. See the answer and full explanation immediately. Unrestricted practice." />
        <ModeCard to="/practice" title="Practice Quiz" desc="10, 20, or 30 questions. Results after submission. Doesn't count toward readiness." />
        <ModeCard to="/simulation" title="FAA Exam Simulation" desc="60 questions, 2-hour timer, real FAA distribution. Counts toward readiness." gold />
      </div>

      {recentSimulations.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 className="section-title">Recent timed simulations</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Score</th>
                <th>Every area &ge;75%?</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentSimulations.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.submittedAt!).toLocaleDateString()}</td>
                  <td>
                    {a.score?.correct}/{a.score?.total} ({a.score?.percent}%)
                  </td>
                  <td>{a.score?.passedEveryArea ? "Yes" : "No"}</td>
                  <td>
                    <Link to={`/results/${a.id}`}>View report</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ModeCard({ to, title, desc, gold }: { to: string; title: string; desc: string; gold?: boolean }) {
  return (
    <Link to={to} className="card" style={{ textDecoration: "none", display: "block", borderColor: gold ? "var(--gold-500)" : undefined }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p style={{ margin: 0, color: "var(--slate-500)" }}>{desc}</p>
    </Link>
  );
}
