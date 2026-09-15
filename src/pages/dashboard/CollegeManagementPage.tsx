import {QueryClient,useQuery} from '@tanstack/react-query';
import StudentRosterTable from './StudentRosterTable';
import StudentImport from './StudentImport';
import { PhotoEditor } from './AttendancePage';
import PlacementAnalytics, {type Analytics} from './PlacementAnalytics';
import PlacementChoices from './PlacementChoices';
import {displayName} from './placementDisplay';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowUpRight, BriefcaseBusiness, GraduationCap, Plus, RefreshCw, Users, X } from 'lucide-react';
import { collegeApi, collegeError, type CollegeStudent, type Drive, type Program } from '@/api/collegeApi';
import { useCollegeAccess } from '@/hooks/useCollegeAccess';

const card = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const input = 'mt-1.5 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-slate-700';
const primary = `${button} border-indigo-600 bg-indigo-600 text-white`;
const formatDate = (value?: string) => value ? new Date(value).toLocaleString() : 'Not scheduled';
function localDate(value?: string) { if (!value) return ''; const d = new Date(value); if (!Number.isFinite(d.getTime())) return ''; return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
function Badge({ children }: { children: ReactNode }) { return <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">{typeof children === 'string' ? displayName(children) : children}</span>; }
function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) { return <label className={`block min-w-0 text-sm font-medium ${wide ? 'sm:col-span-2' : ''}`}>{label}{children}</label>; }
function Modal({ title, close, children, busy }: { title: string; close: () => void; children: ReactNode; busy: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current!; el.showModal(); return () => el.close(); }, []);
  return <dialog ref={ref} aria-labelledby="college-modal-title" onCancel={e => { if (busy) e.preventDefault(); else close(); }} className={`${card} m-auto max-h-[90dvh] w-[calc(100%_-_24px)] max-w-[720px] overflow-y-auto p-5 text-slate-900 backdrop:bg-slate-950/50 sm:p-7 dark:text-white`}>
    <div className="mb-6 flex items-center justify-between gap-4"><h2 id="college-modal-title" className="text-xl font-bold">{title}</h2><button type="button" className={button} aria-label="Close form" disabled={busy} onClick={close}><X size={18} /></button></div>{children}</dialog>;
}

export default function CollegeManagementPage() {
  const { access, loading: accessLoading, error: accessError, retry } = useCollegeAccess();
  const [tab, setTab] = useState<'drives' | 'students' | 'academic' | 'analytics'>('drives');
  const [drives, setDrives] = useState<Drive[]>([]), [programs, setPrograms] = useState<Program[]>([]);
  const [offset, setOffset] = useState(0), [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [version, setVersion] = useState(0);
  const [driveForm, setDriveForm] = useState<Drive | 'new' | null>(null), [studentForm, setStudentForm] = useState<CollegeStudent | 'new' | null>(null);
  const [formError, setFormError] = useState('');
  const [studentProgram, setStudentProgram] = useState('');
  const [filters,setFilters]=useState<Record<string,string>>({});
  const [options,setOptions]=useState<{batches:string[];graduation_years:number[];statuses:string[]}>({batches:[],graduation_years:[],statuses:[]});
  const [queryClient]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:1,staleTime:15000}}}));
  const [analytics,setAnalytics]=useState<Analytics|null>(null);
  const [drivePrograms,setDrivePrograms]=useState<string[]>([]), [driveDepartments,setDriveDepartments]=useState<string[]>([]), [driveYears,setDriveYears]=useState<string[]>([]);
  const rosterQuery=new URLSearchParams(Object.entries(filters).filter(([,v])=>v)).toString();
  function changeFilter(key:string,value:string){setOffset(0);setFilters(f=>({...f,[key]:value,...(key==='program'?{department:''}:{})}));}
  function startDrive(d:Drive|'new') {setDriveForm(d);setDrivePrograms(d==='new'?[]:d.criteria_programs||[]);setDriveDepartments(d==='new'?[]:d.criteria_department_codes||[]);setDriveYears(d==='new'?[]:(d.criteria_graduation_years||[]).map(String));}

  const refresh = () => setVersion(v => v + 1);
  useEffect(() => {
    if (!access?.enabled) return;
    const controller = new AbortController(); setLoading(true); setError('');
    Promise.all([
      collegeApi.get<Drive[]>('drives', controller.signal),
      collegeApi.get<{ programs: Program[] }>('academic-catalog', controller.signal),
      collegeApi.get<typeof options>('roster-options', controller.signal),
      collegeApi.get<Analytics>('analytics', controller.signal),
    ]).then(([driveData, catalog, rosterOptions, metrics]) => {
      if (!controller.signal.aborted) { setDrives(driveData); setPrograms(catalog.programs); setOptions(rosterOptions); setAnalytics(metrics); }
    }).catch(e => { if (!controller.signal.aborted) setError(collegeError(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [access?.enabled, version]);
  const roster=useQuery({queryKey:['student-roster',access?.college_id,query,rosterQuery,offset,version],enabled:!!access?.enabled,
    queryFn:({signal})=>collegeApi.get<{items:CollegeStudent[];total:number}>(`students?limit=25&offset=${offset}&q=${encodeURIComponent(query)}&${rosterQuery}`,signal),
    placeholderData:(previous,previousQuery)=>previousQuery?.queryKey[1]===access?.college_id?previous:undefined},queryClient);
  const students=roster.data?.items||[],total=roster.data?.total||0,rosterLoading=roster.isFetching;

  async function act(path: string, payload: unknown, edit = false) {
    setBusy(true); setError(''); setNotice('');
    try { const result = await collegeApi.save<{ warnings?: string[] }>(path, payload, edit); setNotice(result.warnings?.length ? result.warnings.join(' ') : 'Changes saved. Student visibility follows the drive status and eligibility rules.'); refresh(); }
    catch (e) { setError(collegeError(e)); } finally { setBusy(false); }
  }
  async function saveDrive(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setFormError('');
    const current = driveForm && driveForm !== 'new' ? driveForm : null;
    const start = new Date(String(f.get('window_start'))), end = new Date(String(f.get('window_end')));
    if (!(end > start)) { setFormError('The interview end must be later than the start.'); setBusy(false); return; }
    const payload: Record<string, unknown> = {
      company_name: String(f.get('company_name')).trim(), role_title: String(f.get('role_title')).trim(), job_type: String(f.get('job_type')), location: String(f.get('location')).trim(),
      window_start: start.toISOString(), window_end: end.toISOString(), min_cgpa: Number(f.get('min_cgpa')),
      eligible_programs: drivePrograms, eligible_departments: driveDepartments, eligible_graduation_years: driveYears.map(Number), interview_duration_minutes: Number(f.get('duration')),
    };
    if (!drivePrograms.length || !driveDepartments.length || !driveYears.length) {setFormError('Select eligible programs, departments and graduation years.');setBusy(false);return;}
    const jd = String(f.get('jd_text')).trim();
    if (!current || jd !== current.jd_raw_text?.trim()) payload.jd_text = jd;
    try {
      const result = await collegeApi.save<{ status?: string; warnings?: string[] }>(current ? `drives/${current.id}` : 'drives', payload, !!current);
      setDriveForm(null); setNotice([`Drive saved${result.status ? ` (${result.status})` : ''}.`, ...(result.warnings || [])].join(' ')); refresh();
    } catch (err) { setFormError(collegeError(err)); } finally { setBusy(false); }
  }
  async function editDrive(id: string) {
    setBusy(true); setError('');
    try { startDrive(await collegeApi.get<Drive>(`drives/${id}`)); setFormError(''); } catch (e) { setError(collegeError(e)); } finally { setBusy(false); }
  }
  async function saveStudent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setFormError('');
    const current = studentForm && studentForm !== 'new' ? studentForm : null;
    const payload = { full_name: f.get('full_name'), roll_number: f.get('roll_number'), email: f.get('email'), phone: f.get('phone'), program: studentProgram, department_code: f.get('department'), graduation_year: Number(f.get('year')), cgpa: Number(f.get('cgpa')), status: f.get('status') };
    try {
      let photo: string | undefined;
      if (!current) {
        const file = f.get('photo');
        if (!(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024) throw new Error('Choose a student photo up to 2 MB.');
        photo = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read the student photo.')); reader.readAsDataURL(file); });
      }
      await collegeApi.save(current ? `students/${current.id}` : 'students', { ...payload, ...(photo ? { photo } : {}) }, !!current); setStudentForm(null); setNotice(current ? 'Student updated.' : 'Student added. They can set up their password on the student portal using their email and roll number.'); refresh(); }
    catch (err) { setFormError(err instanceof Error && !('isAxiosError' in err) ? err.message : collegeError(err)); } finally { setBusy(false); }
  }
  if (accessLoading) return <p role="status" className="p-8 text-slate-500">Loading placement workspace…</p>;
  if (accessError) return <div role="alert" className={`${card} p-8`}><p>{accessError}</p><button className={`${button} mt-4`} onClick={retry}>Retry</button></div>;
  if (!access?.enabled) return <section className={`${card} max-w-2xl p-8 text-slate-900 dark:text-white`}><GraduationCap className="mb-4 text-indigo-600" size={36} /><h1 className="text-2xl font-bold">Placement management</h1><p className="mt-3 text-sm leading-6 text-slate-500">Placement management is not enabled for your account. Contact VoiceDots to connect your workspace and grant management access.</p></section>;
  const currentDrive = driveForm && driveForm !== 'new' ? driveForm : null;
  const currentStudent = studentForm && studentForm !== 'new' ? studentForm : null;
  return <div className="space-y-6 text-slate-900 dark:text-slate-100">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-xs font-semibold text-indigo-600">{displayName(access.college_name)}</p><h1 className="text-3xl font-bold tracking-tight">Placement management</h1><p className="mt-2 text-sm text-slate-500">Manage your students and bring their next opportunity into view.</p></div><a href="https://students.voicedots.io" target="_blank" rel="noreferrer" className={button}>Student portal <ArrowUpRight size={16} /></a></header>
    <div className="grid gap-4 sm:grid-cols-3">{[[BriefcaseBusiness, 'Placement drives', drives.length], [GraduationCap, 'Active drives', drives.filter(d => d.status === 'active').length], [Users, query || rosterQuery ? 'Matching students' : 'Students', total]].map(([Icon, label, value]) => { const MetricIcon = Icon as typeof Users; return <div key={String(label)} className={`${card} flex items-center gap-4 p-5`}><MetricIcon size={24} className="text-indigo-500" /><div><p className="text-xs text-slate-500">{String(label)}</p><strong className="text-2xl">{String(value)}</strong></div></div>; })}</div>
    <nav aria-label="Placement sections" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">{(['drives', 'students', 'analytics', 'academic'] as const).map(t => <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className={`${button} ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900'}`}>{t === 'drives' ? 'Placements' : t === 'students' ? 'Student roster' : t === 'analytics' ? 'Analytics' : 'Academic setup'}</button>)}</nav>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-800">{notice}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{tab === 'drives' ? 'Placement drives' : tab === 'students' ? 'Your students' : tab === 'analytics' ? 'Placement analytics' : 'Programs & departments'}</h2><div className="flex gap-2"><button className={button} disabled={loading || busy} onClick={refresh}><RefreshCw size={16} />Refresh</button>{(tab === 'drives' || tab === 'students') && <button className={primary} disabled={busy || loading} onClick={() => { setFormError(''); if (tab === 'drives') startDrive('new'); else { setStudentForm('new'); setStudentProgram(programs[0]?.code || ''); } }}><Plus size={16} />{tab === 'drives' ? 'Create drive' : 'Add student'}</button>}</div></div>
    {(loading || rosterLoading) && <p role="status" className="py-4 text-slate-500">Updating workspace…</p>}
    {tab === 'drives' ? <>
      <p className="text-sm text-slate-500">Only active drives appear to eligible students in your workspace. Creating a complete drive evaluates eligibility and may activate it automatically.</p>
      {!drives.length ? <div className={`${card} p-12 text-center`}><BriefcaseBusiness className="mx-auto mb-4 text-indigo-500" /><h3 className="text-lg font-semibold">Create your first placement drive</h3><p className="mt-2 text-sm text-slate-500">Add a company, job description, interview schedule, and eligibility criteria.</p></div> : <div className="grid gap-4 xl:grid-cols-2">{drives.map(d => <article key={d.id} className={`${card} min-w-0 p-5`}><div className="flex justify-between gap-4"><p className="break-words text-sm font-semibold text-indigo-600">{displayName(d.company_name)}</p><Badge>{d.status}</Badge></div><h3 className="mt-3 break-words text-xl font-bold">{displayName(d.role_title)}</h3><p className="mt-2 text-sm text-slate-500">{d.location || 'Location not set'}</p><p className="mt-4 text-xs text-slate-500">Interview opens: {formatDate(d.window_start_at)}</p><div className="mt-5 flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={() => void editDrive(d.id)}>Edit drive</button><button className={button} disabled={busy} onClick={() => void act(`drives/${d.id}/eligibility`, {})}>Evaluate eligibility</button>{d.status !== 'active' ? <button className={primary} disabled={busy} onClick={() => void act(`drives/${d.id}`, { status: 'active' }, true)}>Activate</button> : <button className={button} disabled={busy} onClick={() => void act(`drives/${d.id}`, { status: 'closed' }, true)}>Close drive</button>}</div></article>)}</div>}
    </> : tab === 'students' ? <>
      <form className="flex max-w-lg gap-2" onSubmit={e => { e.preventDefault(); setOffset(0); setQuery(String(new FormData(e.currentTarget).get('search')).trim()); }}><input className={input} name="search" aria-label="Search students" placeholder="Search name, email or roll number" value={query} onChange={e=>{setQuery(e.target.value);setOffset(0);}} /><button className={button}>Search</button></form>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Field label="Filter by program"><select className={input} value={filters.program||''} onChange={e=>changeFilter('program',e.target.value)}><option value="">All programs</option>{programs.map(p=><option key={p.code} value={p.code}>{displayName(p.display_name)} ({p.code})</option>)}</select></Field>
      <Field label="Filter by department"><select className={input} value={filters.department||''} onChange={e=>changeFilter('department',e.target.value)}><option value="">All departments</option>{Array.from(new Map(programs.filter(p=>!filters.program||p.code===filters.program).flatMap(p=>p.departments.map(d=>[d.code,d] as const))).values()).map(d=><option key={d.code} value={d.code}>{displayName(d.display_name)} ({d.code})</option>)}</select></Field>
      <Field label="Filter by batch"><select className={input} value={filters.batch_label||''} onChange={e=>changeFilter('batch_label',e.target.value)}><option value="">All batches</option>{options.batches.map(b=><option key={b}>{b}</option>)}</select></Field>
      <Field label="Filter by graduation year"><select className={input} value={filters.graduation_year||''} onChange={e=>changeFilter('graduation_year',e.target.value)}><option value="">All years</option>{options.graduation_years.map(y=><option key={y}>{y}</option>)}</select></Field>
      <Field label="Filter by status"><select className={input} value={filters.status||''} onChange={e=>changeFilter('status',e.target.value)}><option value="">All statuses</option>{options.statuses.map(x=><option key={x} value={x}>{displayName(x)}</option>)}</select></Field>
      <Field label="Minimum cgpa"><input className={input} type="number" min={0} max={10} step="0.1" value={filters.min_cgpa||''} onChange={e=>changeFilter('min_cgpa',e.target.value)}/></Field>
      <Field label="Maximum cgpa"><input className={input} type="number" min={0} max={10} step="0.1" value={filters.max_cgpa||''} onChange={e=>changeFilter('max_cgpa',e.target.value)}/></Field>
      <Field label="Resume availability"><select className={input} value={filters.has_resume||''} onChange={e=>changeFilter('has_resume',e.target.value)}><option value="">All students</option><option value="true">Resume uploaded</option><option value="false">No readable resume</option></select></Field>
      <button className={button} onClick={()=>{setFilters({});setOffset(0);setQuery('');}}>Clear filters</button></div>
      <StudentImport onComplete={refresh}/>
      {roster.error&&<p role="alert" className="text-rose-600">{collegeError(roster.error)} <button onClick={()=>void roster.refetch()}>Retry</button></p>}
      <StudentRosterTable students={students} total={total} offset={offset} busy={rosterLoading} onPage={setOffset} sorting={[{id:filters.sort||'roll_number',desc:filters.order==='desc'}]} onSort={value=>{setOffset(0);setFilters(f=>({...f,sort:value[0]?.id||'roll_number',order:value[0]?.desc?'desc':'asc'}));}} onEdit={student=>{setStudentForm(student);setStudentProgram(student.program);setFormError('');}}/>
    </> : tab === 'analytics' ? <PlacementAnalytics data={analytics}/> : <div className="space-y-5"><p className="text-sm text-slate-500">Configure programs and their departments before adding students. Drive eligibility options come from this catalog.</p><div className="grid gap-4 sm:grid-cols-2">{programs.map(p => <article key={p.code} className={`${card} p-5`}><h3 className="font-bold">{displayName(p.display_name)} <span className="text-sm font-normal text-slate-500">({p.code})</span></h3><p className="mt-2 text-sm text-slate-500">{p.duration_years} years</p><div className="mt-3 flex flex-wrap gap-2">{p.departments.map(d => <Badge key={d.code}>{displayName(d.display_name)} ({d.code})</Badge>)}</div></article>)}</div>
      <div className="grid gap-5 lg:grid-cols-2"><form className={`${card} space-y-4 p-5`} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void act('academic-catalog/programs', { code: f.get('code'), display_name: f.get('name'), duration_years: Number(f.get('duration')) }); }}><h3 className="font-bold">Add or update program</h3><Field label="Program code"><input className={input} name="code" placeholder="B.Tech" required maxLength={40} /></Field><Field label="Display name"><input className={input} name="name" required maxLength={120} /></Field><Field label="Duration in years"><input className={input} name="duration" type="number" min={1} max={8} required defaultValue={4} /></Field><button className={primary} disabled={busy}>Save program</button></form>
      <form className={`${card} space-y-4 p-5`} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void act('academic-catalog/departments', { program_code: f.get('program'), code: f.get('code'), display_name: f.get('name') }); }}><h3 className="font-bold">Add or update department</h3><Field label="Program"><select className={input} name="program" required>{programs.map(p => <option key={p.code}>{p.code}</option>)}</select></Field><Field label="Department code"><input className={input} name="code" placeholder="CSE" required maxLength={40} /></Field><Field label="Display name"><input className={input} name="name" placeholder="Computer Science" required maxLength={120} /></Field><button className={primary} disabled={busy || !programs.length}>Save department</button></form></div>
    </div>}
    {driveForm && <Modal title={currentDrive ? 'Edit placement drive' : 'Create placement drive'} busy={busy} close={() => setDriveForm(null)}><form onSubmit={saveDrive} className="grid gap-4 sm:grid-cols-2">
      {formError && <p role="alert" className="text-sm text-rose-600 sm:col-span-2">{formError}</p>}
      <Field label="Company"><input className={input} name="company_name" required maxLength={200} defaultValue={currentDrive?.company_name} /></Field><Field label="Role"><input className={input} name="role_title" required maxLength={200} defaultValue={currentDrive?.role_title} /></Field>
      <Field label="Job type"><select className={input} name="job_type" defaultValue={currentDrive?.job_type || 'full_time'}><option value="full_time">Full time</option><option value="internship">Internship</option><option value="internship_ppo">Internship + PPO</option></select></Field><Field label="Location"><input className={input} name="location" required defaultValue={currentDrive?.location} /></Field>
      <Field label="Job description" wide><textarea className={input} name="jd_text" required rows={5} maxLength={50000} defaultValue={currentDrive?.jd_raw_text} /></Field>
      <Field label="Interview start (your local time)"><input className={input} name="window_start" type="datetime-local" required defaultValue={localDate(currentDrive?.window_start_at)} /></Field><Field label="Interview end (your local time)"><input className={input} name="window_end" type="datetime-local" required defaultValue={localDate(currentDrive?.window_end_at)} /></Field>
      <Field label="Minimum CGPA"><input className={input} name="min_cgpa" type="number" min={0} max={10} step="0.01" required defaultValue={currentDrive?.criteria_min_cgpa ?? 0} /></Field><Field label="Interview duration"><select className={input} name="duration" defaultValue={currentDrive?.interview_duration_minutes || 30}>{[15, 30, 45].map(m => <option key={m} value={m}>{m} minutes</option>)}</select></Field>
      <PlacementChoices label="Eligible programs" name="programs" options={programs.map(p=>({value:p.code,label:`${displayName(p.display_name)} (${p.code})`}))} values={drivePrograms} onChange={v=>{setDrivePrograms(v);setDriveDepartments(old=>old.filter(code=>programs.filter(p=>v.includes(p.code)).some(p=>p.departments.some(d=>d.code===code))));}}/>
      <PlacementChoices label="Eligible departments" name="departments" options={Array.from(new Map(programs.filter(p=>drivePrograms.includes(p.code)).flatMap(p=>p.departments.map(d=>[d.code,{value:d.code,label:`${displayName(d.display_name)} (${d.code})`}] as const))).values())} values={driveDepartments} onChange={setDriveDepartments}/>
      <PlacementChoices label="Graduation years" name="years" options={Array.from(new Set([...options.graduation_years,...(currentDrive?.criteria_graduation_years||[])])).sort().map(y=>({value:String(y),label:String(y)}))} values={driveYears} onChange={setDriveYears}/>

      <p className="text-xs leading-5 text-slate-500 sm:col-span-2">A complete drive may become active immediately after eligibility is evaluated. Only qualifying students from your workspace will see it.</p><button className={`${primary} sm:col-span-2`} disabled={busy}>{busy ? 'Saving and evaluating…' : currentDrive ? 'Save drive' : 'Create & evaluate drive'}</button>
    </form></Modal>}
    {studentForm && <Modal title={currentStudent ? 'Edit student' : 'Add student'} busy={busy} close={() => setStudentForm(null)}><form onSubmit={saveStudent} className="grid gap-4 sm:grid-cols-2">
      {formError && <p role="alert" className="text-sm text-rose-600 sm:col-span-2">{formError}</p>}
      {currentStudent && <PhotoEditor key={currentStudent.id} inline kind="students" person={currentStudent} done={refresh} close={() => {}} />}
      {!currentStudent && <Field label="Student reference photo"><input className={input} name="photo" type="file" accept="image/jpeg,image/png" required /><p className="mt-1 text-xs text-slate-500">A clear photo containing only this student. Up to 2 MB.</p></Field>}
      <Field label="Full name"><input className={input} name="full_name" required defaultValue={currentStudent?.full_name} /></Field><Field label="Roll number"><input className={input} name="roll_number" required readOnly={!!currentStudent} defaultValue={currentStudent?.roll_number} /></Field><Field label="Email"><input className={input} name="email" type="email" required defaultValue={currentStudent?.email} /></Field><Field label="Phone"><input className={input} name="phone" type="tel" required defaultValue={currentStudent?.phone} /></Field>
      <Field label="Program"><select className={input} value={studentProgram} onChange={e => setStudentProgram(e.target.value)} required>{programs.map(p => <option key={p.code}>{p.code}</option>)}</select></Field><Field label="Department"><select key={studentProgram} className={input} name="department" required defaultValue={currentStudent?.department_code}>{programs.find(p => p.code === studentProgram)?.departments.map(d => <option key={d.code} value={d.code}>{displayName(d.display_name)} ({d.code})</option>)}</select></Field>
      <Field label="Graduation year"><input className={input} name="year" type="number" min={2000} max={2100} required defaultValue={currentStudent?.graduation_year || new Date().getFullYear() + 1} /></Field><Field label="CGPA"><input className={input} name="cgpa" type="number" min={0} max={10} step="0.01" required defaultValue={currentStudent?.cgpa} /></Field><Field label="Status"><select className={input} name="status" defaultValue={currentStudent?.status || 'active'}><option value="active">Active</option><option value="inactive">Inactive</option><option value="placed">Placed</option></select></Field>
      <button className={`${primary} sm:col-span-2`} disabled={busy || !programs.length}>{busy ? 'Saving…' : 'Save student'}</button>
    </form></Modal>}
  </div>;
}
