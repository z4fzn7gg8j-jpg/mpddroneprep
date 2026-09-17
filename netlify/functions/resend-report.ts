// POST /.netlify/functions/resend-report
// Body: { attemptId }
//
// STATUS: not yet executed against a live project. See _shared.ts header.

import type { Handler } from "@netlify/functions";
import { supabaseAdmin, requireOfficer, jsonResponse, errorResponse, HttpError, checkRateLimit } from "./_shared";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return jsonResponse(405, { error: "POST only." });
    const officer = await requireOfficer(event.headers.authorization);

    // Real rate limiting for this endpoint specifically is important --
    // it's the one a person could hammer. checkRateLimit is currently a
    // documented no-op; see its doc comment in _shared.ts and
    // KNOWN_LIMITATIONS.md before relying on this in production.
    await checkRateLimit(officer.id, "resend-report");

    const { attemptId } = JSON.parse(event.body ?? "{}");
    if (!attemptId) throw new HttpError(400, "attemptId is required.");

    const admin = supabaseAdmin();
    const { data: attempt, error } = await admin.from("part107_attempts").select("id, officer_id, finalized").eq("id", attemptId).single();
    if (error || !attempt) throw new HttpError(404, "Attempt not found.");
    if (attempt.officer_id !== officer.id) throw new HttpError(403, "This attempt does not belong to you.");
    if (!attempt.finalized) throw new HttpError(409, "This attempt has not been submitted yet.");

    const { data: officerRow } = await admin.from("part107_officers").select("email").eq("id", officer.id).single();

    // Distinct dedupe key per resend request (a timestamp bucket) so
    // repeated legitimate resend clicks are each queued once, while a
    // double-submit of the exact same request within the same second is
    // still deduped.
    const bucket = Math.floor(Date.now() / 5000);
    const { error: qErr } = await admin.from("part107_email_queue").upsert(
      {
        attempt_id: attemptId,
        kind: "resend",
        recipient: officerRow?.email ?? "",
        dedupe_key: `${attemptId}:resend:${bucket}`,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true }
    );
    if (qErr) throw new HttpError(500, `Could not queue resend: ${qErr.message}`);

    // Queued, not sent -- the send-queued-emails worker is what actually
    // delivers it. Tell the officer it was queued, not that it was sent.
    return jsonResponse(200, { queued: true });
  } catch (err) {
    return errorResponse(err);
  }
};
