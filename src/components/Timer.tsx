import { useEffect, useState } from "react";

interface TimerProps {
  deadlineIso: string;
  onExpire: () => void;
}

/**
 * Renders a live countdown to `deadlineIso`. Because the deadline is a fixed
 * timestamp read from the attempt record (persisted to localStorage in demo
 * mode, and meant to be server-computed in production -- see
 * lib/attempts.ts), refreshing or closing the browser does not reset the
 * timer: on remount this component simply recomputes remaining time from
 * the same deadline.
 */
export default function Timer({ deadlineIso, onExpire }: TimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, new Date(deadlineIso).getTime() - now);

  useEffect(() => {
    if (remainingMs <= 0) onExpire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs <= 0]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const low = remainingMs < 5 * 60 * 1000;

  return (
    <div
      role="timer"
      aria-live="polite"
      style={{
        fontVariantNumeric: "tabular-nums",
        fontWeight: 700,
        padding: "6px 12px",
        borderRadius: 6,
        background: low ? "var(--danger-100)" : "var(--navy-100)",
        color: low ? "var(--danger-700)" : "var(--navy-800)",
      }}
    >
      {h}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")} remaining
    </div>
  );
}
