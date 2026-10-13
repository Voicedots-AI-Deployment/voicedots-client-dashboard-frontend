import { useEffect, useState } from 'react';
import { collegeApi, collegeError } from '@/api/collegeApi';
import { CandidateScorecard } from './CandidateScorecard';
import { displayName, formatPlacementDateTime } from './placementDisplay';

type Report = { session_id: string; drive_id?: string; role_title?: string; completed_at?: string; overall_score?: number | null; readiness?: string; detail: Record<string, any> };
type Bundle = { student: Record<string, any>; reports: Report[] };
const button = 'rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-violet-300 hover:text-violet-700';

export default function DriveCandidateScorecard({driveId,studentId,onBack,onManage}: {driveId:string;studentId:string;onBack:()=>void;onManage:()=>void}) {
  const [bundle,setBundle]=useState<Bundle|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[photo,setPhoto]=useState(''),[selected,setSelected]=useState('');
  useEffect(()=>{
    const controller=new AbortController();setBundle(null);setError('');setPhoto('');setSelected('');
    collegeApi.get<Bundle>(`students/${encodeURIComponent(studentId)}/reports`,controller.signal).then(value=>{if(!controller.signal.aborted)setBundle(value)}).catch(reason=>{if(!controller.signal.aborted)setError(collegeError(reason))});
    collegeApi.get<{photo?:string}>(`attendance/photos/students/${encodeURIComponent(studentId)}?optional=true`,controller.signal).then(value=>{if(!controller.signal.aborted)setPhoto(value.photo||'')}).catch(()=>{});
    return()=>controller.abort();
  },[studentId,driveId,retry]);
  const reports=(bundle?.reports||[]).filter(report=>report.drive_id===driveId);
  const report=reports.find(report=>report.session_id===selected)||reports[0];
  const detail=report?.detail||{},student=bundle?.student||{};
  const dimensions=[...(detail.core_dimensions||[]),...(detail.domain_dimensions||[])];
  const breakdown=detail.score_breakdown||Object.fromEntries(dimensions.map(item=>[String(item.dimension||'').toLowerCase().replaceAll(' ','_'),item.percentage??null]));
  const initials=String(student.full_name||'Student').split(/\s+/).slice(0,2).map(part=>part[0]).join('');
  return <section className="drive-candidate-scorecard space-y-5" aria-label="Drive candidate assessment scorecard">
    <div className="flex flex-wrap items-center justify-between gap-3"><button className={button} onClick={onBack}>← Candidates</button><button className={button} onClick={onManage}>Manage candidate & attempts</button></div>
    <header><p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Interview assessment</p><h2 className="mt-1 text-2xl font-semibold text-slate-900">Candidate Assessment Scorecard</h2><p className="mt-2 text-sm text-slate-500">Role-specific interview evidence for placement team review.</p></header>
    {error?<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">{error}<button className={`${button} ml-3`} onClick={()=>setRetry(value=>value+1)}>Retry</button></div>:!bundle?<p role="status">Loading candidate scorecard…</p>:<>
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-4">{photo?<img src={photo} alt={`${student.full_name} profile`} onError={()=>setPhoto('')} className="h-28 w-24 shrink-0 rounded-xl border border-slate-200 object-cover"/>:<span aria-label={`${student.full_name||'Student'} initials`} className="grid h-28 w-24 shrink-0 place-items-center rounded-xl bg-violet-50 text-xl font-semibold text-violet-700">{initials}</span>}<div><h3 className="text-xl font-semibold">{student.full_name||'Student'}</h3><p className="mt-1 text-sm text-slate-500">{[student.program,student.department_code,student.graduation_year?`Class of ${student.graduation_year}`:null].filter(Boolean).join(' · ')}</p></div></div><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">{[['Target role',report?.role_title||'Not assessed'],['Scorecard ID',report?.session_id||'Not available'],['Assessment date',report?.completed_at?formatPlacementDateTime(report.completed_at,'Asia/Kolkata'):'Not assessed']].map(([label,value])=><div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-all font-medium">{value}</dd></div>)}</dl></section>
      {reports.length>1&&<label className="block text-sm font-medium">Interview attempt<select className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3" value={report?.session_id} onChange={event=>setSelected(event.target.value)}>{reports.map((item,index)=><option key={item.session_id} value={item.session_id}>{item.completed_at?formatPlacementDateTime(item.completed_at,'Asia/Kolkata'):`Assessment ${index+1}`}</option>)}</select></label>}
      {report?<><div className="grid gap-4 sm:grid-cols-3">{[['Overall score',report.overall_score==null?'Not assessed':`${report.overall_score}/100`],['Readiness',report.readiness?displayName(report.readiness):'Not assessed'],['Assessment scope',`${Object.values(breakdown).filter(value=>value!=null).length} competencies`]].map(([label,value])=><article key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs text-slate-500">{label}</p><strong className="mt-2 block text-2xl font-semibold text-violet-700">{value}</strong></article>)}</div>
      <CandidateScorecard view={{...detail,score_breakdown:breakdown,core_dimensions:detail.core_dimensions||[],domain_dimensions:detail.domain_dimensions||[],strengths:(detail.strengths||[]).map((value:any)=>typeof value==='string'?{text:value}:value),priority_improvement_areas:detail.priority_improvement_areas||[],question_reviews:detail.question_reviews||[]}} onQuestions={()=>document.getElementById('drive-scorecard-evidence')?.scrollIntoView({behavior:'smooth'})} onFeedback={()=>document.querySelector('.drive-candidate-scorecard .scorecard-explore')?.scrollIntoView({behavior:'smooth'})}/>
      <section id="drive-scorecard-evidence" className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">All interview evidence</h3>{(detail.question_reviews||[]).map((question:any,index:number)=><details key={index} className="mt-3 rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-medium">{index+1}. {question.question||'Interview question'}</summary><p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{question.answer||'No answer saved.'}</p></details>)}</section></>:<section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">No assessment available for this drive</h3><p className="mt-2 text-sm text-slate-500">The candidate’s scorecard will appear after their interview is assessed.</p></section>}
    </>}
  </section>;
}
