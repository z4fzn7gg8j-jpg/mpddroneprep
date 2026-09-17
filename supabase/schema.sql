-- MPD Part 107 Readiness -- Supabase schema
--
-- This app is deployed into a SHARED Supabase project (the one already
-- used by Sean's Operation 200 / Bill Planner apps), so every table here
-- is prefixed part107_ -- this is deliberate, not a mistake, and keeps
-- this schema from ever colliding with those apps' tables. Apply with the
-- Supabase CLI (supabase db push) or paste into the SQL editor.
--
-- This exact file was run against the live shared project as
-- part107-shared-supabase.sql; keep this file and policies.sql in sync
-- with whatever actually ran there if you make further changes.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Officers (mirrors auth.users, which is shared project-wide; role
-- drives the RLS policies below)
-- ---------------------------------------------------------------------
create table if not exists part107_officers (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('officer', 'coordinator')) default 'officer',
  created_at timestamptz not null default now()
);

-- Configurable allowed email domain(s) for sign-in, checked at the
-- application layer before a magic link / OTP is issued. Configure via
-- ALLOWED_EMAIL_DOMAINS in Netlify environment variables -- do not
-- hard-code a department domain here.
create table if not exists part107_allowed_email_domains (
  domain text primary key
);

-- ---------------------------------------------------------------------
-- Question bank
-- ---------------------------------------------------------------------
create table if not exists part107_questions (
  id text primary key,               -- stable id, e.g. 'REG-0007'
  version integer not null default 1,
  status text not null check (status in ('draft', 'published', 'retired')) default 'draft',
  area text not null check (area in ('regulations','airspace','weather','loading_performance','operations')),
  topic text not null,
  subtopic text not null,
  acs_code text not null,
  difficulty text not null check (difficulty in ('intro','standard','advanced')),
  concept_family_id text not null,
  text text not null,
  choices jsonb not null,            -- [{id,text,explanation}, ...] exactly 3
  correct_choice_id text not null,
  source_urls text[] not null default '{}',
  figure jsonb,                      -- {figureId,title,editionOrDate,sourceUrl,isHistoricalTrainingCopy}
  resource_ids text[] not null default '{}',
  last_reviewed date not null,
  updated_at timestamptz not null default now()
);

-- Immutable version history: a full snapshot of a question row every time
-- it changes, so historical attempt reports remain accurate even after an
-- edit.
create table if not exists part107_question_versions (
  question_id text not null references part107_questions (id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  changed_by uuid references part107_officers (id),
  changed_at timestamptz not null default now(),
  primary key (question_id, version)
);

create table if not exists part107_question_problem_reports (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references part107_questions (id),
  reported_by uuid not null references part107_officers (id),
  attempt_id uuid,
  note text not null,
  status text not null check (status in ('open','reviewed','dismissed')) default 'open',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Learning resources
-- ---------------------------------------------------------------------
create table if not exists part107_resources (
  id text primary key,
  title text not null,
  publisher text not null,
  url text not null,
  topic text not null,
  timestamp_note text,
  last_reviewed date not null,
  status text not null check (status in ('ok','flagged_broken','flagged_outdated')) default 'ok'
);

-- ---------------------------------------------------------------------
-- Attempts (the server is authoritative for question selection, deadline,
-- and scoring -- see netlify/functions/start-attempt.ts and
-- finalize-attempt.ts. The browser never writes a score directly.)
-- ---------------------------------------------------------------------
create table if not exists part107_attempts (
  id uuid primary key default gen_random_uuid(),
  officer_id uuid not null references part107_officers (id) on delete cascade,
  mode text not null check (mode in ('study','practice','simulation','comprehensive')),
  area_filter text,
  question_ids text[] not null,
  started_at timestamptz not null default now(),
  deadline timestamptz,               -- server-computed; null for untimed modes
  submitted_at timestamptz,
  finalized boolean not null default false,
  timer_tampered boolean not null default false, -- set true if the server detects a
                                                    -- deadline mismatch/replay; such
                                                    -- attempts must not count toward readiness
  score jsonb                         -- {correct,total,percent,byArea,passedOverall,passedEveryArea}
);

create table if not exists part107_attempt_answers (
  attempt_id uuid not null references part107_attempts (id) on delete cascade,
  question_id text not null references part107_questions (id),
  choice_id text,
  flagged boolean not null default false,
  answered_at timestamptz,
  primary key (attempt_id, question_id)
);

-- ---------------------------------------------------------------------
-- Email delivery queue (queue durably, dedupe, retry, record
-- pending/sent/failed, never show "sent" merely because queued)
-- ---------------------------------------------------------------------
create table if not exists part107_email_queue (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references part107_attempts (id),
  kind text not null check (kind in ('officer_report','coordinator_summary','resend')),
  recipient text not null,
  dedupe_key text not null unique,   -- e.g. attempt_id || ':' || kind, enforces no duplicate sends
  status text not null check (status in ('pending','sent','failed')) default 'pending',
  attempts_made integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_part107_attempts_officer on part107_attempts (officer_id);
create index if not exists idx_part107_attempts_mode on part107_attempts (mode);
create index if not exists idx_part107_questions_area_status on part107_questions (area, status);
create index if not exists idx_part107_email_queue_status on part107_email_queue (status);
