import { useState } from "react";
import type { SupplementReference } from "../lib/courseTypes";
import { resolveSupplementReference } from "../lib/courseFigures";
import { figureSrc } from "../lib/figures";

const SUPPLEMENT_URL = "https://www.faa.gov/sites/faa.gov/files/training_testing/testing/supplements/sport_rec_private_akts.pdf";

interface SupplementFigurePanelProps {
  reference: SupplementReference;
}

export default function SupplementFigurePanel({ reference }: SupplementFigurePanelProps) {
  const figureIds = resolveSupplementReference(reference.reference);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <div>
          <strong style={{ fontSize: "0.9rem" }}>Refer to FAA-CT-8080-2H, {reference.reference}</strong>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--slate-500)" }}>{reference.use}</p>
        </div>
        <a href={SUPPLEMENT_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
          Open FAA Supplement
        </a>
      </div>

      {figureIds.length > 0 ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {figureIds.map((id, i) => (
            <img
              key={id}
              src={figureSrc(id)}
              alt={reference.reference}
              onClick={() => {
                setOpenIndex(i);
                setZoom(1);
              }}
              style={{ maxHeight: 220, maxWidth: "100%", border: "1px solid var(--line)", borderRadius: 4, cursor: "zoom-in" }}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            border: "1px dashed var(--line)",
            borderRadius: 6,
            padding: 20,
            textAlign: "center",
            color: "var(--slate-500)",
            fontSize: "0.85rem",
          }}
        >
          Figure not yet added to this project -- see {reference.reference} in the official FAA supplement above.
        </div>
      )}

      <p style={{ fontSize: "0.75rem", color: "var(--warn-700)", background: "var(--warn-100)", padding: "4px 8px", borderRadius: 4, marginTop: 8, marginBottom: 0 }}>
        Training material for exam preparation only -- not for real-world navigation.
      </p>

      {openIndex !== null && figureIds[openIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, background: "rgba(7,26,51,0.92)", zIndex: 1000, display: "flex", flexDirection: "column" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, color: "var(--white)" }}>
            <span>{reference.reference}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-outline" onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>
                &minus;
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setZoom((z) => Math.min(4, z + 0.5))}>
                +
              </button>
              <button type="button" className="btn btn-gold" onClick={() => setOpenIndex(null)}>
                Close
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflow: "auto", touchAction: "pan-x pan-y pinch-zoom", display: "flex", alignItems: zoom === 1 ? "center" : "flex-start", justifyContent: zoom === 1 ? "center" : "flex-start" }}>
            <img src={figureSrc(figureIds[openIndex])} alt={reference.reference} style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? "100%" : "none" }} />
          </div>
        </div>
      )}
    </div>
  );
}
