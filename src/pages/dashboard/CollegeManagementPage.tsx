import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  LayoutGrid,
  Table2,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
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
import PlacementCandidates from "./PlacementCandidates";
import StaffImport from "./StaffImport";
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
  if (["cancelled", "draft", "closed"].includes(drive.status)) return drive.status;
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
  const { user } = useAuth();
  const placementStaff = user?.portal_role === "placement_staff";
  const {
    access,
    loading: accessLoading,
    error: accessError,
    retry,
  } = useCollegeAccess();
  const [params, setParams] = useSearchParams();
  const requestedTab = (params.get("view") || "placements") as
      | "placements"
      | "analytics"
      | "agents"
      | "settings"
      | "staff"
      | "candidates";
  const tab = (placementStaff && requestedTab === "staff") || (!placementStaff && requestedTab === "candidates") ? "placements" : requestedTab,
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
  useEffect(() => {
    if (!access?.enabled || driveId || creating || tab !== "placements") return;
    const controller = new AbortController();
    let pending = false;
    const refreshOverview = async () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const value = await collegeApi.get<Landing>("dashboard/overview", controller.signal);
        if (!controller.signal.aborted && isApiObject(value)) setOverview(value);
      } catch { /* Keep the last successful counts; manual refresh reports failures. */ }
      finally { pending = false; }
    };
    const timer = window.setInterval(() => void refreshOverview(), 15000);
    document.addEventListener("visibilitychange", refreshOverview);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", refreshOverview); };
  }, [access?.enabled, driveId, creating, tab]);
  const filtered = useMemo(
    () =>
      drives
        .filter(
          (d) =>
            (!query ||
              `${d.company_name} ${d.role_title}`
                .toLowerCase()
                .includes(query.toLowerCase())) &&
            (!status || effectiveStatus(d) === status) &&
            (!type || d.drive_type === type),
        )
        .sort((a, b) =>
          sort === "company"
            ? a.company_name.localeCompare(b.company_name)
            : sort === "starting"
              ? compareAscendingDates(a.window_start_at, b.window_start_at)
              : sort === "ending"
                ? compareAscendingDates(a.window_end_at, b.window_end_at)
                : (({active:0,scheduled:1,closed:2,draft:3,cancelled:4}[effectiveStatus(a)] ?? 5) - ({active:0,scheduled:1,closed:2,draft:3,cancelled:4}[effectiveStatus(b)] ?? 5)) || compareDates(a.window_start_at, b.window_start_at) || compareDates(a.created_at, b.created_at),
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
  async function deleteSavedDraft(id: string) {
    const draft = drafts.find(item => item.id === id);
    const clearLocal = () => {
      const local = localDraftSummary();
      if (id === "local-device" || (draft?.client_draft_key && draft.client_draft_key === local?.client_draft_key)) {
        localStorage.removeItem("voicedots:placement-drive-draft:v2");
      }
      setDrafts(current => current.filter(item => item.id !== id));
    };
    try {
      if (id !== "local-device") await collegeApi.remove(`drive-drafts/${id}`);
      clearLocal(); setError("");
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        clearLocal(); setError("Drive not found. This draft may already have been deleted.");
      } else setError(`Could not delete draft: ${collegeError(e)}`);
    }
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
            ["analytics", "Analytics"], ["agents", "Interview Agents"], ["settings", "Settings"],
            ...(placementStaff ? [["candidates", "Candidates"]] as const : []),

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
      {tab === "candidates" && placementStaff ? (
        <PlacementCandidates />
      ) : tab === "staff" && !placementStaff ? (
        <Navigate to="/dashboard/attendance" replace />
      ) : tab === "analytics" ? (
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
          deleteDraft={deleteSavedDraft}
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

type PlacementStaffScopeGroup = { program?: string | null; department_code?: string | null; batch_label?: string | null; graduation_year?: number | null };
type StaffScopeSelection = { programs: string[]; department_codes: string[]; batch_labels: string[]; graduation_years: number[] };
type StudentCohort = { program: string; department_code: string; batch_label: string | null; graduation_year: number | null; student_count: number };
type PlacementStaffOptions = { programs: Program[]; graduation_years: number[]; batches: string[]; student_groups?: StudentCohort[] };
type PlacementStaffMember = { user_id: string; name: string; email: string; status: "invited" | "active" | "disabled"; created_at?: string | null; scope_groups: PlacementStaffScopeGroup[] };
const emptyScopeGroup = (): StaffScopeSelection => ({ programs: [], department_codes: [], batch_labels: [], graduation_years: [] });
const selectionFromScopeGroup = (group: PlacementStaffScopeGroup): StaffScopeSelection => ({
  programs: group.program ? [group.program] : [],
  department_codes: group.department_code ? [group.department_code] : [],
  batch_labels: group.batch_label ? [group.batch_label] : [],
  graduation_years: group.graduation_year ? [group.graduation_year] : [],
});
const expandScopeGroups = (groups: StaffScopeSelection[], catalog: Program[] = []): PlacementStaffScopeGroup[] => groups.flatMap(group => {
  const programs: (string | null)[] = group.programs.length ? group.programs : [null];
  const batches = group.batch_labels.length ? group.batch_labels : [null];
  const years = group.graduation_years.length ? group.graduation_years : [null];
  return programs.flatMap(program => {
    const configured = program ? catalog.find(item => item.code === program)?.departments || [] : [];
    let departments: (string | null)[];
    if (!group.department_codes.length || (program && !configured.length)) departments = [null];
    else if (program) departments = group.department_codes.filter(code => configured.some(item => item.code === code));
    else departments = group.department_codes;
    return departments.flatMap(department_code => batches.flatMap(batch_label => years.map(graduation_year => ({
      program, department_code, batch_label, graduation_year,
    }))));
  });
});
const hasCompleteScopeGroups = (groups: StaffScopeSelection[]) => groups.length > 0 && groups.every(group => Boolean(group.programs.length || group.department_codes.length || group.batch_labels.length || group.graduation_years.length));
const hasSupportedScopeGroupCount = (groups: StaffScopeSelection[], catalog: Program[] = []) => expandScopeGroups(groups, catalog).length <= 100;
const currentStudentsInScope = (groups: PlacementStaffScopeGroup[] | undefined, cohorts: StudentCohort[] | undefined) => {
  if (!cohorts) return null;
  const matched = new Map<string, number>();
  for (const group of groups || []) for (const cohort of cohorts) {
    if ((group.program == null || group.program === cohort.program) &&
        (group.department_code == null || group.department_code === cohort.department_code) &&
        (group.batch_label == null || group.batch_label === cohort.batch_label) &&
        (group.graduation_year == null || group.graduation_year === cohort.graduation_year)) {
      matched.set(`${cohort.program}|${cohort.department_code}|${cohort.batch_label}|${cohort.graduation_year}`, cohort.student_count);
    }
  }
  return [...matched.values()].reduce((total, count) => total + count, 0);
};

export function PlacementStaffManagement({ mode = "all" }: { mode?: "all" | "roster" | "access" }) {
  const [staff, setStaff] = useState<PlacementStaffMember[]>([]);
  const [options, setOptions] = useState<PlacementStaffOptions>({ programs: [], graduation_years: [], batches: [] });
  const [scopeGroups, setScopeGroups] = useState<StaffScopeSelection[]>([emptyScopeGroup()]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editGroups, setEditGroups] = useState<StaffScopeSelection[]>([]);
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false); const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const load = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true); setError("");
    try {
      const result = await collegeApi.get<{staff?: PlacementStaffMember[]; options?: PlacementStaffOptions}>(forceRefresh ? `staff?refresh=${Date.now()}` : "staff");
      setStaff(Array.isArray(result.staff) ? result.staff.filter(person => person.status !== "disabled") : []);
      const next = result.options || { programs: [], graduation_years: [], batches: [] };
      const [catalog, roster] = await Promise.allSettled([collegeApi.get<{programs?: Program[]; graduation_years?: number[]}>("academic-catalog"), collegeApi.get<{batches?: string[]; graduation_years?: number[]}>("roster-options")]);
      if (!next.programs.length && catalog.status === "fulfilled") next.programs = catalog.value.programs || [];
      if (!next.graduation_years.length && catalog.status === "fulfilled") next.graduation_years = catalog.value.graduation_years || [];
      if (!next.batches.length && roster.status === "fulfilled") next.batches = roster.value.batches || [];
      if (!next.graduation_years.length && roster.status === "fulfilled") next.graduation_years = roster.value.graduation_years || [];
      setOptions(next);
    } catch (cause) { setError(collegeError(cause)); } finally { if (forceRefresh) setRefreshing(false); }
  };
  useEffect(() => { void load(); }, []);
  const invite = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const groups = mode === "all" ? expandScopeGroups(scopeGroups, options.programs) : [];
      const result = await collegeApi.save<{email_queued?: boolean;restored?:boolean}>("staff", { full_name: name.trim(), email: email.trim(), scope_groups: groups });
      setNotice(result.restored ? "Previous placement access restored." : result.email_queued ? "Invitation sent." : "Staff account created.");
      setName(""); setEmail(""); setScopeGroups([emptyScopeGroup()]); await load();
    } catch (cause) { setError(collegeError(cause)); } finally { setBusy(false); }
  };
  const saveScope = async (person: PlacementStaffMember) => {
    setBusy(true); setError(""); setNotice("");
    try { await collegeApi.save(`staff/${person.user_id}`, { scope_groups: expandScopeGroups(editGroups, options.programs) }, true); setNotice(`Student access updated for ${person.name}.`); setEditing(null); await load(); }
    catch (cause) { setError(collegeError(cause)); } finally { setBusy(false); }
  };
  const revoke = async (person: PlacementStaffMember) => {
    if (!window.confirm(`Remove ${person.name} from the placement staff roster? Their placement login will be revoked. Historical records will be retained.`)) return;
    setBusy(true); setError(""); setNotice("");
    try { await collegeApi.remove(`staff/${person.user_id}`); setNotice(`${person.name} was removed from the placement staff roster.`); await load(); }
    catch (cause) { setError(collegeError(cause)); } finally { setBusy(false); }
  };
  const accessMode = mode === "access";
  return <section className="space-y-5">
    <header><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Institution management</p><h2 className="mt-1 text-2xl font-bold">{accessMode ? "Access Control" : "Staff Roster"}</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">{accessMode ? "Choose a placement staff member and set the student groups they can access. Selections are OR within each field and AND across fields." : "Invite and manage placement staff. Access is assigned separately in Access Control."}</p></header>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}{error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
    {!accessMode && <><StaffImport onComplete={() => void load(true)} /><form onSubmit={invite} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Full name<input required maxLength={150} value={name} onChange={e => setName(e.target.value)} className={input} placeholder="Placement coordinator" /></label><label className="text-sm font-medium">Work email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={input} placeholder="name@institution.edu" /></label></div>{mode === "all" && <StaffScopeEditor groups={scopeGroups} setGroups={setScopeGroups} options={options} />}<div className="flex justify-end"><button className={primary} disabled={busy}>{busy ? "Working…" : "Invite staff"}</button></div></form></>}
    {accessMode && staff.length > 0 && <label className="block max-w-xl text-sm font-medium">Placement staff member<select aria-label="Placement staff member" className={input} value={editing || ""} onChange={event => { const id = event.target.value; setEditing(id || null); const person = staff.find(item => item.user_id === id); setEditGroups(person?.scope_groups?.length ? person.scope_groups.map(selectionFromScopeGroup) : [emptyScopeGroup()]); }}><option value="">Select staff member</option>{staff.map(person => <option key={person.user_id} value={person.user_id}>{person.name} · {person.email}</option>)}</select></label>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between border-b p-5 dark:border-slate-800"><div><h3 className="font-semibold">{accessMode ? "Select staff member" : "Placement staff"}</h3><p className="mt-1 text-sm text-slate-500">{staff.length} active or invited</p></div><button type="button" aria-label="Refresh staff roster" className={button} disabled={busy || refreshing} onClick={() => void load(true)}><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />{refreshing ? "Refreshing…" : "Refresh"}</button></div>
      {staff.length ? <ul className="divide-y dark:divide-slate-800">{staff.map(person => <li key={person.user_id} className="space-y-3 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{person.name}</p><p className="text-sm text-slate-500">{person.email}</p>{accessMode && (() => { const count = currentStudentsInScope(person.scope_groups, options.student_groups); return <p className="mt-2 text-xs text-slate-500">{person.scope_groups?.length ? `${person.scope_groups.length} access rule${person.scope_groups.length === 1 ? "" : "s"}` : "No student access assigned"}{count !== null ? ` · ${count} matching students` : ""}</p>; })()}</div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${person.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{person.status === "active" ? "Active" : "Invitation pending"}</span>{accessMode && <button className={button} disabled={busy} onClick={() => { setEditing(editing === person.user_id ? null : person.user_id); setEditGroups(person.scope_groups?.length ? person.scope_groups.map(selectionFromScopeGroup) : [emptyScopeGroup()]); }}>{editing === person.user_id ? "Close" : "Manage access"}</button>}{mode !== "access" && <button className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50" disabled={busy} onClick={() => void revoke(person)}>Remove staff</button>}</div></div>{accessMode && editing === person.user_id && <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4"><StaffScopeEditor groups={editGroups} setGroups={setEditGroups} options={options}/>{hasCompleteScopeGroups(editGroups) && !hasSupportedScopeGroupCount(editGroups, options.programs) && <p role="alert" className="mt-3 text-sm text-rose-700">Reduce the selections; this staff member can have at most 100 access rules.</p>}<div className="mt-3 flex justify-end"><button type="button" className={primary} disabled={busy || !hasCompleteScopeGroups(editGroups) || !hasSupportedScopeGroupCount(editGroups, options.programs)} onClick={() => void saveScope(person)}>{busy ? "Saving…" : "Save Access"}</button></div></div>}</li>)}</ul> : <p className="p-8 text-center text-sm text-slate-500">No placement staff have been invited yet.</p>}</div>
  </section>;
}

function StaffScopeEditor({ groups, setGroups, options }: { groups: StaffScopeSelection[]; setGroups: React.Dispatch<React.SetStateAction<StaffScopeSelection[]>>; options: PlacementStaffOptions }) {
  const setField = <K extends keyof StaffScopeSelection>(index: number, field: K, value: StaffScopeSelection[K]) => setGroups(current => current.map((group, i) => i === index ? { ...group, [field]: value } : group));
  const matchingCohorts = (group: StaffScopeSelection, ignore?: keyof StaffScopeSelection) => (options.student_groups || []).filter(cohort =>
    (ignore === "programs" || !group.programs.length || group.programs.includes(cohort.program)) &&
    (ignore === "department_codes" || !group.department_codes.length || group.department_codes.includes(cohort.department_code)) &&
    (ignore === "batch_labels" || !group.batch_labels.length || cohort.batch_label !== null && group.batch_labels.includes(cohort.batch_label)) &&
    (ignore === "graduation_years" || !group.graduation_years.length || cohort.graduation_year !== null && group.graduation_years.includes(cohort.graduation_year)),
  );
  return <section className="space-y-3" aria-label="Student access groups">
    <div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-sm font-semibold">Student access groups</h3><p className="mt-1 text-xs text-slate-500">Groups are alternatives. Within each group, selected values in a filter are alternatives and different filters are combined. Each group needs at least one filter.</p></div><button type="button" className={button} onClick={() => setGroups(current => [...current, emptyScopeGroup()])}>Add group</button></div>
    {groups.map((group, index) => {
      const selectedPrograms = options.programs.filter(program => group.programs.includes(program.code));
      const programDepartments = selectedPrograms.flatMap(program => program.departments);
      const departments = (group.programs.length ? programDepartments : options.programs.flatMap(program => program.departments)).filter((department, i, all) => all.findIndex(item => item.code === department.code) === i);
      const cohorts = options.student_groups || [];
      const batchRows = cohorts.length ? matchingCohorts(group, "batch_labels") : [];
      const yearRows = cohorts.length ? matchingCohorts(group, "graduation_years") : [];
      const batchOptions = cohorts.length ? [...new Set(batchRows.flatMap(row => row.batch_label ? [row.batch_label] : []))] : options.batches;
      const yearOptions = cohorts.length ? [...new Set(yearRows.flatMap(row => row.graduation_year ? [row.graduation_year] : []))].sort((a,b) => a-b) : options.graduation_years;
      const matchingCount = cohorts.length ? matchingCohorts(group).reduce((sum, row) => sum + row.student_count, 0) : null;
      return <div className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 xl:grid-cols-[1.1fr_1.1fr_1fr_0.8fr_auto] dark:border-slate-700" key={index}>
        <ScopeMultiSelect label="Program" anyLabel="Any program" options={options.programs.map(program => ({ value: program.code, label: program.display_name }))} values={group.programs} onChange={values => { const validDepartments = options.programs.filter(program => values.includes(program.code)).flatMap(program => program.departments.map(department => department.code)); setGroups(current => current.map((item, i) => i === index ? { ...item, programs: values, department_codes: values.length ? item.department_codes.filter(code => validDepartments.includes(code)) : [], batch_labels: [], graduation_years: [] } : item)); }} />
        {group.programs.length > 0 && departments.length > 0 && <ScopeMultiSelect label="Department" anyLabel="Any department" options={departments.map(department => ({ value: department.code, label: department.display_name }))} values={group.department_codes} onChange={values => setGroups(current => current.map((item, i) => i === index ? { ...item, department_codes: values, batch_labels: [], graduation_years: [] } : item))} />}
        <ScopeMultiSelect label="Batch" anyLabel="Any batch" options={batchOptions.map(batch => ({ value: batch, label: batch }))} values={group.batch_labels} onChange={values => setGroups(current => current.map((item, i) => i === index ? { ...item, batch_labels: values, graduation_years: [] } : item))} />
        <ScopeMultiSelect label="Graduation year" anyLabel="Any year" options={yearOptions.map(year => ({ value: String(year), label: String(year) }))} values={group.graduation_years.map(String)} onChange={values => setField(index, "graduation_years", values.map(Number))} />
        <button type="button" className="self-end rounded-lg border border-rose-200 px-3 py-2.5 text-xs font-semibold text-rose-700 disabled:opacity-50" disabled={groups.length <= 1} onClick={() => setGroups(current => current.filter((_, i) => i !== index))}>Remove</button>
        {matchingCount !== null && <p className={`text-xs sm:col-span-2 xl:col-span-5 ${matchingCount ? "text-emerald-700" : "text-amber-700"}`} role={matchingCount ? undefined : "status"}>{matchingCount ? `${matchingCount} current student${matchingCount === 1 ? "" : "s"} match this group.` : "No current students match this exact combination. Choose a batch and graduation year shown for the selected program and department, or clear a filter."}</p>}
      </div>;
    })}
  </section>;
}

function ScopeMultiSelect({ label, anyLabel, options, values, onChange }: { label: string; anyLabel: string; options: { value: string; label: string }[]; values: string[]; onChange: (values: string[]) => void }) {
  const summary = !values.length ? anyLabel : values.length === 1 ? options.find(option => option.value === values[0])?.label || values[0] : `${values.length} selected`;
  return <fieldset className="min-w-0 text-xs font-medium text-slate-600">
    <legend>{label}</legend>
    <details name="staff-scope-select" className="group relative mt-1">
      <summary aria-label={label} className={`${input} flex min-h-[42px] cursor-pointer list-none items-center justify-between gap-2 pr-3 text-sm font-normal text-slate-800 [&::-webkit-details-marker]:hidden dark:text-slate-100`}><span className="truncate">{summary}</span><span aria-hidden="true" className="text-slate-400">⌄</span></summary>
      <div className="mt-1 max-h-40 w-full min-w-56 overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="px-2 py-1.5 text-[11px] font-normal text-slate-500">Leave all unchecked for {anyLabel.toLowerCase()}.</p>
        {options.length ? options.map(option => <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs font-normal hover:bg-indigo-50 dark:hover:bg-slate-800"><input type="checkbox" checked={values.includes(option.value)} onChange={event => onChange(event.target.checked ? [...values, option.value] : values.filter(value => value !== option.value))} /><span>{option.label}</span></label>) : <p className="px-2 py-2 text-xs font-normal text-slate-500">No options available.</p>}
        {values.length > 0 && <button type="button" className="m-2 text-xs font-semibold text-indigo-600" onClick={() => onChange([])}>Clear selection</button>}
      </div>
    </details>
  </fieldset>;
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
  const [driveView, setDriveView] = useState<"cards" | "table">("cards");
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
      {drafts.length > 0 && <section className={`${card} space-y-4`}><div><h2 className="text-lg font-bold">Saved drive drafts</h2><p className="mt-1 text-sm text-slate-500">Continue setup where you left off. Draft details are visible only to your institution.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{drafts.map(draft=><article className="flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/20" key={draft.id}><div className="min-w-0"><span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-800 dark:bg-violet-900 dark:text-violet-100">Draft · Step {Math.min(6,draft.step+1)} of 6</span><h3 className="mt-2 truncate font-semibold">{draft.payload?.form?.company_name||"New placement drive"}</h3><p className="truncate text-sm text-slate-500">{draft.payload?.form?.role_title||"Role not added yet"} · Saved {draft.updated_at?formatPlacementDateTime(draft.updated_at):"recently"}</p></div><div className="flex shrink-0 gap-2"><button type="button" className={primary} onClick={()=>resumeDraft(draft.id)}>Continue</button><button type="button" className={button} aria-label="Delete draft" onClick={()=>deleteDraft(draft.id)}>Delete</button></div></article>)}</div></section>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Placement drives</h2>
          <p className="text-sm text-slate-500">
            Active, upcoming, draft and completed opportunities.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex shrink-0" role="group" aria-label="Drive view">
            <button type="button" className={`${button} ${driveView === "cards" ? "bg-violet-50 text-violet-700" : ""}`} aria-pressed={driveView === "cards"} onClick={() => setDriveView("cards")}><LayoutGrid size={16}/>Cards</button>
            <button type="button" className={`${button} ${driveView === "table" ? "bg-violet-50 text-violet-700" : ""}`} aria-pressed={driveView === "table"} onClick={() => setDriveView("table")}><Table2 size={16}/>Table</button>
          </div>
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
          <option value="recent">Active first · latest interview</option>
          <option value="starting">Starting soon</option>
          <option value="ending">Ending soon</option>
          <option value="company">Company A–Z</option>
        </select>
      </div>
      {loading ? (
        <p role="status">Loading placement drives…</p>
      ) : drives.length ? driveView === "table" ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[1000px] text-left text-sm" aria-label="Placement drives">
            <thead className="bg-violet-50 text-xs text-slate-500 dark:bg-slate-800"><tr>{["Company & role", "Status", "Interview window · IST", "Eligible", "Completed", "Actions"].map(title => <th key={title} scope="col" className="px-5 py-3 font-medium">{title}</th>)}</tr></thead>
            <tbody>{drives.map(d => <tr key={d.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-5 py-4"><span className="block font-medium">{d.company_name}</span><span className="text-slate-500">{d.role_title}</span></td>
              <td className="px-5 py-4">{displayName(effectiveStatus(d))}{d.is_locked && <span className="mt-1 block text-xs text-slate-500">Locked</span>}</td>
              <td className="px-5 py-4"><span className="block">{date(d.window_start_at)}</span><span className="text-xs text-slate-500">to {date(d.window_end_at)}</span></td>
              <td className="px-5 py-4">{d.latest_snapshot_eligible_count ?? "—"}</td>
              <td className="px-5 py-4">{d.completed_count || 0} / {d.assignment_count || 0}</td>
              <td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button className={primary} onClick={() => manage(d.id)}>Manage drive</button><button className={button} onClick={() => edit(d.id)}>Edit drive</button><button className={button} onClick={() => toggleLock(d)}>{d.is_locked ? "Unlock drive" : "Lock drive"}</button><button className={`${button} text-rose-700`} onClick={() => deleteDrive(d)}>Delete drive</button></div></td>
            </tr>)}</tbody>
          </table>
        </div>
      ) : (
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
            {readable(drive.drive_type || "official_placement")} · {drive.created_by_source === "placement_staff" ? "Staff-created" : "Client/admin official"}
          </p>
          <h3 className="mt-2 break-words text-xl font-bold">{drive.company_name}</h3>
          <p className="mt-1 text-sm text-slate-600">{drive.role_title}</p>
          {drive.created_by_full_name && <p className="mt-1 text-xs text-slate-500">Created by {drive.created_by_full_name}</p>}
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
        <div><dt className="text-xs text-slate-500">Met drive criteria at last evaluation</dt><dd className="mt-1 font-medium">{drive.latest_snapshot_eligible_count == null ? "Not available" : `${drive.latest_snapshot_eligible_count} students`}</dd></div>
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
