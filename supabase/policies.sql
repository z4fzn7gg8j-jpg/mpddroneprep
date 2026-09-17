-- MPD Part 107 Readiness -- Row Level Security policies
-- Apply after schema.sql. All policies here are scoped exclusively to
-- part107_* tables -- none of this reads, writes, or references any
-- Operation 200 / Bill Planner table in the shared project.
--
-- Design principle: "Do not rely on hiding an admin link for security."
-- Coordinator access is enforced here, in the database, not just by
-- which page is linked in the UI.

alter table part107_officers enable row level security;
alter table part107_questions enable row level security;
alter table part107_question_versions enable row level security;
alter table part107_question_problem_reports enable row level security;
alter table part107_resources enable row level security;
alter table part107_attempts enable row level security;
alter table part107_attempt_answers enable row level security;
alter table part107_email_queue enable row level security;

-- Helper: is the current authenticated user a Part 107 coordinator?
create or replace function part107_is_coordinator() returns boolean
language sql stable as $$
  select exists (
    select 1 from part107_officers
    where id = auth.uid() and role = 'coordinator'
  );
$$;

-- part107_officers: a user can read their own row; coordinators can read all.
create policy part107_officers_select_self on part107_officers
  for select using (id = auth.uid() or part107_is_coordinator());
create policy part107_officers_update_self on part107_officers
  for update using (id = auth.uid());
-- A signed-in user may create their own officer row (first sign-in), but
-- can never insert a row with role='coordinator' for themselves -- role
-- is forced to 'officer' here, so promoting to coordinator can only
-- happen via a direct SQL update by someone with database access.
create policy part107_officers_insert_self on part107_officers
  for insert with check (id = auth.uid() and role = 'officer');

-- part107_questions: any authenticated officer can read published
-- questions; only coordinators can read draft/retired questions or write
-- at all. The browser NEVER receives correct_choice_id or explanations
-- for an in-progress attempt's questions -- that filtering happens in the
-- Netlify Function response shaping, not here; RLS here only gates raw
-- table access for the admin/editor surface and post-submission review.
create policy part107_questions_select_published on part107_questions
  for select using (status = 'published' or part107_is_coordinator());
create policy part107_questions_write_coordinator on part107_questions
  for all using (part107_is_coordinator()) with check (part107_is_coordinator());

create policy part107_question_versions_coordinator on part107_question_versions
  for select using (part107_is_coordinator());
-- Coordinators can also write version snapshots -- the question editor
-- (coordinator-only, see src/pages/QuestionEditor.tsx) inserts the
-- pre-edit row here before applying an update, so historical attempt
-- reports keep showing the question as it was answered.
create policy part107_question_versions_insert_coordinator on part107_question_versions
  for insert with check (part107_is_coordinator());

create policy part107_problem_reports_insert_own on part107_question_problem_reports
  for insert with check (reported_by = auth.uid());
create policy part107_problem_reports_select on part107_question_problem_reports
  for select using (reported_by = auth.uid() or part107_is_coordinator());
create policy part107_problem_reports_update_coordinator on part107_question_problem_reports
  for update using (part107_is_coordinator());

create policy part107_resources_select_all on part107_resources
  for select using (true);
create policy part107_resources_write_coordinator on part107_resources
  for all using (part107_is_coordinator()) with check (part107_is_coordinator());

-- part107_attempts: an officer can only see and create their own
-- attempts. Coordinators can read (never write) any officer's attempts.
-- Scoring/finalization happens exclusively through the service-role
-- Netlify Function, which bypasses RLS with the service key -- there is
-- intentionally no officer UPDATE/DELETE policy on this table, which is
-- what makes "a browser's submitted score must never be trusted" actually
-- true at the database layer, not just at the API layer.
create policy part107_attempts_select_own on part107_attempts
  for select using (officer_id = auth.uid() or part107_is_coordinator());
create policy part107_attempts_insert_own on part107_attempts
  for insert with check (officer_id = auth.uid());

create policy part107_attempt_answers_select_own on part107_attempt_answers
  for select using (
    exists (select 1 from part107_attempts a where a.id = attempt_id and (a.officer_id = auth.uid() or part107_is_coordinator()))
  );
-- No client-side insert/update policy on part107_attempt_answers either
-- -- answers are written by the submit-answer Netlify Function (service
-- role), which validates the question/choice actually belongs to that
-- attempt before writing.

create policy part107_email_queue_coordinator_read on part107_email_queue
  for select using (part107_is_coordinator());
-- No client policy at all otherwise -- the email queue is written and
-- processed entirely by Netlify Functions with the service role key.
