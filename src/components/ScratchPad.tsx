import { useEffect, useState } from "react";

interface ScratchPadProps {
  attemptId: string;
}

export default function ScratchPad({ attemptId }: ScratchPadProps) {
  const key = `mpd107_scratch_${attemptId}`;
  const [text, setText] = useState(() => localStorage.getItem(key) ?? "");

  useEffect(() => {
    localStorage.setItem(key, text);
  }, [key, text]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Scratch pad</h3>
      <textarea
        aria-label="Scratch pad"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        style={{
          width: "100%",
          border: "1px solid var(--line)",
          borderRadius: 6,
          padding: 8,
          fontFamily: "monospace",
          resize: "vertical",
        }}
        placeholder="Notes, calculations, chart annotations..."
      />
    </div>
  );
}
