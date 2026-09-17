# Test results

Last run: 2026-09-17 14:46 UTC (this delivery -- 400-question bank now includes full per-choice teaching content)

## `npm run typecheck` (main app, `tsc -b --noEmit`)
Exit code: 0 -- no errors.

## `npm test` (`vitest run`)
```
 RUN  v2.1.9 /home/claude/mpd-part107

 ✓ src/lib/__tests__/scoring.test.ts (4 tests) 4ms
 ✓ src/lib/__tests__/readiness.test.ts (6 tests) 5ms
 ✓ src/lib/__tests__/sampling.test.ts (3 tests) 5ms
 ✓ src/lib/__tests__/questionBank.test.ts (5 tests) 67ms

 Test Files  4 passed (4)
      Tests  18 passed (18)
   Start at  14:45:32
   Duration  1.93s (transform 572ms, setup 0ms, collect 832ms, tests 81ms, environment 1ms, prepare 316ms)
```

18 tests across 4 files, all passing.

## What changed this pass

- Question bank re-imported from a follow-up file Sean provided
  (`MPD107_400_TEACHING_FINAL.json`) -- same 400 questions, now with
  real per-choice reasoning (`why_a`/`why_b`/`why_c`) instead of the
  earlier generic "see the correct answer" placeholder for wrong
  choices, plus four new fields: `teachingExplanation`, `howToSolve`,
  `memoryTip`, `reviewPrompt`.
- `Question` type extended with the four new optional teaching fields.
- Study Mode's question card now shows the full teaching package
  immediately after answering: teaching explanation, how-to-solve
  method, memory tip, and review prompt, in addition to the existing
  per-choice explanations and figure/source reference.
- Results review page (used by both Practice Quiz and Exam Simulation
  after submission) now shows per-choice explanations inline, and the
  same teaching package -- shown by default for missed questions, behind
  a "Show reasoning" toggle for correctly-answered ones, so a strong
  attempt doesn't bury the page in text nobody needs to re-read.
- Practice Quiz switched to immediate feedback (shows explanation right
  after each answer) instead of only revealing everything at the end,
  matching the note's stated default for Quiz mode.

## What is NOT covered by this test run

- I have not independently verified the ~1,200 per-choice rationales
  (400 questions x 3 choices) against the ACS/regulations myself -- see
  KNOWN_LIMITATIONS.md.
- No "exam-like quiz" toggle (delayed feedback in Practice Quiz) was
  built -- the note flagged this as an optional future addition, not
  required now.
- Accessibility -- reviewed by eye, not run through an automated audit.
