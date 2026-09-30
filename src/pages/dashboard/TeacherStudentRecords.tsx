import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { collegeApi, collegeError, type Program } from '@/api/collegeApi';

type Student = { id:string; full_name:string; roll_number:string; email:string; phone:string|null; program:string; department_code:string; graduation_year:number; cgpa:number; date_of_birth?:string|null; status:string };
type Payment = { id:string; amount:number; paid_on:string; reference:string; note:string };
type Mark = { id:string; subject:string; exam:string; semester:number|null; score:number; maximum:number; exam_date:string; grade:string|null };
type Records = { total_fee:number; amount_paid:number; balance:number; currency:string; payments:Payment[]; marks:Mark[]; fee_history:{ previous_total:number; new_total:number; changed_at:string }[] };
type Extended = { registration_number:string|null; guardian_name:string|null; academic_year:string|null; current_semester:number|null;
  fee_breakdown:Record<string,unknown>; attendance_snapshot:Record<string,unknown>;
  academic_review:Record<string,unknown>; academic_contacts:Record<string,unknown>;
  semester_summaries:Record<string,Record<string,unknown>> };
type Catalog = { departments:string[]; programs:Program[] };
type Tab = 'personal'|'fees'|'marks'|'additional';
const input = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900';
const button = 'inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium disabled:opacity-50 dark:border-slate-700';
const primary = `${button} bg-indigo-600 text-white`;
const card = 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';
const today = () => new Date().toLocaleDateString('en-CA', { timeZone:'Asia/Kolkata' });
const money = (value:number | string) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(Number(value) || 0);
const base = 'teacher-records';
const semesters = Array.from({length:12},(_,index)=>index+1);

export default function TeacherStudentRecords() {
  const [catalog,setCatalog] = useState<Catalog>({departments:[],programs:[]});
  const [students,setStudents] = useState<Student[]>([]);
  const [total,setTotal] = useState(0);
  const [search,setSearch] = useState('');
  const [offset,setOffset] = useState(0);
  const [view,setView] = useState<'list'|'new'|'detail'>('list');
  const [tab,setTab] = useState<Tab>('personal');
  const [selected,setSelected] = useState<Student|null>(null);
  const [records,setRecords] = useState<Records|null>(null);
  const [extended,setExtended] = useState<Extended|null>(null);
  const [semester,setSemester] = useState(1);
  const [program,setProgram] = useState('');
  const [department,setDepartment] = useState('');
  const [paymentEdit,setPaymentEdit] = useState<Payment|null>(null);
  const [markEdit,setMarkEdit] = useState<Mark|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');

  const refresh = useCallback(async () => {
    const params = new URLSearchParams({q:search,limit:'50',offset:String(offset)});
    const result = await collegeApi.get<{items:Student[];total:number}>(`${base}/students?${params}`);
    setStudents(result.items); setTotal(result.total);
  },[search,offset]);
  useEffect(() => {
    collegeApi.get<Catalog>(`${base}/catalog`).then(setCatalog).catch(e => setError(collegeError(e)));
  },[]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh().catch(e => setError(collegeError(e))); },180);
    return () => window.clearTimeout(timer);
  },[refresh]);

  const backToList = () => {
    setView('list'); setSelected(null); setRecords(null); setExtended(null); setPaymentEdit(null); setMarkEdit(null);
    setError('');
  };
  const openStudent = async (student:Student, initialTab:Tab='personal') => {
    setSelected(student); setView('detail'); setTab(initialTab); setRecords(null); setExtended(null);
    setPaymentEdit(null); setMarkEdit(null); setError(''); setNotice('');
    try {
      const [data,extra] = await Promise.all([
        collegeApi.get<Records>(`${base}/students/${student.id}/records`),
        collegeApi.get<Extended>(`${base}/students/${student.id}/extended`),
      ]);
      setRecords(data); setExtended(extra);
      setSemester(Math.max(1,...data.marks.map(mark=>mark.semester||1)));
    } catch (cause) { setError(collegeError(cause)); }
  };
  const openNew = () => {
    setView('new'); setSelected(null); setRecords(null); setExtended(null); setError(''); setNotice('');
    setProgram(catalog.programs[0]?.code || '');
    setDepartment(catalog.programs[0]?.departments[0]?.code || '');
  };
  const saveStudent = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    setBusy(true); setError(''); setNotice('');
    try {
      if (view==='new') {
        await collegeApi.save(`${base}/students`,{
          full_name:String(values.get('full_name')||'').trim(),roll_number:String(values.get('roll_number')||'').trim(),
          email:String(values.get('email')||'').trim(),phone:String(values.get('phone')||'').trim()||null,
          program,department_code:department,batch_label:String(values.get('batch_label')||'').trim()||null,
          cgpa:Number(values.get('cgpa')),graduation_year:Number(values.get('graduation_year')),
          date_of_birth:values.get('date_of_birth')||null,status:'active',
        });
        setView('list'); await refresh();
        setNotice('Student added. Open their record to enter fees, payments and semester marks.');
      } else if (selected) {
        const changes = {
          full_name:String(values.get('full_name')||'').trim(),email:String(values.get('email')||'').trim(),
          phone:String(values.get('phone')||'').trim()||null,
          cgpa:Number(values.get('cgpa')),graduation_year:Number(values.get('graduation_year')),
          date_of_birth:String(values.get('date_of_birth')||'')||null,status:String(values.get('status')),
        };
        await collegeApi.save(`${base}/students/${selected.id}`,changes,true);
        setSelected({...selected,...changes}); await refresh();
        setNotice('Personal details updated.');
      }
    } catch (cause) { setError(collegeError(cause)); }
    finally { setBusy(false); }
  };
  const saveRecord = async (path:string,body:unknown,edit=false) => {
    if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await collegeApi.save(`${base}/students/${selected.id}/${path}`,body,edit);
      setRecords(await collegeApi.get<Records>(`${base}/students/${selected.id}/records`));
      setPaymentEdit(null); setMarkEdit(null); setNotice('Student record saved.');
    } catch (cause) { setError(collegeError(cause)); }
    finally { setBusy(false); }
  };
  const saveExtended = async (changes:Partial<Extended>) => {
    if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await collegeApi.save(`${base}/students/${selected.id}/extended`,changes,true);
      setExtended(await collegeApi.get<Extended>(`${base}/students/${selected.id}/extended`));
      setNotice('Additional student details saved.');
    } catch (cause) { setError(collegeError(cause)); }
    finally { setBusy(false); }
  };
  const saveJsonSection = (event:FormEvent<HTMLFormElement>, key:'attendance_snapshot'|'academic_review'|'academic_contacts') => {
    event.preventDefault();
    try {
      const value = JSON.parse(String(new FormData(event.currentTarget).get('json')||'{}'));
      if (!value || Array.isArray(value) || typeof value!=='object') throw new Error('Enter a JSON object.');
      void saveExtended({[key]:value});
    } catch { setError('Enter valid JSON in this section before saving.'); }
  };
  const deleteMark = async (mark:Mark) => {
    if (!selected || !window.confirm(`Delete ${mark.subject} marks for semester ${mark.semester || semester}?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await collegeApi.remove(`${base}/students/${selected.id}/marks/${mark.id}`);
      setRecords(await collegeApi.get<Records>(`${base}/students/${selected.id}/records`));
      setMarkEdit(null); setNotice(`${mark.subject} marks removed.`);
    } catch (cause) { setError(collegeError(cause)); }
    finally { setBusy(false); }
  };
  const downloadBulkTemplate = async () => {
    setError('');
    try {
      const blob = await collegeApi.file(`${base}/students/template`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'student-bulk-update.xlsx'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(collegeError(cause)); }
  };
  const uploadBulk = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get('file');
    if (!(file instanceof File) || !file.size) { setError('Choose an Excel workbook first.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await collegeApi.upload<{ rows_processed:number; students_updated:number; fee_totals_updated:number }>(`${base}/students/upload`, file);
      setNotice(`Processed ${result.rows_processed} rows: ${result.students_updated} students and ${result.fee_totals_updated} fee totals updated.`);
      form.reset(); await refresh();
    } catch (cause) { setError(collegeError(cause)); }
    finally { setBusy(false); }
  };
  const currentProgram = catalog.programs.find(item => item.code===program);
  const field = (label:string,name:string,type='text',value?:string|number,required=true) => <label className="text-sm">{label}<input className={input} name={name} type={type} step={type==='number'?'any':undefined} required={required} defaultValue={value} /></label>;
  const marks = records?.marks.filter(mark=>mark.semester===semester) || [];
  const scored = marks.reduce((sum,mark)=>sum+Number(mark.score),0);
  const maximum = marks.reduce((sum,mark)=>sum+Number(mark.maximum),0);

  return <div className="space-y-5 text-slate-900 dark:text-white">
    <header><p className="text-sm font-medium text-indigo-600">Attendance & staff</p><h1 className="mt-2 text-3xl font-bold">Student records</h1><p className="mt-2 text-sm text-slate-500">Manage students, fees and marks in your assigned departments.</p></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}

    {view==='list' && <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Students</h2><p className="text-xs text-slate-500">Assigned departments: {catalog.departments.join(', ') || 'none'}</p></div><button className={primary} disabled={!catalog.departments.length || busy} onClick={openNew}>Add student</button></div>
      <label className="mt-5 block text-sm">Search by name or roll number<input className={input} value={search} onChange={e=>{setSearch(e.target.value);setOffset(0)}} /></label>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200"><th className="p-2">Roll no.</th><th className="p-2">Name</th><th className="p-2">Department</th><th className="p-2">Actions</th></tr></thead><tbody>{students.map(student=><tr className="border-b border-slate-100 dark:border-slate-800" key={student.id}><td className="p-2">{student.roll_number}</td><td className="p-2">{student.full_name}</td><td className="p-2">{student.department_code}</td><td className="p-2"><button className={button} onClick={()=>void openStudent(student)}>Edit student</button></td></tr>)}</tbody></table></div>
      {!students.length && <p className="mt-4 text-sm text-slate-500">No students found.</p>}
      <div className="mt-4 flex items-center justify-between text-sm"><span>{total ? `${offset+1}–${Math.min(offset+50,total)} of ${total}` : '0 students'}</span><div className="flex gap-2"><button className={button} disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-50))}>Previous</button><button className={button} disabled={offset+50>=total} onClick={()=>setOffset(offset+50)}>Next</button></div></div>
      <details className="mt-6 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700"><summary className="cursor-pointer font-semibold">Bulk update students from Excel</summary>
        <p className="mt-2 text-xs text-slate-500">Use roll numbers to update existing students. Blank cells keep their current values. You can update details and total fees; payments and marks stay as they are. The entire file is rejected if any row is invalid.</p>
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={e=>void uploadBulk(e)}><button type="button" className={button} onClick={()=>void downloadBulkTemplate()}>Download Excel template</button><label className="text-sm">Choose completed workbook<input className={input} type="file" name="file" accept=".xlsx" required /></label><button className={primary} disabled={busy}>{busy?'Uploading…':'Update from Excel'}</button></form>
      </details>
    </section>}

    {view==='new' && <section className={card}>
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Add student</h2><button className={button} onClick={backToList}>Back to students</button></div>
      <form className="mt-5 space-y-4" onSubmit={e=>void saveStudent(e)}><div className="grid gap-4 sm:grid-cols-2">
        {field('Full name *','full_name')}{field('Roll number *','roll_number')}{field('Email *','email','email')}
        <div>{field('Registered mobile number (optional)','phone','tel','',false)}<p className="mt-1 text-xs text-slate-500">A registered number lets calls find this student.</p></div>
        <label className="text-sm">Program *<select className={input} value={program} required onChange={e=>{setProgram(e.target.value);setDepartment(catalog.programs.find(p=>p.code===e.target.value)?.departments[0]?.code||'')}}>{catalog.programs.map(p=><option key={p.code} value={p.code}>{p.display_name}</option>)}</select></label>
        <label className="text-sm">Department *<select className={input} value={department} required onChange={e=>setDepartment(e.target.value)}>{currentProgram?.departments.map(d=><option key={d.code} value={d.code}>{d.display_name}</option>)}</select></label>
        {field('Batch label (if assigned)','batch_label','text','',false)}
        {field('Graduation year *','graduation_year','number',new Date().getFullYear()+1)}
        {field('CGPA *','cgpa','number')}{field('Date of birth','date_of_birth','date','',false)}
      </div><div className="flex gap-2"><button className={primary} disabled={busy}>{busy?'Saving…':'Add student'}</button><button type="button" className={button} disabled={busy} onClick={backToList}>Cancel</button></div></form>
    </section>}

    {view==='detail' && selected && <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{selected.full_name}</h2><p className="text-sm text-slate-500">{selected.roll_number} · {selected.department_code}</p></div><button className={button} onClick={backToList}>Back to students</button></div>
      <div role="tablist" aria-label="Student record sections" className="mt-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
        {([['personal','Personal details'],['fees','Fees & payments'],['marks','Semester marks & results'],['additional','Attendance & support']] as const).map(([value,label])=><button key={value} type="button" role="tab" aria-selected={tab===value} className={tab===value?primary:button} onClick={()=>{setTab(value);setError('')}}>{label}</button>)}
      </div>
      {tab==='personal' && <div role="tabpanel" className="mt-5">
        <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800 sm:grid-cols-2"><div><span className="text-slate-500">Roll number</span><p>{selected.roll_number}</p></div><div><span className="text-slate-500">Program / department</span><p>{selected.program} / {selected.department_code}</p></div></div>
        <form key={selected.id} className="mt-5 space-y-4" onSubmit={e=>void saveStudent(e)}><div className="grid gap-4 sm:grid-cols-2">
          {field('Full name *','full_name','text',selected.full_name)}
          {field('Email *','email','email',selected.email)}
          <div>{field('Registered mobile number (optional)','phone','tel',selected.phone||'',false)}<p className="mt-1 text-xs text-slate-500">Leave blank if unavailable. Calls can only find this student after a number is added.</p></div>
          {field('Graduation year *','graduation_year','number',selected.graduation_year)}
          {field('CGPA *','cgpa','number',selected.cgpa)}
          {field('Date of birth','date_of_birth','date',selected.date_of_birth?.slice(0,10)||'',false)}
          <label className="text-sm">Status<select className={input} name="status" defaultValue={selected.status}><option value="active">Active</option><option value="inactive">Inactive</option><option value="placed">Placed</option></select></label>
        </div><button className={primary} disabled={busy}>{busy?'Saving…':'Save personal details'}</button></form>
      </div>}
      {tab==='personal' && extended && <form key={`${selected.id}-legacy-profile`} className="mt-6 space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700" onSubmit={e=>{e.preventDefault();const v=new FormData(e.currentTarget);void saveExtended({registration_number:String(v.get('registration_number')||'').trim()||null,guardian_name:String(v.get('guardian_name')||'').trim()||null,academic_year:String(v.get('academic_year')||'').trim()||null,current_semester:v.get('current_semester')?Number(v.get('current_semester')):null})}}>
        <h3 className="font-semibold">Academic identity</h3><p className="text-xs text-slate-500">These fields also support the older call records. Leave unknown values blank.</p>
        <div className="grid gap-4 sm:grid-cols-2">{field('Registration number','registration_number','text',extended.registration_number||'',false)}{field('Guardian name','guardian_name','text',extended.guardian_name||'',false)}{field('Academic year','academic_year','text',extended.academic_year||'',false)}<label className="text-sm">Current semester<select className={input} name="current_semester" defaultValue={extended.current_semester||''}><option value="">Unknown</option>{semesters.map(value=><option key={value} value={value}>Semester {value}</option>)}</select></label></div>
        <button className={primary} disabled={busy}>Save academic identity</button>
      </form>}
      {tab==='fees' && <div role="tabpanel" className="mt-5">{!records ? <p className="text-sm text-slate-500">Loading fee records…</p> : <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">{[['Total fee',records.total_fee],['Paid',records.amount_paid],['Balance',records.balance]].map(([label,value])=><div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800" key={label}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold">{money(value)}</p></div>)}</div>
        <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();const v=new FormData(e.currentTarget);void saveRecord('fee',{total_fee:Number(v.get('total_fee'))},true)}}><label className="text-sm">Total fee<input className={input} name="total_fee" type="number" min="0" step="0.01" required defaultValue={records.total_fee} /></label><button className={primary} disabled={busy}>Save total fee</button></form>
        {extended && <form key={`${selected.id}-fee-breakdown`} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700" onSubmit={e=>{e.preventDefault();const v=new FormData(e.currentTarget);const fee_breakdown:Record<string,unknown>={};for(const key of ['tuition_fee','hostel_fee','transport_fee','other_charges']) { const raw=String(v.get(key)||'').trim(); if(raw) fee_breakdown[key]=Number(raw); }const due=String(v.get('next_due_date')||'');if(due) fee_breakdown.next_due_date=due;void saveExtended({fee_breakdown})}}>
          <h3 className="font-semibold">Fee breakdown</h3><p className="text-xs text-slate-500">Total fee and payments above remain the official balance. Enter the component amounts and due date used by the older call format here.</p>
          <div className="grid gap-3 sm:grid-cols-2">{(['tuition_fee','hostel_fee','transport_fee','other_charges'] as const).map(key=><label className="text-sm" key={key}>{key.replaceAll('_',' ')}<input className={input} name={key} type="number" min="0" step="0.01" defaultValue={String(extended.fee_breakdown[key]??'')} /></label>)}<label className="text-sm">Next due date<input className={input} name="next_due_date" type="date" defaultValue={String(extended.fee_breakdown.next_due_date??'')} /></label></div>
          <button className={primary} disabled={busy}>Save fee breakdown</button>
        </form>}
        <div><h3 className="font-semibold">Payments</h3><form key={paymentEdit?.id||'new-payment'} className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();const v=new FormData(e.currentTarget);void saveRecord(`payments${paymentEdit?`/${paymentEdit.id}`:''}`,{amount:Number(v.get('amount')),paid_on:v.get('paid_on'),reference:v.get('reference'),note:v.get('note')},!!paymentEdit)}}>
          {field('Amount *','amount','number',paymentEdit?.amount)}{field('Paid on *','paid_on','date',paymentEdit?.paid_on||today())}{field('Reference','reference','text',paymentEdit?.reference,false)}{field('Note','note','text',paymentEdit?.note,false)}<div className="flex gap-2"><button className={primary} disabled={busy}>{paymentEdit?'Update payment':'Add payment'}</button>{paymentEdit&&<button type="button" className={button} onClick={()=>setPaymentEdit(null)}>Cancel</button>}</div></form>
          <ul className="mt-3 space-y-2">{records.payments.map(p=><li key={p.id} className="flex justify-between gap-3 border-t border-slate-100 pt-2 text-sm"><span>{p.paid_on} · {money(p.amount)} · {p.reference||'No reference'}</span><button className={button} onClick={()=>setPaymentEdit(p)}>Edit</button></li>)}</ul></div>
        {!!records.fee_history.length && <details className="text-sm"><summary className="cursor-pointer">Fee total history</summary><ul className="mt-2 space-y-1">{records.fee_history.map((h,i)=><li key={i}>{new Date(h.changed_at).toLocaleString()} · {money(h.previous_total)} → {money(h.new_total)}</li>)}</ul></details>}
      </div>}</div>}
      {tab==='marks' && <div role="tabpanel" className="mt-5">{!records ? <p className="text-sm text-slate-500">Loading semester marks…</p> : <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-4"><label className="text-sm">Semester<select className={input} value={semester} onChange={e=>{setSemester(Number(e.target.value));setMarkEdit(null)}}>{semesters.map(value=><option key={value} value={value}>Semester {value}</option>)}</select></label><div className="rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800"><p className="text-slate-500">Recorded marks for semester {semester}</p><p className="font-semibold">{marks.length ? `${scored} / ${maximum} · ${maximum ? ((scored/maximum)*100).toFixed(1) : '0'}%` : 'No marks entered yet'}</p></div></div>
        {extended && <form key={`${selected.id}-semester-${semester}`} className="grid gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();const v=new FormData(e.currentTarget);const summary:Record<string,unknown>={};for(const key of ['overall_result','academic_year']) {const value=String(v.get(key)||'').trim();if(value)summary[key]=value}for(const key of ['semester_gpa','overall_cgpa']) {const value=String(v.get(key)||'').trim();if(value)summary[key]=Number(value)}void saveExtended({semester_summaries:{...extended.semester_summaries,[String(semester)]:summary}})}}>
          <div className="sm:col-span-2"><h3 className="font-semibold">Semester result</h3><p className="text-xs text-slate-500">Save the result, GPA and academic year for semester {semester}.</p></div>
          {field('Overall result','overall_result','text',String(extended.semester_summaries[String(semester)]?.overall_result??''),false)}
          {field('Academic year','academic_year','text',String(extended.semester_summaries[String(semester)]?.academic_year??''),false)}
          {field('Semester GPA','semester_gpa','number',String(extended.semester_summaries[String(semester)]?.semester_gpa??''),false)}
          {field('Overall CGPA','overall_cgpa','number',String(extended.semester_summaries[String(semester)]?.overall_cgpa??''),false)}
          <button className={primary} disabled={busy}>Save semester result</button>
        </form>}
        <div><h3 className="font-semibold">{markEdit?'Update subject result':'Add subject result'}</h3><form key={`${semester}-${markEdit?.id||'new'}`} className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();const v=new FormData(e.currentTarget);const score=Number(v.get('score')),outOf=Number(v.get('maximum'));if(score>outOf){setError('Score cannot exceed maximum marks.');return}void saveRecord(`marks${markEdit?`/${markEdit.id}`:''}`,{subject:v.get('subject'),exam:v.get('exam'),semester,score,maximum:outOf,exam_date:v.get('exam_date'),grade:String(v.get('grade')||'').trim()||null},!!markEdit)}}>
          {field('Subject *','subject','text',markEdit?.subject)}{field('Exam *','exam','text',markEdit?.exam)}{field('Score *','score','number',markEdit?.score)}{field('Out of *','maximum','number',markEdit?.maximum)}{field('Exam date *','exam_date','date',markEdit?.exam_date||today())}{field('Grade','grade','text',markEdit?.grade||'',false)}<div className="flex items-end gap-2"><button className={primary} disabled={busy}>{markEdit?'Update marks':'Add marks'}</button>{markEdit&&<button type="button" className={button} onClick={()=>setMarkEdit(null)}>Cancel</button>}</div></form>
          <ul className="mt-4 space-y-2">{marks.map(mark=><li key={mark.id} className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-sm dark:border-slate-800"><span>{mark.subject} · {mark.exam} · {mark.score}/{mark.maximum}{mark.grade?` · ${mark.grade}`:''} · {mark.exam_date}</span><span className="flex gap-2"><button className={button} disabled={busy} onClick={()=>setMarkEdit(mark)}>Edit</button><button className={button} disabled={busy} onClick={()=>void deleteMark(mark)}>Delete</button></span></li>)}</ul></div>
      </div>}</div>}
      {tab==='additional' && <div role="tabpanel" className="mt-5 space-y-5">
        {!extended ? <p className="text-sm text-slate-500">Loading additional records…</p> : <>
          <p className="text-sm text-slate-500">These structured sections preserve the older attendance, academic review, and contact fields. Enter a JSON object for each section. Leave a section as {} when details are unavailable.</p>
          {([['attendance_snapshot','Attendance snapshot'],['academic_review','Academic review'],['academic_contacts','Academic contacts']] as const).map(([key,label])=><form key={`${selected.id}-${key}`} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700" onSubmit={e=>saveJsonSection(e,key)}><h3 className="font-semibold">{label}</h3><textarea className={`${input} min-h-40 font-mono`} name="json" spellCheck={false} defaultValue={JSON.stringify(extended[key]||{},null,2)} /><button className={primary} disabled={busy}>Save {label.toLowerCase()}</button></form>)}
        </>}
      </div>}
    </section>}
  </div>;
}
