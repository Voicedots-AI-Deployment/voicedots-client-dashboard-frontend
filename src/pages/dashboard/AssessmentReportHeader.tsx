import { useEffect, useState } from 'react';
import { BarChart3, FileText } from 'lucide-react';
import { collegeApi } from '@/api/collegeApi';
import { displayName, formatPlacementDateTime } from './placementDisplay';
import './assessment-report-reference.css';
type Data = Record<string, any>;
export default function AssessmentReportHeader({student,report,drive,competencyCount,questionCount,duration,status,error}:{student:Data;report:Data;drive:Data|null;competencyCount:number;questionCount:number;duration:unknown;status?:string;error?:string}) {
 const [photo,setPhoto]=useState('');
 useEffect(()=>{const controller=new AbortController();setPhoto('');if(student.id||student.student_id)void collegeApi.get<{photo?:string}>(`attendance/photos/students/${encodeURIComponent(student.id||student.student_id)}?optional=true`,controller.signal).then(value=>{if(!controller.signal.aborted)setPhoto(value.photo||'')}).catch(()=>{});return()=>controller.abort();},[student.id,student.student_id]);
 const score=typeof report.overall_score==='number'?report.overall_score:null;
 const initials=String(student.full_name||'Candidate').split(/\s+/).slice(0,2).map(part=>part[0]).join('');
 const seconds=typeof duration==='number'?duration:null;
 return <section className="assessment-report-reference" aria-label="Candidate assessment summary">
  <header><h1>Candidate Assessment Scorecard</h1><p>Role-specific interview evidence for employer review</p></header>
  <div className="assessment-reference-summary">
   <div className="assessment-reference-profile">{photo?<img src={photo} alt={`${student.full_name} profile`} onError={()=>setPhoto('')}/>:<span className="assessment-reference-avatar" aria-label="Candidate initials">{initials}</span>}<div><h2>{student.full_name||'Candidate'}</h2><p>{[student.program,student.department_code,student.graduation_year?`Class of ${student.graduation_year}`:null].filter(Boolean).join(' · ')}</p><dl><div><dt>Student ID</dt><dd>{student.roll_number||student.student_id||'Not recorded'}</dd></div>{student.email&&<div><dt>Email</dt><dd>{student.email}</dd></div>}<div><dt>Target role</dt><dd>{drive?.role_title||report.role_title||'Not recorded'}</dd></div><div><dt>Scorecard ID</dt><dd>{report.session_id||'Unavailable'}</dd></div><div><dt>Assessment date</dt><dd>{report.completed_at?formatPlacementDateTime(report.completed_at):'Not recorded'}</dd></div><div><dt>Interview</dt><dd>{seconds==null?'Duration not recorded':`${Math.floor(seconds/60)} min ${Math.floor(seconds%60)} sec`} · {questionCount} questions</dd></div></dl>{status&&<p className="assessment-reference-status">{status}</p>}{error&&<p className="assessment-reference-error" role="alert">{error}</p>}</div></div>
   <article className="assessment-reference-kpi blue"><h3>Overall score</h3><strong>{score==null?'—':Math.round(score)}<small>/100</small></strong><progress value={score??0} max={100} aria-label="Overall interview score"/><p>{score==null?'Not assessed':'Recorded interview assessment'}</p></article>
   <article className="assessment-reference-kpi amber"><h3>Readiness</h3><b>{report.readiness?displayName(report.readiness):'Not assessed'}</b><FileText size={26}/><p>Recorded interview readiness</p></article>
   <article className="assessment-reference-kpi green"><h3>Assessment scope</h3><strong>{competencyCount}</strong><p>Competencies assessed</p><BarChart3 size={30}/></article>
  </div>
 </section>;
}
