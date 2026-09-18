import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { isDemoMode } from "../lib/storage";
import { parseRawQuestions, bulkUpsertQuestions, type ImportSummary } from "../lib/questionImport";
import type { Question } from "../lib/types";
import { FAA_AREA_LABELS } from "../lib/types";

export default function BulkImport() {
  const demo = isDemoMode();
  const { officerId, officerRole } = useAuth();
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<{ questions: Question[]; summary: ImportSummary } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ succeeded: number; failed: string[] } | null>(null);

  if (demo) {
    return (
      <div className="card">
        <p>Bulk import needs a real Supabase connection -- it writes directly to the live database, which local demo mode doesn't have.</p>
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

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsed(null);
    setParseError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        if (!Array.isArray(raw)) throw new Error("File must contain a JSON array of questions.");
        setParsed(parseRawQuestions(raw));
      } catch (err: any) {
        setParseError(err.message ?? "Could not parse this file.");
      }
    };
    reader.readAsText(file);
  }

  async function runImport() {
    if (!parsed) return;
    setImporting(true);
    setProgress({ done: 0, total: parsed.questions.length });
    const res = await bulkUpsertQuestions(parsed.questions, setProgress);
    setResult(res);
    setImporting(false);
  }

  return (
    <div>
      <p>
        <Link to="/coordinator/questions">&larr; Back to Question Editor</Link>
      </p>
      <h1>Bulk Import Questions</h1>
      <p style={{ color: "var(--slate-500)" }}>
        Upload a question-bank JSON file directly -- no SQL editor needed. This accepts the raw format (with
        fields like <code>question_id</code>, <code>choice_a</code>, <code>why_a</code>,{" "}
        <code>teaching_explanation</code>, etc.) that gets generated externally. Matching happens by{" "}
        <code>question_id</code> -- an existing question with the same id is overwritten with the new content;
        nothing else in the bank is touched or deleted.
      </p>
      <div className="card" style={{ background: "var(--warn-100)", marginBottom: 16 }}>
        <strong>One tradeoff to know:</strong> bulk import does not save version history the way editing one
        question in the Question Editor does (that would mean 400+ extra database writes for a full bank).
        If a specific question needs its edit history preserved, edit it individually instead.
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          <strong>Choose file</strong>
          <input type="file" accept="application/json,.json" onChange={handleFile} style={{ display: "block", marginTop: 6 }} />
        </label>
        {fileName && <p style={{ fontSize: "0.85rem", color: "var(--slate-500)" }}>Selected: {fileName}</p>}
        {parseError && <p style={{ color: "var(--danger-700)" }}>{parseError}</p>}
      </div>

      {parsed && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 className="section-title" style={{ fontSize: "1rem" }}>
            Preview
          </h2>
          <table>
            <tbody>
              <tr>
                <th>Total questions in file</th>
                <td>{parsed.summary.total}</td>
              </tr>
              <tr>
                <th>Will be published</th>
                <td>{parsed.summary.published}</td>
              </tr>
              <tr>
                <th>Will be draft (visual question, no matching bundled figure)</th>
                <td>{parsed.summary.draft}</td>
              </tr>
            </tbody>
          </table>
          <h3 style={{ fontSize: "0.9rem", marginTop: 12 }}>By area</h3>
          <table>
            <tbody>
              {Object.entries(parsed.summary.byArea).map(([area, count]) => (
                <tr key={area}>
                  <td>{FAA_AREA_LABELS[area as keyof typeof FAA_AREA_LABELS] ?? area}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {parsed.summary.errors.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong style={{ color: "var(--danger-700)" }}>{parsed.summary.errors.length} rows had errors and will be skipped:</strong>
              <ul style={{ fontSize: "0.85rem", maxHeight: 150, overflowY: "auto" }}>
                {parsed.summary.errors.slice(0, 30).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <button className="btn btn-primary" onClick={runImport} disabled={importing || parsed.questions.length === 0} style={{ marginTop: 12 }}>
            {importing ? `Importing... (${progress?.done ?? 0}/${progress?.total ?? 0})` : `Import ${parsed.questions.length} questions`}
          </button>
        </div>
      )}

      {result && (
        <div className="card" style={{ background: result.failed.length === 0 ? "var(--success-100)" : "var(--warn-100)" }}>
          <p style={{ margin: 0, fontWeight: 700 }}>
            {result.succeeded} of {parsed?.questions.length} questions imported successfully.
          </p>
          {result.failed.length > 0 && (
            <>
              <p style={{ margin: "8px 0 4px" }}>{result.failed.length} failed:</p>
              <ul style={{ fontSize: "0.85rem" }}>
                {result.failed.slice(0, 20).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
