import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { collegeApi, collegeError, type Program } from '@/api/collegeApi';

type Student = { id:string; full_name:string; roll_number:string; email:string; phone:string; program:string; department_code:string; graduation_year:number; cgpa:number; date_of_birth?:string|null; status:string };
type Payment = { id:string; amount:number; paid_on:string; reference:string; note:string };
type Mark = { id:string; subject:string; exam:string; semester:number|null; score:number; maximum:number; exam_date:string };
type Records = { total_fee:number; amount_paid:number; balance:number; currency:string; payments:Payment[]; marks:Mark[]; fee_history:{ previous_total:number; new_total:number; changed_at:string }[] };
type Catalog = { departments:string[]; programs:Program[] };
const input = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900';
const button = 'inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium disabled:opacity-50 dark:border-slate-700';
const primary = `${button} bg-indigo-600 text-white`;
const card = 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';
const today = () => new Date().toLocaleDateString('en-CA', { timeZone:'Asia/Kolkata' });
const money = (value:number | string) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(Number(value) || 0);
const base = 'teacher-records';

export default function TeacherStudentRecords() {
  const [catalog,setCatalog] = useState<Catalog>({departments:[],programs:[]});
  const [students,setStudents] = useState<Student[]>([]);
  const [total,setTotal] = useState(0);
  const [search,setSearch] = useState('');
  const [offset,setOffset] = useState(0);
  const [selected,setSelected] = useState<Student|null>(null);
  const [records,setRecords] = useState<Records|null>(null);
  const [editing,setEditing] = useState<Student|'new'|null>(null);
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
  const loadRecords = async (student:Student) => {
    setSelected(student); setRecords(null); setError('');
    try { setRecords(await collegeApi.get<Records>(`${base}/students/${student.id}/records`)); }
    catch (e) { setError(collegeError(e)); }
  };
  const openNew = () => {
    setEditing('new'); setSelected(null); setError(''); setNotice('');
    setProgram(catalog.programs[0]?.code || '');
    setDepartment(catalog.programs[0]?.departments[0]?.code || '');
  };
  const saveStudent = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    setBusy(true); setError(''); setNotice('');
    try {
      if (editing === 'new') {
        await collegeApi.save(`${base}/students`,{
          full_name:String(values.get('full_name')||'').trim(),roll_number:String(values.get('roll_number')||'').trim(),
          email:String(values.get('email')||'').trim(),phone:String(values.get('phone')||'').trim(),
          program,department_code:department,batch_label:String(values.get('batch_label')||'').trim()||null,cgpa:Number(values.get('cgpa')),
          graduation_year:Number(values.get('graduation_year')),date_of_birth:values.get('date_of_birth')||null,
          status:'active',
        });
        setNotice('Student added. Open their record to enter fees, payments and marks.');
      } else if (editing) {
        await collegeApi.save(`${base}/students/${editing.id}`,{
          full_name:String(values.get('full_name')||'').trim(),phone:String(values.get('phone')||'').trim(),
          cgpa:Number(values.get('cgpa')),graduation_year:Number(values.get('graduation_year')),
          date_of_birth:values.get('date_of_birth')||null,status:values.get('status'),
        },true);
        setNotice('Student details updated.');
      }
      setEditing(null); await refresh();
    } catch (e) { setError(collegeError(e)); }
    finally { setBusy(false); }
  };
  const saveRecord = async (path:string,body:unknown,edit=false) => {
    if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await collegeApi.save(`${base}/students/${selected.id}/${path}`,body,edit);
      setRecords(await collegeApi.get<Records>(`${base}/students/${selected.id}/records`));
      setPaymentEdit(null); setMarkEdit(null); setNotice('Student record saved.');
    } catch (e) { setError(collegeError(e)); }
    finally { setBusy(false); }
  };
  const currentProgram = catalog.programs.find(item => item.code === program);
  const field = (label:string,name:string,type='text',value?:string|number,required=true) => <label className="text-sm">{label}<input className={input} name={name} type={type} step={type==='number'?'any':undefined} required={required} defaultValue={value} /></label>;

  return <div className="space-y-5 text-slate-900 dark:text-white">
    <header><p className="text-sm font-medium text-indigo-600">Attendance & staff</p><h1 className="mt-2 text-3xl font-bold">Student records</h1><p className="mt-2 text-sm text-slate-500">Manage students, fees and marks in your assigned departments.</p></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Students</h2><p className="text-xs text-slate-500">Assigned departments: {catalog.departments.join(', ') || 'none'}</p></div><button className={primary} disabled={!catalog.departments.length || busy} onClick={openNew}>Add student</button></div>
      {!editing && !selected && <><label className="mt-4 block text-sm">Search by name or roll number<input className={input} value={search} onChange={e=>{setSearch(e.target.value);setOffset(0)}} /></label>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200"><th className="p-2">Roll no.</th><th className="p-2">Name</th><th className="p-2">Department</th><th className="p-2">Actions</th></tr></thead><tbody>{students.map(student=><tr className="border-b border-slate-100 dark:border-slate-800" key={student.id}><td className="p-2">{student.roll_number}</td><td className="p-2">{student.full_name}</td><td className="p-2">{student.department_code}</td><td className="p-2"><div className="flex gap-2"><button className={button} onClick={()=>{setEditing(student);setProgram(student.program);setDepartment(student.department_code)}}>Edit</button><button className={button} onClick={()=>void loadRecords(student)}>Fees & marks</button></div></td></tr>)}</tbody></table></div>
        {!students.length && <p className="mt-4 text-sm text-slate-500">No students found.</p>}
        <div className="mt-4 flex items-center justify-between text-sm"><span>{total ? `${offset+1}–${Math.min(offset+50,total)} of ${total}` : '0 students'}</span><div className="flex gap-2"><button className={button} disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-50))}>Previous</button><button className={button} disabled={offset+50>=total} onClick={()=>setOffset(offset+50)}>Next</button></div></div></>}
      {editing && <form className="mt-5 space-y-4" onSubmit={e=>void saveStudent(e)}><h3 className="font-semibold">{editing==='new'?'Add student':`Edit ${editing.full_name}`}</h3><div className="grid gap-4 sm:grid-cols-2">
        {field('Full name *','full_name','text',editing==='new'?'':editing.full_name)}
        {editing==='new' && field('Roll number *','roll_number')}
        {editing==='new' && field('Email *','email','email')}
        {field('Registered mobile number *','phone','tel',editing==='new'?'':editing.phone)}
        {editing==='new' && <><label className="text-sm">Program *<select className={input} value={program} required onChange={e=>{setProgram(e.target.value);setDepartment(catalog.programs.find(p=>p.code===e.target.value)?.departments[0]?.code||'')}}>{catalog.programs.map(p=><option key={p.code} value={p.code}>{p.display_name}</option>)}</select></label><label className="text-sm">Department *<select className={input} value={department} required onChange={e=>setDepartment(e.target.value)}>{currentProgram?.departments.map(d=><option key={d.code} value={d.code}>{d.display_name}</option>)}</select></label></>}
        {editing==='new' && field('Batch label (if assigned)','batch_label','text','',false)}
        {field('Graduation year *','graduation_year','number',editing==='new'?new Date().getFullYear()+1:editing.graduation_year)}
        {field('CGPA *','cgpa','number',editing==='new'?'':editing.cgpa)}
        {field('Date of birth','date_of_birth','date',editing==='new'?'':editing.date_of_birth?.slice(0,10)||'',false)}
        {editing!=='new' && <label className="text-sm">Status<select className={input} name="status" defaultValue={editing.status}><option value="active">Active</option><option value="inactive">Inactive</option><option value="placed">Placed</option></select></label>}
      </div><div className="flex gap-2"><button className={primary} disabled={busy}>{busy?'Saving…':'Save student'}</button><button type="button" className={button} disabled={busy} onClick={()=>setEditing(null)}>Cancel</button></div></form>}
    </section>
    {selected && <section className={card}><div className="flex justify-between gap-3"><div><h2 className="text-lg font-semibold">{selected.full_name}</h2><p className="text-sm text-slate-500">{selected.roll_number} · {selected.department_code}</p></div><button className={button} onClick={()=>{setSelected(null);setRecords(null)}}>Back to students</button></div>
      {!records ? <p className="mt-4 text-sm text-slate-500">Loading records…</p> : <div className="mt-5 space-y-7">
        <div className="grid gap-3 sm:grid-cols-3">{[['Total fee',records.total_fee],['Paid',records.amount_paid],['Balance',records.balance]].map(([label,value])=><div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800" key={label}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold">{money(value)}</p></div>)}</div>
        <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();const v=new FormData(e.currentTarget);void saveRecord('fee',{total_fee:Number(v.get('total_fee'))},true)}}><label className="text-sm">Total fee<input className={input} name="total_fee" type="number" min="0" step="0.01" required defaultValue={records.total_fee} /></label><button className={primary} disabled={busy}>Save total fee</button></form>
        <div><h3 className="font-semibold">Payments</h3><form key={paymentEdit?.id||'new-payment'} className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();const v=new FormData(e.currentTarget);void saveRecord(`payments${paymentEdit?`/${paymentEdit.id}`:''}`,{amount:Number(v.get('amount')),paid_on:v.get('paid_on'),reference:v.get('reference'),note:v.get('note')},!!paymentEdit)}}>
          {field('Amount *','amount','number',paymentEdit?.amount)}{field('Paid on *','paid_on','date',paymentEdit?.paid_on||today())}{field('Reference','reference','text',paymentEdit?.reference,false)}{field('Note','note','text',paymentEdit?.note,false)}<div className="flex gap-2"><button className={primary} disabled={busy}>{paymentEdit?'Update payment':'Add payment'}</button>{paymentEdit&&<button type="button" className={button} onClick={()=>setPaymentEdit(null)}>Cancel</button>}</div></form>
          <ul className="mt-3 space-y-2">{records.payments.map(p=><li key={p.id} className="flex justify-between gap-3 border-t border-slate-100 pt-2 text-sm"><span>{p.paid_on} · {money(p.amount)} · {p.reference||'No reference'}</span><button className={button} onClick={()=>setPaymentEdit(p)}>Edit</button></li>)}</ul></div>
        <div><h3 className="font-semibold">Academic marks</h3><form key={markEdit?.id||'new-mark'} className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();const v=new FormData(e.currentTarget);const score=Number(v.get('score')),maximum=Number(v.get('maximum'));if(score>maximum){setError('Score cannot exceed maximum marks.');return}void saveRecord(`marks${markEdit?`/${markEdit.id}`:''}`,{subject:v.get('subject'),exam:v.get('exam'),semester:Number(v.get('semester')),score,maximum,exam_date:v.get('exam_date')},!!markEdit)}}>
          {field('Subject *','subject','text',markEdit?.subject)}{field('Exam *','exam','text',markEdit?.exam)}{field('Semester *','semester','number',markEdit?.semester||1)}{field('Score *','score','number',markEdit?.score)}{field('Out of *','maximum','number',markEdit?.maximum)}{field('Exam date *','exam_date','date',markEdit?.exam_date||today())}<div className="flex gap-2"><button className={primary} disabled={busy}>{markEdit?'Update marks':'Add marks'}</button>{markEdit&&<button type="button" className={button} onClick={()=>setMarkEdit(null)}>Cancel</button>}</div></form>
          <ul className="mt-3 space-y-2">{records.marks.map(m=><li key={m.id} className="flex justify-between gap-3 border-t border-slate-100 pt-2 text-sm"><span>{m.exam_date} · Semester {m.semester||'—'} · {m.subject} · {m.exam} · {m.score}/{m.maximum}</span><button className={button} onClick={()=>setMarkEdit(m)}>Edit</button></li>)}</ul></div>
        {!!records.fee_history.length && <details className="text-sm"><summary className="cursor-pointer">Fee total history</summary><ul className="mt-2 space-y-1">{records.fee_history.map((h,i)=><li key={i}>{new Date(h.changed_at).toLocaleString()} · {money(h.previous_total)} → {money(h.new_total)}</li>)}</ul></details>}
      </div>}
    </section>}
  </div>;
}
