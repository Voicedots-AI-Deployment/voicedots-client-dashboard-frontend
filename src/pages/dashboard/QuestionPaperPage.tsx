import {apiClient} from '@/api/apiClient';
import QpgSyllabusExtractPanel, {type Course} from './QpgSyllabusExtractPanel';
import QpgReportsPanel from './QpgReportsPanel';
import QpgTemplatesPanel from './QpgTemplatesPanel';
import QpgQuestionIntelligencePanel from './QpgQuestionIntelligencePanel';
import QpgRepetitionPanel from './QpgRepetitionPanel';
import QpgGeneratePanel from './QpgGeneratePanel';
import QpgReviewPanel from './QpgReviewPanel';
import QpgPaperPanel from './QpgPaperPanel';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Plus, Upload } from 'lucide-react';
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
  function setTab(value:string){setTabState(value);setError('');setNotice('');setOffset(0);const url=new URL(window.location.href);url.searchParams.set('view',value);window.history.replaceState(null,'',url);}
  useEffect(()=>{const back=()=>setTabState(new URLSearchParams(window.location.search).get('view')==='home'?'academic':new URLSearchParams(window.location.search).get('view')||'academic');window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back);},[]);
  const [curriculum,setCurriculum]=useState<Course[]>([]);
  const [savedCurricula,setSavedCurricula]=useState<{id:string;filename:string;course_count:number}[]>([]);
  const [curriculumId,setCurriculumId]=useState('');
  const [curriculumFile,setCurriculumFile]=useState<File|null>(null);
  const [extracting,setExtracting]=useState(false);
  const [creatingCourse,setCreatingCourse]=useState(false);
  const [courseCode,setCourseCode]=useState('');
  const [reviewCourse,setReviewCourse]=useState<Course|null>(null);
  const [reviewSubject,setReviewSubject]=useState('');
  const [syllabusRefresh,setSyllabusRefresh]=useState(0);
  const [options,setOptions]=useState<Options|null>(null);
  const [context,setContext]=useState<Context>({program:'',branch:'',year:'',semester:'',subject:''});
  const [subjects,setSubjects]=useState<Subject[]>([]);
  const [cos,setCos]=useState<SyllabusItem[]>([]);
  const [units,setUnits]=useState<SyllabusItem[]>([]);
  const [topics,setTopics]=useState<SyllabusItem[]>([]);
  const [filters,setFilters]=useState<Filters>(emptyFilters);
  const activeFilterCount=Object.entries(filters).filter(([key,value])=>value&&(tab!=='drafts'||key!=='status')).length;
  const clearFilters=()=>{setFilters(emptyFilters);setOffset(0);};
  const [questions,setQuestions]=useState<Question[]>([]);
  const [total,setTotal]=useState(0);const [offset,setOffset]=useState(0);
  const [loading,setLoading]=useState(true);const [bankLoading,setBankLoading]=useState(false);
  const [error,setError]=useState('');const [notice,setNotice]=useState('');const [refresh,setRefresh]=useState(0);
  const [dialog,setDialog]=useState<'question'|'subject'|'cos'|'units'|'topics'|'details'|'imports'|null>(null);
  const [selected,setSelected]=useState<Question|null>(null);
  const program=options?.programs.find(p=>p.code===context.program);
  const selectedSubject=subjects.find(s=>s.id===context.subject);
  function changeContext(key:keyof Context,value:string){
    if(creatingCourse||extracting)return;
    setCourseCode('');
    const order:(keyof Context)[]=['program','branch','year','semester','subject'];
    const next={...context,[key]:value};for(const dependent of order.slice(order.indexOf(key)+1))next[dependent]='';
    if(key!=='subject')setSubjects([]);setCos([]);setUnits([]);setTopics([]);setQuestions([]);setTotal(0);setContext(next);setFilters(emptyFilters);setOffset(0);setSelected(null);setNotice('');setError('');
  }
  useEffect(()=>{const controller=new AbortController();qpgApi.get<{items:{id:string;filename:string;course_count:number}[]}>('curricula',controller.signal).then(r=>setSavedCurricula(r.items)).catch(e=>{if(!controller.signal.aborted)setError(collegeError(e));});return()=>controller.abort();},[]);
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
    {['bank','papers'].includes(module)&&<nav aria-label="Question Papers workspace" className="mb-4 flex gap-2"><Button variant={module==='bank'?'default':'outline'} onClick={()=>setTab('bank')}>Question Bank</Button><Button variant={module==='papers'?'default':'outline'} onClick={()=>setTab('papers')}>Prepare Paper</Button></nav>}
    {module==='bank'&&<nav aria-label="Question bank views" className="mb-4 flex flex-wrap items-center gap-x-5 border-b border-slate-200 dark:border-slate-700">{[['bank','Questions'],['imports','Import Questions'],['generate','Generate with AI'],['review','Review']].map(([key,title])=><button type="button" key={key} aria-label={key==='review'?'Question bank review':undefined} aria-current={tab===key?'page':undefined} className={`border-b-2 px-1 py-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${tab===key?'border-indigo-600 text-indigo-700 dark:text-indigo-300':'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300'}`} onClick={()=>setTab(key)}>{title}</button>)}<details className="relative ml-auto py-2"><summary className="cursor-pointer text-sm text-slate-600 dark:text-slate-300">{tab==='drafts'?'Question Drafts':tab==='intelligence'?'Usage and repetition':'More options'}</summary><div className="absolute right-0 z-10 mt-2 grid min-w-48 gap-2 rounded-xl border bg-white p-3 shadow-lg dark:bg-slate-900"><Button variant="ghost" onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setTab('drafts');}}>Question Drafts</Button><Button variant="ghost" onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setTab('intelligence');}}>Usage and repetition</Button></div></details></nav>}
    {module==='papers'&&<nav aria-label="Question paper views" className="mb-4 flex gap-2 overflow-x-auto"><Button className="shrink-0" variant={tab==='blueprint'?'default':'outline'} onClick={()=>setTab('blueprint')}>Paper Patterns</Button>{([['create','Create Paper'],['drafts','Drafts'],['review','Review'],['final','Final Papers']] as const).map(([key,title])=><Button key={key} className="shrink-0" aria-label={key==='create'?'Create paper view':key==='review'?'Paper review view':undefined} aria-current={tab==='papers'&&paperView===key?'page':undefined} variant={tab==='papers'&&paperView===key?'default':'outline'} onClick={()=>{setPaperView(key);setTab('papers');}}>{title}</Button>)}</nav>}
    {module==='papers'&&<section aria-label="Getting started" className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950"><h2 className="font-semibold">Prepare your question paper</h2><p className="my-2 text-sm">Start with your subject and syllabus. Choose a pattern, add approved questions, then check and download your paper. Save drafts whenever you need a break.</p><div className="flex flex-wrap gap-2">{[['academic','1. Select subject'],['syllabus','2. Set up syllabus'],['blueprint','3. Choose pattern'],['papers','4. Add questions and check']] .map(([key,title])=><Button key={key} size="sm" variant="outline" onClick={()=>{if(key==='papers')setPaperView('create');setTab(key);}}>{title}</Button>)}</div></section>}
    {error&&<p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice&&<p role="status" className="mb-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-700">{notice}</p>}
    {loading?<p role="status">Loading academic options…</p>:options&&<>
      {tab!=='home'&&tab!=='reports'&&selectedSubject&&<section aria-label="Selected academic context" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3"><p className="text-sm">{program?.display_name||selectedSubject.program_code} › {context.branch} › Year {context.year} › Semester {context.semester} › {selectedSubject.code} · {selectedSubject.name}</p><Button variant="outline" size="sm" disabled={extracting||creatingCourse} onClick={()=>{setChangingContext(false);setTab('academic');window.scrollTo({top:0,behavior:'smooth'});}}>Change Subject</Button></section>}
      {tab==='academic'&&options.can_write&&<section className="erp-card mb-5"><h2>1. Choose your curriculum</h2><label className="my-3 grid gap-2 text-sm">Saved curricula<select className="rounded-lg border bg-white p-3 dark:bg-slate-900" value={curriculumId} disabled={extracting||creatingCourse} onChange={e=>{const id=e.target.value;setCurriculumId(id);setCourseCode('');setReviewCourse(null);setCurriculum([]);if(!id)return;setExtracting(true);void qpgApi.get<{courses:Course[]}>(`curricula/${id}`).then(r=>{setCurriculum(r.courses);setNotice('Saved curriculum loaded. Choose the academic context and subject.');}).catch(e=>setError(collegeError(e))).finally(()=>setExtracting(false));}}><option value="">Choose a saved curriculum or upload a new one</option>{savedCurricula.map(c=><option key={c.id} value={c.id}>{c.filename} · {c.course_count} courses</option>)}</select></label><p className="my-2 text-sm text-slate-500">Choose a saved document, or upload a new one. Your document is retained for future use.</p><details className="my-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:bg-slate-900" open={!savedCurricula.length}><summary className="cursor-pointer text-sm font-medium">Upload a new curriculum</summary><div className="mt-4 flex flex-wrap items-center gap-3"><input aria-label="Curriculum document" type="file" accept=".pdf,.docx" disabled={extracting||creatingCourse} onChange={e=>{setCurriculumFile(e.target.files?.[0]||null);setCurriculum([]);setCurriculumId('');setCourseCode('');setReviewCourse(null);}}/><Button disabled={extracting||creatingCourse||!curriculumFile} onClick={()=>void (async()=>{setExtracting(true);setCurriculum([]);setCourseCode('');setError('');try{if(!curriculumFile||curriculumFile.size>10*1024*1024||!curriculumFile.size)throw new Error('Choose a non-empty PDF or DOCX up to 10 MB.');const body=new FormData();body.append('file',curriculumFile!);const result=await apiClient.post<{courses:Course[];id:string;filename:string}>('/v3/college/question-papers/syllabus/extract',body,{headers:{'Content-Type':'multipart/form-data'},timeout:125000});setCurriculum(result.data.courses);setCurriculumId(result.data.id);setSavedCurricula(old=>[{id:result.data.id,filename:result.data.filename,course_count:result.data.courses.length},...old.filter(c=>c.id!==result.data.id)]);setCourseCode('');setReviewCourse(null);setNotice(`${result.data.courses.length} courses extracted. Select the academic context below.`);}catch(e){setError(collegeError(e));}finally{setExtracting(false);}})()}>{extracting?'Extracting courses…':'Upload & extract courses'}</Button></div></details><p className="mt-2 text-xs text-slate-500">PDF or DOCX · up to 10 MB. Original file and all extracted courses are saved. Reopen them from Saved curricula; each syllabus requires separate review.</p>{curriculum.length>0&&<p className="mt-3 text-sm">Document: {curriculum[0].program_name||'Program not detected'} · {curriculum[0].branch_name||'Branch not detected'}. Confirm the corresponding program and branch below.</p>}</section>}
      {tab==='syllabus'&&reviewCourse&&selectedSubject&&reviewSubject===selectedSubject.id&&<QpgSyllabusExtractPanel key={`${reviewSubject}:${reviewCourse.code}`} root="syllabus" initialCourse={reviewCourse} onCourseChange={setReviewCourse} revision={1} target={`${selectedSubject.name} (${selectedSubject.code})`} disabled={false} onImport={async payload=>{
        try{
          const root=`subjects/${selectedSubject.id}/syllabus`;
          let syllabus=await qpgApi.get<{current:{status:string;revision:number}|null}>(root);
          if(!syllabus.current||syllabus.current.status!=='DRAFT')syllabus=await qpgApi.save(`${root}/draft`,{});
          await qpgApi.save(`${root}/import`,{...payload,expected_revision:syllabus.current!.revision});
          setRefresh(v=>v+1);setSyllabusRefresh(v=>v+1);setReviewCourse(null);setNotice('Draft saved. Next: check the Course Outcomes, Units and Topics below. Select Review & Publish, review the summary, then click Publish syllabus.');return true;
        }catch(e){throw e;}
      }}/>}
      {(tab==='academic'||tab==='reports'||!context.subject||changingContext)&&!['home','templates'].includes(tab)&&<section id="qpg-subject-destination" className="erp-card"><h2>{tab==='academic'&&curriculum.length?"2. Choose academic context":"Select your subject"}</h2><p className="mb-4 mt-1 text-sm text-slate-500">Choose each field from left to right.</p><fieldset disabled={extracting||creatingCourse} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Select title="Program" value={context.program} onChange={v=>changeContext('program',v)} items={options.programs.map(p=>({value:p.code,title:p.display_name}))}/>
        <Select title="Branch" value={context.branch} disabled={!program} onChange={v=>changeContext('branch',v)} items={(program?.departments||[]).map(d=>({value:d.code,title:d.display_name}))}/>
        <Select title="Year" value={context.year} disabled={!context.branch} onChange={v=>changeContext('year',v)} items={Array.from({length:program?.duration_years||0},(_,i)=>({value:String(i+1),title:`Year ${i+1}`}))}/>
        <Select title="Semester" value={context.semester} disabled={!context.year} onChange={v=>changeContext('semester',v)} items={context.year?[1,2].map(n=>({value:String(Number(context.year)*2-2+n),title:`Semester ${Number(context.year)*2-2+n}`})):[]}/>
        {(tab!=='academic'||!curriculum.length)&&<Select title="Subject" value={context.subject} disabled={!context.semester} onChange={v=>changeContext('subject',v)} items={subjects.map(s=>({value:s.id,title:`${s.code} · ${s.name}`}))}/>}
      </fieldset>{(tab!=='academic'||!curriculum.length)&&options.can_setup&&context.semester&&<Button className="mt-4" variant="outline" onClick={()=>setDialog('subject')}><Plus size={15}/>Add Existing Subject</Button>}
      {(tab!=='academic'||!curriculum.length)&&context.semester&&!subjects.length&&<p className="mt-3">No subjects are linked to this context yet. An institution administrator can link an existing subject.</p>}
      {!options.programs.length&&<p>No academic program/branch is available to your account. Ask your institution administrator to configure or assign it in Institution Management.</p>}
      </section>}
      {tab==='academic'&&curriculum.length>0&&<section className="erp-card mt-4"><h2>3. Choose a subject</h2><p className="mt-1 text-sm text-slate-500">Continue to Syllabus Master to check its content. Nothing is published at this step.</p>{!context.program||!context.branch||!context.year||!context.semester?<p className="my-3 text-sm">Select Program → Branch → Year → Semester above to see the matching courses.</p>:<>
        <label className="my-3 grid gap-2 text-sm">Curriculum subject<select className="rounded-lg border bg-white p-3 dark:bg-slate-900" value={courseCode} disabled={extracting||creatingCourse} onChange={e=>{setCourseCode(e.target.value);}}><option value="">Choose subject</option>{curriculum.filter(c=>(!c.year_number||c.year_number===Number(context.year))&&(!c.semester_number||c.semester_number===Number(context.semester))).map((c,i)=><option key={`${c.code}:${i}`} value={c.code}>{c.code} · {c.name}{!c.year_number?' · Confirm year/semester':''}</option>)}</select></label>
        {courseCode&&curriculum.some(c=>c.code===courseCode&&(!c.year_number||c.year_number===Number(context.year))&&(!c.semester_number||c.semester_number===Number(context.semester)))&&<><Button disabled={!options.can_setup||extracting||creatingCourse} onClick={()=>void (async()=>{setCreatingCourse(true);setError('');try{const course=curriculum.find(c=>c.code===courseCode)!;const subject=await qpgApi.save<Subject>('subjects/from-curriculum',{code:course.code,name:course.name,program_code:context.program,branch_code:context.branch,year_number:Number(context.year),semester_number:Number(context.semester)});setSubjects(old=>[...old.filter(x=>x.id!==subject.id),subject]);setContext(old=>({...old,subject:subject.id}));setReviewCourse(course);setReviewSubject(subject.id);setTab('syllabus');}catch(e){setError(collegeError(e));}finally{setCreatingCourse(false);}})()}>{creatingCourse?'Preparing syllabus review…':'Continue to Syllabus Master'}</Button>{!options.can_setup&&<p className="mt-2 text-sm">An administrator must create this subject context.</p>}</>}
      </>}</section>}
      {tab==='syllabus'&&selectedSubject&&!(reviewCourse&&reviewSubject===selectedSubject.id)&&<QpgSyllabusPanel key={selectedSubject.id+syllabusRefresh} subject={selectedSubject} onChange={()=>{setNotice('');setRefresh(v=>v+1);}}/>}
      {tab==='templates'&&<QpgTemplatesPanel/>}
      {tab==='reports'&&<QpgReportsPanel key={context.subject} subject={selectedSubject}/>}
      {tab==='imports'&&<section className="erp-card max-w-4xl" aria-label="Import questions"><h2>Import Questions</h2><p className="mb-5 mt-2 text-sm text-slate-500">Bring questions from an existing file into {selectedSubject?.name||'your subject'}.</p><ol className="mb-6 grid gap-3 sm:grid-cols-3">{[['1','Upload your file','Excel, CSV, text PDF or DOCX'],['2','Review the preview','Check the text, marks and syllabus mappings'],['3','Confirm the import','Selected questions are saved for faculty review']].map(([number,title,description])=><li key={number} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><span className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{number}</span><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-slate-500">{description}</p></li>)}</ol><div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 p-7 text-center dark:border-slate-700"><Upload size={30} className="text-indigo-600" aria-hidden="true"/><h3 className="font-semibold">Add your question document</h3><p className="text-sm text-slate-500">Up to 10 MB and 500 questions per import.</p><Button disabled={!selectedSubject||!options.can_write} onClick={()=>setDialog('imports')}>Choose a file to import</Button>{!selectedSubject&&<p className="text-xs text-amber-700">Select a subject first.</p>}{selectedSubject&&!options.can_write&&<p className="text-xs text-slate-500">Importing requires editing access.</p>}</div><p className="mt-3 text-xs text-slate-500">You review the file before anything is imported. Questions must be approved before they can be used in a paper.</p></section>}
      {tab==='papers'&&selectedSubject&&<QpgPaperPanel key={selectedSubject.id+paperView} subject={selectedSubject} view={paperView} onCreate={()=>setPaperView('create')} onPatterns={()=>setTab('blueprint')} onReview={()=>setTab('review')}/>}
      {tab==='papers'&&!context.subject&&<p>Select your academic context and subject to assemble a paper.</p>}
      {tab==='blueprint'&&selectedSubject&&<QpgBlueprintPanel key={selectedSubject.id} subject={selectedSubject} onSyllabus={()=>setTab("syllabus")}/>}
      {tab==='blueprint'&&!context.subject&&<p>Select your academic context and subject to configure a blueprint.</p>}
      {tab==='generate'&&selectedSubject&&<QpgGeneratePanel key={selectedSubject.id} subject={selectedSubject} canWrite={options.can_write} onAccepted={()=>setRefresh(v=>v+1)} onReview={()=>setTab('review')}/>}
      {tab==='generate'&&!selectedSubject&&<p>Select a subject to generate questions.</p>}
      {tab==='intelligence'&&selectedSubject&&<QpgRepetitionPanel key={selectedSubject.id} subject={selectedSubject}/>}
      {tab==='review'&&selectedSubject&&<QpgReviewPanel key={selectedSubject.id+refresh} subject={selectedSubject} cos={cos} units={units} topics={topics} canWrite={options.can_write} onEdit={q=>{setSelected(q);setDialog('question');}}/>}
      {tab==='review'&&!selectedSubject&&<p>Select a subject to review questions.</p>}
      {['bank','drafts'].includes(tab)&&<section className="erp-card"><div className="flex flex-wrap items-center justify-between gap-3"><h2>{tab==='drafts'?'Draft Questions':'Question Bank'}</h2>{options.can_write&&<Button disabled={!context.subject} onClick={()=>{setSelected(null);setDialog('question');}}><Plus size={16}/>Add Question</Button>}</div>
        {tab==='drafts'&&<p className="mt-2 text-sm text-slate-500">Questions you are still preparing. Edit them, then submit them for faculty review.</p>}
        {!context.subject?<p>Select your academic context and subject to view questions.</p>:<>
          <div className="my-5 max-w-xl"><Field><FieldLabel htmlFor="qpg-search">Search questions</FieldLabel><input id="qpg-search" className={inputClass} value={filters.q} onChange={e=>filter('q',e.target.value)} placeholder={tab==='drafts'?'Search draft questions':'Search question text'}/></Field></div>
          <details className="mb-5 rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-medium">Filters{activeFilterCount>0?` · ${activeFilterCount} active`: ""}</summary><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select title="Unit filter" value={filters.unit_id} onChange={v=>filter('unit_id',v)} items={units.map(x=>({value:x.id,title:x.code+' · '+x.title}))}/>
          <Select title="Topic filter" value={filters.topic_id} onChange={v=>filter('topic_id',v)} items={topics.filter(x=>!filters.unit_id||x.unit_id===filters.unit_id).map(x=>({value:x.id,title:x.title}))}/>
          <Select title="Bloom filter" value={filters.bloom_level} onChange={v=>filter('bloom_level',v)} items={blooms}/>
          <Select title="Difficulty filter" value={filters.difficulty} onChange={v=>filter('difficulty',v)} items={difficulties}/>
          <Select title="Question type filter" value={filters.question_type} onChange={v=>filter('question_type',v)} items={questionTypes}/>
          {tab!=='drafts'&&<Select title="Status filter" value={filters.status} onChange={v=>filter('status',v)} items={statuses}/>}</div>{activeFilterCount>0&&<Button className="mt-3" variant="ghost" onClick={clearFilters}>Clear filters</Button>}</details>
          {bankLoading?<p role="status">Loading questions…</p>:<>{questions.length>0&&<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Question','Type','Marks','CO','Unit','Topic','Bloom','Difficulty','Status','Source','Updated','Actions'].map(h=><th key={h} className="whitespace-nowrap border-b p-3">{h}</th>)}</tr></thead><tbody>{questions.map(question=><tr key={question.id} className="border-b border-slate-100">
            <td className="min-w-60 max-w-sm p-3"><button className="text-left font-medium text-indigo-600 hover:underline" onClick={()=>{setSelected(question);setDialog('details');}}>{question.question_text}</button><p className="mt-1 text-xs text-slate-500">Version {question.version}</p></td>
            {[label(question.question_type),question.marks,cos.find(x=>x.id===question.co_id)?.code||'—',units.find(x=>x.id===question.unit_id)?.code||'—',topics.find(x=>x.id===question.topic_id)?.title||'—',question.bloom_level,label(question.difficulty)].map((value,i)=><td key={i} className="p-3">{value}</td>)}
            <td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{label(question.status)}</span></td><td className="p-3">{label(question.source_type)}</td><td className="whitespace-nowrap p-3">{new Date(question.updated_at).toLocaleDateString()}</td><td className="p-3"><div className="flex gap-2">{options.can_write&&question.status!=='ARCHIVED'&&<><Button size="sm" variant="outline" onClick={()=>{setSelected(question);setDialog('question');}}>Edit</Button><Button size="sm" variant="ghost" onClick={()=>void archive(question)}>Archive</Button></>}</div></td>
          </tr>)}</tbody></table></div>}{!questions.length&&!error&&<div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900"><h3 className="font-semibold">{activeFilterCount?'No matching questions':tab==='drafts'?'No draft questions yet':'No questions yet'}</h3><p className="mt-2 text-sm text-slate-500">{activeFilterCount?'Try another search or clear your filters.':tab==='drafts'?'Save a question as a draft to continue working on it here.':'Add your first question to get started.'}</p>{activeFilterCount>0?<Button className="mt-4" variant="outline" onClick={clearFilters}>Clear filters</Button>:options.can_write&&<Button className="mt-4" variant="outline" onClick={()=>{setSelected(null);setDialog('question');}}><Plus size={16}/>Add Question</Button>}</div>}{total>0&&<div className="mt-4 flex items-center justify-between"><p className="text-sm text-slate-500">{total} questions</p><div className="flex gap-2"><Button variant="outline" disabled={offset===0} onClick={()=>setOffset(v=>Math.max(0,v-50))}>Previous</Button><Button variant="outline" disabled={offset+50>=total} onClick={()=>setOffset(v=>v+50)}>Next</Button></div></div>}</>}
        </>}
      </section>}
      {dialog==='imports'&&selectedSubject&&<QpgImportPanel subject={selectedSubject} cos={cos} units={units} topics={topics} onClose={()=>{setDialog(null);setRefresh(v=>v+1);}} onViewQuestions={()=>{setDialog(null);setTab('bank');setRefresh(v=>v+1);}}/>}
      {dialog==='question'&&selectedSubject&&<QuestionForm subject={selectedSubject} question={selected} cos={cos} units={units} topics={topics} onClose={()=>setDialog(null)} onSaved={saved}/>}
      {dialog==='details'&&selected&&<QuestionDetails question={selected} cos={cos} units={units} topics={topics} canWrite={options.can_write} onClose={()=>setDialog(null)}/>}
      {dialog==='subject'&&<SetupForm title="Add Existing Subject" onClose={()=>setDialog(null)} onSubmit={async data=>{await qpgApi.save('subjects',{erp_subject_id:data.subject,program_code:context.program,branch_code:context.branch,year_number:Number(context.year),semester_number:Number(context.semester)});saved();}}>
        <label className="grid gap-2 text-sm">Existing subject<select className={inputClass} name="subject" required><option value="">Select subject</option>{options.erp_subjects.filter(s=>!s.department_code||s.department_code===context.branch).map(s=><option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</select></label><p className="text-sm text-slate-500">Create new subject identities in Institution Management. This links an existing subject to the selected year and semester.</p>
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
    <label className="grid gap-2 text-sm">Course Outcome (CO)<select name="co_id" className={inputClass} defaultValue={question?.co_id||''}><option value="">Not assigned</option>{cos.map(c=><option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}</select></label>
    <Select title="Unit" value={unit} onChange={v=>{setUnit(v);setTopic('');}} items={units.map(u=>({value:u.id,title:u.code+' · '+u.title}))}/>
    <Select title="Topic" value={topic} disabled={!unit} onChange={setTopic} items={topics.filter(t=>t.unit_id===unit).map(t=>({value:t.id,title:t.title}))}/>
    <label className="grid gap-2 text-sm">Bloom level<select className={inputClass} name="bloom_level" required defaultValue={question?.bloom_level||'K1'}>{blooms.map(b=><option key={b} value={b}>{label(b)}</option>)}</select></label>
    <label className="grid gap-2 text-sm">Difficulty<select className={inputClass} name="difficulty" required defaultValue={question?.difficulty||'MEDIUM'}>{difficulties.map(d=><option key={d} value={d}>{label(d)}</option>)}</select></label>
    <label className="grid gap-2 text-sm">Source Type<select className={inputClass} disabled value={question?.source_type||'MANUAL'}>{sourceTypes.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label>
    {type==='MCQ'&&<label className="grid gap-2 text-sm sm:col-span-2">MCQ options — one per line<textarea name="options" required className={inputClass} defaultValue={question?.options.join('\n')||''}/></label>}
    <label className="grid gap-2 text-sm sm:col-span-2">Answer / Solution<textarea name="answer" className={`${inputClass} min-h-24`} maxLength={30000} defaultValue={question?.answer||''}/></label>
    <label className="grid gap-2 text-sm sm:col-span-2">Source Reference<input name="source_reference" className={inputClass} maxLength={1000} defaultValue={question?.source_reference||''}/></label>
    {question&&<label className="grid gap-2 text-sm sm:col-span-2">Change reason<input name="change_reason" className={inputClass} maxLength={1000}/></label>}
    <div className="flex justify-end gap-2 sm:col-span-2"><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy||!type}>{busy?'Saving…':question?'Save new version':'Save Draft'}</Button></div>
  </form></Dialog>;
}

function QuestionDetails({question,cos,units,topics,onClose,canWrite}:{question:Question;cos:SyllabusItem[];units:SyllabusItem[];topics:SyllabusItem[];onClose:()=>void;canWrite:boolean}){
  const [current,setCurrent]=useState(question);const [history,setHistory]=useState<QuestionVersion[]>([]);const [error,setError]=useState('');
  useEffect(()=>{const c=new AbortController();Promise.all([qpgApi.get<Question>(`questions/${question.id}`,c.signal),qpgApi.get<{items:QuestionVersion[]}>(`questions/${question.id}/versions`,c.signal)]).then(([q,h])=>{setCurrent(q);setHistory(h.items);}).catch(e=>{if(!c.signal.aborted)setError(collegeError(e));});return ()=>c.abort();},[question.id]);
  return <Dialog title="Question Details" onClose={onClose}>{error&&<p role="alert">{error}</p>}<p className="mb-4 whitespace-pre-wrap text-lg font-medium">{current.question_text}</p><dl className="grid gap-3 text-sm sm:grid-cols-2">{Object.entries({Type:label(current.question_type),Marks:current.marks,CO:cos.find(c=>c.id===current.co_id)?.code||'—',Unit:units.find(u=>u.id===current.unit_id)?.title||'—',Topic:topics.find(t=>t.id===current.topic_id)?.title||'—',Bloom:current.bloom_level,Difficulty:label(current.difficulty),Status:label(current.status),Source:label(current.source_type),'Source reference':canWrite?(current.source_reference||'—'):'Restricted',Version:current.version,'Updated by':current.updated_by,'Updated at':new Date(current.updated_at).toLocaleString()}).map(([k,v])=><div key={k}><dt className="text-slate-500">{k}</dt><dd className="break-words">{v}</dd></div>)}</dl>{current.options.length>0&&<ol className="my-4 list-inside list-decimal">{current.options.map((o,i)=><li key={i}>{o}</li>)}</ol>}<h3 className="mb-2 mt-5 font-semibold">Answer / Solution</h3><p className="whitespace-pre-wrap">{canWrite?(current.answer||'Not provided'):'Answer access requires academic write permission.'}</p><details className="my-4 rounded-xl border p-3"><summary className="cursor-pointer font-semibold">Advanced: similarity and usage</summary><QpgQuestionIntelligencePanel question={current} canWrite={canWrite}/></details><h3 className="mb-2 mt-6 font-semibold">Version history</h3>{history.map(v=><details key={v.id} className="mb-3 rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-sm">Version {v.version} · {new Date(v.created_at).toLocaleString()} · {canWrite?(v.change_reason||'Question saved'):'Question saved'}</summary><p className="mt-2 text-xs text-slate-500">Actor: {canWrite?v.actor:'Restricted'}</p><p className="mt-2 whitespace-pre-wrap">{v.content.question_text}</p><p className="text-sm">{v.content.marks} marks · {v.content.bloom_level} · {label(v.content.status)}</p><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{canWrite?JSON.stringify(v.content,null,2):'Answer details are restricted.'}</pre></details>)}</Dialog>;
}
