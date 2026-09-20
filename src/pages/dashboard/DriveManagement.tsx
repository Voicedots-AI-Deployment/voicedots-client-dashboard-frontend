import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  collegeApi,
  collegeError,
  type Drive,
  type Program,
  type RoundConfiguration,
} from "@/api/collegeApi";
import {
  btn,
  field,
  panel,
  selectionName,
  type AgentLibrary,
  type Selection,
} from "./interviewAgentTypes";
import { displayName } from "./placementDisplay";
import CandidateReport from "./CandidateReport";
import ResultCohortBuilder, {type ResultFilterOptions,type ResultRule} from "./ResultCohortBuilder";

type Data = Record<string, unknown>;
type Candidate = Data & {
  student_id: string;
  full_name: string;
  roll_number: string;
  email?: string;
  department_code?: string;
  program?: string;
  cgpa?: number;
  graduation_year?: number;
  eligible?: boolean;
  eligibility_note?: string;
  integrity_review_status?: string;
  started_at?: string;
  last_activity_at?: string;
  last_activity_label?: string;
  current_round?: string;
  current_agent?: string;
  ats_fit_score?: number;
  mandatory_coverage?: string;
  core_coverage?: string;
  preferred_coverage?: string;
  resume_evidence?: string;
  skills?: Data[];
  overall_score?: number;
  ranking_score?: number;
  readiness?: string;
  recommendation?: string;
  proctoring_score?: number;
  integrity_review_label?: string;
  rank?: number;
  officer_decision?: string;
  evaluation_status?: string;
  assignment_status?: string;
  preparation_status?: string;
  attempt_number?: number;
  max_attempts?: number;
  assigned_at?: string;
  publication?: { state?: string };
};
const sections = {
  overview: "Overview",
  candidates: "Candidates",
  ats: "ATS fit",
  results: "Interview results",
  skills: "Skill intelligence",
  departments: "Departments",
  settings: "Drive settings",
};
type Tab = keyof typeof sections;
const paths: Record<Tab, string> = {
  overview: "dashboard/overview",
  candidates: "dashboard/ranking",
  ats: "dashboard/ats-fit",
  results: "dashboard/ranking",
  skills: "dashboard/skill-gap",
  departments: "dashboard/departments",
  settings: "dashboard/overview",
};
function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: unknown;
  note?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <strong className="mt-2 block text-3xl text-slate-900 dark:text-white">
        {value === null || value === undefined ? "—" : String(value)}
      </strong>
      {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
    </article>
  );
}

function ScoreBadge({ score }: { score?: number | null }) {
  if (score == null) return <span className="text-slate-500">Not assessed</span>;
  const tone = score >= 75
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
    : score >= 50
      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
      : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200";
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${tone}`}>{score}/100</span>;
}
function StatusBadge({ value }: { value?: string | null }) {
  const label = value === "shortlist" ? "Shortlisted" : value === "reject" ? "Rejected" : displayName(value || "not assessed"), normalized = label.toLowerCase();
  const tone = /shortlist|ready|released|strong hire|no review required/.test(normalized) ? "bg-emerald-100 text-emerald-800" : /reject|not ready|serious|review required/.test(normalized) ? "bg-rose-100 text-rose-800" : /hold|pending|needs review|consider/.test(normalized) ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function resumeEvidenceLabel(value?: string) {
  const normalized = String(value || "none").toLowerCase().replace(/[_-]+/g, " ");
  if (normalized === "strong" || normalized === "sufficient") return "Strong";
  if (normalized === "limited") return "Limited";
  return "None";
}

function ReadinessPolicy() {
  const [interview, setInterview] = useState(70);
  const [resume, setResume] = useState(30);
  const [state, setState] = useState<"loading" | "idle" | "saving">("loading");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    collegeApi.get<{interview_readiness:number;resume_readiness:number}>("readiness-policy", controller.signal)
      .then(policy => { setInterview(policy.interview_readiness); setResume(policy.resume_readiness); })
      .catch(error => { if (!controller.signal.aborted) setMessage(collegeError(error)); })
      .finally(() => { if (!controller.signal.aborted) setState("idle"); });
    return () => controller.abort();
  }, []);
  async function save() {
    setState("saving"); setMessage("");
    try {
      await collegeApi.save("readiness-policy", {interview_readiness:interview,resume_readiness:resume}, true);
      setMessage("Readiness formula saved for every student in this institution.");
    } catch (error) { setMessage(collegeError(error)); }
    finally { setState("idle"); }
  }
  return <section className={panel} aria-labelledby="readiness-policy-title">
    <div className="space-y-1"><h3 id="readiness-policy-title" className="font-bold">Placement readiness formula</h3><p className="text-sm text-slate-500">Choose how interview performance and resume quality contribute. The two values must total 100%.</p></div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className={field}>Interview performance (%)<input type="number" min="0" max="100" value={interview} disabled={state!=="idle"} onChange={event=>{const value=Number(event.target.value);setInterview(value);setResume(Math.max(0,100-value));}} /></label>
      <label className={field}>Resume quality (%)<input type="number" min="0" max="100" value={resume} disabled={state!=="idle"} onChange={event=>{const value=Number(event.target.value);setResume(value);setInterview(Math.max(0,100-value));}} /></label>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button className={btn} disabled={state!=="idle"||interview+resume!==100} onClick={()=>void save()}>{state==="saving"?"Saving…":"Save formula"}</button><span className="text-sm text-slate-500" role="status">{state==="loading"?"Loading formula…":message}</span></div>
  </section>;
}
const DEFAULT_RESULTS_LABELS = {
  recommendation_labels: {"Strong Hire":"Strong Hire", Hire:"Hire", Consider:"Consider", Reject:"Reject", "Review Required":"Review Required"},
  proctor_labels: {no_review_required:"No Review Required", review_required:"Review Required", not_available:"Not Available"},
  proctor_review_event_threshold: 1,
  skill_intelligence: {min_coverage_pct:40,min_assessed_candidates:5,allow_preferred_high_risk:false,risk_thresholds:{mandatory:{high:50,medium:25},core:{high:60,medium:30},preferred:{high:75,medium:50}},labels:{high:"High",medium:"Medium",low:"Low",insufficient_data:"Insufficient Data"}},
};
function InterviewResultsSettings() {
  const [settings, setSettings] = useState<typeof DEFAULT_RESULTS_LABELS>(DEFAULT_RESULTS_LABELS);
  const [state, setState] = useState<"loading"|"idle"|"saving">("loading");
  const [message, setMessage] = useState("");
  useEffect(() => { const c = new AbortController(); collegeApi.get<typeof DEFAULT_RESULTS_LABELS>("interview-results-settings", c.signal).then(value => setSettings({...DEFAULT_RESULTS_LABELS, ...value, recommendation_labels:{...DEFAULT_RESULTS_LABELS.recommendation_labels,...value.recommendation_labels}, proctor_labels:{...DEFAULT_RESULTS_LABELS.proctor_labels,...value.proctor_labels}, skill_intelligence:{...DEFAULT_RESULTS_LABELS.skill_intelligence,...value.skill_intelligence, risk_thresholds:{...DEFAULT_RESULTS_LABELS.skill_intelligence.risk_thresholds,...value.skill_intelligence?.risk_thresholds}, labels:{...DEFAULT_RESULTS_LABELS.skill_intelligence.labels,...value.skill_intelligence?.labels}}})).catch(e => { if (!c.signal.aborted) setMessage(collegeError(e)); }).finally(() => { if (!c.signal.aborted) setState("idle"); }); return () => c.abort(); }, []);
  const update = (group: "recommendation_labels"|"proctor_labels", key: string, value: string) => setSettings(current => ({...current, [group]: {...current[group], [key]: value}}));
  async function save() { setState("saving"); setMessage(""); try { await collegeApi.save("interview-results-settings", settings, true); setMessage("Interview Results settings saved."); } catch (e) { setMessage(collegeError(e)); } finally { setState("idle"); } }
  const setRiskThreshold = (priority: "mandatory"|"core"|"preferred", level: "high"|"medium", value: number) => setSettings(current => ({...current, skill_intelligence:{...current.skill_intelligence, risk_thresholds:{...current.skill_intelligence.risk_thresholds, [priority]:{...current.skill_intelligence.risk_thresholds[priority], [level]:value}}}}));
  return <section className={panel} aria-labelledby="interview-results-settings-title">
    <div><h3 id="interview-results-settings-title" className="font-bold">Interview Results and Skill Intelligence settings</h3><p className="mt-1 text-sm text-slate-500">Customize labels and evidence thresholds. Officer decisions and recorded interview scores remain unchanged.</p></div>
    <h4 className="mt-5 font-semibold">AI recommendation labels</h4><div className="mt-3 grid gap-4 sm:grid-cols-2">{Object.entries(settings.recommendation_labels).map(([key,value])=><label className={field} key={key}>{key}<input value={value} disabled={state!=="idle"} onChange={e=>update("recommendation_labels",key,e.target.value)} /></label>)}</div>
    <h4 className="mt-5 font-semibold">AI proctor defaults</h4><div className="mt-3 grid gap-4 sm:grid-cols-2">{Object.entries(settings.proctor_labels).map(([key,value])=><label className={field} key={key}>{displayName(key)}<input value={value} disabled={state!=="idle"} onChange={e=>update("proctor_labels",key,e.target.value)} /></label>)}<label className={field}>Review event threshold<input type="number" min="0" max="1000" value={settings.proctor_review_event_threshold} disabled={state!=="idle"} onChange={e=>setSettings(current=>({...current,proctor_review_event_threshold:Math.max(0,Number(e.target.value)||0)}))}/></label></div>
    <h4 className="mt-5 font-semibold">Skill risk calculation</h4><div className="mt-3 grid gap-4 sm:grid-cols-2"><label className={field}>Minimum coverage (%)<input type="number" min="0" max="100" value={settings.skill_intelligence.min_coverage_pct} disabled={state!=="idle"} onChange={e=>setSettings(current=>({...current,skill_intelligence:{...current.skill_intelligence,min_coverage_pct:Number(e.target.value)||0}}))}/></label><label className={field}>Minimum assessed candidates<input type="number" min="0" value={settings.skill_intelligence.min_assessed_candidates} disabled={state!=="idle"} onChange={e=>setSettings(current=>({...current,skill_intelligence:{...current.skill_intelligence,min_assessed_candidates:Number(e.target.value)||0}}))}/></label>{(["mandatory","core","preferred"] as const).flatMap(priority=>(["high","medium"] as const).map(level=><label className={field} key={`${priority}-${level}`}>{displayName(priority)} {displayName(level)} risk from (%)<input type="number" min="0" max="100" value={settings.skill_intelligence.risk_thresholds[priority][level]} disabled={state!=="idle"} onChange={e=>setRiskThreshold(priority,level,Number(e.target.value)||0)}/></label>))}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.skill_intelligence.allow_preferred_high_risk} disabled={state!=="idle"} onChange={e=>setSettings(current=>({...current,skill_intelligence:{...current.skill_intelligence,allow_preferred_high_risk:e.target.checked}}))}/>Allow Preferred skills to become High risk</label></div>
    <h4 className="mt-5 font-semibold">Skill risk labels</h4><div className="mt-3 grid gap-4 sm:grid-cols-2">{Object.entries(settings.skill_intelligence.labels).map(([key,value])=><label className={field} key={key}>{displayName(key)}<input value={value} disabled={state!=="idle"} onChange={e=>setSettings(current=>({...current,skill_intelligence:{...current.skill_intelligence,labels:{...current.skill_intelligence.labels,[key]:e.target.value}}}))}/></label>)}</div>
    <div className="mt-5 flex items-center gap-3"><button className={btn} disabled={state!=="idle"} onClick={()=>void save()}>{state==="saving"?"Saving…":"Save settings"}</button><span className="text-sm text-slate-500" role="status">{state==="loading"?"Loading settings…":message}</span></div>
  </section>;
}
function CandidateDetails({
  candidate,
  data,
  mode,
}: {
  candidate: Candidate;
  data: unknown;
  mode: "candidates" | "ats";
}) {
  const value = (data && typeof data === "object" ? data : {}) as Data;
  const history = (value.history || value.attempts || []) as Data[];
  const skills = (value.skills || []) as Data[];
  return (
    <div className="space-y-4">
      <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-slate-500">Email</dt>
          <dd className="font-semibold">{candidate.email || "Not supplied"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Department / Program</dt>
          <dd className="font-semibold">
            {candidate.department_code || "—"} / {candidate.program || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">CGPA / Graduation</dt>
          <dd className="font-semibold">
            {candidate.cgpa ?? "—"} / {candidate.graduation_year ?? "—"}
          </dd>
        </div>
        {mode === "ats" ? (
          <>
            <div>
              <dt className="text-slate-500">ATS Fit</dt>
              <dd className="mt-1"><ScoreBadge score={candidate.ats_fit_score} /></dd>
            </div>
            <div>
              <dt className="text-slate-500">Mandatory / Core / Preferred</dt>
              <dd className="font-semibold">
                {candidate.mandatory_coverage || "—"} /{" "}
                {candidate.core_coverage || "—"} /{" "}
                {candidate.preferred_coverage || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Resume evidence</dt>
              <dd className="font-semibold">
                {resumeEvidenceLabel(candidate.resume_evidence)}
              </dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt className="text-slate-500">Interview status</dt>
              <dd className="font-semibold">
                {displayName(
                  candidate.evaluation_status ||
                    candidate.preparation_status ||
                    "pending",
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Eligibility</dt>
              <dd className={`font-semibold ${candidate.eligible === false ? "text-rose-600" : "text-emerald-700"}`}>{candidate.eligible === false ? "Not eligible" : "Eligible"}</dd>
              {candidate.eligibility_note && <p className="mt-1 text-xs text-slate-500">{candidate.eligibility_note}</p>}
            </div>
            <div>
              <dt className="text-slate-500">Attempts</dt>
              <dd className="font-semibold">
                {candidate.attempt_number || 0} /{" "}
                {candidate.max_attempts || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Assigned</dt>
              <dd className="font-semibold">
                {candidate.assigned_at
                  ? new Date(candidate.assigned_at).toLocaleString()
                  : "Not available"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Last activity</dt>
              <dd className="font-semibold">{candidate.last_activity_label || "Not started"}{(candidate.last_activity_at || candidate.started_at) ? <span className="mt-1 block text-xs font-normal text-slate-500">{new Date(candidate.last_activity_at || candidate.started_at!).toLocaleString()}</span> : null}</dd>
            </div>
            {candidate.assignment_status === "in_progress" && <div>
              <dt className="text-slate-500">Live interview</dt>
              <dd className="font-semibold text-emerald-700">● {candidate.current_round || "In progress"}{candidate.current_agent ? ` · ${candidate.current_agent}` : ""}</dd>
            </div>}
            {(candidate.integrity_review_status === "review_required" || candidate.evaluation_status === "held_for_review" || candidate.assignment_status === "abandoned" || candidate.evaluation_status === "incomplete") && <div>
              <dt className="text-slate-500">Needs attention</dt>
              <dd className="font-semibold text-amber-700">{candidate.integrity_review_status === "review_required" ? "Integrity review required" : candidate.assignment_status === "abandoned" ? "Candidate abandoned" : candidate.evaluation_status === "incomplete" ? "Evaluation incomplete" : "Evaluation review required"}</dd>
            </div>}
          </>
        )}
      </dl>
      {mode === "ats" && skills.length > 0 && (
        <div>
          <h4 className="mb-1 font-semibold">JD requirement and resume evidence</h4>
          <p className="mb-3 text-xs text-slate-500">Skills extracted from the job description and matched with the candidate&apos;s resume.</p>
          <div className="space-y-3">
            {([{
              label: "Full evidence",
              items: skills.filter(skill => ["FULL_MATCH", "RELATED_EVIDENCE"].includes(String(skill.match_status || "").toUpperCase())),
              tone: "border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20",
              chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
            }, {
              label: "No evidence",
              items: skills.filter(skill => !["FULL_MATCH", "RELATED_EVIDENCE"].includes(String(skill.match_status || "").toUpperCase())),
              tone: "border-rose-100 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20",
              chip: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
            }]).filter(group => group.items.length > 0).map(group => (
              <section className={`rounded-xl border p-3 ${group.tone}`} key={group.label}>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span className="text-base" aria-hidden="true">{group.label === "Full evidence" ? "✓" : "△"}</span>
                  <span>{group.label} ({group.items.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((skill, index) => <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${group.chip}`} key={String(skill.skill || index)}>{String(skill.skill || "Requirement")}</span>)}
                </div>
              </section>
            ))}
          </div>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60">Resume evidence is based on the quality and coverage of extracted skills, experience, and achievements, not resume length.</p>
        </div>
      )}
      {history.length > 0 && (
        <div>
          <h4 className="mb-2 font-semibold">Attempt history</h4>
          <div className="space-y-2">
            {history.map((row, index) => (
              <div
                className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"
                key={String(row.id || index)}
              >
                <strong>
                  Attempt {String(row.attempt_number || index + 1)} ·{" "}
                  {displayName(String(row.status || "unknown"))}
                </strong>
                <p className="text-slate-500">
                  Started{" "}
                  {row.started_at
                    ? new Date(String(row.started_at)).toLocaleString()
                    : "—"}{" "}
                  · Completed{" "}
                  {row.completed_at
                    ? new Date(String(row.completed_at)).toLocaleString()
                    : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function Bar({
  label,
  value,
  total,
  tone = "bg-indigo-500",
}: {
  label: string;
  value: number;
  total: number;
  tone?: string;
}) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-sm">
        <span>{label}</span>
        <strong>
          {value}{" "}
          <span className="font-normal text-slate-500">({percent}%)</span>
        </strong>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
function SkillView({ data }: { data: Data }) {
  const skills = (data.skills || []) as Data[];
  const historical = (data.unmatched_historical_skills || []) as Data[];
  const [query, setQuery] = useState(""), [priority, setPriority] = useState(""), [evidence, setEvidence] = useState(""), [risk, setRisk] = useState(""), [selected, setSelected] = useState<Data | null>(null);
  const rows = skills.filter(skill => (!query || String(skill.skill || "").toLowerCase().includes(query.toLowerCase())) && (!priority || skill.priority === priority) && (!risk || String(skill.risk || "") === risk) && (!evidence || (evidence === "tested" ? Number(skill.assessed_count || 0) > 0 : evidence === "not_tested" ? Number(skill.not_tested_count || 0) > 0 : evidence === "good" ? Number(skill.good_count || 0) > 0 : Number(skill.limited_answer_count || 0) + Number(skill.no_clear_answer_count || 0) > 0)));
  const coverage = skills.length ? Math.round(skills.reduce((sum, s) => sum + Number(s.coverage_pct || 0), 0) / skills.length) : 0;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Skills tracked" value={skills.length} /><Metric label="Released interviews" value={data.total_released ?? 0} /><Metric label="Evidence coverage" value={skills.length ? `${coverage}%` : "—"} /></div>
    <div className={`${panel} flex flex-wrap items-end gap-3`}><label className="text-sm">Search skill<input className={field} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search skills" /></label><label className="text-sm">JD priority<select className={field} value={priority} onChange={e=>setPriority(e.target.value)}><option value="">All priorities</option><option value="mandatory">Mandatory</option><option value="core">Core</option><option value="preferred">Preferred</option></select></label><label className="text-sm">Evidence status<select className={field} value={evidence} onChange={e=>setEvidence(e.target.value)}><option value="">All evidence</option><option value="good">Good</option><option value="limited">Limited / unclear</option><option value="tested">Tested</option><option value="not_tested">Not tested</option></select></label><label className="text-sm">Risk<select className={field} value={risk} onChange={e=>setRisk(e.target.value)}><option value="">All risk</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="insufficient_data">Insufficient data</option></select></label></div>
    <div className={`${panel} overflow-x-auto`}><table className="w-full text-left text-sm"><thead><tr>{["Skill","JD priority","Good","Limited","No clear answer","Not tested","Coverage","Evidence gap","Risk"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{["mandatory","core","preferred"].flatMap(group=>rows.filter(s=>s.priority===group)).map((skill,index)=><tr className="border-t" key={String(skill.skill||index)}><td className="p-3"><button className="font-semibold text-indigo-700 hover:underline" onClick={()=>setSelected(skill)}>{String(skill.skill)}</button></td><td className="p-3">{displayName(String(skill.priority||"unknown"))}</td><td className="p-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-800">{String(skill.good_count ?? 0)}</span></td><td className="p-3"><span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">{String(skill.limited_answer_count ?? 0)}</span></td><td className="p-3"><span className="rounded-full bg-rose-50 px-2 py-1 text-rose-800">{String(skill.no_clear_answer_count ?? 0)}</span></td><td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{String(skill.not_tested_count ?? 0)}</span></td><td className="p-3">{String(skill.coverage_pct ?? 0)}%</td><td className="p-3">{String(skill.gap_pct ?? 0)}%</td><td className="p-3"><span className={`rounded-full px-2 py-1 ${skill.risk === "high" ? "bg-rose-100 text-rose-800" : skill.risk === "medium" ? "bg-amber-100 text-amber-800" : skill.risk === "low" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{displayName(String(skill.risk_label || skill.risk || "Not assessed"))}</span></td></tr>)}{!rows.length&&<tr><td className="p-5 text-slate-500" colSpan={9}>No skills match these filters.</td></tr>}</tbody></table></div>
    {historical.length>0&&<section className={panel}><h3 className="font-bold">Historical unmatched skills</h3><p className="mt-1 text-sm text-slate-500">These appeared in an older JD version and are excluded from current risk ranking.</p><div className="mt-3 flex flex-wrap gap-2">{historical.map((item,index)=><span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm" key={String(item.skill||index)}>{String(item.skill)}</span>)}</div></section>}
    {selected&&<div className="fixed inset-0 z-50 bg-slate-950/40" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><aside className="ml-auto h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-950"><div className="flex justify-between"><h3 className="text-xl font-bold">{String(selected.skill)}</h3><button className={btn} onClick={()=>setSelected(null)}>Close</button></div><dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-slate-500">Priority</dt><dd>{displayName(String(selected.priority||"unknown"))}</dd></div><div><dt className="text-slate-500">Risk</dt><dd>{displayName(String(selected.risk_label||selected.risk||"Not assessed"))}</dd></div><div><dt className="text-slate-500">Coverage</dt><dd>{String(selected.coverage_pct||0)}%</dd></div><div><dt className="text-slate-500">Evidence gap</dt><dd>{String(selected.gap_pct||0)}%</dd></div></dl><p className="mt-6 text-sm text-slate-500">Candidate-level question and answer evidence is available in Interview Results reports.</p></aside></div>}
  </div>;
}
function DepartmentView({ data }: { data: Data }) {
  const departments = (data.departments || []) as Data[];
  const leader = data.recommended_department as Data | undefined;
  const statusFor = (item: Data) => {
    const sample = Number(item.student_count || 0);
    if (sample < 3) return { label: "Insufficient sample", tone: "bg-slate-100 text-slate-700" };
    if (leader?.department_code === item.department_code) return { label: "Leading cohort", tone: "bg-emerald-100 text-emerald-800" };
    if (Number(item.interview_ready_rate || 0) >= 50) return { label: "Sufficient sample", tone: "bg-blue-100 text-blue-800" };
    return { label: "Needs attention", tone: "bg-amber-100 text-amber-800" };
  };
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Departments assessed" value={departments.length} />
        <Metric
          label="Candidates represented"
          value={departments.reduce(
            (sum, item) => sum + Number(item.student_count || 0),
            0,
          )}
        />
        <Metric
          label="Leading cohort"
          value={
            leader ? String(leader.department_code) : "Insufficient sample"
          }
          note="At least 3 released and scored candidates required"
        />
      </div>
      <article className={`${panel} overflow-x-auto`}>
        <h3 className="mb-5 font-bold">Department comparison</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-3">Department</th>
              <th className="p-3">Sample</th>
              <th className="p-3">Average score</th>
              <th className="p-3">Interview ready</th>
              <th className="p-3">Ready %</th>
              <th className="p-3">Needs training</th>
              <th className="p-3">Comparison status</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((item, index) => {
              const count = Number(item.student_count || 0), status = statusFor(item);
              return (
                <tr
                  className="border-t"
                  key={String(item.department_code || index)}
                >
                  <td className="p-3 font-semibold">
                    {String(item.department_code)}
                  </td>
                  <td className="p-3">{count}</td>
                  <td className="p-3">
                    {item.avg_score == null ? "—" : String(item.avg_score)}
                  </td>
                  <td className="p-3">
                    {String(item.interview_ready_count || 0)}
                  </td>
                  <td className="p-3">
                    {item.interview_ready_rate == null ? "—" : `${item.interview_ready_rate}%`}
                  </td>
                  <td className="p-3">{String(item.need_training_count || 0)}</td>
                  <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!departments.length && (
          <p className="p-3 text-slate-500">
            Department analytics will appear after released, scored interviews.
          </p>
        )}
        <p className="p-3 text-sm text-slate-500">Only released and scored interviews are included. At least 3 candidates are required for a reliable department comparison.</p>
      </article>
    </div>
  );
}
function DriveSettings({
  drive,
  save,
  busy,
  initialSection,
}: {
  drive: Drive;
  save: (body: Data) => Promise<void>;
  busy: boolean;
  initialSection?: string;
}) {
  const local = (value?: string) =>
    value
      ? new Date(
          new Date(value).getTime() -
            new Date(value).getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16)
      : "";
  const [editing, setEditing] = useState<string | null>(
      initialSection === "company" ? "Drive and company" : null,
    ),
    [library, setLibrary] = useState<AgentLibrary | null>(null),
    [selection, setSelection] = useState<Selection[]>(
      drive.agent_selection || [],
    ),
    [rounds, setRounds] = useState<RoundConfiguration[]>(
      drive.round_configuration || [],
    ),
    [warning, setWarning] = useState(""),
    [generating, setGenerating] = useState("");
  const [catalogPrograms, setCatalogPrograms] = useState<Program[]>([]);
  const [form, setForm] = useState<Data>({
    drive_type: drive.drive_type || "official_placement",
    company_name: drive.company_name,
    company_description: drive.company_description || "",
    company_website: drive.company_website || "",
    company_linkedin: drive.company_linkedin || "",
    role_title: drive.role_title,
    job_type: drive.job_type || "full_time",
    location: drive.location || "",
    package_min_lpa: drive.package_min_lpa ?? "",
    package_max_lpa: drive.package_max_lpa ?? "",
    jd_text: drive.jd_raw_text || "",
    interview_duration_minutes: drive.interview_duration_minutes || 30,
    difficulty_tier: drive.difficulty_tier || "intermediate",
    max_attempts: drive.max_attempts || 1,
    window_start: local(drive.window_start_at),
    window_end: local(drive.window_end_at),
    min_cgpa: drive.criteria_min_cgpa ?? "",
    eligible_programs: (drive.criteria_programs || []).join(", "),
    eligible_departments: (drive.criteria_department_codes || []).join(", "),
    eligible_graduation_years: (drive.criteria_graduation_years || []).join(
      ", ",
    ),
  });
  useEffect(() => {
    collegeApi
      .get<{ programs: Program[] }>("academic-catalog")
      .then((value) => setCatalogPrograms(value.programs || []))
      .catch(() => setCatalogPrograms([]));
    collegeApi
      .get<AgentLibrary>("agents")
      .then(setLibrary)
      .catch(() => setLibrary(null));
  }, []);
  const selectedPrograms = String(form.eligible_programs || "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  const departments = catalogPrograms
    .filter((program) => selectedPrograms.includes(program.code))
    .flatMap((program) => program.departments)
    .filter((department, index, all) => all.findIndex((item) => item.code === department.code) === index);
  const updateEligibilityCodes = (key: "eligible_programs" | "eligible_departments", values: string[]) =>
    setForm((value) => ({ ...value, [key]: values.join(", ") }));
  const sections = [
    [
      "Drive and company",
      [
        ["Company", drive.company_name],
        ["Role", drive.role_title],
        ["Drive type", displayName(drive.drive_type || "official_placement")],
        ["Location", drive.location || "Not set"],
      ],
    ],
    [
      "Interview configuration",
      [
        [
          "Window starts",
          drive.window_start_at
            ? new Date(drive.window_start_at).toLocaleString()
            : "Not scheduled",
        ],
        [
          "Window ends",
          drive.window_end_at
            ? new Date(drive.window_end_at).toLocaleString()
            : "Not scheduled",
        ],
        ["Duration", `${drive.interview_duration_minutes || 30} minutes`],
        ["Attempts", drive.max_attempts || 1],
        ["Difficulty", displayName(drive.difficulty_tier || "intermediate")],
      ],
    ],
    [
      "Eligibility",
      [
        ["Minimum CGPA", drive.criteria_min_cgpa ?? "Not restricted"],
        ["Programs", drive.criteria_programs?.join(", ") || "All programs"],
        [
          "Departments",
          drive.criteria_department_codes?.join(", ") || "All departments",
        ],
        [
          "Graduation years",
          drive.criteria_graduation_years?.join(", ") || "All years",
        ],
      ],
    ],
    [
      "Interview Agents & Rounds",
      [
        ["Interview rounds", drive.agent_selection?.length || 0],
        [
          "Order",
          drive.agent_selection
            ?.map((item) => selectionName(item, library))
            .join(" → ") || "Not configured",
        ],
      ],
    ],
    [
      "Questions",
      [
        [
          "Question configuration",
          drive.round_configuration?.length
            ? drive.round_configuration
                .map(
                  (round) =>
                    `${displayName(round.track)}: ${displayName(round.question_source)}`,
                )
                .join(" · ")
            : displayName(drive.question_source || "personalized"),
        ],
      ],
    ],
  ] as const;
  const locked = drive.status === "cancelled";
  const input = (key: string, label: string, type = "text") => (
    <label className="block text-sm">
      {label}
      <input
        className={field}
        type={type}
        value={String(form[key] ?? "")}
        onChange={(e) => setForm((v) => ({ ...v, [key]: e.target.value }))}
      />
    </label>
  );
  async function submit(title: string) {
    setWarning("");
    let body: Data = {};
    if (title === "Drive and company") {
      if (
        form.package_min_lpa !== "" &&
        form.package_max_lpa !== "" &&
        Number(form.package_max_lpa) < Number(form.package_min_lpa)
      ) {
        setWarning("Package maximum must be at least the minimum.");
        return;
      }
      body = {
        drive_type: form.drive_type,
        company_name: form.company_name,
        company_description: form.company_description,
        company_website: form.company_website,
        company_linkedin: form.company_linkedin,
        role_title: form.role_title,
        job_type: form.job_type,
        location: form.location,
        package_min_lpa:
          form.package_min_lpa === "" ? null : Number(form.package_min_lpa),
        package_max_lpa:
          form.package_max_lpa === "" ? null : Number(form.package_max_lpa),
        jd_text: form.jd_text,
      };
    } else if (title === "Interview configuration") {
      if (
        new Date(String(form.window_end)) <= new Date(String(form.window_start))
      ) {
        setWarning("Interview end must be later than interview start.");
        return;
      }
      body = {
        interview_duration_minutes: Number(form.interview_duration_minutes),
        max_attempts: Number(form.max_attempts),
        difficulty_tier: form.difficulty_tier,
        window_start: new Date(String(form.window_start)).toISOString(),
        window_end: new Date(String(form.window_end)).toISOString(),
      };
    } else if (title === "Eligibility")
      body = {
        min_cgpa: form.min_cgpa === "" ? 0 : Number(form.min_cgpa),
        eligible_programs: String(form.eligible_programs || "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        eligible_departments: String(form.eligible_departments || "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        eligible_graduation_years: String(form.eligible_graduation_years || "")
          .split(",")
          .map((v) => Number(v.trim()))
          .filter(Boolean),
      };
    else if (title === "Interview Agents & Rounds")
      body = {
        agent_selection: selection.map(({ track, agent_id }) => ({
          track,
          agent_id,
        })),
        round_configuration: rounds,
      };
    else if (title === "Questions")
      body = {
        agent_selection: selection.map(({ track, agent_id }) => ({
          track,
          agent_id,
        })),
        round_configuration: rounds,
      };
    await save(body);
    setEditing(null);
  }
  function addAgent(value: string) {
    const customId = value.startsWith("custom:") ? value.slice(7) : "";
    const defaultTrack = value.startsWith("default:") ? value.slice(8) : "";
    const custom = customId
      ? library?.agents.find((agent) => agent.id === customId)
      : undefined;
    const track = custom?.track || defaultTrack || value;
    if (!track || selection.length > 4) return;
    const existingIndex = selection.findIndex((item) => item.track === track);
    if (existingIndex >= 0) {
      // A default profile for this track may already be in the drive. A
      // custom profile selected from the editor replaces that default in the
      // same round instead of being silently ignored.
      if (!custom || selection[existingIndex].agent_id) return;
      setSelection(current => current.map((item, index) =>
        index === existingIndex ? { ...item, agent_id: custom.id! } : item,
      ));
      return;
    }
    setSelection(current => [...current, { track, agent_id: custom?.id || null }]);
    setRounds((current) => [...current, { track, question_source: "personalized", questions: [] }]);
  }
  async function generateQuestions(track: string) {
    setGenerating(track);
    setWarning("");
    try {
      const result = await collegeApi.save<{
        scripted_questions: Record<string, string[]>;
      }>("drive-questions/preview", {
        role_title: String(form.role_title || ""),
        jd_text: String(form.jd_text || ""),
        interview_duration_minutes: Number(form.interview_duration_minutes),
        agent_selection: selection.map(({ track, agent_id }) => ({
          track,
          agent_id,
        })),
      });
      setRounds((current) =>
        current.map((round) =>
          round.track === track
            ? {
                ...round,
                question_source: "ai_generated",
                questions: result.scripted_questions[track] || [],
              }
            : round,
        ),
      );
    } catch (error) {
      setWarning(collegeError(error));
    } finally {
      setGenerating("");
    }
  }
  const editor = (title: string) =>
    title === "Drive and company" ? (
      <>
        {input("company_name", "Company")}
        {input("role_title", "Role")}
        <label className="block text-sm">
          Drive type
          <select
            className={field}
            value={String(form.drive_type)}
            onChange={(e) =>
              setForm((v) => ({ ...v, drive_type: e.target.value }))
            }
          >
            <option value="official_placement">Official Placement</option>
            <option value="college_practice">College Practice</option>
          </select>
        </label>
        <label className="block text-sm">
          Job type
          <select
            className={field}
            value={String(form.job_type)}
            onChange={(e) =>
              setForm((v) => ({ ...v, job_type: e.target.value }))
            }
          >
            <option value="full_time">Full Time</option>
            <option value="internship">Internship</option>
            <option value="internship_plus_ppo">Internship + PPO</option>
          </select>
        </label>
        {input("location", "Location")}
        {input("package_min_lpa", "Minimum package (LPA)", "number")}
        {input("package_max_lpa", "Maximum package (LPA)", "number")}
        {input("company_website", "Company website", "url")}
        {input("company_linkedin", "LinkedIn", "url")}
        <label className="block text-sm sm:col-span-2">
          Company details
          <textarea
            className={field}
            rows={3}
            value={String(form.company_description || "")}
            onChange={(e) =>
              setForm((v) => ({ ...v, company_description: e.target.value }))
            }
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          Job description
          <textarea
            className={field}
            rows={8}
            value={String(form.jd_text || "")}
            onChange={(e) =>
              setForm((v) => ({ ...v, jd_text: e.target.value }))
            }
          />
        </label>
      </>
    ) : title === "Interview configuration" ? (
      <>
        {input("window_start", "Interview start", "datetime-local")}
        {input("window_end", "Interview end", "datetime-local")}
        <label className="block text-sm">
          Duration
          <select
            className={field}
            value={String(form.interview_duration_minutes)}
            onChange={(e) =>
              setForm((v) => ({
                ...v,
                interview_duration_minutes: e.target.value,
              }))
            }
          >
            {[15, 30, 45].map((value) => (
              <option key={value} value={value}>
                {value} minutes
              </option>
            ))}
          </select>
        </label>
        {input("max_attempts", "Attempts per student", "number")}
        <label className="block text-sm">
          Difficulty
          <select
            className={field}
            value={String(form.difficulty_tier)}
            disabled={drive.status !== "draft"}
            onChange={(e) =>
              setForm((value) => ({
                ...value,
                difficulty_tier: e.target.value,
              }))
            }
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          {drive.status !== "draft" && (
            <span className="mt-1 block text-xs text-slate-500">
              Locked after the drive is finalized.
            </span>
          )}
        </label>
      </>
    ) : title === "Eligibility" ? (
      <>
      {input("min_cgpa", "Minimum CGPA", "number")}
        <label className="block text-sm">
          Programs
          <select className={`${field} mt-1 min-h-24`} multiple value={selectedPrograms} onChange={(event) => updateEligibilityCodes("eligible_programs", Array.from(event.target.selectedOptions, (option) => option.value))}>
            {catalogPrograms.map((program) => <option key={program.code} value={program.code}>{displayName(program.display_name)} ({program.code})</option>)}
          </select>
          <span className="mt-1 block text-xs text-slate-500">Hold Ctrl/Cmd to select multiple.</span>
        </label>
        <label className="block text-sm">
          Departments
          <select className={`${field} mt-1 min-h-24`} multiple value={String(form.eligible_departments || "").split(",").map((value) => value.trim()).filter(Boolean)} onChange={(event) => updateEligibilityCodes("eligible_departments", Array.from(event.target.selectedOptions, (option) => option.value))}>
            {departments.map((department) => <option key={department.code} value={department.code}>{displayName(department.display_name)} ({department.code})</option>)}
          </select>
          {!selectedPrograms.length && <span className="mt-1 block text-xs text-slate-500">Select a program first.</span>}
        </label>
        {input(
          "eligible_graduation_years",
          "Graduation years, comma separated",
        )}
      </>
    ) : title === "Interview Agents & Rounds" ? (
      <div className="space-y-3 sm:col-span-2">
        {selection.map((item, index) => (
          <div
            className="flex items-center gap-2 rounded-xl border p-3"
            key={item.track}
          >
            <strong className="flex-1">
              {index + 1}. {selectionName(item, library)}
            </strong>
            <button
              type="button"
              className={btn}
              disabled={!index}
              onClick={() => {
                const next = [...selection];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                setSelection(next);
              }}
            >
              ↑
            </button>
            <button
              type="button"
              className={btn}
              disabled={index === selection.length - 1}
              onClick={() => {
                const next = [...selection];
                [next[index + 1], next[index]] = [next[index], next[index + 1]];
                setSelection(next);
              }}
            >
              ↓
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                setSelection(selection.filter((_, i) => i !== index));
                setRounds(rounds.filter((round) => round.track !== item.track));
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <label className="block text-sm">
          Add agent
          <select
            className={field}
            value=""
            disabled={!library || selection.length >= 4}
            onChange={(e) => addAgent(e.target.value)}
          >
            <option value="">Select agent</option>
            {library &&
              [
                ...library.tracks.map((item) => ({
                  ...item.default_profile,
                  id: "",
                })),
                ...library.agents,
              ]
                .filter(
                  (agent) =>
                    !selection.some((item) =>
                      agent.id
                        ? item.agent_id === agent.id
                        : !item.agent_id && item.track === agent.track,
                    ),
                )
                .map((agent) => {
                  const custom = Boolean(agent.id);
                  const optionValue = custom
                    ? `custom:${agent.id}`
                    : `default:${agent.track}`;
                  return (
                  <option
                    key={optionValue}
                    value={optionValue}
                  >
                    {agent.name} — {agent.role}{custom ? " (custom)" : ""}
                  </option>
                  );
                })}
          </select>
        </label>
      </div>
    ) : (
      <div className="space-y-4 sm:col-span-2">
        {rounds.map((round, index) => (
          <section className="rounded-xl border p-4" key={round.track}>
            <strong>
              Round {index + 1}: {selectionName(selection[index], library)}
            </strong>
            <select
              className={field}
              value={round.question_source}
              onChange={(e) =>
                setRounds((current) =>
                  current.map((item) =>
                    item.track === round.track
                      ? {
                          ...item,
                          question_source: e.target
                            .value as RoundConfiguration["question_source"],
                          questions:
                            e.target.value === "personalized"
                              ? []
                              : item.questions,
                        }
                      : item,
                  ),
                )
              }
            >
              <option value="personalized">Personalized AI Questions</option>
              <option value="manual">Manual Questions</option>
              <option value="ai_generated">AI Generated Before Creation</option>
            </select>
            {round.question_source !== "personalized" && (
              <div className="mt-3 space-y-2">
                {round.question_source === "ai_generated" && (
                  <button
                    type="button"
                    className={btn}
                    disabled={
                      generating === round.track ||
                      !String(form.jd_text || "").trim()
                    }
                    onClick={() => void generateQuestions(round.track)}
                  >
                    {generating === round.track
                      ? "Generating…"
                      : "Generate questions for this round"}
                  </button>
                )}
                {round.questions.map((question, qIndex) => (
                  <div className="flex gap-2" key={qIndex}>
                    <textarea
                      className={field}
                      value={question}
                      onChange={(e) =>
                        setRounds((current) =>
                          current.map((item) =>
                            item.track === round.track
                              ? {
                                  ...item,
                                  questions: item.questions.map((q, i) =>
                                    i === qIndex ? e.target.value : q,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      className={btn}
                      onClick={() =>
                        setRounds((current) =>
                          current.map((item) =>
                            item.track === round.track
                              ? {
                                  ...item,
                                  questions: item.questions.filter(
                                    (_, i) => i !== qIndex,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={btn}
                  onClick={() =>
                    setRounds((current) =>
                      current.map((item) =>
                        item.track === round.track
                          ? { ...item, questions: [...item.questions, ""] }
                          : item,
                      ),
                    )
                  }
                >
                  Add question
                </button>
              </div>
            )}
          </section>
        ))}
      </div>
    );
  return (
    <div className="space-y-4">
      {warning && (
        <p role="alert" className="rounded-xl bg-amber-50 p-3 text-amber-800">
          {warning}
        </p>
      )}
      {sections.map(([title, rows]) => {
        const historical =
          ["Interview Agents & Rounds", "Questions"].includes(title) &&
          drive.status !== "draft";
        return (
          <article className={panel} key={title}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold">{title}</h3>
                {historical && (
                  <p className="mt-1 text-xs text-slate-500">
                    Changes apply to interviews that have not started. Completed
                    interview evidence remains unchanged.
                  </p>
                )}
              </div>
              <button
                className={btn}
                disabled={locked}
                onClick={() => setEditing(editing === title ? null : title)}
              >
                {editing === title ? "Cancel" : "Edit section"}
              </button>
            </div>
            {editing === title ? (
              <form
                className="mt-4 grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit(title);
                }}
              >
                {editor(title)}
                <p className="sm:col-span-2 text-xs text-amber-700">
                  Changes to role, JD, duration, rounds or eligibility affect
                  future preparation. Existing completed evidence remains
                  historical.
                </p>
                <button
                  className={`${btn} sm:col-span-2`}
                  disabled={
                    busy ||
                    ((title === "Interview Agents & Rounds" ||
                      title === "Questions") &&
                      (selection.length < 1 || selection.length > 4))
                  }
                >
                  Save this section
                </button>
              </form>
            ) : (
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {rows.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </article>
        );
      })}
    </div>
  );
}
function LifecycleActions({
  drive,
  busy,
  onRequest,
}: {
  drive: Drive;
  busy: boolean;
  onRequest: (status: "closed" | "cancelled") => void;
}) {
  const target =
    drive.status === "active" || drive.status === "scheduled"
      ? "closed"
      : drive.status === "draft"
        ? "cancelled"
        : null;
  if (!target) return null;
  const label = target === "closed" ? "Close drive" : "Cancel drive";
  return (
    <button className={btn} disabled={busy} onClick={() => onRequest(target)}>
      {label}
    </button>
  );
}
export default function DriveManagement({
  driveId,
  back,
}: {
  driveId: string;
  back: () => void;
}) {
  const [params, setParams] = useSearchParams();
  const reportStudentId = params.get("candidate");
  const tab = (
    (params.get("section") || "") in sections
      ? params.get("section")
      : "overview"
  ) as Tab;
  const [drive, setDrive] = useState<Drive | null>(null),
    [data, setData] = useState<Data | null>(null),
    [detail, setDetail] = useState<unknown>(null);
  const [selected, setSelected] = useState<Candidate | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0),
    [offset, setOffset] = useState(0),
    [search, setSearch] = useState("");
  const [checked, setChecked] = useState<string[]>([]),
    [attempts, setAttempts] = useState(2);
  const [schedule, setSchedule] = useState("");
  const [resultSort, setResultSort] = useState("rank");
  const [resultKpis, setResultKpis] = useState({ candidates: 0, completed: 0, incomplete: 0, needsReview: 0, decisionPending: 0, readyToRelease: 0 });
  const [lifecycleRequest, setLifecycleRequest] = useState<
    "closed" | "cancelled" | "removed" | null
  >(null);
  const [departmentFilter, setDepartmentFilter] = useState(""),
    [statusFilter, setStatusFilter] = useState(""),
    [completionFilter, setCompletionFilter] = useState(""),
    [atsEligibility, setAtsEligibility] = useState(""),
    [atsMinimum, setAtsMinimum] = useState(""),
    [coverageMinimum, setCoverageMinimum] = useState("");
  const [resultView, setResultView] = useState("all"),
    [resultRules, setResultRules] = useState<ResultRule[]>([]),
    [resultMatchMode, setResultMatchMode] = useState<"all"|"any">("all"),
    [excludeReviewRequired, setExcludeReviewRequired] = useState(false),
    [bulkDecision, setBulkDecision] = useState<"shortlist"|"hold"|"reject"|null>(null);
  const [resultFilterOptions,setResultFilterOptions]=useState<ResultFilterOptions>({departmentPrograms:[],interviewRounds:[]});
  useEffect(() => {
    if (tab !== "results") return;
    const controller = new AbortController();
    const count = async (query: string) => Number(((await collegeApi.get<Data>(`drives/${driveId}/dashboard/ranking?limit=1&offset=0&${query}`, controller.signal)).pagination as Data)?.total || 0);
    Promise.all([
      count("result_view=all"), collegeApi.get<Data>(`drives/${driveId}/dashboard/overview?limit=1&offset=0&q=`, controller.signal), count("result_view=incomplete"), count("result_view=needs_review"), count("result_view=decision_pending"),
      count(`result_view=all&filters=${encodeURIComponent(JSON.stringify([{field:"student_result",operator:"equals",value:"hidden"},{field:"officer_decision",operator:"not_equals",value:"undecided"}]))}&match_mode=all`),
    ]).then(([candidates, overview, incomplete, needsReview, decisionPending, readyToRelease]) => setResultKpis({ candidates: Number(candidates), completed: Number(((overview as Data).interview_progress as Data)?.completed || 0), incomplete: Number(incomplete), needsReview: Number(needsReview), decisionPending: Number(decisionPending), readyToRelease: Number(readyToRelease) })).catch(() => {});
    return () => controller.abort();
  }, [tab, driveId, version]);
  useEffect(()=>{
    if(tab!=="results")return;
    const controller=new AbortController();
    Promise.all([collegeApi.get<{programs:Program[]}>("academic-catalog",controller.signal),collegeApi.get<AgentLibrary>("agents",controller.signal)]).then(([catalog,agentLibrary])=>{
      const departmentPrograms:[string,string][]=[];
      const allowedPrograms=new Set(drive?.criteria_programs||[]);
      const allowedDepartments=new Set(drive?.criteria_department_codes||[]);
      catalog.programs.forEach(program=>{
        if(!allowedPrograms.size||allowedPrograms.has(program.code))departmentPrograms.push([`program:${program.code}`,`${displayName(program.display_name)} (${program.code})`]);
        program.departments.forEach(department=>{if(!allowedDepartments.size||allowedDepartments.has(department.code))departmentPrograms.push([`department:${department.code}`,`${displayName(department.display_name)} (${department.code})`])});
      });
      const interviewRounds=(drive?.agent_selection||[]).map((item,index)=>[item.track,`Round ${index+1} — ${selectionName(item,agentLibrary)}`] as [string,string]);
      setResultFilterOptions({departmentPrograms,interviewRounds});
    }).catch(()=>{});
    return()=>controller.abort();
  },[tab,drive]);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setData(null);
    setError("");
    const query = new URLSearchParams({
      limit: "25",
      offset: String(offset),
      q: search,
    });
    if (tab === "candidates" || tab === "results") {
      if (departmentFilter) query.set("department", departmentFilter);
      if (statusFilter && ["released", "held_for_review", "incomplete"].includes(statusFilter)) {
        query.set("evaluation_status", statusFilter);
      }
    }
    if (tab === "ats") {
      if (atsEligibility === "eligible") query.set("eligible_only", "true");
      if (atsMinimum) query.set("min_ats_fit", atsMinimum);
      if (coverageMinimum) query.set("min_mandatory_coverage_pct", coverageMinimum);
    }
    if (tab === "results") {
      query.set("result_view", resultView);
      const rules=resultRules.filter(rule=>(rule.operator==='is_any_of'&&rule.values?.length)||rule.value!==''&&(rule.operator!=='between'||Boolean(rule.valueEnd)));
      if(rules.length) query.set("filters",JSON.stringify(rules.map(({field,operator,value,valueEnd,values})=>({field,operator,value,value_end:valueEnd,values}))));
      query.set("match_mode",resultMatchMode);
      if(excludeReviewRequired) query.set("exclude_review_required","true");
    }
    Promise.all([
      collegeApi.get<Drive>(`drives/${driveId}`, c.signal),
      collegeApi.get<Data>(
        `drives/${driveId}/${paths[tab]}?${query.toString()}`,
        c.signal,
      ),
    ])
      .then(([d, result]) => {
        if (!c.signal.aborted) {
          setDrive(d);
          setData(result);
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(collegeError(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [
    driveId,
    tab,
    offset,
    search,
    version,
    resultView,
    resultRules,
    resultMatchMode,
    excludeReviewRequired,
    departmentFilter,
    statusFilter,
    atsEligibility,
    atsMinimum,
    coverageMinimum,
  ]);
  async function act(path: string, body: unknown = {}, put = true) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const outcome = await collegeApi.save<Data>(
        `drives/${driveId}/${path}`,
        body,
        put,
      );
      setNotice(
        Array.isArray(outcome.skipped) && outcome.skipped.length
          ? `Request processed; ${outcome.skipped.length} candidates were skipped. Open their details to review eligibility or result status.`
          : "Changes saved.",
      );
      setVersion((v) => v + 1);
    } catch (e) {
      setError(collegeError(e));
    } finally {
      setBusy(false);
    }
  }
  async function changeLifecycle(status: "closed" | "cancelled") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await collegeApi.save(`drives/${driveId}`, { status }, true);
      setNotice(`Drive ${status}.`);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(collegeError(e));
    } finally {
      setBusy(false);
    }
  }
  async function removeDrive() {
    setBusy(true);
    setError("");
    try {
      await collegeApi.remove(`drives/${driveId}`);
      back();
    } catch (e) {
      setError(collegeError(e));
    } finally {
      setBusy(false);
    }
  }
  async function inspect(
    candidate: Candidate,
    kind: "reports" | "attempts" | "decision",
  ) {
    if (kind === "reports") {
      setParams((current) => {
        current.set("candidate", candidate.student_id);
        current.set("section", "results");
        return current;
      });
      return;
    }
    setSelected(candidate);
    if (kind === "attempts") {
      setAttempts(Math.max(2, Number(candidate.attempt_number || 1) + 1));
    }
    setDetail(null);
    setBusy(true);
    setError("");
    try {
      const result = await collegeApi.get<Data>(
        `drives/${driveId}/candidates/${candidate.student_id}/${kind}`,
      );
      setDetail(result);
    } catch (e) {
      setError(collegeError(e));
    } finally {
      setBusy(false);
    }
  }
  const rawCandidates = (data?.candidates || []) as Candidate[];
  const filteredCandidates = rawCandidates.filter(
    (c) =>
      (!departmentFilter || c.department_code === departmentFilter) &&
      (!statusFilter ||
        String(c.assignment_status || c.evaluation_status || "pending") ===
          statusFilter) &&
      (!completionFilter ||
        (completionFilter === "completed"
          ? c.evaluation_status === "released"
          : c.evaluation_status !== "released")) &&
      (!atsEligibility ||
        (atsEligibility === "eligible") === Boolean(c.eligible)) &&
      (!atsMinimum || Number(c.ats_fit_score || 0) >= Number(atsMinimum)) &&
      (!coverageMinimum ||
        (() => {
          const [a, b] = String(c.mandatory_coverage || "0/0")
            .split("/")
            .map(Number);
          return b > 0 && (a / b) * 100 >= Number(coverageMinimum);
        })()),
  );
  const candidates = tab === "results" ? [...filteredCandidates].sort((a, b) => {
    if (resultSort === "score_desc") return Number(b.overall_score ?? -1) - Number(a.overall_score ?? -1);
    if (resultSort === "pri_desc") return Number(b.ranking_score ?? -1) - Number(a.ranking_score ?? -1);
    if (resultSort === "name") return a.full_name.localeCompare(b.full_name);
    return Number(a.rank ?? Number.MAX_SAFE_INTEGER) - Number(b.rank ?? Number.MAX_SAFE_INTEGER);
  }) : filteredCandidates;
  const total = Number(
    data?.total_count ??
      (data?.pagination as Data)?.total ??
      offset + candidates.length,
  );
  if (reportStudentId)
    return (
      <CandidateReport
        driveId={driveId}
        studentId={reportStudentId}
        onBack={() =>
          setParams((p) => {
            p.delete("candidate");
            p.set("section", "results");
            return p;
          })
        }
      />
    );
  return (
    <section className={`space-y-5 drive-tab-${tab}`}>
      <div className="flex flex-wrap gap-3">
        <button className={btn} onClick={back}>
          ← Placement drives
        </button>
        {drive && (
          <button
            className={btn}
            disabled={busy || loading}
            onClick={() =>
              setParams((p) => {
                p.set("section", "settings");
                p.set("edit", "company");
                return p;
              })
            }
          >
            Edit drive
          </button>
        )}
        <button
          className={btn}
          disabled={busy || loading}
          onClick={() => setVersion((v) => v + 1)}
        >
          Refresh
        </button>
        {drive && (
          <LifecycleActions
            drive={drive}
            busy={busy || loading}
            onRequest={setLifecycleRequest}
          />
        )}
        {drive && ["draft", "closed", "cancelled"].includes(drive.status) && (
          <button
            className={`${btn} border-rose-200 text-rose-700 hover:bg-rose-50`}
            disabled={busy || loading}
            onClick={() => setLifecycleRequest("removed")}
          >
            Delete drive
          </button>
        )}
      </div>
      <header>
        <p className="text-sm text-indigo-600">{drive?.company_name}</p>
        <h2 className="mt-1 text-2xl font-bold">
          {drive?.role_title || "Drive management"}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {drive?.status} · {drive?.interview_duration_minutes} minutes ·{" "}
          {drive?.agent_selection?.length ?? 0} rounds
        </p>
      </header>
      <nav
        className="flex flex-wrap gap-2"
        aria-label="Drive management sections"
      >
        {Object.entries(sections).map(([key, label]) => (
          <button
            key={key}
            className={`${btn} ${tab === key ? "bg-indigo-600 text-white" : ""}`}
            aria-pressed={tab === key}
            onClick={() => {
              setOffset(0);
              setChecked([]);
              setSelected(null);
              setDetail(null);
              setParams((p) => {
                p.set("section", key);
                return p;
              });
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="text-rose-600">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-indigo-600">
          {notice}
        </p>
      )}
      {loading && <p role="status">Loading drive details…</p>}
      {tab === "overview" &&
        data &&
        (() => {
          const metrics = (data.metrics || {}) as Data,
            distribution = (metrics.readiness_distribution || {}) as Data,
            progress = (metrics.interview_progress || {}) as Data,
            assigned = Number(metrics.total_assigned || 0),
            completed = Number(metrics.interview_completed || 0),
            live = Number(progress.in_progress || 0),
            needsAttention = Number(progress.needs_review || 0),
            evaluated = Object.values(distribution).reduce<number>(
              (sum, value) => sum + Number(value || 0),
              0,
            );
          return (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <Metric label="Assigned Candidates" value={assigned} />
                <Metric label="Interviews Completed" value={completed} />
                <Metric
                  label="Completion Rate"
                  value={`${Number(metrics.completion_rate ?? (assigned ? (completed / assigned) * 100 : 0)).toFixed(1)}%`}
                  note={`${completed} of ${assigned} assigned`}
                />
                <Metric
                  label="Average Interview Score"
                  value={
                    metrics.average_interview_score == null
                      ? "—"
                      : `${Number(metrics.average_interview_score)}/100`
                  }
                  note="Released, scored evaluations"
                />
                <Metric
                  label="● Live interviews"
                  value={live}
                  note="Candidates currently in an interview"
                />
                <Metric
                  label="Needs attention"
                  value={needsAttention}
                  note="Evaluations held for review"
                />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <article className={panel}>
                  <h3 className="font-bold">Interview window</h3>
                  <p className="mt-1 text-sm text-slate-500">When candidates can attend this drive.</p>
                  {(() => {
                    const start = drive?.window_start_at ? new Date(drive.window_start_at).getTime() : NaN;
                    const end = drive?.window_end_at ? new Date(drive.window_end_at).getTime() : NaN;
                    const now = Date.now();
                    const state = Number.isFinite(start) && now < start ? "Opens soon" : Number.isFinite(end) && now < end ? "Open now" : Number.isFinite(end) ? "Closed" : "Not scheduled";
                    const tone = state === "Open now" ? "text-emerald-700 bg-emerald-50" : state === "Closed" ? "text-slate-600 bg-slate-100" : "text-indigo-700 bg-indigo-50";
                    return <div className="mt-5 flex flex-wrap items-center gap-4"><span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone}`}>{state}</span><dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm"><div><dt className="text-xs text-slate-500">Starts</dt><dd>{start ? new Date(start).toLocaleString() : "—"}</dd></div><div><dt className="text-xs text-slate-500">Ends</dt><dd>{end ? new Date(end).toLocaleString() : "—"}</dd></div></dl></div>;
                  })()}
                </article>
                <article className={panel}>
                  <h3 className="font-bold">Candidate funnel</h3>
                  <p className="mt-1 text-sm text-slate-500">Movement from assignment to completed interview.</p>
                  <div className="mt-5 grid grid-cols-4 gap-2 text-center text-sm"><div><strong className="block text-2xl">{assigned}</strong><span className="text-xs text-slate-500">Assigned</span></div><div><strong className="block text-2xl">{Number(progress.in_progress || 0)}</strong><span className="text-xs text-slate-500">Started</span></div><div><strong className="block text-2xl">{completed}</strong><span className="text-xs text-slate-500">Completed</span></div><div><strong className="block text-2xl">{needsAttention}</strong><span className="text-xs text-slate-500">Review</span></div></div>
                </article>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <article className={panel}>
                  <h3 className="font-bold">Interview Progress</h3>
                  <p className="mb-5 text-sm text-slate-500">
                    Operational state of assigned candidates.
                  </p>
                  <div className="space-y-4">
                    <Bar
                      label="Not Started"
                      value={Number(progress.not_started || 0)}
                      total={assigned}
                    />
                    <Bar
                      label="In Progress"
                      value={Number(progress.in_progress || 0)}
                      total={assigned}
                      tone="bg-indigo-500"
                    />
                    <Bar
                      label="Completed"
                      value={Number(progress.completed || 0)}
                      total={assigned}
                      tone="bg-emerald-500"
                    />
                    <Bar
                      label="Needs Review"
                      value={Number(progress.needs_review || 0)}
                      total={assigned}
                      tone="bg-amber-500"
                    />
                  </div>
                </article>
                <article className={panel}>
                  <h3 className="font-bold">Readiness Distribution</h3>
                  <p className="mb-5 text-sm text-slate-500">
                    Based on {evaluated} completed and evaluated interviews.
                  </p>
                  <div className="space-y-4">
                    <Bar
                      label="Interview Ready"
                      value={Number(distribution.interview_ready || 0)}
                      total={evaluated}
                      tone="bg-emerald-500"
                    />
                    <Bar
                      label="Approaching Ready"
                      value={Number(distribution.approaching_ready || 0)}
                      total={evaluated}
                      tone="bg-indigo-500"
                    />
                    <Bar
                      label="Developing"
                      value={Number(distribution.developing || 0)}
                      total={evaluated}
                      tone="bg-amber-500"
                    />
                    <Bar
                      label="Not Ready"
                      value={Number(distribution.not_ready || 0)}
                      total={evaluated}
                      tone="bg-rose-500"
                    />
                  </div>
                </article>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <article className={panel}>
                  <h3 className="font-bold">Opportunity Summary</h3>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Company / Role</dt>
                      <dd className="font-semibold">
                        {drive?.company_name} · {drive?.role_title}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Drive / Job Type</dt>
                      <dd>
                        {displayName(drive?.drive_type || "official_placement")}{" "}
                        · {displayName(drive?.job_type || "full_time")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Location</dt>
                      <dd>{drive?.location || "Not set"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Package</dt>
                      <dd>
                        {drive?.package_min_lpa ?? "—"}–
                        {drive?.package_max_lpa ?? "—"}{" "}
                        {drive?.package_currency || "INR"} LPA
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">Company Details</dt>
                      <dd className="whitespace-pre-wrap">
                        {drive?.company_description || "Not added yet"}
                      </dd>
                    </div>
                    {drive?.company_website && (
                      <a
                        className="text-indigo-600"
                        href={drive.company_website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Company website
                      </a>
                    )}
                    {drive?.company_linkedin && (
                      <a
                        className="text-indigo-600"
                        href={drive.company_linkedin}
                        target="_blank"
                        rel="noreferrer"
                      >
                        LinkedIn
                      </a>
                    )}
                  </dl>
                </article>
                <article className={panel}>
                  <h3 className="font-bold">Interview Setup Summary</h3>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Interview Window</dt>
                      <dd>
                        {drive?.window_start_at
                          ? new Date(drive.window_start_at).toLocaleString()
                          : "—"}{" "}
                        –{" "}
                        {drive?.window_end_at
                          ? new Date(drive.window_end_at).toLocaleString()
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Rounds / Duration</dt>
                      <dd>
                        {drive?.agent_selection?.length || 0} rounds ·{" "}
                        {drive?.interview_duration_minutes || 30} minutes
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Question Sources</dt>
                      <dd>
                        {drive?.round_configuration
                          ?.map((round) => displayName(round.question_source))
                          .join(", ") || "Personalized AI Questions"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Maximum Attempts</dt>
                      <dd>{drive?.max_attempts || 1}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">
                        Graduation Years / Minimum CGPA
                      </dt>
                      <dd>
                        {drive?.criteria_graduation_years?.join(", ") || "All"}{" "}
                        · {drive?.criteria_min_cgpa ?? "—"}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-5">
                    <h4 className="text-sm font-semibold">Interview rounds</h4>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {(drive?.agent_selection || []).map((round, index) => {
                        const config = drive?.round_configuration?.find(item => item.track === round.track);
                        const role = round.profile?.role || displayName(round.track);
                        const source = config?.question_source || "personalized";
                        return <article key={`${round.track}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                          <div className="flex items-start justify-between gap-3">
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Round {index + 1}</p><h5 className="mt-1 font-semibold">{role}</h5></div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">{displayName(source)}</span>
                          </div>
                          <p className="mt-3 text-xs text-slate-500">{config?.questions?.length ? `${config.questions.length} scripted question${config.questions.length === 1 ? "" : "s"}` : source === "personalized" ? "Resume and JD personalized" : "Questions configured"}</p>
                        </article>;
                      })}
                    </div>
                  </div>
                </article>
              </div>
            </div>
          );
        })()}
      {["candidates", "ats", "results"].includes(tab) && (
        <>
          {tab !== "results" && <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm">
              Search candidates
              <input
                className={field}
                value={search}
                onChange={(e) => {
                  setOffset(0);
                  setSearch(e.target.value);
                }}
                placeholder="Name, email or roll number"
              />
            </label>
            <label className="text-sm">
              Department
              <select
                className={field}
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">All departments</option>
                {[
                  ...new Set(
                    rawCandidates.map((c) => c.department_code).filter(Boolean),
                  ),
                ].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            {tab === "candidates" ? (
              <>
                <label className="text-sm">
                  Operational status
                  <select
                    className={field}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    {[
                      ...new Set(
                        rawCandidates.map((c) =>
                          String(
                            c.assignment_status ||
                              c.evaluation_status ||
                              "pending",
                          ),
                        ),
                      ),
                    ].map((v) => (
                      <option key={v} value={v}>
                        {displayName(v)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Completion
                  <select
                    className={field}
                    value={completionFilter}
                    onChange={(e) => setCompletionFilter(e.target.value)}
                  >
                    <option value="">All candidates</option>
                    <option value="completed">Completed</option>
                    <option value="incomplete">Not completed</option>
                  </select>
                </label>
              </>
            ) : tab === "ats" ? (
              <>
                <label className="text-sm">
                  Eligibility
                  <select
                    className={field}
                    value={atsEligibility}
                    onChange={(e) => setAtsEligibility(e.target.value)}
                  >
                    <option value="">All candidates</option>
                    <option value="eligible">Eligible</option>
                    <option value="ineligible">Not eligible</option>
                  </select>
                </label>
                <label className="text-sm">
                  Minimum ATS / mandatory %
                  <div className="flex gap-2">
                    <input
                      className={field}
                      type="number"
                      min="0"
                      max="100"
                      placeholder="ATS"
                      value={atsMinimum}
                      onChange={(e) => setAtsMinimum(e.target.value)}
                    />
                    <input
                      className={field}
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Mandatory"
                      value={coverageMinimum}
                      onChange={(e) => setCoverageMinimum(e.target.value)}
                    />
                  </div>
                </label>
              </>
            ) : null}
          </div>}
          {tab === "results" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                {[
                  ["Candidates", resultKpis.candidates, "bg-indigo-50 text-indigo-700"], ["Completed", resultKpis.completed, "bg-emerald-50 text-emerald-700"], ["Incomplete", resultKpis.incomplete, "bg-slate-100 text-slate-700"], ["Needs review", resultKpis.needsReview, "bg-amber-50 text-amber-800"], ["Decision pending", resultKpis.decisionPending, "bg-amber-50 text-amber-800"], ["Ready to release", resultKpis.readyToRelease, "bg-emerald-50 text-emerald-700"],
                ].map(([label,value,tone])=><article className={`rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700 ${tone}`} key={String(label)}><p className="text-xs font-semibold uppercase tracking-wide">{label}</p><strong className="mt-1 block text-2xl">{value}</strong></article>)}
              </div>
              <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <label className="min-w-60 flex-1 text-xs font-medium text-slate-500">Search candidates<input className={`${field} mt-1`} value={search} onChange={event=>{setOffset(0);setSearch(event.target.value)}} placeholder="Name, email or roll number" /></label>
                <label className="min-w-44 text-xs font-medium text-slate-500">Department<select className={`${field} mt-1`} value={departmentFilter} onChange={event=>{setOffset(0);setDepartmentFilter(event.target.value)}}><option value="">All departments</option>{[...new Set(rawCandidates.map(candidate=>candidate.department_code).filter(Boolean))].map(value=><option key={value} value={value}>{value}</option>)}</select></label>
                <ResultCohortBuilder rules={resultRules} setRules={rules=>{setOffset(0);setResultRules(rules)}} matchMode={resultMatchMode} setMatchMode={value=>{setOffset(0);setResultMatchMode(value)}} total={total} excludeReview={excludeReviewRequired} setExcludeReview={value=>{setOffset(0);setExcludeReviewRequired(value)}} options={resultFilterOptions} onReset={()=>{setResultRules([]);setExcludeReviewRequired(false);setResultMatchMode("all");setResultView("all");setOffset(0)}}/>
                <label className="min-w-44 text-xs font-medium text-slate-500">Sort by<select className={`${field} mt-1`} value={resultSort} onChange={event=>setResultSort(event.target.value)}><option value="rank">Rank</option><option value="score_desc">Interview score</option><option value="pri_desc">PRI</option><option value="name">Candidate name</option></select></label>
              </div>
            </div>
          )}
          {tab === "results" && (
            <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><div className="mr-auto"><h3 className="font-semibold">Result release</h3><p className="text-xs text-slate-500">Schedule publication for candidates with a recorded officer decision.</p></div><label className="text-xs font-medium text-slate-500">Release results date<input className={`${field} mt-1`} type="date" value={schedule.split("T")[0]||""} onChange={event=>setSchedule(`${event.target.value}T${schedule.split("T")[1]||"09:00"}`)} /></label><label className="text-xs font-medium text-slate-500">Release results time<input className={`${field} mt-1`} type="time" value={schedule.split("T")[1]||""} onChange={event=>setSchedule(`${schedule.split("T")[0]||new Date().toISOString().slice(0,10)}T${event.target.value}`)} /></label><button className={`${btn} bg-indigo-600 text-white`} disabled={busy||!schedule.includes("T")||!schedule.split("T")[1]} onClick={()=>void act("candidates/release-all/schedule",{scheduled_for:new Date(schedule).toISOString()})}>Save schedule</button></section>
          )}
          {tab === "results" && checked.length > 0 && (
            <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <strong className="mr-auto text-sm">{checked.length} candidate{checked.length === 1 ? "" : "s"} selected</strong>
              {(["shortlist", "hold", "reject"] as const).map((value) => (
                <button
                  key={value}
                  className={btn}
                  disabled={busy || !checked.length}
                  onClick={() => setBulkDecision(value)}
                >
                  {displayName(value)} {checked.length}
                </button>
              ))}
              <button
                aria-label="Clear selection"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                onClick={() => setChecked([])}
              >
                ×
              </button>
            </div>
          )}
          {bulkDecision && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={event=>{if(event.currentTarget===event.target)setBulkDecision(null)}}>
              <section role="alertdialog" aria-modal="true" aria-labelledby="bulk-decision-title" className={`${panel} w-full max-w-md`}>
                <h3 id="bulk-decision-title" className="text-lg font-bold">{displayName(bulkDecision)} {checked.length} candidates?</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">These candidates were selected from the current filtered result set. This records an Officer Decision; it does not release results to students.</p>
                <div className="mt-5 flex justify-end gap-3"><button autoFocus className={btn} onClick={()=>setBulkDecision(null)}>Cancel</button><button className={`${btn} bg-indigo-600 text-white`} disabled={busy} onClick={()=>{const decision=bulkDecision;setBulkDecision(null);void act("candidates/decisions/bulk",{student_ids:checked,decision})}}>Confirm {displayName(bulkDecision)}</button></div>
              </section>
            </div>
          )}
          {!loading && !candidates.length && (
            <p className={panel}>No candidates found for this view.</p>
          )}
          {!!candidates.length && (
            <div id="result-candidate-table" className={`${panel} overflow-x-auto`}>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {(tab === "results"
                      ? [
                          "Rank",
                          "Candidate",
                          "Interview Score",
                          "PRI",
                          "Readiness",
                          "AI Recommendation",
                          "AI Proctor",
                          "Officer Decision",
                          "Student Result",
                          "Action",
                        ]
                      : tab === "ats"
                        ? [
                            "Candidate",
                            "Department / Program",
                            "ATS Fit",
                            "Mandatory",
                            "Core",
                            "Preferred",
                            "Resume Evidence",
                            "Action",
                          ]
                        : [
                            "Candidate",
                            "Department / Program",
                            "Interview Status",
                            "Attempts",
                            "Result Status",
                            "Action",
                          ]
                    ).map((h) => (
                      <th className="p-3" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr
                      className="border-t"
                      key={c.student_id || c.roll_number}
                    >
                      {tab === "results" && (
                        <td className="p-3 text-lg font-bold">
                          {c.rank ? `#${c.rank}` : "—"}
                        </td>
                      )}
                      <td className="p-3">
                        {tab === "results" && (
                          <input
                            className="mr-2"
                            type="checkbox"
                            aria-label={`Select ${c.full_name}`}
                            checked={checked.includes(c.student_id)}
                            onChange={(e) =>
                              setChecked((ids) =>
                                e.target.checked
                                  ? [...ids, c.student_id]
                                  : ids.filter((id) => id !== c.student_id),
                              )
                            }
                          />
                        )}
                        <strong>{c.full_name}</strong>
                        <p className="text-xs text-slate-500">
                          {c.roll_number}
                          {c.email ? ` · ${c.email}` : ""}
                        </p>
                      </td>
                      {tab === "results" ? (
                        <>
                          <td className="p-3">
                            <strong>
                              {c.overall_score == null
                                ? "—"
                                : `${c.overall_score}/100`}
                            </strong>
                          </td>
                          <td className="p-3">
                            {c.ranking_score == null
                              ? "—"
                              : `${c.ranking_score}/100`}
                          </td>
                          <td className="p-3">
                            <StatusBadge value={c.readiness || c.evaluation_status || "pending"} />
                          </td>
                          <td className="p-3">
                            <StatusBadge value={c.recommendation || "Review Required"} />
                          </td>
                          <td className="p-3">
                            <div className="space-y-1"><ScoreBadge score={c.proctoring_score} /><div><StatusBadge value={c.integrity_review_label || c.integrity_review_status || "not assessed"} /></div></div>
                          </td>
                          <td className="p-3">
                            <StatusBadge value={c.officer_decision || "pending"} />
                          </td>
                          <td className="p-3">
                            <StatusBadge value={c.publication?.state || "hidden"} />
                          </td>
                        </>
                      ) : tab === "ats" ? (
                        <>
                          <td className="p-3">
                            {c.department_code || "—"} / {c.program || "—"}
                          </td>
                          <td className="p-3">
                            <ScoreBadge score={c.ats_fit_score} />
                          </td>
                          <td className="p-3">{c.mandatory_coverage || "—"}</td>
                          <td className="p-3">{c.core_coverage || "—"}</td>
                          <td className="p-3">{c.preferred_coverage || "—"}</td>
                          <td className="p-3">
                            {displayName(c.resume_evidence || "not assessed")}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3">
                            {c.department_code || "—"} / {c.program || "—"}
                          </td>
                          <td className="p-3">
                            {displayName(
                              c.assignment_status === "in_progress"
                                ? "in_progress"
                                : c.evaluation_status === "held_for_review"
                                  ? "needs_review"
                                  : c.evaluation_status === "released"
                                    ? "completed"
                                    : c.preparation_status || "not_started",
                            )}
                          </td>
                          <td className="p-3">
                            {c.attempt_number || 0} /{" "}
                            {c.max_attempts || drive?.max_attempts || 1}
                          </td>
                          <td className="p-3">
                            {c.publication?.state === "released"
                              ? "Released"
                              : c.evaluation_status === "released"
                                ? "Evaluation Ready"
                                : c.assignment_status === "completed"
                                  ? "Awaiting Evaluation"
                                  : "Not Available"}
                          </td>
                        </>
                      )}
                      <td className="p-3 whitespace-nowrap">
                        {tab === "results" ? (
                          <button
                            className={btn}
                            disabled={busy}
                            onClick={() => void inspect(c, "reports")}
                          >
                            Open report
                          </button>
                        ) : (
                          <button
                            className={btn}
                            disabled={busy}
                            onClick={() => {
                              setSelected(c);
                              setDetail(c);
                            }}
                          >
                            View details
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              className={btn}
              disabled={offset === 0 || loading}
              onClick={() => setOffset((n) => Math.max(0, n - 25))}
            >
              Previous
            </button>
            <span className="text-sm">
              {offset + (candidates.length ? 1 : 0)}–
              {offset + candidates.length}
              {tab !== "candidates" ? ` of ${total}` : ""}
            </span>
            <button
              className={btn}
              disabled={
                loading ||
                (tab === "candidates"
                  ? candidates.length < 25
                  : offset + candidates.length >= total)
              }
              onClick={() => setOffset((n) => n + 25)}
            >
              Next
            </button>
          </div>
        </>
      )}
      {tab === "skills" && data && <SkillView data={data} />}{" "}
      {tab === "departments" && data && <DepartmentView data={data} />}{" "}
      {tab === "settings" && drive && (
        <div className="space-y-5"><ReadinessPolicy /><InterviewResultsSettings /><DriveSettings
          drive={drive}
          busy={busy}
          initialSection={params.get("edit") || undefined}
          save={async (body) => {
            setBusy(true);
            setError("");
            try {
              await collegeApi.save(`drives/${driveId}`, body, true);
              setNotice("Drive section saved.");
              setVersion((v) => v + 1);
            } catch (e) {
              setError(collegeError(e));
              throw e;
            } finally {
              setBusy(false);
            }
          }}
        /></div>
      )}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelected(null);
              setDetail(null);
            }
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`${tab === "ats" ? "ATS fit" : "Candidate"} details for ${selected.full_name}`}
            className="ml-auto h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-950"
          >
            <div className="space-y-4">
              <div className="flex justify-between gap-3">
                <h3 className="font-bold">
                  {selected.full_name} · {selected.roll_number}
                </h3>
                <button
                  autoFocus
                  className={btn}
                  onClick={() => {
                    setSelected(null);
                    setDetail(null);
                  }}
                >
                  Close details
                </button>
              </div>
              <CandidateDetails
                candidate={selected}
                data={detail}
                mode={tab === "ats" ? "ats" : "candidates"}
              />
              {tab === "candidates" && (
                <>
                  <div className="flex flex-wrap gap-3">
                    {["completed", "released", "held_for_review"].includes(
                      String(selected.evaluation_status),
                    ) && (
                      <button
                        className={btn}
                        disabled={busy}
                        onClick={() => void inspect(selected, "reports")}
                      >
                        View interview result
                      </button>
                    )}
                    <button
                      className={btn}
                      disabled={busy}
                      onClick={() => void inspect(selected, "attempts")}
                    >
                      View attempt history
                    </button>
                  </div>
                  {drive &&
                    ["scheduled", "active"].includes(drive.status) &&
                    ["completed", "released", "expired", "failed"].includes(
                      String(
                        selected.evaluation_status ||
                          selected.assignment_status,
                      ),
                    ) && (
                      <>
                        <label className="block max-w-xs text-sm">
                          Allowed attempts after reopening
                          <input
                            className={field}
                            type="number"
                            min={Number(selected.attempt_number || 1) + 1}
                            value={attempts}
                            onChange={(e) =>
                              setAttempts(
                                Math.max(
                                  Number(selected.attempt_number || 1) + 1,
                                  Number(e.target.value),
                                ),
                              )
                            }
                          />
                        </label>
                        <button
                          className={btn}
                          disabled={busy}
                          onClick={() =>
                            void act(
                              `candidates/${selected.student_id}/reopen`,
                              { max_attempts_override: attempts },
                            )
                          }
                        >
                          Reopen interview
                        </button>
                      </>
                    )}
                </>
              )}
            </div>
          </aside>
        </div>
      )}
      {lifecycleRequest && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="lifecycle-title"
            className={`${panel} max-w-md`}
          >
            <h3 id="lifecycle-title" className="text-lg font-bold">
              {lifecycleRequest === "closed"
                ? "Close"
                : lifecycleRequest === "cancelled"
                  ? "Cancel"
                  : "Remove"}{" "}
              this drive?
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {lifecycleRequest === "removed"
                ? "The drive will be removed from active management. Drives with historical records are archived so completed reports remain preserved."
                : "Candidates will no longer be able to start an interview. Completed reports remain available."}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                autoFocus
                className={btn}
                onClick={() => setLifecycleRequest(null)}
              >
                Keep drive
              </button>
              <button
                className={`${btn} bg-rose-600 text-white`}
                disabled={busy}
                onClick={() => {
                  const next = lifecycleRequest;
                  setLifecycleRequest(null);
                  if (next === "removed") void removeDrive();
                  else void changeLifecycle(next);
                }}
              >
                Confirm{" "}
                {lifecycleRequest === "closed"
                  ? "close"
                  : lifecycleRequest === "cancelled"
                    ? "cancel"
                    : "remove"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
