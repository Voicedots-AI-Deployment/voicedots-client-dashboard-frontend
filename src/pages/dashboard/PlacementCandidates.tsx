import { useEffect, useState } from "react";
import { RefreshCw, Search, Users } from "lucide-react";
import { collegeApi, collegeError } from "@/api/collegeApi";

type PlacementCandidate = {
  id: string;
  full_name: string;
  roll_number: string;
  email: string;
  program: string;
  department_code: string;
  department_display_name?: string | null;
  batch_label?: string | null;
  graduation_year?: number | null;
  cgpa?: number | null;
  status: string;
};
type RosterResponse = { items?: PlacementCandidate[]; total?: number; limit?: number; offset?: number };

const pageSize = 25;
const field = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-indigo-500 dark:border-slate-700 dark:bg-slate-900";
const button = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700";

export default function PlacementCandidates() {
  const [students, setStudents] = useState<PlacementCandidate[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset), sort: "roll_number", order: "asc" });
    if (appliedSearch.trim()) params.set("q", appliedSearch.trim());
    collegeApi.get<RosterResponse>(`students?${params.toString()}`, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        setStudents(Array.isArray(result.items) ? result.items : []);
        setTotal(Number.isFinite(result.total) ? Number(result.total) : 0);
      })
      .catch(reason => { if (!controller.signal.aborted) setError(collegeError(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [offset, appliedSearch, refreshVersion]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOffset(0);
    setAppliedSearch(search);
  };

  return <section className="space-y-5" aria-labelledby="placement-candidates-heading">
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Your assigned student groups</p>
      <h2 id="placement-candidates-heading" className="mt-1 text-2xl font-bold">Candidates</h2>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">Students in the academic groups assigned to you by your Client. This list includes all students in your groups, whether or not they currently match a placement drive.</p>
    </header>

    <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <label className="min-w-56 flex-1 text-sm font-medium">Search assigned students<input className={`${field} mt-1`} value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, student ID or email" /></label>
      <button className={button} type="submit" disabled={loading}><Search size={16} />Search</button>
      <button className={button} type="button" onClick={() => setRefreshVersion(version => version + 1)} disabled={loading} aria-label="Refresh candidates"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button>
    </form>

    {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"><p>{error}</p><button type="button" className="mt-2 font-semibold underline" onClick={() => setRefreshVersion(version => version + 1)}>Try again</button></div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center gap-2"><Users size={18} className="text-indigo-600" /><h3 className="font-semibold">Assigned students</h3></div>
        <p aria-live="polite" className="text-sm text-slate-500">{loading ? "Loading students…" : `${total} student${total === 1 ? "" : "s"} in your assigned groups`}</p>
      </div>
      {loading ? <div role="status" className="p-10 text-center text-sm text-slate-500">Loading your assigned students…</div> : error ? null : students.length === 0 ? <div className="p-10 text-center"><Users size={24} className="mx-auto text-slate-400" /><p className="mt-3 font-semibold">{appliedSearch ? "No students match this search" : "No students in your assigned groups yet"}</p><p className="mt-1 text-sm text-slate-500">Ask your Client to review your assigned student groups if you expected to see students here.</p></div> : <>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Program</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Batch</th><th className="px-4 py-3">Graduation</th><th className="px-4 py-3">CGPA</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{students.map(student => <tr key={student.id}>
              <td className="px-4 py-3"><p className="font-semibold">{student.full_name}</p><p className="text-xs text-slate-500">{student.roll_number} · {student.email}</p></td>
              <td className="px-4 py-3">{student.program || "—"}</td>
              <td className="px-4 py-3">{student.department_display_name || student.department_code || "—"}</td>
              <td className="px-4 py-3">{student.batch_label || "—"}</td>
              <td className="px-4 py-3">{student.graduation_year || "—"}</td>
              <td className="px-4 py-3">{student.cgpa ?? "—"}</td>
              <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{student.status}</span></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm dark:border-slate-800">
          <span className="text-slate-500">Showing {offset + 1}–{Math.min(offset + students.length, total)} of {total}</span>
          <div className="flex gap-2"><button type="button" className={button} disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - pageSize))}>Previous</button><button type="button" className={button} disabled={loading || offset + pageSize >= total} onClick={() => setOffset(offset + pageSize)}>Next</button></div>
        </div>
      </>}
    </div>
  </section>;
}
