import { useState } from "react";
import type { FigureRef } from "../lib/types";

interface FigureViewerProps {
  figure: FigureRef;
  src: string;
}

export default function FigureViewer({ figure, src }: FigureViewerProps) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="card" style={{ marginTop: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontSize: "0.9rem" }}>{figure.title}</strong>
        <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>
          Full-screen view
        </button>
      </div>
      {figure.isHistoricalTrainingCopy && (
        <p style={{ fontSize: "0.78rem", color: "var(--warn-700)", background: "var(--warn-100)", padding: "4px 8px", borderRadius: 4, margin: "0 0 8px" }}>
          Training material for exam preparation only -- not for real-world navigation.
        </p>
      )}
      <img
        src={src}
        alt={figure.title}
        style={{ width: "100%", maxHeight: 360, objectFit: "contain", border: "1px solid var(--line)", borderRadius: 4, cursor: "zoom-in" }}
        onClick={() => setOpen(true)}
      />
      <p style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: 6, marginBottom: 0 }}>
        {figure.editionOrDate} &middot;{" "}
        <a href={figure.sourceUrl} target="_blank" rel="noreferrer">
          source
        </a>
      </p>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${figure.title}, full screen`}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(7,26,51,0.92)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, color: "var(--white)" }}>
            <span>{figure.title}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-outline" onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>
                &minus;
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setZoom((z) => Math.min(4, z + 0.5))}>
                +
              </button>
              <button type="button" className="btn btn-gold" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              overflow: "auto",
              touchAction: "pan-x pan-y pinch-zoom",
              display: "flex",
              alignItems: zoom === 1 ? "center" : "flex-start",
              justifyContent: zoom === 1 ? "center" : "flex-start",
            }}
          >
            <img
              src={src}
              alt={figure.title}
              style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? "100%" : "none" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
