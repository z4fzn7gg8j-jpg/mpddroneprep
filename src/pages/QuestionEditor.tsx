import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { isDemoMode } from "../lib/storage";
import type { Question, FaaArea, QuestionStatus } from "../lib/types";
import { FAA_AREA_LABELS } from "../lib/types";
import {
  listAllQuestionsAdmin,
  saveQuestionAdmin,
  listProblemReports,
  updateProblemReportStatus,
  type ProblemReport,
} from "../lib/questionAdmin";

const AREAS = Object.keys(FAA_AREA_LABELS) as FaaArea[];
const STATUSES: QuestionStatus[] = ["draft", "published", "retired"];

export default function QuestionEditor() {
  const demo = isDemoMode();
  const { officerId, officerRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reports, setReports] = useState<ProblemReport[]>([]);
  const [areaFilter, setAreaFilter] = useState<FaaArea | "all">("all");
  const [statusFilter, setStatusFilter] = useState<QuestionStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Question | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  const authorized = demo || officerRole === "coordinator";

  useEffect(() => {
    if (!authorized || demo) {
      setLoading(false);
      return;
    }
    Promise.all([listAllQuestionsAdmin(), listProblemReports()])
      .then(([qs, reps]) => {
        setQuestions(qs);
        setReports(reps);
      })
      .finally(() => setLoading(false));
  }, [authorized, demo]);

  if (demo) {
    return (
      <div className="card">
        <p>The question editor needs a real Supabase connection -- it edits the live database directly, which local demo mode doesn't have. Connect Supabase to use this.</p>
      </div>
    );
  }

  if (!officerId) return <p>Loading...</p>;

  if (officerRole !== "coordinator") {
    return (
      <div className="card">
        <p>This page is for coordinator accounts only.</p>
      </div>
    );
  }

  if (loading) return <p>Loading...</p>;

  const filtered = questions.filter((q) => {
    if (areaFilter !== "all" && q.area !== areaFilter) return false;
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (search && !(q.text + q.id + q.topic).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openReports = reports.filter((r) => r.status === "open");

  function startEdit(q: Question) {
    setEditingId(q.id);
    setDraft(JSON.parse(JSON.stringify(q)));
    setSaveStatus("idle");
  }

  async function save() {
    if (!draft || !editingId || !officerId) return;
    const original = questions.find((q) => q.id === editingId);
    if (!original) return;
    setSaveStatus("saving");
    try {
      await saveQuestionAdmin(original, draft, officerId);
      setQuestions((prev) => prev.map((q) => (q.id === editingId ? { ...draft, version: original.version + 1 } : q)));
      setEditingId(null);
      setDraft(null);
      setSaveStatus("idle");
    } catch (e: any) {
      setSaveStatus("error");
      setSaveError(e.message ?? "Could not save.");
    }
  }

  async function resolveReport(id: string, status: "reviewed" | "dismissed") {
    await updateProblemReportStatus(id, status);
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  return (
    <div>
      <p>
        <Link to="/coordinator">&larr; Back to Coordinator Dashboard</Link>
      </p>
      <h1>Question Editor</h1>
      <p style={{ color: "var(--slate-500)" }}>
        Coordinator-only. Saving a question snapshots the previous version first, so any attempt report that already
        referenced the old wording keeps showing what the officer actually saw.
      </p>

      {openReports.length > 0 && (
        <div className="card" style={{ marginBottom: 20, background: "var(--warn-100)" }}>
          <h2 className="section-title">Open problem reports ({openReports.length})</h2>
          {openReports.map((r) => {
            const q = questions.find((qq) => qq.id === r.questionId);
            return (
              <div key={r.id} style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}>
                <strong>{r.questionId}</strong>
                {q && <span style={{ color: "var(--slate-500)" }}> -- {q.text.slice(0, 80)}{q.text.length > 80 ? "..." : ""}</span>}
                <p style={{ margin: "4px 0" }}>{r.note}</p>
                <p style={{ margin: "4px 0", fontSize: "0.8rem", color: "var(--slate-500)" }}>
                  Reported {new Date(r.createdAt).toLocaleDateString()}{r.reporterEmail && ` by ${r.reporterEmail}`}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {q && (
                    <button className="btn btn-outline" onClick={() => startEdit(q)} style={{ fontSize: "0.85rem" }}>
                      Edit question
                    </button>
                  )}
                  <button className="btn btn-outline" onClick={() => resolveReport(r.id, "reviewed")} style={{ fontSize: "0.85rem" }}>
                    Mark reviewed
                  </button>
                  <button className="btn btn-outline" onClick={() => resolveReport(r.id, "dismissed")} style={{ fontSize: "0.85rem" }}>
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingId && draft ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 className="section-title">Editing {editingId}</h2>
          <label style={{ display: "block", marginBottom: 10 }}>
            Question text
            <textarea
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              rows={3}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4, border: "1px solid var(--line)", borderRadius: 6 }}
            />
          </label>

          {draft.choices.map((c, i) => (
            <div key={c.id} className="card" style={{ marginBottom: 8, padding: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <input
                  type="radio"
                  checked={draft.correctChoiceId === c.id}
                  onChange={() => setDraft({ ...draft, correctChoiceId: c.id })}
                />
                <strong>Choice {c.id}</strong> {draft.correctChoiceId === c.id && <span style={{ color: "var(--success-700)" }}>(correct)</span>}
              </label>
              <input
                type="text"
                value={c.text}
                onChange={(e) => {
                  const choices = [...draft.choices];
                  choices[i] = { ...c, text: e.target.value };
                  setDraft({ ...draft, choices });
                }}
                style={{ display: "block", width: "100%", padding: 6, marginBottom: 6, border: "1px solid var(--line)", borderRadius: 6 }}
              />
              <textarea
                value={c.explanation}
                onChange={(e) => {
                  const choices = [...draft.choices];
                  choices[i] = { ...c, explanation: e.target.value };
                  setDraft({ ...draft, choices });
                }}
                rows={2}
                placeholder="Explanation for this choice"
                style={{ display: "block", width: "100%", padding: 6, border: "1px solid var(--line)", borderRadius: 6 }}
              />
            </div>
          ))}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 10 }}>
            <label>
              Area
              <select value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value as FaaArea })} style={{ display: "block", width: "100%", padding: 6, marginTop: 4 }}>
                {AREAS.map((a) => <option key={a} value={a}>{FAA_AREA_LABELS[a]}</option>)}
              </select>
            </label>
            <label>
              Status
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as QuestionStatus })} style={{ display: "block", width: "100%", padding: 6, marginTop: 4 }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>
              Difficulty
              <select value={draft.difficulty} onChange={(e) => setDraft({ ...draft, difficulty: e.target.value as Question["difficulty"] })} style={{ display: "block", width: "100%", padding: 6, marginTop: 4 }}>
                <option value="intro">intro</option>
                <option value="standard">standard</option>
                <option value="advanced">advanced</option>
              </select>
            </label>
            <label>
              ACS code
              <input type="text" value={draft.acsCode} onChange={(e) => setDraft({ ...draft, acsCode: e.target.value })} style={{ display: "block", width: "100%", padding: 6, marginTop: 4, border: "1px solid var(--line)", borderRadius: 6 }} />
            </label>
          </div>
          <label style={{ display: "block", marginTop: 10 }}>
            Topic / subtopic
            <input
              type="text"
              value={draft.topic}
              onChange={(e) => setDraft({ ...draft, topic: e.target.value, subtopic: e.target.value })}
              style={{ display: "block", width: "100%", padding: 6, marginTop: 4, border: "1px solid var(--line)", borderRadius: 6 }}
            />
          </label>

          {draft.figure && (
            <p style={{ fontSize: "0.85rem", color: "var(--slate-500)", marginTop: 10 }}>
              Figure: {draft.figure.title} (figures are managed as project assets, not editable here -- see assets/figures/MANIFEST.md)
            </p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn btn-primary" onClick={save} disabled={saveStatus === "saving"}>
              {saveStatus === "saving" ? "Saving..." : "Save changes"}
            </button>
            <button className="btn btn-outline" onClick={() => { setEditingId(null); setDraft(null); }}>
              Cancel
            </button>
          </div>
          {saveStatus === "error" && <p style={{ color: "var(--danger-700)" }}>{saveError}</p>}
        </div>
      ) : (
        <div className="card">
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <input
              type="search"
              placeholder="Search id, text, topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: 8, border: "1px solid var(--line)", borderRadius: 6, flex: "1 1 200px" }}
            />
            <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value as FaaArea | "all")} style={{ padding: 8 }}>
              <option value="all">All areas</option>
              {AREAS.map((a) => <option key={a} value={a}>{FAA_AREA_LABELS[a]}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as QuestionStatus | "all")} style={{ padding: 8 }}>
              <option value="all">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <p style={{ color: "var(--slate-500)", fontSize: "0.9rem" }}>{filtered.length} of {questions.length} questions</p>
          <table>
            <thead>
              <tr><th>ID</th><th>Area</th><th>Status</th><th>Topic</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((q) => (
                <tr key={q.id}>
                  <td>{q.id}</td>
                  <td>{FAA_AREA_LABELS[q.area]}</td>
                  <td>
                    <span className={`badge ${q.status === "published" ? "badge-ready" : q.status === "draft" ? "badge-nearly" : "badge-developing"}`}>
                      {q.status}
                    </span>
                  </td>
                  <td>{q.topic}</td>
                  <td><button className="btn btn-outline" style={{ fontSize: "0.8rem" }} onClick={() => startEdit(q)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 100 && <p style={{ color: "var(--slate-500)", fontSize: "0.85rem" }}>Showing first 100 -- narrow with search or filters to see more.</p>}
        </div>
      )}
    </div>
  );
}
