import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  collegeApi,
  collegeError,
  type Drive,
  type Program,
} from "@/api/collegeApi";
import { useCollegeAccess } from "@/hooks/useCollegeAccess";
import CreateDriveWizard from "./CreateDriveWizard";
import DriveManagement, { InterviewResultsSettings, ReadinessPolicy } from "./DriveManagement";
import InterviewAgents from "./InterviewAgents";
import PlacementAnalytics, { type Analytics } from "./PlacementAnalytics";
import { displayName, formatDateOnly, formatPlacementDateTime, PLACEMENT_TIME_ZONE } from "./placementDisplay";

const card =
  "rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900";
const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-indigo-500 dark:border-slate-700 dark:bg-slate-900";
const button =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-slate-700";
const primary = `${button} border-indigo-600 bg-indigo-600 text-white`;
const date = (value?: string) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? formatDateOnly(value)
    : formatPlacementDateTime(value);
const compareDates = (left?: string, right?: string) => {
  const a = left ? Date.parse(left) : NaN;
  const b = right ? Date.parse(right) : NaN;
  if (!Number.isFinite(a)) return Number.isFinite(b) ? 1 : 0;
  if (!Number.isFinite(b)) return -1;
  return b - a;
};
const compareAscendingDates = (left?: string, right?: string) => {
  const a = left ? Date.parse(left) : NaN;
  const b = right ? Date.parse(right) : NaN;
  if (!Number.isFinite(a)) return Number.isFinite(b) ? 1 : 0;
  if (!Number.isFinite(b)) return -1;
  return a - b;
};
const effectiveStatus = (drive: Drive | null | undefined) => {
  if (!drive) return "scheduled";
  if (drive.status === "cancelled" || drive.status === "draft") return drive.status;
  const now = Date.now();
  const start = drive.window_start_at ? Date.parse(drive.window_start_at) : NaN;
  const end = drive.window_end_at ? Date.parse(drive.window_end_at) : NaN;
  if (Number.isFinite(end) && now >= end) return "closed";
  if (Number.isFinite(start) && now >= start) return "active";
  return "scheduled";
};
type Landing = {
  active_drives?: number;
  upcoming_drives?: number;
  eligible_candidates?: number;
  eligible_drive_matches?: number;
  interviews_completed?: number;
  live_interviews?: number;
  completion_rate?: number;
};
type DriveDraftSummary = { id:string; client_draft_key?:string; localOnly?:boolean; step:number; payload:{form?:{company_name?:string;role_title?:string}}; updated_at:string };
type ApiObject = Record<string, unknown>;
const isApiObject = (value: unknown): value is ApiObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const normalizeDrives = (value: unknown): Drive[] =>
  Array.isArray(value)
    ? value.filter((item): item is Drive =>
        isApiObject(item) &&
        typeof item.id === "string" &&
        typeof item.company_name === "string" &&
        typeof item.role_title === "string",
      )
    : [];
const normalizeDrafts = (value: unknown): DriveDraftSummary[] =>
  Array.isArray(value)
    ? value.flatMap((item) => {
        if (!isApiObject(item) || typeof item.id !== "string") return [];
        const payload = isApiObject(item.payload) ? item.payload : {};
        const form = isApiObject(payload.form) ? payload.form : {};
        return [{
          id: item.id,
          client_draft_key: typeof item.client_draft_key === "string" ? item.client_draft_key : undefined,
          step: typeof item.step === "number" && Number.isFinite(item.step) ? item.step : 0,
          payload: {
            form: {
              company_name: typeof form.company_name === "string" ? form.company_name : undefined,
              role_title: typeof form.role_title === "string" ? form.role_title : undefined,
            },
          },
          updated_at: typeof item.updated_at === "string" ? item.updated_at : "",
        }];
      })
    : [];
const localDraftSummary = (): DriveDraftSummary | null => {
  try {
    const saved = JSON.parse(localStorage.getItem("voicedots:placement-drive-draft:v2") || "null");
    if (!isApiObject(saved) || !isApiObject(saved.payload)) return null;
    const payload = saved.payload;
    const form = isApiObject(payload.form) ? payload.form : {};
    return {
      id: "local-device",
      client_draft_key: typeof payload.creationKey === "string" ? payload.creationKey : undefined,
      localOnly: true,
      step: typeof payload.step === "number" && Number.isFinite(payload.step) ? payload.step : 0,
      payload: { form: {
        company_name: typeof form.company_name === "string" ? form.company_name : undefined,
        role_title: typeof form.role_title === "string" ? form.role_title : undefined,
      } },
      updated_at: typeof saved.saved_at === "string" ? saved.saved_at : "",
    };
  } catch { return null; }
};
const combineDrafts = (remote: unknown): DriveDraftSummary[] => {
  const drafts = normalizeDrafts(remote);
  const local = localDraftSummary();
  if (!local || drafts.some(item => local.client_draft_key && item.client_draft_key === local.client_draft_key)) return drafts;
  return [...drafts, local];
};

export default function CollegeManagementPage() {
  const {
    access,
    loading: accessLoading,
    error: accessError,
    retry,
  } = useCollegeAccess();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("view") || "placements") as
      | "placements"
      | "analytics"
      | "agents"
      | "settings",
    driveId = params.get("drive"),
    draftId = params.get("draft"),
    creating = params.get("create") === "1";
  const [drives, setDrives] = useState<Drive[]>([]),
    [drafts, setDrafts] = useState<DriveDraftSummary[]>([]),
    [programs, setPrograms] = useState<Program[]>([]),
    [analytics, setAnalytics] = useState<Analytics | null>(null),
    [overview, setOverview] = useState<Landing>({}),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [draftsError, setDraftsError] = useState(""),
    [notice, setNotice] = useState(""),
    [version, setVersion] = useState(0),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [type, setType] = useState(""),
    [sort, setSort] = useState("recent");
  useEffect(() => {
    if (!access?.enabled) return;
    const c = new AbortController();
    setLoading(true);
    setError("");
    const requests = Promise.allSettled([
      collegeApi.get<Drive[]>("drives", c.signal),
      collegeApi.get<{ programs: Program[] }>("academic-catalog", c.signal),
      collegeApi.get<Analytics>("analytics", c.signal),
      collegeApi.get<Landing>("dashboard/overview", c.signal),
    ]).then(([drivesResult, programsResult, analyticsResult, overviewResult]) => {
      if (c.signal.aborted) return;
      const errors: string[] = [];
      if (drivesResult.status === "fulfilled") {
        setDrives(normalizeDrives(drivesResult.value));
      } else {
        setDrives([]);
        errors.push(`Failed to load placement drives: ${collegeError(drivesResult.reason)}`);
      }
      if (programsResult.status === "fulfilled") {
        const rows = programsResult.value?.programs;
        setPrograms(Array.isArray(rows) ? rows.filter((program): program is Program =>
          Boolean(program) && typeof program.code === "string" && Array.isArray(program.departments),
        ) : []);
      } else {
        setPrograms([]);
        errors.push(`Failed to load academic programs: ${collegeError(programsResult.reason)}`);
      }
      if (analyticsResult.status === "fulfilled") setAnalytics(analyticsResult.value || null);
      else setAnalytics(null);
      if (overviewResult.status === "fulfilled" && isApiObject(overviewResult.value)) {
        setOverview(overviewResult.value as Landing);
      } else {
        setOverview({});
      }
      setError(errors.join(" "));
    }).finally(() => {
      if (!c.signal.aborted) setLoading(false);
    });
    setDraftsError("");
    collegeApi.get<unknown>("drive-drafts", c.signal)
      .then((value) => { if (!c.signal.aborted) setDrafts(combineDrafts(value)); })
      .catch((reason) => {
        if (c.signal.aborted) return;
        setDrafts(combineDrafts([]));
        setDraftsError(`Failed to load drive drafts: ${collegeError(reason)}. Existing placement drives remain available.`);
      });
    void requests;
    return () => c.abort();
  }, [access?.enabled, version, driveId]);
  const filtered = useMemo(
    () =>
      drives
        .filter(
          (d) =>
            (!query ||
              `${d.company_name} ${d.role_title}`
                .toLowerCase()
                .includes(query.toLowerCase())) &&
            (!status || d.status === status) &&
            (!type || d.drive_type === type),
        )
        .sort((a, b) =>
          sort === "company"
            ? a.company_name.localeCompare(b.company_name)
            : sort === "starting"
              ? compareAscendingDates(a.window_start_at, b.window_start_at)
              : sort === "ending"
                ? compareAscendingDates(a.window_end_at, b.window_end_at)
                : compareDates(a.created_at, b.created_at),
        ),
    [drives, query, status, type, sort],
  );
  async function toggleDriveLock(drive: Drive) {
    const next = !drive.is_locked;
    if (!window.confirm(`${next ? "Lock" : "Unlock"} ${drive.company_name} · ${drive.role_title}?`)) return;
    try {
      await collegeApi.save(`drives/${drive.id}/lock`, { is_locked: next });
      setNotice(next ? "Drive locked." : "Drive unlocked.");
      setVersion((v) => v + 1);
    } catch (e) { setError(collegeError(e)); }
  }
  async function deleteDrive(drive: Drive) {
    if (!window.confirm(`Delete ${drive.company_name} · ${drive.role_title}? This removes the drive from placement management.`)) return;
    try {
      await collegeApi.remove(`drives/${drive.id}`);
      setDrives(current => current.filter(item => item.id !== drive.id));
      setNotice("Drive deleted.");
      setVersion(v => v + 1);
    } catch (e) { setError(collegeError(e)); }
  }
  if (accessLoading) return <p role="status">Loading placement management…</p>;
  if (accessError || !access?.enabled)
    return (
      <section className={card}>
        <p role="alert">
          {accessError ||
            "Placement management is not enabled for this account."}
        </p>
        <button className={`${button} mt-4`} onClick={retry}>
          Retry
        </button>
      </section>
    );
  const navigate = (view: string) =>
    setParams((p) => {
      p.set("view", view);
      p.delete("drive");
      p.delete("create");
      p.delete("draft");
      p.delete("section");
      return p;
    });
  if (creating)
    return (
      <CreateDriveWizard
        programs={programs}
        collegeTimezone={PLACEMENT_TIME_ZONE}
        draftId={draftId}
        onCancel={() => {
          setParams((p) => {
            p.delete("create");
            p.delete("draft");
            return p;
          }, { replace:true });
          setVersion(v=>v+1);
        }}
        onSaved={(message) => {
          setNotice(message);
          setParams((p) => {
            p.delete("create");
            p.delete("draft");
            return p;
          });
          setVersion((v) => v + 1);
        }}
      />
    );
  if (driveId)
    return (
      <DriveManagement
        driveId={driveId}
        collegeTimezone={PLACEMENT_TIME_ZONE}
        back={() =>
          setParams((p) => {
            p.delete("drive");
            p.delete("section");
            return p;
          })
        }
      />
    );
  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            {displayName(access.college_name || "")}
          </p>
          <h1 className="mt-1 text-3xl font-bold">Placement management</h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage placement drives, results and interview configuration.
          </p>
        </div>
        <a
          className={button}
          href="https://students.voicedots.io"
          target="_blank"
          rel="noreferrer"
        >
          Student portal
          <ArrowUpRight size={16} />
        </a>
      </header>
      <nav className="flex gap-6 border-b" aria-label="Placement sections">
        {(
          [
            ["placements", "Placements"],
            ["analytics", "Analytics"],
            ["agents", "Interview Agents"],
            ["settings", "Settings"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => navigate(key)}
            className={`border-b-2 px-1 pb-3 text-sm font-semibold ${tab === key ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500"}`}
          >
            {label}
          </button>
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
      {tab === "analytics" ? (
        <PlacementAnalytics data={analytics} />
      ) : tab === "agents" ? (
        <InterviewAgents />
      ) : tab === "settings" ? (
        <section className="space-y-5">
          <header>
            <h2 className="text-2xl font-bold">Placement settings</h2>
            <p className="mt-1 text-sm text-slate-500">Institution-wide placement scoring, recommendation, proctoring and skill-risk policies.</p>
          </header>
          <ReadinessPolicy />
          <InterviewResultsSettings />
        </section>
      ) : (
        <PlacementLanding
          drives={filtered}
          allDrives={drives}
          drafts={drafts}
          draftsError={draftsError}
          overview={overview}
          loading={loading}
          query={query}
          setQuery={setQuery}
          status={status}
          setStatus={setStatus}
          type={type}
          setType={setType}
          sort={sort}
          setSort={setSort}
          refresh={() => setVersion((v) => v + 1)}
          toggleLock={toggleDriveLock}
          deleteDrive={deleteDrive}
          create={() =>
            setParams((p) => {
              p.set("create", "1");
              return p;
            })
          }
          resumeDraft={(id) => setParams((p) => { p.set("create", "1"); if(id==="local-device")p.delete("draft");else p.set("draft", id); return p; })}
          deleteDraft={async (id) => { if(id==="local-device"){localStorage.removeItem("voicedots:placement-drive-draft:v2");setDrafts(current=>current.filter(item=>item.id!==id));return;} try { await collegeApi.remove(`drive-drafts/${id}`); setDrafts(current=>current.filter(item=>item.id!==id)); setError(""); } catch (e) { if (axios.isAxiosError(e) && e.response?.status === 404) { setDrafts(current=>current.filter(item=>item.id!==id)); setError("Drive not found. This draft may already have been deleted."); } else { setError(`Could not delete draft: ${collegeError(e)}`); } } }}
          manage={(id) =>
            setParams((p) => {
              p.set("drive", id);
              p.set("section", "overview");
              return p;
            })
          }
          edit={(id) =>
            setParams((p) => {
              p.set("drive", id);
              p.set("section", "settings");
              p.set("edit", "company");
              return p;
            })
          }
        />
      )}
    </div>
  );
}

function PlacementLanding({
  drives,
  allDrives,
  drafts,
  draftsError,
  overview,
  loading,
  query,
  setQuery,
  status,
  setStatus,
  type,
  setType,
  sort,
  setSort,
  refresh,
  toggleLock,
  deleteDrive,
  create,
  resumeDraft,
  deleteDraft,
  manage,
  edit,
}: {
  drives: Drive[];
  allDrives: Drive[];
  drafts: DriveDraftSummary[];
  draftsError: string;
  overview: Landing;
  loading: boolean;
  query: string;
  setQuery: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  sort: string;
  setSort: (v: string) => void;
  refresh: () => void;
  toggleLock: (drive: Drive) => void;
  deleteDrive: (drive: Drive) => void;
  create: () => void;
  resumeDraft: (id:string) => void;
  deleteDraft: (id:string) => void;
  manage: (id: string) => void;
  edit: (id: string) => void;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          icon={<BriefcaseBusiness />}
          label="Active drives"
          value={
            overview.active_drives ??
            allDrives.filter((d) => effectiveStatus(d) === "active").length
          }
          note="Currently accepting interviews"
        />
        <Kpi
          icon={<CalendarClock />}
          label="Upcoming drives"
          value={
            overview.upcoming_drives ??
            allDrives.filter((d) => effectiveStatus(d) === "scheduled").length
          }
          note="Fully configured and scheduled"
        />
        <Kpi
          icon={<Users />}
          label="Eligible candidates"
          value={
            overview.eligible_candidates ?? 0
          }
          note={overview.eligible_drive_matches == null ? "Unique students across active and scheduled drives" : `${overview.eligible_drive_matches} total drive matches`}
        />
        <Kpi
          icon={<CheckCircle2 />}
          label="Interviews completed"
          value={overview.interviews_completed ?? 0}
          note="Completed drive assignments; held-for-review results are excluded"
        />
        <Kpi
          icon={<Users />}
          label="Live interviews"
          value={overview.live_interviews ?? 0}
          note="Students actively connected now"
        />
      </div>
      {draftsError && <p role="status" className={`${card} text-sm text-amber-800 dark:text-amber-200`}>{draftsError}</p>}
      {drafts.length > 0 && <section className={`${card} space-y-4`}><div><h2 className="text-lg font-bold">Saved drive drafts</h2><p className="mt-1 text-sm text-slate-500">Continue setup where you left off. Draft details are visible only to your institution.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{drafts.map(draft=><article className="flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/20" key={draft.id}><div className="min-w-0"><span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-800 dark:bg-violet-900 dark:text-violet-100">Draft · Step {Math.min(6,draft.step+1)} of 6</span><h3 className="mt-2 truncate font-semibold">{draft.payload?.form?.company_name||"New placement drive"}</h3><p className="truncate text-sm text-slate-500">{draft.payload?.form?.role_title||"Role not added yet"} · Saved {draft.updated_at?new Date(draft.updated_at).toLocaleString():"recently"}</p></div><div className="flex shrink-0 gap-2"><button type="button" className={primary} onClick={()=>resumeDraft(draft.id)}>Continue</button><button type="button" className={button} aria-label="Delete draft" onClick={()=>deleteDraft(draft.id)}>Delete</button></div></article>)}</div></section>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Placement drives</h2>
          <p className="text-sm text-slate-500">
            Active, upcoming, draft and completed opportunities.
          </p>
        </div>
        <div className="flex gap-2">
          <button className={button} disabled={loading} onClick={refresh}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className={primary} onClick={create}>
            <Plus size={16} />
            Create drive
          </button>
        </div>
      </div>
      <div className={`${card} grid gap-3 md:grid-cols-5`}>
        <label className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 text-slate-400" size={17} />
          <input
            aria-label="Search company or role"
            className={`${input} pl-10`}
            placeholder="Search company or role"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Drive status"
          className={input}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {["draft", "scheduled", "active", "closed"].map((s) => (
            <option key={s} value={s}>
              {displayName(s)}
            </option>
          ))}
        </select>
        <select
          aria-label="Drive type"
          className={input}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">All drive types</option>
          <option value="official_placement">Official Placement</option>
          <option value="college_practice">College Practice</option>
        </select>
        <select
          aria-label="Sort drives"
          className={input}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="recent">Newest first</option>
          <option value="starting">Starting soon</option>
          <option value="ending">Ending soon</option>
          <option value="company">Company A–Z</option>
        </select>
      </div>
      {loading ? (
        <p role="status">Loading placement drives…</p>
      ) : drives.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {drives.map((d) => (
            <DriveCard
              key={d.id}
              drive={d}
              manage={() => manage(d.id)}
              edit={() => edit(d.id)}
              toggleLock={() => void toggleLock(d)}
              deleteDrive={() => void deleteDrive(d)}
            />
          ))}
        </div>
      ) : (
        <p className={card}>No placement drives match these filters.</p>
      )}
    </>
  );
}
function Kpi({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <article className={card}>
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <strong className="mt-3 block text-3xl">{value}</strong>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </article>
  );
}
function DriveCard({
  drive,
  manage,
  edit,
  toggleLock,
  deleteDrive,
}: {
  drive: Drive;
  manage: () => void;
  edit: () => void;
  toggleLock: () => void;
  deleteDrive: () => void;
}) {
  const assigned = drive.assignment_count || 0,
    completed = drive.completed_count || 0,
    progress = assigned ? Math.round((completed / assigned) * 100) : 0;
  const readable = (value?: string) => displayName(value?.replace(/_/g, " "));
  const currentStatus = effectiveStatus(drive);
  const statusTone = currentStatus === "active" ? "bg-emerald-50 text-emerald-700" : currentStatus === "scheduled" ? "bg-blue-50 text-blue-700" : currentStatus === "closed" ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-800";
  return (
    <article className={`${card} transition-shadow hover:shadow-md`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
            {readable(drive.drive_type || "official_placement")}
          </p>
          <h3 className="mt-2 break-words text-xl font-bold">{drive.company_name}</h3>
          <p className="mt-1 text-sm text-slate-600">{drive.role_title}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}>{readable(currentStatus)}</span>
          {drive.is_locked && <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Locked</span>}
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div><dt className="text-xs text-slate-500">Job type</dt><dd className="mt-1 font-medium">{readable(drive.job_type || "full_time")}</dd></div>
        <div><dt className="text-xs text-slate-500">Location</dt><dd className="mt-1 font-medium">{drive.location || "Not supplied"}</dd></div>
        <div><dt className="text-xs text-slate-500">Starts · IST</dt><dd className="mt-1 font-medium">{date(drive.window_start_at)}</dd></div>
        <div><dt className="text-xs text-slate-500">Ends · IST</dt><dd className="mt-1 font-medium">{date(drive.window_end_at)}</dd></div>
        <div><dt className="text-xs text-slate-500">Salary details</dt><dd className="mt-1 font-medium">{drive.salary_min_amount == null ? "Not specified" : `${drive.salary_currency || "INR"} ${Number(drive.salary_min_amount).toLocaleString()}${drive.salary_type === "range" && drive.salary_max_amount != null ? ` – ${Number(drive.salary_max_amount).toLocaleString()}` : ""} per ${drive.salary_period === "monthly" ? "month" : "year"}`}</dd></div>
        <div><dt className="text-xs text-slate-500">Application deadline</dt><dd className="mt-1 font-medium">{date(drive.application_deadline)}</dd></div>
        <div><dt className="text-xs text-slate-500">Latest eligibility preview</dt><dd className="mt-1 font-medium">{drive.latest_snapshot_eligible_count == null ? "Not available" : `${drive.latest_snapshot_eligible_count} eligible students`}</dd></div>
      </dl>
      <div className="mt-5 border-t border-slate-100 pt-4">
        {assigned ? <><div className="flex items-center justify-between text-xs"><span>{completed} of {assigned} assigned interviews completed</span><strong>{progress}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} /></div></> : <p className="text-sm text-slate-500">No students assigned yet.</p>}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={primary} onClick={manage}>Manage drive</button>
        <button className={button} onClick={edit}>Edit drive</button>
        <button className={`${button} ${drive.is_locked ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-amber-200 text-amber-700 hover:bg-amber-50"}`} onClick={toggleLock}>{drive.is_locked ? "Unlock drive" : "Lock drive"}</button>
        <button className={`${button} border-rose-200 text-rose-700 hover:bg-rose-50`} onClick={deleteDrive}>Delete drive</button>
      </div>
    </article>
  );
}
