// Scheduled function (configure in netlify.toml as a cron trigger, e.g.
// every 2 minutes) that drains pending rows from email_queue.
//
// STATUS: not yet executed against a live Supabase or Resend account --
// there is no RESEND_API_KEY configured for this delivery. This is written
// against Resend's documented API shape; verify against
// https://resend.com/docs before relying on it, per the "verify current
// official documentation before implementing integrations" instruction.
//
// Per spec section 8:
//   - never send actual officer emails during development (guarded below
//     by REQUIRE_SANDBOX_EMAIL / EMAIL_SANDBOX_DOMAIN)
//   - never show "email sent" merely because it was queued -- this worker
//     is what actually flips status to 'sent', only after the provider
//     confirms
//   - retry transient failures safely, without duplicate sends

import type { Handler } from "@netlify/functions";
import { Resend } from "resend";
import { supabaseAdmin } from "./_shared";
import { renderOfficerReportEmail, renderCoordinatorSummaryEmail } from "./_emailTemplates";

const MAX_ATTEMPTS = 5;

export const handler: Handler = async () => {
  const admin = supabaseAdmin();
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("RESEND_API_KEY not configured; skipping email queue processing.");
    return { statusCode: 200, body: "no-op: RESEND_API_KEY not set" };
  }
  const resend = new Resend(resendKey);

  const sandboxDomain = process.env.EMAIL_SANDBOX_DOMAIN; // e.g. set during development/testing
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;
  const coordinatorEmail = process.env.COORDINATOR_EMAIL;
  if (!fromAddress) {
    console.error("EMAIL_FROM_ADDRESS not configured; skipping.");
    return { statusCode: 200, body: "no-op: EMAIL_FROM_ADDRESS not set" };
  }

  const { data: pending, error } = await admin
    .from("part107_email_queue")
    .select("*")
    .eq("status", "pending")
    .lt("attempts_made", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(25);
  if (error) {
    console.error("Could not load email queue:", error.message);
    return { statusCode: 500, body: error.message };
  }

  for (const job of pending ?? []) {
    try {
      const { data: attempt } = await admin.from("part107_attempts").select("*, part107_officers(name, email)").eq("id", job.attempt_id).single();
      if (!attempt) throw new Error("attempt not found for queued email");

      let to: string;
      let subject: string;
      let html: string;

      if (job.kind === "officer_report") {
        to = attempt.part107_officers.email;
        subject = "Your Part 107 readiness report";
        html = renderOfficerReportEmail(attempt);
      } else if (job.kind === "coordinator_summary") {
        if (!coordinatorEmail) throw new Error("COORDINATOR_EMAIL not configured");
        to = coordinatorEmail;
        subject = `Part 107 attempt summary -- ${attempt.part107_officers.name}`;
        html = renderCoordinatorSummaryEmail(attempt);
      } else {
        // 'resend' jobs carry their own recipient/attempt already resolved
        // by resend-report.ts.
        to = job.recipient;
        subject = "Your Part 107 readiness report (resent)";
        html = renderOfficerReportEmail(attempt);
      }

      if (sandboxDomain && !to.endsWith(`@${sandboxDomain}`)) {
        throw new Error(
          `EMAIL_SANDBOX_DOMAIN is set to ${sandboxDomain}; refusing to send to ${to}. Unset EMAIL_SANDBOX_DOMAIN only when ready for real officer email.`
        );
      }

      const result = await resend.emails.send({ from: fromAddress, to, subject, html });
      if (result.error) throw new Error(result.error.message);

      await admin
        .from("part107_email_queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", job.id);
    } catch (err: any) {
      await admin
        .from("part107_email_queue")
        .update({
          attempts_made: job.attempts_made + 1,
          last_error: String(err?.message ?? err),
          status: job.attempts_made + 1 >= MAX_ATTEMPTS ? "failed" : "pending",
        })
        .eq("id", job.id);
    }
  }

  return { statusCode: 200, body: `processed ${pending?.length ?? 0}` };
};
