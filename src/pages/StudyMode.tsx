import { useSearchParams, useNavigate } from "react-router-dom";
import type { FaaArea } from "../lib/types";
import { FAA_AREA_LABELS } from "../lib/types";
import { PUBLISHED_QUESTIONS } from "../lib/questionBank";
import { useAttemptController } from "../lib/useAttemptController";
import AttemptRunner from "../components/AttemptRunner";

const AREAS = Object.keys(FAA_AREA_LABELS) as FaaArea[];

export default function StudyMode() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { attempt, begin, select, submit, busy, error } = useAttemptController();
  const presetArea = (params.get("area") as FaaArea | null) ?? null;

  if (!attempt) {
    return (
      <div>
        <h1>Study Mode</h1>
        <p>Pick an FAA area, or study everything mixed together. Feedback and the full explanation show immediately after you answer, with FAA references and learning links.</p>
        {error && <p style={{ color: "var(--danger-700)" }}>{error}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <button className="btn btn-primary" disabled={busy} onClick={() => begin({ mode: "study", areaFilter: "mixed", pool: PUBLISHED_QUESTIONS })}>
            All areas mixed
          </button>
          {AREAS.map((a) => (
            <button
              key={a}
              className="btn btn-outline"
              disabled={busy}
              onClick={() => begin({ mode: "study", areaFilter: a, pool: PUBLISHED_QUESTIONS })}
              autoFocus={presetArea === a}
            >
              {FAA_AREA_LABELS[a]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Study Mode</h1>
      <AttemptRunner
        attempt={attempt}
        onSelect={select}
        onSubmit={async () => {
          const a = await submit();
          if (a) navigate(`/results/${a.id}`);
        }}
        showFeedbackImmediately
        showNavigator={false}
        showTools={false}
      />
    </div>
  );
}
