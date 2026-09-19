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
  rank?: number;
  officer_decision?: string;
  evaluation_status?: string;
  assignment_status?: string;
  preparation_status?: string;
  attempt_number?: number;
  max_attempts?: number;
  started_at?: string;
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
function Details({ data }: { data: unknown }) {
  if (data === null || data === undefined)
    return <span className="text-slate-500">Not available</span>;
  if (typeof data === "boolean") return <span>{data ? "Yes" : "No"}</span>;
  if (typeof data !== "object")
    return (
      <span className="whitespace-pre-wrap break-words">{String(data)}</span>
    );
  if (Array.isArray(data))
    return data.length ? (
      <div className="space-y-3">
        {data.map((v, i) => (
          <div key={i} className="border-l-2 pl-3">
            <Details data={v} />
          </div>
        ))}
      </div>
    ) : (
      <span className="text-slate-500">None yet</span>
    );
  const entries = Object.entries(data).filter(
    ([k]) => !/(^id$|_id$|_json$|^agent_profiles$|^policy_version$)/.test(k),
  );
  return (
    <dl className="space-y-3 text-sm">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="font-medium text-slate-500">{displayName(key)}</dt>
          <dd className="mt-1">
            <Details data={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
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
              <dd className="font-semibold">
                {candidate.ats_fit_score ?? "Not assessed"}
              </dd>
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
                {displayName(candidate.resume_evidence || "not assessed")}
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
          </>
        )}
      </dl>
      {mode === "ats" && skills.length > 0 && (
        <div>
          <h4 className="mb-2 font-semibold">
            JD requirement and resume evidence
          </h4>
          <div className="space-y-2">
            {skills.map((skill, index) => (
              <article
                className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"
                key={String(skill.skill || index)}
              >
                <div className="flex justify-between gap-3">
                  <strong>{String(skill.skill || "Requirement")}</strong>
                  <span>
                    {displayName(
                      String(skill.match_status || "not found in resume"),
                    )}
                  </span>
                </div>
                <p className="mt-1 text-slate-500">
                  {String(
                    skill.evidence_text ||
                      skill.reason ||
                      "No supporting resume text was identified. This does not prove the candidate lacks the skill.",
                  )}
                </p>
              </article>
            ))}
          </div>
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
  const topRisks = (data.top_risks || []) as Data[];
  const insufficient = (data.insufficient_data_skills || []) as Data[];
  const historical = (data.unmatched_historical_skills || []) as Data[];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Released interviews" value={data.total_released ?? 0} />
        <Metric label="Skills tracked" value={skills.length} />
        <Metric
          label="Evidence coverage"
          value={
            skills.length
              ? `${Math.round(skills.reduce((sum, s) => sum + Number(s.coverage_pct || 0), 0) / skills.length)}%`
              : "—"
          }
        />
      </div>
      {topRisks.length > 0 && (
        <article className={panel}>
          <h3 className="font-bold">Risk radar</h3>
          <p className="mt-1 text-sm text-slate-500">
            Skills with enough released interview evidence to create a real
            placement risk for this drive.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {topRisks.map((risk, index) => (
              <div key={String(risk.skill || index)} className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/20">
                <div className="flex items-center justify-between gap-3">
                  <strong>{String(risk.skill || "Skill")}</strong>
                  <span className="text-xs font-bold uppercase text-rose-700 dark:text-rose-300">{String(risk.risk || "risk")}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {String(risk.gap_pct ?? 0)}% limited evidence · {String(risk.coverage_pct ?? 0)}% coverage
                </p>
              </div>
            ))}
          </div>
        </article>
      )}
      <article className={panel}>
        <div className="mb-5">
          <h3 className="font-bold">Skill intelligence</h3>
          <p className="text-sm text-slate-500">
            Candidate answers are classified separately from skills that were
            not tested.
          </p>
        </div>
        <div className="space-y-5">
          {skills.map((skill, index) => {
            const assessed = Number(skill.assessed_count || 0),
              good = Number(skill.good_count || 0),
              limited = Number(skill.limited_answer_count || 0),
              unclear = Number(skill.no_clear_answer_count || 0),
              notTested = Number(
                skill.not_tested_count ||
                  Math.max(0, Number(data.total_released || 0) - assessed),
              );
            return (
              <details
                key={String(skill.skill || index)}
                className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <summary className="cursor-pointer font-semibold">
                  {String(skill.skill)}{" "}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {displayName(String(skill.priority || ""))} priority
                  </span>
                </summary>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Good" value={good} />
                  <Metric label="Limited" value={limited} />
                  <Metric label="No clear answer" value={unclear} />
                  <Metric label="Not tested" value={notTested} />
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Open a candidate report from Interview results to review the
                  underlying question and answer evidence.
                </p>
              </details>
            );
          })}
          {!skills.length && (
            <p className="text-slate-500">
              Skill evidence will appear after released interviews.
            </p>
          )}
        </div>
      </article>
      {(insufficient.length > 0 || historical.length > 0) && (
        <article className={panel}>
          <h3 className="font-bold">Evidence boundaries</h3>
          <p className="mt-1 text-sm text-slate-500">
            These skills are kept separate from placement risk because the
            available interviews did not provide enough valid evidence.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {insufficient.map((item, index) => <span key={`insufficient-${index}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">{String(item.skill)} · insufficient evidence</span>)}
            {historical.map((item, index) => <span key={`historical-${index}`} className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{String(item.skill)} · historical JD only</span>)}
          </div>
        </article>
      )}
    </div>
  );
}
function DepartmentView({ data }: { data: Data }) {
  const departments = (data.departments || []) as Data[];
  const eligible = departments.filter(
      (item) => Number(item.student_count || 0) >= 3,
    ),
    leader = eligible.sort(
      (a, b) => Number(b.avg_score || 0) - Number(a.avg_score || 0),
    )[0];
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
          note="At least three completed candidates required"
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
              <th className="p-3">Comparison status</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((item, index) => {
              const count = Number(item.student_count || 0);
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
                    {count < 3
                      ? "Below minimum sample"
                      : leader === item
                        ? "Leading cohort"
                        : "Comparable"}
                  </td>
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
      .get<AgentLibrary>("agents")
      .then(setLibrary)
      .catch(() => setLibrary(null));
  }, []);
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
    const custom = library?.agents.find((agent) => agent.id === value),
      track = custom?.track || value;
    if (
      !track ||
      selection.length >= 4 ||
      selection.some((item) => item.track === track)
    )
      return;
    const next = [...selection, { track, agent_id: custom?.id || null }];
    setSelection(next);
    setRounds((current) => [
      ...current,
      { track, question_source: "personalized", questions: [] },
    ]);
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
        {input("eligible_programs", "Program codes, comma separated")}
        {input("eligible_departments", "Department codes, comma separated")}
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
                .map((agent) => (
                  <option
                    key={agent.id || agent.track}
                    value={agent.id || agent.track}
                  >
                    {agent.name} — {agent.role}
                  </option>
                ))}
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
      const rules=resultRules.filter(rule=>['is_available','is_not_available'].includes(rule.operator)||(rule.operator==='is_any_of'&&rule.values?.length)||rule.value!==''||(rule.operator==='between'&&rule.valueEnd));
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
  async function selectAllResultMatches() {
    setBusy(true);
    setError("");
    try {
      const query=new URLSearchParams({limit:String(Math.min(total,500)),offset:"0",q:search,result_view:resultView,match_mode:resultMatchMode});
      const rules=resultRules.filter(rule=>['is_available','is_not_available'].includes(rule.operator)||(rule.operator==='is_any_of'&&rule.values?.length)||rule.value!==''||(rule.operator==='between'&&rule.valueEnd)).map(({field,operator,value,valueEnd,values})=>({field,operator,value,value_end:valueEnd,values}));
      if(rules.length)query.set("filters",JSON.stringify(rules));
      if(excludeReviewRequired)query.set("exclude_review_required","true");
      const result=await collegeApi.get<Data>(`drives/${driveId}/dashboard/ranking?${query.toString()}`);
      setChecked(((result.candidates||[]) as Candidate[]).map(candidate=>candidate.student_id));
    } catch(e){setError(collegeError(e))} finally {setBusy(false)}
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
  const candidates = rawCandidates.filter(
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
            className={`${btn} text-rose-700`}
            disabled={busy || loading}
            onClick={() => setLifecycleRequest("removed")}
          >
            Remove drive
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
            evaluated = Object.values(distribution).reduce<number>(
              (sum, value) => sum + Number(value || 0),
              0,
            );
          return (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                  <details className="mt-5 rounded-xl border p-4">
                    <summary className="cursor-pointer font-semibold">
                      View round details
                    </summary>
                    <Details data={drive?.agent_selection || []} />
                  </details>
                </article>
              </div>
            </div>
          );
        })()}
      {["candidates", "ats", "results"].includes(tab) && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
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
          </div>
          {tab === "results" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Result status views">
                {[
                  ["all", "All Results"],
                  ["ranked", "Ranked"],
                  ["needs_review", "Needs Review"],
                  ["incomplete", "Incomplete"],
                  ["decision_pending", "Officer Decision Pending"],
                ].map(([value,label])=><button key={value} className={`${btn} ${resultView===value?"bg-indigo-600 text-white":""}`} aria-pressed={resultView===value} onClick={()=>{setOffset(0);setResultView(value)}}>{label}</button>)}
              </div>
              <ResultCohortBuilder rules={resultRules} setRules={rules=>{setOffset(0);setResultRules(rules)}} matchMode={resultMatchMode} setMatchMode={value=>{setOffset(0);setResultMatchMode(value)}} total={total} excludeReview={excludeReviewRequired} setExcludeReview={value=>{setOffset(0);setExcludeReviewRequired(value)}} options={resultFilterOptions} onReset={()=>{setResultRules([]);setExcludeReviewRequired(false);setResultMatchMode("all");setResultView("all");setOffset(0)}}/>
            </div>
          )}
          {tab === "results" && (
            <div className="flex flex-wrap gap-3">
              <button
                className={btn}
                disabled={busy}
                onClick={() => void act("candidates/release-all")}
              >
                Release all ready results
              </button>
              <label className="text-sm">
                Release time
                <input
                  className={field}
                  type="datetime-local"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                />
              </label>
              <button
                className={btn}
                disabled={busy || !schedule}
                onClick={() =>
                  void act("candidates/release-all/schedule", {
                    scheduled_for: new Date(schedule).toISOString(),
                  })
                }
              >
                Schedule ready results
              </button>
            </div>
          )}
          {tab === "results" && !!candidates.length && (
            <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <label className="text-sm">
                <input
                  type="checkbox"
                  checked={candidates.every((c) =>
                    checked.includes(c.student_id),
                  )}
                  onChange={(e) =>
                    setChecked(
                      e.target.checked
                        ? candidates.map((c) => c.student_id)
                        : [],
                    )
                  }
                />{" "}
                Select visible candidates
              </label>
              <strong className="text-sm">{total} matched · {checked.length} selected</strong>
              <button className={btn} disabled={busy||total===0||total>500} title={total>500?"Refine the cohort to 500 candidates or fewer before selecting all.":undefined} onClick={()=>void selectAllResultMatches()}>Select all {total} matches</button>
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
                className={btn}
                disabled={busy || !checked.length}
                onClick={() => setChecked([])}
              >
                Clear Selection
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
                            {displayName(
                              c.readiness || c.evaluation_status || "pending",
                            )}
                          </td>
                          <td className="p-3">
                            {c.recommendation || "Review Required"}
                          </td>
                          <td className="p-3">
                            {displayName(c.officer_decision || "undecided")}
                          </td>
                          <td className="p-3">
                            {displayName(c.publication?.state || "hidden")}
                          </td>
                        </>
                      ) : tab === "ats" ? (
                        <>
                          <td className="p-3">
                            {c.department_code || "—"} / {c.program || "—"}
                          </td>
                          <td className="p-3">
                            {c.ats_fit_score == null
                              ? "—"
                              : `${c.ats_fit_score}/100`}
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
        <DriveSettings
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
        />
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
                            min={1}
                            value={attempts}
                            onChange={(e) =>
                              setAttempts(Math.max(1, Number(e.target.value)))
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
