import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, ShieldCheck, Volume2 } from "lucide-react";
import { collegeApi, collegeError, type Drive } from "@/api/collegeApi";
import { btn, field, panel } from "./interviewAgentTypes";
import { displayName } from "./placementDisplay";

type Data = Record<string, unknown>;
type Report = Data & {
  drive_id?: string;
  session_id?: string;
  overall_score?: number;
  readiness?: string;
  completed_at?: string;
  detail?: Data;
};
const nav = [
  "summary",
  "competencies",
  "role-fit",
  "panel-rounds",
  "evidence",
  "integrity",
  "decision",
];
const show = (value: unknown, fallback = "Not available") =>
  value === null || value === undefined || value === ""
    ? fallback
    : String(value);
const stamp = (value: unknown) =>
  value ? new Date(String(value)).toLocaleString() : "Not available";

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: unknown;
  helper?: string;
}) {
  return (
    <article className={panel}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <strong className="mt-2 block text-2xl">{show(value, "—")}</strong>
      {helper && <p className="mt-2 text-xs text-slate-500">{helper}</p>}
    </article>
  );
}
function List({ items, empty }: { items: unknown; empty: string }) {
  const values = Array.isArray(items) ? items : [];
  if (!values.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <div className="space-y-3">
      {values.map((raw, index) => {
        const item: Data =
          typeof raw === "object" && raw ? (raw as Data) : { label: raw };
        const actions: unknown[] = Array.isArray(item.actions)
          ? item.actions
          : [];
        return (
          <article
            className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800"
            key={index}
          >
            <div className="flex justify-between gap-3">
              <strong>
                {show(
                  item.label ||
                    item.focus ||
                    item.requirement ||
                    item.role ||
                    item.dimension ||
                    item.strength ||
                    item.skill ||
                    item.name ||
                    item.title ||
                    item.text ||
                    item.content,
                  "Evidence recorded",
                )}
              </strong>
              {item.current_band != null && (
                <span>
                  {show(item.current_band)} → {show(item.target_band)}
                </span>
              )}
            </div>
            {(item.evidence ||
              item.problem ||
              item.summary ||
              item.reason ||
              item.description) != null && (
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                {show(
                  item.evidence ||
                    item.problem ||
                    item.summary ||
                    item.reason ||
                    item.description,
                )}
              </p>
            )}
            {actions.length > 0 && (
              <ul className="mt-2 list-disc pl-5">
                {actions.map((action, i) => (
                  <li key={i}>{show(action)}</li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}
function Audio({ path }: { path: string }) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState("");
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  if (url) return <audio className="mt-3 w-full" controls src={url} />;
  return (
    <>
      <button
        className={`${btn} mt-3`}
        onClick={async () => {
          try {
            setUrl(await collegeApi.audio(path));
          } catch (e) {
            setError(collegeError(e));
          }
        }}
      >
        <Volume2 size={15} />
        Play response
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-rose-600">
          {error}
        </p>
      )}
    </>
  );
}

export default function CandidateReport({
  driveId,
  studentId,
  onBack,
}: {
  driveId: string;
  studentId: string;
  onBack: () => void;
}) {
  const [bundle, setBundle] = useState<Data | null>(null),
    [drive, setDrive] = useState<Drive | null>(null),
    [decisionData, setDecisionData] = useState<Data | null>(null);
  const [transcript, setTranscript] = useState<Data | null>(null),
    [integrity, setIntegrity] = useState<Data | null>(null);
  const [decision, setDecision] = useState("hold"),
    [note, setNote] = useState(""),
    [schedule, setSchedule] = useState("");
  const [confirm, setConfirm] = useState<
      "decision" | "release" | "schedule" | "cancel_schedule" | null
    >(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      const [reports, driveValue, decisionValue] = await Promise.all([
        collegeApi.get<Data>(`students/${studentId}/reports`),
        collegeApi.get<Drive>(`drives/${driveId}`),
        collegeApi.get<Data>(
          `drives/${driveId}/candidates/${studentId}/decision`,
        ),
      ]);
      setBundle(reports);
      setDrive(driveValue);
      setDecisionData(decisionValue);
      const current = decisionValue.decision as Data | undefined;
      if (current?.decision) setDecision(String(current.decision));
    } catch (e) {
      setError(collegeError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, [driveId, studentId]);
  const report = useMemo(
    () =>
      ((bundle?.reports || []) as Report[]).find(
        (item) => item.drive_id === driveId,
      ),
    [bundle, driveId],
  );
  async function evidence(kind: "transcript" | "integrity-events") {
    if (!report?.session_id) return;
    setBusy(true);
    try {
      const value = await collegeApi.get<Data>(
        `students/${studentId}/reports/${report.session_id}/${kind}`,
      );
      if (kind === "transcript") setTranscript(value);
      else setIntegrity(value);
    } catch (e) {
      setError(collegeError(e));
    } finally {
      setBusy(false);
    }
  }
  async function perform() {
    if (!confirm) return;
    const action = confirm;
    setConfirm(null);
    setBusy(true);
    try {
      if (action === "decision")
        await collegeApi.save(
          `drives/${driveId}/candidates/${studentId}/decision`,
          { decision, note },
          true,
        );
      if (action === "release")
        await collegeApi.save(
          `drives/${driveId}/candidates/${studentId}/release`,
          {},
          true,
        );
      if (action === "schedule")
        await collegeApi.save(
          `drives/${driveId}/candidates/${studentId}/release/schedule`,
          { scheduled_for: new Date(schedule).toISOString() },
          true,
        );
      if (action === "cancel_schedule")
        await collegeApi.remove(
          `drives/${driveId}/candidates/${studentId}/release/schedule`,
        );
      setNotice(
        action === "decision"
          ? "Officer decision saved."
          : "Student result publication updated.",
      );
      await load();
    } catch (e) {
      setError(collegeError(e));
    } finally {
      setBusy(false);
    }
  }
  if (busy && !bundle) return <p role="status">Loading candidate report…</p>;
  if (!report)
    return (
      <section className={panel}>
        <p role="alert">
          {error || "No report exists for this candidate in this drive."}
        </p>
        <button className={`${btn} mt-4`} onClick={onBack}>
          <ArrowLeft size={16} />
          Back
        </button>
      </section>
    );

  const student = (bundle?.student || {}) as Data,
    detail = report.detail || {},
    pri = (detail.placement_readiness || {}) as Data,
    jobFit = (detail.job_fit || {}) as Data,
    confidence = (detail.evaluation_confidence || {}) as Data,
    hiring = (detail.hiring_recommendation || {}) as Data,
    placement = (detail.placement_recommendation || {}) as Data,
    proctor = (detail.proctoring_score || {}) as Data,
    publication = (decisionData?.publication || {}) as Data;
  const dimensions = [
      ...((detail.core_dimensions || []) as Data[]),
      ...((detail.domain_dimensions || []) as Data[]),
    ],
    rounds = (detail.agent_breakdown || []) as Data[],
    reviews = (detail.question_reviews || []) as Data[],
    requirements = (detail.requirement_evidence_matrix ||
      detail.requirement_assessment ||
      []) as Data[],
    turns = (transcript?.turns || []) as Data[],
    events = (integrity?.events || []) as Data[],
    history = (decisionData?.history || []) as Data[];
  const comparable = pri.comparable !== false && typeof pri.score === "number";
  return (
    <section className="space-y-6 pb-12 text-slate-900 dark:text-white">
      <button className={btn} onClick={onBack}>
        <ArrowLeft size={16} />
        Back to Interview Results
      </button>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Candidate Interview Report
          </p>
          <h2 className="mt-1 text-3xl font-bold">
            {show(student.full_name, "Candidate")}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {show(student.roll_number)} · {show(student.department_code)} ·
            Graduation {show(student.graduation_year)}
          </p>
          <p className="mt-1 text-sm">
            {drive?.company_name} · {drive?.role_title}
          </p>
        </div>
        <div className="text-right text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold dark:bg-slate-800">
            {displayName(show(detail.status, "completed"))}
          </span>
          <p className="mt-2 text-slate-500">
            Completed {stamp(report.completed_at)}
          </p>
        </div>
      </header>
      <nav
        className="sticky top-0 z-20 flex gap-5 overflow-x-auto border-b bg-white py-3 dark:bg-slate-950"
        aria-label="Report sections"
      >
        {nav.map((item) => (
          <a
            className="whitespace-nowrap text-sm font-semibold text-indigo-700"
            href={`#${item}`}
            key={item}
          >
            {displayName(item)}
          </a>
        ))}
      </nav>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-emerald-700"
        >
          {notice}
        </p>
      )}
      <section id="summary" className="scroll-mt-20 space-y-4">
        <h3 className="text-xl font-bold">Summary</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Placement Readiness Score"
            value={comparable ? `${pri.score}/100` : "—"}
            helper={
              comparable
                ? "70% interview performance + 30% Job Fit"
                : "Review required before comparison"
            }
          />
          <Metric
            label="Interview Performance"
            value={
              report.overall_score == null ? "—" : `${report.overall_score}/100`
            }
          />
          <Metric
            label="Job Fit"
            value={
              typeof jobFit.score === "number" ? `${jobFit.score}/100` : "—"
            }
          />
          <Metric
            label="Readiness"
            value={displayName(report.readiness || "Not assessed")}
          />
          <Metric
            label="Evaluation Confidence"
            value={
              typeof confidence.score === "number"
                ? `${confidence.score}/100`
                : show(confidence.label, "—")
            }
            helper="Evidence gate; it does not add PRI points"
          />
        </div>
        <details className={panel}>
          <summary className="cursor-pointer font-semibold">
            How is PRI calculated?
          </summary>
          <p className="mt-3 text-sm">
            PRI combines 70% released interview performance and 30% Job Fit.
            Confidence, evidence coverage and configured-round completion
            determine comparability and never add points.
          </p>
        </details>
        <article className={panel}>
          <h4 className="font-bold">Executive summary</h4>
          <p className="mt-3 whitespace-pre-wrap text-sm">
            {show(
              detail.executive_summary || detail.not_assessed_notice,
              "No executive summary was produced.",
            )}
          </p>
        </article>
        <div className="grid gap-4 lg:grid-cols-2">
          <article className={panel}>
            <p className="text-xs font-semibold uppercase text-slate-500">
              AI recommendation · advisory
            </p>
            <strong className="mt-2 block text-2xl">
              {show(hiring.label, "Review Required")}
            </strong>
            <List items={hiring.reasons} empty="No reasons were recorded." />
          </article>
          <article className={panel}>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Officer decision · final
            </p>
            <strong className="mt-2 block text-2xl">
              {displayName(
                show((decisionData?.decision as Data)?.decision, "undecided"),
              )}
            </strong>
            <p className="mt-2 text-sm text-slate-500">
              Human placement workflow authority remains separate from the AI
              recommendation.
            </p>
          </article>
        </div>
      </section>
      <section id="competencies" className="scroll-mt-20 space-y-4">
        <h3 className="text-xl font-bold">Competencies</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {dimensions.map((item, index) => (
            <article className={panel} key={index}>
              <div className="flex justify-between gap-3">
                <strong>
                  {show(item.label || displayName(show(item.dimension)))}
                </strong>
                <span>
                  {item.percentage == null && item.band == null
                    ? "Not Assessed"
                    : item.percentage != null
                      ? `${item.percentage}/100`
                      : `Band ${item.band}`}
                </span>
              </div>
              {item.interpretation != null && (
                <p className="mt-2 text-sm text-slate-500">
                  {show(item.interpretation)}
                </p>
              )}
            </article>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <article className={panel}>
            <h4 className="mb-3 font-bold">Strengths</h4>
            <List
              items={detail.strengths}
              empty="No evidence-grounded strengths were recorded."
            />
          </article>
          <article className={panel}>
            <h4 className="mb-3 font-bold">Priority improvement areas</h4>
            <List
              items={detail.priority_improvement_areas}
              empty="No improvement priorities were recorded."
            />
          </article>
        </div>
        {detail.communication != null && (
          <article className={panel}>
            <h4 className="font-bold">Communication</h4>
            <dl className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-500">Speaking pace</dt>
                <dd>
                  {show(
                    (detail.communication as Data).speaking_speed_wpm,
                    "Not measured",
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Pace</dt>
                <dd>{show((detail.communication as Data).pace_label)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Filler words</dt>
                <dd>{show((detail.communication as Data).filler_words)}</dd>
              </div>
            </dl>
          </article>
        )}
      </section>
      <section id="role-fit" className="scroll-mt-20 space-y-4">
        <h3 className="text-xl font-bold">Role Fit</h3>
        <article className={panel}>
          <div className="flex justify-between gap-3">
            <div>
              <strong className="text-2xl">
                {typeof jobFit.score === "number"
                  ? `${jobFit.score}/100`
                  : "Not assessed"}
              </strong>
              <p className="text-sm text-slate-500">
                Frozen interview-time role and JD evidence
              </p>
            </div>
            <span>
              {displayName(show(jobFit.status, "insufficient evidence"))}
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {requirements.length ? (
              requirements.map((item, index) => (
                <details className="rounded-xl border p-4" key={index}>
                  <summary className="cursor-pointer">
                    <strong>{show(item.requirement || item.skill)}</strong>
                    <span className="ml-3 text-sm text-slate-500">
                      {displayName(
                        show(
                          item.priority ||
                            (item.critical ? "mandatory" : "core"),
                        ),
                      )}{" "}
                      ·{" "}
                      {displayName(
                        show(
                          item.evidence_strength || item.status,
                          "Not Assessed",
                        ),
                      )}
                    </span>
                  </summary>
                  <p className="mt-3 text-sm">
                    {show(
                      item.evidence || item.evidence_summary || item.reason,
                      "No interview evidence was recorded.",
                    )}
                  </p>
                </details>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No frozen requirement evidence is available.
              </p>
            )}
          </div>
        </article>
        <div className="grid gap-4 lg:grid-cols-2">
          <article className={panel}>
            <h4 className="font-bold">Suitable roles</h4>
            <List
              items={placement.suitable_roles}
              empty="No suitable roles were recorded."
            />
          </article>
          <article className={panel}>
            <h4 className="font-bold">Recommended preparation</h4>
            <List
              items={
                placement.recommended_preparation ||
                placement.needs_improvement_before
              }
              empty="No preparation guidance was recorded."
            />
          </article>
        </div>
      </section>
      <section id="panel-rounds" className="scroll-mt-20 space-y-4">
        <h3 className="text-xl font-bold">Panel Rounds</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {rounds.length ? (
            rounds.map((round, index) => {
              const incomplete = [
                "not_reached",
                "incomplete",
                "failed",
              ].includes(show(round.status, "incomplete"));
              return (
                <article className={panel} key={index}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase text-slate-500">
                        Round {index + 1}
                      </p>
                      <strong>
                        {show(
                          round.agent_name ||
                            displayName(
                              show(round.agent_type, "Interview agent"),
                            ),
                        )}
                      </strong>
                    </div>
                    <span>
                      {incomplete
                        ? "Not Fully Assessed"
                        : round.sub_score == null
                          ? displayName(show(round.status))
                          : `${round.sub_score}/100`}
                    </span>
                  </div>
                  <p className="mt-3 text-sm">
                    {show(
                      round.summary || round.evidence,
                      "No round summary was recorded.",
                    )}
                  </p>
                </article>
              );
            })
          ) : (
            <p className={panel}>No round-level assessment was recorded.</p>
          )}
        </div>
      </section>
      <section id="evidence" className="scroll-mt-20 space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold">Evidence</h3>
            <p className="text-sm text-slate-500">
              Question review and persisted transcript.
            </p>
          </div>
          <button
            className={btn}
            disabled={busy || !report.session_id}
            onClick={() => void evidence("transcript")}
          >
            <FileText size={16} />
            Load transcript
          </button>
        </div>
        {reviews.length ? (
          reviews.map((review, index) => {
            const turnId = show(review.turn_id, "");
            return (
              <article className={panel} key={index}>
                <div className="flex justify-between gap-3">
                  <p className="text-xs font-semibold uppercase text-indigo-600">
                    {displayName(
                      show(
                        review.agent_type || review.track,
                        `Question ${index + 1}`,
                      ),
                    )}
                  </p>
                  <span>
                    {displayName(
                      show(
                        review.answer_state ||
                          review.evidence_status ||
                          review.status,
                        "Answered",
                      ),
                    )}
                  </span>
                </div>
                <h4 className="mt-2 font-bold">
                  {show(review.question || review.question_text)}
                </h4>
                <p className="mt-3 whitespace-pre-wrap text-sm">
                  {show(
                    review.answer || review.transcript,
                    "No response text was captured.",
                  )}
                </p>
                {review.strength_feedback != null && (
                  <p className="mt-3 text-sm">
                    <strong>What was strong:</strong>{" "}
                    {show(review.strength_feedback)}
                  </p>
                )}
                {review.improvement_feedback != null && (
                  <p className="mt-2 text-sm">
                    <strong>Could improve:</strong>{" "}
                    {show(review.improvement_feedback)}
                  </p>
                )}
                {review.has_audio === true && turnId && report.session_id && (
                  <Audio
                    path={`students/${studentId}/reports/${report.session_id}/turns/${turnId}/audio`}
                  />
                )}
              </article>
            );
          })
        ) : (
          <p className={panel}>No question review was generated.</p>
        )}
        {transcript && (
          <article className={panel}>
            <h4 className="font-bold">Transcript</h4>
            <div className="mt-4 space-y-4">
              {turns.map((turn, index) => {
                const turnId = show(turn.turn_id, "");
                return (
                  <div
                    className="border-l-2 border-indigo-200 pl-4"
                    key={index}
                  >
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Turn {show(turn.turn_index, String(index + 1))} ·{" "}
                      {displayName(show(turn.agent_type, "Agent"))} ·{" "}
                      {displayName(show(turn.kind, "Question"))}
                    </p>
                    <p className="mt-2 font-semibold">
                      {show(turn.question_text)}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      {show(turn.transcript, "No response text captured.")}
                    </p>
                    {turn.has_audio === true && turnId && report.session_id && (
                      <Audio
                        path={`students/${studentId}/reports/${report.session_id}/turns/${turnId}/audio`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </article>
        )}
      </section>
      <section id="integrity" className="scroll-mt-20 space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold">Integrity / AI Proctoring</h3>
            <p className="text-sm text-slate-500">
              Human-review evidence; separate from interview score and PRI.
            </p>
          </div>
          <button
            className={btn}
            disabled={busy || !report.session_id}
            onClick={() => void evidence("integrity-events")}
          >
            <ShieldCheck size={16} />
            Load event timeline
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric
            label="AI Proctor Score"
            value={
              typeof proctor.overall_score === "number"
                ? `${proctor.overall_score}/100`
                : "Not available"
            }
          />
          <Metric
            label="Review status"
            value={displayName(show(proctor.status))}
          />
          <Metric
            label="Recorded observations"
            value={proctor.total_events ?? 0}
          />
        </div>
        {proctor.sub_scores != null && (
          <article className={panel}>
            <h4 className="font-bold">Integrity sub-scores</h4>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(proctor.sub_scores as Data).map(
                ([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs uppercase text-slate-500">
                      {displayName(key)}
                    </dt>
                    <dd className="mt-1 text-xl font-semibold">
                      {show(value)}/100
                    </dd>
                  </div>
                ),
              )}
            </dl>
          </article>
        )}
        {integrity && (
          <article className={panel}>
            <h4 className="font-bold">Event timeline</h4>
            <div className="mt-4 space-y-3">
              {events.length ? (
                events.map((event, index) => (
                  <div className="rounded-xl border p-3 text-sm" key={index}>
                    <div className="flex justify-between gap-3">
                      <strong>
                        {displayName(
                          show(
                            event.event_type || event.type,
                            "Integrity event",
                          ),
                        )}
                      </strong>
                      <span>
                        {stamp(event.occurred_at || event.created_at)}
                      </span>
                    </div>
                    <p className="mt-2">
                      {show(
                        event.message || event.reason || event.action,
                        "Observation recorded.",
                      )}
                    </p>
                  </div>
                ))
              ) : (
                <p>No integrity events were recorded.</p>
              )}
            </div>
          </article>
        )}
      </section>
      <section id="decision" className="scroll-mt-20 space-y-4">
        <h3 className="text-xl font-bold">Decision and Student Result</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            className={panel}
            onSubmit={(event) => {
              event.preventDefault();
              setConfirm("decision");
            }}
          >
            <h4 className="font-bold">Officer decision</h4>
            <label className="mt-4 block text-sm">
              Decision
              <select
                className={field}
                value={decision}
                onChange={(event) => setDecision(event.target.value)}
              >
                <option value="shortlist">Shortlist</option>
                <option value="hold">Hold</option>
                <option value="reject">Reject</option>
              </select>
            </label>
            <label className="mt-4 block text-sm">
              Officer note
              <textarea
                className={field}
                maxLength={2000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <button className={`${btn} mt-4`} disabled={busy}>
              Review decision
            </button>
          </form>
          <article className={panel}>
            <h4 className="font-bold">Student result publication</h4>
            <p className="mt-3 text-2xl font-semibold">
              {displayName(show(publication.state, "hidden"))}
            </p>
            {publication.scheduled_for != null && (
              <p className="mt-2 text-sm">
                Scheduled {stamp(publication.scheduled_for)}
              </p>
            )}
            {publication.released_at != null && (
              <p className="mt-2 text-sm">
                Released {stamp(publication.released_at)}
              </p>
            )}
            <div className="mt-4">
              {publication.state !== "released" && (
                <button className={btn} onClick={() => setConfirm("release")}>
                  Release now
                </button>
              )}
              {publication.state === "scheduled" ? (
                <button
                  className={`${btn} ml-2`}
                  onClick={() => setConfirm("cancel_schedule")}
                >
                  Cancel schedule
                </button>
              ) : (
                publication.state !== "released" && (
                  <label className="mt-3 block text-sm">
                    Schedule release
                    <input
                      className={field}
                      type="datetime-local"
                      value={schedule}
                      onChange={(event) => setSchedule(event.target.value)}
                    />
                    <button
                      className={`${btn} mt-2`}
                      disabled={!schedule}
                      onClick={() => setConfirm("schedule")}
                    >
                      Schedule result
                    </button>
                  </label>
                )
              )}
            </div>
          </article>
        </div>
        <article className={panel}>
          <h4 className="font-bold">Decision history</h4>
          <div className="mt-4 space-y-3">
            {history.length ? (
              history.map((item, index) => (
                <div className="rounded-xl border p-3 text-sm" key={index}>
                  <div className="flex justify-between gap-3">
                    <strong>{displayName(show(item.decision))}</strong>
                    <span>{stamp(item.decided_at || item.created_at)}</span>
                  </div>
                  <p className="mt-2">{show(item.note, "No officer note.")}</p>
                  {item.actor_name != null && (
                    <p className="mt-1 text-xs text-slate-500">
                      Recorded by {show(item.actor_name)}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p>No officer decision has been recorded.</p>
            )}
          </div>
        </article>
      </section>
      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="report-confirm-title"
            className={`${panel} max-w-md`}
          >
            <h3 id="report-confirm-title" className="text-lg font-bold">
              Confirm {displayName(confirm)}
            </h3>
            <p className="mt-2 text-sm">
              {confirm === "decision"
                ? `Record ${displayName(decision)} as the officer decision?`
                : "This changes student access while preserving completed evidence."}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                autoFocus
                className={btn}
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                className={`${btn} bg-indigo-600 text-white`}
                onClick={() => void perform()}
              >
                Confirm
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
