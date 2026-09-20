import { test, expect, type Page } from '@playwright/test';
async function setup(page: Page, enabled = true) {
  await page.addInitScript(() => localStorage.setItem('access_token', 'test-session'));
  await page.route(/\/v[13]\//, route => {
    const path = new URL(route.request().url()).pathname;
    const values: Record<string, unknown> = {
      '/v1/users/me': { user_id: 'client-1', name: 'College Manager', email: 'manager@example.edu' },
      '/v3/email/capabilities': { email_enabled: false },
      '/v3/college/roster-options': {batches:['2023-2027'],graduation_years:[2027,2028],statuses:['active']},
      '/v3/college/analytics': {summary:{total_students:0,placed_students:0,students_attended:0,total_attempts:0,completed_attempts:0,repeat_students:0,not_attended:0,participation_rate:0,completion_rate:0,average_duration_minutes:null},by_drive:[],by_program:[],trend:[],scope:'Placement interviews only.'},
      '/v3/college/access': { enabled, college_name: 'Example Engineering College' },
      '/v3/college/agents': {agents:[],tracks:['hr','domain','industry','manager'].map((track,i)=>({track,default_profile:{track,name:['Priya','Arjun','Neha','Vikram'][i],role:track,intro_message:'Hello {name}',personality_prompt:'Interview for {role}',tone:'professional',voice_id:'flux-priya-en'}}))},
      '/v3/college/drives': [{ id: 'drive-1', company_name: 'Example Company', role_title: 'Software Engineer', status: 'draft', location: 'Chennai' }],
      '/v3/college/students': { items: [], total: 0 },
      '/v3/college/academic-catalog': { programs: [{ code: 'B.Tech', display_name: 'Bachelor of Technology', duration_years: 4, departments: [{ code: 'CSE', display_name: 'Computer Science' },{ code: 'IT', display_name: 'Information Technology' }] }] },
    };
    return route.fulfill({ json: values[path] || {} });
  });
  await page.goto('/dashboard/college');
}
async function driveFields(page: Page) {
  await page.getByRole('button', { name: 'Create drive', exact: true }).click();
  await page.getByLabel('Company', { exact: true }).fill('Campus Employer');
  await page.getByLabel('Role', { exact: true }).fill('Software Engineer');
  await page.getByLabel('Location', { exact: true }).fill('Chennai');
  await page.getByLabel('Job description', { exact: true }).fill('Build and maintain accessible web applications using JavaScript and Python.');
  await page.getByLabel('Interview start').fill('2027-01-10T09:00');
  await page.getByLabel('Interview end').fill('2027-01-11T18:00');
  await page.locator('fieldset').filter({has:page.getByText('Eligible programs',{exact:true})}).locator('summary').click();
  await page.getByRole('checkbox',{name:'Bachelor of technology (B.Tech)'}).check();
  await page.locator('fieldset').filter({has:page.getByText('Eligible departments',{exact:true})}).locator('summary').click();
  await page.getByRole('checkbox',{name:'Computer science (CSE)'}).check();
  await page.getByRole('checkbox',{name:'Information technology (IT)'}).check();
  await page.locator('fieldset').filter({has:page.getByText('Graduation years',{exact:true})}).locator('summary').click();
  await page.getByRole('checkbox',{name:'2027',exact:true}).check();
  await page.getByRole('checkbox',{name:'2028',exact:true}).check();
}

test('unassigned client cannot see management navigation or controls', async ({ page }) => {
  await setup(page, false);
  await expect(page.getByText('Placement management is not enabled', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Placement management', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create drive', exact: true })).toHaveCount(0);
});

test('drive form uses the client API and does not supply a college identity', async ({ page }) => {
  await setup(page);
  let payload: Record<string, unknown> = {};
  await page.route('**/v3/college/drives', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    payload = route.request().postDataJSON();
    return route.fulfill({ json: { drive_id: 'new-drive', status: 'active', warnings: [] } });
  });
  await driveFields(page);
  await page.getByRole('button', { name: 'Create & evaluate drive' }).click();
  await expect(page.getByText('Drive saved (active).')).toBeVisible();
  expect(payload.eligible_departments).toEqual(['CSE', 'IT']);
  expect(payload.eligible_graduation_years).toEqual([2027, 2028]);
  expect(payload).not.toHaveProperty('college_id');
  expect(String(payload.window_start)).toMatch(/Z$/);
});

test('backend errors preserve the form instead of claiming a successful creation', async ({ page }) => {
  await setup(page);
  await page.route('**/v3/college/drives', route => route.request().method() === 'POST' ? route.fulfill({ status: 422, json: { detail: 'The interview window is invalid.' } }) : route.fallback());
  await driveFields(page);
  await page.getByRole('button', { name: 'Create & evaluate drive' }).click();
  await expect(page.getByRole('alert')).toHaveText('The interview window is invalid.');
  await expect(page.getByLabel('Company', { exact: true })).toHaveValue('Campus Employer');
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

test('drive editor handles an invalid stored date without crashing', async ({ page }) => {
  await setup(page);
  await page.route('**/v3/college/drives/drive-1', route => route.fulfill({json:{
    id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'draft',
    window_start_at:'invalid',window_end_at:'2027-01-11T12:30:00Z',
  }}));
  await page.getByRole('button',{name:'Edit drive',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Interview start')).toHaveValue('');
  await expect(page.getByLabel('Company',{exact:true})).toHaveValue('Example Company');
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
  await driveFields(page);
  const rounds = page.getByRole('group', {name:'Select interview agents / rounds'});
  await rounds.getByRole('button', {name:'Remove',exact:true}).nth(3).click();
  await rounds.getByRole('button', {name:'Remove',exact:true}).nth(2).click();
  await rounds.getByRole('button', {name:'Remove',exact:true}).nth(0).click();
  await page.getByLabel('Question source').selectOption('manual');
  await page.getByRole('button', {name:'Add question',exact:true}).click();
  await page.getByLabel('Arjun question 1').fill('How would you approach the JD requirements?');
  await page.getByRole('button', {name:'Create & evaluate drive'}).click();
  await expect(page.getByText('Drive saved (active).')).toBeVisible();
  expect(payload.agent_selection).toEqual([{track:'domain',agent_id:null}]);
  expect(payload.question_source).toBe('manual');
  expect(payload.scripted_questions).toEqual({domain:['How would you approach the JD requirements?']});
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
  expect(eligibilityWrites).toBe(0);
});

test('drive UI shows scan-friendly ATS and skills and saves readiness weights', async ({page}) => {
  await setup(page);
  await page.route('**/v3/college/drives/drive-1', route => route.fulfill({json:{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'active'}}));
  await page.route('**/v3/college/drives/drive-1/dashboard/**', route => {
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/ats-fit')) return route.fulfill({json:{candidates:[{student_id:'s1',full_name:'Anu',roll_number:'R1',ats_fit_score:82}],pagination:{total:1}}});
    if(path.endsWith('/skill-gap')) return route.fulfill({json:{skills:[{skill:'Python',priority:'mandatory',good_count:3,limited_count:1,no_clear_answer_count:0}],total_released:4}});
    return route.fulfill({json:{metrics:{total_assigned:4}}});
  });
  let formula:Record<string,number>|undefined;
  await page.route('**/v3/college/readiness-policy', route => {
    if(route.request().method()==='PUT'){formula=route.request().postDataJSON();return route.fulfill({json:formula});}
    return route.fulfill({json:{interview_readiness:70,resume_readiness:30}});
  });
  await page.getByRole('button',{name:'Manage drive',exact:true}).click();
  await page.getByRole('button',{name:'ATS fit',exact:true}).click();
  await expect(page.getByText('82/100',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Skill intelligence',exact:true}).click();
  await expect(page.getByLabel('Python evidence summary')).toContainText('Good · 3');
  await page.getByRole('button',{name:'Drive settings',exact:true}).click();
  await page.getByLabel('Interview performance (%)').fill('80');
  await expect(page.getByLabel('Resume quality (%)')).toHaveValue('20');
  await page.getByRole('button',{name:'Save formula'}).click();
  await expect(page.getByText('Readiness formula saved for every student in this institution.')).toBeVisible();
  expect(formula).toEqual({interview_readiness:80,resume_readiness:20});
});

test('AI preview uses drive role and JD and saves staff edits', async ({ page }) => {
  await setup(page);
  await driveFields(page);
  let generation: Record<string, unknown> = {}, saved: Record<string, unknown> = {};
  await page.route('**/v3/college/drive-questions/preview', route => {
    generation = route.request().postDataJSON();
    return route.fulfill({json:{scripted_questions:{hr:['Motivation?'],domain:['Explain Python?'],industry:['How would you test?'],manager:['How would you lead?']}}});
  });
  await page.route('**/v3/college/drives', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    saved = route.request().postDataJSON(); return route.fulfill({json:{drive_id:'new',status:'active'}});
  });
  await page.getByLabel('Question source').selectOption('ai_generated');
  await page.getByRole('button',{name:'Generate questions from role + JD'}).click();
  await expect(page.getByLabel('Arjun question 1')).toHaveValue('Explain Python?');
  await page.getByLabel('Arjun question 1').fill('How would you maintain this Python service?');
  await page.getByRole('button',{name:'Move round 2 up'}).click();
  await page.getByRole('button',{name:'Create & evaluate drive'}).click();
  await expect(page.getByText('Drive saved (active).')).toBeVisible();
  expect(generation.role_title).toBe('Software Engineer');
  expect(String(generation.jd_text)).toContain('JavaScript and Python');
  expect(saved.question_source).toBe('ai_generated');
  expect((saved.scripted_questions as Record<string,string[]>).domain).toEqual(['How would you maintain this Python service?']);
  expect((saved.agent_selection as {track:string}[])[0].track).toBe('domain');
});
