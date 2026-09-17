# Deployment checklist

Work through this in order. Nothing here has been executed against live
Supabase/Netlify/Resend accounts as part of this delivery -- treat every
box as "should work, needs your verification," not "verified."

## Before first deploy

- [ ] Supabase project created; `schema.sql` then `policies.sql` applied
      in a **staging** project first (or, if going straight to the shared
      Operation 200 project, confirm the `part107_` prefix kept
      everything separate -- run `\dt part107_*` or check the table list
      in the dashboard afterward)
- [ ] `part107_allowed_email_domains` populated with your department's real
      domain(s) -- confirm with IT, don't guess
- [ ] Question bank seeded (`supabase/seed/import.mjs`) and spot-checked:
      pull a few questions back out via the SQL editor and compare against
      `src/data/questions.json`
- [ ] Your own account manually promoted to `coordinator` (see README)
- [ ] Resend domain verified; `EMAIL_SANDBOX_DOMAIN` set to a test domain
      you control
- [ ] All variables from `.env.example` set in Netlify (correct scope:
      build vs. functions)
- [ ] `netlify.toml` functions/redirects reviewed against your actual
      Netlify plan (scheduled functions availability, in particular)

## Before allowing real officer sign-ins

- [ ] Sign in yourself with a synthetic test account through the real
      magic-link/OTP flow end to end
- [ ] Confirm an officer cannot see another officer's attempts (test with
      two synthetic accounts)
- [ ] Confirm a non-coordinator account gets a 403 from `/coordinator`
      data, not just a hidden nav link
- [ ] Run one full 60-question simulation end to end: start, answer,
      flag, refresh mid-attempt (timer must not reset), submit, view
      report
- [ ] Force an expiration: start a simulation, wait past the deadline (or
      temporarily shorten `SIMULATION_TIME_LIMIT_MS` in a test branch),
      confirm it auto-finalizes and unanswered questions score as
      incorrect
- [ ] Submit the same attempt twice in a row (double-click test) and
      confirm only one email is queued per kind
- [ ] Trigger `send-queued-emails` manually once with
      `EMAIL_SANDBOX_DOMAIN` set to your own test domain, confirm the
      email actually arrives and renders correctly, **then** decide when
      to unset the sandbox domain for real officer traffic
- [ ] Edit a published question, confirm a prior attempt's report still
      shows the old wording (via `question_versions`)

## Before telling the department it's ready to use

- [ ] Mobile check: run a full simulation on an actual phone, not just a
      resized desktop browser -- confirm figure/chart readability once
      real figure assets are added (see `KNOWN_LIMITATIONS.md`, none are
      bundled yet)
- [ ] Confirm the coordinator dashboard's roster, weak-topics, and
      attempt-history views reflect more than one real officer account
- [ ] Decide and document your real data-retention period, and confirm
      nothing in the schema silently keeps data longer than that (there is
      no automatic purge job in this delivery -- see
      `KNOWN_LIMITATIONS.md`)
- [ ] Reconfirm the FAA source data this app is built on is still current
      (question counts, passing score, subject ranges) against
      `faa.gov/training_testing/testing/acs/uas_acs.pdf` -- verified as of
      September 2026 for this delivery, but FAA guidance can change
