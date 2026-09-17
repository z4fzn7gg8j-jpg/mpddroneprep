import { useState } from "react";

export default function Calculator() {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState<string | null>(null);

  function press(token: string) {
    setExpr((e) => e + token);
  }

  function clearAll() {
    setExpr("");
    setResult(null);
  }

  function equals() {
    try {
      // Restrict to a safe numeric-expression character set before evaluating.
      if (!/^[0-9+\-*/().\s]*$/.test(expr)) throw new Error("invalid");
      // eslint-disable-next-line no-new-func
      const value = Function(`"use strict"; return (${expr === "" ? "0" : expr})`)();
      setResult(String(value));
    } catch {
      setResult("Error");
    }
  }

  const keys = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "(", ")", "+"];

  return (
    <div className="card" style={{ maxWidth: 280 }}>
      <h3 style={{ marginTop: 0 }}>Calculator</h3>
      <div
        aria-live="polite"
        style={{
          background: "var(--mist)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          padding: 10,
          marginBottom: 8,
          fontFamily: "monospace",
          minHeight: 44,
        }}
      >
        <div>{expr || "0"}</div>
        {result !== null && <div style={{ color: "var(--navy-700)", fontWeight: 700 }}>= {result}</div>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {keys.map((k) => (
          <button key={k} type="button" className="btn btn-outline" onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button type="button" className="btn btn-outline" onClick={clearAll} style={{ gridColumn: "span 2" }}>
          Clear
        </button>
        <button type="button" className="btn btn-gold" onClick={equals} style={{ gridColumn: "span 2" }}>
          =
        </button>
      </div>
    </div>
  );
}
