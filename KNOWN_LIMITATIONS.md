# Known limitations and remaining work

This file is the single source of truth for "is this actually done." If
something isn't listed here as done-and-verified, assume it needs work.

## Question bank: 298 of 300 published (2 held back, explained below)

This bank comes from a 300-question file Sean provided
(`MPD107_300_question_bank_QA_corrected.json`), converted into this
project's schema. I did not write these 300 questions myself. What I did
before integrating it:

- Checked its `origin` field across all 300 entries: 234 are labeled
  "Original," 30 "Adapted from FAA official sample" (FAA does publish
  official sample questions publicly -- adapting those is standard,
  legitimate practice), and the rest are various QA-correction labels
  ("QA revised against current FAA guidance," etc.) suggesting the file
  went through at least one accuracy-review pass before reaching me.
- Checked for overlap with a different, copyrighted third-party quiz
  Sean had pasted earlier in this conversation (which I declined to
  copy from). Found real topical overlap -- both draw on the same public
  FAA source figures -- but the actual question wording is independent,
  **except** one entry (a thunderstorm-lifecycle question) whose phrasing
  was close enough to that quiz's version that I'd want it reworded
  before fully trusting it; flagging that here rather than silently
  leaving it.
- Verified every figure this file references against my own copy of the
  FAA supplement (see "Figures and charts" below) before attaching any
  figure to a question -- I did not take the file's figure citations on
  faith.

Distribution (published only, all within FAA-published ranges):

| Area | Published | Target |
|---|---|---|
| Regulations | 60 | 60 |
| Airspace and requirements | 58 | 60 |
| Weather | 40 | 42 |
| Loading and performance | 25 | 27 |
| Operations | 115 | 111 |
| **Total** | **298** | **300** |

**The 2 held back** (`UAG-071`, `UAG-072`, both airspace) cite a source I
have no way to verify: "the FAA Airman Testing Community Advisory, April
2026." I don't have that document, couldn't find it, and won't publish a
question whose figure I can't confirm exists or depicts what's claimed.
Both are `status: "draft"` and excluded from every real attempt. If you
have that source, send it and I'll verify and publish them properly.

**What's still unverified:** I checked structure, provenance, and figure
citations, but I have not independently re-derived the correct answer for
all 298 questions against the ACS/regulations myself the way I did for
the smaller hand-written set this replaced. Distractor-level explanations
for wrong answers were not present in the source file (it only provided
one explanation, for the correct answer) -- rather than invent
plausible-sounding but unverified reasoning for why each specific wrong
answer is wrong, incorrect choices show a neutral "see the explanation on
the correct answer above" instead of a fabricated distractor-specific
rationale. Before trusting this bank for real exam-readiness decisions,
have someone at MPD spot-check a sample against the current FAA ACS.

To add more or edit any question: follow the shape in `src/lib/types.ts`
(`Question` interface), run `npm test` (`questionBank.test.ts` checks
structural integrity), then re-run `supabase/seed/import.mjs`.

## Figures and charts: 14 real FAA figures bundled

Spec section 5 requires authentic FAA figures. Fourteen are now bundled,
all extracted from the same official FAA **Airman Knowledge Testing
Supplement for Sport Pilot, Recreational Pilot, Remote Pilot, and Private
Pilot** (2018 edition), which explicitly covers Unmanned Aircraft General
(UAG), i.e. the Part 107 test:

| Figure | Used by |
|---|---|
| Legend 1 -- Sectional Aeronautical Chart | 2 questions |
| Figure 2 -- Load Factor Chart | 2 questions |
| Figure 8 -- Density Altitude Chart | 1 question (illustrative) |
| Figure 12 -- METAR | 3 questions |
| Figure 15 -- TAF | 1 question |
| Figure 17 -- Winds and Temperatures Aloft Forecast | 1 question |
| Figure 20 -- Sectional Chart Excerpt (Norfolk, VA) | 4 questions |
| Figure 21 -- Sectional Chart Excerpt (north-central ND) | 5 questions |
| Figure 22 -- Sectional Chart Excerpt (Coeur d'Alene, ID) | 4 questions |
| Figure 23 -- Sectional Chart Excerpt (Savannah, GA) | 2 questions |
| Figure 25 -- Sectional Chart Excerpt (Dallas/Fort Worth, TX) | 1 question |
| Figure 26 -- Sectional Chart Excerpt (Cooperstown/Jamestown, ND) | 4 questions |
| Figure 59 -- Sectional Chart Excerpt (Toledo, OH) | 1 question |
| Figure 75 -- Sectional Chart Excerpt (Buckeye/Gila Bend, AZ) | 2 questions |

Source images live at `assets/figures/*.jpg` (canonical copies, per
`assets/figures/MANIFEST.md`) and `src/assets/figures/*.jpg` (working
copies the app actually imports/bundles -- kept in sync manually; if you
replace a figure, update both). Every figure-backed question's `figure`
field is marked `isHistoricalTrainingCopy: true`, which
`FigureViewer.tsx` renders as an on-screen "training material... not for
real-world navigation" notice, and the app never falls back to an
AI-generated chart.

**What's honestly unverified about the original 9 chart questions I wrote
by hand** (before the 300-question file arrived, still present for the
figures they cover): they were written by reading clearly-labeled text
directly off each chart -- a "W-50" warning area label, a "DEVILS LAKE
WEST MOA" label, an "AWOS-3 135.075" frequency box, a large-digit/
small-digit MEF quadrangle number, a "BUCKEYE 110.6 Ch 43 BXK" VOR box,
"ALERT AREA A-231" and "RESTRICTED R-2304" labels -- rather than
interpreting ambiguous symbol coloring or fine print. The 21
figure-backed questions from the 300-question file were only matched to
a bundled figure after I independently confirmed that figure actually
shows what the file claimed (e.g., confirming "SAVANNAH CLASS C" is
genuinely labeled on Figure 23 before attaching it) -- I did not verify
each individual answer choice against the chart pixel-by-pixel the way I
did for my own 9.

**Currency caveat:** this supplement is dated 2018. Sectional chart
symbology and specific METAR/TAF station data shown are for
illustration/testing purposes, not current navigation -- confirm against
the FAA's current AKTS edition (faa.gov/training_testing/testing) before
treating the symbol set as definitively current.

There is still room to add more figures from the same document (it has
113 pages; most of the rest cover other certificates, not UAG) -- see
`assets/figures/MANIFEST.md` for the process.

## Video resources: none included

`src/pages/Resources.tsx` deliberately lists zero videos and says why.
Spec section 9 requires every video link verified as working, actually
teaching the topic, and reuse-checked -- I didn't do that verification
work in this session, so I didn't invent links either.

## Server-side (Netlify Functions + Supabase): written, not tested live

`netlify/functions/*.ts` and `supabase/*.sql` type-check cleanly and are
written to the security model in spec section 11 (server-side scoring,
deadline enforcement, ownership checks, no-trust-the-browser). All table
names are prefixed `part107_` because this app shares a Supabase project
with Operation 200 / Bill Planner rather than getting its own -- that
prefix was applied consistently across schema.sql, policies.sql, the seed
script, and every Netlify Function, verified by grepping for any
remaining unprefixed table-name string after the change (none found) and
by a clean `tsc` pass on the functions folder. What's still unverified is
whether it actually behaves correctly **at runtime** against the live
project, since no Supabase project or Netlify site was exercised in this
session. Specifically unverified:

- Auth flow (magic link / OTP) end to end
- RLS policies actually blocking cross-officer access (written per the
  documented Postgres/Supabase RLS model, not exercised)
- The scheduled email worker actually running on a schedule (Netlify
  plan-dependent -- see README)
- Resend's exact current API shape (`netlify/functions/send-queued-emails.ts`
  was written from Resend's documented interface, not a live call)
- Turnstile abuse protection: not implemented at all, only mentioned in
  `.env.example` as a placeholder

## Rate limiting: a documented no-op

`checkRateLimit()` in `netlify/functions/_shared.ts` is called everywhere
the spec asks for rate limiting, but its body is intentionally empty with
a comment explaining why (Netlify Functions are stateless per-invocation;
real rate limiting needs a durable store, e.g. a Supabase table keyed by
officer + action + time bucket). I chose an honest no-op over a fake
pass-through that would look implemented but wasn't. This must be built
before production use, especially for `resend-report.ts`.

## Data retention: schema only, no purge job

`.env.example` and the schema support configuring retention, but there is
no scheduled job that actually deletes old attempts/emails after a
retention window. Decide a real policy and build that job before
treating retention as "handled."

## Accessibility: reviewed by eye, not audited

Keyboard nav, focus states, `aria-live` regions, and reduced-motion
support are built in, but no automated audit (axe, Lighthouse, or a
screen-reader pass) has been run.

## Duplicate-question guarantee vs. bank size

`src/lib/sampling.ts` and `netlify/functions/start-attempt.ts` both
guarantee **zero duplicate questions within a single attempt**, even when
the bank is too small to fill the target distribution -- verified by
`src/lib/__tests__/sampling.test.ts`. The tradeoff: with only 55 questions
published, an Exam Simulation or Comprehensive Assessment will currently
contain **fewer than 60 or 75 questions respectively** in whichever areas
run short, rather than repeat one. The UI warns about this before you
start an attempt. This resolves naturally as the bank grows -- it does not
need a code change, only more published questions.

## MPD orientation area

Spec section 10 asks for an optional, clearly-unconfigured post-
certification orientation area. Not built in this delivery -- there is no
placeholder page for it yet. Add a route/page only once real MPD policy
content exists to put there; don't invent Skydio procedures or department
policy to fill it.

## Public safety / PAO framing (spec section 1 and question OPS-0017)

The app and the one question addressing Part 107 vs. public aircraft
operations describe the distinction at a general, factual level and
explicitly avoid presenting any MPD-specific waiver or exception as an
ordinary Part 107 rule. No MPD-specific PAO determination is represented
anywhere in the app -- that determination is the department's to make with
its own legal counsel, not something this tool should imply.
