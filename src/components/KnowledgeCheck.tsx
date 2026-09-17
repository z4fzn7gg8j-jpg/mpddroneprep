import { useState } from "react";
import type { KnowledgeCheckItem } from "../lib/courseTypes";

interface KnowledgeCheckProps {
  items: KnowledgeCheckItem[];
  onComplete: (score: number) => void; // score is 0-1
}

export default function KnowledgeCheck({ items, onComplete }: KnowledgeCheckProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = items.every((_, i) => answers[i] !== undefined);

  function submit() {
    const correct = items.filter((item, i) => answers[i] === item.answer).length;
    setSubmitted(true);
    onComplete(correct / items.length);
  }

  return (
    <div>
      {items.map((item, i) => {
        const selected = answers[i];
        const revealed = submitted;
        return (
          <div key={i} className="card" style={{ marginBottom: 10 }}>
            <p style={{ fontWeight: 600, marginTop: 0 }}>{item.q}</p>
            {item.choices.map((choice, ci) => {
              const isSelected = selected === ci;
              const isCorrect = ci === item.answer;
              let border = "var(--line)";
              let bg = "var(--white)";
              if (revealed) {
                if (isCorrect) {
                  border = "var(--success-700)";
                  bg = "var(--success-100)";
                } else if (isSelected) {
                  border = "var(--danger-700)";
                  bg = "var(--danger-100)";
                }
              } else if (isSelected) {
                border = "var(--navy-700)";
                bg = "var(--navy-100)";
              }
              return (
                <label
                  key={ci}
                  style={{ display: "flex", gap: 8, alignItems: "center", border: `1.5px solid ${border}`, background: bg, borderRadius: 6, padding: "8px 10px", marginBottom: 6, cursor: submitted ? "default" : "pointer" }}
                >
                  <input
                    type="radio"
                    name={`kc-${i}`}
                    checked={isSelected}
                    disabled={submitted}
                    onChange={() => setAnswers((prev) => ({ ...prev, [i]: ci }))}
                  />
                  {choice}
                </label>
              );
            })}
            {revealed && <p style={{ fontSize: "0.85rem", color: "var(--slate-500)", margin: "6px 0 0" }}>{item.explanation}</p>}
          </div>
        );
      })}
      {!submitted && (
        <button className="btn btn-primary" onClick={submit} disabled={!allAnswered}>
          Check my answers
        </button>
      )}
    </div>
  );
}
