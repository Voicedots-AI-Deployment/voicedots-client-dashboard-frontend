import { createContext, useContext, useEffect, useMemo, useState, useId, type ReactNode } from 'react';
export type ErpCall = <T>(path: string, method?: string, body?: unknown) => Promise<T>;
type Row = Record<string, unknown>;
type Option = { value: string; label: string };
const Data = createContext<{ load: (key: string, search?: string, refresh?: boolean) => Promise<Option[]> } | null>(null);
const references: Record<string, [string, string]> = {
 student_id: ['students', 'id'], class_id:['catalog/attendance-classes','id'], academic_year_id: ['catalog/years', 'id'], semester_id: ['catalog/semesters', 'id'], section_id: ['catalog/sections', 'id'], subject_id: ['catalog/subjects', 'id'], faculty_id: ['catalog/staff', 'id'], staff_id: ['catalog/staff', 'id'], reviewer_staff_id: ['catalog/staff', 'id'], guardian_id: ['records/guardians', 'id'], enrollment_id: ['records/enrollments', 'id'], book_id: ['records/books', 'id'], hostel_id: ['records/hostels', 'id'], residency_id: ['records/hostel-residencies', 'id'], room_id: ['catalog/rooms', 'id'], fee_period_id: ['records/fee-periods', 'id'], fee_item_id: ['records/fee-items', 'id'], payment_id: ['records/payments', 'id'], batch_id: ['catalog/batches', 'id'], department_code: ['catalog/departments', 'code'], program: ['catalog/programs', 'code'], program_code: ['catalog/programs', 'code'],
};
const labels: Record<string, string> = {imported_department_name:'Department from workbook',imported_staff_name:'Contact name',imported_staff_email:'Contact email',imported_reviewer_name:'Reviewer name',student_id:'Student', academic_year_id:'Academic year', semester_id:'Semester', section_id:'Class / section', subject_id:'Subject', faculty_id:'Teacher', staff_id:'Staff member', reviewer_staff_id:'Reviewer', guardian_id:'Guardian', enrollment_id:'Enrollment', book_id:'Book', hostel_id:'Hostel', residency_id:'Hostel assignment', room_id:'Room', fee_period_id:'Fee period', fee_item_id:'Fee item', payment_id:'Payment', batch_id:'Batch', department_code:'Department', program_code:'Program', external_student_id:'Student ID', full_name:'Full name',mobile:'Mobile number (include country code)',created_at:'Changed on',old_value:'Previous values',new_value:'Updated values', exam:'Assessment name', maximum:'Maximum marks', score:'Marks obtained', paid_on:'Payment date', imported_paid_amount:'Previously paid amount', is_primary:'Primary guardian', starts_on:'Start date', ends_on:'End date'};
export const fieldLabel = (key: string) => labels[key] || key.replaceAll('_',' ').replaceAll('-',' ').replace(/\b\w/g, c=>c.toUpperCase());
const numbers = new Set(['score','maximum','semester','semester_gpa','overall_cgpa','amount','total_fee','imported_paid_amount','days_conducted','days_present','days_absent','hours_conducted','hours_present','hours_absent','percentage','weekday','number','credits','capacity','entry_year','graduation_year','duration_years','cgpa','marks']);
const booleans = new Set(['active','is_primary','parent_meeting_recommended']);
const longText = new Set(['body','instructions','remarks','note','parent_summary','recorded_factors','student_concerns','agreed_actions']);
export function readErpForm(form: HTMLFormElement): Row {
 return Object.fromEntries([...new FormData(form).entries()].filter(([,v])=>v!=='').map(([k,v])=>[k,numbers.has(k)?Number(v):booleans.has(k)?v==='true':v]));
}
export function ErpDataProvider({call,children}:{call:ErpCall;children:ReactNode}) {
 const value=useMemo(()=>{
  const cache=new Map<string,Promise<Option[]>>();
  const data:{load:(key:string,search?:string,refresh?:boolean)=>Promise<Option[]>}={load(key:string,search='',refresh=false){
   const [path,valueKey]=references[key]||[]; if(!path)return Promise.resolve([]);
   const cacheKey=path+'?'+search;if(refresh)cache.delete(cacheKey);
   if(!cache.has(cacheKey))cache.set(cacheKey,(async()=>{
    let rows:Row[]=[];
    if(path==='students'){
     for(let offset=0;offset<2000;offset+=200){const r=await call<{items:Row[]}>(`/api/college/erp/students?limit=200&offset=${offset}&q=${encodeURIComponent(search)}`);rows.push(...r.items);if(r.items.length<200)break;}
    }else{const r=await call<{items:Row[]}>(`/api/college/erp/${path}${path.startsWith('records/')?'?limit=200':''}`);rows=r.items;}
    let people:Option[]=[],periods:Option[]=[],hostels:Option[]=[],years:Option[]=[],batches:Option[]=[];
    if(rows.some(r=>r.student_id))people=await data.load('student_id');
    if(path==='records/enrollments')periods=await data.load('semester_id');
    if(path==='records/hostel-residencies')hostels=await data.load('hostel_id');
    if(path==='catalog/semesters')years=await data.load('academic_year_id');
    if(path==='catalog/sections')batches=await data.load('batch_id');
    if(path==='catalog/sections')return rows.map(r=>({value:String(r[valueKey]),label:[r.name,r.department_code,batches.find(b=>b.value===String(r.batch_id))?.label].filter(Boolean).join(' · ')}));
    return rows.map(r=>({value:String(r[valueKey]),label:[people.find(o=>o.value===r.student_id)?.label,r.full_name||r.display_name||r.title||r.name||r.label||(r.number?`Semester ${r.number}`:null)||r.room_label||r.description||r.category||r.reference||(r.amount?`Payment ₹${r.amount}`:null)||(!r.student_id?'Saved record':null),periods.find(o=>o.value===r.semester_id)?.label,hostels.find(o=>o.value===r.hostel_id)?.label,years.find(o=>o.value===r.academic_year_id)?.label,r.paid_on,r.roll_number||r.employee_code||r.code||r.accession_number].filter(Boolean).join(' · ')||'Saved record'}));
   })().catch(e=>{cache.delete(cacheKey);throw e}));
   return cache.get(cacheKey)!;
  }};
 return data;
 },[call]);
 return <Data.Provider value={value}>{children}</Data.Provider>;
}
function ReferenceSelect({name,value,onChange,required,id}:{name:string;value:unknown;onChange?:(value:string)=>void;required?:boolean;id?:string}) {
 const data=useContext(Data);const [options,setOptions]=useState<Option[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [query,setQuery]=useState('');const [selected,setSelected]=useState(String(value??''));
 useEffect(()=>{let live=true;setLoading(true);const timer=setTimeout(()=>{data?.load(name,query).then(items=>{if(live){setOptions(items);setError('')}}).catch(()=>{if(live)setError('Options could not be loaded. Check your access or academic setup.')}).finally(()=>{if(live)setLoading(false)});},query?250:0);return()=>{live=false;clearTimeout(timer)}},[data,name,query]);
 const refresh=()=>{setLoading(true);data?.load(name,query,true).then(items=>{setOptions(items);setError('')}).catch(()=>setError('Options could not be loaded. Check your access or academic setup.')).finally(()=>setLoading(false))};
 return <>{name==='student_id'&&<input aria-label="Find a student" type="search" placeholder="Search name or roll number" value={query} onChange={e=>setQuery(e.target.value)}/>}<select id={id} name={name} value={onChange?String(value??''):selected} required={required} aria-busy={loading} onChange={e=>{setSelected(e.target.value);onChange?.(e.target.value)}}><option value="">{loading?'Loading options…':`Choose ${fieldLabel(name).toLowerCase()}`}</option>{String(value??'')&&!options.some(o=>o.value===String(value))&&<option value={String(value)}>Current selection</option>}{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select><button type="button" className="erp-option-refresh" disabled={loading} onClick={refresh}>Refresh options</button>{error&&<small role="alert">{error}</small>}{!loading&&!error&&!options.length&&<small>No options available. Add this entry in Academic setup or the relevant section first.</small>}</>;
}
function Field({name,value,required,onChange,id,options}:{name:string;value?:unknown;required?:boolean;onChange?:(value:unknown)=>void;id?:string;options?:string[]}) {
 if(references[name])return <ReferenceSelect id={id} name={name} value={value} required={required} onChange={onChange}/>;
 const choices:Record<string,string[]>={weekday:['0','1','2','3','4','5','6'],assessment_kind:['internal','semester','other'],meal:['breakfast','lunch','dinner','other'],relationship:['guardian','mother','father'],currency:['INR','USD'],period:['today','week','month','semester','custom'],category:['tuition','hostel','transport','other']};
 if(options)choices[name]=options;
 if(booleans.has(name)||choices[name])return <select id={id} name={name} defaultValue={!onChange?String(value??''):undefined} value={onChange?String(value??''):undefined} onChange={e=>onChange?.(booleans.has(name)?e.target.value==='true':e.target.value)} required={required}><option value="">Choose an option</option>{(booleans.has(name)?['true','false']:choices[name]).map(v=><option key={v} value={v}>{name==='weekday'?['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][Number(v)]:v==='true'?'Yes':v==='false'?'No':fieldLabel(v)}</option>)}</select>;
 const type=numbers.has(name)||typeof value==='number'?'number':name.includes('email')?'email':name.endsWith('_on')||name.endsWith('_date')?'date':name.endsWith('_at')&&['starts_at','ends_at'].includes(name)?'time':name==='checked_at'?'datetime-local':'text';
 const props={id,name,required,defaultValue:!onChange?String(value??''):undefined,value:onChange?String(value??''):undefined,onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>onChange?.(type==='number'&&e.target.value!==''?Number(e.target.value):e.target.value)};
 return longText.has(name)?<textarea {...props} rows={3}/>:<input {...props} type={type} step={type==='number'?'any':undefined} min={type==='number'?0:undefined} placeholder={name==='exam'?'e.g. Internal assessment 1':name==='period'?'e.g. October 2026':undefined}/>;
}
export function ErpFields({names,values={},required=[],module}:{names:string[];values?:Row;required?:string[];module?:string}) {
 const prefix=useId();
 const statusOptions:Record<string,string[]>={enrollments:['active','completed','withdrawn'],books:['available','issued','lost','withdrawn'],'hostel-attendance':['present','absent','leave'],'mess-attendance':['present','absent','exempt']};
 return <>{names.filter(n=>n!=='assessment_kind'||module==='exams').map(n=><div className="erp-field" key={n}><label htmlFor={`${prefix}-${n}`}>{fieldLabel(n)}{required.includes(n)?" *":""}</label><Field id={`${prefix}-${n}`} name={n} value={values[n]} required={required.includes(n)} options={n==='status'?statusOptions[module||'']:n==='role'&&module==='academic-contacts'?['class_advisor','hod','academic_dean','subject_faculty']:undefined}/></div>)}</>;
}
export function ReviewFields({values,onChange}:{values:Row;onChange:(values:Row)=>void}){
 const prefix=useId();
 return <>{Object.entries(values).filter(([key])=>!key.startsWith("_")&&key!=="matched_student_id").map(([key,v])=>v!==null&&typeof v==='object'?<fieldset className="erp-nested-fields" key={key}><legend>{fieldLabel(key)}</legend><ReviewFields values={v as Row} onChange={next=>onChange({...values,[key]:Array.isArray(v)?Object.values(next):next})}/></fieldset>:<div className="erp-field" key={key}><label htmlFor={`${prefix}-${key}`}>{fieldLabel(key)}</label><Field id={`${prefix}-${key}`} name={key} value={v} onChange={next=>onChange({...values,[key]:next})}/></div>)}</>;
}
export function ReferenceValue({name,value}:{name:string;value:unknown}){
 const data=useContext(Data);const [label,setLabel]=useState('');
 useEffect(()=>{let live=true;if(references[name]&&value)data?.load(name).then(o=>{if(live)setLabel(o.find(x=>x.value===String(value))?.label||'Saved record')}).catch(()=>{if(live)setLabel('Restricted record')});return()=>{live=false}},[data,name,value]);
 if(references[name]&&value)return <>{label||'Loading…'}</>;
 if(name==='role_code'||name==='role'||name==='status')return <>{value?fieldLabel(String(value)):'—'}</>;
 if((name==='created_at'||name==='updated_at')&&value)return <>{new Date(String(value)).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</>;
 if(typeof value==='boolean')return <span className="erp-pill">{value?'Yes':'No'}</span>;
 if(value&&typeof value==='object')return <dl className="erp-value-list">{Object.entries(value as Row).map(([k,v])=><div key={k}><dt>{fieldLabel(k)}</dt><dd>{typeof v==='object'?<ReferenceValue name={k} value={v}/>:String(v??'—')}</dd></div>)}</dl>;
 return <>{String(value??'—')}</>;
}
