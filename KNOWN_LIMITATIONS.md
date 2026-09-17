# Known limitations and remaining work

This file is the single source of truth for "is this actually done." If
something isn't listed here as done-and-verified, assume it needs work.

## Question bank: 400 of 400 published, on the current (Sept 2025) blueprint

This bank replaced the earlier 298-question one. It comes from a file
Sean provided (`MPD107_400_visual_first_question_bank.json`), built on
top of the earlier QA-corrected 300-question bank plus 100 new questions
for the current blueprint's heavier Regulations/Operations weighting.
Before integrating it, I independently verified the single biggest claim
in the file -- that the FAA's scoring blueprint changed -- via a live web
search, since it's a dramatic swing from the old ACS ranges (Regulations
15-25%, Operations 35-45%) to the new one (Regulations 48%, Operations
25%). Confirmed via the FAA's own August 2025 Airman Testing Community
Advisory and PSI's Applicant Information Bulletin (effective September
29, 2025, PSI is the FAA's testing vendor): the old ACS table is now
obsolete and the FAA directs applicants to the PSI bulletin instead. This
app was still teaching the old, obsolete weighting until this update --
that was a real accuracy problem, now fixed.

Distribution (published, matching the 48/20/5/2/25 blueprint exactly):

| Area | Published | Blueprint % |
|---|---|---|
| Regulations | 192 | 48% |
| Airspace Classification and Operating Requirements | 80 | 20% |
| Weather | 20 | 5% |
| Loading and Performance | 8 | 2% |
| Operations | 100 | 25% |
| **Total** | **400** | **100%** |

The 60-question Exam Simulation draws a fixed 29/12/3/1/15 mix -- the
closest whole-question representation of that blueprint at 60 questions
(same method the source file used). All 400 are `status: "published"`;
none held back this time, since every figure the file cited matched a
verified asset.

**What I checked before integrating:** the `origin` field on all 400
entries (mix of "Retained from QA-corrected 300-question bank," new
generation for the areas that grew, no entries claiming to derive from
the third-party quiz Sean pasted earlier), and every `supplement_figure`
citation against my own copy of the source PDF -- I pulled 4 more figures
(24, 69, 74, 78) I didn't have yet and visually confirmed each one before
attaching it to any question, same process as before.

**What's still unverified:** I have not independently re-derived the
correct answer for all 400 questions against the ACS/regulations myself.
Before relying on this for real exam-readiness decisions, have someone at
MPD spot-check a sample, especially in Regulations given how much new
content that area picked up.

**Teaching content (added in a follow-up upload):** every question now
has genuine per-choice reasoning (why each of A/B/C is right or wrong,
not the earlier generic "see the correct answer" placeholder), plus a
`teachingExplanation`, a repeatable `howToSolve` method, a short
`memoryTip`, and a `reviewPrompt` that asks the learner to restate the
reasoning in their own words. These display in Study Mode immediately
after answering, and in the post-submission review for Practice Quiz and
Exam Simulation (shown by default for missed questions, behind a "Show
reasoning" toggle for correct ones). I did not independently verify each
of the 1,200 per-choice rationales (400 questions x 3 choices) -- same
caveat as the correct-answer claims above.
placeholders (the source data only supplies one explanation, for the
correct answer) rather than invented reasoning I can't verify. Before
relying on this for real exam-readiness decisions, have someone at MPD
spot-check a sample, especially in Regulations given how much new content
that area picked up.

**Not replicated:** the real UAG exam is 65 questions on the day (60
scored + 5 unscored "validation" questions, indistinguishable from each
other, all counted toward the 120-minute limit). This simulation stays at
60 scored questions only -- reproducing indistinguishable unscored
questions would add complexity without teaching anything, since the
examinee can't tell them apart on the real test either.

**Currency caveat on top of the currency caveat:** the FAA's own advisory
says another test change is coming -- image-based questions using charts
not in the printed supplement, effective October 26, 2026 (corrected from
an earlier-stated October 27 by a subsequent FAA advisory -- verified
against an actual FAA-hosted PDF dated August 2026). This app
intentionally keeps using the official supplement figures for now (they
teach the same chart-reading skills), but that October 2026 change should
be checked against before trusting this blueprint indefinitely.

To add more or edit any question: follow the shape in `src/lib/types.ts`
(`Question` interface), run `npm test` (`questionBank.test.ts` checks
structural integrity), then re-run `supabase/seed/import.mjs` --- or use
the in-app Question Editor (Coordinator Dashboard -> Question Editor).

## Figures and charts: 18 real FAA figures bundled

Spec section 5 requires authentic FAA figures. Eighteen are now bundled,
all extracted from the same official FAA **Airman Knowledge Testing
Supplement for Sport Pilot, Recreational Pilot, Remote Pilot, and Private
Pilot** (2018 edition), which explicitly covers Unmanned Aircraft General
(UAG), i.e. the Part 107 test:

| Figure | Used by |
|---|---|
| Legend 1 -- Sectional Aeronautical Chart | 10 questions |
| Figure 2 -- Load Factor Chart | 8 questions |
| Figure 8 -- Density Altitude Chart | 1 question (illustrative) |
| Figure 12 -- METAR | 11 questions |
| Figure 15 -- TAF | 7 questions |
| Figure 17 -- Winds and Temperatures Aloft Forecast | 1 question |
| Figure 20 -- Sectional Chart Excerpt (Norfolk, VA) | 18 questions |
| Figure 21 -- Sectional Chart Excerpt (north-central ND) | 22 questions |
| Figure 22 -- Sectional Chart Excerpt (Coeur d'Alene, ID) | 15 questions |
| Figure 23 -- Sectional Chart Excerpt (Savannah, GA) | 18 questions |
| Figure 24 -- Sectional Chart Excerpt (northeast TX) | 9 questions |
| Figure 25 -- Sectional Chart Excerpt (Dallas/Fort Worth, TX) | 12 questions |
| Figure 26 -- Sectional Chart Excerpt (Cooperstown/Jamestown, ND) | 15 questions |
| Figure 59 -- Sectional Chart Excerpt (Toledo, OH) | 1 question |
| Figure 69 -- Sectional Chart Excerpt (Corpus Christi, TX) | 1 question |
| Figure 74 -- Sectional Chart Excerpt (San Jose/Bay Area, CA) | 3 questions |
| Figure 75 -- Sectional Chart Excerpt (Buckeye/Gila Bend, AZ) | 5 questions |
| Figure 78 -- Sectional Chart Excerpt (Sioux City, IA) | 6 questions |

Source images live at `assets/figures/*.jpg` (canonical copies, per
`assets/figures/MANIFEST.md`) and `src/assets/figures/*.jpg` (working
copies the app actually imports/bundles -- kept in sync manually; if you
replace a figure, update both). Every figure-backed question's `figure`
field is marked `isHistoricalTrainingCopy: true`, which
`FigureViewer.tsx` renders as an on-screen "training material... not for
real-world navigation" notice, and the app never falls back to an
AI-generated chart.

**What's honestly unverified about the original 9 chart questions I wrote
by hand** (before either question-bank file arrived, still present for
the figures they cover): they were written by reading clearly-labeled
text directly off each chart -- a "W-50" warning area label, a "DEVILS
LAKE WEST MOA" label, an "AWOS-3 135.075" frequency box, a large-digit/
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
