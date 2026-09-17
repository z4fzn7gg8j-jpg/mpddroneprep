#!/usr/bin/env node
// One-time / repeatable importer: loads src/data/questions.json and
// src/data/resources.json into Supabase using the service role key.
//
// NOT executed against a live project as part of this delivery -- there is
// no Supabase project configured. Run it yourself after setup:
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/seed/import.mjs
//
// Safe to re-run: it upserts by primary key (question id / resource id).
// Editing a question afterward should go through the coordinator question
// editor (once built) rather than re-running this importer, so that
// question_versions history is captured correctly on each change.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const questions = JSON.parse(readFileSync(path.join(__dirname, "../../src/data/questions.json"), "utf8"));
const resources = JSON.parse(readFileSync(path.join(__dirname, "../../src/data/resources.json"), "utf8"));

function toRow(q) {
  return {
    id: q.id,
    version: q.version,
    status: q.status,
    area: q.area,
    topic: q.topic,
    subtopic: q.subtopic,
    acs_code: q.acsCode,
    difficulty: q.difficulty,
    concept_family_id: q.conceptFamilyId,
    text: q.text,
    choices: q.choices,
    correct_choice_id: q.correctChoiceId,
    source_urls: q.sourceUrls,
    figure: q.figure ?? null,
    resource_ids: q.resourceIds,
    last_reviewed: q.lastReviewed,
  };
}

async function main() {
  console.log(`Importing ${questions.length} questions and ${resources.length} resources...`);

  const { error: qErr } = await supabase.from("part107_questions").upsert(questions.map(toRow), { onConflict: "id" });
  if (qErr) {
    console.error("Question import failed:", qErr.message);
    process.exit(1);
  }

  const { error: rErr } = await supabase.from("part107_resources").upsert(
    resources.map((r) => ({
      id: r.id,
      title: r.title,
      publisher: r.publisher,
      url: r.url,
      topic: r.topic,
      timestamp_note: r.timestampNote ?? null,
      last_reviewed: r.lastReviewed,
      status: r.status,
    })),
    { onConflict: "id" }
  );
  if (rErr) {
    console.error("Resource import failed:", rErr.message);
    process.exit(1);
  }

  console.log("Import complete.");
}

main();
