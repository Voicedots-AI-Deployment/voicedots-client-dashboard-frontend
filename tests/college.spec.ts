import { test, expect, type Page } from '@playwright/test';
async function setup(page: Page, enabled = true, options: { notFound?: string[]; driveRows?: unknown[]; driveDetails?: unknown; companyProfiles?: unknown[]; initialPath?: string } = {}) {
  await page.addInitScript(() => localStorage.setItem('access_token', 'test-session'));
  await page.route(/\/v[13]\//, route => {
    const path = new URL(route.request().url()).pathname;
    const values: Record<string, unknown> = {
      '/v1/users/me': { user_id: 'client-1', name: 'College Manager', email: 'manager@example.edu' },
      '/v3/email/capabilities': { email_enabled: false },
      '/v3/college/roster-options': {batches:['2023-2027'],graduation_years:[2027,2028],statuses:['active']},
      '/v3/college/analytics': {summary:{total_students:0,placed_students:0,students_attended:0,total_attempts:0,completed_attempts:0,repeat_students:0,not_attended:0,participation_rate:0,completion_rate:0,average_duration_minutes:null},by_drive:[],by_program:[],trend:[],scope:'Placement interviews only.'},
      '/v3/college/access': { enabled, college_name: 'Example Engineering College', timezone:'Asia/Kolkata' },
      '/v3/college/company-profiles': options.companyProfiles ?? [{id:'company-1',company_name:'Northstar Technologies',company_description:'Builds software',company_website:'https://northstar.example',company_linkedin:'https://linkedin.com/company/northstar'}],
      '/v3/college/drives/role-suggestions': ['Data Analyst','Data Scientist','LLM Engineer'],
      '/v3/college/drive-drafts': [],
      '/v3/college/drives/eligibility/preview': {total_students:0,eligible_count:0,not_eligible_count:0,missing_photo_count:0,candidates:[]},
      '/v3/college/agents': {agents:[],tracks:['hr','domain','industry','manager'].map((track,i)=>({track,default_profile:{track,name:['Priya','Arjun','Neha','Vikram'][i],role:['Talent Acquisition Specialist','Senior Domain Specialist','Practical Interviewer','Hiring Manager'][i],intro_message:'Hello {name}',personality_prompt:'Interview for {role}',tone:'professional',voice_id:'flux-priya-en'}}))},
      '/v3/college/drives': options.driveRows ?? [{ id: 'drive-1', company_name: 'Example Company', role_title: 'Software Engineer', status: 'draft', location: 'Chennai' }],
      '/v3/college/drives/drive-1': options.driveDetails ?? {},
      '/v3/college/students': { items: [], total: 0 },
      '/v3/college/attendance/setup': { classes: [], students: [], staff: [] },
      '/v3/college/academic-catalog': { programs: [{ code: 'B.Tech', display_name: 'Bachelor of Technology', duration_years: 4, departments: [{ code: 'CSE', display_name: 'Computer Science' },{ code: 'IT', display_name: 'Information Technology' }] }], graduation_years:[2027,2028] },
    };
    return route.fulfill({ json: values[path] || {} });
  });
  if (options.notFound?.length) await page.route(/\/v[13]\//, route => {
    const path = new URL(route.request().url()).pathname;
    if (options.notFound?.includes(path)) return route.fulfill({ status: 404, json: { detail: 'Endpoint not found' } });
    return route.fallback();
  });
  await page.goto(options.initialPath || '/dashboard/college');
}

test('drive editor remains usable when company profiles return 404', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await setup(page, true, {
    notFound: ['/v3/college/company-profiles'],
    initialPath: '/dashboard/placement-management?drive=drive-1&section=settings',
    driveRows: [{ id: 'drive-1', company_name: 'Example Company', role_title: 'Software Engineer', status: 'draft', location: 'Chennai' }],
  });
  await expect(page.getByRole('heading', { name: 'Drive management' })).toBeVisible();
  await page.getByRole('button', { name: 'Modify section' }).first().click();
  await expect(page.getByLabel('Company', { exact: true })).toBeVisible();
  await expect(page.getByText(/Reusable company profiles couldn't be loaded/)).toBeVisible();
  await expect(page.getByLabel('Company', { exact: true })).toHaveValue('');
  expect(pageErrors).toEqual([]);
});

test('placement management filters null drive rows and shows draft endpoint failures', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await setup(page, true, {
    notFound: ['/v3/college/drive-drafts'],
    driveRows: [null, { id: 'drive-1', company_name: 'Example Company', role_title: 'Software Engineer', status: 'draft', location: 'Chennai' }],
  });
  await expect(page.getByRole('heading', { name: 'Placement management' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Example Company' })).toBeVisible();
  await expect(page.getByText(/Failed to load drive drafts/)).toBeVisible();
  expect(pageErrors).toEqual([]);
});
async function driveFields(page: Page) {
  await page.getByLabel('Company name').fill('Campus Employer');
  await page.locator('#role_title').fill('Software Engineer');
  await page.getByLabel('Location').fill('Chennai');
  await page.getByLabel('Job description').fill('Build and maintain accessible web applications using JavaScript and Python.');
  await page.getByRole('button', {name:'Continue'}).click();
  await page.getByLabel('Interview starts date').fill('2027-01-10');
  await page.getByLabel('Interview starts hour').selectOption('9');
  await page.getByLabel('Interview starts AM / PM').selectOption('AM');
  await page.getByLabel('Interview ends date').fill('2027-01-11');
  await page.getByLabel('Interview ends hour').selectOption('6');
  await page.getByLabel('Interview ends AM / PM').selectOption('PM');
  await page.getByRole('button',{name:'4. Questions'}).click();
  await page.getByRole('button',{name:'5. Eligibility'}).click();
  await page.getByRole('checkbox',{name:/Bachelor Of Technology B\.Tech/}).check();
  await page.getByRole('checkbox',{name:/Computer Science · CSE/}).check();
  await page.getByRole('checkbox',{name:/Information Technology · IT/}).check();
  await page.locator('#graduation_from').selectOption('2027');
  await page.locator('#graduation_to').selectOption('2028');
  await page.getByRole('button',{name:'Continue'}).click();
  if(await page.getByRole('dialog').isVisible().catch(()=>false)) await page.getByRole('button',{name:'Confirm and review'}).click();
}

test('unassigned client cannot see management navigation or controls', async ({ page }) => {
  await setup(page, false);
  await expect(page.getByText('Placement management is not enabled', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Placement management', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create drive', exact: true })).toHaveCount(0);
});

test('drive form uses the client API and does not supply a college identity', async ({ page }) => {
  await setup(page,true,{initialPath:'/dashboard/placement-management'});
  let payload: Record<string, unknown> = {};
  await page.route('**/v3/college/drives', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    payload = route.request().postDataJSON();
    return route.fulfill({ json: { drive_id: 'new-drive', status: 'active', warnings: [] } });
  });
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await driveFields(page);
  await page.getByRole('button', {name:'Create placement drive'}).click();
  await expect(page.getByText('Drive created (active).')).toBeVisible();
  expect(payload.eligible_departments).toEqual(['CSE', 'IT']);
  expect(payload.eligible_graduation_years).toEqual([2027, 2028]);
  expect(payload).not.toHaveProperty('college_id');
  expect(payload.window_start).toMatch(/^2027-01-10T03:30:00\.000Z$/);
  expect(payload.window_end).toMatch(/^2027-01-11T12:30:00\.000Z$/);
});

test('company profile selection fills company information while role suggestions remain drive-specific', async ({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management'});
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await page.getByRole('combobox',{name:/Find a saved company/}).fill('Northstar');
  await page.getByRole('option',{name:/Northstar Technologies/}).click();
  await expect(page.getByLabel('Company name')).toHaveValue('Northstar Technologies');
  await expect(page.getByLabel('Company website')).toHaveValue('https://northstar.example');
  await page.locator('#role_title').fill('Data');
  await expect(page.getByRole('listbox',{name:'Existing drive roles'}).getByRole('option')).toHaveCount(3);
  await expect(page.locator('#role_title')).toHaveValue('Data');
});

test('role menu loads and selects unique historical drive roles before typing',async({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management'});
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  const role=page.locator('#role_title');
  await role.focus();
  const options=page.getByRole('listbox',{name:'Existing drive roles'});
  await expect(options.getByRole('option')).toHaveCount(3);
  await options.getByRole('option').first().click();
  await expect(role).toHaveValue('Data Analyst');
});

test('graduation year can target a single year',async({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management'});
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await page.getByLabel('Company name').fill('Campus Employer');
  await page.locator('#role_title').fill('Analyst');
  await page.getByLabel('Location').fill('Remote');
  await page.getByLabel('Job description').fill('Analyze company operations.');
  await page.getByRole('button',{name:'2. Interview setup'}).click();
  await page.getByLabel('Interview starts date').fill('2027-01-10');
  await page.getByLabel('Interview ends date').fill('2027-01-11');
  await page.getByRole('button',{name:'5. Eligibility'}).click();
  await page.getByRole('checkbox',{name:/Bachelor Of Technology B\.Tech/}).check();
  await page.getByRole('checkbox',{name:/Computer Science · CSE/}).check();
  await page.locator('#graduation_from').selectOption('2028');
  await expect(page.locator('#graduation_to')).toHaveValue('2028');
  await expect(page.getByText('Selected graduation years: 2028')).toBeVisible();
});

test('custom interviewer appends into an available sequence slot and can start an empty sequence',async({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management'});
  await page.route('**/v3/college/agents',route=>route.fulfill({json:{agents:[{id:'custom-problem',track:'industry',role:'Problem Solving Specialist',personality_prompt:'Assess structured problem solving',intro_message:'Start',tone:'direct'}],tracks:['hr','domain','industry','manager'].map(track=>({track,default_profile:{track,role:track,name:track,intro_message:'Hello',personality_prompt:'Assess',tone:'professional'}}))}}));
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await page.getByLabel('Company name').fill('Campus Employer');
  await page.locator('#role_title').fill('Analyst');
  await page.getByLabel('Location').fill('Remote');
  await page.getByLabel('Job description').fill('Analyze company operations.');
  await page.getByRole('button',{name:'2. Interview setup'}).click();
  await page.getByLabel('Interview starts date').fill('2027-01-10');
  await page.getByLabel('Interview ends date').fill('2027-01-11');
  await page.getByRole('button',{name:'3. Interview roles'}).click();
  await expect(page.getByRole('button',{name:'Remove Talent Acquisition Specialist'})).toBeVisible();
  for(const role of ['Senior Domain Specialist','Practical Interviewer','Hiring Manager']) await page.getByRole('button',{name:`Remove ${role}`}).click();
  await page.getByLabel(/Add a saved custom interview role/).selectOption('custom-problem');
  await expect(page.getByRole('heading',{name:'Problem Solving Specialist'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Talent Acquisition Specialist'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Problem Solving Specialist'})).toBeVisible();
  await page.getByRole('button',{name:'Remove Talent Acquisition Specialist'}).click();
  await page.getByRole('button',{name:'Remove Problem Solving Specialist'}).click();
  await expect(page.getByRole('button',{name:/Talent Acquisition Specialist Add this interview role/})).toBeVisible();
  await page.getByLabel(/Add a saved custom interview role/).selectOption('custom-problem');
  await page.getByRole('button',{name:/Senior Domain Specialist Add this interview role/}).click();
  await expect(page.getByLabel(/Add a saved custom interview role/).locator('option')).toHaveCount(1);
  await expect(page.getByRole('heading',{name:'Problem Solving Specialist'})).toHaveCount(1);
  await expect(page.getByRole('heading',{name:'Senior Domain Specialist'})).toHaveCount(1);
});

test('candidate interview report separates statuses, loads proctor evidence independently, and never fabricates a photo',async({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management?drive=drive-1&candidate=student-1'});
  await page.route('**/v3/college/students/student-1/reports',route=>route.fulfill({json:{student:{full_name:'Asha Rao',roll_number:'CS01',program:'B.Tech',department_code:'CSE',graduation_year:2027},reports:[{drive_id:'drive-1',session_id:'session-1',overall_score:85,readiness:'Interview Ready',completed_at:'2026-09-20T10:00:00Z',detail:{status:'released',placement_readiness:{score:80},question_reviews:[{question:'Explain your project.',answer:'I built it.',has_audio:false}],agent_breakdown:[],requirement_evidence_matrix:[],proctoring_score:{overall_score:92,total_events:1}}}]}}));
  await page.route('**/v3/college/drives/drive-1',route=>route.fulfill({json:{id:'drive-1',company_name:'Northstar',role_title:'Engineer',status:'active',agent_selection:[]}}));
  await page.route('**/v3/college/drives/drive-1/candidates/student-1/decision',route=>route.fulfill({json:{decision:{decision:'hold'},publication:{state:'hidden'},history:[]}}));
  await page.route('**/v3/college/interview-results-settings',route=>route.fulfill({json:{}}));
  await page.route('**/v3/college/students/student-1/reports/session-1/integrity-events',route=>route.fulfill({json:{events:[{event_id:'event-1',event_type:'tab_hidden',severity:'violation',occurred_at:'2026-09-20T09:30:00Z'}]}}));
  await expect(page.getByRole('heading',{name:'Asha Rao'})).toBeVisible();
  await expect(page.locator('p').filter({hasText:'Interview completion:'})).toContainText('Completed');
  await expect(page.locator('p').filter({hasText:'Student result:'})).toContainText('Hidden');
  await expect(page.getByRole('navigation',{name:'Report sections'}).getByRole('link')).toHaveCount(7);
  await page.getByRole('button',{name:'Load event timeline'}).click();
  await expect(page.getByRole('list',{name:'Proctor observations'})).toContainText('Tab Hidden');
  await expect(page.getByText(/No incident photo available/)).toBeVisible();
  const answer=page.getByText('Explain your project.');
  await expect(answer).toBeVisible();
  await expect(answer.locator('xpath=ancestor::details')).not.toHaveAttribute('open','');
});

test('saved company picker opens from its arrow, scrolls large lists, and filters as you type', async ({page})=>{
  const profiles=Array.from({length:100},(_,index)=>({
    id:`company-${index}`,
    company_name:`Company ${String(index).padStart(3,'0')}`,
    company_website:`https://company-${index}.example`,
  }));
  await setup(page,true,{companyProfiles:profiles});
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  const picker=page.getByRole('combobox',{name:/Find a saved company/});
  const list=page.getByRole('listbox',{name:'Saved company profiles'});
  await expect(list).toHaveCount(0);
  await page.getByRole('button',{name:'Open saved company profiles'}).click();
  await expect(list).toBeVisible();
  await expect(list.getByRole('option')).toHaveCount(100);
  expect(await list.evaluate(element=>element.scrollHeight>element.clientHeight)).toBe(true);
  await picker.fill('Company 099');
  await expect(list.getByRole('option')).toHaveCount(1);
  await list.getByRole('option',{name:/Company 099/}).click();
  await expect(page.getByLabel('Company name')).toHaveValue('Company 099');
  await expect(list).toHaveCount(0);
});

test('field validation keeps the current step and focuses the exact invalid field', async ({page})=>{
  await setup(page);
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await page.getByLabel('Company name').fill('Northstar');
  await page.locator('#role_title').fill('Data Analyst');
  await page.getByLabel('Location').fill('Remote');
  await page.getByLabel('Job description').fill('Analyze operational data and build dashboards.');
  await page.getByLabel('Company website').fill('http://northstar.example');
  await page.getByRole('button',{name:'Continue'}).click();
  await expect(page.getByText('Please enter a valid URL beginning with https://')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Drive & company'})).toBeVisible();
  await expect(page.getByLabel('Company website')).toBeFocused();
});

test('interview end ordering error appears beside the end input', async ({page})=>{
  await setup(page);
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await page.getByLabel('Company name').fill('Northstar');
  await page.locator('#role_title').fill('Data Analyst');
  await page.getByLabel('Location').fill('Remote');
  await page.getByLabel('Job description').fill('Analyze operational data and build dashboards.');
  await page.getByRole('button',{name:'Continue'}).click();
  await page.getByLabel('Interview starts date').fill('2027-01-10');
  await page.getByLabel('Interview starts hour').selectOption('10');
  await page.getByLabel('Interview ends date').fill('2027-01-10');
  await page.getByLabel('Interview ends hour').selectOption('9');
  await page.getByRole('button',{name:'Continue'}).click();
  await expect(page.getByText('Interview end must be later than interview start.')).toBeVisible();
  await expect(page.getByLabel('Interview ends date')).toBeFocused();
});

test('interview window accepts any minute and saves it precisely', async ({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management'});
  let payload: Record<string, unknown> = {};
  await page.route('**/v3/college/drives', route => route.request().method() === 'POST' ? (payload=route.request().postDataJSON(),route.fulfill({json:{drive_id:'minute-drive',status:'scheduled',warnings:[]}})) : route.fallback());
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await page.getByLabel('Company name').fill('Northstar');
  await page.locator('#role_title').fill('Data Analyst');
  await page.getByLabel('Location').fill('Remote');
  await page.getByLabel('Job description').fill('Analyze business data and present findings.');
  await page.getByRole('button',{name:'Continue'}).click();
  await page.getByLabel('Interview starts date').fill('2027-01-10');
  await page.getByLabel('Interview starts hour').selectOption('9');
  const minutes=page.getByLabel('Interview starts minute');
  await expect(minutes).toHaveAttribute('placeholder','00');
  await minutes.focus();
  await minutes.pressSequentially('23');
  await expect(minutes).toHaveValue('23');
  await minutes.fill('8');
  await minutes.press('Tab');
  await expect(minutes).toHaveValue('08');
  await minutes.fill('');
  await minutes.press('Tab');
  await expect(minutes).toHaveValue('00');
  await minutes.fill('35');
  await page.getByLabel('Interview starts AM / PM').selectOption('AM');
  await page.getByLabel('Interview ends date').fill('2027-01-11');
  await page.getByLabel('Interview ends hour').selectOption('6');
  await page.getByLabel('Interview ends AM / PM').selectOption('PM');
  await page.getByRole('button',{name:'4. Questions'}).click();
  await page.getByRole('button',{name:'5. Eligibility'}).click();
  await page.getByRole('checkbox',{name:/Bachelor of Technology.*B\.Tech/i}).check();
  await page.getByRole('checkbox',{name:/Computer Science.*CSE/i}).check();
  await page.locator('#graduation_from').selectOption('2027');
  await page.locator('#graduation_to').selectOption('2028');
  await page.getByRole('button',{name:'Continue'}).click();
  if(await page.getByRole('dialog').isVisible().catch(()=>false)) await page.getByRole('button',{name:'Confirm and review'}).click();
  await page.getByRole('button',{name:'Create placement drive'}).click();
  expect(payload.window_start).toMatch(/^2027-01-10T04:05:00\.000Z$/);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('drive deletion uses delete endpoint and removes the drive rather than unlocking it',async({page})=>{
  let deleted=false,lockRequested=false;
  await setup(page,true,{driveRows:[{id:'drive-delete',company_name:'Northstar',role_title:'Analyst',status:'scheduled',location:'Remote'}]});
  await page.route('**/v3/college/drives',route=>route.request().method()==='GET'&&deleted?route.fulfill({json:[]}):route.fallback());
  await page.route('**/v3/college/drives/drive-delete',route=>{
    if(route.request().method()==='DELETE'){deleted=true;return route.fulfill({json:{status:'removed'}});}
    return route.fallback();
  });
  await page.route('**/v3/college/drives/drive-delete/lock',route=>{lockRequested=true;return route.fulfill({json:{is_locked:true}});});
  page.on('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Delete drive'}).click();
  await expect.poll(()=>deleted).toBe(true);
  await expect(page.getByRole('heading',{name:'Northstar'})).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Drive deleted.');
  expect(deleted).toBe(true);
  expect(lockRequested).toBe(false);
});

test('save draft persists partial fields and remains resumable', async ({page})=>{
  await setup(page);
  let draftPayload:Record<string,unknown>={},draftSaved=false;
  await page.route('**/v3/college/drive-drafts',route=>{
    if(route.request().method()==='GET')return route.fulfill({json:draftSaved?[{id:'draft-1',client_draft_key:(draftPayload.payload as {creationKey?:string}).creationKey,step:0,payload:draftPayload.payload,updated_at:'2026-09-23T10:00:00Z'}]:[]});
    if(route.request().method()!=='POST')return route.fallback();
    draftPayload=route.request().postDataJSON();
    draftSaved=true;
    return route.fulfill({json:{id:'draft-1',client_draft_key:(draftPayload.payload as {creationKey?:string}).creationKey,step:0,payload:draftPayload.payload,updated_at:'2026-09-23T10:00:00Z'}});
  });
  await page.route('**/v3/college/drive-drafts/draft-1',route=>route.fulfill({json:{id:'draft-1',client_draft_key:'draft-key-1234567890',step:0,payload:draftPayload.payload,updated_at:'2026-09-23T10:00:00Z'}}));
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await page.getByLabel('Company name').fill('Northstar Technologies');
  await page.getByRole('button',{name:'Save draft'}).first().click();
  await expect(page.getByText('Draft saved.',{exact:true})).toBeVisible();
  expect((draftPayload.payload as {form?:{company_name?:string}}).form?.company_name).toBe('Northstar Technologies');
  await page.getByRole('button',{name:'Back to placement drives'}).click();
  await page.getByRole('heading',{name:'Northstar Technologies'}).locator('xpath=ancestor::article[1]').getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByLabel('Company name')).toHaveValue('Northstar Technologies');
});

test('save draft and continue waits for an active auto-save before advancing',async({page})=>{
  await setup(page);
  const savedSteps:number[]=[];
  await page.route('**/v3/college/drive-drafts**',async route=>{
    if(route.request().method()==='GET')return route.fulfill({json:[]});
    if(!['POST','PUT'].includes(route.request().method()))return route.fallback();
    const body=route.request().postDataJSON();savedSteps.push(body.step);
    if(savedSteps.length===1)await new Promise(resolve=>setTimeout(resolve,1500));
    return route.fulfill({json:{id:'draft-wait',client_draft_key:body.client_draft_key||'drive-draft-key',step:body.step,payload:body.payload,updated_at:new Date().toISOString()}});
  });
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await page.getByLabel('Company name').fill('Northstar Technologies');
  await page.locator('#role_title').fill('Data Analyst');
  await page.getByLabel('Location').fill('Remote');
  await page.getByLabel('Job description').fill('Analyze business data and share findings.');
  await expect(page.getByText('Saving draft…')).toBeVisible();
  const continueButton=page.getByRole('button',{name:'Save draft & continue'});
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
  await expect(page.getByText('STEP 2 OF 6')).toBeVisible();
  expect(savedSteps).toEqual([0,1]);
});

test('stale cloud draft ID is recovered without a missing-resource request and appears in the draft list',async({page})=>{
  await setup(page);
  const key='stable-drive-draft-key-12345';
  const local={id:'stale-draft-id',saved_at:'2026-09-25T10:00:00Z',payload:{form:{company_name:'Recovered Employer'},selection:[],rounds:[],programIds:[],departments:[],years:[],step:0,creationKey:key}};
  await page.evaluate(value=>localStorage.setItem('voicedots:placement-drive-draft:v2',JSON.stringify(value)),local);
  let created:{id:string;client_draft_key:string;step:number;payload:unknown;updated_at:string}|null=null;
  await page.route('**/v3/college/drive-drafts',route=>{
    if(route.request().method()==='GET')return route.fulfill({json:created?[created]:[]});
    if(route.request().method()==='POST'){
      const body=route.request().postDataJSON();
      expect(body.client_draft_key).toBe(key);
      created={id:'recovered-cloud-id',client_draft_key:key,step:body.step,payload:body.payload,updated_at:'2026-09-25T10:01:00Z'};
      return route.fulfill({status:201,json:created});
    }
    return route.fallback();
  });
  let stalePutRequested=false;
  await page.route('**/v3/college/drive-drafts/stale-draft-id',route=>{stalePutRequested=true;return route.fulfill({status:404,json:{detail:'Drive draft not found.'}});});
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await expect.poll(()=>created!==null,{timeout:10000}).toBe(true);
  expect(stalePutRequested).toBe(false);
  await page.getByRole('button',{name:'Back to placement drives'}).click();
  await expect(page.getByText('Draft · Step 1 of 6')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Recovered Employer'})).toBeVisible();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByLabel('Company name')).toHaveValue('Recovered Employer');
});

test('device-only drive draft stays visible and can be resumed when cloud list is empty',async({page})=>{
  await setup(page);
  await page.evaluate(()=>localStorage.setItem('voicedots:placement-drive-draft:v2',JSON.stringify({id:'stale-cloud-id',saved_at:'2026-09-25T10:00:00Z',payload:{form:{company_name:'Offline Employer'},selection:[],rounds:[],programIds:[],departments:[],years:[],step:1,creationKey:'local-device-draft-key-12345'}})));
  await page.reload();
  await expect(page.getByText('Draft · Step 2 of 6')).toBeVisible();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'1. Drive & company'}).click();
  await expect(page.getByLabel('Company name')).toHaveValue('Offline Employer');
});

test('draft deletion accepts a bodyless 204 response',async({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management'});
  await page.route('**/v3/college/drive-drafts',route=>route.fulfill({json:[{id:'draft-204',step:0,payload:{form:{company_name:'Draft Employer',role_title:'Analyst'}},updated_at:'2026-09-25T10:00:00Z'}]}));
  await page.route('**/v3/college/drive-drafts/draft-204',route=>route.request().method()==='DELETE'?route.fulfill({status:204}):route.fallback());
  await expect(page.getByRole('heading',{name:'Draft Employer'})).toBeVisible();
  await page.getByRole('button',{name:'Delete draft'}).click();
  await expect(page.getByRole('heading',{name:'Draft Employer'})).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a missing draft reports Drive not found while a real delete failure remains visible',async({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management'});
  await page.route('**/v3/college/drive-drafts',route=>route.fulfill({json:[{id:'draft-missing',step:0,payload:{form:{company_name:'Stale Employer'}},updated_at:'2026-09-25T10:00:00Z'},{id:'draft-failure',step:0,payload:{form:{company_name:'Failed Employer'}},updated_at:'2026-09-25T10:00:00Z'}]}));
  await page.route('**/v3/college/drive-drafts/draft-missing',route=>route.fulfill({status:404,json:{detail:'Drive draft not found.'}}));
  await page.route('**/v3/college/drive-drafts/draft-failure',route=>route.fulfill({status:500,json:{detail:'Database unavailable.'}}));
  await page.getByRole('heading',{name:'Stale Employer'}).locator('xpath=ancestor::article[1]').getByRole('button',{name:'Delete draft'}).click();
  await expect(page.getByRole('alert')).toContainText('Drive not found');
  await expect(page.getByRole('heading',{name:'Stale Employer'})).toHaveCount(0);
  await page.getByRole('heading',{name:'Failed Employer'}).locator('xpath=ancestor::article[1]').getByRole('button',{name:'Delete draft'}).click();
  await expect(page.getByRole('alert')).toContainText('Database unavailable');
  await expect(page.getByRole('heading',{name:'Failed Employer'})).toBeVisible();
});

test('backend errors preserve the form instead of claiming a successful creation', async ({ page }) => {
  await setup(page);
  await page.route('**/v3/college/drives', route => route.request().method() === 'POST' ? route.fulfill({ status: 422, json: { detail: 'The interview window is invalid.' } }) : route.fallback());
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await driveFields(page);
  await page.getByRole('button',{name:'Create placement drive'}).click();
  await expect(page.getByRole('alert')).toHaveText('The interview window is invalid.');
  await expect(page.getByText('Campus Employer',{exact:true})).toBeVisible();
});

test('student roster and academic setup work on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.getByRole('button', { name: 'Student roster', exact: true }).click();
  await page.getByRole('button', { name: 'Add student', exact: true }).click();
  await page.getByLabel('Full name').fill('Example Student');
  await page.getByLabel('Roll number').fill('CSE-2027-001');
  await page.getByLabel('Email', { exact: true }).fill('student@example.edu');
  await page.getByLabel('Phone', { exact: true }).fill('+919876543210');
  await page.getByLabel('CGPA', { exact: true }).fill('8.2');
  await page.locator('input[name=photo]').setInputFiles({ name: 'student.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('reference-photo') });
  let payload: Record<string, unknown> = {};
  await page.route('**/v3/college/students', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    payload = route.request().postDataJSON();
    return route.fulfill({ json: { student_id: 'student-1' } });
  });
  await page.locator('input[name=password]').fill('StudentSecure123!');
  await page.locator('input[name=confirm_password]').fill('DifferentSecure123!');
  await page.getByRole('button', { name: 'Save student' }).click();
  await expect(page.getByRole('alert')).toHaveText('Passwords do not match.');
  expect(payload).toEqual({});
  await page.locator('input[name=confirm_password]').fill('StudentSecure123!');
  await page.getByRole('button', { name: 'Save student' }).click();
  await expect(page.getByText('Student added with a login password.', { exact: false })).toBeVisible();
  expect(payload.password).toBe('StudentSecure123!');
  expect(payload.confirm_password).toBeUndefined();
  expect(payload.photo).toMatch(/^data:image\/jpeg;base64,/);
  expect(payload.program).toBe('B.Tech');
  expect(payload.department_code).toBe('CSE');
  await page.getByRole('button', { name: 'Academic setup', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Add or update program' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/college-management-mobile.png', fullPage: true });
});

test('academic setup can rename department codes and delete programs or department mappings',async({page})=>{
  await setup(page,true,{initialPath:'/dashboard/attendance'});
  await page.getByRole('button',{name:'Academic setup',exact:true}).click();
  const program=page.locator('article').filter({has:page.getByRole('heading',{name:'Bachelor of Technology'})});
  let departmentPayload:Record<string,unknown>={};
  const mutations:string[]=[];
  await page.route('**/v3/college/academic-catalog/**',async route=>{
    const request=route.request();
    if(request.method()==='POST'){
      departmentPayload=request.postDataJSON();mutations.push(`POST ${new URL(request.url()).pathname}`);
      return route.fulfill({json:{status:'saved'}});
    }
    if(request.method()==='DELETE'){
      mutations.push(`DELETE ${new URL(request.url()).pathname}`);
      return route.fulfill({json:{status:'deleted'}});
    }
    return route.fallback();
  });
  await program.getByRole('button',{name:'Edit',exact:true}).first().click();
  const code=page.getByLabel('Department code *');
  await expect(code).toBeEditable();
  await code.fill('CSE2');
  await page.getByLabel('Department name *').fill('Computer Science');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect.poll(()=>departmentPayload.code).toBe('CSE2');
  expect(departmentPayload.current_code).toBe('CSE');
  page.on('dialog',dialog=>dialog.accept());
  await program.getByRole('button',{name:'Remove IT from B.Tech'}).click();
  await program.getByRole('button',{name:'Delete program'}).click();
  expect(mutations.some(path=>path.includes('/programs/B.Tech/departments/IT'))).toBe(true);
  expect(mutations.some(path=>path.endsWith('/academic-catalog/programs/B.Tech'))).toBe(true);
});

test('drive editor handles an invalid stored date without crashing', async ({ page }) => {
  await setup(page, true, { initialPath: '/dashboard/placement-management?drive=drive-1&section=settings' });
  await page.route('**/v3/college/drives/drive-1', route => route.fulfill({json:{
    id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'draft',
    window_start_at:'invalid',window_end_at:'2027-01-11T12:30:00Z',
  }}));
  await page.getByRole('button', { name: 'Modify section' }).nth(1).click();
  await expect(page.getByLabel('Interview start')).toBeVisible();
  await expect(page.getByLabel('Interview start')).toHaveValue('');
});


test('roster filters reach the server and clear without leaving stale selections', async ({page})=>{
 await setup(page);
 await page.getByRole('button',{name:'Student roster',exact:true}).click();
 const response=page.waitForRequest(r=>r.url().includes('/v3/college/students?')&&r.url().includes('program=B.Tech'));
 await page.getByRole('combobox',{name:'Filter by program',exact:true}).selectOption('B.Tech');
 await response;
 const batchRequest=page.waitForRequest(r=>r.url().includes('batch_label=2023-2027'));
 await page.getByRole('combobox',{name:'Filter by batch',exact:true}).selectOption('2023-2027');
 await batchRequest;
 await page.getByRole('button',{name:'Clear filters'}).click();
 await expect(page.getByRole('combobox',{name:'Filter by program',exact:true})).toHaveValue('');
 await expect(page.getByRole('combobox',{name:'Filter by batch',exact:true})).toHaveValue('');
});

test('analytics has honest empty data and fits a mobile viewport',async ({page})=>{
 await page.setViewportSize({width:390,height:844});
 await setup(page);
 await page.getByRole('button',{name:'Analytics',exact:true}).click();
 await expect(page.getByText('Students attended',{exact:true}).first()).toBeVisible();
 await expect(page.getByText('No placement interviews started in this period.')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.screenshot({path:'test-results/placement-analytics-mobile.png',fullPage:true});
});

test('roster imports a workbook and offers a downloadable CSV template',async({page})=>{
 await setup(page);await page.route('**/v3/college/students/upload',async route=>{expect(route.request().headers()['content-type']).toContain('multipart/form-data; boundary=');expect(route.request().postDataBuffer()?.toString()).toContain('roster.csv');return route.fulfill({json:{records_created:2,records_updated:1,records_processed:3,errors_count:1,errors_sample:['Students row 5: Email is required'],warnings_count:0,warnings_sample:[]}})});
 await page.route('**/v3/college/students/template?format=csv',route=>route.fulfill({contentType:'text/csv',body:'roll_number,full_name,email\r\n'}));
 await page.getByRole('button',{name:'Student roster',exact:true}).click();await page.getByText('Import students from CSV or Excel',{exact:true}).click();const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download CSV template'}).click();expect((await downloaded).suggestedFilename()).toBe('student-import-template.csv');await page.getByLabel('Student import file').setInputFiles({name:'roster.csv',mimeType:'text/csv',buffer:Buffer.from('roll_number,full_name,email\n001,Asha,asha@example.com')});await page.getByRole('button',{name:'Import students',exact:true}).click();await expect(page.getByText('2 created · 1 updated · 1 errors · 0 warnings')).toBeVisible();await expect(page.getByText('Students row 5: Email is required')).toBeVisible();
});

for (const existing of [true, false]) {
 test(`existing student photo can be ${existing ? 'viewed and replaced' : 'added'} from the roster editor`, async ({page}) => {
  await setup(page);
  const student = {id:'student-1',full_name:'Example Student',email:'student@example.edu',roll_number:'CS01',phone:'9999999999',program:'B.Tech',department_code:'CSE',graduation_year:2027,cgpa:8,status:'active'};
  const image = await page.evaluate(() => { const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;canvas.getContext('2d')!.fillRect(0,0,32,32);return canvas.toDataURL('image/png'); });
  let photo = existing ? image : '';
  let saves = 0, studentWrites = 0;
  await page.route('**/v3/college/students**', route => {
   if(route.request().method() !== 'GET') { studentWrites++; return route.fulfill({json:{}}); }
   return route.fulfill({json:{items:[student],total:1}});
  });
  await page.route('**/v3/college/attendance/photos/students/student-1', route => {
   if(route.request().method()==='POST') { photo=route.request().postDataJSON().photo;saves++;return route.fulfill({json:{saved:true}}); }
   return route.fulfill({status:photo?200:404,json:photo?{photo}:{detail:'No photo enrolled.'}});
  });
  await page.getByRole('button',{name:'Student roster',exact:true}).click();
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  const dialog=page.getByRole('dialog');
  if(existing) await expect(dialog.getByAltText('Example Student verification reference')).toBeVisible();
  else await expect(dialog.getByText('No photo enrolled')).toBeVisible();
  await dialog.getByLabel('Upload photo').setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:Buffer.from(image.split(',')[1],'base64')});
  await expect(dialog.getByAltText('Example Student verification reference')).toBeVisible();
  await dialog.getByRole('button',{name:'Save verification photo',exact:true}).click();
  await expect(dialog.getByText('Verification photo saved.')).toBeVisible();
  expect(saves).toBe(1);expect(studentWrites).toBe(0);
  expect(photo).toMatch(/^data:image\/jpeg;base64,/);
  await dialog.getByRole('button',{name:'Close form'}).click();
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  await expect(page.getByAltText('Example Student verification reference')).toHaveAttribute('src',photo);
 });
}


test('agents follow academic setup and defaults cannot be edited', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Interview Agents', exact: true }).click();
  await expect(page.getByText('Locked default')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Create agent', exact: true }).click();
  await page.getByLabel('Name', {exact:true}).fill('Asha');
  await page.getByLabel('Role', {exact:true}).fill('Product interviewer');
  await page.getByLabel('First message').fill('Welcome {name} to {company}');
  await page.getByLabel('System prompt').fill('Interview for {role} using product scenarios.');
  let saved: Record<string, unknown> = {};
  await page.route('**/v3/college/agents', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    saved = route.request().postDataJSON(); return route.fulfill({json:{id:'custom-1',...saved}});
  });
  await page.getByRole('button', {name:'Save agent'}).click();
  await expect(page.getByRole('button', {name:'Save agent'})).toHaveCount(0);
  expect(saved.name).toBe('Asha'); expect(saved.intro_message).toContain('{company}');
});

test('single selected round saves manual questions in the drive', async ({ page }) => {
  await setup(page);
  let payload: Record<string, unknown> = {};
  await page.route('**/v3/college/drives', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    payload = route.request().postDataJSON(); return route.fulfill({json:{drive_id:'new',status:'active'}});
  });
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await driveFields(page);
  await page.getByRole('button',{name:'3. Interview roles'}).click();
  await page.getByRole('button',{name:'Remove Hiring Manager'}).click();
  await page.getByRole('button',{name:'Remove Practical Interviewer'}).click();
  await page.getByRole('button',{name:'Remove Talent Acquisition Specialist'}).click();
  await page.getByRole('button',{name:'4. Questions'}).click();
  await page.getByRole('button',{name:'Manual Questions'}).click();
  await page.getByRole('button', {name:'Add question',exact:true}).click();
  await page.getByLabel('Senior Domain Specialist question 1').fill('How would you approach the JD requirements?');
  await page.getByRole('button',{name:'6. Review & create'}).click();
  await page.getByRole('button', {name:'Create placement drive'}).click();
  await expect(page.getByText('Drive created (active).')).toBeVisible();
  expect(payload.agent_selection).toEqual([{track:'domain',agent_id:null}]);
  expect(payload.round_configuration).toEqual([{track:'domain',question_source:'manual',questions:['How would you approach the JD requirements?']}]);
});

test('manage drive opens the selected overview and results without evaluating eligibility', async ({ page }) => {
  await setup(page);
  let eligibilityWrites = 0;
  await page.route('**/v3/college/drives/drive-1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'POST' && path.endsWith('/eligibility')) eligibilityWrites++;
    return route.fulfill({json:path.endsWith('/overview')?{metrics:{total_assigned:17,interview_completed:3}}:{candidates:[{student_id:'s1',full_name:'Anu',roll_number:'R1',overall_score:82}],pagination:{total:1}}});
  });
  await page.getByRole('button',{name:'Manage drive',exact:true}).click();
  await expect(page).toHaveURL(/drive=drive-1/);
  await expect(page.getByText('17',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Interview results',exact:true}).click();
  await expect(page.getByText('Anu',{exact:true})).toBeVisible();
  const selectBox=await page.getByLabel('Select Anu').boundingBox();
  const photoBox=await page.getByLabel('Anu initials').boundingBox();
  expect(selectBox).not.toBeNull(); expect(photoBox).not.toBeNull();
  expect(Math.abs((selectBox!.y+selectBox!.height/2)-(photoBox!.y+photoBox!.height/2))).toBeLessThan(2);
  expect(eligibilityWrites).toBe(0);
});

test('opportunity summary shows exact company URLs with external-link controls',async({page})=>{
  await setup(page);
  await page.route('**/v3/college/drives/drive-1',route=>route.fulfill({json:{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'active',company_website:'https://jobs.example.com/careers?team=eng',company_linkedin:'https://www.linkedin.com/company/example-company/'}}));
  await page.route('**/v3/college/drives/drive-1/dashboard/overview**',route=>route.fulfill({json:{metrics:{total_assigned:0}}}));
  await page.getByRole('button',{name:'Manage drive',exact:true}).click();
  const website=page.getByRole('link',{name:'https://jobs.example.com/careers?team=eng'});
  const linkedin=page.getByRole('link',{name:'https://www.linkedin.com/company/example-company/'});
  await expect(website).toHaveAttribute('href','https://jobs.example.com/careers?team=eng');
  await expect(linkedin).toHaveAttribute('href','https://www.linkedin.com/company/example-company/');
  await expect(website.locator('svg')).toBeVisible();
  await expect(linkedin.locator('svg')).toBeVisible();
});

test('drive UI shows scan-friendly ATS and skills and saves readiness weights', async ({page}) => {
  await setup(page);
  await page.route('**/v3/college/drives/drive-1', route => route.fulfill({json:{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'active'}}));
  await page.route('**/v3/college/drives/drive-1/dashboard/**', route => {
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/ats-fit')) return route.fulfill({json:{candidates:[{student_id:'s1',full_name:'Anu',roll_number:'R1',assignment_status:'completed',ats_fit_score:82,skills:[{skill:'Python',match_status:'FULL_MATCH',evidence_text:'Built services in Python'},{skill:'LangChain',match_status:'WEAK_OR_INFERRED',evidence_text:'LangChain retrieval project'},{skill:'Kubernetes',match_status:'NO_EVIDENCE'}]}],total_count:1,pending_interview_count:2}});
    if(path.endsWith('/skill-gap')) return route.fulfill({json:{skills:[{skill:'Python',priority:'mandatory',good_count:3,limited_count:1,no_clear_answer_count:0}],total_released:4}});
    if(path.endsWith('/departments')) return route.fulfill({json:{departments:[{department_code:'CSE',student_count:4,avg_score:78,interview_ready_count:2,interview_ready_rate:50,need_training_count:2,students:[]}],recommended_department:{department_code:'CSE'}}});
    return route.fulfill({json:{metrics:{total_assigned:4}}});
  });
  await page.route('**/v3/college/drives/drive-1/candidates/s1/resume-file',route=>route.fulfill({status:200,contentType:'application/pdf',body:'%PDF-1.4\n%%EOF'}));
  let formula:Record<string,number>|undefined;
  await page.route('**/v3/college/readiness-policy', route => {
    if(route.request().method()==='PUT'){formula=route.request().postDataJSON();return route.fulfill({json:formula});}
    return route.fulfill({json:{interview_readiness:70,resume_readiness:30}});
  });
  await page.getByRole('button',{name:'Manage drive',exact:true}).click();
  await page.getByRole('button',{name:'ATS fit',exact:true}).click();
  await expect(page.getByText('82/100',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'View details'}).click();
  const candidateDialog=page.getByRole('dialog',{name:'ATS fit details for Anu'});
  await expect(candidateDialog).toBeVisible();
  await expect(candidateDialog.getByText('Full evidence (1)')).toBeVisible();
  await expect(candidateDialog.getByText('Related evidence (1)')).toBeVisible();
  await expect(candidateDialog.getByText('No evidence (1)')).toBeVisible();
  await expect(candidateDialog.getByText('LangChain',{exact:true})).toBeVisible();
  const resumeFrame=candidateDialog.getByTitle('Candidate resume PDF preview');
  await expect(resumeFrame).toHaveAttribute('src',/#toolbar=0&navpanes=0&scrollbar=1&view=FitH/);
  await expect(candidateDialog).toHaveClass(/max-w-5xl/);
  await page.getByRole('button',{name:'Close details'}).click();
  await page.getByRole('button',{name:'Skill intelligence',exact:true}).click();
  await expect(page.getByRole('button',{name:'Python',exact:true})).toBeVisible();
  await expect(page.getByRole('row',{name:/Python Mandatory 3/})).toBeVisible();
  await page.getByRole('button',{name:'Departments',exact:true}).click();
  await expect(page.getByText('Department comparison',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:/Placement drives/}).click();
  await page.getByRole('navigation',{name:'Placement sections'}).getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByLabel('Interview performance (%)').fill('80');
  await expect(page.getByLabel('Resume quality (%)')).toHaveValue('20');
  await page.getByRole('button',{name:'Save formula'}).click();
  await expect(page.getByText('Readiness formula saved for every student in this institution.')).toBeVisible();
  expect(formula).toEqual({interview_readiness:80,resume_readiness:20});
});

test('ATS Fit keeps pending candidates visible without showing scores or the removed warning',async({page})=>{
  await setup(page);
  await page.route('**/v3/college/drives/drive-1',route=>route.fulfill({json:{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'active'}}));
  await page.route('**/v3/college/drives/drive-1/dashboard/**',route=>route.fulfill({json:{candidates:[{student_id:'s1',full_name:'Pending Student',roll_number:'R1',assignment_status:'invited',ats_fit_score:null,mandatory_coverage:null,core_coverage:null,preferred_coverage:null,resume_evidence:'interview pending'}],total_count:1,pending_interview_count:1}}));
  await page.getByRole('button',{name:'Manage drive',exact:true}).click();
  await page.getByRole('button',{name:'ATS fit',exact:true}).click();
  await expect(page.getByRole('row',{name:/Pending Student R1/})).toBeVisible();
  const row=page.getByRole('row',{name:/Pending Student R1/});
  await expect(row).toContainText('Invited');
  await expect(row).toContainText('Not assessed');
  await expect(row).toContainText('Interview Pending');
  await expect(page.getByText(/ATS Fit is available only after an interview is completed|assigned candidates have not completed an interview/)).toHaveCount(0);
  let resumeFileRequested=false;
  page.on('request',request=>{if(request.url().includes('/resume-file'))resumeFileRequested=true;});
  await row.getByRole('button',{name:'View details'}).click();
  const details=page.getByRole('dialog',{name:'ATS fit details for Pending Student'});
  await expect(details).toBeVisible();
  await expect(details).toContainText('Interview pending');
  await expect(details).toContainText('Not assessed');
  await expect(details.getByText('JD requirement and resume evidence')).toHaveCount(0);
  expect(resumeFileRequested).toBe(false);
});

test('drive editor submits an offset-aware interview window in the institution timezone',async({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management?drive=drive-1&section=settings',driveRows:[{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'scheduled',location:'Chennai'}],driveDetails:{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'scheduled',location:'Chennai',window_start_at:'2027-01-10T03:30:00Z',window_end_at:'2027-01-10T04:30:00Z'}});
  let payload:Record<string,unknown>={};
  await page.route('**/v3/college/drives/drive-1',route=>{
    if(route.request().method()==='PUT'){payload=route.request().postDataJSON();return route.fulfill({json:{id:'drive-1',...payload}});}
    return route.fallback();
  });
  await page.locator('article').filter({has:page.getByRole('heading',{name:'Interview configuration'})}).getByRole('button',{name:'Modify section'}).click();
  await page.getByLabel('Interview start').fill('2027-01-10T09:00');
  await page.getByLabel('Interview end').fill('2027-01-10T10:00');
  await page.getByRole('button',{name:'Save this section'}).click();
  expect(payload.window_start).toBe('2027-01-10T03:30:00.000Z');
  expect(payload.window_end).toBe('2027-01-10T04:30:00.000Z');
});

test('AI preview uses drive role and JD and saves staff edits', async ({ page }) => {
  await setup(page,true,{initialPath:'/dashboard/placement-management'});
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await driveFields(page);
  let generation: Record<string, unknown> = {}, saved: Record<string, unknown> = {};
  const releaseGeneration:Array<()=>void>=[];
  await page.route('**/v3/college/drive-questions/preview', route => {generation=route.request().postDataJSON();return new Promise<void>(resolve=>releaseGeneration.push(()=>{void route.fulfill({json:{scripted_questions:{hr:['Motivation?'],domain:['Explain Python?'],industry:['How would you test?'],manager:['How would you lead?']}}}).then(resolve);}));});
  await page.route('**/v3/college/drives', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    saved = route.request().postDataJSON(); return route.fulfill({json:{drive_id:'new',status:'active'}});
  });
  await page.getByRole('button',{name:'4. Questions'}).click();
  await page.getByRole('button',{name:'AI Generated'}).nth(1).click();
  await page.getByRole('button',{name:'AI Generated'}).nth(2).click();
  await page.getByRole('button',{name:'Generate from job description'}).first().click();
  await expect(page.getByRole('button',{name:'Generating…'})).toHaveCount(1);
  await page.getByRole('button',{name:'Generate from job description'}).click();
  await expect(page.getByRole('button',{name:'Generating…'})).toHaveCount(2);
  releaseGeneration[0]();
  await expect(page.getByRole('button',{name:'Generating…'})).toHaveCount(1);
  releaseGeneration[1]();
  await expect(page.getByRole('button',{name:'Generating…'})).toHaveCount(0);
  await expect(page.getByLabel('Senior Domain Specialist question 1')).toHaveValue('Explain Python?');
  await expect(page.getByLabel('Senior Domain Specialist question 1')).toHaveValue('Explain Python?');
  await page.getByLabel('Senior Domain Specialist question 1').fill('How would you maintain this Python service?');
  await page.getByRole('button',{name:'6. Review & create'}).click();
  await page.getByRole('button',{name:'Create placement drive'}).click();
  await expect(page.getByText('Drive created (active).')).toBeVisible();
  expect(generation.role_title).toBe('Software Engineer');
  expect(String(generation.jd_text)).toContain('JavaScript and Python');
  expect(saved.round_configuration).toEqual(expect.arrayContaining([{track:'domain',question_source:'ai_generated',questions:['How would you maintain this Python service?']} ]));
  expect((saved.agent_selection as {track:string}[])[0].track).toBe('hr');
});
