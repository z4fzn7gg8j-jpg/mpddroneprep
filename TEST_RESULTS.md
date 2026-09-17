# Test results

Last run: 2026-09-17 11:25 UTC (this delivery -- 300-question bank integrated, real auth/backend wiring added, Comprehensive Assessment removed)

## `npm run typecheck` (main app, `tsc -b --noEmit`)
Exit code: 0 -- no errors.

## `npx tsc -p netlify/functions/tsconfig.json`
Exit code: 0 -- no errors.

## `npm run build` (`vite build`, single-file output)
```
vite v5.4.21 building for production...
✓ 121 modules transformed.
dist/index.html  10,006.26 kB │ gzip: 6,574.64 kB
✓ built in 4.40s
```
All 14 bundled FAA figures inlined as base64 data URIs.

## `npm test` (`vitest run`)
```
 RUN  v2.1.9 /home/claude/mpd-part107

 ✓ src/lib/__tests__/scoring.test.ts (4 tests) 3ms
 ✓ src/lib/__tests__/readiness.test.ts (6 tests) 5ms
 ✓ src/lib/__tests__/sampling.test.ts (3 tests) 5ms
 ✓ src/lib/__tests__/questionBank.test.ts (5 tests) 47ms

 Test Files  4 passed (4)
      Tests  18 passed (18)
   Start at  11:24:50
   Duration  1.44s (transform 306ms, setup 0ms, collect 482ms, tests 61ms, environment 1ms, prepare 287ms)
```

18 tests across 4 files, all passing.

## What changed this pass

- Question bank replaced: 60 hand-written questions -> 298 published (2
  draft) from a 300-question file Sean provided, converted into this
  project's schema. See "Question bank" in KNOWN_LIMITATIONS.md for the
  full provenance check I did before integrating it, including the one
  question I reworded and the two I held back.
- 4 more real FAA figures bundled (Figure 2, 23, 26, 59), verified
  against my own copy of the source supplement before any question was
  linked to them -- 14 total now.
- Real authentication built: `Login.tsx`, `AuthProvider`/`useAuth`,
  wired through `App.tsx` route guarding.
- Attempts now persist to Supabase for signed-in officers via the actual
  Netlify Functions, through a new shared `useAttemptController` hook.
  Demo mode (no login) is unchanged.
- Home, Results, and Coordinator Dashboard read real data from Supabase
  when signed in.
- Comprehensive Assessment removed everywhere (page, route, nav, home
  card, backend references).
- Added a required Supabase RLS policy that was missing before
  (`part107_officers_insert_self`) -- without it, sign-in would create a
  session but never successfully create the officer's database row.

## What is NOT covered by this test run

- The live sign-in flow, live attempt persistence, and live coordinator
  view have not been exercised against a real Supabase project by me --
  Sean will be the first to actually test these end to end.
- The 298-question bank has not been independently re-derived against
  the ACS by a second reviewer.
- Distractor-specific explanations (why each wrong answer is wrong) are
  generic placeholders for the 300-question set, since the source file
  only supplied one explanation per question (for the correct answer).
- Accessibility -- reviewed by eye, not run through an automated audit.
