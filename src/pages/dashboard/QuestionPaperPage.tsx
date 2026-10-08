import QpgReportsPanel from './QpgReportsPanel';
import QpgTemplatesPanel from './QpgTemplatesPanel';
import QpgQuestionIntelligencePanel from './QpgQuestionIntelligencePanel';
import QpgRepetitionPanel from './QpgRepetitionPanel';
import QpgGeneratePanel from './QpgGeneratePanel';
import QpgReviewPanel from './QpgReviewPanel';
import QpgPaperPanel from './QpgPaperPanel';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { useCollegeAccess } from '@/hooks/useCollegeAccess';
import { collegeError } from '@/api/collegeApi';
import type { Program } from '@/api/collegeApi';
import { qpgApi, questionTypes, blooms, difficulties, statuses, sourceTypes, label } from '@/api/qpgApi';
import type { Subject, SyllabusItem, Question, QuestionVersion } from '@/api/qpgApi';
import './erp.css';
import Dialog from './QpgDialog';
import QpgImportPanel from './QpgImportPanel';
import QpgSyllabusPanel from './QpgSyllabusPanel';
import QpgBlueprintPanel from './QpgBlueprintPanel';

const inputClass='w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
type Options = { programs:Program[]; erp_subjects:{id:string;code:string;name:string;department_code:string|null}[]; can_setup:boolean; can_write:boolean };
type Context = {program:string;branch:string;year:string;semester:string;subject:string};
type Filters = {q:string;unit_id:string;topic_id:string;bloom_level:string;difficulty:string;question_type:string;status:string};
const emptyFilters:Filters={q:'',unit_id:'',topic_id:'',bloom_level:'',difficulty:'',question_type:'',status:''};

export default function QuestionPaperPage(){
  const {access,loading,error,retry}=useCollegeAccess();
  if(loading)return <p role="status">Checking institution access…</p>;
  if(error)return <div role="alert">{error} <Button onClick={retry}>Retry</Button></div>;
  if(!access?.enabled)return <section className="erp-card"><h1>Institution access required</h1><p>Your administrator must link your account to an institution.</p></section>;
  return <QuestionWorkspace institution={access.college_name||'Your institution'}/>;
}

function QuestionWorkspace({institution}:{institution:string}){
  const [tab,setTabState]=useState(()=>new URLSearchParams(window.location.search).get('view')==='home'?'academic':new URLSearchParams(window.location.search).get('view')||'academic');
  const [changingContext,setChangingContext]=useState(false);
  const [paperView,setPaperView]=useState<'create'|'drafts'|'review'|'final'>('create');
  const module= ['academic','syllabus'].includes(tab)?'academic':['bank','drafts','generate','review','intelligence','imports'].includes(tab)?'bank':['blueprint','papers'].includes(tab)?'papers':tab;
  function setTab(value:string){setTabState(value);setError('');setOffset(0);const url=new URL(window.location.href);url.searchParams.set('view',value);window.history.replaceState(null,'',url);}
  useEffect(()=>{const back=()=>setTabState(new URLSearchParams(window.location.search).get('view')==='home'?'academic':new URLSearchParams(window.location.search).get('view')||'academic');window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back);},[]);
  const [options,setOptions]=useState<Options|null>(null);
  const [context,setContext]=useState<Context>({program:'',branch:'',year:'',semester:'',subject:''});
  const [subjects,setSubjects]=useState<Subject[]>([]);
  const [cos,setCos]=useState<SyllabusItem[]>([]);
  const [units,setUnits]=useState<SyllabusItem[]>([]);
  const [topics,setTopics]=useState<SyllabusItem[]>([]);
  const [filters,setFilters]=useState<Filters>(emptyFilters);
  const [questions,setQuestions]=useState<Question[]>([]);
  const [total,setTotal]=useState(0);const [offset,setOffset]=useState(0);
  const [loading,setLoading]=useState(true);const [bankLoading,setBankLoading]=useState(false);
  const [error,setError]=useState('');const [notice,setNotice]=useState('');const [refresh,setRefresh]=useState(0);
  const [dialog,setDialog]=useState<'question'|'subject'|'cos'|'units'|'topics'|'details'|'imports'|null>(null);
  const [selected,setSelected]=useState<Question|null>(null);
  const program=options?.programs.find(p=>p.code===context.program);
  const selectedSubject=subjects.find(s=>s.id===context.subject);
  function changeContext(key:keyof Context,value:string){
    const order:(keyof Context)[]=['program','branch','year','semester','subject'];
    const next={...context,[key]:value};for(const dependent of order.slice(order.indexOf(key)+1))next[dependent]='';
    if(key!=='subject')setSubjects([]);setCos([]);setUnits([]);setTopics([]);setQuestions([]);setTotal(0);setContext(next);setFilters(emptyFilters);setOffset(0);setSelected(null);setNotice('');setError('');
  }
  useEffect(()=>{
    const controller=new AbortController();
    qpgApi.get<Options>('academic-options',controller.signal).then(setOptions).catch(e=>{if(!controller.signal.aborted)setError(collegeError(e));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[]);
  useEffect(()=>{
    if(!context.program||!context.branch||!context.year||!context.semester)return;
    const controller=new AbortController();
    const query=new URLSearchParams({program_code:context.program,branch_code:context.branch,year_number:context.year,semester_number:context.semester});
    qpgApi.get<{items:Subject[]}>(`subjects?${query}`,controller.signal).then(r=>setSubjects(r.items)).catch(e=>{if(!controller.signal.aborted)setError(collegeError(e));});
    return ()=>controller.abort();
  },[context.program,context.branch,context.year,context.semester,refresh]);
  useEffect(()=>{
    if(!context.subject)return;
    const controller=new AbortController();
    void (async()=>{
      try{
        const [c,u]=await Promise.all([qpgApi.get<{items:SyllabusItem[]}>(`subjects/${context.subject}/cos`,controller.signal),qpgApi.get<{items:SyllabusItem[]}>(`subjects/${context.subject}/units`,controller.signal)]);
        const t=await Promise.all(u.items.map(unit=>qpgApi.get<{items:SyllabusItem[]}>(`units/${unit.id}/topics`,controller.signal)));
        if(!controller.signal.aborted){setCos(c.items);setUnits(u.items);setTopics(t.flatMap(r=>r.items));}
      }catch(e){if(!controller.signal.aborted)setError(collegeError(e));}
    })();return ()=>controller.abort();
  },[context.subject,refresh]);
  useEffect(()=>{
    if(!context.subject||!['bank','drafts'].includes(tab))return;
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      setBankLoading(true);
      const query=new URLSearchParams({subject_id:context.subject,limit:'50',offset:String(offset)});
      Object.entries(filters).forEach(([key,value])=>{if(value)query.set(key,value);});
      if(tab==='drafts')query.set('status','DRAFT');
      qpgApi.get<{items:Question[];total:number}>(`questions?${query}`,controller.signal).then(r=>{setQuestions(r.items);setTotal(r.total);}).catch(e=>{if(!controller.signal.aborted)setError(collegeError(e));}).finally(()=>{if(!controller.signal.aborted)setBankLoading(false);});
    },200);return ()=>{clearTimeout(timer);controller.abort();};
  },[context.subject,filters,offset,tab,refresh]);
  const saved=()=>{setDialog(null);setSelected(null);setRefresh(v=>v+1);setNotice('Saved successfully.');setError('');};
  function filter(key:keyof Filters,value:string){setFilters({...filters,[key]:value,...(key==='unit_id'?{topic_id:''}:{})});setOffset(0);}
  async function archive(question:Question){
    if(!window.confirm('Archive this question? It will remain available in history.'))return;
    try{await qpgApi.save(`questions/${question.id}/archive`,{expected_version:question.version});saved();}catch(e){setError(collegeError(e));}
  }
  return <main className="erp-workspace min-w-0">
    <header className="mb-6"><p className="text-sm text-slate-500">{institution}</p><h1 className="mt-1 text-2xl font-bold">Question Paper Generation</h1><p className="mt-2 text-sm text-slate-500">Manage your subject syllabus and faculty question bank.</p></header>
    <nav aria-label="Question paper sections" className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 pb-2">{[['academic','Subject Master'],['syllabus','Syllabus Master'],['papers','Question Papers'],['templates','Templates'],['reports','Reports']].map(([key,title])=><Button key={key} className="shrink-0 focus-visible:ring-2 focus-visible:ring-indigo-600" aria-current={(key==='academic'||key==='syllabus'?tab===key:key==='papers'?module==='papers'||module==='bank':module===key)?'page':undefined} variant={(key==='academic'||key==='syllabus'?tab===key:key==='papers'?module==='papers'||module==='bank':module===key)?'default':'ghost'} onClick={()=>setTab(key)}>{title}</Button>)}</nav>
    {['bank','papers'].includes(module)&&<nav aria-label="Question Papers workspace" className="mb-4 flex gap-2"><Button variant={module==='bank'?'default':'outline'} onClick={()=>setTab('bank')}>Question Bank</Button><Button variant={module==='papers'?'default':'outline'} onClick={()=>setTab('papers')}>Paper Assembly</Button></nav>}
    {module==='bank'&&<nav aria-label="Question bank views" className="mb-4 flex gap-2 overflow-x-auto">{[['bank','Questions'],['imports','Import PYQ'],['generate','AI Generate'],['review','Review'],['intelligence','Intelligence'],['drafts','Question Drafts']].map(([key,title])=><Button key={key} className="shrink-0" aria-label={key==='review'?'Question bank review':undefined} aria-current={tab===key?'page':undefined} variant={tab===key?'default':'outline'} onClick={()=>setTab(key)}>{title}</Button>)}</nav>}
    {module==='papers'&&<nav aria-label="Question paper views" className="mb-4 flex gap-2 overflow-x-auto"><Button className="shrink-0" variant={tab==='blueprint'?'default':'outline'} onClick={()=>setTab('blueprint')}>Paper Patterns</Button>{([['create','Create Paper'],['drafts','Drafts'],['review','Review'],['final','Final Papers']] as const).map(([key,title])=><Button key={key} className="shrink-0" aria-label={key==='create'?'Create paper view':key==='review'?'Paper review view':undefined} aria-current={tab==='papers'&&paperView===key?'page':undefined} variant={tab==='papers'&&paperView===key?'default':'outline'} onClick={()=>{setPaperView(key);setTab('papers');}}>{title}</Button>)}</nav>}
    {error&&<p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice&&<p role="status" className="mb-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-700">{notice}</p>}
    {loading?<p role="status">Loading academic options…</p>:options&&<>
      {tab!=='home'&&tab!=='reports'&&selectedSubject&&<section aria-label="Selected academic context" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3"><p className="text-sm">{program?.display_name||selectedSubject.program_code} › {context.branch} › Year {context.year} › Semester {context.semester} › {selectedSubject.code} · {selectedSubject.name}</p><Button variant="outline" size="sm" onClick={()=>setChangingContext(v=>!v)}>{changingContext?'Close context':'Change context'}</Button></section>}
      {(tab==='academic'||tab==='reports'||!context.subject||changingContext)&&!['home','templates'].includes(tab)&&<section className="erp-card"><h2>Subject Master</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Select title="Program" value={context.program} onChange={v=>changeContext('program',v)} items={options.programs.map(p=>({value:p.code,title:p.display_name}))}/>
        <Select title="Branch" value={context.branch} disabled={!program} onChange={v=>changeContext('branch',v)} items={(program?.departments||[]).map(d=>({value:d.code,title:d.display_name}))}/>
        <Select title="Year" value={context.year} disabled={!context.branch} onChange={v=>changeContext('year',v)} items={Array.from({length:program?.duration_years||0},(_,i)=>({value:String(i+1),title:`Year ${i+1}`}))}/>
        <Select title="Semester" value={context.semester} disabled={!context.year} onChange={v=>changeContext('semester',v)} items={context.year?[1,2].map(n=>({value:String(Number(context.year)*2-2+n),title:`Semester ${Number(context.year)*2-2+n}`})):[]}/>
        <Select title="Subject" value={context.subject} disabled={!context.semester} onChange={v=>changeContext('subject',v)} items={subjects.map(s=>({value:s.id,title:`${s.code} · ${s.name}`}))}/>
      </div>{options.can_setup&&context.semester&&<Button className="mt-4" variant="outline" onClick={()=>setDialog('subject')}><Plus size={15}/>Link existing ERP subject</Button>}
      {context.semester&&!subjects.length&&<p className="mt-3">No subjects are linked to this context yet. An institution administrator can link an existing ERP subject.</p>}
      {!options.programs.length&&<p>No academic program/branch is available to your account. Ask your institution administrator to configure or assign it in Institution Management.</p>}
      </section>}
      {tab==='syllabus'&&selectedSubject&&<QpgSyllabusPanel key={selectedSubject.id} subject={selectedSubject} onChange={()=>setRefresh(v=>v+1)}/>}
      {tab==='templates'&&<QpgTemplatesPanel/>}
      {tab==='reports'&&<QpgReportsPanel key={context.subject} subject={selectedSubject}/>}
      {tab==='imports'&&<section className="erp-card"><h2>Import PYQ / Questions</h2><p>Upload Excel, CSV, PDF or DOCX; map, preview and correct before confirming. Imported questions still require faculty review.</p><Button disabled={!selectedSubject||!options.can_write} onClick={()=>setDialog('imports')}>Import Questions</Button></section>}
      {tab==='papers'&&selectedSubject&&<QpgPaperPanel key={selectedSubject.id+paperView} subject={selectedSubject} view={paperView} onCreate={()=>setPaperView('create')} onReview={()=>setTab('review')}/>}
      {tab==='papers'&&!context.subject&&<p>Select your academic context and subject to assemble a paper.</p>}
      {tab==='blueprint'&&selectedSubject&&<QpgBlueprintPanel key={selectedSubject.id} subject={selectedSubject}/>}
      {tab==='blueprint'&&!context.subject&&<p>Select your academic context and subject to configure a blueprint.</p>}
      {tab==='generate'&&selectedSubject&&<QpgGeneratePanel key={selectedSubject.id} subject={selectedSubject} canWrite={options.can_write} onAccepted={()=>setRefresh(v=>v+1)} onReview={()=>setTab('review')}/>}
      {tab==='generate'&&!selectedSubject&&<p>Select a subject to generate questions.</p>}
      {tab==='intelligence'&&selectedSubject&&<QpgRepetitionPanel key={selectedSubject.id} subject={selectedSubject}/>}
      {tab==='review'&&selectedSubject&&<QpgReviewPanel key={selectedSubject.id+refresh} subject={selectedSubject} cos={cos} units={units} topics={topics} canWrite={options.can_write} onEdit={q=>{setSelected(q);setDialog('question');}}/>}
      {tab==='review'&&!selectedSubject&&<p>Select a subject to review questions.</p>}
      {['bank','drafts'].includes(tab)&&<section className="erp-card"><div className="flex flex-wrap items-center justify-between gap-3"><h2>{tab==='drafts'?'Draft Questions':'Question Bank'}</h2>{options.can_write&&<Button disabled={!context.subject} onClick={()=>{setSelected(null);setDialog('question');}}><Plus size={16}/>Add Question</Button>}</div>
        {!context.subject?<p>Select your academic context and subject to view questions.</p>:<>
          <div className="my-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field><FieldLabel htmlFor="qpg-search">Search questions</FieldLabel><input id="qpg-search" className={inputClass} value={filters.q} onChange={e=>filter('q',e.target.value)} placeholder="Search question text"/></Field>
          <Select title="Unit filter" value={filters.unit_id} onChange={v=>filter('unit_id',v)} items={units.map(x=>({value:x.id,title:x.code+' · '+x.title}))}/>
          <Select title="Topic filter" value={filters.topic_id} onChange={v=>filter('topic_id',v)} items={topics.filter(x=>!filters.unit_id||x.unit_id===filters.unit_id).map(x=>({value:x.id,title:x.title}))}/>
          <Select title="Bloom filter" value={filters.bloom_level} onChange={v=>filter('bloom_level',v)} items={blooms}/>
          <Select title="Difficulty filter" value={filters.difficulty} onChange={v=>filter('difficulty',v)} items={difficulties}/>
          <Select title="Question type filter" value={filters.question_type} onChange={v=>filter('question_type',v)} items={questionTypes}/>
          {tab!=='drafts'&&<Select title="Status filter" value={filters.status} onChange={v=>filter('status',v)} items={statuses}/>}</div>
          {bankLoading?<p role="status">Loading questions…</p>:<><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Question','Type','Marks','CO','Unit','Topic','Bloom','Difficulty','Status','Source','Updated','Actions'].map(h=><th key={h} className="whitespace-nowrap border-b p-3">{h}</th>)}</tr></thead><tbody>{questions.map(question=><tr key={question.id} className="border-b border-slate-100">
            <td className="min-w-60 max-w-sm p-3"><button className="text-left font-medium text-indigo-600 hover:underline" onClick={()=>{setSelected(question);setDialog('details');}}>{question.question_text}</button><p className="mt-1 text-xs text-slate-500">Version {question.version}</p></td>
            {[label(question.question_type),question.marks,cos.find(x=>x.id===question.co_id)?.code||'—',units.find(x=>x.id===question.unit_id)?.code||'—',topics.find(x=>x.id===question.topic_id)?.title||'—',question.bloom_level,label(question.difficulty)].map((value,i)=><td key={i} className="p-3">{value}</td>)}
            <td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{label(question.status)}</span></td><td className="p-3">{label(question.source_type)}</td><td className="whitespace-nowrap p-3">{new Date(question.updated_at).toLocaleDateString()}</td><td className="p-3"><div className="flex gap-2">{options.can_write&&question.status!=='ARCHIVED'&&<><Button size="sm" variant="outline" onClick={()=>{setSelected(question);setDialog('question');}}>Edit</Button><Button size="sm" variant="ghost" onClick={()=>void archive(question)}>Archive</Button></>}</div></td>
          </tr>)}</tbody></table></div>{!questions.length&&!error&&<p className="py-6">No questions match these filters.</p>}<div className="mt-4 flex items-center justify-between"><p className="text-sm text-slate-500">{total} questions</p><div className="flex gap-2"><Button variant="outline" disabled={offset===0} onClick={()=>setOffset(v=>Math.max(0,v-50))}>Previous</Button><Button variant="outline" disabled={offset+50>=total} onClick={()=>setOffset(v=>v+50)}>Next</Button></div></div></>}
        </>}
      </section>}
      {dialog==='imports'&&selectedSubject&&<QpgImportPanel subject={selectedSubject} cos={cos} units={units} topics={topics} onClose={()=>{setDialog(null);if(tab==='imports')setTab('bank');setRefresh(v=>v+1);}}/>}
      {dialog==='question'&&selectedSubject&&<QuestionForm subject={selectedSubject} question={selected} cos={cos} units={units} topics={topics} onClose={()=>setDialog(null)} onSaved={saved}/>}
      {dialog==='details'&&selected&&<QuestionDetails question={selected} cos={cos} units={units} topics={topics} canWrite={options.can_write} onClose={()=>setDialog(null)}/>}
      {dialog==='subject'&&<SetupForm title="Link existing ERP subject" onClose={()=>setDialog(null)} onSubmit={async data=>{await qpgApi.save('subjects',{erp_subject_id:data.subject,program_code:context.program,branch_code:context.branch,year_number:Number(context.year),semester_number:Number(context.semester)});saved();}}>
        <label className="grid gap-2 text-sm">ERP subject<select className={inputClass} name="subject" required><option value="">Select subject</option>{options.erp_subjects.filter(s=>!s.department_code||s.department_code===context.branch).map(s=><option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</select></label><p className="text-sm text-slate-500">Create new subject identities in Institution Management. This links an existing subject to the selected year and semester.</p>
      </SetupForm>}
      {dialog&&['cos','units','topics'].includes(dialog)&&<SetupForm title={`Add ${dialog==='cos'?'course outcome':dialog==='units'?'unit':'topic'}`} onClose={()=>setDialog(null)} onSubmit={async data=>{const path=dialog==='topics'?`units/${data.unit}/topics`:`subjects/${context.subject}/${dialog}`;await qpgApi.save(path,{code:data.code,title:data.title});saved();}}>
        {dialog==='topics'&&<label className="grid gap-2 text-sm">Unit<select name="unit" className={inputClass} required><option value="">Select unit</option>{units.map(u=><option key={u.id} value={u.id}>{u.code} · {u.title}</option>)}</select></label>}
        <label className="grid gap-2 text-sm">Code<input name="code" className={inputClass} required maxLength={80}/></label><label className="grid gap-2 text-sm">Title / description<textarea name="title" className={inputClass} required maxLength={500}/></label>
      </SetupForm>}
    </>}
  </main>;
}

function Select({title,value,onChange,items,disabled=false}:{title:string;value:string;onChange:(v:string)=>void;items:(string|{value:string;title:string})[];disabled?:boolean}){
  return <label className="grid min-w-0 gap-2 text-sm">{title}<select aria-label={title} className={inputClass} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}><option value="">Select / all</option>{items.map(item=>{const v=typeof item==='string'?item:item.value;return <option key={v} value={v}>{typeof item==='string'?label(item):item.title}</option>;})}</select></label>;
}


function SetupForm({title,onClose,onSubmit,children}:{title:string;onClose:()=>void;onSubmit:(data:Record<string,string>)=>Promise<void>;children:ReactNode}){
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');try{await onSubmit(Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>);}catch(e){setError(collegeError(e));}finally{setBusy(false);}}
  return <Dialog title={title} onClose={onClose}><form className="grid gap-4" onSubmit={save}>{error&&<p role="alert" className="text-red-700">{error}</p>}{children}<Button disabled={busy} type="submit">{busy?'Saving…':'Save'}</Button></form></Dialog>;
}

function QuestionForm({subject,question,cos,units,topics,onClose,onSaved}:{subject:Subject;question:Question|null;cos:SyllabusItem[];units:SyllabusItem[];topics:SyllabusItem[];onClose:()=>void;onSaved:()=>void}){
  const [type,setType]=useState(question?.question_type||'SHORT_ANSWER');const [unit,setUnit]=useState(question?.unit_id||'');const [topic,setTopic]=useState(question?.topic_id||'');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError('');const data=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>;
    const body={subject_id:subject.id,question_text:data.question_text.trim(),question_type:type,marks:Number(data.marks),co_id:data.co_id||null,unit_id:unit||null,topic_id:topic||null,bloom_level:data.bloom_level,difficulty:data.difficulty,answer:data.answer,options:type==='MCQ'?data.options.split('\n').map(s=>s.trim()).filter(Boolean):[],source_type:question?.source_type||'MANUAL',source_reference:data.source_reference,change_reason:data.change_reason||'',...(question?{expected_version:question.version}:{})};
    if(body.question_text.length<3){setError('Enter a question of at least three characters.');return;}
    setBusy(true);try{await qpgApi.save(question?`questions/${question.id}`:'questions',body,Boolean(question));onSaved();}catch(e){setError(collegeError(e));}finally{setBusy(false);}
  }
  return <Dialog title={question?'Edit Question':'Add Question'} onClose={onClose}><form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
    <p className="text-sm text-slate-500 sm:col-span-2">{subject.code} · {subject.name}{question?` · Version ${question.version}; saving creates a new version.${question.status==='APPROVED'?' Approved edits require review again.':''}`:' · New questions start as Draft.'}</p>
    {error&&<p role="alert" className="text-red-700 sm:col-span-2">{error}</p>}
    <label className="grid gap-2 text-sm sm:col-span-2">Question Text<textarea name="question_text" className={`${inputClass} min-h-28`} required minLength={3} maxLength={20000} defaultValue={question?.question_text}/></label>
    <Select title="Question Type" value={type} onChange={setType} items={questionTypes}/>
    <label className="grid gap-2 text-sm">Marks<input name="marks" className={inputClass} type="number" min="0.01" max="1000" step="0.01" required defaultValue={question?.marks||2}/></label>
    <label className="grid gap-2 text-sm">CO<select name="co_id" className={inputClass} defaultValue={question?.co_id||''}><option value="">Not assigned</option>{cos.map(c=><option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}</select></label>
    <Select title="Unit" value={unit} onChange={v=>{setUnit(v);setTopic('');}} items={units.map(u=>({value:u.id,title:u.code+' · '+u.title}))}/>
    <Select title="Topic" value={topic} disabled={!unit} onChange={setTopic} items={topics.filter(t=>t.unit_id===unit).map(t=>({value:t.id,title:t.title}))}/>
    <label className="grid gap-2 text-sm">Bloom level<select className={inputClass} name="bloom_level" required defaultValue={question?.bloom_level||'K1'}>{blooms.map(b=><option key={b}>{b}</option>)}</select></label>
    <label className="grid gap-2 text-sm">Difficulty<select className={inputClass} name="difficulty" required defaultValue={question?.difficulty||'MEDIUM'}>{difficulties.map(d=><option key={d} value={d}>{label(d)}</option>)}</select></label>
    <label className="grid gap-2 text-sm">Source Type<select className={inputClass} disabled value={question?.source_type||'MANUAL'}>{sourceTypes.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label>
    {type==='MCQ'&&<label className="grid gap-2 text-sm sm:col-span-2">MCQ options — one per line<textarea name="options" required className={inputClass} defaultValue={question?.options.join('\n')||''}/></label>}
    <label className="grid gap-2 text-sm sm:col-span-2">Answer / Solution<textarea name="answer" className={`${inputClass} min-h-24`} maxLength={30000} defaultValue={question?.answer||''}/></label>
    <label className="grid gap-2 text-sm sm:col-span-2">Source Reference<input name="source_reference" className={inputClass} maxLength={1000} defaultValue={question?.source_reference||''}/></label>
    {question&&<label className="grid gap-2 text-sm sm:col-span-2">Change reason<input name="change_reason" className={inputClass} maxLength={1000}/></label>}
    <div className="flex justify-end gap-2 sm:col-span-2"><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy||!type}>{busy?'Saving…':question?'Save new version':'Save Question'}</Button></div>
  </form></Dialog>;
}

function QuestionDetails({question,cos,units,topics,onClose,canWrite}:{question:Question;cos:SyllabusItem[];units:SyllabusItem[];topics:SyllabusItem[];onClose:()=>void;canWrite:boolean}){
  const [current,setCurrent]=useState(question);const [history,setHistory]=useState<QuestionVersion[]>([]);const [error,setError]=useState('');
  useEffect(()=>{const c=new AbortController();Promise.all([qpgApi.get<Question>(`questions/${question.id}`,c.signal),qpgApi.get<{items:QuestionVersion[]}>(`questions/${question.id}/versions`,c.signal)]).then(([q,h])=>{setCurrent(q);setHistory(h.items);}).catch(e=>{if(!c.signal.aborted)setError(collegeError(e));});return ()=>c.abort();},[question.id]);
  return <Dialog title="Question Details" onClose={onClose}>{error&&<p role="alert">{error}</p>}<p className="mb-4 whitespace-pre-wrap text-lg font-medium">{current.question_text}</p><dl className="grid gap-3 text-sm sm:grid-cols-2">{Object.entries({Type:label(current.question_type),Marks:current.marks,CO:cos.find(c=>c.id===current.co_id)?.code||'—',Unit:units.find(u=>u.id===current.unit_id)?.title||'—',Topic:topics.find(t=>t.id===current.topic_id)?.title||'—',Bloom:current.bloom_level,Difficulty:label(current.difficulty),Status:label(current.status),Source:label(current.source_type),'Source reference':canWrite?(current.source_reference||'—'):'Restricted',Version:current.version,'Updated by':current.updated_by,'Updated at':new Date(current.updated_at).toLocaleString()}).map(([k,v])=><div key={k}><dt className="text-slate-500">{k}</dt><dd className="break-words">{v}</dd></div>)}</dl>{current.options.length>0&&<ol className="my-4 list-inside list-decimal">{current.options.map((o,i)=><li key={i}>{o}</li>)}</ol>}<h3 className="mb-2 mt-5 font-semibold">Answer / Solution</h3><p className="whitespace-pre-wrap">{canWrite?(current.answer||'Not provided'):'Answer access requires academic write permission.'}</p><QpgQuestionIntelligencePanel question={current} canWrite={canWrite}/><h3 className="mb-2 mt-6 font-semibold">Version history</h3>{history.map(v=><details key={v.id} className="mb-3 rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-sm">Version {v.version} · {new Date(v.created_at).toLocaleString()} · {canWrite?(v.change_reason||'Question saved'):'Question saved'}</summary><p className="mt-2 text-xs text-slate-500">Actor: {canWrite?v.actor:'Restricted'}</p><p className="mt-2 whitespace-pre-wrap">{v.content.question_text}</p><p className="text-sm">{v.content.marks} marks · {v.content.bloom_level} · {label(v.content.status)}</p><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{canWrite?JSON.stringify(v.content,null,2):'Answer details are restricted.'}</pre></details>)}</Dialog>;
}
