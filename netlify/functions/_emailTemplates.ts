// Plain, dependency-free HTML string templates. Kept intentionally simple
// (inline styles, table layout) for broad email-client compatibility.
// STATUS: not yet rendered through a live send -- verify formatting in
// Resend's test/sandbox mode before real use.

export function renderOfficerReportEmail(attempt: any): string {
  const score = attempt.score ?? {};
  const rows = (score.byArea ?? [])
    .map(
      (a: any) =>
        `<tr><td style="padding:4px 8px;">${a.area}</td><td style="padding:4px 8px;">${a.correct}/${a.total}</td><td style="padding:4px 8px;">${a.percent}%</td></tr>`
    )
    .join("");

  return `
  <div style="font-family: Arial, sans-serif; color: #071A33; max-width: 560px;">
    <h2 style="color:#071A33;">Your Part 107 readiness report</h2>
    <p>Overall score: <strong>${score.correct}/${score.total} (${score.percent}%)</strong></p>
    <table style="border-collapse: collapse; width:100%;">
      <thead><tr><th align="left">Area</th><th align="left">Correct</th><th align="left">Score</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#4B5A6B; font-size: 0.9em;">
      This is an internal MPD study recommendation, not an FAA certification or a guarantee of passing the
      official exam. Full question-by-question review is on the protected results page:
      ${process.env.PUBLIC_APP_URL ?? "(set PUBLIC_APP_URL)"}/results/${attempt.id}
    </p>
    <p style="color:#8593A2; font-size: 0.8em;">
      If this message doesn't include the full review due to length, use the link above for the complete report.
    </p>
  </div>`;
}

export function renderCoordinatorSummaryEmail(attempt: any): string {
  const score = attempt.score ?? {};
  const weak = (score.byArea ?? [])
    .filter((a: any) => a.percent < 75)
    .map((a: any) => `${a.area} (${a.percent}%)`)
    .join(", ") || "none";

  return `
  <div style="font-family: Arial, sans-serif; color: #071A33; max-width: 560px;">
    <h2 style="color:#071A33;">Attempt summary -- ${attempt.part107_officers?.name ?? "Officer"}</h2>
    <p>Overall: ${score.correct}/${score.total} (${score.percent}%)</p>
    <p>Weak subjects: ${weak}</p>
    <p><a href="${process.env.PUBLIC_APP_URL ?? "(set PUBLIC_APP_URL)"}/coordinator">Open coordinator dashboard</a></p>
  </div>`;
}
