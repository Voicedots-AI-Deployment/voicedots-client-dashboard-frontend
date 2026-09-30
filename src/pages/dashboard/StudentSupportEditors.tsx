import { useState, type FormEvent } from 'react';

type Data = Record<string, any>;
type Save = (value: Data) => Promise<void>;
type EditorProps = { value: Data; onSave: Save; busy: boolean };

const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900';
const buttonClass = 'inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium disabled:opacity-50 dark:border-slate-700';
const saveClass = `${buttonClass} bg-indigo-600 text-white`;
const panelClass = 'rounded-xl border border-slate-200 p-4 dark:border-slate-700';
const asObject = (value: unknown): Data => value && typeof value === 'object' && !Array.isArray(value) ? value as Data : {};
const asList = (value: unknown): Data[] => Array.isArray(value) ? value.map(asObject) : [];
const copy = (value: Data): Data => JSON.parse(JSON.stringify(value || {}));
const numberValue = (value: string): number | undefined => value === '' ? undefined : Number(value);
const text = (value: unknown): string => value == null ? '' : String(value);

function Field({ label, value, onChange, type = 'text', min, max }: {
  label: string; value: unknown; onChange: (value: string | number | undefined) => void;
  type?: string; min?: number; max?: number;
}) {
  return <label className="text-sm">{label}<input className={inputClass} type={type}
    min={min} max={max} step={type === 'number' ? 'any' : undefined}
    value={text(value)} onChange={event => onChange(type === 'number' ? numberValue(event.target.value) : event.target.value)} /></label>;
}

const summaryFields = [
  ['days_conducted', 'Days conducted'], ['days_attended', 'Days attended'], ['days_absent', 'Days absent'],
  ['day_attendance_percentage', 'Day attendance %'], ['hours_conducted', 'Hours conducted'],
  ['hours_attended', 'Hours attended'], ['hours_present', 'Hours present'],
  ['hours_absent', 'Hours absent'], ['hour_attendance_percentage', 'Hour attendance %'],
  ['attendance_percentage', 'Overall attendance %'],
] as const;

export function AttendanceEditor({ value, onSave, busy }: EditorProps) {
  const [draft, setDraft] = useState<Data>(() => copy(value));
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'semester'>('today');
  const section = asObject(draft[period]);
  const updateTop = (key: string, next: unknown) => setDraft(previous => ({ ...previous, [key]: next }));
  const updateSection = (key: string, next: unknown) => setDraft(previous => ({
    ...previous, [period]: { ...asObject(previous[period]), [key]: next },
  }));
  const updateRow = (listKey: 'hours' | 'days', index: number, key: string, next: unknown) => {
    setDraft(previous => {
      const part = asObject(previous[period]);
      const rows = asList(part[listKey]);
      rows[index] = { ...rows[index], [key]: next };
      return { ...previous, [period]: { ...part, [listKey]: rows } };
    });
  };
  const addRow = (listKey: 'hours' | 'days') => setDraft(previous => {
    const part = asObject(previous[period]);
    return { ...previous, [period]: { ...part, [listKey]: [...asList(part[listKey]), {}] } };
  });
  const removeRow = (listKey: 'hours' | 'days', index: number) => setDraft(previous => {
    const part = asObject(previous[period]);
    return { ...previous, [period]: { ...part, [listKey]: asList(part[listKey]).filter((_, row) => row !== index) } };
  });
  const save = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void onSave(draft); };
  const visibleSummary = summaryFields.filter(([key]) =>
    period === 'today' ? ['hours_conducted', 'hours_present', 'hours_absent'].includes(key)
      : period === 'week' ? ['hours_conducted', 'hours_present', 'hours_absent', 'attendance_percentage'].includes(key)
        : !['hours_present', 'attendance_percentage'].includes(key));

  return <form className={`${panelClass} space-y-4`} onSubmit={save}>
    <div><h3 className="font-semibold">Attendance</h3><p className="text-xs text-slate-500">Edit the saved attendance summary. Recorded class attendance still takes priority when available.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="As of date" type="date" value={draft.as_of_date} onChange={next => updateTop('as_of_date', next)} />
      <Field label="Examination eligibility" value={draft.eligibility_status} onChange={next => updateTop('eligibility_status', next)} />
    </div>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Attendance period">
      {(['today', 'week', 'month', 'semester'] as const).map(item => <button type="button" key={item}
        role="tab" aria-selected={period === item} className={period === item ? saveClass : buttonClass}
        onClick={() => setPeriod(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {period === 'today' && <Field label="Attendance date" type="date" value={section.date} onChange={next => updateSection('date', next)} />}
      {period === 'week' && <Field label="Week starting" type="date" value={section.week_start} onChange={next => updateSection('week_start', next)} />}
      {period === 'month' && <Field label="Month" value={section.month} onChange={next => updateSection('month', next)} />}
      {period === 'semester' && <Field label="Semester label" value={section.semester} onChange={next => updateSection('semester', next)} />}
      {visibleSummary.map(([key, label]) => <Field key={key} label={label} type="number" min={0}
        max={key.includes('percentage') ? 100 : undefined} value={section[key]}
        onChange={next => updateSection(key, next)} />)}
    </div>
    {period === 'today' && <div className="space-y-3">
      <div className="flex items-center justify-between gap-2"><h4 className="font-medium">Class hours</h4><button type="button" className={buttonClass} onClick={() => addRow('hours')}>Add hour</button></div>
      {asList(section.hours).map((row, index) => <div className="grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800 sm:grid-cols-5" key={index}>
        <Field label="Hour" type="number" min={1} value={row.hour} onChange={next => updateRow('hours', index, 'hour', next)} />
        <Field label="Time" value={row.time} onChange={next => updateRow('hours', index, 'time', next)} />
        <Field label="Subject" value={row.subject} onChange={next => updateRow('hours', index, 'subject', next)} />
        <label className="text-sm">Status<select className={inputClass} value={text(row.status)} onChange={event => updateRow('hours', index, 'status', event.target.value)}>
          <option value="">Select</option><option value="present">Present</option><option value="absent">Absent</option><option value="on_duty">On duty</option>
          {row.status && !['present', 'absent', 'on_duty'].includes(text(row.status)) && <option value={text(row.status)}>{text(row.status)}</option>}
        </select></label>
        <button type="button" className={buttonClass} onClick={() => removeRow('hours', index)}>Remove hour</button>
      </div>)}
    </div>}
    {period === 'week' && <div className="space-y-3">
      <div className="flex items-center justify-between gap-2"><h4 className="font-medium">Daily breakdown</h4><button type="button" className={buttonClass} onClick={() => addRow('days')}>Add day</button></div>
      {asList(section.days).map((row, index) => <div className="grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800 sm:grid-cols-5" key={index}>
        <Field label="Day" value={row.day} onChange={next => updateRow('days', index, 'day', next)} />
        {(['hours_conducted', 'hours_present', 'hours_absent'] as const).map(key => <Field key={key}
          label={key.replaceAll('_', ' ')} type="number" min={0} value={row[key]}
          onChange={next => updateRow('days', index, key, next)} />)}
        <button type="button" className={buttonClass} onClick={() => removeRow('days', index)}>Remove day</button>
      </div>)}
    </div>}
    <button className={saveClass} disabled={busy}>Save attendance</button>
  </form>;
}

export function ReviewEditor({ value, onSave, busy }: EditorProps) {
  const [draft, setDraft] = useState<Data>(() => copy(value));
  const factors: string[] = Array.isArray(draft.recorded_factors) ? draft.recorded_factors : [];
  const actions = asList(draft.agreed_actions);
  const update = (key: string, next: unknown) => setDraft(previous => ({ ...previous, [key]: next }));
  const updateFactor = (index: number, next: string) => update('recorded_factors', factors.map((item, row) => row === index ? next : item));
  const updateAction = (index: number, key: string, next: unknown) => update('agreed_actions',
    actions.map((item, row) => row === index ? { ...item, [key]: next } : item));
  const save = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void onSave(draft); };

  return <form className={`${panelClass} space-y-4`} onSubmit={save}>
    <div><h3 className="font-semibold">Academic review</h3><p className="text-xs text-slate-500">Record the advisor's review and agreed follow-up actions.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Review date" type="date" value={draft.review_date} onChange={next => update('review_date', next)} />
      <Field label="Reviewed by" value={draft.reviewed_by} onChange={next => update('reviewed_by', next)} />
      <Field label="Reviewer role" value={draft.reviewer_role} onChange={next => update('reviewer_role', next)} />
      <Field label="Next review date" type="date" value={draft.next_review_date} onChange={next => update('next_review_date', next)} />
    </div>
    <label className="block text-sm">Summary for parent or student<textarea className={`${inputClass} min-h-24`}
      value={text(draft.parent_visible_summary)} onChange={event => update('parent_visible_summary', event.target.value)} /></label>
    <label className="block text-sm">Student concerns<textarea className={`${inputClass} min-h-20`}
      value={text(draft.student_concerns)} onChange={event => update('student_concerns', event.target.value)} /></label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(draft.parent_meeting_recommended)}
      onChange={event => update('parent_meeting_recommended', event.target.checked)} />Parent meeting recommended</label>
    <div className="space-y-3"><div className="flex items-center justify-between gap-2"><h4 className="font-medium">Factors noted</h4>
      <button type="button" className={buttonClass} onClick={() => update('recorded_factors', [...factors, ''])}>Add factor</button></div>
      {factors.map((factor, index) => <div className="flex items-end gap-2" key={index}><div className="flex-1"><Field label={`Factor ${index + 1}`} value={factor}
        onChange={next => updateFactor(index, text(next))} /></div><button type="button" className={buttonClass}
        onClick={() => update('recorded_factors', factors.filter((_, row) => row !== index))}>Remove</button></div>)}
    </div>
    <div className="space-y-3"><div className="flex items-center justify-between gap-2"><h4 className="font-medium">Agreed actions</h4>
      <button type="button" className={buttonClass} onClick={() => update('agreed_actions', [...actions, {}])}>Add action</button></div>
      {actions.map((action, index) => <div className="grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800 sm:grid-cols-5" key={index}>
        <div className="sm:col-span-2"><Field label="Action" value={action.action} onChange={next => updateAction(index, 'action', next)} /></div>
        <Field label="Owner" value={action.owner} onChange={next => updateAction(index, 'owner', next)} />
        <Field label="Due date" type="date" value={action.due_date} onChange={next => updateAction(index, 'due_date', next)} />
        <Field label="Status" value={action.status} onChange={next => updateAction(index, 'status', next)} />
        <button type="button" className={buttonClass} onClick={() => update('agreed_actions', actions.filter((_, row) => row !== index))}>Remove action</button>
      </div>)}
    </div>
    <button className={saveClass} disabled={busy}>Save academic review</button>
  </form>;
}

const roles = [['class_advisor', 'Class advisor'], ['hod', 'Head of department'], ['academic_dean', 'Academic dean']] as const;

export function ContactsEditor({ value, onSave, busy }: EditorProps) {
  const [draft, setDraft] = useState<Data>(() => copy(value));
  const [faculty, setFaculty] = useState<Data[]>(() => Object.entries(asObject(value.subject_faculty)).map(([subject, contact]) => ({ ...asObject(contact), subject })));
  const [error, setError] = useState('');
  const updateRole = (role: string, key: string, next: unknown) => setDraft(previous => ({
    ...previous, [role]: { ...asObject(previous[role]), [key]: next },
  }));
  const updateFaculty = (index: number, key: string, next: unknown) => setFaculty(previous => previous.map((item, row) =>
    row === index ? { ...item, [key]: next } : item));
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    const names = faculty.map(item => text(item.subject).trim()).filter(Boolean);
    if (names.length !== faculty.length || new Set(names.map(name => name.toLowerCase())).size !== names.length) {
      setError('Each subject faculty entry needs a different subject name.'); return;
    }
    const result: Data = { ...draft, subject_faculty: Object.fromEntries(faculty.map(({ subject, ...contact }) => [text(subject).trim(), contact])) };
    void onSave(result);
  };
  return <form className={`${panelClass} space-y-5`} onSubmit={save}>
    <div><h3 className="font-semibold">Academic contacts</h3><p className="text-xs text-slate-500">Add official contacts that can be shared on calls.</p></div>
    {roles.map(([role, label]) => <div key={role} className="space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
      <h4 className="font-medium">{label}</h4><div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name" value={asObject(draft[role]).name} onChange={next => updateRole(role, 'name', next)} />
        <Field label="Official email" type="email" value={asObject(draft[role]).official_email} onChange={next => updateRole(role, 'official_email', next)} />
        <Field label="Extension" value={asObject(draft[role]).extension} onChange={next => updateRole(role, 'extension', next)} />
      </div>
    </div>)}
    <div className="space-y-3"><div className="flex items-center justify-between gap-2"><h4 className="font-medium">Subject faculty</h4>
      <button type="button" className={buttonClass} onClick={() => setFaculty(previous => [...previous, { subject: '', name: '', official_email: '', extension: '' }])}>Add faculty</button></div>
      {faculty.map((contact, index) => <div key={index} className="grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800 sm:grid-cols-5">
        <Field label="Subject" value={contact.subject} onChange={next => updateFaculty(index, 'subject', next)} />
        <Field label="Name" value={contact.name} onChange={next => updateFaculty(index, 'name', next)} />
        <Field label="Official email" type="email" value={contact.official_email} onChange={next => updateFaculty(index, 'official_email', next)} />
        <Field label="Extension" value={contact.extension} onChange={next => updateFaculty(index, 'extension', next)} />
        <button type="button" className={buttonClass} onClick={() => setFaculty(previous => previous.filter((_, row) => row !== index))}>Remove faculty</button>
      </div>)}
    </div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <button className={saveClass} disabled={busy}>Save academic contacts</button>
  </form>;
}
