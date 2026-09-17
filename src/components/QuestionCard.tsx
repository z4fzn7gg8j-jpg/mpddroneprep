import type { Question } from "../lib/types";
import { FAA_AREA_LABELS } from "../lib/types";
import FigureViewer from "./FigureViewer";
import { figureSrc } from "../lib/figures";
import ReportProblemButton from "./ReportProblemButton";

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  selectedChoiceId: string | null;
  flagged: boolean;
  showFeedback: boolean; // true in Study Mode; false during a live exam/assessment
  onSelect: (choiceId: string) => void;
  onToggleFlag?: () => void;
}

export default function QuestionCard({
  question,
  index,
  total,
  selectedChoiceId,
  flagged,
  showFeedback,
  onSelect,
  onToggleFlag,
}: QuestionCardProps) {
  const revealed = showFeedback && selectedChoiceId !== null;

  return (
    <div className="card" aria-label={`Question ${index + 1} of ${total}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
        <div>
          <div style={{ color: "var(--slate-500)", fontSize: "0.85rem", marginBottom: 4 }}>
            Question {index + 1} of {total} &middot; {FAA_AREA_LABELS[question.area]} &middot; {question.topic}
          </div>
          <h3 style={{ marginTop: 0 }}>{question.text}</h3>
        </div>
        {onToggleFlag && (
          <button
            type="button"
            className="btn btn-outline"
            aria-pressed={flagged}
            onClick={onToggleFlag}
          >
            {flagged ? "Unflag" : "Flag for review"}
          </button>
        )}
      </div>

      {question.figure && <FigureViewer figure={question.figure} src={figureSrc(question.figure.figureId)} />}

      <fieldset style={{ border: "none", padding: 0, margin: "var(--space-3) 0 0" }}>
        <legend className="visually-hidden">Answer choices</legend>
        {question.choices.map((choice) => {
          const isSelected = selectedChoiceId === choice.id;
          const isCorrectChoice = choice.id === question.correctChoiceId;
          let borderColor = "var(--line)";
          let bg = "var(--white)";
          if (revealed) {
            if (isCorrectChoice) {
              borderColor = "var(--success-700)";
              bg = "var(--success-100)";
            } else if (isSelected) {
              borderColor = "var(--danger-700)";
              bg = "var(--danger-100)";
            }
          } else if (isSelected) {
            borderColor = "var(--navy-700)";
            bg = "var(--navy-100)";
          }
          return (
            <label
              key={choice.id}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                border: `1.5px solid ${borderColor}`,
                background: bg,
                borderRadius: 6,
                padding: "10px 12px",
                marginBottom: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={isSelected}
                onChange={() => onSelect(choice.id)}
                style={{ marginTop: 3 }}
              />
              <span>
                <strong>{choice.id}.</strong> {choice.text}
                {revealed && (
                  <div style={{ marginTop: 6, fontSize: "0.9rem", color: "var(--slate-500)" }}>
                    {choice.explanation}
                  </div>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>

      {revealed && (
        <div style={{ marginTop: 8, fontSize: "0.85rem", color: "var(--slate-500)" }}>
          ACS code: {question.acsCode} &middot; Source:{" "}
          <a href={question.sourceUrls[0]} target="_blank" rel="noreferrer">
            reference
          </a>
        </div>
      )}
      {revealed && <ReportProblemButton questionId={question.id} />}
    </div>
  );
}
