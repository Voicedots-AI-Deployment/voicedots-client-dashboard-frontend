import { defineConfig, mergeConfig } from 'vite';
import base from '../vite.config';
import { readFileSync } from 'node:fs';
import { placementSample } from './placement-data';
import { previewDrive, previewCandidate, previewBundle, previewRecording } from './drive-data';
const sample=JSON.parse(readFileSync(new URL('./feedback-data.json',import.meta.url),'utf8'));
export default mergeConfig(base,defineConfig({
 cacheDir:'node_modules/.vite-feedback-reference-preview',
 define:{'import.meta.env.VITE_API_URL':JSON.stringify('/__feedback_preview_api')},
 plugins:[{name:'local-feedback-preview',transformIndexHtml(){return [{tag:'script',children:"localStorage.setItem('access_token','local-preview-only');",injectTo:'head-prepend'},{tag:'div',attrs:{id:'preview-notice',style:'position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:1000;background:#31204d;color:white;padding:7px 16px;border-radius:30px;font:11px sans-serif;box-shadow:0 2px 12px #0002;white-space:nowrap'},children:'LOCAL PREVIEW · SAMPLE DATA · Production unchanged',injectTo:'body-prepend'}];},configureServer(server){server.middlewares.use((request,response,next)=>{
  if(!request.url?.startsWith('/__feedback_preview_api/'))return next();
  response.setHeader('Content-Type','application/json');response.setHeader('Cache-Control','no-store');
  if(request.method!=='GET'){response.statusCode=405;response.end(JSON.stringify({detail:'This local sample preview does not write data.'}));return;}
  const url=new URL(request.url,'http://localhost'),path=url.pathname.replace('/__feedback_preview_api','');
  if(path==='/preview-media.webm'){response.setHeader('Content-Type','video/webm');response.end(readFileSync(new URL('../tests/fixtures/interview-test.webm',import.meta.url)));return;}
  let result:unknown={};
  if(path==='/v3/college/intelligence/dashboard')result=placementSample;
  if(path==='/v3/college/intelligence/settings')result=placementSample.settings;
  if(path==='/v1/users/me')result={user_id:'preview-user',name:'College Manager · Preview',email:'preview@example.invalid'};
  if(path==='/v3/college/access')result={enabled:true,college_name:'Example Engineering College',timezone:'Asia/Kolkata'};
  if(path==='/v3/college/drives')result=sample.by_drive.map((d:{id:string;name:string})=>({id:d.id,company_name:d.name,role_title:'Campus placement'}));
  if(path==='/v3/college/drives/preview-drive')result=previewDrive;
  if(path.startsWith('/v3/college/drives/preview-drive/dashboard/'))result={candidates:[previewCandidate],pagination:{total:1,limit:25,offset:0},interview_progress:{completed:1}};
  if(path==='/v3/college/students/preview-student/reports')result=previewBundle;
  if(path==='/v3/college/students/preview-student/reports/preview-session/recording')result=previewRecording;
  if(path==='/v3/college/intelligence/settings')result={...placementSample.settings,role_targets:{'Graduate Software Engineer':{technical_knowledge:80,analytical_reasoning:75,practical_application:80,problem_solving:80,communication:80}}};
  if(path==='/v3/college/feedback/dashboard'){
   const drive=url.searchParams.get('drive_id'),dept=url.searchParams.get('department'),batch=url.searchParams.get('batch'),search=(url.searchParams.get('search')||'').toLowerCase();
   const rows=sample.submissions.filter((r:{drive_id:string;department:string;batch:string;full_name:string;roll_number:string;drive_name:string})=>(!drive||r.drive_id===drive)&&(!dept||r.department===dept)&&(!batch||r.batch===batch)&&(!search||[r.full_name,r.roll_number,r.drive_name].join(' ').toLowerCase().includes(search)));
   result={...sample,submissions:rows,pagination:{total:rows.length,offset:0,limit:25}};
  }
  response.end(JSON.stringify(result));
 });}}],
 server:{host:'127.0.0.1',port:5317,strictPort:true}
}));
