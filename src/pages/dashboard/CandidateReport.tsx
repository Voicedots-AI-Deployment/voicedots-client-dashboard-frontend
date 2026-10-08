import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  ChevronLeft,
  Download,
  Search,
  ShieldCheck,
  Volume2,
  X,
} from "lucide-react";
import { collegeApi, collegeError, type Drive } from "@/api/collegeApi";
import { btn } from "./interviewAgentTypes";
import { displayName } from "./placementDisplay";
import { roleLabels } from "./interviewAgentTypes";

type Data = Record<string, unknown>;
type Report = Data & {
  drive_id?: string;
  session_id?: string;
  overall_score?: number;
  readiness?: string;
  completed_at?: string;
  detail?: Data;
  attempt_number?: number;
  recording?: Data | null;
};
const nav = [
  ["answers", "Answers"], ["skills", "Skills proof"],
  ["rounds", "Rounds & competencies"], ["proctor", "AI Proctor"],
  ["feedback", "Student feedback"],
] as const;
const reportPanel = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const reportField = "mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";
function PreviewToggle({ shown, total, onClick, noun = "items" }: { shown: number; total: number; onClick: () => void; noun?: string }) {
  if (total <= 4) return null;
  const expanded = shown >= total;
  return <button type="button" onClick={onClick} className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500">{expanded ? "Show less" : `Show all ${total} ${noun}`}<ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`}/></button>;
}
function EvidenceBrief({ title, items, tone }: { title: string; items: string[]; tone: "strength" | "concern" }) {
  const [expanded, setExpanded] = useState(false);
  const color = tone === "strength" ? "text-emerald-700" : "text-amber-700";
  return <article className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
    <h3 className={`text-sm font-medium ${color}`}>{title}<span className="ml-2 text-xs text-slate-400">{items.length}</span></h3>
    {items.length ? <ul className="mt-3 space-y-3">{(expanded ? items : items.slice(0, 2)).map((item, index) => <li key={index} className="flex gap-2 text-sm leading-6 text-slate-600"><span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${tone === "strength" ? "bg-emerald-500" : "bg-amber-500"}`}/><span>{expanded ? item : item.length > 130 ? `${item.slice(0, 127).trimEnd()}…` : item}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">{tone === "strength" ? "No supporting statements were supplied." : "No concern signals were supplied."}</p>}
    {(items.length > 2 || items.some(item => item.length > 130)) && <button type="button" className="mt-3 text-xs font-medium text-violet-700" onClick={() => setExpanded(value => !value)}>{expanded ? "Collapse evidence" : `Read all ${items.length} ${tone === "strength" ? "strengths" : "concerns"}`}</button>}
  </article>;
}
const show = (value: unknown, fallback = "Not available") =>
  value === null || value === undefined || value === ""
    ? fallback
    : String(value);
const stamp = (value: unknown) =>
  value ? new Date(String(value)).toLocaleString() : "Not available";
const durationLabel=(value:unknown)=>{const total=Math.max(0,Math.floor(Number(value)||0)),hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),seconds=total%60;return hours?`${hours}h ${minutes}m ${seconds}s`:`${minutes}m ${seconds}s`};
const decisionLabel = (value: unknown) => value === "shortlist" ? "Shortlisted" : value === "reject" ? "Rejected" : displayName(show(value, "undecided"));
const eventExplanation = (event: Data) => {
  const details = event.details;
  if (details && typeof details === "object" && typeof (details as Data).message === "string") return String((details as Data).message);
  const descriptions: Record<string, string> = {
    camera_lost: "The interview camera connection was interrupted.",
    candidate_not_visible: "The candidate was not detected in the camera view.",
    multiple_people_visible: "More than one person was detected in the camera view.",
    multiple_people_cleared: "The additional person was no longer detected.",
    tab_hidden: "The interview page moved out of the foreground.",
    fullscreen_exit: "The interview left full-screen mode.",
    screen_share_ended: "Screen sharing ended during the interview.",
    gaze_off_camera: "A gaze direction change was recorded for review.",
  };
  return descriptions[String(event.event_type || event.type)] || "A proctoring observation was recorded for human review.";
};

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
            className="rounded-xl border border-slate-200 bg-white p-4 text-sm transition hover:border-violet-200 hover:shadow-sm"
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
              <p className="mt-2 text-slate-600">
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
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
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
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError("");
          try {
            setUrl(await collegeApi.audio(path));
          } catch (e) {
            setError(collegeError(e) || "Audio is unavailable for this response.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <Volume2 size={15} />
        {loading ? "Loading response audio…" : "Play response audio"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-rose-600">
          {error}
        </p>
      )}
    </>
  );
}

function ReportKeyboardShortcuts({
  videoRef,
  onNextFlag,
}: {
  videoRef: { current: HTMLVideoElement | null };
  onNextFlag: () => void;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const video = videoRef.current;
      if (event.code === "Space" && video) {
        event.preventDefault();
        if (video.paused) void video.play();
        else video.pause();
      }
      if (event.key === "ArrowLeft" && video) video.currentTime = Math.max(0, video.currentTime - 5);
      if (event.key === "ArrowRight" && video) video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 5);
      if (event.key.toLowerCase() === "n") onNextFlag();
      if (event.key.toLowerCase() === "b") document.getElementById("bookmark-note")?.focus();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [videoRef, onNextFlag]);
  return null;
}

export default function CandidateReport({
  driveId,
  studentId,
  onBack,
  candidatePosition,
  candidateTotal,
  canPrevious,
  canNext,
  onNavigate,
}: {
  driveId: string;
  studentId: string;
  onBack: () => void;
  candidatePosition?: number | null;
  candidateTotal?: number;
  canPrevious?: boolean;
  canNext?: boolean;
  onNavigate?: (direction: -1 | 1) => void;
}) {
  const [bundle, setBundle] = useState<Data | null>(null),
    [drive, setDrive] = useState<Drive | null>(null),
    [decisionData, setDecisionData] = useState<Data | null>(null),
    [resultSettings, setResultSettings] = useState<Data | null>(null);
  const [transcript, setTranscript] = useState<Data | null>(null),
    [integrity, setIntegrity] = useState<Data | null>(null);
  const [recording, setRecording] = useState<Data | null>(null),
    [recordingLoading, setRecordingLoading] = useState(false),
    [recordingError, setRecordingError] = useState("");
  const [focusGroup, setFocusGroup] = useState<"strengths" | "growth" | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (key: string) => setExpanded(current => ({ ...current, [key]: !current[key] }));
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false),
    [integrityLoading, setIntegrityLoading] = useState(false),
    [transcriptError, setTranscriptError] = useState(""),
    [integrityError, setIntegrityError] = useState(""),
    [activeEvent, setActiveEvent] = useState(0);
  const [activeTab, setActiveTab] = useState<(typeof nav)[number][0]>("answers");
  const [answerFilter, setAnswerFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [answerSearch, setAnswerSearch] = useState("");
  const [bookmarkFilter, setBookmarkFilter] = useState("all");
  const [resumeSkillFilter, setResumeSkillFilter] = useState("all");
  const [bookmarkNote, setBookmarkNote] = useState("");
  const [bookmarkNotes, setBookmarkNotes] = useState<Array<{ id: string; seconds: number; text: string }>>([]);
  const [eventReviews, setEventReviews] = useState<Record<string, string>>({});
  const [eventReviewSaved, setEventReviewSaved] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [driveError, setDriveError] = useState(""),
    [decisionError, setDecisionError] = useState("");
  const [decision, setDecision] = useState(""),
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
      const [reports, driveValue, decisionValue, settingsValue] = await Promise.allSettled([
        collegeApi.get<Data>(`students/${studentId}/reports`),
        collegeApi.get<Drive>(`drives/${driveId}`),
        collegeApi.get<Data>(
          `drives/${driveId}/candidates/${studentId}/decision`,
        ),
        collegeApi.get<Data>("interview-results-settings"),
      ]);
      if (reports.status === "fulfilled") setBundle(reports.value);
      else setError(`Interview report could not be loaded: ${collegeError(reports.reason)}`);
      if (driveValue.status === "fulfilled") { setDrive(driveValue.value); setDriveError(""); }
      else setDriveError(collegeError(driveValue.reason));
      if (decisionValue.status === "fulfilled") {
        setDecisionData(decisionValue.value);
        setDecisionError("");
        const current = decisionValue.value.decision as Data | undefined;
        setDecision(current?.decision ? String(current.decision) : "");
        setNote(current?.note ? String(current.note) : "");
      } else setDecisionError(collegeError(decisionValue.reason));
      if (settingsValue.status === "fulfilled") setResultSettings(settingsValue.value);
    } catch (e) {
      setError(collegeError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setBundle(null);
    setDecisionData(null);
    setTranscript(null);
    setIntegrity(null);
    setRecording(null);
    setTranscriptError("");
    setIntegrityError("");
    setRecordingError("");
    setBookmarkNotes([]);
    setEventReviews({});
    setEventReviewSaved(false);
    setPlaybackTime(0);
    setIsPlaying(false);
    setBookmarkNote("");
    void load();
  }, [driveId, studentId]);
  const report = useMemo(
    () =>
      ((bundle?.reports || []) as Report[]).find(
        (item) => item.drive_id === driveId,
      ),
    [bundle, driveId],
  );
  async function loadRecording() {
    if (!report?.session_id || recordingLoading) return;
    setRecordingLoading(true);
    setRecordingError("");
    try {
      setRecording(await collegeApi.get<Data>(`students/${studentId}/reports/${report.session_id}/recording`));
    } catch (e) {
      setRecordingError(collegeError(e));
    } finally {
      setRecordingLoading(false);
    }
  }
  useEffect(() => { if (report?.session_id) {setRecording(null);setRecordingError('');void loadRecording();} },[report?.session_id]);
  useEffect(() => {
    if (!['recording','uploading','processing'].includes(String(recording?.status))) return;
    const timer=window.setInterval(()=>{if(document.visibilityState!=='hidden')void loadRecording();},10000);
    return()=>window.clearInterval(timer);
  },[recording?.status,report?.session_id,recordingLoading]);
  function seekToQuestion(askedAt: unknown) {
    // After a reconnect the finished file concatenates browser segments and
    // has no single wall-clock offset for the full timeline. Never offer a
    // misleading seek in that case.
    if (Number(recording?.segment_count || 0) > 1) return;
    const start = Date.parse(String(recording?.started_at || ""));
    const question = Date.parse(String(askedAt || ""));
    if (!videoRef.current || !Number.isFinite(start) || !Number.isFinite(question)) return;
    const offset = (question - start) / 1000;
    const duration = Number(recording?.duration_seconds || 0);
    if (offset < 0 || (duration > 0 && offset > duration)) return;
    const video = videoRef.current;
    const seekAndPlay = () => {
      try {
        video.currentTime = offset;
        void video.play().catch(() => undefined);
      } catch {
        // A secure video URL may still be loading; the one-shot metadata
        // listener below retries only after the browser can seek it.
      }
    };
    if (video.readyState === 0) video.addEventListener("loadedmetadata", seekAndPlay, { once: true });
    else seekAndPlay();
  }
  function seekToEvent(event: Data) {
    seekToQuestion(event.occurred_at || event.created_at);
  }
  function recordingOffset(timestamp: unknown): number | null {
    if (Number(recording?.segment_count || 0) > 1) return null;
    const start = Date.parse(String(recording?.started_at || ""));
    const point = Date.parse(String(timestamp || ""));
    if (!Number.isFinite(start) || !Number.isFinite(point)) return null;
    const offset = (point - start) / 1000;
    const duration = Number(recording?.duration_seconds || 0);
    return offset >= 0 && (!duration || offset <= duration) ? offset : null;
  }
  async function evidence(kind: "transcript" | "integrity-events") {
    if (!report?.session_id) return;
    const isTranscript = kind === "transcript";
    if (isTranscript) { setTranscriptLoading(true); setTranscriptError(""); }
    else { setIntegrityLoading(true); setIntegrityError(""); }
    try {
      const value = await collegeApi.get<Data>(
        `students/${studentId}/reports/${report.session_id}/${kind}`,
      );
      if (kind === "transcript") setTranscript(value);
      else setIntegrity(value);
    } catch (e) {
      if (isTranscript) setTranscriptError(collegeError(e));
      else setIntegrityError(collegeError(e));
    } finally {
      if (isTranscript) setTranscriptLoading(false);
      else setIntegrityLoading(false);
    }
  }
  useEffect(() => {
    if (!report?.session_id) return;
    if (!transcript && !transcriptLoading && !transcriptError) void evidence("transcript");
    if (!integrity && !integrityLoading && !integrityError) void evidence("integrity-events");
  }, [report?.session_id]);
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
      if (action === "decision") setBookmarkNotes([]);
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
  if (busy && !bundle) return <section role="status" className="mx-auto max-w-7xl animate-pulse rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading candidate report…</section>;
  if (!report)
    return (
      <section className={reportPanel}>
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
  const recommendationLabels = (resultSettings?.recommendation_labels || {}) as Data;
  const roundRole = (trackValue: unknown, configured?: unknown) => {
    const track = String(trackValue || "").toLowerCase();
    const saved = drive?.agent_selection?.find(item => item.track === track)?.profile?.role;
    const allowed = new Set([...(drive?.agent_selection || []).map(item => item.profile?.role).filter(Boolean), ...Object.values(roleLabels)]);
    const candidate = String(saved || configured || "").trim();
    if (candidate && allowed.has(candidate)) return candidate;
    return roleLabels[track] || "Interview question";
  };
  const orderedHistory = [...history].sort((a, b) => {
    const aTime = Date.parse(String(a.decided_at || a.created_at || ""));
    const bTime = Date.parse(String(b.decided_at || b.created_at || ""));
    if (!Number.isFinite(aTime)) return Number.isFinite(bTime) ? 1 : 0;
    if (!Number.isFinite(bTime)) return -1;
    return bTime - aTime;
  });
  const comparable = pri.comparable !== false && typeof pri.score === "number";
  const recordingStatus = recording?.status || report.recording?.status || "unavailable";
  const recordingDuration = recording?.duration_seconds ?? report.recording?.duration_seconds;
  const executiveSummary = detail.executive_summary || detail.not_assessed_notice;
  const strengths = Array.isArray(detail.strengths) ? detail.strengths : [];
  const growthAreas = [detail.priority_improvement_areas, placement.recommended_preparation, placement.needs_improvement_before].find((items): items is unknown[] => Array.isArray(items) && items.length > 0) || [];
  const recommendationReasons = Array.isArray(hiring.reasons) ? hiring.reasons : [];
  const suitableRoles = Array.isArray(placement.suitable_roles) ? placement.suitable_roles : [];
  const preparationSteps = Array.isArray(placement.recommended_preparation) ? placement.recommended_preparation : Array.isArray(placement.needs_improvement_before) ? placement.needs_improvement_before : [];
  const nextRoundQuestions = Array.isArray(detail.next_round_questions) ? detail.next_round_questions : Array.isArray(placement.next_round_questions) ? placement.next_round_questions : [];
  const feedbackSummary = detail.student_feedback_summary || detail.student_summary || executiveSummary;
  const unansweredReviews = reviews.filter(review => turns.some(turn => String(turn.turn_id) === String(review.turn_id) && !String(turn.transcript || "").trim()) || ["explicit_dont_know", "no_response", "capture_unavailable", "system_interrupted", "irrelevant_answer"].includes(String(review.answer_state || review.evidence_status || "").toLowerCase()));
  const followUpReviews = reviews.filter(review => String(review.kind || review.turn_kind || "").toLowerCase().includes("follow"));
  const filteredRequirements = requirements.filter(item => skillFilter === "all" || (skillFilter === "gaps" && item.candidate_mentioned !== true) || (skillFilter === "demonstrated" && item.candidate_mentioned === true) || (skillFilter === "not_asked" && item.requirement_was_asked !== true));
  const filteredReviews = reviews.filter(review => {
    const savedTurn = turns.find(turn => String(turn.turn_id) === String(review.turn_id));
    const answer = String((savedTurn ? savedTurn.transcript : review.answer || review.transcript) || "");
    const search = answerSearch.trim().toLowerCase();
    const matchesFilter = answerFilter === "all" || (answerFilter === "unanswered" && unansweredReviews.includes(review)) || (answerFilter === "strong" && (String(review.evidence_strength || "").toLowerCase() === "strong" || Array.isArray(review.strength_feedback) && review.strength_feedback.length > 0)) || (answerFilter === "feedback" && (Array.isArray(review.strength_feedback) && review.strength_feedback.length > 0 || Array.isArray(review.improvement_feedback) && review.improvement_feedback.length > 0)) || (answerFilter === "followups" && followUpReviews.includes(review));
    return matchesFilter && (!search || `${String(review.question || review.question_text || "")} ${answer}`.toLowerCase().includes(search));
  });
  const videoReady = typeof recording?.playback_url === "string" && recording.playback_url.trim().length > 0;
  const currentDecisionNote = String((decisionData?.decision as Data | undefined)?.note || "");
  const timeLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  const addBookmarkNote = () => {
    const videoTime = videoRef.current?.currentTime;
    const content = bookmarkNote.trim();
    if (!content || videoTime == null) return;
    setBookmarkNotes(current => [...current, { id: `${Date.now()}-${current.length}`, seconds: videoTime, text: content }]);
    setBookmarkFilter("note");
    setNotice("Timestamped note added to this page. Include it in the officer note and save the decision to persist it.");
    setBookmarkNote("");
  };
  const jumpToAdjacentFlag = (direction: -1 | 1) => {
    if (!videoReady || !events.length) return;
    const next = (activeEvent + direction + events.length) % events.length;
    setActiveEvent(next);
    seekToEvent(events[next]);
  };
  const communication = (detail.communication || {}) as Data;
  const resumeAlignment = (detail.resume_alignment || {}) as Data;
  const resumeSkills = Array.isArray(resumeAlignment.skills) ? resumeAlignment.skills as Data[] : [];
  const testedResumeSkills = resumeSkills.filter(item => !["not_assessed", ""].includes(String(item.evidence_level || "").toLowerCase()));
  const verifiedResumeSkills = testedResumeSkills.filter(item => String(item.evidence_level || "").toLowerCase() === "verified");
  const claimGaps = resumeSkills.filter(item => String(item.evidence_level || "").toLowerCase() === "not_demonstrated");
  const notTestedResumeSkills = resumeSkills.filter(item => String(item.evidence_level || "").toLowerCase() === "not_assessed");
  const filteredResumeSkills = resumeSkills.filter(item => resumeSkillFilter === "all" || (resumeSkillFilter === "gaps" && String(item.evidence_level || "").toLowerCase() === "not_demonstrated") || (resumeSkillFilter === "verified" && String(item.evidence_level || "").toLowerCase() === "verified") || (resumeSkillFilter === "not_tested" && String(item.evidence_level || "").toLowerCase() === "not_assessed"));
  const dontKnowCount = reviews.filter(review => String(review.answer_state || review.evidence_status || "").toLowerCase() === "explicit_dont_know").length;
  const weakestRound = rounds.filter(round => typeof round.sub_score === "number").sort((a, b) => Number(a.sub_score) - Number(b.sub_score))[0];
  const lowCompetencies = dimensions.filter(item => typeof item.percentage === "number" && Number(item.percentage) < 40);
  const proctorViolations = events.filter(event => String(event.severity || "").toLowerCase() === "violation");
  const completionPct = reviews.length ? Math.round(unansweredReviews.length / reviews.length * 100) : null;
  const metricTone = (value: unknown) => typeof value !== "number" ? "bg-slate-400" : value >= 75 ? "bg-emerald-600" : value >= 50 ? "bg-amber-500" : "bg-rose-600";
  const proctorScore = typeof proctor.overall_score === "number" ? proctor.overall_score : typeof proctor.score === "number" ? proctor.score : null;
  const reportMetrics = [
    { label: "Interview score", score: typeof report.overall_score === "number" ? report.overall_score : null, value: report.overall_score == null ? "—" : `${report.overall_score}`, unit: "/100", note: rounds.length ? `Across ${rounds.length} AI rounds` : "Round breakdown unavailable" },
    { label: "Job fit", score: typeof jobFit.score === "number" ? jobFit.score : null, value: typeof jobFit.score === "number" ? String(jobFit.score) : "—", unit: "/100", note: typeof jobFit.score === "number" ? "Role requirements vs interview evidence" : "Job fit not assessed" },
    { label: "Skills proven live", score: testedResumeSkills.length ? verifiedResumeSkills.length / testedResumeSkills.length * 100 : null, value: testedResumeSkills.length ? String(verifiedResumeSkills.length) : "—", unit: testedResumeSkills.length ? ` / ${testedResumeSkills.length}` : "", note: testedResumeSkills.length ? `${verifiedResumeSkills.length} verified from assessed resume skills` : "Resume skills not assessed" },
    { label: "Responses to review", score: completionPct, value: reviews.length ? String(unansweredReviews.length) : "—", unit: reviews.length ? ` / ${reviews.length}` : "", note: reviews.length ? unansweredReviews.length ? "Missing or unusable response evidence" : "Response evidence captured for every question" : "Answer review unavailable" },
    { label: "Integrity", score: proctorScore, value: proctorScore == null ? "—" : String(proctorScore), unit: "/100", note: proctorScore != null ? `${Number(proctor.total_events ?? events.length)} recorded events · ${displayName(show(proctor.status, "Scored"))}` : "Proctor score not assessed" },
  ];
  const feedback = (detail.student_feedback || detail.learning_plan || {}) as Data;
  const feedbackAreas = Array.isArray(feedback.growth_areas) ? feedback.growth_areas : growthAreas;
  const savedNoteBookmarks = [currentDecisionNote, ...orderedHistory.map(item => String(item.note || ""))]
    .flatMap(value => [...value.matchAll(/\[Recording (\d{1,2}:\d{2})\] ([^\n]+)/g)].map(match => {
      const [minutes, seconds] = match[1].split(":").map(Number);
      return { id: `${match[0]}-${value.slice(0, 20)}`, seconds: minutes * 60 + seconds, text: match[2], saved: true };
    }));
  const visibleBookmarks: Array<{ id: string; seconds: number | null; text: string; detail?: string; event?: Data; saved?: boolean }> = [
    ...(bookmarkFilter !== "proctor" ? [...bookmarkNotes.map(item => ({ ...item, saved: false }))] : []),
    ...(bookmarkFilter !== "note" ? events.map((event, index) => ({ id: String(event.event_id || index), seconds: recordingOffset(event.occurred_at || event.created_at), text: displayName(show(event.event_type || event.type, "Proctor observation")), detail: eventExplanation(event), event, saved: true })) : []),
    ...(bookmarkFilter !== "proctor" ? savedNoteBookmarks : []),
  ].sort((a, b) => Number(a.seconds ?? Infinity) - Number(b.seconds ?? Infinity));
  const answerState = (review: Data) => String(review.answer_state || review.evidence_status || review.status || "not_assessed").toLowerCase();
  const answerLabel = (review: Data) => { const state = answerState(review); return state === "answered" ? "Answered" : ["explicit_dont_know", "no_response", "capture_unavailable", "system_interrupted", "irrelevant_answer"].includes(state) ? "Needs review" : state === "not_assessed" ? "Not assessed" : "Limited evidence"; };
  const answerIsMissing = (review: Data) => ["explicit_dont_know", "no_response", "capture_unavailable", "system_interrupted", "irrelevant_answer"].includes(answerState(review));
  const roundEntries = rounds.map((round, index) => ({
    round,
    index,
    label: roundRole(round.agent_type || round.track, round.interviewer_role),
    roundReviews: reviews.filter(review => String(review.agent_type || review.track || "").toLowerCase() === String(round.agent_type || round.track || "").toLowerCase()),
  }));
  const dimensionsWithScore = dimensions.filter(item => typeof item.percentage === "number");
  const proctorSubscores = Object.entries((proctor.sub_scores || proctor.subscores || {}) as Data);
  const priComponents = pri.components && typeof pri.components === "object" ? pri.components as Data : {};
  const interviewComponent = (priComponents.overall_performance || {}) as Data;
  const jobFitComponent = (priComponents.job_fit || {}) as Data;
  const priFormulaAvailable = typeof interviewComponent.weight === "number" && typeof interviewComponent.score === "number" && typeof jobFitComponent.weight === "number" && typeof jobFitComponent.score === "number";
  const advisoryFlags = [
    ...(claimGaps.length ? [`${claimGaps.length} resume skills not demonstrated`] : []),
    ...(dontKnowCount ? [`${dontKnowCount} answers marked “I don’t know”`] : []),
    ...(proctorViolations.length ? [`${proctorViolations.length} proctor violations to review`] : []),
  ];
  const strengthBriefs = strengths.map(item => typeof item === "string" ? item : show((item as Data).label || (item as Data).summary || (item as Data).evidence || (item as Data).text));
  const concernBriefs = [
    ...advisoryFlags,
    ...(weakestRound && Number(weakestRound.sub_score) < 50 ? [`Lowest scored round: ${roundRole(weakestRound.agent_type || weakestRound.track, weakestRound.interviewer_role)} (${weakestRound.sub_score}/100).`] : []),
    ...lowCompetencies.map(item => `${show(item.label || displayName(show(item.dimension)))}: ${item.percentage}/100.`),
  ];
  const candidateProfile = (bundle?.candidate_info || {}) as Data;
  const studentInitials = String(student.full_name || "Candidate").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
  const studentDetailRows = [
    ["Student ID", student.roll_number], ["Email", student.email], ["Program", student.program],
    ["Department", student.department_code], ["Year of study", student.year_of_study ?? candidateProfile.year_of_study],
    ["Graduation year", student.graduation_year ?? candidateProfile.graduation_year],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");

  return (
    <section className="candidate-review mx-auto max-w-[1440px] space-y-5 pb-12 text-slate-900">
      <ReportKeyboardShortcuts videoRef={videoRef} onNextFlag={() => jumpToAdjacentFlag(1)} />
      <style>{"@media print{.report-nav,.report-back,.report-actions,.candidate-pager,.no-print{display:none!important}.candidate-report-content .hidden{display:block!important}details:not([open])>*:not(summary){display:block!important}article,details{break-inside:avoid}body{color:#111!important;background:#fff!important}}"}</style>
      <div className="candidate-pager no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
          <button type="button" className="report-back inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-indigo-700" onClick={onBack}><ArrowLeft size={15}/> Interview results</button>
          <span>/</span><span className="truncate">{show(drive?.company_name, "Placement drive")} · {show(drive?.role_title, "Role")}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className={`${btn} shrink-0 px-2.5 py-1.5`} disabled={!canPrevious} aria-label="Previous candidate" onClick={() => onNavigate?.(-1)}><ChevronLeft size={15}/></button>
          <span className="min-w-16 shrink-0 text-center text-xs font-semibold text-slate-600">{candidatePosition ?? "—"} of {candidateTotal ?? "—"}</span>
          <button type="button" className={`${btn} shrink-0 px-2.5 py-1.5`} disabled={!canNext} aria-label="Next candidate" onClick={() => onNavigate?.(1)}><ChevronRight size={15}/></button>
          <button type="button" aria-label="Export PDF" title="Export PDF" className={`${btn} report-actions inline-flex h-10 min-w-[102px] shrink-0 items-center justify-center gap-2 whitespace-nowrap px-3 py-1 text-xs`} onClick={() => window.print()}><Download className="shrink-0" size={14}/><span className="whitespace-nowrap">Export PDF</span></button>
        </div>
      </div>

      <header className="flex flex-wrap items-center gap-4 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-white p-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-indigo-700 text-lg font-extrabold text-white">{studentInitials || "C"}</div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">{show(student.full_name, "Candidate")}</h1>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {student.roll_number != null && student.roll_number !== "" && <span>{String(student.roll_number)}</span>}
            {[student.program, student.department_code, student.graduation_year ?? candidateProfile.graduation_year].some(value => value != null && value !== "") && <span>{[student.program, student.department_code, student.graduation_year ?? candidateProfile.graduation_year].filter(value => value != null && value !== "").map(String).join(" · ")}</span>}
            <span>{show(drive?.company_name, "Placement drive")} — {show(drive?.role_title, "Role")}</span>
            {report.attempt_number != null && <span>Attempt {report.attempt_number}</span>}
            <span>{report.completed_at ? `Completed ${stamp(report.completed_at)}` : "Interview in progress"}</span>
          </div>
          <details className="mt-1 text-xs text-slate-500"><summary className="inline-flex cursor-pointer items-center gap-1 font-semibold text-slate-600">Candidate details <ChevronDown size={13}/></summary><dl className="mt-2 grid max-w-3xl gap-x-8 gap-y-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2">{studentDetailRows.map(([label, value]) => <div key={String(label)} className="flex justify-between gap-4"><dt>{String(label)}</dt><dd className="text-right font-medium text-slate-800">{String(value)}</dd></div>)}</dl></details>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">{report.completed_at ? "Interview completed" : "Interview in progress"}</span>
          <span className={`rounded-full px-2.5 py-1 ${publication.state === "released" ? "bg-indigo-50 text-indigo-800" : "bg-slate-100 text-slate-700"}`}>Result {displayName(show(publication.state, "hidden")).toLowerCase()}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">{decision ? `Officer: ${decisionLabel(decision)}` : "Decision pending"}</span>
          {driveError && <span role="alert" className="text-rose-700">Drive details: {driveError} <button className="underline" onClick={() => void load()}>Retry</button></span>}
        </div>
      </header>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}<button className={`${btn} inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap`} onClick={() => void load()}>Retry report</button></div>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="candidate-report-content min-w-0 space-y-5">
          <section id="glance" className={`${reportPanel} scroll-mt-4`}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Decision summary</p>
                <h2 className="mt-1 text-base font-bold">Decision brief</h2>
                <p className="mt-1 text-xs text-slate-500">Assessed evidence, confidence and open questions for your hiring decision.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${!comparable ? "bg-slate-100 text-slate-600" : Number(pri.score) >= 75 ? "bg-emerald-50 text-emerald-800" : Number(pri.score) >= 50 ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}>{displayName(show(report.readiness, "Not assessed"))}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              {reportMetrics.map((metric, index) => <article key={metric.label} className={`min-w-0 rounded-xl border border-slate-200 bg-white p-4 ${index < 3 ? "sm:col-span-2" : "sm:col-span-3"}`}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-medium tracking-tight tabular-nums">{metric.value}<small className="ml-1 text-xs font-semibold text-slate-500">{metric.unit}</small></p>
                {metric.score != null && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${metric.label === "Responses to review" ? "bg-rose-600" : metricTone(metric.score)}`} style={{ width: `${Math.max(0, Math.min(100, metric.score))}%` }}/></div>}
                <p className="mt-1.5 text-[10px] leading-4 text-slate-500">{metric.note}</p>
              </article>)}
            </div>
            <div className="mt-4 grid items-stretch gap-3 md:grid-cols-2">
              <EvidenceBrief title="Supporting evidence" items={strengthBriefs} tone="strength"/>
              <EvidenceBrief title="Review priorities" items={concernBriefs} tone="concern"/>
            </div>
            {nextRoundQuestions.length > 0 && <details className="mt-3 rounded-xl border border-slate-200 p-4 text-sm"><summary className="cursor-pointer font-medium">Next-round questions · {nextRoundQuestions.length}</summary><ul className="mt-3 list-disc space-y-2 pl-4 text-slate-600">{nextRoundQuestions.map((item, index) => <li key={index}>{typeof item === "string" ? item : show((item as Data).question || (item as Data).text || (item as Data).prompt)}</li>)}</ul></details>}

          </section>

          <section id="recording" className={`${reportPanel} scroll-mt-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Evidence</p><h2 className="mt-1 text-lg font-bold">Interview recording</h2><p className="mt-1 text-xs text-slate-500">{recordingStatus === "ready" ? `Secure recording · ${durationLabel(recordingDuration)}${recording?.started_at || report.recording?.started_at ? ` · ${stamp(recording?.started_at ?? report.recording?.started_at)}` : ""}` : recordingStatus === "expired" ? "Recording retention period ended" : recordingStatus === "failed" ? "Video upload failed" : recordingStatus === "unavailable" || recordingStatus === "not_configured" ? "No recording is available for this attempt" : `Recording ${displayName(show(recordingStatus))}`}</p></div><details className="text-xs text-slate-500"><summary className="cursor-pointer">Session details</summary><p className="mt-1 break-all">{report.session_id || "Session ID unavailable"}</p></details></div>
            {!videoReady ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><div><p className="text-sm text-slate-700">{recordingLoading ? "Checking recording availability…" : recordingStatus === "processing" || recordingStatus === "recording" ? "Recording is being prepared" : "Video is unavailable for this attempt"}</p><p className="mt-1 text-xs text-slate-500">The saved answers and feedback remain available.</p>{recordingError && <p role="alert" className="mt-2 text-xs text-rose-700">{recordingError}</p>}</div>{report.session_id && recordingStatus !== "expired" && <button type="button" className={`${btn} inline-flex items-center gap-2 whitespace-nowrap`} disabled={recordingLoading} onClick={() => void loadRecording()}>Refresh recording</button>}</div> : <>
            <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1.5fr)_minmax(15rem,1fr)]">
              <div className="min-w-0">
                <div className={`relative overflow-hidden rounded-xl ${videoReady ? "aspect-video bg-slate-950 text-white" : "min-h-36 border border-slate-200 bg-slate-50 text-slate-700"}`}>
                  {videoReady ? <video ref={videoRef} className="h-full w-full object-contain" src={recording.playback_url as string} controls playsInline preload="metadata" onError={() => setRecordingError("Playback could not load. Refresh the secure link and try again.")} aria-label="Interview recording" onTimeUpdate={event => setPlaybackTime(event.currentTarget.currentTime)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} /> : <div className="absolute inset-0 grid place-items-center px-5 text-center"><div><p className="text-sm font-semibold">{recordingLoading ? "Loading private recording…" : recordingStatus === "expired" ? "Recording is no longer available" : recordingStatus === "failed" ? "Recording could not be saved" : "No recording is available"}</p><p className="mt-1 text-xs text-slate-500">{recordingStatus === "expired" || recordingStatus === "failed" ? "Transcript and assessment evidence remain available below." : recordingLoading ? "Requesting secure playback." : "Review the saved answers and assessment below."}</p></div></div>}
                  {videoReady && <button type="button" disabled={!videoReady} title={videoReady ? (isPlaying ? "Pause interview video" : "Play interview video") : "Video unavailable for this candidate"} aria-label={videoReady ? (isPlaying ? "Pause interview video" : "Play interview video") : "Video unavailable for this candidate"} className={`absolute inset-0 m-auto grid h-14 w-14 place-items-center rounded-full bg-white/90 text-xl text-slate-900 shadow transition disabled:cursor-not-allowed disabled:opacity-60 ${isPlaying ? "pointer-events-none opacity-0" : "hover:bg-white"}`} onClick={() => { if (!videoRef.current) return; if (videoRef.current.paused) void videoRef.current.play(); else videoRef.current.pause(); }}>{isPlaying ? "Ⅱ" : "▶"}</button>}
                  {videoReady && <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold">Interview recording</span>}
                </div>
                {recordingError && <p role="alert" className="mt-2 text-xs text-rose-700">Recording error: {recordingError}<button className="ml-2 underline" onClick={() => void loadRecording()}>Retry</button></p>}
                {!videoReady && report.recording?.status === "ready" && <button type="button" className={`${btn} mt-2`} disabled={recordingLoading} onClick={() => { setRecordingError(""); void loadRecording(); }}>{recordingLoading ? "Loading recording…" : "Retry secure recording"}</button>}
                <div className="no-print mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" className={`${btn} h-[34px] w-[34px] justify-center p-0`} aria-label={isPlaying ? "Pause" : "Play"} title={isPlaying ? "Pause" : "Play"} disabled={!videoReady} onClick={() => { if (!videoRef.current) return; if (videoRef.current.paused) void videoRef.current.play(); else videoRef.current.pause(); }}>{isPlaying ? "Ⅱ" : "▶"}</button>
                  <button type="button" className={`${btn} h-[34px] w-[34px] justify-center p-0`} aria-label="Back 10 seconds" title="Back 10 seconds" disabled={!videoReady} onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10); }}>↺</button>
                  <button type="button" className={`${btn} h-[34px] w-[34px] justify-center p-0`} aria-label="Forward 10 seconds" title="Forward 10 seconds" disabled={!videoReady} onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration || Infinity, videoRef.current.currentTime + 10); }}>↻</button>
                  <span className="text-xs font-semibold tabular-nums text-slate-500">{timeLabel(playbackTime)} / {timeLabel(Number(recording?.duration_seconds ?? recordingDuration ?? 0))}</span>
                  <span className="flex-1"/>
                  <button type="button" className={`${btn} inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap`} disabled={!videoReady || !events.length} onClick={() => jumpToAdjacentFlag(-1)}>‹ Flag</button>
                  <button type="button" className={`${btn} inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap`} disabled={!videoReady || !events.length} onClick={() => jumpToAdjacentFlag(1)}>Flag ›</button>
                  <select aria-label="Playback speed" className="h-[34px] rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50" value={playbackRate} disabled={!videoReady} onChange={event => { const rate = Number(event.target.value); setPlaybackRate(rate); if (videoRef.current) videoRef.current.playbackRate = rate; }}><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option><option value={4}>4×</option></select>
                </div>
                <div className="relative mt-4 pt-3">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500"><span>Recording timeline</span><span>{recordingDuration != null ? timeLabel(Number(recordingDuration)) : "Not available"}</span></div>
                  {videoReady && Number(recording?.segment_count || 0) <= 1 && Number(recording?.duration_seconds || 0) > 0 ? <><div className="relative mt-1 h-7 rounded-lg bg-slate-100" role="group" aria-label="Recording timeline"><div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-slate-300"/>{turns.map((turn, index) => { const offset = recordingOffset(turn.asked_at); if (offset == null) return null; const left = Math.min(100, Math.max(0, offset / Number(recording.duration_seconds) * 100)); return <button key={String(turn.turn_id || index)} type="button" disabled={!videoReady} className="absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white bg-indigo-600 disabled:cursor-not-allowed" style={{ left: `${left}%` }} title={show(turn.question_text, `Question ${index + 1}`)} aria-label={`Jump to interview question ${index + 1}`} onClick={() => seekToQuestion(turn.asked_at)}/>; })}{events.map((event, index) => { const offset = recordingOffset(event.occurred_at || event.created_at); if (offset == null) return null; const left = Math.min(100, Math.max(0, offset / Number(recording.duration_seconds) * 100)); return <button key={String(event.event_id || index)} type="button" disabled={!videoReady} className="absolute top-1/2 z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-600 disabled:cursor-not-allowed" style={{ left: `${left}%` }} title={`${displayName(show(event.event_type || event.type))} · ${stamp(event.occurred_at || event.created_at)}`} aria-label={`Jump to proctor bookmark ${index + 1}`} onClick={() => { setActiveEvent(index); seekToEvent(event); }}/>; })}{bookmarkNotes.map(item => <button key={item.id} type="button" disabled={!videoReady} className="absolute top-1/2 z-30 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-white bg-slate-700 disabled:cursor-not-allowed" style={{ left: `${Math.min(100, item.seconds / Number(recording.duration_seconds) * 100)}%` }} title={`My note · ${timeLabel(item.seconds)} · ${item.text}`} aria-label={`My note at ${timeLabel(item.seconds)}`} onClick={() => { if (videoRef.current) videoRef.current.currentTime = item.seconds; }}/>)}</div><div className="mt-1 flex justify-between text-[10px] text-slate-500"><span>0:00</span><span>{timeLabel(Number(recording.duration_seconds))}</span></div></> : <div className="mt-1 flex h-7 items-center rounded-lg bg-slate-100 px-3 text-[10px] text-slate-500">{Number(recording?.segment_count || 0) > 1 ? "Timeline alignment unavailable for combined recording segments." : "No recording timeline is available for this attempt."}</div>}
                  <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-indigo-600"/>Question</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-600"/>AI Proctor flag</span><span><i className="mr-1 inline-block h-2 w-2 rotate-45 bg-slate-700"/>My note</span></div>
                </div>
                {videoReady && Number(recording?.segment_count || 0) > 1 && <p className="mt-3 text-xs text-slate-500">This recording combines multiple capture segments, so wall-clock timeline markers cannot be aligned reliably.</p>}

              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2" role="tablist" aria-label="Recording bookmarks">{[["all", "All"], ["proctor", "AI Proctor"], ["note", "My notes"]].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={bookmarkFilter === value} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${bookmarkFilter === value ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`} onClick={() => setBookmarkFilter(value)}>{label}</button>)}</div>
                <div className="mt-2 max-h-60 space-y-1 overflow-auto">{visibleBookmarks.length ? visibleBookmarks.map(item => <button key={item.id} type="button" className="flex w-full items-start gap-2 rounded-md border border-slate-200 p-2 text-left text-xs hover:bg-slate-50" onClick={() => { if (item.event) { setActiveEvent(events.indexOf(item.event)); seekToEvent(item.event); } else if (videoRef.current && item.seconds != null) videoRef.current.currentTime = item.seconds; }}><span className="min-w-10 font-bold tabular-nums text-slate-700">{item.seconds == null ? "—" : timeLabel(item.seconds)}</span><span className="min-w-0"><strong className="block">{item.text}</strong>{"detail" in item && <span className="mt-0.5 block text-slate-500">{item.detail}</span>}{"saved" in item && !item.saved && <span className="mt-0.5 block text-indigo-700">Draft · not saved</span>}</span></button>) : <p className="py-3 text-xs text-slate-500">{bookmarkFilter === "note" ? "No timestamped notes have been added." : bookmarkFilter === "proctor" ? "No proctor bookmarks are available." : "No recording bookmarks are available."}</p>}</div>
                <form className="mt-3 rounded-lg border border-slate-200 p-3" onSubmit={event => { event.preventDefault(); addBookmarkNote(); }}><label htmlFor="bookmark-note" className="text-xs font-semibold">Add note at current time</label><div className="mt-2 flex gap-2"><input id="bookmark-note" className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs" maxLength={120} placeholder={videoReady ? "Add a review note…" : "Load recording to timestamp a note"} value={bookmarkNote} onChange={event => setBookmarkNote(event.target.value)} disabled={!videoReady}/><button type="submit" className={`${btn} px-2 py-1 text-xs`} disabled={!videoReady || !bookmarkNote.trim()}>Add</button></div><p className="mt-1 text-[10px] leading-4 text-slate-500">Notes are draft-only until copied into the officer note and saved with a decision.</p><p className="mt-2 text-[10px] text-slate-400"><kbd>Space</kbd> play · <kbd>←</kbd>/<kbd>→</kbd> seek · <kbd>N</kbd> next flag · <kbd>B</kbd> note</p></form>
              </div>
            </div>
            </>}
          </section>

          <section id="deep-dive" className={`${reportPanel} scroll-mt-4 p-0`}>
            <div className="border-b border-slate-200 px-4 pt-4 sm:px-5"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Assessment details</p><h2 className="mt-1 text-lg font-bold">Interview deep dive</h2><nav className="report-nav mt-3 flex flex-wrap gap-1" role="tablist" aria-label="Candidate report sections">{nav.map(([item, label]) => <button key={item} type="button" role="tab" aria-selected={activeTab === item} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold ${activeTab === item ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`} onClick={() => setActiveTab(item)}>{label}{item === "answers" && <span className="ml-1.5 text-xs text-slate-400">{reviews.length}</span>}{item === "skills" && <span className="ml-1.5 text-xs text-slate-400">{claimGaps.length} gaps</span>}{item === "rounds" && rounds.length > 0 && <span className="ml-1.5 text-xs text-slate-400">{rounds.length}</span>}{item === "proctor" && events.length > 0 && <span className="ml-1.5 text-xs text-slate-400">{events.length}</span>}</button>)}</nav></div>
            <div className="p-4 sm:p-5">
              {activeTab === "answers" && <section id="evidence" className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-bold">Interview answers</h3><p className="mt-1 text-xs text-slate-500">Review each response and its feedback. Expand a question to see the evidence.</p></div><button className={`${btn} inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap`} disabled={transcriptLoading || !report.session_id} onClick={() => void evidence("transcript")}><FileText size={15}/>{transcriptLoading ? "Loading transcript…" : transcript ? "Refresh transcript" : "Load transcript"}</button></div>
                {transcriptError && <p role="alert" className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">{transcriptError}<button className="ml-2 underline" onClick={() => void evidence("transcript")}>Retry</button></p>}
                <div className="flex flex-wrap items-center gap-2"><div className="flex flex-wrap gap-1">{[["all", "All"], ["unanswered", "Needs review"], ["strong", "Strong"], ["feedback", "With feedback"], ...(followUpReviews.length ? [["followups", "Follow-ups"]] : [])].map(([value, label]) => <button key={value} type="button" aria-pressed={answerFilter === value} className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${answerFilter === value ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 text-slate-600"}`} onClick={() => setAnswerFilter(value)}>{label}</button>)}</div><label className="relative ml-auto"><Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/><input type="search" aria-label="Search questions and answers" className="w-full rounded-md border border-slate-300 py-2 pl-7 pr-3 text-xs sm:w-56" placeholder="Search questions or answers" value={answerSearch} onChange={event => setAnswerSearch(event.target.value)}/></label></div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500"><span>Answer status:</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-800">Answered</span><span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">Limited evidence</span><span className="rounded-full bg-rose-50 px-2 py-1 text-rose-800">Needs review</span></div>
                <div className="flex flex-wrap gap-1">{filteredReviews.map(review => { const index = reviews.indexOf(review), state = answerState(review); const tone = answerIsMissing(review) ? "bg-rose-600" : state === "answered" ? "bg-emerald-600" : "bg-amber-500"; return <button key={String(review.turn_id || index)} type="button" className={`h-6 min-w-6 rounded px-1 text-[10px] font-bold text-white ${tone}`} title={`Question ${index + 1}: ${displayName(show(state))}`} aria-label={`Go to question ${index + 1}`} onClick={() => { setExpanded(current => ({ ...current, answers: true })); requestAnimationFrame(() => { const answer = document.getElementById(`answer-${index}`) as HTMLDetailsElement | null; if (answer) { answer.open = true; answer.scrollIntoView({ behavior: "smooth", block: "center" }); } }); }}>{index + 1}</button>; })}</div>
                {filteredReviews.length ? (expanded.answers ? filteredReviews : filteredReviews.slice(0, 4)).map((review, index) => { const absoluteIndex = reviews.indexOf(review), turnId = String(review.turn_id || ""), persistedTurn = turns.find(turn => String(turn.turn_id) === turnId), responseText = String((persistedTurn ? persistedTurn.transcript : review.answer || review.transcript) || ""), responseReview = persistedTurn && !responseText.trim() ? { ...review, answer_state: "no_response", evidence_status: "no_response" } : review, state = answerState(responseReview), feedbackMatchesResponse = !persistedTurn || responseText.trim() === String(review.answer || review.transcript || "").trim(); const feedbackItems = [...(Array.isArray(review.strength_feedback) ? review.strength_feedback : []), ...(Array.isArray(review.improvement_feedback) ? review.improvement_feedback : [])]; return <details id={`answer-${absoluteIndex}`} key={turnId || index} className="group rounded-lg border border-slate-200 p-3 open:border-indigo-300"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-2"><span className="min-w-0 flex-1 text-xs font-medium text-slate-500">Question {absoluteIndex + 1} · {roundRole(review.agent_type || review.track || review.round)}</span><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${answerIsMissing(responseReview) ? "bg-rose-50 text-rose-800" : state === "answered" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{answerLabel(responseReview)}</span><ChevronDown size={14} className="text-slate-400 transition group-open:rotate-180"/></div><h4 className="mt-2 text-sm font-medium leading-6">{show(review.question || review.question_text, `Question ${absoluteIndex + 1}`)}</h4></summary><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{show(responseText, "No response text was captured.")}</p>{!feedbackMatchesResponse && <p className="mt-2 text-xs text-amber-800">The saved response differs from the evaluated version. Feedback needs a fresh evaluation.</p>}{feedbackMatchesResponse && feedbackItems.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{Array.isArray(review.strength_feedback) && review.strength_feedback.length > 0 && <div className="rounded-md bg-emerald-50 p-3 text-xs text-emerald-900"><strong>Strengths noted</strong><ul className="mt-1 list-disc pl-4">{review.strength_feedback.map((item, i) => <li key={i}>{show(item)}</li>)}</ul></div>}{Array.isArray(review.improvement_feedback) && review.improvement_feedback.length > 0 && <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-950"><strong>Improvement feedback</strong><ul className="mt-1 list-disc pl-4">{review.improvement_feedback.map((item, i) => <li key={i}>{show(item)}</li>)}</ul></div>}</div>}{persistedTurn?.asked_at != null && videoReady && <button type="button" className={`${btn} mt-3`} onClick={() => seekToQuestion(persistedTurn.asked_at)}>Play this answer · {new Date(String(persistedTurn.asked_at)).toLocaleTimeString()}</button>}{turnId && report.session_id && (persistedTurn?.has_audio ?? review.has_audio) !== false && responseText.trim() && <Audio path={`students/${studentId}/reports/${report.session_id}/turns/${turnId}/audio`}/>}<dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-2 text-[10px] text-slate-500"><div><dt className="inline">Words: </dt><dd className="inline font-semibold">{responseText.trim().split(/\s+/).filter(Boolean).length}</dd></div>{(persistedTurn?.has_audio ?? review.has_audio) != null && <div><dt className="inline">Audio: </dt><dd className="inline font-semibold">{(persistedTurn?.has_audio ?? review.has_audio) ? "Available" : "Unavailable"}</dd></div>}</dl></details>; }) : <p className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">{reviews.length ? "No answers match these filters." : "No question review was generated."}</p>}
                <PreviewToggle shown={expanded.answers ? filteredReviews.length : Math.min(4, filteredReviews.length)} total={filteredReviews.length} onClick={() => toggleExpanded("answers")} noun="answers"/>
                {transcript && <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer font-semibold">Full transcript · {turns.length} turns</summary><div className="mt-3 space-y-3 border-t border-slate-100 pt-3">{(expanded.transcript ? turns : turns.slice(0, 4)).map((turn, index) => <article key={String(turn.turn_id || index)} className="border-l-2 border-indigo-200 pl-3"><p className="text-[10px] font-semibold uppercase text-slate-500">Turn {show(turn.turn_index, String(index + 1))} · {roundRole(turn.agent_type)} · {displayName(show(turn.kind, "Question"))}</p><p className="mt-1 text-sm font-semibold">{show(turn.question_text)}</p><p className="mt-1 whitespace-pre-wrap text-sm">{show(turn.transcript, "No response text captured.")}</p>{turn.has_audio === true && Boolean(turn.turn_id) && report.session_id && <Audio path={`students/${studentId}/reports/${report.session_id}/turns/${String(turn.turn_id)}/audio`}/>}</article>)}<PreviewToggle shown={expanded.transcript ? turns.length : Math.min(4, turns.length)} total={turns.length} onClick={() => toggleExpanded("transcript")} noun="turns"/></div></details>}
              </section>}

              {activeTab === "skills" && <section id="role-fit" className="space-y-4">
                <div><h3 className="text-base font-bold">Skills proof</h3><p className="mt-1 text-xs text-slate-500">Resume claims are compared with evidence recorded in the interview.</p></div>
                <div className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-3"><div><p className="text-xs text-slate-500">Job fit</p><strong className="text-xl">{typeof jobFit.score === "number" ? `${jobFit.score}/100` : "Not assessed"}</strong><p className="text-[10px] text-slate-500">Role requirements vs interview evidence</p></div><div className="border-slate-200 sm:border-l sm:pl-3"><p className="text-xs text-slate-500">Resume credibility</p><strong className="text-xl">{resumeAlignment.credibility_score == null ? "—" : `${String(resumeAlignment.credibility_score)}/100`}</strong><p className="text-[10px] text-slate-500">Based on assessed resume claims</p></div><div className="border-slate-200 sm:border-l sm:pl-3"><p className="text-xs text-slate-500">Claims verified</p><strong className="text-xl">{testedResumeSkills.length ? `${verifiedResumeSkills.length}/${testedResumeSkills.length}` : "—"}</strong><p className="text-[10px] text-slate-500">{claimGaps.length} not demonstrated · {notTestedResumeSkills.length} not tested</p></div></div>
                {claimGaps.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-slate-700"><strong className="text-amber-900">Resume claims not demonstrated:</strong> {claimGaps.map(item => String(item.skill || "")).filter(Boolean).join(", ")}. Check the cited interview evidence before deciding.</div>}
                <div className="flex flex-wrap gap-1" role="group" aria-label="Filter resume claim evidence">{[["all", `All (${resumeSkills.length})`], ["gaps", `Claim gaps (${claimGaps.length})`], ["verified", `Verified (${verifiedResumeSkills.length})`], ["not_tested", `Not tested (${notTestedResumeSkills.length})`]].map(([value, label]) => <button key={value} type="button" aria-pressed={resumeSkillFilter === value} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${resumeSkillFilter === value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600"}`} onClick={() => setResumeSkillFilter(value)}>{label}</button>)}</div>
                <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="p-3">Skill / claim</th><th className="p-3">Resume says</th><th className="p-3">Interview showed</th><th className="p-3">Evidence</th></tr></thead><tbody>{filteredResumeSkills.length ? filteredResumeSkills.map((item, index) => { const level = String(item.evidence_level || "not_assessed").toLowerCase(); const matchingRequirements = requirements.filter(requirement => String(requirement.requirement || "").trim().toLowerCase() === String(item.skill || "").trim().toLowerCase()); const answerIds = matchingRequirements.flatMap(requirement => Array.isArray(requirement.answer_ids) ? requirement.answer_ids : []); const questionReviews = reviews.filter(review => answerIds.includes(review.answer_id)); const verdict = level === "verified" ? "Verified" : level === "weak" ? "Partial" : level === "not_demonstrated" ? "Not shown" : "Not tested"; return <tr key={String(item.claim_id || item.skill || index)} className={`border-t border-slate-100 align-top ${level === "not_demonstrated" ? "bg-rose-50/40" : ""}`}><th className="p-3 font-semibold">{show(item.skill, `Skill ${index + 1}`)}</th><td className="p-3 text-slate-600">Listed on resume</td><td className="p-3"><span className="font-semibold">{verdict}</span></td><td className="max-w-sm p-3 text-xs text-slate-600">{show(item.note, "No interview evidence note was included.")}{questionReviews.length > 0 && <div className="mt-1">{questionReviews.map((review, i) => <button key={i} type="button" className="mr-2 font-semibold text-indigo-700 underline" onClick={() => { setActiveTab("answers"); window.setTimeout(() => document.getElementById(`answer-${reviews.indexOf(review)}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0); }}>Q{reviews.indexOf(review) + 1}</button>)}</div>}</td></tr>; }) : <tr><td colSpan={4} className="p-5 text-center text-sm text-slate-500">{resumeSkills.length ? "No resume claims match this filter." : "Resume claim analysis is not available for this report."}</td></tr>}</tbody></table></div>
                <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold">Role requirements evidence · {requirements.length}</summary><div className="mt-3 space-y-3"><div className="flex flex-wrap gap-1" aria-label="Filter role requirement evidence">{[["all", "All"], ["gaps", "Gaps"], ["demonstrated", "Demonstrated"], ["not_asked", "Not asked"]].map(([value, label]) => <button key={value} type="button" aria-pressed={skillFilter === value} className={`rounded-full border px-3 py-1 text-xs font-semibold ${skillFilter === value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600"}`} onClick={() => setSkillFilter(value)}>{label}</button>)}</div><div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="p-3">Requirement</th><th className="p-3">Status</th><th className="p-3">Evidence strength</th><th className="p-3">Questions</th></tr></thead><tbody>{filteredRequirements.length ? filteredRequirements.map((item, index) => { const linkedReviews = reviews.filter(review => (Array.isArray(item.answer_ids) ? item.answer_ids : []).includes(review.answer_id)); return <tr key={String(item.requirement_id || index)} className="border-t border-slate-100 align-top"><th className="p-3 font-semibold">{show(item.requirement, `Requirement ${index + 1}`)}{item.critical === true && <span className="ml-2 text-[10px] font-normal text-slate-500">Critical</span>}</th><td className="p-3 text-xs">{item.candidate_mentioned === true ? "Demonstrated" : item.requirement_was_asked === true ? "Asked · no evidence" : "Not asked"}</td><td className="p-3 text-xs">{displayName(show(item.evidence_strength || item.status, "Not assessed"))}</td><td className="p-3">{linkedReviews.length ? linkedReviews.map((review, i) => <button key={i} type="button" className="mr-1 text-xs font-semibold text-indigo-700 underline" onClick={() => { setActiveTab("answers"); window.setTimeout(() => document.getElementById(`answer-${reviews.indexOf(review)}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0); }}>Q{reviews.indexOf(review) + 1}</button>) : Array.isArray(item.question_refs) && item.question_refs.length ? item.question_refs.join(", ") : <span className="text-xs text-slate-400">—</span>}</td></tr>; }) : <tr><td colSpan={4} className="p-5 text-center text-sm text-slate-500">No role requirement evidence matches this filter.</td></tr>}</tbody></table></div></div></details>
                <div className="grid gap-3 md:grid-cols-2"><article className="rounded-lg border border-slate-200 p-3"><h4 className="text-sm font-bold">Suitable roles</h4><div className="mt-3"><List items={suitableRoles} empty="No suitable roles were recorded."/></div></article><article className="rounded-lg border border-slate-200 p-3"><h4 className="text-sm font-bold">Recommended preparation</h4><div className="mt-3"><List items={preparationSteps} empty="No preparation guidance was recorded."/></div></article></div>
              </section>}

              {activeTab === "rounds" && <section id="panel-rounds" className="space-y-5"><div><h3 className="text-base font-bold">Rounds & competencies</h3><p className="mt-1 text-xs text-slate-500">Round performance, scored dimensions and communication measures from the evaluation.</p></div><div className="grid gap-3 sm:grid-cols-2">{roundEntries.length ? roundEntries.map(({ round, index, label, roundReviews }) => <article key={String(round.agent_type || index)} className="rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-wide text-slate-500">Round {index + 1}</p><h4 className="mt-1 text-sm font-bold">{label}</h4></div><strong className="text-sm tabular-nums">{round.sub_score == null ? displayName(show(round.status, "Not assessed")) : `${String(round.sub_score)}/100`}</strong></div>{typeof round.sub_score === "number" && <div className="mt-2 h-1.5 rounded bg-slate-100"><div className="h-full rounded bg-indigo-600" style={{ width: `${Math.max(0, Math.min(100, round.sub_score))}%` }}/></div>}<p className="mt-2 text-xs text-slate-600">{show(round.summary || round.evidence, "No round summary was recorded.")}</p><p className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500">{roundReviews.length} reviewed answer{roundReviews.length === 1 ? "" : "s"}</p></article>) : <p className="text-sm text-slate-500">No round-level assessment was recorded.</p>}</div><div className="grid gap-4 lg:grid-cols-2"><article className="rounded-lg border border-slate-200 p-3"><h4 className="text-sm font-bold">Competencies</h4>{dimensions.length ? <div className="mt-3 space-y-3">{dimensions.map((item, index) => <div key={index}><div className="flex justify-between gap-3 text-xs"><span>{show(item.label || displayName(show(item.dimension)))}</span><span className="font-semibold">{item.percentage != null ? `${String(item.percentage)}/100` : item.band != null ? `Band ${String(item.band)}` : "Not assessed"}</span></div>{typeof item.percentage === "number" && <div className="mt-1 h-1.5 rounded bg-slate-100"><div className="h-full rounded bg-indigo-600" style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%` }}/></div>}{item.interpretation != null && <p className="mt-1 text-xs text-slate-500">{String(item.interpretation)}</p>}</div>)}</div> : <p className="mt-3 text-sm text-slate-500">No competency scores were recorded.</p>}</article><article className="rounded-lg border border-slate-200 p-3"><h4 className="text-sm font-bold">Communication measures</h4>{Object.keys(communication).length ? <dl className="mt-3 divide-y divide-slate-100 text-sm">{[["Speaking speed", communication.speaking_speed_wpm == null ? null : `${String(communication.speaking_speed_wpm)} words/min`], ["Pace", communication.pace_label], ["Filler words", communication.filler_word_count], ["Timed answers", communication.timed_answer_count], ...Object.entries((communication.scores || {}) as Data).map(([key, value]) => [displayName(key), value == null ? null : `${String(value)}%`])].filter(([, value]) => value != null).map(([label, value]) => <div key={String(label)} className="flex justify-between gap-4 py-2"><dt className="text-slate-500">{String(label)}</dt><dd className="font-medium">{String(value)}</dd></div>)}</dl> : <p className="mt-3 text-sm text-slate-500">Communication measures are not available.</p>}{Array.isArray(communication.top_filler_words) && communication.top_filler_words.length > 0 && <p className="mt-2 text-xs text-slate-500">Recorded filler words: {communication.top_filler_words.map(String).join(", ")}</p>}</article></div><details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold">Dimensions chart</summary>{dimensionsWithScore.length ? <div className="mt-3 space-y-2">{dimensionsWithScore.map((item, index) => <div key={index} className="grid grid-cols-[minmax(6rem,.6fr)_minmax(0,1fr)_2.5rem] items-center gap-2 text-xs"><span>{show(item.label || item.dimension)}</span><div className="h-2 rounded bg-slate-100"><div className="h-full rounded bg-indigo-600" style={{ width: `${Math.max(0, Math.min(100, Number(item.percentage)))}%` }}/></div><span className="text-right font-semibold">{String(item.percentage)}</span></div>)}</div> : <p className="mt-3 text-sm text-slate-500">There are no percentage scores to chart.</p>}</details></section>}

              {activeTab === "proctor" && <section id="integrity" className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-bold">AI Proctor review</h3><p className="mt-1 text-xs text-slate-500">Recorded integrity signals for human review; events are not a final misconduct finding.</p></div><button className={`${btn} inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap`} disabled={integrityLoading || !report.session_id} onClick={() => void evidence("integrity-events")}><ShieldCheck size={14}/>{integrityLoading ? "Loading…" : integrity ? "Reload events" : "Load events"}</button></div>{integrityError && <p role="alert" className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">{integrityError}<button className="ml-2 underline" onClick={() => void evidence("integrity-events")}>Retry</button></p>}<div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Integrity score</p><strong className="text-xl">{proctorScore == null ? "Not assessed" : `${proctorScore}/100`}</strong></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Recorded events</p><strong className="text-xl">{events.length}</strong></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Assessment status</p><strong className="text-sm">{displayName(show(proctor.status, "Not assessed"))}</strong></div></div>{proctorSubscores.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{proctorSubscores.map(([key, value]) => <div key={key} className="flex justify-between rounded-md border border-slate-200 px-3 py-2 text-xs"><span>{displayName(key)}</span><strong>{show(value)}</strong></div>)}</div>}<div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="p-3">Time</th><th className="p-3">Event</th><th className="p-3">Severity</th><th className="p-3">Details</th><th className="p-3">Reviewer</th></tr></thead><tbody>{events.length ? events.map((event, index) => { const key = String(event.event_id || index); return <tr key={key} className="border-t border-slate-100 align-top"><td className="whitespace-nowrap p-3 text-xs">{stamp(event.occurred_at || event.created_at)}</td><th className="p-3 text-sm font-semibold">{displayName(show(event.event_type || event.type, "Proctor observation"))}</th><td className="p-3 text-xs">{displayName(show(event.severity, "Not specified"))}</td><td className="max-w-sm p-3 text-xs text-slate-600">{eventExplanation(event)}</td><td className="p-3"><select aria-label={`Reviewer assessment for event ${index + 1}`} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs" value={eventReviews[key] || ""} onChange={change => { setEventReviews(current => ({ ...current, [key]: change.target.value })); setEventReviewSaved(false); }}><option value="">Unreviewed</option><option value="reviewed">Reviewed</option><option value="dismissed">Dismissed</option><option value="follow_up">Follow up</option></select></td></tr>; }) : <tr><td colSpan={5} className="p-5 text-center text-sm text-slate-500">{integrityLoading ? "Loading integrity events…" : integrity ? "No proctor observations were recorded." : "Integrity events have not been loaded."}</td></tr>}</tbody></table></div>{events.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Review choices are available for this session; the report API does not persist reviewer annotations.</p><button type="button" className={`${btn} inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap`} disabled={!Object.values(eventReviews).some(Boolean)} onClick={() => { setEventReviewSaved(true); setNotice("Reviewer selections are recorded for this page session only; no persistence endpoint is available."); }}>Save review</button></div>}{eventReviewSaved && <p role="status" className="text-xs text-amber-700">Review selection captured for this page session. It is not saved to the backend.</p>}</section>}

              {activeTab === "feedback" && <section id="student-feedback" className="space-y-4"><div><h3 className="text-base font-bold">Student feedback</h3><p className="mt-1 text-xs text-slate-500">Feedback and preparation guidance included with this saved evaluation.</p></div><article className="rounded-lg border border-slate-200 p-4"><h4 className="text-sm font-bold">Interview summary</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{show(feedbackSummary, "No student-facing summary is available in this report.")}</p></article><div className="grid gap-3 lg:grid-cols-2"><article className="rounded-lg border border-slate-200 p-4"><h4 className="text-sm font-bold">Growth areas</h4><div className="mt-3"><List items={feedbackAreas} empty="No growth areas are available in this report."/></div></article><article className="rounded-lg border border-slate-200 p-4"><h4 className="text-sm font-bold">Preparation plan</h4><div className="mt-3"><List items={preparationSteps} empty="No preparation guidance is available in this report."/></div></article></div>{suitableRoles.length > 0 && <article className="rounded-lg border border-slate-200 p-4"><h4 className="text-sm font-bold">Roles aligned with this report</h4><div className="mt-3"><List items={suitableRoles} empty="No roles recorded."/></div></article>}</section>}
            </div>
          </section>
        </main>

        <aside className="min-w-0 space-y-3 xl:sticky xl:top-[70px] xl:self-start xl:pr-1">
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Placement readiness index</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-[120px] w-[120px] shrink-0"><svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120" aria-label={comparable ? `Placement readiness ${String(pri.score)} out of 100` : "Placement readiness unavailable"}><circle cx="60" cy="60" r="46" fill="none" stroke="#e2e8f0" strokeWidth="10"/>{comparable && <circle cx="60" cy="60" r="46" fill="none" stroke={Number(pri.score) >= 75 ? "#059669" : Number(pri.score) >= 50 ? "#f59e0b" : "#e11d48"} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 46}`} strokeDashoffset={`${2 * Math.PI * 46 * (1 - Number(pri.score) / 100)}`}/>}</svg><div className="absolute inset-0 flex flex-col items-center justify-center text-center text-2xl font-extrabold leading-none tabular-nums">{comparable ? <><span className="block whitespace-nowrap">{String(pri.score)}</span><small className="mt-1 block text-[10px] font-semibold leading-3 text-slate-500">/ 100</small></> : "—"}</div></div>
              <div><p className="text-lg font-extrabold">{displayName(show(report.readiness, "Not assessed"))}</p><p className="text-xs text-slate-500">Evidence confidence {show(confidence.score, "—")}{confidence.score != null ? "/100" : ""}</p></div>
            </div>
            <div className="relative mt-3"><div className="flex h-2 overflow-hidden rounded-full"><i className="w-1/2 bg-rose-100"/><i className="w-1/4 bg-amber-100"/><i className="w-1/4 bg-emerald-100"/></div>{comparable && <span className="absolute -top-1 h-4 w-[3px] rounded bg-slate-900" style={{ left: `${Math.max(0, Math.min(100, Number(pri.score)))}%` }}/>}</div>
            <div className="mt-1 flex justify-between text-[9px] font-semibold text-slate-500"><span>Not ready &lt;50</span><span>Developing</span><span>Ready ≥75</span></div>
            <p className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] leading-5 text-slate-600">{priFormulaAvailable ? `${Math.round(Number(interviewComponent.weight) * 100)}% × ${String(interviewComponent.score)} interview + ${Math.round(Number(jobFitComponent.weight) * 100)}% × ${String(jobFitComponent.score)} job fit = ${comparable ? String(pri.score) : "score withheld"}` : show(pri.explanation, "Score components were not included in this report.")}</p>
            {!comparable && Array.isArray(pri.blockers) && pri.blockers.length > 0 && <ul className="mt-2 list-disc pl-4 text-[10px] text-slate-500">{pri.blockers.map((blocker, index) => <li key={index}>{typeof blocker === "string" ? blocker : show((blocker as Data).message)}</li>)}</ul>}
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2"><div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">AI recommendation · advisory</p><p className="mt-1 text-xl font-extrabold">{show(recommendationLabels[String(hiring.label || "Review Required")] || hiring.label, "Review required")}</p></div><span className="text-[10px] text-slate-500">Confidence {show(hiring.confidence, "—")}</span></div>
            <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">{advisoryFlags.map((flag, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-slate-700"><span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-rose-50 text-[10px] font-bold text-rose-700">!</span>{flag}</li>)}</ul>{!advisoryFlags.length && <p className="mt-2 text-xs leading-5 text-slate-500">Review the interview scores and supporting evidence before deciding.</p>}
            <details className="mt-3 border-t border-slate-100 pt-2 text-xs"><summary className="cursor-pointer font-semibold">Why this recommendation</summary><ul className="mt-2 list-disc space-y-1 pl-4 text-slate-600">{recommendationReasons.length ? recommendationReasons.map((reason, index) => <li key={index}>{show(reason)}</li>) : <li>No recommendation reasons were included in this report.</li>}</ul></details>
          </article>
          <section id="decision" className="space-y-3 scroll-mt-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Placement workflow</p><h2 className="mt-1 text-lg font-bold">Decision & publication</h2></div>{decisionError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-800">Decision details could not be loaded: {decisionError}<button className="ml-2 underline" onClick={() => void load()}>Retry</button></p>}
            <form className="rounded-xl border border-slate-200 bg-white p-4" onSubmit={event => { event.preventDefault(); setConfirm("decision"); }}><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold">Officer decision</h3><span className="text-[10px] text-slate-500">{decision ? decisionLabel(decision) : "Not decided"}</span></div><fieldset className="mt-3"><legend className="mb-2 text-xs font-medium text-slate-600">Choose an outcome</legend><div className="grid grid-cols-3 gap-1">{[["shortlist", "Shortlist"], ["hold", "Hold"], ["reject", "Not selected"]].map(([value, label]) => <button key={value} type="button" aria-pressed={decision === value} onClick={() => setDecision(value)} className={`rounded-md border px-1.5 py-2 text-[10px] font-semibold sm:text-xs ${decision === value ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{label}</button>)}</div></fieldset><label className="mt-3 block text-xs font-semibold">Officer note<textarea className={reportField} rows={4} maxLength={2000} placeholder="Add decision context or save timestamped notes" value={note} onChange={event => setNote(event.target.value)}/><span className="mt-1 block text-right text-[10px] font-normal text-slate-500">{2000 - note.length} characters remaining</span></label>{bookmarkNotes.length > 0 && <button type="button" className="mt-2 text-xs font-semibold text-indigo-700" onClick={() => setNote(current => [current.trim(), ...bookmarkNotes.map(item => `[Recording ${timeLabel(item.seconds)}] ${item.text}`)].filter(Boolean).join("\n"))}>Append {bookmarkNotes.length} timestamped note{bookmarkNotes.length === 1 ? "" : "s"}</button>}<button type="submit" className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || !decision}>Record decision</button></form>
            <article className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-bold">Student result publication</h3><p className="mt-1 text-xs text-slate-500">Current status: {displayName(show(publication.state, "Hidden"))}</p>{publication.scheduled_for != null && <p className="mt-2 text-xs">Scheduled {stamp(publication.scheduled_for)}</p>}{publication.released_at != null && <p className="mt-2 text-xs">Released {stamp(publication.released_at)}</p>}<div className="mt-3 flex flex-wrap gap-2">{publication.state !== "released" && <button className={`${btn} inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap`} onClick={() => setConfirm("release")}>Release now</button>}{publication.state === "scheduled" ? <button className={`${btn} inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap`} onClick={() => setConfirm("cancel_schedule")}>Cancel schedule</button> : publication.state !== "released" && <button className={`${btn} inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap`} onClick={() => setConfirm("schedule")}>Schedule release</button>}</div>{publication.state !== "scheduled" && publication.state !== "released" && <label className="mt-3 block text-xs font-medium">Schedule date/time<input className={reportField} type="datetime-local" value={schedule} onChange={event => setSchedule(event.target.value)}/></label>}</article>
            <article className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold">Decision history</h3><span className="text-xs text-slate-500">{history.length}</span></div><div className="mt-3 space-y-2">{orderedHistory.length ? (expanded.history ? orderedHistory : orderedHistory.slice(0, 4)).map((item, index) => <div key={String(item.decision_id || index)} className="border-t border-slate-100 pt-2 text-xs"><div className="flex justify-between gap-2"><strong>{decisionLabel(item.decision)}</strong><span className="text-slate-500">{stamp(item.decided_at || item.created_at)}</span></div><p className="mt-1 whitespace-pre-wrap text-slate-600">{show(item.note, "No officer note.")}</p>{item.actor_name != null && <p className="mt-1 text-[10px] text-slate-500">Recorded by {String(item.actor_name)}</p>}</div>) : <p className="text-xs text-slate-500">No officer decision has been recorded.</p>}</div><PreviewToggle shown={expanded.history ? history.length : Math.min(4, history.length)} total={history.length} onClick={() => toggleExpanded("history")} noun="history entries"/></article>
          </section>
        </aside>
      </div>

      {focusGroup && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3" onMouseDown={event => { if (event.target === event.currentTarget) setFocusGroup(null); }}><section role="dialog" aria-modal="true" aria-labelledby="focus-dialog-title" className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Interview evidence</p><h2 id="focus-dialog-title" className="mt-1 text-lg font-bold">{focusGroup === "strengths" ? "Interview strengths" : "Growth areas"}</h2></div><button type="button" aria-label="Close details" onClick={() => setFocusGroup(null)} className="rounded p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></header><div className="overflow-y-auto p-4"><List items={focusGroup === "strengths" ? strengths : growthAreas} empty="No evidence was recorded."/></div></section></div>}
      {confirm && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="report-confirm-title" className={`${reportPanel} max-w-md`}><h3 id="report-confirm-title" className="text-lg font-bold">Confirm {displayName(confirm)}</h3><p className="mt-2 text-sm">{confirm === "decision" ? `Record ${displayName(decision)} as the officer decision?` : confirm === "schedule" ? "Schedule student result publication for the selected date and time?" : confirm === "cancel_schedule" ? "Cancel the scheduled student result publication?" : "Release this result to the student now?"}</p>{confirm === "schedule" && !schedule && <p className="mt-2 text-xs text-rose-700">Choose a release date and time before continuing.</p>}<div className="mt-5 flex justify-end gap-2"><button className={`${btn} inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap`} onClick={() => setConfirm(null)}>Cancel</button><button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={confirm === "schedule" && !schedule} onClick={() => void perform()}>Confirm</button></div></section></div>}
    </section>
  );
}
