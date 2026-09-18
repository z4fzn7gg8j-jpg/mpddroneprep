import { useEffect, useState } from "react";
import { loadAttempts, getDemoOfficer, isDemoMode, deleteAttempt } from "../lib/storage";
import { ALL_QUESTIONS as QUESTIONS, bankCounts } from "../lib/questionBank";
import { computeReadiness } from "../lib/readiness";
import { FAA_AREA_LABELS, type FaaArea, type Attempt } from "../lib/types";
import ReadinessBadge from "../components/ReadinessBadge";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { listAllAttemptsForCoordinator, deleteAttemptRemote, resetSharedPasswordRemote } from "../lib/remoteAttempts";

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
}

function downloadCsv(filename: string, rows: string[][]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function relativeDate(iso: string | null): string {
  if (!iso) return "Never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString();
}

interface OfficerStats {
  id: string;
  name: string;
  email: string;
  attempts: Attempt[];
  lastActive: string | null;
  readiness: ReturnType<typeof computeReadiness>;
  areaBreakdown: { area: FaaArea; correct: number; total: number; percent: number }[];
  weakestArea: { area: FaaArea; percent: number } | null;
}

function buildOfficerStats(id: string, name: string, email: string, attempts: Attempt[]): OfficerStats {
  const finalized = attempts.filter((a) => a.finalized && a.score);
  const lastActive = attempts.reduce<string | null>((latest, a) => {
    const t = a.submittedAt ?? a.startedAt;
    return !latest || new Date(t).getTime() > new Date(latest).getTime() ? t : latest;
  }, null);
  const tally: Record<FaaArea, { correct: number; total: number }> = {
    regulations: { correct: 0, total: 0 },
    airspace: { correct: 0, total: 0 },
    weather: { correct: 0, total: 0 },
    loading_performance: { correct: 0, total: 0 },
    operations: { correct: 0, total: 0 },
  };
  for (const a of finalized) {
    for (const s of a.score!.byArea) {
      tally[s.area].correct += s.correct;
      tally[s.area].total += s.total;
    }
  }
  const areaBreakdown = (Object.keys(tally) as FaaArea[])
    .filter((a) => tally[a].total > 0)
    .map((a) => ({ area: a, correct: tally[a].correct, total: tally[a].total, percent: Math.round((tally[a].correct / tally[a].total) * 100) }));
  const weakestArea = areaBreakdown.length > 0 ? areaBreakdown.reduce((min, a) => (a.percent < min.percent ? a : min)) : null;

  return {
    id,
    name,
    email,
    attempts: finalized,
    lastActive,
    readiness: computeReadiness(attempts, QUESTIONS),
    areaBreakdown,
    weakestArea,
  };
}

export default function CoordinatorDashboard() {
  const demo = isDemoMode();
  const { officerId, officerRole } = useAuth();
  const [officerStats, setOfficerStats] = useState<OfficerStats[]>([]);
  const [loading, setLoading] = useState(!demo);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "working" | "error">("idle");
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    if (demo) {
      const officer = getDemoOfficer();
      const attempts = loadAttempts().filter((a) => a.officerId === officer.id);
      setOfficerStats([buildOfficerStats(officer.id, officer.name, "demo@local", attempts)]);
      return;
    }
    if (officerId && officerRole === "coordinator") {
      listAllAttemptsForCoordinator().then(({ attempts, officers }) => {
        const byOfficer: Record<string, Attempt[]> = {};
        for (const a of attempts) (byOfficer[a.officerId] ??= []).push(a);
        const stats = Object.entries(officers).map(([id, o]) =>
          buildOfficerStats(id, o.name, o.email, byOfficer[id] ?? [])
        );
        stats.sort((a, b) => new Date(b.lastActive ?? 0).getTime() - new Date(a.lastActive ?? 0).getTime());
        setOfficerStats(stats);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [demo, officerId, officerRole]);

  async function handleDeleteAttempt(attemptId: string) {
    if (!confirm("Delete this attempt? This can't be undone.")) return;
    if (demo) {
      deleteAttempt(attemptId);
    } else {
      try {
        await deleteAttemptRemote(attemptId);
      } catch (e: any) {
        alert(e.message ?? "Could not delete attempt.");
        return;
      }
    }
    setOfficerStats((prev) =>
      prev.map((o) => ({ ...o, attempts: o.attempts.filter((a) => a.id !== attemptId) }))
    );
  }

  async function handleResetPassword() {
    if (newPassword.length < 8) {
      setResetStatus("error");
      setResetMessage("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetStatus("error");
      setResetMessage("Passwords don't match.");
      return;
    }
    if (!confirm(`This resets every officer's login to the new password immediately -- everyone signs in with it starting now. Continue?`)) {
      return;
    }
    setResetStatus("working");
    setResetMessage(null);
    try {
      const result = await resetSharedPasswordRemote(newPassword);
      setResetStatus("idle");
      setResetMessage(
        result.failed.length === 0
          ? `Done -- updated ${result.updated} of ${result.total} officer accounts.`
          : `Updated ${result.updated} of ${result.total}. ${result.failed.length} failed: ${result.failed.join("; ")}`
      );
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setResetStatus("error");
      setResetMessage(e.message ?? "Could not reset the password.");
    }
  }

  if (!demo && loading) return <p>Loading...</p>;

  if (!demo && officerRole !== "coordinator") {
    return (
      <div className="card">
        <p>This page is for coordinator accounts only. If you should have coordinator access, ask whoever manages the database to promote your account.</p>
      </div>
    );
  }

  const readyCount = officerStats.filter((o) => o.readiness.status === "recommended_to_schedule").length;
  const activeThisWeek = officerStats.filter((o) => o.lastActive && Date.now() - new Date(o.lastActive).getTime() < 7 * 24 * 60 * 60 * 1000).length;
  const totalAttempts = officerStats.reduce((sum, o) => sum + o.attempts.length, 0);
  const bankStatus = bankCounts();

  // Program-wide weak topics, aggregated across every officer.
  const programTally: Record<FaaArea, { correct: number; total: number }> = {
    regulations: { correct: 0, total: 0 },
    airspace: { correct: 0, total: 0 },
    weather: { correct: 0, total: 0 },
    loading_performance: { correct: 0, total: 0 },
    operations: { correct: 0, total: 0 },
  };
  for (const o of officerStats) {
    for (const b of o.areaBreakdown) {
      programTally[b.area].correct += b.correct;
      programTally[b.area].total += b.total;
    }
  }
  const programWeakAreas = (Object.keys(programTally) as FaaArea[])
    .filter((a) => programTally[a].total > 0)
    .map((a) => ({ area: a, percent: Math.round((programTally[a].correct / programTally[a].total) * 100) }))
    .sort((a, b) => a.percent - b.percent);

  function exportRoster() {
    const rows = [["Officer", "Email", "Readiness", "Last active", "Attempts", "Weakest area", "Weakest area score"]];
    for (const o of officerStats) {
      rows.push([
        o.name,
        o.email,
        o.readiness.status,
        o.lastActive ?? "",
        String(o.attempts.length),
        o.weakestArea ? FAA_AREA_LABELS[o.weakestArea.area] : "",
        o.weakestArea ? `${o.weakestArea.percent}%` : "",
      ]);
    }
    downloadCsv("mpd107-roster.csv", rows);
  }

  return (
    <div>
      <h1>Coordinator Dashboard</h1>
      {demo && (
        <div className="card" style={{ background: "var(--warn-100)", marginBottom: 20 }}>
          <strong>Demo mode scope.</strong> This view reflects only the attempts stored in this browser. Connect
          Supabase and sign in as a coordinator to see the real multi-officer roster.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div className="card"><div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--navy-800)" }}>{officerStats.length}</div><div style={{ color: "var(--slate-500)", fontSize: "0.85rem" }}>Officers</div></div>
        <div className="card"><div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--gold-600)" }}>{readyCount}</div><div style={{ color: "var(--slate-500)", fontSize: "0.85rem" }}>Ready to schedule</div></div>
        <div className="card"><div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--navy-800)" }}>{activeThisWeek}</div><div style={{ color: "var(--slate-500)", fontSize: "0.85rem" }}>Active this week</div></div>
        <div className="card"><div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--navy-800)" }}>{totalAttempts}</div><div style={{ color: "var(--slate-500)", fontSize: "0.85rem" }}>Attempts logged</div></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="section-title">Officer roster</h2>
        <p style={{ color: "var(--slate-500)", fontSize: "0.9rem", marginTop: -6 }}>Click a row to see that officer's full area breakdown and attempt history.</p>
        {officerStats.length === 0 ? (
          <p>No officers yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Officer</th>
                <th>Readiness</th>
                <th>Last active</th>
                <th>Attempts</th>
                <th>Weakest area</th>
              </tr>
            </thead>
            <tbody>
              {officerStats.map((o) => (
                <>
                  <tr key={o.id} onClick={() => setExpanded(expanded === o.id ? null : o.id)} style={{ cursor: "pointer" }}>
                    <td>{o.name}{!demo && <div style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>{o.email}</div>}</td>
                    <td><ReadinessBadge status={o.readiness.status} /></td>
                    <td>{relativeDate(o.lastActive)}</td>
                    <td>{o.attempts.length}</td>
                    <td>
                      {o.weakestArea ? (
                        <span style={{ color: o.weakestArea.percent < 75 ? "var(--danger-700)" : "var(--slate-700)" }}>
                          {FAA_AREA_LABELS[o.weakestArea.area]} ({o.weakestArea.percent}%)
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                  {expanded === o.id && (
                    <tr>
                      <td colSpan={5} style={{ background: "var(--mist)", padding: 16 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
                          <div>
                            <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Area breakdown</h3>
                            {o.areaBreakdown.length === 0 ? (
                              <p style={{ color: "var(--slate-500)" }}>No completed attempts yet.</p>
                            ) : (
                              <table>
                                <thead>
                                  <tr><th>Area</th><th>Score</th></tr>
                                </thead>
                                <tbody>
                                  {o.areaBreakdown.map((b) => (
                                    <tr key={b.area}>
                                      <td>{FAA_AREA_LABELS[b.area]}</td>
                                      <td style={{ color: b.percent < 75 ? "var(--danger-700)" : "var(--success-700)" }}>
                                        {b.correct}/{b.total} ({b.percent}%)
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                          <div>
                            <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Recent attempts</h3>
                            {o.attempts.length === 0 ? (
                              <p style={{ color: "var(--slate-500)" }}>No completed attempts yet.</p>
                            ) : (
                              <table>
                                <thead>
                                  <tr><th>Date</th><th>Mode</th><th>Score</th><th></th><th></th></tr>
                                </thead>
                                <tbody>
                                  {o.attempts
                                    .slice()
                                    .sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime())
                                    .slice(0, 8)
                                    .map((a) => (
                                      <tr key={a.id}>
                                        <td>{new Date(a.submittedAt!).toLocaleDateString()}</td>
                                        <td>{a.mode}</td>
                                        <td>{a.score?.correct}/{a.score?.total} ({a.score?.percent}%)</td>
                                        <td><Link to={`/results/${a.id}`}>View</Link></td>
                                        <td>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteAttempt(a.id)}
                                            aria-label="Delete this attempt"
                                            title="Delete this attempt"
                                            style={{ background: "none", border: "none", color: "var(--danger-700)", cursor: "pointer", fontSize: "1rem", padding: "0 6px" }}
                                          >
                                            &times;
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
        <button className="btn btn-outline" onClick={exportRoster} style={{ marginTop: 10 }}>
          Export roster CSV
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="section-title">Program-wide weak topics</h2>
        {programWeakAreas.length === 0 ? (
          <p>No completed attempts yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Area</th>
                <th>Aggregate score across all officers</th>
              </tr>
            </thead>
            <tbody>
              {programWeakAreas.map((w) => (
                <tr key={w.area}>
                  <td>{FAA_AREA_LABELS[w.area]}</td>
                  <td style={{ color: w.percent < 75 ? "var(--danger-700)" : "var(--success-700)" }}>{w.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="section-title">Question bank status</h2>
        <table>
          <thead>
            <tr>
              <th>Area</th>
              <th>Published</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(bankStatus.byArea) as (keyof typeof bankStatus.byArea)[]).map((area) => (
              <tr key={area}>
                <td>{FAA_AREA_LABELS[area]}</td>
                <td>{bankStatus.byArea[area]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="section-title">Question editor and problem reports</h2>
        <p>
          Draft/publish/retire controls, question version history, and open "Report a problem with this question"
          submissions live in the Question Editor.
        </p>
        <Link to="/coordinator/questions" className="btn btn-primary">
          Open Question Editor
        </Link>
      </div>

      {!demo && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 className="section-title">Department login password</h2>
          <p style={{ color: "var(--slate-500)" }}>
            Everyone signs in with the same password. Setting a new one here resets every existing officer's
            account to it immediately -- there's no need to tell people individually beforehand, but they will
            need the new password the next time they sign in.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", maxWidth: 420 }}>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ flex: "1 1 180px", padding: 8, border: "1px solid var(--line)", borderRadius: 6 }}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ flex: "1 1 180px", padding: 8, border: "1px solid var(--line)", borderRadius: 6 }}
            />
          </div>
          <button className="btn btn-primary" onClick={handleResetPassword} disabled={resetStatus === "working"} style={{ marginTop: 10 }}>
            {resetStatus === "working" ? "Updating..." : "Update password for all officers"}
          </button>
          {resetMessage && (
            <p style={{ marginTop: 10, color: resetStatus === "error" ? "var(--danger-700)" : "var(--success-700)" }}>{resetMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
