# MPD Part 107 Readiness

An internal study and readiness-tracking tool for the FAA Unmanned
Aircraft General (UAG) knowledge test (the Part 107 initial exam), built
for the Maricopa Police Department sUAS program.

**This is a study aid, not an FAA product.** It does not certify anyone,
guarantee a passing score, or replace the official FAA testing process.

## What's actually working right now

Run `npm install && npm run dev` and the whole app works immediately in
**local demo mode** -- no account, no Supabase, no email required. Demo
mode:

- Runs all four learning modes (Study, Practice Quiz, Exam Simulation,
  Comprehensive Assessment) against the bundled question bank
- Scores attempts, tracks readiness, and shows the full report/review, all
  in the browser (`src/lib/storage.ts` uses `localStorage`)
- Does **not** create real accounts, share data across devices, or send
  email -- there's a persistent banner on the home page saying so

This is genuinely useful for reviewing the question bank and the readiness
logic today. It is **not** the production deployment -- see "Going to
production" below for what else has to happen first, and read
`KNOWN_LIMITATIONS.md` before you rely on this for real department use.

## Question bank status

**298 of the 300-question target are published today (2 held back pending a source I could not verify).** See
`KNOWN_LIMITATIONS.md` for the honest breakdown and the plan to grow it.
The app itself reports the live count on the home page and warns you in
each mode if the bank is too small to fill a full 60- or 75-question draw
-- it will never silently repeat a question within one attempt to make the
numbers look complete.

## Local development

```bash
npm install
npm run dev        # starts Vite on http://localhost:5173
npm run typecheck  # tsc --noEmit
npm test           # vitest -- scoring, sampling, readiness, question-bank
                    # integrity tests (see TEST_RESULTS.md for last run)
npm run build       # production build to dist/
```

Netlify Functions in `netlify/functions/` are not run by `npm run dev`;
use the Netlify CLI (`netlify dev`) once you've configured Supabase (see
below) if you want to exercise them locally.

## Going to production

You'll configure three external accounts. Each step below says exactly
what to do and which `.env` values it produces. Copy `.env.example` to
`.env` as you go.

### 1. Supabase (database + auth)

This app is deployed into the same Supabase project already used by
Operation 200 / Bill Planner, with every table prefixed `part107_` so it
can never collide with those apps' tables. `supabase/schema.sql` and
`supabase/policies.sql` reflect exactly what was run there.

1. In that project's SQL editor, run `supabase/schema.sql`, then
   `supabase/policies.sql` (skip project creation -- it already exists).
2. Enable Email OTP or Magic Link sign-in under Authentication settings,
   if not already on for that project.
3. Add your department's email domain(s) as rows in the
   `part107_allowed_email_domains` table (SQL editor: `insert into
   part107_allowed_email_domains (domain) values ('maricopa-az.gov');`).
   **Do not guess this domain** -- use the department's real one.
4. Copy that project's URL and anon key into `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY`, and the URL + **service role** key into
   `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (Netlify environment
   variables, function-side only -- never the `VITE_` versions of these).
5. Seed the question bank: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
   node supabase/seed/import.mjs`.
6. Manually promote your own account to coordinator once you've signed in
   once: `update part107_officers set role = 'coordinator' where email =
   'you@yourdept.gov';`

None of this has been run against a real project as part of this
delivery -- treat it as a first draft to test in a Supabase staging
project, not as verified-working.

### 2. Resend (email)

1. Create an account at [resend.com](https://resend.com) and verify a
   sending domain.
2. Create an API key, set `RESEND_API_KEY`.
3. Set `EMAIL_FROM_ADDRESS` to an address on your verified domain.
4. Set `COORDINATOR_EMAIL` to the real program coordinator's address.
5. **Keep `EMAIL_SANDBOX_DOMAIN` set** (e.g. to your own test-account
   domain) until you're deliberately ready to send to real officer
   inboxes -- `send-queued-emails.ts` refuses to send outside that domain
   while it's set.
6. Verify Resend's current API shape against
   [resend.com/docs](https://resend.com/docs) before relying on
   `netlify/functions/send-queued-emails.ts` -- it was written from
   documented behavior, not tested against a live account.

### 3. Netlify (hosting)

1. Connect this repository in the Netlify dashboard, or `netlify deploy`
   from the CLI.
2. Set every variable from `.env.example` (except the `VITE_` ones use the
   "Build" scope; the rest use "Functions") in Site settings → Environment
   variables.
3. Scheduled functions (the email queue worker) require a Netlify plan
   tier that supports them -- confirm current pricing/availability before
   assuming `send-queued-emails` will run on a schedule; a manual/external
   cron hitting its URL is the fallback.
4. Confirm `netlify.toml`'s redirect and functions settings match your
   plan.

See `DEPLOYMENT.md` for the pre-launch checklist and `KNOWN_LIMITATIONS.md`
for everything that still needs work before this is a finished product.

## Project layout

```
src/
  data/questions.json     the question bank (298 published, 2 draft)
  data/resources.json     curated FAA/NOAA source library
  assets/figures/         bundled FAA figures the app imports (see
                           assets/figures/MANIFEST.md for the canonical
                           source copies and provenance)
  lib/                    types, scoring, sampling, readiness, demo storage
  components/             shared UI (question card, figure viewer, timer, ...)
  pages/                  one file per route
netlify/functions/        server-side attempt lifecycle + email queue
supabase/                 schema.sql, policies.sql, seed/import.mjs
assets/figures/           canonical FAA figure source copies + MANIFEST.md
```

## Accessibility

Keyboard navigation, visible focus states, `aria-live` timer/status
regions, and `prefers-reduced-motion` support are built into the base
styles (`src/styles/tokens.css`) and components. This has been reviewed
by eye, not run through an automated accessibility audit tool -- see
`KNOWN_LIMITATIONS.md`.
