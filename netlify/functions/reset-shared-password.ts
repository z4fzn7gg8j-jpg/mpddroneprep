// POST /.netlify/functions/reset-shared-password
// Body: { newPassword: string }
// Coordinator-only. Resets every existing officer's Supabase Auth password
// to the given value using the admin API (service role) -- this is the
// only way to change the department's shared login password, since each
// officer's account has its own independently-hashed password (whatever
// they typed the first time they signed in), not a single shared value
// stored anywhere. New officers signing in for the first time after this
// runs will naturally get the new password too, since Login.tsx's sign-up
// fallback uses whatever they type.

import type { Handler } from "@netlify/functions";
import { supabaseAdmin, requireOfficer, requireCoordinator, jsonResponse, errorResponse, HttpError } from "./_shared";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") throw new HttpError(405, "Method not allowed.");
    const officer = await requireOfficer(event.headers.authorization);
    requireCoordinator(officer);

    const body = JSON.parse(event.body || "{}");
    const newPassword = String(body.newPassword ?? "");
    if (newPassword.length < 8) {
      throw new HttpError(400, "New password must be at least 8 characters.");
    }

    const admin = supabaseAdmin();
    const { data: officers, error: listErr } = await admin.from("part107_officers").select("id, email");
    if (listErr) throw new HttpError(500, `Could not list officers: ${listErr.message}`);

    let updated = 0;
    const failed: string[] = [];
    for (const o of officers ?? []) {
      const { error } = await admin.auth.admin.updateUserById(o.id, { password: newPassword });
      if (error) {
        failed.push(`${o.email}: ${error.message}`);
      } else {
        updated++;
      }
    }

    return jsonResponse(200, { updated, total: (officers ?? []).length, failed });
  } catch (err) {
    return errorResponse(err);
  }
};
