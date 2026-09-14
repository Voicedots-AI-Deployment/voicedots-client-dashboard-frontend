import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Mic, Plus, RefreshCw, Upload, Users, X } from 'lucide-react';
import { collegeApi, collegeError } from '../../api/collegeApi';
import { useCollegeAccess } from '../../hooks/useCollegeAccess';

type Student = { id: string; full_name: string; roll_number: string; has_photo: boolean; department_code: string };
type Staff = { id: string; full_name: string; email: string; employee_code: string; active: boolean; has_photo: boolean; class_ids: string[] };
type Class = { id: string; name: string; subject: string; student_ids: string[] };
type Setup = { staff: Staff[]; students: Student[]; classes: Class[] };
type Mark = 'present' | 'absent' | 'od' | 'unmarked';
type Attendance = { revision: number; record: null | { updated_at: string; updated_by_name: string }; students: (Student & { status: Mark })[] };
const input = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium disabled:opacity-50 dark:border-slate-700';
const primary = `${button} bg-indigo-600 text-white`;
const card = 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

function PhotoEditor({ kind, person, done, close }: { kind: 'staff' | 'students'; person: Staff | Student; done: () => void; close: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const [camera, setCamera] = useState(false);
  const [photo, setPhoto] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { mounted.current = true; dialog.current?.showModal(); return () => { mounted.current = false; stream.current?.getTracks().forEach(t => t.stop()); }; }, []);
  useEffect(() => { if (camera && video.current) video.current.srcObject = stream.current; }, [camera]);
  useEffect(() => {
    let live = true;
    if (person.has_photo) collegeApi.get<{ photo: string }>(`attendance/photos/${kind}/${person.id}`).then(r => { if (live) setPhoto(r.photo); }).catch(e => { if (live) setError(collegeError(e)); });
    return () => { live = false; };
  }, [kind, person.id]);
  const stop = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setCamera(false); };
  const start = async () => {
    setError('');
    try {
      const feed = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 960 }, audio: false });
      if (!mounted.current) { feed.getTracks().forEach(t => t.stop()); return; }
      stream.current = feed; setCamera(true);
    } catch { setError('Allow camera access, or upload a clear JPEG/PNG photo.'); }
  };
  const capture = () => {
    if (!video.current?.videoWidth) { setError('Wait for the camera picture.'); return; }
    const canvas = document.createElement('canvas'); canvas.width = video.current.videoWidth; canvas.height = video.current.videoHeight;
    canvas.getContext('2d')!.drawImage(video.current, 0, 0); setPhoto(canvas.toDataURL('image/jpeg', .9)); stop();
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 8 * 1024 * 1024) { setError('Choose a JPEG or PNG under 8 MB.'); return; }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      stop(); setPhoto(canvas.toDataURL('image/jpeg', .9));
    } catch { setError('This photo could not be read. Choose another image.'); }
  };
  const save = async () => {
    setBusy(true); setError('');
    try { await collegeApi.save(`attendance/photos/${kind}/${person.id}`, { photo }); done(); close(); }
    catch (e) { setError(collegeError(e)); } finally { setBusy(false); }
  };
  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); if (!busy) close(); }} className={`${card} m-auto w-[calc(100%_-_24px)] max-w-lg text-slate-900 backdrop:bg-slate-950/50 dark:text-white`}>
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Verification photo</h2><p className="mt-1 text-sm text-slate-500">{person.full_name}</p></div><button className={button} aria-label="Close photo editor" disabled={busy} onClick={close}><X size={18} /></button></div>
    <p className="my-4 text-sm text-slate-500">Use a clear front-facing photo with one face. This becomes the saved reference for webcam verification.</p>
    {camera ? <video ref={video} autoPlay playsInline muted className="max-h-72 w-full rounded-xl bg-slate-950" /> : photo ? <img src={photo} alt={`${person.full_name} verification reference`} className="max-h-72 w-full rounded-xl object-contain" /> : <div className="rounded-xl bg-slate-100 p-10 text-center text-slate-500">No photo enrolled</div>}
    {error && <p role="alert" className="my-3 text-sm text-red-600">{error}</p>}
    <div className="mt-4 flex flex-wrap gap-2">{camera ? <button className={button} onClick={capture}><Camera size={16} />Capture frame</button> : <button className={button} disabled={busy} onClick={start}><Camera size={16} />Use webcam</button>}
      <label className={`${button} cursor-pointer`}><Upload size={16} />Upload photo<input type="file" accept="image/jpeg,image/png" className="sr-only" disabled={busy} onChange={e => void upload(e.target.files?.[0])} /></label>
      <button className={primary} disabled={!photo || busy || camera} onClick={save}>{busy ? 'Checking face…' : 'Save verification photo'}</button></div>
  </dialog>;
}

export default function AttendancePage() {
  const { access, loading: accessLoading, error: accessError } = useCollegeAccess();
  const [setup, setSetup] = useState<Setup>({ staff: [], students: [], classes: [] });
  const [tab, setTab] = useState<'attendance' | 'staff' | 'photos' | 'classes'>('attendance');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [classId, setClassId] = useState('');
  const [day, setDay] = useState(today);
  const [period, setPeriod] = useState('1');
  const [record, setRecord] = useState<Attendance | null>(null);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [dirty, setDirty] = useState(false);
  const [reload, setReload] = useState(0);
  const [photoPerson, setPhotoPerson] = useState<{ kind: 'staff' | 'students'; person: Staff | Student } | null>(null);
  const [staffEdit, setStaffEdit] = useState<Staff | 'new' | null>(null);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const refresh = async () => {
    const data = await collegeApi.get<Setup>('attendance/setup'); setSetup(data); setClassId(id => id || data.classes[0]?.id || '');
  };
  useEffect(() => { if (access?.enabled) refresh().catch(e => setError(collegeError(e))); }, [access?.enabled]);
  const query = `attendance/record?class_id=${encodeURIComponent(classId)}&attendance_date=${day}&period=${period}`;
  useEffect(() => {
    if (!classId || !day || !access?.enabled) return;
    const controller = new AbortController(); setRecord(null); setDirty(false); setError(''); setNotice('');
    collegeApi.get<Attendance>(query, controller.signal).then(data => { setRecord(data); setMarks(Object.fromEntries(data.students.map(s => [s.id, s.status]))); }).catch(e => { if (!controller.signal.aborted) setError(collegeError(e)); });
    return () => controller.abort();
  }, [query, reload, access?.enabled]);
  // Refresh read-only views so a widget save appears without navigating away.
  useEffect(() => {
    if (tab !== 'attendance' || dirty || busy || !classId) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') setReload(n => n + 1); }, 20000);
    return () => clearInterval(timer);
  }, [tab, dirty, busy, classId]);
  const saveAttendance = async () => {
    if (!record) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await collegeApi.save<Attendance>('attendance/record', { class_id: classId, attendance_date: day, period: Number(period), expected_revision: record.revision, marks });
      setRecord(data); setDirty(false); setNotice('Attendance saved.');
    } catch (e) { setError(collegeError(e)); } finally { setBusy(false); }
  };
  const saveStaff = async (form: HTMLFormElement) => {
    const values = new FormData(form); setBusy(true); setError('');
    const edit = staffEdit && staffEdit !== 'new' ? staffEdit : null;
    try {
      await collegeApi.save(`attendance/staff${edit ? `/${edit.id}` : ''}`, { full_name: values.get('full_name'), email: values.get('email'), employee_code: values.get('employee_code'), active: values.get('active') === 'on', class_ids: classIds }, !!edit);
      await refresh(); setStaffEdit(null); setNotice('Staff record saved. Add a verification photo to enable face sign-in.');
    } catch (e) { setError(collegeError(e)); } finally { setBusy(false); }
  };
  const saveClass = async (form: HTMLFormElement) => {
    const values = new FormData(form); setBusy(true); setError('');
    try {
      await collegeApi.save('attendance/classes', { name: values.get('name'), subject: values.get('subject'), student_ids: studentIds });
      await refresh(); form.reset(); setStudentIds([]); setNotice('Class created. Assign it to staff under Staff & access.');
    } catch (e) { setError(collegeError(e)); } finally { setBusy(false); }
  };
  if (accessLoading) return <p className="p-8">Loading attendance workspace…</p>;
  if (accessError || !access?.enabled) return <p role="alert" className={card}>{accessError || 'College management access is required.'}</p>;
  const counts = (status: Mark) => Object.values(marks).filter(m => m === status).length;
  const selectedStaff = staffEdit && staffEdit !== 'new' ? staffEdit : null;
  return <div className="space-y-6 text-slate-900 dark:text-white">
    <header><p className="text-sm font-medium text-indigo-600">{access.college_name}</p><h1 className="mt-2 text-3xl font-bold">Attendance</h1><p className="mt-2 text-sm text-slate-500">Manage class attendance, staff access and verification photos.</p></header>
    <nav className="flex flex-wrap gap-2" aria-label="Attendance sections">{(['attendance', 'staff', 'photos', 'classes'] as const).map(t => <button key={t} className={tab === t ? primary : button} onClick={() => { setTab(t); setError(''); setNotice(''); }} aria-pressed={tab === t}>{({ attendance: 'Attendance register', staff: 'Staff & access', photos: 'Student photos', classes: 'Classes' })[t]}</button>)}</nav>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
    {tab === 'attendance' && <>
      <div className={`${card} grid gap-4 sm:grid-cols-3`}><label className="text-sm">Date<input type="date" value={day} disabled={busy} onChange={e => setDay(e.target.value)} className={input} /></label><label className="text-sm">Hour / period<select value={period} disabled={busy} onChange={e => setPeriod(e.target.value)} className={input}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>Hour {i + 1}</option>)}</select></label><div className="flex items-end"><button className={button} disabled={busy} onClick={() => setReload(n => n + 1)}><RefreshCw size={16} />Refresh register</button></div></div>
      <div className="grid gap-3 sm:grid-cols-2">{setup.classes.map(c => <button key={c.id} className={`${card} text-left ${classId === c.id ? 'ring-2 ring-indigo-500' : ''}`} disabled={busy} onClick={() => setClassId(c.id)}><span className="text-xs text-indigo-500">Hour {period}</span><h2 className="mt-2 font-semibold">{c.subject || 'Class attendance'}</h2><p className="mt-3 rounded-lg bg-indigo-50 p-2 text-sm text-indigo-700">{c.name}</p><p className="mt-3 text-sm text-slate-500">Total: {c.student_ids.length}</p></button>)}</div>
      {!setup.classes.length && <p className={card}>Create a class from the existing student roster under Classes.</p>}
      {record && <section className={card}><div className="mb-5 flex flex-wrap justify-between gap-3 text-sm font-semibold"><span className="text-green-600">Present: {counts('present')}</span><span className="text-red-600">Absent: {counts('absent')}</span><span className="text-amber-600">OD: {counts('od')}</span><span>Unmarked: {counts('unmarked')}</span><span>Total: {record.students.length}</span></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-cyan-500 text-white"><tr><th className="p-3">S.No</th><th className="p-3">Roll No.</th><th className="p-3">Name</th><th className="p-3">Attendance</th></tr></thead><tbody>{record.students.map((s, i) => <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800"><td className="p-3">{i + 1}</td><td className="p-3">{s.roll_number}</td><td className="p-3 font-medium">{s.full_name}</td><td className="p-3"><select aria-label={`Attendance for ${s.full_name}`} className={input} value={marks[s.id]} disabled={busy} onChange={e => { setMarks(m => ({ ...m, [s.id]: e.target.value as Mark })); setDirty(true); }}><option value="unmarked">Unmarked</option><option value="present">Present</option><option value="absent">Absent</option><option value="od">On duty</option></select></td></tr>)}</tbody></table></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button className={button} disabled={busy} onClick={() => { setMarks(Object.fromEntries(record.students.map(s => [s.id, 'present']))); setDirty(true); }}><Check size={16} />Present all</button><button className={primary} disabled={busy || !dirty || !record.students.length || counts('unmarked') > 0} onClick={saveAttendance}>{busy ? 'Saving…' : 'Save attendance'}</button></div>
        <p className="mt-4 text-xs text-slate-500">{record.record ? `Last saved by ${record.record.updated_by_name} · ${new Date(record.record.updated_at).toLocaleString()}` : 'Attendance has not been saved for this class and period.'}</p>
      </section>}
    </>}
    {tab === 'staff' && <>
      <div className={`${card} flex flex-wrap items-center justify-between gap-4`}><div><h2 className="font-semibold">Staff webcam sign-in</h2><p className="mt-2 max-w-2xl text-sm text-slate-500">Add the staff name, email, assigned classes and photo here. Staff then open “Staff attendance” in the website AI widget, verify their face, and speak the absent names.</p></div><button className={primary} onClick={() => { setStaffEdit('new'); setClassIds([]); }}><Plus size={16} />Add staff</button></div>
      {staffEdit && <form key={selectedStaff?.id || 'new'} className={`${card} space-y-4`} onSubmit={e => { e.preventDefault(); void saveStaff(e.currentTarget); }}><h2 className="font-semibold">{selectedStaff ? 'Edit staff' : 'Add staff'}</h2><div className="grid gap-4 sm:grid-cols-3"><label className="text-sm">Full name<input name="full_name" required maxLength={150} defaultValue={selectedStaff?.full_name} className={input} /></label><label className="text-sm">Email for sign-in<input name="email" type="email" required defaultValue={selectedStaff?.email} className={input} /></label><label className="text-sm">Staff code<input name="employee_code" maxLength={80} defaultValue={selectedStaff?.employee_code} className={input} /></label></div><label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={selectedStaff?.active ?? true} />Active staff access</label><fieldset><legend className="mb-2 text-sm font-medium">Assigned classes</legend><div className="flex flex-wrap gap-4">{setup.classes.map(c => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={classIds.includes(c.id)} onChange={e => setClassIds(ids => e.target.checked ? [...ids, c.id] : ids.filter(id => id !== c.id))} />{c.name}</label>)}</div></fieldset><div className="flex gap-2"><button className={primary} disabled={busy}>Save staff</button><button type="button" className={button} disabled={busy} onClick={() => setStaffEdit(null)}>Cancel</button></div></form>}
      <div className="grid gap-4 sm:grid-cols-2">{setup.staff.map(s => <article key={s.id} className={card}><div className="flex items-start gap-3"><Users className="text-indigo-500" size={22} /><div><h2 className="font-semibold">{s.full_name}</h2><p className="text-sm text-slate-500">{s.email}</p></div></div><p className="mt-3 text-sm">{!s.active ? 'Access disabled' : s.has_photo ? 'Photo enrolled' : 'Photo required'} · {s.class_ids.length} assigned classes</p><div className="mt-4 flex flex-wrap gap-2"><button className={button} onClick={() => { setStaffEdit(s); setClassIds(s.class_ids); }}>Edit access</button><button className={button} onClick={() => setPhotoPerson({ kind: 'staff', person: s })}><Camera size={16} />{s.has_photo ? 'View / replace photo' : 'Add photo'}</button></div></article>)}</div>
    </>}
    {tab === 'photos' && <section className={card}><h2 className="text-lg font-semibold">Student verification photos</h2><p className="mt-2 text-sm text-slate-500">Upload a reference photo or capture a frame from the webcam. Photos are private to your college.</p><input aria-label="Search student photos" className={`${input} my-4 max-w-md`} placeholder="Search name or roll number" value={search} onChange={e => setSearch(e.target.value)} /><div className="divide-y divide-slate-100 dark:divide-slate-800">{setup.students.filter(s => `${s.full_name} ${s.roll_number}`.toLowerCase().includes(search.toLowerCase())).map(s => <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium">{s.full_name}</p><p className="mt-1 text-sm text-slate-500">{s.roll_number} · {s.has_photo ? 'Photo enrolled' : 'No photo'}</p></div><button className={button} onClick={() => setPhotoPerson({ kind: 'students', person: s })}><Camera size={16} />{s.has_photo ? 'View / replace photo' : 'Add photo'}</button></div>)}</div></section>}
    {tab === 'classes' && <form className={`${card} space-y-4`} onSubmit={e => { e.preventDefault(); void saveClass(e.currentTarget); }}><h2 className="text-lg font-semibold">Create a class from your roster</h2><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Class / section name<input name="name" required maxLength={150} className={input} placeholder="e.g. CSE · 2023–2027 · Section A" /></label><label className="text-sm">Subject<input name="subject" maxLength={150} className={input} placeholder="e.g. Total Quality Management" /></label></div><fieldset><legend className="mb-3 text-sm font-medium">Students ({studentIds.length} selected)</legend><label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={studentIds.length === setup.students.length && studentIds.length > 0} onChange={e => setStudentIds(e.target.checked ? setup.students.map(s => s.id) : [])} />Select all existing students</label><div className="max-h-72 space-y-3 overflow-y-auto">{setup.students.map(s => <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={studentIds.includes(s.id)} onChange={e => setStudentIds(ids => e.target.checked ? [...ids, s.id] : ids.filter(id => id !== s.id))} />{s.full_name} · {s.roll_number}</label>)}</div></fieldset><button className={primary} disabled={busy || !studentIds.length}><Plus size={16} />Create class</button></form>}
    <p className="flex items-center gap-2 text-xs text-slate-500"><Mic size={14} />Widget attendance and this register use the same saved records.</p>
    {photoPerson && <PhotoEditor {...photoPerson} close={() => setPhotoPerson(null)} done={() => { void refresh(); setNotice('Verification photo saved.'); }} />}
  </div>;
}
