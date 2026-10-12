import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const scores={communication:78,domain_knowledge:82,applied_evidence:75};
const settings={readiness_threshold:70,satisfaction_threshold:60,min_feedback_responses:5,role_targets:{Engineer:{communication:80}}};
const fixture={institution:{id:'college',name:'Example Engineering College'},summary:{interviews:12,candidates:10,average_competency:76,satisfaction:88,feedback_responses:8,positive_experience_percent:82},competencies:Object.entries(scores).map(([key,score])=>({key,name:key.replaceAll('_',' '),score,responses:12,weight:20,target:null})),experience_distribution:[{name:'Excellent',count:5},{name:'Good',count:2},{name:'Average',count:1}],readiness:[{name:'Ready',count:7},{name:'Developing',count:5}],trend:[{date:'2026-10-01',competency:68,satisfaction:82},{date:'2026-10-12',competency:76,satisfaction:88}],by_department:[{name:'CSE',interviews:12,score:76,ready_percent:58}],by_program:[],by_role:[],by_category:[{name:'placement_prep',interviews:12}],recent_interviews:[{session_id:'s1',student_id:'student-1',full_name:'Ananya Sharma',department:'CSE',program:'B.Tech',role:'Engineer',drive_id:'drive-1',drive_name:'Example Company',overall_score:78}],strengths:[{text:'Structured debugging',count:5}],development_gaps:[{text:'SQL optimisation',count:4}],suggestions:[{text:'More technical questions',department:'CSE',drive:'Example Company'}],alerts:[{type:'readiness',title:'Development support recommended',detail:'Review the evidence.'}],filters:{department:['CSE','ECE'],program:['B.Tech'],role:['Engineer'],experience:['fresher'],category:['placement_prep']},settings,scope_note:'Your authorized institution only.',rubric_version:'stage6-rubric-v1'};
const candidate={id:'student-1',student_id:'student-1',full_name:'Ananya Sharma',roll_number:'CS01',program:'B.Tech',department_code:'CSE',graduation_year:2026};
const bundle={student:candidate,drives:[{drive_id:'drive-1',company_name:'Example Company',role_title:'Engineer',assignment_status:'completed'}],reports:[{session_id:'s1',drive_id:'drive-1',role_title:'Engineer',completed_at:'2026-10-12',label:'Example Company · Engineer',overall_score:78,readiness:'Developing',detail:{rubric_version:'stage6-rubric-v1',score_breakdown:scores,executive_summary:'Demonstrated sound technical foundations.',core_dimensions:[],domain_dimensions:[],strengths:[{text:'Structured debugging'}],priority_improvement_areas:[{focus:'SQL optimisation',actions:['Practice query plans.']}],question_reviews:[{question:'Explain your project architecture',answer:'I separated the API and database.'}]}}]};
async function setup(page:Page,path='/dashboard/placement-management?view=dashboard'){
 await page.addInitScript(()=>localStorage.setItem('access_token','test-session'));
 await page.route(/\/v[13]\//,route=>{const p=new URL(route.request().url()).pathname;const values:Record<string,unknown>={'/v1/users/me':{user_id:'client-1',name:'College Manager',email:'manager@example.edu'},'/v3/college/access':{enabled:true,college_name:'Example Engineering College'},'/v3/email/capabilities':{email_enabled:false},'/v3/college/intelligence/dashboard':fixture,'/v3/college/intelligence/settings':settings,'/v3/college/drives':[{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'completed'}],'/v3/college/drive-drafts':[],'/v3/college/company-profiles':[],'/v3/college/dashboard/overview':{},'/v3/college/academic-catalog':{programs:[]},'/v3/college/students':{items:[candidate],total:1},'/v3/college/students/student-1/reports':bundle,'/v3/college/drives/drive-1':{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'completed'},'/v3/college/drives/drive-1/dashboard/ranking':{candidates:[candidate],total:1}};return route.fulfill({json:values[p]||{}})});
 await page.goto(path);
}
const screenshots='/root/voicedots/releases/placement-intelligence-20261012/screenshots';
test('command center has measured charts, working filters and expands with sidebar',async({page})=>{
 await page.setViewportSize({width:1600,height:1050});await setup(page);
 await expect(page.getByRole('heading',{name:'AI Interview Analytics'})).toBeVisible();await expect(page.locator('.pi-kpis')).toContainText('88/100');
 let filter='';await page.route('**/v3/college/intelligence/dashboard?**',route=>{filter=route.request().url();return route.fulfill({json:fixture})});
 await page.getByLabel('Department',{exact:true}).selectOption('CSE');await expect.poll(()=>filter).toContain('department=CSE');
 await page.getByLabel('Role',{exact:true}).selectOption('Engineer');await expect.poll(()=>filter).toContain('role=Engineer');
 await expect(page.locator('.recharts-wrapper')).toHaveCount(5);
 const before=(await page.locator('.placement-intelligence').boundingBox())!.width;await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();await expect.poll(async()=> (await page.locator('.placement-intelligence').boundingBox())!.width).toBeGreaterThan(before);
 mkdirSync(screenshots,{recursive:true});await page.screenshot({path:`${screenshots}/placement-dashboard-desktop.png`,fullPage:true});
 await page.getByRole('button',{name:'Reports & alerts',exact:true}).click();await expect(page.getByRole('heading',{name:'Department Benchmarking'})).toBeVisible();
 await page.getByRole('button',{name:'Configure',exact:true}).click();await page.getByLabel('Readiness threshold',{exact:true}).fill('75');let saved:any;await page.route('**/v3/college/intelligence/settings',route=>{saved=route.request().postDataJSON();return route.fulfill({json:saved})});await page.getByRole('button',{name:'Save policy'}).click();await expect.poll(()=>saved?.readiness_threshold).toBe(75);
});
test('drive Candidates View details opens evidence-backed Candidate 360 scorecard',async({page})=>{
 await page.setViewportSize({width:1500,height:1050});await setup(page,'/dashboard/placement-management?drive=drive-1&section=candidates');
 const hero=(await page.locator('.candidate-directory>.pi-hero').boundingBox())!;const search=(await page.locator('.candidate-directory>.pi-filter-panel').boundingBox())!;expect(search.y-hero.y-hero.height).toBeGreaterThanOrEqual(16);await page.getByRole('button',{name:'View details'}).click();await expect(page.getByRole('heading',{name:'Candidate 360° Profile'})).toBeVisible();await expect(page.getByRole('heading',{name:'Ananya Sharma'})).toBeVisible();await expect(page.getByRole('heading',{name:'Competency Results'})).toBeVisible();await expect(page.getByText('Target 80 · gap 2.0')).toBeVisible();await expect(page.getByRole('button',{name:'Open full report & human review'})).toBeVisible();await page.locator('#candidate-evidence summary').click();const evidence=(await page.locator('#candidate-evidence details').boundingBox())!;const answer=(await page.locator('#candidate-evidence details p').first().boundingBox())!;expect(answer.width).toBeGreaterThan(evidence.width*.9);await page.screenshot({path:`${screenshots}/candidate-360.png`,fullPage:true});
});
test('dashboard mobile fits and empty data does not invent values',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);await expect(page.getByRole('heading',{name:'AI Interview Analytics'})).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:`${screenshots}/placement-dashboard-mobile.png`,fullPage:true});
 await page.route('**/v3/college/intelligence/dashboard?**',route=>route.fulfill({json:{...fixture,summary:{interviews:0,candidates:0,average_competency:null,satisfaction:null,feedback_responses:0,positive_experience_percent:null},competencies:[],experience_distribution:[],readiness:[],trend:[],by_category:[],recent_interviews:[],strengths:[],development_gaps:[],suggestions:[]}}));await page.getByRole('button',{name:'Refresh analytics'}).click();await expect(page.locator('.pi-kpis')).toContainText('Not measured');
});

test('dashboard and Candidate 360 remain contained across tablet and narrow mobile widths', async ({page}) => {
 for (const width of [320,768,1024,1440]) {
  await page.setViewportSize({width,height:900});await setup(page);
  await expect(page.getByRole('heading',{name:'AI Interview Analytics'})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Competency & career analytics',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.goto('/dashboard/placement-management?drive=drive-1&section=candidates');
  await page.getByRole('button',{name:'View details'}).click();
  await expect(page.getByRole('heading',{name:'Ananya Sharma'})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});

test('malformed analytics response displays a retryable error without crashing',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await setup(page);
 await page.route('**/v3/college/intelligence/dashboard?**',route=>route.fulfill({json:{}}));
 await page.getByRole('button',{name:'Refresh analytics'}).click();
 await expect(page.getByRole('alert')).toContainText('Unable to complete the request. Please try again.');
 await expect(page.getByRole('region',{name:'Placement dashboard',exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});
