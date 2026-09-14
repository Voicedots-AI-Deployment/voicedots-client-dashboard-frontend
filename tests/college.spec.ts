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
  let payload: Record<string, unknown> = {};
  await page.route('**/v3/college/students', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    payload = route.request().postDataJSON();
    return route.fulfill({ json: { student_id: 'student-1' } });
  });
  await page.getByRole('button', { name: 'Save student' }).click();
  await expect(page.getByText('Student added.', { exact: false })).toBeVisible();
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
