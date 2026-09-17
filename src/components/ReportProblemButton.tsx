import { useState } from "react";
import { isDemoMode } from "../lib/storage";
import { reportQuestionProblemRemote } from "../lib/remoteAttempts";

interface ReportProblemButtonProps {
  questionId: string;
  attemptId?: string;
}

export default function ReportProblemButton({ questionId, attemptId }: ReportProblemButtonProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Demo mode has no coordinator and nowhere to persist a report, so
  // rather than pretend this button does something, it doesn't render.
  if (isDemoMode()) return null;

  async function submit() {
    if (!note.trim()) return;
    setStatus("sending");
    try {
      await reportQuestionProblemRemote(questionId, attemptId, note.trim());
      setStatus("sent");
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e.message ?? "Could not submit report.");
    }
  }

  if (status === "sent") {
    return <p style={{ fontSize: "0.8rem", color: "var(--success-700)", marginTop: 6 }}>Thanks -- your coordinator can review this.</p>;
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-outline" style={{ fontSize: "0.78rem", padding: "3px 8px", marginTop: 6 }} onClick={() => setOpen(true)}>
        Report a problem with this question
      </button>
    );
  }

  return (
    <div style={{ marginTop: 8, maxWidth: 480 }}>
      <label style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}>
        What's wrong with this question?
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          style={{ display: "block", width: "100%", padding: 8, marginTop: 4, border: "1px solid var(--line)", borderRadius: 6 }}
          placeholder="e.g. the correct answer looks wrong, a choice is ambiguous, a source link is broken..."
        />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn btn-primary" style={{ fontSize: "0.85rem" }} onClick={submit} disabled={status === "sending" || !note.trim()}>
          {status === "sending" ? "Sending..." : "Submit report"}
        </button>
        <button type="button" className="btn btn-outline" style={{ fontSize: "0.85rem" }} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {status === "error" && <p style={{ color: "var(--danger-700)", fontSize: "0.8rem" }}>{errorMsg}</p>}
    </div>
  );
}
