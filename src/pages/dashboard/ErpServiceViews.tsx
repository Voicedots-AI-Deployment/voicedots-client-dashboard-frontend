import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, BookOpen, CalendarDays, CircleDollarSign, FileText, Search } from 'lucide-react';
import { ReferenceValue } from './ErpFields';

type Row = Record<string, unknown>;
type Call = <T,>(path: string, method?: string, body?: unknown) => Promise<T>;

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const text = (value: unknown, fallback = '—') => value == null || value === '' ? fallback : String(value);
const amount = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = (value: unknown, currency = 'INR') => {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount(value)); }
  catch { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount(value)); }
};
const dateLabel = (value: unknown) => {
  const raw = String(value ?? '');
  if (!raw) return '—';
  const date = new Date(`${raw.slice(0, 10)}T12:00:00+05:30`);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};
const badge = (state: string) => <span className={`erp-status ${state.toLowerCase().replaceAll(' ', '-')}`}>{state}</span>;
const optionList = (rows: Row[], idKey: string, labelKeys: string[]) => {
  const options = new Map<string, string>();
  rows.forEach(row => {
    const id = text(row[idKey], '');
    if (!id) return;
    options.set(id, text(labelKeys.map(key => row[key]).find(value => value != null && value !== ''), id));
  });
  return [...options].map(([value, label]) => ({ value, label }));
};

export function FeeManagementView({ rows, loading, call }: { rows: Row[]; loading: boolean; call: Call }) {
  const [selected, setSelected] = useState<Row | null>(null);
  const currency = text(rows.find(row => row.currency)?.currency, 'INR');
  const paid = (row: Row) => amount(row.amount_paid ?? row.paid_amount ?? row.imported_paid_amount);
  const pending = (row: Row) => Math.max(0, amount(row.outstanding_balance ?? row.pending_amount ?? row.balance ?? (amount(row.total_fee) - paid(row))));
  const totals = rows.reduce<{ total: number; paid: number; pending: number }>((sum, row) => ({ total: sum.total + amount(row.total_fee ?? row.total), paid: sum.paid + paid(row), pending: sum.pending + pending(row) }), { total: 0, paid: 0, pending: 0 });
  const pendingStudents = rows.filter(row => pending(row) > 0).length;

  if (selected) return <FeeStatement student={selected} call={call} onBack={() => setSelected(null)} />;
  return <>
    <div className="erp-page-head"><div><p className="erp-eyebrow">FEE MANAGEMENT</p><h2>Fee overview</h2><p>Totals are calculated from the fee accounts currently listed below.</p></div></div>
    <div className="erp-stat-grid">
      {[["Total Fees", totals.total] as [string, number], ["Paid", totals.paid] as [string, number], ["Pending", totals.pending] as [string, number], ["Students with Pending Fees", pendingStudents] as [string, number]].map(([label, value]) => <div className="erp-stat" key={String(label)}><span>{label}</span><strong>{typeof value === 'number' && label !== 'Students with Pending Fees' ? money(value, currency) : value}</strong></div>)}
    </div>
    <div className="erp-table-wrap"><table><thead><tr>{['Student', 'Roll No', 'Fee Type', 'Total', 'Paid', 'Pending', 'Due Date', 'Status', ''].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>
      {rows.map((row, index) => {
        const total = amount(row.total_fee ?? row.total);
        const received = paid(row);
        const due = pending(row);
        const status = String(row.status || (amount(row.scholarship_amount) > 0 ? 'Scholarship' : due === 0 ? 'Paid' : received > 0 ? 'Partially Paid' : 'Pending'));
        return <tr key={String(row.id || index)}>
          <td><strong>{text(row.student_name ?? row.full_name, 'Student')}</strong></td><td>{text(row.student_roll_number ?? row.roll_number)}</td>
          <td>{text(row.fee_type ?? row.category ?? row.fee_category)}</td><td>{money(total, text(row.currency, currency))}</td><td>{money(received, text(row.currency, currency))}</td><td>{money(due, text(row.currency, currency))}</td>
          <td>{dateLabel(row.due_on ?? row.due_date)}</td><td>{badge(status)}</td><td><button className="erp-quiet" disabled={!row.student_id} onClick={() => setSelected(row)}>View statement</button></td>
        </tr>;
      })}
    </tbody></table>{loading ? <div className="erp-empty" role="status">Loading fee accounts…</div> : !rows.length && <div className="erp-empty"><CircleDollarSign size={26}/><strong>No fee accounts yet</strong><span>Upload fee accounts to see totals and balances.</span></div>}</div>
  </>;
}

function FeeStatement({ student, call, onBack }: { student: Row; call: Call; onBack: () => void }) {
  const [data, setData] = useState<{ student: Row; fee_summary?: Row | null; sections: Array<{ module: string; items: Row[] }> } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    void call<typeof data>(`/api/college/erp/students/${encodeURIComponent(String(student.student_id))}/profile?tab=fees&limit=100&offset=0`)
      .then(result => { if (live) setData(result); })
      .catch(reason => { if (live) setError((reason as Error).message); });
    return () => { live = false; };
  }, [call, student.student_id]);
  const sections = data?.sections || [];
  const lineItems = sections.filter(section => ['fee-items', 'fee-periods'].includes(section.module)).flatMap(section => section.items);
  const payments = sections.find(section => section.module === 'payments')?.items || [];
  const summary = data?.fee_summary || {};
  return <section>
    <button className="erp-quiet" onClick={onBack}><ArrowLeft size={15}/> Back to fees</button>
    <header className="erp-page-head"><div><p className="erp-eyebrow">STUDENT FEE STATEMENT</p><h2>{text(student.student_name ?? student.full_name, text(data?.student.full_name, 'Student'))}</h2><p>Roll No: {text(student.student_roll_number ?? student.roll_number ?? data?.student.roll_number)}</p></div></header>
    {error && <div className="erp-error" role="alert">{error}</div>}
    {!data && !error && <p className="erp-list-loading" role="status">Loading fee statement…</p>}
    {data && <>
      <div className="erp-stat-grid">{[['Total Fees', summary.total_fee] as [string, unknown], ['Paid', summary.amount_paid] as [string, unknown], ['Outstanding', summary.outstanding_balance] as [string, unknown]].map(([label, value]) => <div className="erp-stat" key={String(label)}><span>{label}</span><strong>{money(value, text(summary.currency, 'INR'))}</strong></div>)}</div>
      <section className="erp-card"><h2>Fee breakdown</h2>{lineItems.length ? <div className="erp-table-wrap"><table><thead><tr><th>Fee type</th><th>Description</th><th>Total</th><th>Due date</th></tr></thead><tbody>{lineItems.map((item, index) => <tr key={String(item.id || index)}><td>{text(item.category ?? item.label ?? item.fee_type)}</td><td>{text(item.description ?? item.label)}</td><td>{money(item.amount ?? item.total_fee, text(item.currency, text(summary.currency, 'INR')))}</td><td>{dateLabel(item.due_on)}</td></tr>)}</tbody></table></div> : <p>No fee breakdown has been recorded for this student.</p>}</section>
      <section className="erp-card"><h2>Transactions</h2>{payments.length ? <div className="erp-table-wrap"><table><thead><tr><th>Date</th><th>Amount</th><th>Payment mode / reference</th></tr></thead><tbody>{payments.map((payment, index) => <tr key={String(payment.id || index)}><td>{dateLabel(payment.paid_on)}</td><td>{money(payment.amount, text(payment.currency, text(summary.currency, 'INR')))}</td><td>{text(payment.payment_mode ?? payment.mode ?? payment.reference ?? payment.note)}</td></tr>)}</tbody></table></div> : <p>No payment transactions have been recorded.</p>}</section>
    </>}
  </section>;
}

export function HomeworkView({ rows, loading }: { rows: Row[]; loading: boolean }) {
  const [subject, setSubject] = useState('');
  const [section, setSection] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const subjects = optionList(rows, 'subject_id', ['subject_name', 'subject']);
  const sections = optionList(rows, 'section_id', ['section_name', 'section']);
  const stateFor = (row: Row) => {
    const state = String(row.status || '').toLowerCase();
    if (['closed', 'completed'].includes(state)) return 'Closed';
    if (row.due_on && String(row.due_on).slice(0, 10) < today()) return 'Due';
    return 'Active';
  };
  const filtered = rows.filter(row => (!subject || String(row.subject_id) === subject) && (!section || String(row.section_id) === section) && (!status || stateFor(row) === status));
  const submittedLabel = (row: Row) => row.submitted_count == null ? 'Not recorded' : String(row.submitted_count);
  const pendingLabel = (row: Row) => row.pending_count == null ? 'Not recorded' : String(row.pending_count);
  return <>
    {selected ? <section>
      <button className="erp-quiet" onClick={() => setSelected(null)}><ArrowLeft size={15}/> Back to homework</button>
      <header className="erp-page-head"><div><p className="erp-eyebrow">HOMEWORK DETAILS</p><h2>{text(selected.title, 'Homework')}</h2></div>{badge(stateFor(selected))}</header>
      <section className="erp-card"><dl className="erp-service-detail-grid"><div><dt>Subject</dt><dd><ReferenceValue name="subject_id" value={selected.subject_id}/></dd></div><div><dt>Section</dt><dd><ReferenceValue name="section_id" value={selected.section_id}/></dd></div><div><dt>Faculty</dt><dd><ReferenceValue name="faculty_id" value={selected.faculty_id}/></dd></div><div><dt>Assigned</dt><dd>{dateLabel(selected.assigned_on)}</dd></div><div><dt>Due</dt><dd>{dateLabel(selected.due_on)}</dd></div></dl><h3 className="erp-detail-subhead">Description</h3><p className="erp-long-copy">{text(selected.instructions, 'No instructions recorded.')}</p><h3 className="erp-detail-subhead">Attachment</h3>{selected.attachment_url ? <a href={String(selected.attachment_url)} target="_blank" rel="noreferrer">{text(selected.attachment_name, 'Open attachment')}</a> : <p>No attachment is recorded.</p>}<div className="erp-stat-grid"><div className="erp-stat"><span>Submitted</span><strong>{submittedLabel(selected)}</strong></div><div className="erp-stat"><span>Pending</span><strong>{pendingLabel(selected)}</strong></div></div></section>
    </section> : <>
      <div className="erp-service-filters" aria-label="Homework filters"><label>Subject<select aria-label="Homework subject" value={subject} onChange={event => setSubject(event.target.value)}><option value="">All subjects</option>{subjects.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>Section<select aria-label="Homework section" value={section} onChange={event => setSection(event.target.value)}><option value="">All sections</option>{sections.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>Status<select aria-label="Homework status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{['Active', 'Due', 'Closed'].map(value => <option key={value}>{value}</option>)}</select></label></div>
      <div className="erp-table-wrap"><table><thead><tr><th>Subject</th><th>Homework</th><th>Assigned</th><th>Due date</th><th>Status</th><th></th></tr></thead><tbody>{filtered.map((row, index) => <tr key={String(row.id || index)}><td><ReferenceValue name="subject_id" value={row.subject_id}/></td><td><strong>{text(row.title)}</strong></td><td>{dateLabel(row.assigned_on)}</td><td>{dateLabel(row.due_on)}</td><td>{badge(stateFor(row))}</td><td><button className="erp-quiet" onClick={() => setSelected(row)}>View details</button></td></tr>)}</tbody></table>{loading ? <div className="erp-empty" role="status">Loading homework…</div> : !filtered.length && <div className="erp-empty"><BookOpen size={26}/><strong>No homework found</strong><span>{rows.length ? 'Try changing the homework filters.' : 'Upload homework records to see assignments here.'}</span></div>}</div>
    </>}
  </>;
}

export function CircularsView({ rows, loading }: { rows: Row[]; loading: boolean }) {
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [audience, setAudience] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const categories = optionList(rows, 'category', ['category']);
  const departments = optionList(rows, 'department_code', ['department_name', 'department_code']);
  const audiences = optionList(rows, 'audience', ['audience']);
  const audienceFor = (row: Row): string => String(row.audience || (row.section_id ? 'Section' : row.department_code ? 'Department' : 'All institution'));
  const filtered = useMemo(() => rows.filter(row => {
    const date = String(row.published_on || '').slice(0, 10);
    return (!category || String(row.category || '') === category) && (!department || String(row.department_code || '') === department) && (!audience || String(audienceFor(row)) === audience) && (!from || date >= from) && (!to || date <= to);
  }), [rows, category, department, audience, from, to]);
  return <>
    {selected ? <section>
      <button className="erp-quiet" onClick={() => setSelected(null)}><ArrowLeft size={15}/> Back to circulars</button>
      <header className="erp-page-head"><div><p className="erp-eyebrow">CIRCULAR {text(selected.circular_number, `#${text(selected.id)}`)}</p><h2>{text(selected.title, 'Circular')}</h2></div></header>
      <article className="erp-card"><dl className="erp-service-detail-grid"><div><dt>Published</dt><dd>{dateLabel(selected.published_on)}</dd></div><div><dt>Department</dt><dd>{selected.department_code ? <ReferenceValue name="department_code" value={selected.department_code}/> : 'All departments'}</dd></div><div><dt>Applicable to</dt><dd>{selected.section_id ? <ReferenceValue name="section_id" value={selected.section_id}/> : String(selected.department_name || 'All institution')}</dd></div><div><dt>Audience</dt><dd>{String(audienceFor(selected))}</dd></div><div><dt>Expires</dt><dd>{dateLabel(selected.expires_on)}</dd></div></dl><h3 className="erp-detail-subhead">Message</h3><p className="erp-long-copy">{text(selected.body, 'No circular text recorded.')}</p>{Boolean(selected.attachment_url) && <p className="mt-4"><a href={String(selected.attachment_url)} target="_blank" rel="noreferrer">{text(selected.attachment_name, 'Open attachment')}</a></p>}</article>
    </section> : <>
      <div className="erp-service-filters erp-circular-filters" aria-label="Circular filters"><label>Category<select aria-label="Circular category" value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{categories.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>Department<select aria-label="Circular department" value={department} onChange={event => setDepartment(event.target.value)}><option value="">All departments</option>{departments.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>Audience<select aria-label="Circular audience" value={audience} onChange={event => setAudience(event.target.value)}><option value="">All audiences</option>{(audiences.length ? audiences : [{ value: 'All institution', label: 'All institution' }, { value: 'Department', label: 'Department' }, { value: 'Section', label: 'Section' }]).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>From<input aria-label="Circular date from" type="date" value={from} onChange={event => setFrom(event.target.value)}/></label><label>To<input aria-label="Circular date to" type="date" value={to} onChange={event => setTo(event.target.value)}/></label></div>
      <div className="erp-circular-list">{filtered.map((row, index) => <article className="erp-card erp-circular-card" key={String(row.id || index)}><div className="erp-circular-icon"><Bell size={18}/></div><div className="erp-circular-content"><p className="erp-eyebrow">{text(row.category, 'CIRCULAR')}</p><h3>{text(row.title, 'Circular')}</h3><p className="erp-circular-meta"><span><CalendarDays size={14}/>{dateLabel(row.published_on)}</span><span>{row.department_code ? <ReferenceValue name="department_code" value={row.department_code}/> : 'All departments'}</span><span>{String(audienceFor(row))}</span></p><p className="erp-circular-summary">{text(row.body).slice(0, 180)}{String(row.body || '').length > 180 ? '…' : ''}</p></div><button className="erp-quiet" onClick={() => setSelected(row)}><FileText size={15}/> View circular</button></article>)}{loading ? <div className="erp-empty" role="status">Loading circulars…</div> : !filtered.length && <div className="erp-empty"><Bell size={26}/><strong>No circulars found</strong><span>{rows.length ? 'Try changing the circular filters.' : 'Upload circulars to publish notices here.'}</span></div>}</div>
    </>}
  </>;
}

const demoExams: Row[] = [
  { id: 'demo-exam-1', title: 'DBMS', subject_name: 'DBMS', exam_date: '2026-10-10', starts_at: '10:00', ends_at: '13:00', room_name: 'R101' },
  { id: 'demo-exam-2', title: 'Operating Systems', subject_name: 'Operating Systems', exam_date: '2026-10-13', starts_at: '10:00', ends_at: '13:00', room_name: 'R102' },
  { id: 'demo-exam-3', title: 'Mathematics', subject_name: 'Mathematics', exam_date: '2026-10-16', starts_at: '10:00', ends_at: '13:00', room_name: 'R101' },
];

const clockTime = (value: unknown) => {
  const raw = String(value ?? '').slice(0, 5);
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!match) return raw || '—';
  const hour = Number(match[1]);
  return `${String(hour % 12 || 12).padStart(2, '0')}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export function ExamScheduleView({ rows, loading }: { rows: Row[]; loading: boolean }) {
  const [calendar, setCalendar] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const entries = rows.length ? rows : demoExams;
  const sample = !rows.length && !loading;
  const sorted = [...entries].sort((a, b) => String(a.exam_date || '').localeCompare(String(b.exam_date || '')));
  const month = sorted[0]?.exam_date ? dateLabel(sorted[0].exam_date).split(' ').slice(1).join(' ') : '';
  const label = (row: Row) => text(row.subject_name ?? row.subject ?? row.title ?? row.subject_id);
  if (selected) return <section>
    <button className="erp-quiet" onClick={() => setSelected(null)}><ArrowLeft size={15}/> Back to exam schedule</button>
    <header className="erp-page-head"><div><p className="erp-eyebrow">EXAM SCHEDULE</p><h2>{label(selected)}</h2></div></header>
    <section className="erp-card"><dl className="erp-service-detail-grid"><div><dt>Date</dt><dd>{dateLabel(selected.exam_date)}</dd></div><div><dt>Time</dt><dd>{clockTime(selected.starts_at)} – {clockTime(selected.ends_at)}</dd></div><div><dt>Subject</dt><dd>{label(selected)}</dd></div><div><dt>Room</dt><dd>{selected.room_name ? String(selected.room_name) : <ReferenceValue name="room_id" value={selected.room_id}/>}</dd></div><div><dt>Section</dt><dd><ReferenceValue name="section_id" value={selected.section_id}/></dd></div><div><dt>Semester</dt><dd><ReferenceValue name="semester_id" value={selected.semester_id}/></dd></div></dl></section>
  </section>;
  return <section>
    <header className="erp-page-head"><div><p className="erp-eyebrow">EXAM SCHEDULE</p><h2>Upcoming examinations</h2><p>Exams from saved schedule records{sample ? ' · sample preview' : ''}.</p></div><button className="erp-quiet" aria-pressed={calendar} onClick={() => setCalendar(value => !value)}>{calendar ? 'Table view' : 'Calendar view'}</button></header>
    {sample && <p className="erp-mapping-note">Sample exam schedule preview. Upload records to replace it with your saved schedule.</p>}
    {!calendar ? <div className="erp-table-wrap"><table><thead><tr>{['Date', 'Time', 'Subject', 'Room', ''].map(head => <th key={head}>{head}</th>)}</tr></thead><tbody>{sorted.map((row, index) => <tr key={String(row.id || index)}><td>{dateLabel(row.exam_date)}</td><td><span className="erp-timetable-time-range">{clockTime(row.starts_at)} – {clockTime(row.ends_at)}</span></td><td><strong>{label(row)}</strong></td><td>{row.room_name ? String(row.room_name) : <ReferenceValue name="room_id" value={row.room_id}/>}</td><td><button className="erp-quiet" onClick={() => setSelected(row)}>View</button></td></tr>)}</tbody></table>{loading && <div className="erp-empty" role="status">Loading exam schedule…</div>}</div> : <div className="erp-exam-calendar"><h3>{month || 'Exam calendar'}</h3><div>{sorted.map((row, index) => <button className="erp-exam-date-card" key={String(row.id || index)} onClick={() => setSelected(row)}><strong>{dateLabel(row.exam_date)}</strong><span>{label(row)}</span><small>{clockTime(row.starts_at)} – {clockTime(row.ends_at)} · {row.room_name ? String(row.room_name) : text(row.room_id, 'Room not set')}</small></button>)}</div></div>}
  </section>;
}

const demoBooks: Row[] = [
  { id: 'demo-book-1', title: 'Operating System Concepts', author: 'Abraham Silberschatz; Peter Baer Galvin', isbn: '9781118063330', edition: '9th', publisher: 'Wiley', subject: 'Books', shelf_location: 'Block A / Shelf 12', total_copies: 5, available_copies: 3, issued_copies: 2, language: 'English', publication_year: 2018, status: 'available' },
  { id: 'demo-book-2', title: 'Database System Concepts', author: 'Abraham Silberschatz; Henry F. Korth', isbn: '9780078022159', edition: '6th', publisher: 'McGraw Hill', subject: 'Books', shelf_location: 'Block B / Shelf 04', total_copies: 4, available_copies: 2, issued_copies: 2, language: 'English', publication_year: 2019, status: 'available' },
  { id: 'demo-book-3', title: 'Journal of Computing Research', author: 'Editorial Board', isbn: '—', edition: 'Vol. 12', publisher: 'Academic Press', subject: 'Journals', shelf_location: 'Periodicals / Shelf 2', total_copies: 1, available_copies: 1, issued_copies: 0, language: 'English', publication_year: 2024, status: 'available' },
  { id: 'demo-book-4', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '9780262046305', edition: '4th', publisher: 'MIT Press', subject: 'E-books', shelf_location: 'Digital collection', total_copies: 0, available_copies: 0, issued_copies: 0, language: 'English', publication_year: 2022, status: 'available' },
];

export function OpacSearchView({ rows, loading }: { rows: Row[]; loading: boolean }) {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [kind, setKind] = useState('All');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [availability, setAvailability] = useState('');
  const [language, setLanguage] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const catalog = rows.length ? rows : demoBooks;
  const sample = !rows.length && !loading;
  const kinds = ['All', 'Books', 'Journals', 'E-books'];
  const categories = [...new Set(catalog.map(book => String(book.category ?? book.subject ?? '').trim()).filter(Boolean))];
  const authors = [...new Set(catalog.map(book => String(book.author ?? '').trim()).filter(Boolean))];
  const departments = [...new Set(catalog.map(book => String(book.department_name ?? book.department_code ?? '').trim()).filter(Boolean))];
  const years = [...new Set(catalog.map(book => String(book.publication_year ?? book.published_year ?? '').trim()).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  const languages = [...new Set(catalog.map(book => String(book.language ?? '').trim()).filter(Boolean))];
  const matches = catalog.filter(book => {
    const haystack = [book.title, book.author, book.isbn, book.accession_number, book.publisher].map(value => String(value ?? '')).join(' ').toLowerCase();
    const format = String(book.material_type ?? book.format_type ?? 'Books').toLowerCase();
    const available = Number(book.available_copies ?? (String(book.status).toLowerCase() === 'available' ? 1 : 0));
    return (!submitted || haystack.includes(submitted.toLowerCase())) && (kind === 'All' || format.includes(kind.toLowerCase().replace('-', ''))) && (!author || String(book.author ?? '') === author) && (!category || String(book.category ?? book.subject ?? '') === category) && (!department || String(book.department_name ?? book.department_code ?? '') === department) && (!year || String(book.publication_year ?? book.published_year ?? '') === year) && (!availability || (availability === 'available' ? available > 0 : available === 0)) && (!language || String(book.language ?? '') === language);
  });
  if (selected) return <section>
    <button className="erp-quiet" onClick={() => setSelected(null)}><ArrowLeft size={15}/> Back to search</button>
    <header className="erp-page-head"><div><p className="erp-eyebrow">LIBRARY CATALOG{sample ? ' · SAMPLE' : ''}</p><h2>{text(selected.title, 'Book details')}</h2></div></header>
    <article className="erp-card"><dl className="erp-service-detail-grid">{[['Authors', selected.author], ['ISBN', selected.isbn], ['Edition', selected.edition], ['Publisher', selected.publisher], ['Location', selected.shelf_location ?? selected.location], ['Category', selected.category ?? selected.subject], ['Department', selected.department_name ?? selected.department_code], ['Publication year', selected.publication_year ?? selected.published_year], ['Language', selected.language]].filter(([, value]) => value != null && value !== '').map(([label, value]) => <div key={String(label)}><dt>{String(label)}</dt><dd>{String(value)}</dd></div>)}</dl><h3 className="erp-detail-subhead">Copies</h3><div className="erp-stat-grid"><div className="erp-stat"><span>Total</span><strong>{text(selected.total_copies, selected.id?.toString().startsWith('demo-') ? '5' : '—')}</strong></div><div className="erp-stat"><span>Available</span><strong>{text(selected.available_copies, String(selected.status).toLowerCase() === 'available' ? '1' : '0')}</strong></div><div className="erp-stat"><span>Issued</span><strong>{text(selected.issued_copies, 'Not recorded')}</strong></div></div></article>
  </section>;
  return <section>
    <header className="erp-page-head"><div><p className="erp-eyebrow">OPAC SEARCH</p><h2>📚 Library</h2><p>Search the library catalog by title, author, ISBN, or accession number.</p></div></header>
    {sample && <p className="erp-mapping-note">Sample catalog preview. These examples are not saved library records.</p>}
    <form className="erp-opac-search" onSubmit={event => { event.preventDefault(); setSubmitted(query.trim()); }}><label className="erp-search"><Search size={19}/><input aria-label="Search books, authors, ISBN" placeholder="Search books, authors, ISBN..." value={query} onChange={event => setQuery(event.target.value)}/></label><button className="erp-primary" type="submit">Search</button></form>
    <div className="erp-opac-kinds" role="group" aria-label="Material type">{kinds.map(value => <button key={value} className={kind === value ? 'active' : ''} aria-pressed={kind === value} onClick={() => setKind(value)}>{value}</button>)}</div>
    <div className="erp-opac-filters"><label>Author<select value={author} onChange={event => setAuthor(event.target.value)}><option value="">All authors</option>{authors.map(value => <option key={value}>{value}</option>)}</select></label><label>Category<select value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label><label>Department<select value={department} onChange={event => setDepartment(event.target.value)}><option value="">All departments</option>{departments.map(value => <option key={value}>{value}</option>)}</select></label><label>Publication year<select value={year} onChange={event => setYear(event.target.value)}><option value="">Any year</option>{years.map(value => <option key={value}>{value}</option>)}</select></label><label>Availability<select value={availability} onChange={event => setAvailability(event.target.value)}><option value="">Any availability</option><option value="available">Available</option><option value="unavailable">Unavailable</option></select></label><label>Language<select value={language} onChange={event => setLanguage(event.target.value)}><option value="">Any language</option>{languages.map(value => <option key={value}>{value}</option>)}</select></label></div>
    <div className="erp-page-head"><div><h3>Search results</h3><p>{matches.length} result{matches.length === 1 ? '' : 's'}</p></div></div>
    <div className="erp-opac-results">{matches.map((book, index) => <article className="erp-card erp-opac-result" key={String(book.id || index)}><div className="erp-opac-cover"><BookOpen size={23}/></div><div className="erp-opac-info"><h3>{text(book.title, 'Untitled')}</h3><p><strong>Author:</strong> {text(book.author)}</p><p><strong>ISBN:</strong> {text(book.isbn)}</p><div className="erp-opac-meta"><span>Edition: {text(book.edition)}</span><span>Location: {text(book.shelf_location ?? book.location)}</span><span>Available: {text(book.available_copies, String(book.status).toLowerCase() === 'available' ? '1' : '0')} copies</span></div></div><button className="erp-quiet" onClick={() => setSelected(book)}>View details</button></article>)}{loading && <div className="erp-empty" role="status">Loading catalog…</div>}{!loading && !matches.length && <div className="erp-empty"><BookOpen size={26}/><strong>No books found</strong><span>Adjust your search or filters.</span></div>}</div>
  </section>;
}

const demoHostelAttendances: Row[] = [
  { id: 'demo-hostel-1', student_name: 'Aarav Sharma', roll_number: 'CSE001', hostel_name: 'Boys Hostel 1', hostel_code: 'BH-1', block: 'A', floor: '2', room_label: '204', attendance_date: '2026-10-03', checked_at: '2026-10-03T20:42:00+05:30', status: 'present' },
  { id: 'demo-hostel-2', student_name: 'Riya Singh', roll_number: 'CSE002', hostel_name: 'Girls Hostel 1', hostel_code: 'GH-1', block: 'A', floor: '3', room_label: '302', attendance_date: '2026-10-03', status: 'absent' },
  { id: 'demo-hostel-3', student_name: 'Rahul Verma', roll_number: 'CSE024', hostel_name: 'Boys Hostel 1', hostel_code: 'BH-1', block: 'A', floor: '2', room_label: '207', attendance_date: '2026-10-03', status: 'absent' },
  { id: 'demo-hostel-4', student_name: 'Ishita Rao', roll_number: 'CSE018', hostel_name: 'Boys Hostel 1', hostel_code: 'BH-1', block: 'A', floor: '1', room_label: '104', attendance_date: '2026-10-03', checked_at: '2026-10-03T20:36:00+05:30', status: 'present' },
  { id: 'demo-hostel-5', student_name: 'Neha Das', roll_number: 'CSE031', hostel_name: 'Girls Hostel 1', hostel_code: 'GH-1', block: 'B', floor: '1', room_label: '112', attendance_date: '2026-10-03', checked_at: '2026-10-03T20:58:00+05:30', status: 'late' },
];

export function HostelAttendanceView({ rows, loading, call }: { rows: Row[]; loading: boolean; call: Call }) {
  const [residencies, setResidencies] = useState<Row[]>([]);
  const [hostels, setHostels] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [hostel, setHostel] = useState('');
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [date, setDate] = useState('2026-10-03');
  const [selectedHostel, setSelectedHostel] = useState<Row | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.allSettled([
      call<{ items: Row[] }>('/api/college/erp/records/hostel-residencies?limit=200'),
      call<{ items: Row[] }>('/api/college/erp/records/hostels?limit=200'),
      call<{ items: Row[] }>('/api/college/erp/students?limit=200'),
    ]).then(results => {
      if (!live) return;
      if (results[0].status === 'fulfilled') setResidencies(results[0].value.items);
      if (results[1].status === 'fulfilled') setHostels(results[1].value.items);
      if (results[2].status === 'fulfilled') setStudents(results[2].value.items);
    });
    return () => { live = false; };
  }, [call]);
  const sample = !rows.length && !loading;
  const entries = sample ? demoHostelAttendances : rows;
  const studentMap = new Map(students.map(person => [String(person.id), person]));
  const residencyMap = new Map(residencies.map(record => [String(record.id), record]));
  const hostelMap = new Map(hostels.map(record => [String(record.id), record]));
  const enriched = entries.map(record => {
    if (sample) return record;
    const residency = residencyMap.get(String(record.residency_id));
    const building = hostelMap.get(String(residency?.hostel_id ?? record.hostel_id));
    const person = studentMap.get(String(record.student_id));
    return { ...record, _residency: residency, _hostel: building, _student: person };
  });
  const hostelName = (record: Row) => text(record.hostel_name ?? (record._hostel as Row | undefined)?.name ?? (record._hostel as Row | undefined)?.code ?? 'Unknown hostel');
  const statusOf = (record: Row) => { const raw = String(record.status ?? '').toLowerCase(); return ['present', 'absent', 'late', 'leave'].includes(raw) ? raw[0].toUpperCase() + raw.slice(1) : 'Unmarked'; };
  const options = [...new Set(enriched.map(hostelName))];
  const filtered = enriched.filter(record => (!hostel || hostelName(record) === hostel) && (!block || String(record.block ?? (record._residency as Row | undefined)?.block ?? '') === block) && (!floor || String(record.floor ?? (record._residency as Row | undefined)?.floor ?? '') === floor) && (!date || String(record.attendance_date ?? '').slice(0, 10) === date));
  const total = filtered.length;
  const present = filtered.filter(record => statusOf(record) === 'Present' || statusOf(record) === 'Late').length;
  const absent = filtered.filter(record => statusOf(record) === 'Absent').length;
  const percentage = total ? (present / total * 100).toFixed(1) : '0.0';
  const blocks = [...new Set(enriched.map(record => String(record.block ?? (record._residency as Row | undefined)?.block ?? '')).filter(Boolean))];
  const floors = [...new Set(enriched.filter(record => !block || String(record.block ?? (record._residency as Row | undefined)?.block ?? '') === block).map(record => String(record.floor ?? (record._residency as Row | undefined)?.floor ?? '')).filter(Boolean))];
  if (selectedHostel) {
    const hostelRows = filtered.filter(record => hostelName(record) === String(selectedHostel.name ?? selectedHostel));
    const hostelFloors = [...new Set(hostelRows.map(record => String(record.floor ?? (record._residency as Row | undefined)?.floor ?? '')).filter(Boolean))];
    return <section><button className="erp-quiet" onClick={() => setSelectedHostel(null)}><ArrowLeft size={15}/> Back to attendance</button><header className="erp-page-head"><div><p className="erp-eyebrow">HOSTEL DETAIL</p><h2>{String(selectedHostel.name ?? selectedHostel)}</h2></div></header><section className="erp-card"><h3>Block {block || 'A'}</h3><div className="erp-hostel-floor-list">{hostelFloors.map(value => { const floorRows = hostelRows.filter(record => String(record.floor ?? (record._residency as Row | undefined)?.floor ?? '') === value); const checkedIn = floorRows.filter(record => ['Present', 'Late'].includes(statusOf(record))).length; const pct = floorRows.length ? Math.round(checkedIn / floorRows.length * 100) : 0; return <div key={value}><span>Floor {value}</span><strong>{pct}%</strong></div>; })}</div><h3 className="erp-detail-subhead">Absent students</h3>{hostelRows.filter(record => statusOf(record) === 'Absent').map((record, index) => <p key={String(record.id || index)}><strong>Room {text(record.room_label ?? (record._residency as Row | undefined)?.room_label)}</strong><br/>{text(record.roll_number ?? (record._student as Row | undefined)?.roll_number)} – {text(record.student_name ?? (record._student as Row | undefined)?.full_name)}</p>)}</section></section>;
  }
  return <section>
    <header className="erp-page-head"><div><p className="erp-eyebrow">HOSTEL ATTENDANCE{sample ? ' · SAMPLE' : ''}</p><h2>Resident attendance</h2><p>{sample ? 'Sample records for 03 Oct 2026.' : 'Attendance from saved hostel check-in records.'}</p></div></header>
    {sample && <p className="erp-mapping-note">Sample attendance preview. These entries are not saved resident records.</p>}
    <div className="erp-stat-grid">{[['Total Residents', total], ['Present', present], ['Absent', absent], ['Attendance %', `${percentage}%`]].map(([label, value]) => <div className="erp-stat" key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="erp-hostel-filters"><label>Hostel<select value={hostel} onChange={event => setHostel(event.target.value)}><option value="">All hostels</option>{options.map(value => <option key={value}>{value}</option>)}</select></label><label>Block<select value={block} onChange={event => setBlock(event.target.value)}><option value="">All blocks</option>{blocks.map(value => <option key={value}>{value}</option>)}</select></label><label>Floor<select value={floor} onChange={event => setFloor(event.target.value)}><option value="">All floors</option>{floors.map(value => <option key={value}>{value}</option>)}</select></label><label>Date<input type="date" value={date} onChange={event => setDate(event.target.value)}/></label><button className="erp-quiet" onClick={() => { const found = hostels.find(item => String(item.name ?? item.code) === hostel); setSelectedHostel(found || { name: hostel || 'Boys Hostel 1' }); }}>View hostel</button></div>
    <div className="erp-table-wrap"><table><thead><tr>{['Student', 'Roll No', 'Hostel', 'Room', 'Date', 'Check-in', 'Status'].map(head => <th key={head}>{head}</th>)}</tr></thead><tbody>{filtered.map((record, index) => <tr key={String(record.id || index)}><td><strong>{text(record.student_name ?? (record._student as Row | undefined)?.full_name ?? record.student_id, 'Student')}</strong></td><td>{text(record.roll_number ?? (record._student as Row | undefined)?.roll_number)}</td><td><button className="erp-student-link" onClick={() => { const found = hostels.find(item => String(item.name ?? item.code) === hostelName(record)); setSelectedHostel(found || { name: hostelName(record) }); }}>{hostelName(record)}</button></td><td>{text(record.room_label ?? (record._residency as Row | undefined)?.room_label)}</td><td>{dateLabel(record.attendance_date)}</td><td>{record.checked_at ? dateLabel(record.checked_at) + ' ' + new Date(String(record.checked_at)).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—'}</td><td>{badge(statusOf(record))}</td></tr>)}</tbody></table>{loading && <div className="erp-empty" role="status">Loading hostel attendance…</div>}{!loading && !filtered.length && <div className="erp-empty"><strong>No attendance records found</strong><span>Try changing the hostel filters or upload attendance records.</span></div>}</div>
  </section>;
}

const mealNames = ['breakfast', 'lunch', 'dinner'] as const;
type MealName = typeof mealNames[number];
const demoMealCounts: Record<string, Record<MealName, number>> = {
  '2026-10-03': { breakfast: 382, lunch: 401, dinner: 395 },
  '2026-10-02': { breakfast: 386, lunch: 398, dinner: 390 },
  '2026-10-01': { breakfast: 379, lunch: 397, dinner: 392 },
};
const demoMealRows: Row[] = Object.entries(demoMealCounts).flatMap(([day, counts]) => Array.from({ length: 420 }, (_, index) => {
  const names = ['Aarav Sharma', 'Riya Singh', 'Karan Kumar'];
  const rolls = ['CSE001', 'CSE002', 'CSE003'];
  return mealNames.map(meal => ({
    id: `demo-mess-${day}-${index}-${meal}`, student_id: `demo-student-${index + 1}`, student_name: names[index] || `Resident ${String(index + 1).padStart(3, '0')}`,
    roll_number: rolls[index] || `CSE${String(index + 1).padStart(3, '0')}`, attendance_date: day, meal,
    status: index < counts[meal] ? 'present' : 'absent',
    hostel_name: index % 2 ? 'Girls Hostel 1' : 'Boys Hostel 1', block: index % 2 ? 'B' : 'A',
  }));
}).flat());

export function MessAttendanceView({ rows, loading, call }: { rows: Row[]; loading: boolean; call: Call }) {
  const [students, setStudents] = useState<Row[]>([]);
  const [residencies, setResidencies] = useState<Row[]>([]);
  const [hostels, setHostels] = useState<Row[]>([]);
  const [date, setDate] = useState('2026-10-03');
  const [hostel, setHostel] = useState('');
  const [block, setBlock] = useState('');
  const [meal, setMeal] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.allSettled([
      call<{ items: Row[] }>('/api/college/erp/students?limit=500'),
      call<{ items: Row[] }>('/api/college/erp/records/hostel-residencies?limit=500'),
      call<{ items: Row[] }>('/api/college/erp/records/hostels?limit=200'),
    ]).then(results => {
      if (!live) return;
      if (results[0].status === 'fulfilled') setStudents(results[0].value.items);
      if (results[1].status === 'fulfilled') setResidencies(results[1].value.items);
      if (results[2].status === 'fulfilled') setHostels(results[2].value.items);
    });
    return () => { live = false; };
  }, [call]);
  const sample = !rows.length && !loading;
  const source = sample ? demoMealRows : rows;
  const studentMap = new Map(students.map(person => [String(person.id), person]));
  const residencyMap = new Map(residencies.map(record => [String(record.id), record]));
  const hostelMap = new Map(hostels.map(record => [String(record.id), record]));
  const enriched = source.map(record => {
    if (sample) return record;
    const student = studentMap.get(String(record.student_id));
    const residency = residencyMap.get(String(record.residency_id)) || residencies.find(item => String(item.student_id) === String(record.student_id));
    const building = hostelMap.get(String(residency?.hostel_id ?? record.hostel_id));
    return { ...record, _student: student, _residency: residency, _hostel: building };
  });
  const studentId = (record: Row) => String(record.student_id ?? '');
  const studentName = (record: Row) => text(record.student_name ?? (record._student as Row | undefined)?.full_name ?? record.student_id, 'Student');
  const rollNumber = (record: Row) => text(record.roll_number ?? (record._student as Row | undefined)?.roll_number);
  const hostelName = (record: Row) => text(record.hostel_name ?? (record._hostel as Row | undefined)?.name ?? (record._hostel as Row | undefined)?.code, 'Unknown hostel');
  const blockName = (record: Row) => String(record.block ?? (record._residency as Row | undefined)?.block ?? '');
  const mealState = (record: Row | undefined) => String(record?.status ?? '').toLowerCase() === 'present';
  const filtered = enriched.filter(record => String(record.attendance_date ?? '').slice(0, 10) === date && (!hostel || hostelName(record) === hostel) && (!block || blockName(record) === block));
  const mealRows = filtered.filter(record => !meal || String(record.meal).toLowerCase() === meal);
  const byStudent = new Map<string, Row[]>();
  for (const record of mealRows) byStudent.set(studentId(record), [...(byStudent.get(studentId(record)) || []), record]);
  const currentDateRows = filtered;
  const residents = new Set(currentDateRows.map(studentId).filter(Boolean));
  const countForMeal = (name: MealName) => {
    const attendance = currentDateRows.filter(record => String(record.meal).toLowerCase() === name);
    const count = attendance.filter(mealState).length;
    return { count, total: attendance.length || (sample ? 420 : residents.size) };
  };
  const hosts = [...new Set(enriched.map(hostelName))];
  const blocks = [...new Set(enriched.map(blockName).filter(Boolean))];
  const studentRecords = selectedStudent ? enriched.filter(record => studentId(record) === selectedStudent).sort((a, b) => String(b.attendance_date).localeCompare(String(a.attendance_date))) : [];
  const history = [...new Set(studentRecords.map(record => String(record.attendance_date).slice(0, 10)))].slice(0, 30);
  const chosenStudent = studentRecords[0];
  if (selectedStudent && chosenStudent) {
    const percent = (name: MealName) => {
      if (sample) return ({ breakfast: '92%', lunch: '95%', dinner: '89%' }[name]);
      const attempts = studentRecords.filter(record => String(record.meal).toLowerCase() === name);
      if (!attempts.length) return '—';
      return `${Math.round(attempts.filter(mealState).length / attempts.length * 100)}%`;
    };
    return <section><button className="erp-quiet" onClick={() => setSelectedStudent(null)}><ArrowLeft size={15}/> Back to mess attendance</button><header className="erp-page-head"><div><p className="erp-eyebrow">MESS ATTENDANCE{sample ? ' · SAMPLE' : ''}</p><h2>{studentName(chosenStudent)}</h2><p>{rollNumber(chosenStudent)}</p></div></header><div className="erp-table-wrap"><table><thead><tr><th>Date</th><th>Breakfast</th><th>Lunch</th><th>Dinner</th></tr></thead><tbody>{history.map(day => { const dayRows = studentRecords.filter(record => String(record.attendance_date).slice(0, 10) === day); const status = (name: MealName) => dayRows.find(record => String(record.meal).toLowerCase() === name); return <tr key={day}><td>{dateLabel(day)}</td>{mealNames.map(name => <td key={name}><MealMark attended={mealState(status(name))}/></td>)}</tr>; })}</tbody></table></div><section className="erp-card"><h3>Monthly Attendance</h3><div className="erp-stat-grid">{mealNames.map(name => <div className="erp-stat" key={name}><span>{text(name)}</span><strong>{percent(name)}</strong></div>)}</div></section></section>;
  }
  return <section>
    <header className="erp-page-head"><div><p className="erp-eyebrow">MESS ATTENDANCE{sample ? ' · SAMPLE' : ''}</p><h2>Meal attendance</h2><p>{sample ? 'Sample meal records for 03 Oct 2026.' : 'Meal attendance from saved records.'}</p></div></header>
    {sample && <p className="erp-mapping-note">Sample records are shown because no saved mess attendance entries are available. They are not saved student records.</p>}
    <div className="erp-stat-grid">{mealNames.map(name => { const count = countForMeal(name); return <div className="erp-stat" key={name}><span>{text(name)}</span><strong>{count.count} / {count.total}</strong></div>; })}</div>
    <div className="erp-hostel-filters"><label>Date<input type="date" value={date} onChange={event => setDate(event.target.value)}/></label><label>Hostel<select value={hostel} onChange={event => setHostel(event.target.value)}><option value="">All hostels</option>{hosts.map(value => <option key={value}>{value}</option>)}</select></label><label>Block<select value={block} onChange={event => setBlock(event.target.value)}><option value="">All blocks</option>{blocks.map(value => <option key={value}>{value}</option>)}</select></label><label>Meal<select value={meal} onChange={event => setMeal(event.target.value)}><option value="">All meals</option>{mealNames.map(value => <option key={value} value={value}>{text(value)}</option>)}</select></label></div>
    <div className="erp-table-wrap"><table><thead><tr><th>Student</th><th>Roll No</th><th>Date</th>{mealNames.filter(name => !meal || name === meal).map(name => <th key={name}>{text(name)}</th>)}</tr></thead><tbody>{[...byStudent.entries()].map(([id, records]) => { const first = records[0]; return <tr key={id}><td><button className="erp-student-link" onClick={() => setSelectedStudent(id)}>{studentName(first)}</button></td><td>{rollNumber(first)}</td><td>{dateLabel(date)}</td>{mealNames.filter(name => !meal || name === meal).map(name => <td key={name}><MealMark attended={mealState(records.find(record => String(record.meal).toLowerCase() === name))}/></td>)}</tr>; })}</tbody></table>{loading && <div className="erp-empty" role="status">Loading mess attendance…</div>}{!loading && !byStudent.size && <div className="erp-empty"><strong>No meal attendance found</strong><span>Try another date or filter.</span></div>}</div>{sample && byStudent.size > 100 && <p className="erp-mapping-note">Showing the first 100 sample residents. Summary counts use all 420.</p>}
  </section>;
}

function MealMark({ attended }: { attended: boolean }) {
  return <span className={`erp-meal-mark ${attended ? 'attended' : 'missed'}`} aria-label={attended ? 'Attended' : 'Not attended'}>{attended ? '✓' : '✕'}</span>;
}
