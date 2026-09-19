import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import { collegeApi, collegeError, type Drive, type Program, type RoundConfiguration } from '@/api/collegeApi';
import type { AgentLibrary, Selection } from './interviewAgentTypes';
import { defaultSelection, selectionName } from './interviewAgentTypes';
import { displayName } from './placementDisplay';

const input = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-indigo-500 dark:border-slate-700 dark:bg-slate-900';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 dark:border-slate-700';
const primary = `${button} border-indigo-600 bg-indigo-600 text-white`;
const panel = 'rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900';
const steps = ['Drive & company', 'Interview configuration', 'Interview agents / rounds', 'Questions', 'Eligibility', 'Review & create'];

type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type FormState = { drive_type:string; company_name:string; company_description:string; company_website:string; company_linkedin:string; role_title:string; job_type:string; location:string; package_min_lpa:string; package_max_lpa:string; jd_text:string; window_start:string; window_end:string; duration:string; max_attempts:string; difficulty_tier:Difficulty; min_cgpa:string };
type Preview = { total_students:number; eligible_count:number; not_eligible_count:number; missing_photo_count:number; candidates:{student_id:string;full_name:string;roll_number:string;department_code:string;cgpa?:number;graduation_year?:number}[] };

const empty: FormState = { drive_type:'official_placement', company_name:'', company_description:'', company_website:'', company_linkedin:'', role_title:'', job_type:'full_time', location:'', package_min_lpa:'', package_max_lpa:'', jd_text:'', window_start:'', window_end:'', duration:'30', max_attempts:'1', difficulty_tier:'intermediate', min_cgpa:'0' };
const local = (value?:string) => { if (!value) return ''; const date = new Date(value); return Number.isFinite(date.getTime()) ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''; };
const DRAFT_KEY = 'voicedots:placement-drive-draft:v1';

export default function CreateDriveWizard({ programs, drive, onCancel, onSaved }:{programs:Program[];drive?:Drive|null;onCancel:()=>void;onSaved:(message:string)=>void}) {
  const [step,setStep] = useState(0);
  const [form,setForm] = useState<FormState>(empty);
  const [selection,setSelection] = useState<Selection[]>(defaultSelection);
  const [rounds,setRounds] = useState<RoundConfiguration[]>([]);
  const [programIds,setProgramIds] = useState<string[]>([]);
  const [departments,setDepartments] = useState<string[]>([]);
  const [years,setYears] = useState<string[]>([]);
  const [difficultyConfirmed,setDifficultyConfirmed] = useState(false);
  const [confirmDifficulty,setConfirmDifficulty] = useState(false);
  const [library,setLibrary] = useState<AgentLibrary|null>(null);
  const [preview,setPreview] = useState<Preview|null>(null);
  const [previewBusy,setPreviewBusy] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [generating,setGenerating] = useState('');
  const [draftLoaded,setDraftLoaded] = useState(Boolean(drive));

  useEffect(() => { collegeApi.get<AgentLibrary>('agents').then(setLibrary).catch(error => setError(collegeError(error))); }, []);
  useEffect(() => {
    if (!drive) return;
    setForm({ ...empty, drive_type:drive.drive_type||'official_placement', company_name:drive.company_name||'', company_description:drive.company_description||'', company_website:drive.company_website||'', company_linkedin:drive.company_linkedin||'', role_title:drive.role_title||'', job_type:drive.job_type||'full_time', location:drive.location||'', package_min_lpa:String(drive.package_min_lpa??''), package_max_lpa:String(drive.package_max_lpa??''), jd_text:drive.jd_raw_text||'', window_start:local(drive.window_start_at), window_end:local(drive.window_end_at), duration:String(drive.interview_duration_minutes||30), max_attempts:String(drive.max_attempts||1), difficulty_tier:drive.difficulty_tier||'intermediate', min_cgpa:String(drive.criteria_min_cgpa??0) });
    setSelection(drive.agent_selection?.length ? drive.agent_selection : defaultSelection);
    setRounds(drive.round_configuration || []);
    setProgramIds(drive.criteria_programs || []);
    setDepartments(drive.criteria_department_codes || []);
    setYears((drive.criteria_graduation_years || []).map(String));
  }, [drive]);
  useEffect(() => {
    if (drive) return;
    try {
      const saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
      if (saved) {
        setForm(saved.form||empty); setSelection(saved.selection||defaultSelection); setRounds(saved.rounds||[]);
        setProgramIds(saved.programIds||[]); setDepartments(saved.departments||[]); setYears(saved.years||[]);
        setStep(Number.isInteger(saved.step)?Math.min(5,Math.max(0,saved.step)):0);
      }
    } catch { /* discard a malformed browser draft */ }
    setDraftLoaded(true);
  }, [drive]);
  useEffect(() => {
    if (drive || !draftLoaded) return;
    localStorage.setItem(DRAFT_KEY,JSON.stringify({form,selection,rounds,programIds,departments,years,step,saved_at:new Date().toISOString()}));
  }, [drive,draftLoaded,form,selection,rounds,programIds,departments,years,step]);
  useEffect(() => setRounds(current => selection.map(item => current.find(round => round.track === item.track) || { track:item.track, question_source:'personalized', questions:[] })), [selection]);

  const availableDepartments = useMemo(() => programs.filter(program => programIds.includes(program.code)).flatMap(program => program.departments), [programs,programIds]);
  const recommendations = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return new Set(programs.filter(program => programIds.includes(program.code)).flatMap(program => years.map(Number).map(year => {
      const studyYear = Math.max(1, Math.min(program.duration_years, program.duration_years - (year - currentYear)));
      return studyYear === 1 ? 'beginner' : studyYear === 2 ? 'intermediate' : 'advanced';
    })));
  }, [years,programIds,programs]);
  const recommendation = recommendations.size === 1 ? [...recommendations][0] as Difficulty : null;
  const ambiguousDifficulty = recommendations.size > 1;

  function update<K extends keyof FormState>(key:K,value:FormState[K]) { setForm(current => ({...current,[key]:value})); if (key === 'difficulty_tier') setDifficultyConfirmed(false); }
  function validate(index=step) {
    if (index === 0) {
      if (!form.company_name.trim() || !form.role_title.trim() || !form.location.trim() || !form.jd_text.trim()) return 'Company, role, location and job description are required.';
      if (form.package_min_lpa && form.package_max_lpa && Number(form.package_max_lpa) < Number(form.package_min_lpa)) return 'Package maximum must be at least the minimum.';
    }
    if (index === 1 && (!form.window_start || !form.window_end || new Date(form.window_end) <= new Date(form.window_start))) return 'Interview end must be later than interview start.';
    if (index === 2 && (selection.length < 1 || selection.length > 4)) return 'Select between one and four interview agents.';
    if (index === 3 && rounds.some(round => round.question_source !== 'personalized' && !round.questions.filter(Boolean).length)) return 'Every manual or generated round requires at least one reviewed question.';
    if (index === 4) {
      if (!programIds.length || !departments.length || !years.length) return 'Select programs, departments and graduation years.';
      if (ambiguousDifficulty && !difficultyConfirmed) return 'Confirm the selected drive difficulty because the chosen academic years have different recommendations.';
    }
    return '';
  }
  function next() {
    const message = validate();
    if (message && !(step === 4 && ambiguousDifficulty && !difficultyConfirmed)) { setError(message); return; }
    if (step === 4 && ambiguousDifficulty && !difficultyConfirmed) { setConfirmDifficulty(true); return; }
    setError(''); setStep(value => Math.min(5,value+1));
  }
  function move(index:number,direction:number) { const next=[...selection], target=index+direction; [next[index],next[target]]=[next[target],next[index]]; setSelection(next); }
  function add(value:string) {
    if (!value || selection.length >= 4) return;
    const customId=value.startsWith('custom:')?value.slice(7):'';
    const defaultTrack=value.startsWith('default:')?value.slice(8):'';
    const custom=customId?library?.agents.find(agent=>agent.id===customId):undefined;
    const track=custom?.track||defaultTrack||value;
    const existing=selection.findIndex(item=>item.track===track);
    if (existing >= 0) {
      // Every track starts with its default profile. Choosing a custom agent
      // for that track must replace the default instead of being discarded.
      if (!custom || selection[existing].agent_id) return;
      setSelection(current=>current.map((item,index)=>index===existing?{...item,agent_id:custom.id!}:item));
      return;
    }
    setSelection(current=>[...current,{track,agent_id:custom?.id||null}]);
  }
  async function generate(track:string) {
    setGenerating(track); setError('');
    try {
      const result=await collegeApi.save<{scripted_questions:Record<string,string[]>}>('drive-questions/preview',{role_title:form.role_title,jd_text:form.jd_text,interview_duration_minutes:Number(form.duration),agent_selection:selection.map(({track,agent_id})=>({track,agent_id}))});
      setRounds(all=>all.map(round=>round.track===track?{...round,question_source:'ai_generated',questions:result.scripted_questions[track]||[]}:round));
    } catch (error) { setError(collegeError(error)); } finally { setGenerating(''); }
  }
  async function loadPreview() {
    if (!programIds.length || !departments.length || !years.length) { setPreview(null); return; }
    setPreviewBusy(true); setError('');
    try { setPreview(await collegeApi.save<Preview>('drives/eligibility/preview',{min_cgpa:Number(form.min_cgpa),eligible_programs:programIds,eligible_departments:departments,eligible_graduation_years:years.map(Number),limit:50})); }
    catch (error) { setPreview(null); setError(collegeError(error)); }
    finally { setPreviewBusy(false); }
  }
  useEffect(() => { if (step !== 4) return; const timer=setTimeout(()=>void loadPreview(),300); return()=>clearTimeout(timer); }, [step,form.min_cgpa,programIds.join(','),departments.join(','),years.join(',')]);
  async function submit() {
    for (let index=0;index<5;index++) { const message=validate(index); if (message) { setStep(index); setError(message); return; } }
    if (ambiguousDifficulty && !difficultyConfirmed) { setStep(4); setConfirmDifficulty(true); return; }
    setBusy(true); setError('');
    try {
      const payload={drive_type:form.drive_type,company_name:form.company_name,company_description:form.company_description,company_website:form.company_website,company_linkedin:form.company_linkedin,role_title:form.role_title,job_type:form.job_type,location:form.location,jd_text:form.jd_text,difficulty_tier:form.difficulty_tier,difficulty_confirmed:ambiguousDifficulty?difficultyConfirmed:true,package_min_lpa:form.package_min_lpa?Number(form.package_min_lpa):null,package_max_lpa:form.package_max_lpa?Number(form.package_max_lpa):null,package_currency:'INR',window_start:new Date(form.window_start).toISOString(),window_end:new Date(form.window_end).toISOString(),interview_duration_minutes:Number(form.duration),max_attempts:Number(form.max_attempts),min_cgpa:Number(form.min_cgpa),eligible_programs:programIds,eligible_departments:departments,eligible_graduation_years:years.map(Number),agent_selection:selection.map(({track,agent_id})=>({track,agent_id})),round_configuration:rounds};
      const result=await collegeApi.save<{status?:string;warnings?:string[]}>(drive?`drives/${drive.id}`:'drives',payload,!!drive);
      if (!drive) localStorage.removeItem(DRAFT_KEY);
      onSaved([drive?'Drive settings updated.':`Drive created (${result.status||'saved'}).`,...(result.warnings||[])].join(' '));
    } catch (error) { setError(collegeError(error)); } finally { setBusy(false); }
  }
  const field=(label:string,key:keyof FormState,type='text',required=false)=><label className="block text-sm">{label}<input className={input} type={type} required={required} value={form[key]} onChange={event=>update(key,event.target.value as never)}/></label>;

  return <section className="space-y-6 text-slate-900 dark:text-white">
    <button className={button} onClick={onCancel}><ArrowLeft size={16}/>Back to placement drives</button>
    <header><p className="text-sm font-medium text-indigo-600">Placement management</p><h1 className="mt-1 text-3xl font-bold">{drive?'Drive settings':'Create placement drive'}</h1><p className="mt-2 text-sm text-slate-500">{drive?'Manage the same configuration used to create this drive.':'Complete each step; your entries stay available when moving back.'}</p></header>
    <ol className="grid gap-2 md:grid-cols-6">{steps.map((label,index)=><li key={label} className={`rounded-xl border p-3 text-xs font-semibold ${index===step?'border-indigo-600 bg-indigo-50 text-indigo-700':index<step?'border-emerald-200 text-emerald-700':'text-slate-500'}`}><span>{index<step?<Check size={14} className="inline"/>:index+1}. </span>{label}</li>)}</ol>
    {error&&<p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <div className={panel}>
      {step===0&&<div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Drive type<select className={input} value={form.drive_type} onChange={event=>update('drive_type',event.target.value)}><option value="official_placement">Official Placement</option><option value="college_practice">College Practice</option></select></label>{field('Company','company_name','text',true)}<label className="sm:col-span-2 text-sm">Company details<textarea className={input} rows={3} value={form.company_description} onChange={event=>update('company_description',event.target.value)}/></label>{field('Company website','company_website','url')}{field('LinkedIn','company_linkedin','url')}{field('Role','role_title','text',true)}<label className="text-sm">Job type<select className={input} value={form.job_type} onChange={event=>update('job_type',event.target.value)}><option value="full_time">Full Time</option><option value="internship">Internship</option><option value="internship_plus_ppo">Internship + PPO</option></select></label>{field('Location','location','text',true)}{field('Package minimum (INR/LPA)','package_min_lpa','number')}{field('Package maximum (INR/LPA)','package_max_lpa','number')}<label className="sm:col-span-2 text-sm">Job description<textarea className={input} rows={9} required value={form.jd_text} onChange={event=>update('jd_text',event.target.value)}/></label></div>}
      {step===1&&<div className="grid gap-4 sm:grid-cols-2">{field('Interview start','window_start','datetime-local',true)}{field('Interview end','window_end','datetime-local',true)}<label className="text-sm">Duration<select className={input} value={form.duration} onChange={event=>update('duration',event.target.value)}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option></select></label>{field('Attempts per student','max_attempts','number',true)}<label className="text-sm">Interview difficulty<select className={input} value={form.difficulty_tier} disabled={!!drive&&drive.status!=='draft'} onChange={event=>update('difficulty_tier',event.target.value as Difficulty)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>{drive&&drive.status!=='draft'&&<p className="self-end text-sm text-slate-500">Difficulty is locked because this drive has been finalized.</p>}{recommendation&&<p className="self-end rounded-xl bg-indigo-50 p-3 text-sm text-indigo-700">Recommended from selected academic year: {displayName(recommendation)}. Your explicit choice is preserved.</p>}</div>}
 {step===2&&<div className="space-y-4"><p className="text-sm text-slate-500">Selected order is the interview order. The interview ends after the final configured round.</p>{selection.map((item,index)=><div className="flex flex-wrap items-center gap-2 rounded-xl border p-3" key={item.track}><strong className="min-w-52 flex-1 text-sm">{index+1}. {selectionName(item,library)}</strong><button type="button" className={button} disabled={!index} onClick={()=>move(index,-1)} aria-label={`Move round ${index+1} up`}><ChevronUp size={16}/></button><button type="button" className={button} disabled={index===selection.length-1} onClick={()=>move(index,1)} aria-label={`Move round ${index+1} down`}><ChevronDown size={16}/></button><button type="button" className={button} onClick={()=>setSelection(current=>current.filter((_,position)=>position!==index))}><Trash2 size={16}/>Remove</button></div>)}<label className="block text-sm">Add agent<select className={input} value="" disabled={!library||selection.length>=4} onChange={event=>add(event.target.value)}><option value="">Select agent</option>{library&&[...library.tracks.map(track=>({...track,id:'',name:track.default_profile.name,role:track.default_profile.role})),...library.agents].filter(agent=>!selection.some(item=>agent.id?item.agent_id===agent.id:!item.agent_id&&item.track===agent.track)).map(agent=>{const custom=Boolean(agent.id);const optionValue=custom?`custom:${agent.id}`:`default:${agent.track}`;return <option key={optionValue} value={optionValue}>{agent.name} — {agent.role}{custom?' (custom)':''}</option>})}</select></label></div>}
      {step===3&&<div className="space-y-5">{rounds.map((round,index)=><section className="rounded-xl border p-4" key={round.track}><h3 className="font-semibold">Round {index+1}: {selectionName(selection[index],library)}</h3><label className="mt-3 block text-sm">Question source<select className={input} value={round.question_source} onChange={event=>setRounds(all=>all.map(item=>item.track===round.track?{...item,question_source:event.target.value as RoundConfiguration['question_source'],questions:event.target.value==='personalized'?[]:item.questions}:item))}><option value="personalized">Personalized AI Questions</option><option value="manual">Manual Questions</option><option value="ai_generated">AI Generate Before Creating Drive</option></select></label>{round.question_source==='personalized'?<p className="mt-3 text-sm text-slate-500">Role, JD and the student's resume personalize topics while the selected difficulty remains fixed.</p>:<div className="mt-3 space-y-2">{round.question_source==='ai_generated'&&<button type="button" className={button} disabled={generating===round.track} onClick={()=>void generate(round.track)}>{generating===round.track?'Generating…':'Generate for this round'}</button>}{round.questions.map((question,questionIndex)=><div className="flex gap-2" key={questionIndex}><textarea aria-label={`${round.track} question ${questionIndex+1}`} className={input} value={question} onChange={event=>setRounds(all=>all.map(item=>item.track===round.track?{...item,questions:item.questions.map((value,position)=>position===questionIndex?event.target.value:value)}:item))}/><button type="button" className={button} onClick={()=>setRounds(all=>all.map(item=>item.track===round.track?{...item,questions:item.questions.filter((_,position)=>position!==questionIndex)}:item))}>Remove</button></div>)}<button type="button" className={button} onClick={()=>setRounds(all=>all.map(item=>item.track===round.track?{...item,questions:[...item.questions,'']}:item))}><Plus size={15}/>Add question</button></div>}</section>)}</div>}
      {step===4&&<EligibilityStep programs={programs} programIds={programIds} setProgramIds={value=>{setProgramIds(value);setDifficultyConfirmed(false)}} departments={departments} setDepartments={setDepartments} availableDepartments={availableDepartments} years={years} setYears={value=>{setYears(value);setDifficultyConfirmed(false)}} minCgpa={form.min_cgpa} setMinCgpa={value=>update('min_cgpa',value)} ambiguousDifficulty={ambiguousDifficulty} preview={preview} previewBusy={previewBusy} refresh={()=>void loadPreview()}/>} 
      {step===5&&<div className="grid gap-4 md:grid-cols-2"><Summary title="Drive" lines={[`${displayName(form.drive_type)} · ${form.company_name}`,`${form.role_title} · ${displayName(form.job_type)}`,form.location||'Location not supplied',`${form.package_min_lpa||'—'}–${form.package_max_lpa||'—'} LPA`]}/><Summary title="Interview" lines={[`${form.duration} minutes · ${form.max_attempts} attempt(s)`,`${displayName(form.difficulty_tier)} difficulty`,`${new Date(form.window_start).toLocaleString()} – ${new Date(form.window_end).toLocaleString()}`]}/><Summary title="Interview rounds" lines={selection.map((item,index)=>`${index+1}. ${selectionName(item,library)} · ${displayName(rounds[index]?.question_source||'personalized')}`)}/><Summary title="Eligibility" lines={[`Programs: ${programIds.join(', ')}`,`Departments: ${departments.join(', ')}`,`Graduation: ${years.join(', ')}`,`Minimum CGPA: ${form.min_cgpa}`,preview?`${preview.eligible_count} matching students (${preview.missing_photo_count} missing verification photo)`:'Eligibility preview unavailable',preview?.candidates.slice(0,8).map(candidate=>candidate.full_name).join(', ')||'No matching students']}/></div>}
    </div>
    <footer className="flex justify-between gap-3"><button className={button} disabled={!step||busy} onClick={()=>{setError('');setStep(value=>value-1)}}><ArrowLeft size={16}/>Back</button>{step<5?<button className={primary} disabled={previewBusy} onClick={next}>Continue<ArrowRight size={16}/></button>:<button className={primary} disabled={busy} onClick={()=>void submit()}>{busy?'Creating and evaluating…':drive?'Save changes':'Create & evaluate drive'}</button>}</footer>
    {confirmDifficulty&&<dialog open aria-modal="true" aria-labelledby="difficulty-title" className={`${panel} fixed inset-0 z-50 m-auto max-w-lg text-slate-900 shadow-2xl backdrop:bg-slate-950/50 dark:text-white`}><div className="flex items-start justify-between gap-3"><div><h2 id="difficulty-title" className="text-xl font-bold">Confirm fixed drive difficulty</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">The selected academic years have different recommendations. Every candidate will use <strong>{displayName(form.difficulty_tier)}</strong>. It becomes locked when this drive is finalized.</p></div><button type="button" className={button} aria-label="Close difficulty confirmation" onClick={()=>setConfirmDifficulty(false)}><X size={16}/></button></div><div className="mt-6 flex justify-end gap-3"><button type="button" className={button} onClick={()=>setConfirmDifficulty(false)}>Go back</button><button type="button" className={primary} onClick={()=>{setDifficultyConfirmed(true);setConfirmDifficulty(false);setError('');setStep(5)}}><Check size={16}/>Confirm {displayName(form.difficulty_tier)}</button></div></dialog>}
  </section>;
}

function EligibilityStep({programs,programIds,setProgramIds,departments,setDepartments,availableDepartments,years,setYears,minCgpa,setMinCgpa,ambiguousDifficulty,preview,previewBusy,refresh}:{programs:Program[];programIds:string[];setProgramIds:(value:string[])=>void;departments:string[];setDepartments:(value:string[])=>void;availableDepartments:Program['departments'];years:string[];setYears:(value:string[])=>void;minCgpa:string;setMinCgpa:(value:string)=>void;ambiguousDifficulty:boolean;preview:Preview|null;previewBusy:boolean;refresh:()=>void}) {
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><fieldset><legend className="text-sm font-medium">Eligible programs</legend>{programs.map(program=><label className="mt-2 flex gap-2 text-sm" key={program.code}><input type="checkbox" checked={programIds.includes(program.code)} onChange={event=>{setProgramIds(event.target.checked?[...programIds,program.code]:programIds.filter(code=>code!==program.code));if(!event.target.checked)setDepartments(departments.filter(code=>!program.departments.some(department=>department.code===code)))}}/>{displayName(program.display_name)}</label>)}</fieldset><fieldset><legend className="text-sm font-medium">Eligible departments</legend>{availableDepartments.map(department=><label className="mt-2 flex gap-2 text-sm" key={department.code}><input type="checkbox" checked={departments.includes(department.code)} onChange={event=>setDepartments(event.target.checked?[...departments,department.code]:departments.filter(code=>code!==department.code))}/>{displayName(department.display_name)} ({department.code})</label>)}</fieldset></div><fieldset><legend className="text-sm font-medium">Graduation years</legend><div className="mt-2 flex flex-wrap gap-3">{Array.from({length:6},(_,index)=>new Date().getFullYear()+index).map(year=><label className="flex gap-2 text-sm" key={year}><input type="checkbox" checked={years.includes(String(year))} onChange={event=>setYears(event.target.checked?[...years,String(year)]:years.filter(value=>value!==String(year)))}/>{year}</label>)}</div></fieldset><label className="block max-w-xs text-sm">Minimum CGPA<input className={input} type="number" min="0" max="10" step=".01" value={minCgpa} onChange={event=>setMinCgpa(event.target.value)}/></label>{ambiguousDifficulty&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">The selected years have different recommended levels. Confirm one fixed difficulty before review.</p>}<section aria-live="polite" className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Live eligibility preview</h3><p className="text-sm text-slate-500">Uses the current central student roster and saves nothing.</p></div><button type="button" className={button} disabled={previewBusy||!programIds.length||!departments.length||!years.length} onClick={refresh}>{previewBusy?'Checking…':'Refresh preview'}</button></div>{preview&&<><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><strong className="text-2xl">{preview.eligible_count}</strong><p className="text-xs text-slate-500">Matching students</p></div><div><strong className="text-2xl">{preview.not_eligible_count}</strong><p className="text-xs text-slate-500">Not matching</p></div><div><strong className="text-2xl">{preview.missing_photo_count}</strong><p className="text-xs text-slate-500">Missing verification photo</p></div></div>{preview.eligible_count===0?<p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No students match these criteria. Adjust the eligibility fields before creating the drive.</p>:<div className="mt-4 max-h-64 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Student</th><th className="p-2">Department</th><th className="p-2">CGPA</th><th className="p-2">Graduation</th></tr></thead><tbody>{preview.candidates.map(candidate=><tr className="border-t" key={candidate.student_id}><td className="p-2"><strong>{candidate.full_name}</strong><p className="text-xs text-slate-500">{candidate.roll_number}</p></td><td className="p-2">{candidate.department_code}</td><td className="p-2">{candidate.cgpa??'—'}</td><td className="p-2">{candidate.graduation_year??'—'}</td></tr>)}</tbody></table></div>}</>}</section></div>;
}

function Summary({title,lines}:{title:string;lines:string[]}) { return <section className="rounded-xl border p-4"><h3 className="font-semibold">{title}</h3><ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">{lines.map((line,index)=><li key={`${index}-${line}`}>{line}</li>)}</ul></section>; }
