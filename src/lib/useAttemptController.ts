import { useState } from "react";
import type { Attempt, AttemptMode, FaaArea, Question } from "./types";
import { startAttempt as startAttemptLocal, recordAnswer as recordAnswerLocal, toggleFlag as toggleFlagLocal, finalizeAttempt as finalizeAttemptLocal } from "./attempts";
import { startAttemptRemote, submitAnswerRemote, finalizeAttemptRemote } from "./remoteAttempts";
import { isDemoMode } from "./storage";
import { useAuth } from "./auth";
import { ALL_QUESTIONS } from "./questionBank";

export interface BeginOptions {
  mode: AttemptMode;
  areaFilter?: FaaArea | "mixed";
  skillCategory?: string;
  flatMixed?: boolean;
  count?: number;
  pool: Question[];
}

export function useAttemptController() {
  const { officerId } = useAuth();
  const useRemote = !isDemoMode() && !!officerId;
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function begin(opts: BeginOptions) {
    setError(null);
    // Study Mode is intentionally local-only and temporary: it should not
    // create history/database attempts, and it must preserve an exact
    // lesson-specific question pool when one is supplied.
    if (opts.mode === "study" || !useRemote) {
      setAttempt(startAttemptLocal(opts));
      return;
    }
    setBusy(true);
    try {
      setAttempt(await startAttemptRemote({ mode: opts.mode, areaFilter: opts.areaFilter, skillCategory: opts.skillCategory, flatMixed: opts.flatMixed, count: opts.count }));
    } catch (e: any) {
      setError(e.message ?? "Could not start attempt.");
    } finally {
      setBusy(false);
    }
  }

  function select(questionId: string, choiceId: string) {
    if (!attempt) return;
    if (attempt.mode === "study" || !useRemote) {
      setAttempt(recordAnswerLocal(attempt, questionId, choiceId));
      return;
    }
    const flagged = attempt.answers[questionId]?.flagged ?? false;
    setAttempt({
      ...attempt,
      answers: { ...attempt.answers, [questionId]: { questionId, choiceId, flagged, answeredAt: new Date().toISOString() } },
    });
    submitAnswerRemote(attempt.id, questionId, choiceId, flagged).catch((e) => setError(e.message));
  }

  function toggleFlagFn(questionId: string) {
    if (!attempt) return;
    if (attempt.mode === "study" || !useRemote) {
      setAttempt(toggleFlagLocal(attempt, questionId));
      return;
    }
    const current = attempt.answers[questionId];
    const newFlag = !(current?.flagged ?? false);
    setAttempt({
      ...attempt,
      answers: { ...attempt.answers, [questionId]: { questionId, choiceId: current?.choiceId ?? null, flagged: newFlag, answeredAt: current?.answeredAt ?? null } },
    });
    submitAnswerRemote(attempt.id, questionId, current?.choiceId ?? null, newFlag).catch((e) => setError(e.message));
  }

  async function submit(): Promise<Attempt | null> {
    if (!attempt) return null;
    if (attempt.mode === "study" || !useRemote) {
      const updated = finalizeAttemptLocal(attempt, ALL_QUESTIONS);
      setAttempt(updated);
      return updated;
    }
    setBusy(true);
    try {
      const updated = await finalizeAttemptRemote(attempt.id);
      setAttempt(updated);
      return updated;
    } catch (e: any) {
      setError(e.message ?? "Could not submit attempt.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { attempt, setAttempt, begin, select, toggleFlag: toggleFlagFn, submit, busy, error, useRemote };
}
