import type { ReadinessStatus } from "../lib/types";
import { READINESS_LABELS } from "../lib/readiness";

const CLASS: Record<ReadinessStatus, string> = {
  developing: "badge-developing",
  nearly_ready: "badge-nearly",
  one_qualifying_attempt: "badge-one",
  recommended_to_schedule: "badge-ready",
};

export default function ReadinessBadge({ status }: { status: ReadinessStatus }) {
  return <span className={`badge ${CLASS[status]}`}>{READINESS_LABELS[status]}</span>;
}
