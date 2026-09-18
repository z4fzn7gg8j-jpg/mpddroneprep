import { useSearchParams } from "react-router-dom";
import { Link, useNavigate } from "react-router-dom";
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
        {error && <p style={{ color: "var(--danger-700)" }}>{error}</p>}

        <div className="card" style={{ marginBottom: 24, borderColor: "var(--gold-500)", borderWidth: 2 }}>
          <h2 style={{ marginTop: 0 }}>Map & Chart Reading</h2>
          <p style={{ marginBottom: 12 }}>
            A short guided course for reading FAA sectional charts, METAR/TAF, and the load factor chart --
            14 lessons covering Class B/C/D/E airspace, lat/long, airport symbols, special-use airspace, and
            more. Each lesson teaches the method with a real FAA figure, then lets you practice it. Also
            includes a category-by-category Practice mode and a mixed Mastery Check if you just want reps.
          </p>
          <Link to="/study/map-charts" className="btn btn-gold" style={{ textDecoration: "none" }}>
            Learn how to read maps &amp; charts &rarr;
          </Link>
        </div>

        <h2 className="section-title">Study by area</h2>
        <p style={{ color: "var(--slate-500)", marginTop: -6 }}>
          Unrestricted practice, question by question, with full feedback and explanations right after each
          answer. Good for a few questions at a time on a specific area.
        </p>
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
