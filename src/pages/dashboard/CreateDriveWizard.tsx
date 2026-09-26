import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import axios from 'axios';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, CircleAlert, Plus, Save, Trash2, X } from 'lucide-react';
import { collegeApi, collegeError, collegeFieldErrors, type Drive, type Program, type RoundConfiguration } from '@/api/collegeApi';
import type { AgentLibrary, Selection } from './interviewAgentTypes';
import { defaultSelection, roleLabels } from './interviewAgentTypes';
import { displayName, formatWallTime, wallTimeFromInstant, wallTimeToInstant } from './placementDisplay';

const input = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-violet-950';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold transition hover:border-violet-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700';
const primary = `${button} border-violet-600 bg-violet-600 text-white hover:bg-violet-700`;
const panel = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7';
const steps = ['Drive & company', 'Interview setup', 'Interview roles', 'Questions', 'Eligibility', 'Review & create'];
const DRAFT_KEY = 'voicedots:placement-drive-draft:v2';
const CURRENCIES = [['INR','INR · ₹'],['USD','USD · $'],['EUR','EUR · €'],['GBP','GBP · £'],['AUD','AUD · A$'],['CAD','CAD · C$'],['CHF','CHF · Fr'],['CNY','CNY · ¥'],['JPY','JPY · ¥'],['NZD','NZD · NZ$'],['SGD','SGD · S$'],['AED','AED · د.إ'],['SAR','SAR · ر.س'],['ZAR','ZAR · R']] as const;
const HOURS = Array.from({length:12},(_,i)=>String(i+1));
const TRACKS = ['hr','domain','industry','manager'];

type Difficulty = 'beginner'|'intermediate'|'advanced';
type FormState = {
  company_profile_id:string; drive_type:string; company_name:string; company_description:string; company_website:string; company_linkedin:string;
  role_title:string; job_type:string; location:string; salary_type:'fixed'|'range'; salary_min_amount:string; salary_max_amount:string;
  salary_currency:string; salary_period:'annual'|'monthly'; jd_text:string; window_start:string; window_end:string; drive_date:string;
  application_deadline:string; duration:string; max_attempts:string; difficulty_tier:Difficulty; min_cgpa:string;
};
type Candidate = {student_id:string;full_name:string;roll_number:string;department_code:string;cgpa?:number|null;graduation_year?:number|null};
type Preview = {total_students:number;eligible_count:number;not_eligible_count:number;missing_photo_count:number;candidates:Candidate[]};
type CompanyProfile = {id:string;company_name:string;company_description?:string;company_website?:string;company_linkedin?:string};
type DraftPayload = {form:FormState;selection:Selection[];rounds:RoundConfiguration[];programIds:string[];departments:string[];years:string[];step:number;creationKey:string};
type DriveDraft = {id:string;client_draft_key:string;step:number;payload:DraftPayload;updated_at:string};

const empty:FormState = {
  company_profile_id:'',drive_type:'official_placement',company_name:'',company_description:'',company_website:'',company_linkedin:'',
  role_title:'',job_type:'full_time',location:'',salary_type:'range',salary_min_amount:'',salary_max_amount:'',salary_currency:'INR',salary_period:'annual',
  jd_text:'',window_start:'',window_end:'',drive_date:'',application_deadline:'',duration:'30',max_attempts:'1',difficulty_tier:'intermediate',min_cgpa:'0',
};

const dateToApi = (value:string) => value ? `${value.slice(8,10)}-${value.slice(5,7)}-${value.slice(0,4)}` : null;
const dateFromApi = (value?:string|null) => {
  if (!value) return '';
  const match=value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match?`${match[1]}-${match[2]}-${match[3]}`:'';
};
const timeParts = (value:string) => {
  const [hour='09',minute='00']=(value.split('T')[1]||'').split(':');
  const h=Number(hour),ampm=h>=12?'PM':'AM';
  return {hour:String(h%12||12),minute,ampm};
};
const joinDateTime = (date:string,hour:string,minute:string,ampm:string) => {
  if (!date) return '';
  let h=Number(hour)%12;if(ampm==='PM')h+=12;
  return `${date}T${String(h).padStart(2,'0')}:${minute}`;
};

export default function CreateDriveWizard({programs,drive,draftId,collegeTimezone='Asia/Kolkata',onCancel,onSaved}:{programs:Program[];drive?:Drive|null;draftId?:string|null;collegeTimezone?:string;onCancel:()=>void;onSaved:(message:string)=>void}) {
  const [step,setStep]=useState(0),[form,setForm]=useState<FormState>(empty),[selection,setSelection]=useState<Selection[]>(defaultSelection),[rounds,setRounds]=useState<RoundConfiguration[]>([]);
  const [programIds,setProgramIds]=useState<string[]>([]),[departments,setDepartments]=useState<string[]>([]),[years,setYears]=useState<string[]>([]),[availableYears,setAvailableYears]=useState<number[]>([]);
  const [difficultyConfirmed,setDifficultyConfirmed]=useState(false),[confirmDifficulty,setConfirmDifficulty]=useState(false),[library,setLibrary]=useState<AgentLibrary|null>(null);
  const [companyProfiles,setCompanyProfiles]=useState<CompanyProfile[]>([]),[companySearch,setCompanySearch]=useState(''),[companyPickerOpen,setCompanyPickerOpen]=useState(false),[roleSuggestions,setRoleSuggestions]=useState<string[]>([]),[rolePickerOpen,setRolePickerOpen]=useState(false);
  const [preview,setPreview]=useState<Preview|null>(null),[previewRefreshedAt,setPreviewRefreshedAt]=useState<string|null>(null),[previewBusy,setPreviewBusy]=useState(false),[busy,setBusy]=useState(false),[generating,setGenerating]=useState<Set<string>>(()=>new Set());
  const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({}),[formError,setFormError]=useState(''),[notice,setNotice]=useState('');
  const [draftLoaded,setDraftLoaded]=useState(Boolean(drive)),[draftStatus,setDraftStatus]=useState<'saved'|'saving'|'error'|'idle'>('idle');
  const [creationKey,setCreationKey]=useState<string>(()=>crypto.randomUUID());
  const draftIdRef=useRef<string|null>(draftId||null),draftSavingRef=useRef(false),draftResaveRef=useRef(false),draftSaveWaitersRef=useRef<Array<()=>void>>([]),companyPickerRef=useRef<HTMLDivElement|null>(null);

  const availableDepartments=useMemo(()=>programs.filter(program=>programIds.includes(program.code)).flatMap(program=>program.departments),[programs,programIds]);
  const selectedYears=useMemo(()=>years.map(Number).filter(Number.isFinite).sort((a,b)=>a-b),[years]);
  const yearMin=selectedYears.length?selectedYears[0]:(availableYears[0]||new Date().getFullYear());
  const yearMax=selectedYears.length?selectedYears[selectedYears.length-1]:(availableYears.at(-1)||yearMin);
  const filteredCompanies=useMemo(()=>companyProfiles
    .filter(profile=>`${profile.company_name} ${profile.company_website||''}`.toLowerCase().includes(companySearch.trim().toLowerCase()))
    .sort((a,b)=>a.company_name.localeCompare(b.company_name)),[companyProfiles,companySearch]);
  const recommendations=useMemo(()=>{
    const currentYear=new Date().getFullYear();
    return new Set(programs.filter(program=>programIds.includes(program.code)).flatMap(program=>selectedYears.map(year=>{
      const studyYear=Math.max(1,Math.min(program.duration_years,program.duration_years-(year-currentYear)));
      return studyYear===1?'beginner':studyYear===2?'intermediate':'advanced';
    })));
  },[selectedYears,programIds,programs]);
  const recommendation=recommendations.size===1?[...recommendations][0] as Difficulty:null;
  const ambiguousDifficulty=recommendations.size>1;

  useEffect(()=>{
    collegeApi.get<AgentLibrary>('agents').then(setLibrary).catch(e=>setFormError(collegeError(e)));
    collegeApi.get<{graduation_years:number[]}>('academic-catalog').then(value=>setAvailableYears(value.graduation_years||[])).catch(e=>setFormError(collegeError(e)));
    collegeApi.get<CompanyProfile[]>('company-profiles').then(setCompanyProfiles).catch(()=>setCompanyProfiles([]));
  },[]);

  useEffect(()=>{
    function closeCompanyPicker(event:MouseEvent){
      if(event.target instanceof Node&&!companyPickerRef.current?.contains(event.target))setCompanyPickerOpen(false);
    }
    document.addEventListener('mousedown',closeCompanyPicker);
    return()=>document.removeEventListener('mousedown',closeCompanyPicker);
  },[]);

  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>collegeApi.get<string[]>('drives/role-suggestions',controller.signal).then(setRoleSuggestions).catch(()=>{}),180);
    return()=>{clearTimeout(timer);controller.abort();};
  },[]);

  useEffect(()=>{
    if(drive){
      setForm({...empty,company_profile_id:drive.company_profile_id||'',drive_type:drive.drive_type||'official_placement',company_name:drive.company_name||'',company_description:drive.company_description||'',company_website:drive.company_website||'',company_linkedin:drive.company_linkedin||'',role_title:drive.role_title||'',job_type:drive.job_type||'full_time',location:drive.location||'',salary_type:drive.salary_type||(drive.package_min_lpa!=null&&drive.package_max_lpa==null?'fixed':'range'),salary_min_amount:String(drive.salary_min_amount??(drive.package_min_lpa==null?'':drive.package_min_lpa*100000)),salary_max_amount:String(drive.salary_max_amount??(drive.package_max_lpa==null?'':drive.package_max_lpa*100000)),salary_currency:drive.salary_currency||drive.package_currency||'INR',salary_period:drive.salary_period||'annual',jd_text:drive.jd_raw_text||'',window_start:wallTimeFromInstant(drive.window_start_at,collegeTimezone),window_end:wallTimeFromInstant(drive.window_end_at,collegeTimezone),drive_date:dateFromApi(drive.drive_date),application_deadline:dateFromApi(drive.application_deadline),duration:String(drive.interview_duration_minutes||30),max_attempts:String(drive.max_attempts||1),difficulty_tier:drive.difficulty_tier||'intermediate',min_cgpa:String(drive.criteria_min_cgpa??0)});
      setSelection(drive.agent_selection?.length?drive.agent_selection:defaultSelection);setRounds(drive.round_configuration||[]);setProgramIds(drive.criteria_programs||[]);setDepartments(drive.criteria_department_codes||[]);setYears((drive.criteria_graduation_years||[]).map(String));setDraftLoaded(true);return;
    }
    const controller=new AbortController();
    void (async()=>{
      let saved:{id?:string|null;payload?:DraftPayload;saved_at?:string}|null=null;
      try{saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');}catch{localStorage.removeItem(DRAFT_KEY);}
      const savedKey=typeof saved?.payload?.creationKey==='string'?saved.payload.creationKey:crypto.randomUUID();
      let rows:DriveDraft[]=[];
      if(draftId||saved?.id){
        try{rows=await collegeApi.get<DriveDraft[]>('drive-drafts',controller.signal);}catch(error){
          if(controller.signal.aborted)return;
          if(saved?.payload&&(!draftId||saved.id===draftId)){
            hydrate(saved.payload,saved.payload.step??0);setCreationKey(savedKey);draftIdRef.current=null;
            setNotice('Could not sync the saved draft. Recovered the local copy.');
          }else{
            setFormError(axios.isAxiosError(error)&&error.response?.status===404
              ?'Drive not found. This saved draft may have been deleted.'
              :`Could not load this drive draft: ${collegeError(error)}`);
            setDraftLoaded(true);return;
          }
        }
      }
      if(controller.signal.aborted)return;
      const row=rows.find(item=>draftId
        ? item.id===draftId||(item.client_draft_key&&item.client_draft_key===savedKey)
        : item.id===saved?.id||(item.client_draft_key&&item.client_draft_key===savedKey));
      if(row){
        const localIsNewer=Boolean(saved?.payload&&Date.parse(saved.saved_at||'')>Date.parse(row.updated_at||''));
        hydrate(localIsNewer?saved!.payload!:row.payload,localIsNewer?(saved!.payload!.step??0):row.step);
        setCreationKey(row.client_draft_key||savedKey);draftIdRef.current=row.id;
      }else if(saved?.payload&&(!draftId||saved.id===draftId)){
        hydrate(saved.payload,saved.payload.step??0);setCreationKey(savedKey);draftIdRef.current=null;
        if(saved.id)setNotice('Recovered your saved draft. Syncing it to your account now.');
      }else if(draftId)setFormError('Drive not found. This saved draft may have been deleted.');
      setDraftLoaded(true);
    })();
    return()=>controller.abort();
  },[drive,draftId,collegeTimezone]);

  function hydrate(value:DraftPayload,storedStep:number){
    if(value.form)setForm({...empty,...value.form});if(value.selection)setSelection(value.selection);if(value.rounds)setRounds(value.rounds);
    if(value.programIds)setProgramIds(value.programIds);if(value.departments)setDepartments(value.departments);if(value.years)setYears(value.years);
    setStep(Math.min(5,Math.max(0,Number.isInteger(storedStep)?storedStep:value.step||0)));
  }

  useEffect(()=>setRounds(current=>selection.map(item=>current.find(round=>round.track===item.track)||{track:item.track,question_source:'personalized',questions:[]})),[selection]);
  function currentDraftPayload(nextStep=step):DraftPayload{return{form,selection,rounds,programIds,departments,years,step:nextStep,creationKey};}
  const latestDraftRef=useRef<DraftPayload>(currentDraftPayload());
  latestDraftRef.current=currentDraftPayload();

  async function saveDraft(manual=false,nextStep=step){
    if(drive)return false;
    if(draftSavingRef.current){draftResaveRef.current=true;if(manual)setNotice('A draft save is already finishing. Wait for its status before continuing.');return false;}
    const payload={...latestDraftRef.current,step:nextStep};
    localStorage.setItem(DRAFT_KEY,JSON.stringify({id:draftIdRef.current,payload,saved_at:new Date().toISOString()}));
    draftSavingRef.current=true;setDraftStatus('saving');
    try{
      let row:DriveDraft;
      if(draftIdRef.current){
        try{row=await collegeApi.save<DriveDraft>(`drive-drafts/${draftIdRef.current}`,{payload,step:nextStep},true);}
        catch(error){
          if(!axios.isAxiosError(error)||error.response?.status!==404)throw error;
          row=await collegeApi.save<DriveDraft>('drive-drafts',{payload,step:nextStep,client_draft_key:creationKey});
        }
      }else row=await collegeApi.save<DriveDraft>('drive-drafts',{payload,step:nextStep,client_draft_key:creationKey});
      draftIdRef.current=row.id;setDraftStatus('saved');setNotice(manual?'Draft saved.':'');
      localStorage.setItem(DRAFT_KEY,JSON.stringify({id:row.id,payload,saved_at:new Date().toISOString()}));
      return true;
    }catch(e){setDraftStatus('error');if(manual)setNotice(`Draft kept on this device; cloud save failed: ${collegeError(e)}`);return false;}
    finally{draftSavingRef.current=false;for(const resolve of draftSaveWaitersRef.current.splice(0))resolve();if(draftResaveRef.current){draftResaveRef.current=false;void saveDraft(false,latestDraftRef.current.step);}}
  }

  useEffect(()=>{
    if(drive||!draftLoaded)return;
    const payload=currentDraftPayload();
    localStorage.setItem(DRAFT_KEY,JSON.stringify({id:draftIdRef.current,payload,saved_at:new Date().toISOString()}));
    const timer=setTimeout(()=>void saveDraft(false),1200);return()=>clearTimeout(timer);
  },[drive,draftLoaded,form,selection,rounds,programIds,departments,years,step,creationKey]);

  function update<K extends keyof FormState>(key:K,value:FormState[K]){
    setForm(current=>({...current,[key]:value,...(key==='company_name'&&value!==current.company_name?{company_profile_id:''}:{})}));setFieldErrors(current=>{const next={...current};delete next[key];if(key==='window_start'||key==='window_end')delete next.window_end;return next;});setFormError('');
    if(key==='difficulty_tier')setDifficultyConfirmed(false);
  }
  function roleName(item:Selection){
    if(item.profile?.role)return item.profile.role;
    if(item.agent_id){const custom=library?.agents.find(agent=>agent.id===item.agent_id);if(custom)return custom.role;}
    return roleLabels[item.track]||item.track;
  }
  function selectedProfile(profile:CompanyProfile){
    setForm(current=>({...current,company_profile_id:profile.id,company_name:profile.company_name,company_description:profile.company_description||'',company_website:profile.company_website||'',company_linkedin:profile.company_linkedin||''}));
    setCompanySearch(profile.company_name);setNotice(`${profile.company_name} selected. Drive role and job details remain independent.`);
  }
  async function saveCompanyProfile(){
    if(!form.company_name.trim()){setFieldErrors(current=>({...current,company_name:'Enter a company name to save this profile.'}));return;}
    if(form.company_website&&!validHttps(form.company_website)){setFieldErrors(current=>({...current,company_website:'Please enter a valid URL beginning with https://'}));return;}
    if(form.company_linkedin&&!validHttps(form.company_linkedin)){setFieldErrors(current=>({...current,company_linkedin:'Please enter a valid URL beginning with https://'}));return;}
    setBusy(true);setFormError('');
    try{
      const profile=await collegeApi.save<CompanyProfile>('company-profiles',{company_name:form.company_name.trim(),company_description:form.company_description||null,company_website:form.company_website||null,company_linkedin:form.company_linkedin||null});
      setCompanyProfiles(current=>[profile,...current.filter(item=>item.id!==profile.id)]);selectedProfile(profile);setNotice(`${profile.company_name} saved and selected.`);
    }catch(error){applyBackendErrors(error);}finally{setBusy(false);}
  }
  async function generate(track:string){
    setGenerating(current=>new Set(current).add(track));setFormError('');
    try{const result=await collegeApi.save<{scripted_questions:Record<string,string[]>}>('drive-questions/preview',{role_title:form.role_title,jd_text:form.jd_text,interview_duration_minutes:Number(form.duration),agent_selection:selection.map(({track,agent_id})=>({track,agent_id}))});setRounds(all=>all.map(round=>round.track===track?{...round,question_source:'ai_generated',questions:result.scripted_questions[track]||[]}:round));}
    catch(error){applyBackendErrors(error);}finally{setGenerating(current=>{const next=new Set(current);next.delete(track);return next;});}
  }
  async function loadPreview(){
    if(!programIds.length||!departments.length||!selectedYears.length){setPreview(null);return;}
    setPreviewBusy(true);
    try{const result=await collegeApi.save<Preview>('drives/eligibility/preview',{min_cgpa:Number(form.min_cgpa),eligible_programs:programIds,eligible_departments:departments,eligible_graduation_years:selectedYears,limit:100});setPreview(result);setPreviewRefreshedAt(new Date().toISOString());}
    catch(error){setPreview(null);applyBackendErrors(error);}finally{setPreviewBusy(false);}
  }
  useEffect(()=>{
    if(step!==4||!programIds.length||!departments.length||!selectedYears.length){if(step===4)setPreview(null);return;}
    setPreview(null);setPreviewRefreshedAt(null);const timer=setTimeout(()=>void loadPreview(),350);return()=>clearTimeout(timer);
  },[step,form.min_cgpa,programIds.join(','),departments.join(','),selectedYears.join(',')]);

  function validate(index:number):Record<string,string>{
    const errors:Record<string,string>={};
    if(index===0){
      if(!form.company_name.trim())errors.company_name='Company name is required.';
      if(!form.role_title.trim())errors.role_title='Role is required.';
      if(!form.location.trim())errors.location='Location is required.';
      if(!form.jd_text.trim())errors.jd_text='Add the job description before continuing.';
      if(form.company_website&&!validHttps(form.company_website))errors.company_website='Please enter a valid URL beginning with https://';
      if(form.company_linkedin&&!validHttps(form.company_linkedin))errors.company_linkedin='Please enter a valid URL beginning with https://';
      if(form.salary_type==='fixed'&&form.salary_min_amount&&form.salary_max_amount)errors.salary_max_amount='A fixed salary uses one amount. Clear the maximum amount.';
      if(form.salary_type==='range'&&(form.salary_min_amount||form.salary_max_amount)&&(!form.salary_min_amount||!form.salary_max_amount)){if(!form.salary_min_amount)errors.salary_min_amount='Enter the minimum salary amount.';if(!form.salary_max_amount)errors.salary_max_amount='Enter the maximum salary amount.';}
      if(form.salary_min_amount&&form.salary_max_amount&&Number(form.salary_min_amount)>Number(form.salary_max_amount))errors.salary_max_amount='Maximum salary must be at least the minimum salary.';
    }
    if(index===1){
      if(!form.window_start)errors.window_start='Choose when interviews begin.';
      if(!form.window_end)errors.window_end='Choose when interviews end.';
      const startInstant=form.window_start?wallTimeToInstant(form.window_start,collegeTimezone):Number.NaN;
      const endInstant=form.window_end?wallTimeToInstant(form.window_end,collegeTimezone):Number.NaN;
      if(form.window_start&&!Number.isFinite(startInstant))errors.window_start='Choose a valid local interview start time.';
      else if(form.window_start&&startInstant<Date.now())errors.window_start='Interview start must be in the present or future.';
      if(form.window_end&&!Number.isFinite(endInstant))errors.window_end='Choose a valid local interview end time.';
      else if(form.window_start&&form.window_end&&endInstant<=startInstant)errors.window_end='Interview end must be later than interview start.';
      if(form.application_deadline&&form.window_start&&form.application_deadline>=form.window_start.slice(0,10))errors.application_deadline='Application deadline must be before the interview start date.';
      if(!form.max_attempts||Number(form.max_attempts)<1||Number(form.max_attempts)>5)errors.max_attempts='Choose between 1 and 5 attempts.';
    }
    if(index===2&&(selection.length<1||selection.length>4))errors.agent_selection='Choose between one and four interview roles.';
    if(index===3){for(const round of rounds)if(round.question_source!=='personalized'&&!round.questions.some(question=>question.trim()))errors[`questions.${round.track}`]='Add at least one question for this round.';}
    if(index===4){
      if(!programIds.length)errors.eligible_programs='Select at least one eligible program.';
      if(!departments.length)errors.eligible_departments='Select at least one eligible department.';
      if(!selectedYears.length)errors.eligible_graduation_years='Choose a graduation year range.';
      if(Number(form.min_cgpa)<0||Number(form.min_cgpa)>10||!Number.isFinite(Number(form.min_cgpa)))errors.min_cgpa='Enter a CGPA from 0 to 10. Use 0 for no minimum.';
    }
    return errors;
  }
  function focusError(errors:Record<string,string>){const first=Object.keys(errors)[0];if(first)setTimeout(()=>document.getElementById(first)?.focus(),0);}
  function goTo(target:number){
    const nextErrors:Record<string,string>={};
    for(let index=0;index<target;index++)Object.assign(nextErrors,validate(index));
    if(Object.keys(nextErrors).length){const first=Object.keys(nextErrors)[0];setStep(stepFor(first));setFieldErrors(nextErrors);focusError(nextErrors);return;}
    setFieldErrors({});setFormError('');setStep(target);
  }
  async function next(){
    const errors=validate(step);if(Object.keys(errors).length){setFieldErrors(errors);focusError(errors);return;}
    setFieldErrors({});setFormError('');
    if(step===4&&ambiguousDifficulty&&!difficultyConfirmed){setConfirmDifficulty(true);return;}
    const target=Math.min(5,step+1);
    if(!drive){while(draftSavingRef.current)await new Promise<void>(resolve=>draftSaveWaitersRef.current.push(resolve));if(!await saveDraft(true,target))return;}
    setStep(target);
  }
  function moveRole(index:number,direction:number){const target=index+direction;if(target<0||target>=selection.length)return;setSelection(current=>{const rows=[...current];[rows[index],rows[target]]=[rows[target],rows[index]];return rows;});}
  function addRole(track:string){if(selection.length>=4||selection.some(item=>item.track===track))return;setSelection(current=>[...current,{track,agent_id:null}]);}
  function addQuestion(track:string){setRounds(current=>current.map(round=>round.track===track?{...round,questions:[...round.questions,'']}:round));}
  function moveQuestion(track:string,index:number,direction:number){setRounds(current=>current.map(round=>{if(round.track!==track)return round;const target=index+direction;if(target<0||target>=round.questions.length)return round;const questions=[...round.questions];[questions[index],questions[target]]=[questions[target],questions[index]];return{...round,questions};}));}
  function changeYearRange(min:number,max:number){const low=Math.min(min,max),high=Math.max(min,max);const exact=availableYears.filter(year=>year>=low&&year<=high);setYears(exact.map(String));setDifficultyConfirmed(false);}
  function updateYearEndpoint(which:'from'|'to',value:string){if(!value){setYears([]);setDifficultyConfirmed(false);return;}const selected=Number(value);if(!availableYears.includes(selected))return;const from=which==='from'?selected:(selectedYears[0]??selected),to=which==='to'?selected:(selectedYears.at(-1)??selected);changeYearRange(Math.min(from,to),Math.max(from,to));}
  function addCustomAgent(agentId:string){const agent=library?.agents.find(item=>item.id===agentId);if(!agent)return;setSelection(current=>{if(current.length>=4||current.some(item=>item.agent_id===agent.id))return current;const track=TRACKS.find(candidate=>!current.some(item=>item.track===candidate));return track?[...current,{track,agent_id:agent.id||null,profile:agent}]:current;});}
  function applyBackendErrors(error:unknown){
    const problems=collegeFieldErrors(error);if(!problems.length){setFormError(collegeError(error));return;}
    const mapped:Record<string,string>={};for(const item of problems)mapped[item.field]=item.message;
    const first=problems[0];setFieldErrors(mapped);setFormError('');setStep(first.step??stepFor(first.field));focusError(mapped);
  }
  function apiPayload(){
    return {
      drive_type:form.drive_type,company_profile_id:form.company_profile_id||null,company_name:form.company_name.trim(),company_description:form.company_description||null,company_website:form.company_website||null,company_linkedin:form.company_linkedin||null,
      role_title:form.role_title.trim(),job_type:form.job_type,location:form.location.trim(),jd_text:form.jd_text,difficulty_tier:form.difficulty_tier,difficulty_confirmed:ambiguousDifficulty?difficultyConfirmed:true,
      salary_type:form.salary_type,salary_min_amount:form.salary_min_amount?Number(form.salary_min_amount):null,salary_max_amount:form.salary_max_amount?Number(form.salary_max_amount):null,salary_currency:form.salary_currency,salary_period:form.salary_period,
      drive_date:dateToApi(form.drive_date),application_deadline:dateToApi(form.application_deadline),window_start:form.window_start?new Date(wallTimeToInstant(form.window_start,collegeTimezone)).toISOString():null,window_end:form.window_end?new Date(wallTimeToInstant(form.window_end,collegeTimezone)).toISOString():null,
      interview_duration_minutes:Number(form.duration),max_attempts:Number(form.max_attempts),min_cgpa:Number(form.min_cgpa),eligible_programs:programIds,eligible_departments:departments,eligible_graduation_years:selectedYears,
      agent_selection:selection.map(({track,agent_id})=>({track,agent_id})),round_configuration:rounds,
      ...(!drive?{idempotency_key:creationKey,source_draft_id:draftIdRef.current||undefined}:{}),
    };
  }
  async function submit(){
    for(let index=0;index<5;index++){const errors=validate(index);if(Object.keys(errors).length){setStep(index);setFieldErrors(errors);focusError(errors);return;}}
    if(ambiguousDifficulty&&!difficultyConfirmed){setStep(4);setConfirmDifficulty(true);return;}
    setBusy(true);setFormError('');setFieldErrors({});
    try{
      const result=await collegeApi.save<{status?:string;warnings?:string[]}>(drive?`drives/${drive.id}`:'drives',apiPayload(),!!drive);
      localStorage.removeItem(DRAFT_KEY);draftIdRef.current=null;
      onSaved([drive?'Drive changes saved.':`Drive created (${displayName(result.status||'draft')}).`,...(result.warnings||[])].join(' '));
    }catch(error){applyBackendErrors(error);}finally{setBusy(false);}
  }

  function fieldError(key:string){return fieldErrors[key]?<span id={`${key}-error`} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-600"><CircleAlert size={14} className="mt-0.5 shrink-0"/>{fieldErrors[key]}</span>:null;}
  function label(title:string,required=false){return <span>{title}{required?<b className="ml-1 text-rose-600" aria-label="required">*</b>:<small className="ml-2 font-normal text-slate-500">Optional</small>}</span>;}
  function inputField(title:string,key:keyof FormState,type='text',required=false,placeholder=''){
    return <label className="block text-sm font-medium" key={key}>{label(title,required)}<input id={key} className={`${input} ${fieldErrors[key]?'border-rose-500 focus:border-rose-500 focus:ring-rose-100':''}`} type={type} value={form[key]} placeholder={placeholder} aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key]?`${key}-error`:undefined} onChange={event=>update(key,event.target.value as never)}/>{fieldError(key)}</label>;
  }
  function selectField(title:string,key:keyof FormState,options:[string,string][],required=false){
    return <label className="block text-sm font-medium" key={key}>{label(title,required)}<select id={key} className={input} value={form[key]} onChange={event=>update(key,event.target.value as never)}>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select>{fieldError(key)}</label>;
  }
  function companyDetailsField(key:'company_description'|'jd_text',title:string,required=false,rows=4){
    const placeholder=key==='jd_text'?'Paste the role responsibilities, required skills, and experience criteria here.': 'Share a short overview of the company (optional).';
    return <label className="block text-sm font-medium">{label(title,required)}<textarea id={key} className={`${input} resize-y leading-6 ${fieldErrors[key]?'border-rose-500':''}`} rows={rows} value={form[key]} placeholder={placeholder} onChange={event=>update(key,event.target.value)}/>{fieldError(key)}</label>;
  }
  const chosenProfile=companyProfiles.find(profile=>profile.id===form.company_profile_id);
  const salaryCurrency=CURRENCIES.find(([code])=>code===form.salary_currency)?.[1]||form.salary_currency;

  return <section className="drive-wizard space-y-6 text-slate-900 dark:text-white">
    <div className="flex flex-wrap items-center justify-between gap-3"><button className={button} onClick={onCancel}><ArrowLeft size={16}/>Back to placement drives</button>{!drive&&<div className="flex items-center gap-2 text-xs text-slate-500" role="status">{draftStatus==='saving'?<><span className="rs-save-dot saving"/>Saving draft…</>:draftStatus==='saved'?<><span className="rs-save-dot"/>Draft saved</>:draftStatus==='error'?<><span className="rs-save-dot error"/>Offline draft saved on this device</>:<><span className="rs-save-dot"/>Draft auto-save ready</>}</div>}</div>
    <header className="dw-heading"><div><p className="text-sm font-semibold uppercase tracking-[.16em] text-violet-600">Placement management</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{drive?'Modify placement drive':'Create placement drive'}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Set up a clear, reusable hiring workflow. Your draft saves as you work; publish only after reviewing all details.</p></div>{!drive&&<button className={button} disabled={draftStatus==='saving'} onClick={()=>void saveDraft(true)}><Save size={16}/>Save draft</button>}</header>
    <nav className="dw-stepper" aria-label="Drive creation steps">{steps.map((name,index)=>{
      const completed=index<step,active=index===step,blocked=index>step&&Object.keys(validate(index-1)).length>0;
      return <button type="button" key={name} aria-current={active?'step':undefined} aria-label={`${index+1}. ${name}`} title={blocked?'Complete the previous step to continue':`Go to ${name}`} className={`dw-step ${active?'active':''} ${completed?'completed':''}`} onClick={()=>goTo(index)}><span className="dw-step-number">{completed?<Check size={15}/>:index+1}</span><span className="dw-step-title">{name}</span>{index<steps.length-1&&<span className="dw-step-line"/>}</button>;
    })}</nav>
    {formError&&<div className="dw-form-error" role="alert"><CircleAlert size={18}/><span>{formError}</span></div>}
    {notice&&<div className="dw-notice" role="status"><Check size={17}/>{notice}<button type="button" aria-label="Dismiss message" onClick={()=>setNotice('')}><X size={15}/></button></div>}

    <main className={`${panel} dw-main`}>
      <div className="dw-step-intro"><span className="eyebrow">STEP {step+1} OF {steps.length}</span><h2>{steps[step]}</h2><p>{step===0?'Choose a company and provide the job details unique to this drive.':step===1?'Set a clear interview timetable and candidate attempt limit.':step===2?'Choose and order the interview roles. System-managed avatar and voice identities stay fixed.':step===3?'Choose how each round gets its questions and review every fixed question.':step===4?'Set the academic eligibility rules and verify the matching roster.':'Review the complete drive before creating it.'}</p></div>

      {step===0&&<div className="dw-content space-y-5">
        <Section title="Company profile" description="Reuse an existing company profile or add a profile without leaving this flow.">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative block text-sm font-medium" ref={companyPickerRef}>
              <label htmlFor="drive-company-search">{label('Find a saved company')}</label>
              <div className="relative">
                <input id="drive-company-search" className={`${input} pr-11`} value={companySearch} placeholder="Search company profiles…" role="combobox" aria-autocomplete="list" aria-expanded={companyPickerOpen} aria-controls="drive-company-options" onFocus={()=>setCompanyPickerOpen(true)} onChange={event=>{setCompanySearch(event.target.value);setCompanyPickerOpen(true);if(form.company_profile_id)update('company_profile_id','');}} onKeyDown={event=>{if(event.key==='Escape')setCompanyPickerOpen(false);else if(event.key==='ArrowDown'){event.preventDefault();setCompanyPickerOpen(true);}}}/>
                <button type="button" className="absolute inset-y-0 right-1 grid w-10 place-items-center rounded-lg text-slate-600 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={companyPickerOpen?'Close saved company profiles':'Open saved company profiles'} aria-expanded={companyPickerOpen} onMouseDown={event=>event.preventDefault()} onClick={()=>setCompanyPickerOpen(open=>!open)}><ChevronDown size={17} className={`transition-transform ${companyPickerOpen?'rotate-180':''}`}/></button>
              </div>
              {companyPickerOpen&&<div id="drive-company-options" className="dw-company-results" role="listbox" aria-label="Saved company profiles">
                {filteredCompanies.length?filteredCompanies.map(profile=><button type="button" role="option" aria-selected={form.company_profile_id===profile.id} key={profile.id} className={form.company_profile_id===profile.id?'selected':''} onClick={()=>{selectedProfile(profile);setCompanyPickerOpen(false);}}><span><strong>{profile.company_name}</strong><small>{profile.company_website||'Company profile'}</small></span>{form.company_profile_id===profile.id&&<Check size={16}/>}</button>):<p className="px-3 py-4 text-sm font-normal text-slate-500" role="status">{companyProfiles.length?'No matching company profiles.':'No saved company profiles yet.'}</p>}
              </div>}
            </div>
            <div className="flex items-end"><button type="button" className={button} disabled={busy} onClick={()=>void saveCompanyProfile()}><Plus size={16}/>{busy?'Saving…':'Add new company profile'}</button></div>
          </div>
          {chosenProfile&&<div className="dw-selected-company"><span className="dw-company-avatar">{chosenProfile.company_name.slice(0,2).toUpperCase()}</span><span><strong>{chosenProfile.company_name}</strong><small>Selected company profile · reusable for other roles</small></span><button type="button" className="text-violet-700" onClick={()=>{setForm(current=>({...current,company_profile_id:''}));setCompanySearch('');}}>Unlink</button></div>}
          <div className="grid gap-4 md:grid-cols-2">{inputField('Company name','company_name','text',true,'e.g. Northstar Technologies')}{inputField('Company website','company_website','url',false,'https://company.example')}{inputField('LinkedIn URL','company_linkedin','url',false,'https://linkedin.com/company/…')}<div className="md:col-span-2">{companyDetailsField('company_description','Company details / description',false,3)}</div></div>
        </Section>
        <Section title="Role details" description="These details belong to this drive, even when you reuse a company profile.">
          <div className="grid gap-4 md:grid-cols-2"><label className="relative block text-sm font-medium">{label('Role',true)}<div className="relative"><input id="role_title" className={`${input} ${fieldErrors.role_title?'border-rose-500 focus:border-rose-500 focus:ring-rose-100':''}`} type="text" value={form.role_title} placeholder="e.g. Data Analyst" role="combobox" aria-autocomplete="list" aria-expanded={rolePickerOpen} aria-controls="drive-role-options" aria-invalid={Boolean(fieldErrors.role_title)} aria-describedby={fieldErrors.role_title?'role_title-error':undefined} onFocus={()=>setRolePickerOpen(true)} onBlur={()=>setTimeout(()=>setRolePickerOpen(false),100)} onKeyDown={event=>{if(event.key==='Escape')setRolePickerOpen(false);else if(event.key==='ArrowDown'){event.preventDefault();setRolePickerOpen(true);}}} onChange={event=>update('role_title',event.target.value)}/>{rolePickerOpen&&Boolean(roleSuggestions.length)&&<div id="drive-role-options" className="dw-company-results" role="listbox" aria-label="Existing drive roles">{roleSuggestions.map(role=><button type="button" role="option" aria-selected={form.role_title===role} key={role} onMouseDown={event=>event.preventDefault()} onClick={()=>{update('role_title',role);setRolePickerOpen(false);}}><strong>{role}</strong>{form.role_title===role&&<Check size={16}/>}</button>)}</div>}</div>{fieldError('role_title')}</label>{selectField('Job type','job_type',[['full_time','Full Time'],['internship','Internship'],['internship_plus_ppo','Internship + PPO']],true)}{inputField('Location','location','text',true,'City, state or remote')}<p className="self-end text-xs text-slate-500">Choose a role used in an existing drive or enter a new one.</p></div>
        </Section>
        <Section title="Salary details" description="Optional. Choose the currency and pay period that match the offer.">
          <div className="grid gap-4 md:grid-cols-4">{selectField('Salary type','salary_type',[['fixed','Fixed salary'],['range','Salary range']])}{selectField('Currency','salary_currency',CURRENCIES.map(([code,text])=>[code,text]))}{selectField('Pay period','salary_period',[['annual','Annual'],['monthly','Monthly']])}{inputField(form.salary_type==='fixed'?'Salary amount':'Minimum amount','salary_min_amount','number',false,'e.g. 400000')}{form.salary_type==='range'&&inputField('Maximum amount','salary_max_amount','number',false,'e.g. 600000')}</div>
          {(form.salary_min_amount||form.salary_max_amount)&&<div className="dw-salary-summary"><strong>Offer preview</strong><span>{salaryCurrency} {form.salary_min_amount||'—'}{form.salary_type==='range'?` – ${form.salary_max_amount||'—'}`:''} <small>per {form.salary_period==='annual'?'year':'month'}</small></span></div>}
        </Section>
        <Section title="Job description" description="Used to prepare the interview rounds and determine relevant skills.">{companyDetailsField('jd_text','Job description',true,8)}</Section>
      </div>}

      {step===1&&<div className="dw-content space-y-5">
        <Section title="Interview window" description={`Candidates can begin only while the interview window is open. Times use ${collegeTimezone}.`}>
          <div className="dw-timeline-grid"><DateTimePicker id="window_start" title="Interview starts" value={form.window_start} error={fieldErrors.window_start} onChange={value=>update('window_start',value)}/><div className="dw-timeline-arrow"><ArrowRight size={20}/></div><DateTimePicker id="window_end" title="Interview ends" value={form.window_end} error={fieldErrors.window_end} onChange={value=>update('window_end',value)}/></div>
          <div className="grid gap-4 md:grid-cols-2">{inputField('Application deadline','application_deadline','date')}{inputField('Drive date','drive_date','date')}<p className="md:col-span-2 -mt-2 text-xs text-slate-500">Application deadline must be before the interview start date. Drive date is optional when the drive does not have a separate event date.</p></div>
        </Section>
        <Section title="Interview format" description="These settings define how long each candidate has and how many attempts are allowed.">
          <div className="grid gap-4 md:grid-cols-3">{selectField('Interview duration','duration',[['15','15 minutes'],['30','30 minutes'],['45','45 minutes']],true)}{inputField('Attempts per student','max_attempts','number',true,'1–5')}{selectField('Interview difficulty','difficulty_tier',[['beginner','Beginner'],['intermediate','Intermediate'],['advanced','Advanced']],true)}</div>
          {drive&&drive.status!=='draft'&&<p className="dw-info">Interview difficulty is locked after the drive is finalized.</p>}{recommendation&&<p className="dw-info">Academic-year suggestion: {displayName(recommendation)}. You can choose a different difficulty.</p>}
        </Section>
      </div>}

      {step===2&&<div className="dw-content space-y-5">
        <Section title="Interview sequence" description="Select up to four roles. Their order determines the sequence. Persona names are system-managed.">
          <div className="space-y-3">{selection.map((item,index)=><article className="dw-role-card" key={`${item.track}-${item.agent_id||'fixed'}`}><span className="dw-role-index">{String(index+1).padStart(2,'0')}</span><div className="min-w-0 flex-1"><span className="eyebrow">ROUND {index+1}</span><h3>{roleName(item)}</h3><p>{index===0?'Opening conversation and role fit':index===selection.length-1?'Closing discussion and hiring decision':'Role-specific interview and evidence gathering'}</p></div><div className="flex gap-1"><button type="button" className={button} disabled={index===0} aria-label={`Move ${roleName(item)} up`} onClick={()=>moveRole(index,-1)}><ArrowUp size={16}/></button><button type="button" className={button} disabled={index===selection.length-1} aria-label={`Move ${roleName(item)} down`} onClick={()=>moveRole(index,1)}><ArrowDown size={16}/></button><button type="button" className={button} aria-label={`Remove ${roleName(item)}`} onClick={()=>setSelection(current=>current.filter((_,position)=>position!==index))}><Trash2 size={16}/></button></div></article>)}</div>
          <div className="grid gap-3 sm:grid-cols-2">{TRACKS.filter(track=>!selection.some(item=>item.track===track)).map(track=><button type="button" className="dw-add-role" key={track} disabled={selection.length>=4} onClick={()=>addRole(track)}><Plus size={16}/><span><strong>{roleLabels[track]}</strong><small>Add this interview role</small></span></button>)}</div>
          {Boolean(library?.agents.length)&&<label className="block max-w-xl text-sm font-medium">{label('Add a saved custom interview role')}<select className={input} value="" disabled={selection.length>=4} onChange={event=>addCustomAgent(event.target.value)}><option value="">Choose a saved role to add as an interviewer</option>{library?.agents.filter(agent=>!selection.some(item=>item.agent_id===agent.id)).map(agent=><option key={agent.id} value={agent.id}>{agent.role}</option>)}</select><small className="mt-1 block text-xs font-normal text-slate-500">Saved roles are added as a new interviewer and never replace an existing role.</small></label>}
          {fieldError('agent_selection')}<p className="text-xs text-slate-500">Maximum 4 interview roles. Avatar and voice assignments remain fixed regardless of role order.</p>
        </Section>
      </div>}

      {step===3&&<div className="dw-content space-y-4">{selection.map((item,index)=>{
        const round=rounds.find(row=>row.track===item.track)||{track:item.track,question_source:'personalized' as const,questions:[]};
        return <Section key={item.track} title={`Round ${index+1} · ${roleName(item)}`} description="Choose the question source for this role.">
          <div className="grid gap-3 md:grid-cols-3"><QuestionMode selected={round.question_source==='personalized'} title="Personalized AI" description="Questions adapt to the job description and candidate evidence." onClick={()=>setRounds(all=>all.map(row=>row.track===round.track?{...row,question_source:'personalized',questions:[]}:row))}/><QuestionMode selected={round.question_source==='manual'} title="Manual Questions" description="Use the exact questions you enter and review below." onClick={()=>setRounds(all=>all.map(row=>row.track===round.track?{...row,question_source:'manual'}:row))}/><QuestionMode selected={round.question_source==='ai_generated'} title="AI Generated" description="Generate from this job description, then review and edit." onClick={()=>setRounds(all=>all.map(row=>row.track===round.track?{...row,question_source:'ai_generated'}:row))}/></div>
          {round.question_source==='personalized'?<p className="dw-info">Questions will be created for the candidate at interview time. They are not fixed in advance.</p>:<div className="dw-fixed-questions"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-600 dark:text-slate-300">Saved questions will be asked in the order shown.</p>{round.question_source==='ai_generated'&&<button type="button" className={button} disabled={generating.has(round.track)||!form.jd_text.trim()} onClick={()=>void generate(round.track)}>{generating.has(round.track)?'Generating…':'Generate from job description'}</button>}</div>{round.questions.map((question,qindex)=><div className="dw-question-row" key={`${round.track}-${qindex}`}><span>{qindex+1}</span><textarea aria-label={`${roleName(item)} question ${qindex+1}`} id={`question-${round.track}-${qindex}`} className={input} rows={2} value={question} onChange={event=>setRounds(all=>all.map(row=>row.track===round.track?{...row,questions:row.questions.map((text,pos)=>pos===qindex?event.target.value:text)}:row))}/><div className="flex gap-1"><button type="button" className={button} aria-label="Move question up" disabled={qindex===0} onClick={()=>moveQuestion(round.track,qindex,-1)}><ArrowUp size={15}/></button><button type="button" className={button} aria-label="Move question down" disabled={qindex===round.questions.length-1} onClick={()=>moveQuestion(round.track,qindex,1)}><ArrowDown size={15}/></button><button type="button" className={button} aria-label="Remove question" onClick={()=>setRounds(all=>all.map(row=>row.track===round.track?{...row,questions:row.questions.filter((_,pos)=>pos!==qindex)}:row))}><Trash2 size={15}/></button></div></div>)}<button type="button" className={button} onClick={()=>addQuestion(round.track)}><Plus size={15}/>Add question</button>{fieldError(`questions.${round.track}`)}</div>}
        </Section>;
      })}</div>}

      {step===4&&<div className="dw-content space-y-5">
        <Section title="Academic programmes" description="Options come from this institution’s Academic Setup.">
          <SearchChecks title="Eligible programs" options={programs.map(program=>({code:program.code,name:displayName(program.display_name)}))} selected={programIds} onChange={codes=>{setProgramIds(codes);const allowed=new Set(programs.filter(p=>codes.includes(p.code)).flatMap(p=>p.departments.map(d=>d.code)));setDepartments(current=>current.filter(code=>allowed.has(code)));setDifficultyConfirmed(false);}} error={fieldErrors.eligible_programs}/>
          <SearchChecks title="Eligible departments" options={availableDepartments.map(department=>({code:department.code,name:`${displayName(department.display_name)} · ${department.code}`}))} selected={departments} onChange={setDepartments} error={fieldErrors.eligible_departments}/>
        </Section>
        <Section title="Graduation year range" description="Select one graduation year or include students graduating across multiple years.">
          <div className="dw-year-range"><div className="flex flex-wrap items-end gap-4"><label>From <select id="graduation_from" className={input} value={selectedYears.length?yearMin:''} onChange={event=>updateYearEndpoint('from',event.target.value)}><option value="">Choose a year</option>{availableYears.map(year=><option key={year} value={year}>{year}</option>)}</select></label><span className="dw-range-line" aria-hidden="true"/><label>To <select id="graduation_to" className={input} value={selectedYears.length?yearMax:''} onChange={event=>updateYearEndpoint('to',event.target.value)}><option value="">Choose a year</option>{availableYears.map(year=><option key={year} value={year}>{year}</option>)}</select></label></div><p className="text-sm text-slate-600">Selected graduation years: {selectedYears.join(', ')||'Choose a year or range'}</p>{fieldError('eligible_graduation_years')}</div>
        </Section>
        <Section title="Minimum CGPA" description="Enter 0 when the company has no CGPA requirement."><label className="block max-w-xs text-sm font-medium">{label('Minimum CGPA',true)}<input id="min_cgpa" className={input} type="number" min="0" max="10" step="0.01" value={form.min_cgpa} onChange={event=>update('min_cgpa',event.target.value)}/>{fieldError('min_cgpa')}</label></Section>
        {ambiguousDifficulty&&<div className="dw-info">The selected graduation years suggest different interview difficulties. Choose one in Interview setup; confirm it before review.</div>}
        <Section title="Live eligibility preview" description="Uses the current student roster and the same matching rules as drive creation.">
          <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-slate-500">Updates when eligibility criteria change.</span><button type="button" className={button} disabled={previewBusy||!programIds.length||!departments.length||!selectedYears.length} onClick={()=>void loadPreview()}>{previewBusy?'Checking students…':'Refresh preview'}</button></div>
          {preview&&<><div className="grid gap-3 sm:grid-cols-3"><Metric title="Matching students" value={preview.eligible_count}/><Metric title="Other active students checked" value={preview.not_eligible_count}/><Metric title="Missing verification photo" value={preview.missing_photo_count}/></div><div className="dw-rules"><strong>Applied criteria</strong><span>{programIds.join(', ')}</span><span>{departments.join(', ')}</span><span>{selectedYears.join(', ')}</span><span>{Number(form.min_cgpa)>0?`CGPA ≥ ${form.min_cgpa}`:'No minimum CGPA'}</span></div><p className="text-xs text-slate-500">Preview refreshed {previewRefreshedAt?formatTimestamp(previewRefreshedAt,collegeTimezone):"just now"}. This is a preview; the backend recalculates eligibility when the drive is created.</p>{preview.eligible_count===0?<p className="dw-zero-match" role="alert">No students match these rules yet. Adjust the programmes, departments, years or CGPA before creating the drive.</p>:<div className="max-h-72 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700"><table className="w-full text-left text-sm"><thead><tr><th>Student</th><th>Department</th><th>CGPA</th><th>Graduation</th></tr></thead><tbody>{preview.candidates.map(candidate=><tr key={candidate.student_id}><td><div className="flex min-w-48 items-center gap-2.5"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{candidate.full_name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()}</span><span className="min-w-0"><strong className="block truncate">{candidate.full_name}</strong><small className="block text-slate-500">{candidate.roll_number||'Roll number unavailable'}</small></span></div></td><td><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{candidate.department_code||'Not specified'}</span></td><td>{candidate.cgpa??'—'}</td><td>{candidate.graduation_year??'—'}</td></tr>)}</tbody></table>{preview.eligible_count>preview.candidates.length&&<p className="p-3 text-xs text-slate-500">Showing {preview.candidates.length} of {preview.eligible_count} matching students.</p>}</div>}</>}
        </Section>
      </div>}

      {step===5&&<div className="dw-content dw-review">
        <ReviewCard title="Company" edit={()=>goTo(0)} lines={[form.company_name,form.company_description||'No company description',form.company_website||'Website not provided',form.company_linkedin||'LinkedIn not provided']}/>
        <ReviewCard title="Role & compensation" edit={()=>goTo(0)} lines={[`${form.role_title} · ${displayName(form.job_type)}`,form.location,form.salary_min_amount?`${salaryCurrency} ${form.salary_min_amount}${form.salary_type==='range'?` – ${form.salary_max_amount}`:''} per ${form.salary_period==='annual'?'year':'month'} (${form.salary_type==='fixed'?'fixed':'range'})`:'Compensation not specified']}/>
        <ReviewCard title="Interview schedule" edit={()=>goTo(1)} lines={[`Starts ${formatLocal(form.window_start,collegeTimezone)}`,`Ends ${formatLocal(form.window_end,collegeTimezone)}`,`Institution time zone: ${collegeTimezone}`,`Duration ${form.duration} minutes · ${form.max_attempts} attempts`,`${displayName(form.difficulty_tier)} difficulty`,form.application_deadline?`Applications close ${form.application_deadline}`:'No application deadline',form.drive_date?`Drive event date ${form.drive_date}`:'No separate drive event date']}/>
        <ReviewCard title="Interview sequence & questions" edit={()=>goTo(2)} lines={selection.flatMap((item,index)=>{const round=rounds.find(value=>value.track===item.track);return [`${index+1}. ${roleName(item)}`,`   ${questionLabel(round?.question_source||'personalized')}${round&&round.question_source!=='personalized'?` · ${round.questions.filter(Boolean).length} saved questions`:''}`]})}/>
        <ReviewCard title="Eligibility" edit={()=>goTo(4)} lines={[`Programs: ${programIds.join(', ')||'—'}`,`Departments: ${departments.join(', ')||'—'}`,`Graduation years: ${selectedYears.join(' – ')||'—'}`,`Minimum CGPA: ${Number(form.min_cgpa)>0?form.min_cgpa:'None'}`,`Matching students in latest preview: ${preview?.eligible_count??'Preview not available'}`,`Active students checked: ${preview?.total_students??'—'}`,`Missing verification photo: ${preview?.missing_photo_count??'—'}`,`Preview refreshed: ${previewRefreshedAt?formatTimestamp(previewRefreshedAt,collegeTimezone):'Not available'}`]}/>
        <section className="dw-review-card"><header><h3>Final check</h3></header><div>{[[Boolean(form.company_name.trim()&&form.role_title.trim()&&form.location.trim()&&form.jd_text.trim()),'Company, role, location, and job description'],[Boolean(form.window_start&&form.window_end&&wallTimeToInstant(form.window_end,collegeTimezone)>wallTimeToInstant(form.window_start,collegeTimezone)),'Interview window and attempt limit'],[Boolean(selection.length>=1&&selection.length<=4&&rounds.every(round=>round.question_source==='personalized'||round.questions.some(question=>question.trim()))),'Interview roles and question configuration'],[Boolean(programIds.length&&departments.length&&selectedYears.length&&preview),'Eligibility criteria and latest preview']].map(([ok,text])=><p key={String(text)}><span className={ok?'text-emerald-700':'text-amber-700'}>{ok?'✓':'○'}</span> {String(text)}</p>)}<p className="mt-2 text-xs text-slate-500">Eligibility is recalculated and saved when the drive is created. The application deadline, interview window, and drive event date are separate dates.</p></div></section>
      </div>}
    </main>
    <footer className="dw-footer"><button className={button} disabled={!step||busy} onClick={()=>{setFieldErrors({});setFormError('');setStep(value=>value-1);}}><ArrowLeft size={16}/>Back</button><div className="flex flex-wrap justify-end gap-2">{step<5?<button className={primary} disabled={previewBusy} onClick={()=>void next()}>{drive?'Continue':'Save draft & continue'}<ArrowRight size={16}/></button>:<button className={primary} disabled={busy} onClick={()=>void submit()}>{busy?'Creating drive…':drive?'Save changes':'Create placement drive'}<ArrowRight size={16}/></button>}</div></footer>
    {confirmDifficulty&&<dialog open aria-modal="true" aria-labelledby="difficulty-title" className={`${panel} fixed inset-0 z-50 m-auto max-w-lg text-slate-900 shadow-2xl backdrop:bg-slate-950/50 dark:text-white`}><div className="flex items-start justify-between gap-3"><div><h2 id="difficulty-title" className="text-xl font-bold">Confirm interview difficulty</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Selected graduation years suggest more than one level. This drive will use <strong>{displayName(form.difficulty_tier)}</strong>.</p></div><button type="button" className={button} aria-label="Close difficulty confirmation" onClick={()=>setConfirmDifficulty(false)}><X size={16}/></button></div><div className="mt-6 flex justify-end gap-3"><button type="button" className={button} onClick={()=>setConfirmDifficulty(false)}>Review setup</button><button type="button" className={primary} onClick={()=>{setDifficultyConfirmed(true);setConfirmDifficulty(false);setStep(5);}}><Check size={16}/>Confirm and review</button></div></dialog>}
  </section>;
}

function validHttps(value:string){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}}
function stepFor(field:string){if(['window_start','window_end','application_deadline','drive_date','max_attempts'].includes(field))return 1;if(field==='agent_selection')return 2;if(field.startsWith('questions.'))return 3;if(['eligible_programs','eligible_departments','eligible_graduation_years','min_cgpa'].includes(field))return 4;return 0;}
function questionLabel(value:string){return value==='manual'?'Manual Questions':value==='ai_generated'?'AI Generated':'Personalized AI';}
function formatLocal(value:string,timeZone:string){if(!value)return 'Not scheduled';return formatWallTime(value,timeZone);}

function Section({title,description,children}:{title:string;description:string;children:ReactNode}){return <section className="dw-section"><header><div><h3>{title}</h3><p>{description}</p></div></header><div className="mt-5 space-y-4">{children}</div></section>;}
function FieldError({id,message}:{id:string;message:string}){return <span id={id} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-600"><CircleAlert size={14} className="mt-0.5 shrink-0"/>{message}</span>;}
function DateTimePicker({id,title,value,error,onChange}:{id:string;title:string;value:string;error?:string;onChange:(value:string)=>void}){
  const date=value.slice(0,10),parts=timeParts(value);const set=(nextDate=date,hour=parts.hour,minute=parts.minute,ampm=parts.ampm)=>onChange(joinDateTime(nextDate,hour,minute,ampm));
  const [minuteText,setMinuteText]=useState(parts.minute),editingMinute=useRef(false);
  useEffect(()=>{if(!editingMinute.current)setMinuteText(parts.minute);},[parts.minute]);
  const setMinute=(raw:string)=>{const digits=raw.replace(/\D/g,'').slice(0,2);editingMinute.current=true;setMinuteText(digits);if(!digits){onChange(joinDateTime(date,parts.hour,'00',parts.ampm));return;}const number=Math.min(59,Number(digits));onChange(joinDateTime(date,parts.hour,String(number).padStart(2,'0'),parts.ampm));};
  const finishMinute=()=>{editingMinute.current=false;const digits=minuteText.replace(/\D/g,'').slice(0,2),number=Math.min(59,Number(digits||0)),normalized=String(number).padStart(2,'0');setMinuteText(normalized);onChange(joinDateTime(date,parts.hour,normalized,parts.ampm));};
  return <fieldset className="dw-datetime"><legend>{title}<b className="ml-1 text-rose-600">*</b></legend><div className="grid grid-cols-[1fr_92px_82px_82px] gap-2"><label className="text-xs text-slate-700">Date<input id={id} aria-label={`${title} date`} className={`${input} text-slate-950 [color-scheme:light]`} type="date" value={date} onChange={event=>set(event.target.value)}/></label><label className="text-xs text-slate-700">Hour<select aria-label={`${title} hour`} className={`${input} text-slate-950`} value={parts.hour} onChange={event=>set(date,event.target.value)}>{HOURS.map(hour=><option key={hour}>{hour}</option>)}</select></label><label className="text-xs text-slate-700">Minute<input aria-label={`${title} minute`} className={`${input} text-slate-950`} type="text" inputMode="numeric" placeholder="00" maxLength={2} value={minuteText} onFocus={event=>event.currentTarget.select()} onBlur={finishMinute} onChange={event=>setMinute(event.target.value)}/></label><label className="text-xs text-slate-700">AM / PM<select aria-label={`${title} AM / PM`} className={`${input} text-slate-950`} value={parts.ampm} onChange={event=>set(date,parts.hour,parts.minute,event.target.value)}><option>AM</option><option>PM</option></select></label></div>{error&&<FieldError id={`${id}-error`} message={error}/>}</fieldset>;
}
function formatTimestamp(value:string,timeZone:string){return new Date(value).toLocaleString(undefined,{timeZone,dateStyle:'medium',timeStyle:'short'});}
function SearchChecks({title,options,selected,onChange,error}:{title:string;options:{code:string;name:string}[];selected:string[];onChange:(value:string[])=>void;error?:string}){
  const [query,setQuery]=useState('');const rows=options.filter(option=>`${option.name} ${option.code}`.toLowerCase().includes(query.toLowerCase()));
  return <fieldset><div className="flex flex-wrap items-center justify-between gap-2"><legend className="text-sm font-semibold" id={`${title.replaceAll(' ','_').toLowerCase()}-legend`}>{title}<b className="ml-1 text-rose-600">*</b></legend><span className="text-xs text-slate-500">{selected.length} selected</span></div><input aria-label={`Search ${title}`} className={input} value={query} placeholder={`Search ${title.toLowerCase()}…`} onChange={event=>setQuery(event.target.value)}/><div className="dw-check-list">{rows.map(option=><label key={option.code}><input type="checkbox" aria-label={`${option.name} ${option.code}`} checked={selected.includes(option.code)} onChange={event=>onChange(event.target.checked?[...selected,option.code]:selected.filter(code=>code!==option.code))}/><span>{option.name}</span><small>{option.code}</small></label>)}{!rows.length&&<p className="p-3 text-sm text-slate-500">No matching options.</p>}</div>{error&&<FieldError id={`${title.replaceAll(' ','_').toLowerCase()}-error`} message={error}/>}</fieldset>;
}
function Metric({title,value}:{title:string;value:number}){return <div className="dw-metric"><strong>{value.toLocaleString()}</strong><span>{title}</span></div>;}
function ReviewCard({title,lines,edit}:{title:string;lines:string[];edit:()=>void}){return <section className="dw-review-card"><header><h3>{title}</h3><button type="button" onClick={edit}>Edit</button></header><div>{lines.map((line,index)=><p key={`${title}-${index}`}>{line}</p>)}</div></section>;}
function QuestionMode({selected,title,description,onClick}:{selected:boolean;title:string;description:string;onClick:()=>void}){return <button type="button" className={`dw-question-mode ${selected?'selected':''}`} aria-pressed={selected} onClick={onClick}><span className="dw-radio"/><strong>{title}</strong><small>{description}</small></button>;}
