import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadAttempts, getDemoOfficer, isDemoMode, deleteAttempt } from "../lib/storage";
import { listMyAttempts, deleteAttemptRemote } from "../lib/remoteAttempts";
import { FAA_AREA_LABELS, type Attempt, type AttemptMode } from "../lib/types";

const MODE_LABELS: Record<AttemptMode, string> = {
  study: "Study Mode",
  practice: "Practice Quiz",
  simulation: "Exam Simulation",
};

export default function AttemptHistory() {
  const demo = isDemoMode();
  const [officerId, setOfficerId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState<AttemptMode | "all">("all");

  useEffect(() => {
    async function load() {
      if (demo) {
        const officer = getDemoOfficer();
        setOfficerId(officer.id);
        setAttempts(loadAttempts().filter((a) => a.officerId === officer.id && a.finalized));
        setLoading(false);
      } else {
        const mine = await listMyAttempts();
        setAttempts(mine.filter((a) => a.finalized));
        setLoading(false);
      }
    }
    load();
  }, [demo]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this attempt? This can't be undone.")) return;
    if (demo) {
      deleteAttempt(id);
    } else {
      try {
        await deleteAttemptRemote(id);
      } catch (e: any) {
        alert(e.message ?? "Could not delete attempt.");
        return;
      }
    }
    setAttempts((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading) return <p>Loading...</p>;

  const filtered = attempts
    .filter((a) => modeFilter === "all" || a.mode === modeFilter)
    .sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime());

  return (
    <div>
      <h1>Attempt History</h1>
      <p style={{ color: "var(--slate-500)" }}>
        Every completed attempt, across every mode. Open any of them for the full question-by-question review,
        including the teaching explanations -- not just the ones from Exam Simulation.
      </p>

      <div className="card" style={{ marginBottom: 16, display: "inline-block" }}>
        <label style={{ fontSize: "0.9rem" }}>
          Filter by mode{" "}
          <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value as AttemptMode | "all")} style={{ padding: 6, marginLeft: 6 }}>
            <option value="all">All modes</option>
            <option value="study">Study Mode</option>
            <option value="practice">Practice Quiz</option>
            <option value="simulation">Exam Simulation</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <p>No completed attempts yet{modeFilter !== "all" ? ` in ${MODE_LABELS[modeFilter as AttemptMode]}` : ""}.</p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>Subject</th>
                <th>Score</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.submittedAt ?? a.startedAt).toLocaleString()}</td>
                  <td>{MODE_LABELS[a.mode]}</td>
                  <td>{a.areaFilter && a.areaFilter !== "mixed" ? FAA_AREA_LABELS[a.areaFilter] : "Mixed"}</td>
                  <td>
                    {a.score ? `${a.score.correct}/${a.score.total} (${a.score.percent}%)` : "--"}
                  </td>
                  <td>
                    <Link to={`/results/${a.id}`}>View full review</Link>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
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
        </div>
      )}
    </div>
  );
}
