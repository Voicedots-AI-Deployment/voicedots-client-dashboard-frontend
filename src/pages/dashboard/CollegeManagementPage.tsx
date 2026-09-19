import { useEffect, useMemo, useState } from "react";
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
import DriveManagement from "./DriveManagement";
import InterviewAgents from "./InterviewAgents";
import PlacementAnalytics, { type Analytics } from "./PlacementAnalytics";
import { displayName } from "./placementDisplay";

const card =
  "rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900";
const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-indigo-500 dark:border-slate-700 dark:bg-slate-900";
const button =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-slate-700";
const primary = `${button} border-indigo-600 bg-indigo-600 text-white`;
const date = (value?: string) =>
  value ? new Date(value).toLocaleString() : "Not scheduled";
type Landing = {
  active_drives?: number;
  upcoming_drives?: number;
  eligible_candidates?: number;
  interviews_completed?: number;
  completion_rate?: number;
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
      | "agents",
    driveId = params.get("drive"),
    creating = params.get("create") === "1";
  const [drives, setDrives] = useState<Drive[]>([]),
    [programs, setPrograms] = useState<Program[]>([]),
    [analytics, setAnalytics] = useState<Analytics | null>(null),
    [overview, setOverview] = useState<Landing>({}),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [version, setVersion] = useState(0),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [type, setType] = useState(""),
    [sort, setSort] = useState("recent");
  useEffect(() => {
    if (!access?.enabled) return;
    const c = new AbortController();
    Promise.all([
      collegeApi.get<Drive[]>("drives", c.signal),
      collegeApi.get<{ programs: Program[] }>("academic-catalog", c.signal),
      collegeApi.get<Analytics>("analytics", c.signal),
      collegeApi.get<Landing>("dashboard/overview", c.signal),
    ])
      .then(([d, p, a, o]) => {
        setDrives(d);
        setPrograms(p.programs);
        setAnalytics(a);
        setOverview(o);
      })
      .catch((e) => !c.signal.aborted && setError(collegeError(e)))
      .finally(() => !c.signal.aborted && setLoading(false));
    return () => c.abort();
  }, [access?.enabled, version]);
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
              ? +new Date(a.window_start_at || 0) -
                +new Date(b.window_start_at || 0)
              : sort === "ending"
                ? +new Date(a.window_end_at || 0) -
                  +new Date(b.window_end_at || 0)
                : +new Date(b.created_at || 0) - +new Date(a.created_at || 0),
        ),
    [drives, query, status, type, sort],
  );
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
      p.delete("section");
      return p;
    });
  if (creating)
    return (
      <CreateDriveWizard
        programs={programs}
        onCancel={() =>
          setParams((p) => {
            p.delete("create");
            return p;
          })
        }
        onSaved={(message) => {
          setNotice(message);
          setParams((p) => {
            p.delete("create");
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
      ) : (
        <PlacementLanding
          drives={filtered}
          allDrives={drives}
          analytics={analytics}
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
          create={() =>
            setParams((p) => {
              p.set("create", "1");
              return p;
            })
          }
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
  analytics,
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
  create,
  manage,
  edit,
}: {
  drives: Drive[];
  allDrives: Drive[];
  analytics: Analytics | null;
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
  create: () => void;
  manage: (id: string) => void;
  edit: (id: string) => void;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<BriefcaseBusiness />}
          label="Active drives"
          value={
            overview.active_drives ??
            allDrives.filter((d) => d.status === "active").length
          }
          note="Currently accepting interviews"
        />
        <Kpi
          icon={<CalendarClock />}
          label="Upcoming drives"
          value={
            overview.upcoming_drives ??
            allDrives.filter((d) => d.status === "scheduled").length
          }
          note="Fully configured and scheduled"
        />
        <Kpi
          icon={<Users />}
          label="Eligible candidates"
          value={
            overview.eligible_candidates ??
            allDrives
              .filter((d) => ["active", "scheduled"].includes(d.status))
              .reduce((n, d) => n + (d.latest_snapshot_eligible_count || 0), 0)
          }
          note="Drive-candidate matches across open drives"
        />
        <Kpi
          icon={<CheckCircle2 />}
          label="Interviews completed"
          value={
            overview.interviews_completed ??
            analytics?.summary?.completed_attempts ??
            0
          }
          note={
            overview.completion_rate == null
              ? "Completed placement interviews"
              : `${overview.completion_rate}% completion rate`
          }
        />
      </div>
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
          <option value="recent">Recently created</option>
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
              removed={refresh}
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
}: {
  drive: Drive;
  manage: () => void;
  edit: () => void;
  removed: () => void;
}) {
  const assigned = drive.assignment_count || 0,
    completed = drive.completed_count || 0,
    progress = assigned ? Math.round((completed / assigned) * 100) : 0;
  return (
    <article className={card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            {displayName(drive.drive_type || "official_placement")}
          </p>
          <h3 className="mt-2 text-lg font-bold">{drive.company_name}</h3>
          <p className="text-sm text-slate-600">{drive.role_title}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
          {displayName(drive.status)}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <p>
          <span className="text-slate-500">Job type</span>
          <br />
          {displayName(drive.job_type || "full_time")}
        </p>
        <p>
          <span className="text-slate-500">Location</span>
          <br />
          {drive.location || "Not supplied"}
        </p>
        <p>
          <span className="text-slate-500">Starts</span>
          <br />
          {date(drive.window_start_at)}
        </p>
        <p>
          <span className="text-slate-500">Ends</span>
          <br />
          {date(drive.window_end_at)}
        </p>
      </div>
      <div className="mt-5">
        <div className="flex justify-between text-xs">
          <span>
            {assigned} assigned · {completed} completed
          </span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-indigo-600"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <button className={primary} onClick={manage}>
          Manage drive
        </button>
        {["draft", "scheduled", "active"].includes(drive.status) && (
          <button className={button} onClick={edit}>
            Edit drive
          </button>
        )}
        {["draft", "closed", "cancelled"].includes(drive.status) && (
          <button className="text-rose-700" onClick={async () => {
            if (!window.confirm(`Remove ${drive.company_name} · ${drive.role_title}?`)) return;
            try { await collegeApi.remove(`drives/${drive.id}`); removed(); }
            catch (error) { window.alert(collegeError(error)); }
          }}>Delete drive</button>
        )}
      </div>
    </article>
  );
}
