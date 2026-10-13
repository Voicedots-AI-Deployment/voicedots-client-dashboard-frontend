export type CandidateAttempt = {attempt_number?: number;max_attempts?: number;assignment_status?: string;submission_id?: string | null;started_at?: string};

export function attemptValue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
}

function attemptCounts(candidate: CandidateAttempt, driveMaxAttempts?: unknown): [number, number] {
  const current = attemptValue(candidate.attempt_number, 1);
  const maximum = attemptValue(candidate.max_attempts ?? driveMaxAttempts, 1);
  const status = String(candidate.assignment_status || "").toLowerCase();
  const currentUsed = status === "in_progress" || status === "completed" || status === "expired" && Boolean(candidate.submission_id || candidate.started_at);
  return [currentUsed ? current : Math.max(0, current - 1), maximum];
}
export function AttemptBadge({ candidate, driveMaxAttempts, compact=false }: { candidate: CandidateAttempt; driveMaxAttempts?: unknown;compact?:boolean }) { const [used, allowed] = attemptCounts(candidate, driveMaxAttempts); const current = attemptValue(candidate.attempt_number, 1); const status = String(candidate.assignment_status || "").toLowerCase(); const tone = used === 0 ? "bg-slate-100 text-slate-700" : used >= allowed ? "bg-rose-100 text-rose-800" : used === allowed - 1 ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"; const label = status === "in_progress" ? `Attempt ${current} of ${allowed} · in progress` : status === "completed" ? `${used}/${allowed} attempts used · completed` : status === "expired" ? `${used}/${allowed} attempts used · expired` : `${used}/${allowed} used · attempt ${current} available`; return <span title={compact?label:undefined} aria-label={compact?label:undefined} className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${compact?"bg-slate-100 text-slate-700":tone}`}>{compact?`${used}/${allowed} used`:label}</span>; }
