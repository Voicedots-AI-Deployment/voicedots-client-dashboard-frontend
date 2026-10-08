import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
async function setup(page: Page, enabled = true, options: { notFound?: string[]; driveRows?: unknown[]; driveDetails?: unknown; companyProfiles?: unknown[]; academicCatalog?: unknown; initialPath?: string; portalRole?: string } = {}) {
  await page.addInitScript(() => localStorage.setItem('access_token', 'test-session'));
  await page.route(/\/v[13]\//, route => {
    const path = new URL(route.request().url()).pathname;
    const values: Record<string, unknown> = {
      '/v1/users/me': { user_id: 'client-1', name: 'College Manager', email: 'manager@example.edu', ...(options.portalRole ? { portal_role: options.portalRole } : {}) },
      '/v3/college/staff': { staff: [] },
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
      '/v3/college/academic-catalog': options.academicCatalog ?? { programs: [{ code: 'B.Tech', display_name: 'Bachelor of Technology', duration_years: 4, departments: [{ code: 'CSE', display_name: 'Computer Science' },{ code: 'IT', display_name: 'Information Technology' }] }], graduation_years:[2027,2028] },
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

test('placement staff is routed into the placement-only portal', async ({ page }) => {
  await setup(page, true, { portalRole: 'placement_staff', initialPath: '/dashboard/leads' });
  await expect(page).toHaveURL(/\/dashboard\/placement-management/);
  await expect(page.getByRole('heading', { name: 'Placement management' })).toBeVisible();
  await expect(page.locator('aside').getByRole('button', { name: 'Placement drives', exact: true })).toBeVisible();
  await expect(page.locator('aside').getByRole('button', { name: 'Candidates', exact: true })).toBeVisible();
  await expect(page.locator('aside').getByRole('button', { name: 'Analytics & reports', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Leads', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Staff roster', exact: true })).toHaveCount(0);
});

test('placement staff Candidates section lists all students returned by assigned-group roster scope', async ({ page }) => {
  await setup(page, true, { portalRole: 'placement_staff', initialPath: '/dashboard/placement-management' });
  let rosterUrl = '';
  await page.route(/\/v3\/college\/students(?:\?.*)?$/, route => {
    rosterUrl = route.request().url();
    return route.fulfill({ json: { items: [{ id: 'student-1', full_name: 'Scoped Student', roll_number: 'ME-2027-01', email: 'student@example.edu', program: 'B.Tech', department_code: 'MECH', department_display_name: 'Mechanical Engineering', batch_label: '2023-2027', graduation_year: 2027, cgpa: 8.1, status: 'active' }], assigned_groups: [{ program: 'B.Tech', department_code: 'MECH', batch_label: '2023-2027', graduation_year: 2027 }], total: 1, limit: 25, offset: 0 } });
  });
  await page.locator('aside').getByRole('button', { name: 'Candidates', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Candidates', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Your assigned student groups' })).toContainText('B.Tech · MECH · 2023-2027 · Class of 2027');
  await expect(page.getByText('Scoped Student')).toBeVisible();
  await expect(page.getByText('ME-2027-01 · student@example.edu')).toBeVisible();
  await expect(page.getByText(/1 student in your assigned groups/)).toBeVisible();
  expect(new URL(rosterUrl).pathname).toBe('/v3/college/students');
});

test('Institution Management separates staff invitations from access configuration', async ({ page }) => {
  await setup(page, true, { initialPath: '/dashboard/attendance' });
  let invitation: Record<string, unknown> = {};
  await page.route('**/v3/college/staff', async route => {
    if (route.request().method() === 'POST') { invitation = route.request().postDataJSON(); return route.fulfill({ status: 201, json: { user_id: 'staff-1', status: 'invited', email_queued: true } }); }
    return route.fulfill({ json: { staff: [], options: { programs: [], graduation_years: [], batches: [] } } });
  });
  await expect(page.getByRole('heading', { name: 'Institution Management' })).toBeVisible();
  const tabs = page.getByRole('navigation', { name: 'Attendance sections' });
  await expect(tabs.getByRole('button').nth(0)).toHaveText('Student Roster');
  await expect(tabs.getByRole('button').nth(1)).toHaveText('Staff Roster');
  await expect(tabs.getByRole('button').nth(2)).toHaveText('Access Control');
  await tabs.getByRole('button', { name: 'Staff Roster' }).click();
  await page.getByLabel('Full name').fill('Anita Coordinator');
  await page.getByLabel('Work email').fill('anita@example.edu');
  await page.getByRole('button', { name: 'Invite staff' }).click();
  await expect(page.getByRole('status')).toContainText('Invitation sent');
  expect(invitation).toEqual({ full_name: 'Anita Coordinator', email: 'anita@example.edu', scope_groups: [] });
});

test('Access Control uses academic catalogs and restricts departments to selected programs', async ({ page }) => {
  await setup(page, true, { initialPath: '/dashboard/attendance' });
  let saved: Record<string, unknown> = {};
  await page.route('**/v3/college/staff**', route => {
    if (route.request().method() === 'PUT') { saved = route.request().postDataJSON(); return route.fulfill({ json: { updated: true } }); }
    return route.fulfill({ json: { staff: [{ user_id: 'staff-1', name: 'Anita', email: 'anita@example.edu', status: 'active', scope_groups: [] }], options: { programs: [], graduation_years: [], batches: [], student_groups: [] } } });
  });
  const tabs = page.getByRole('navigation', { name: 'Attendance sections' });
  await tabs.getByRole('button', { name: 'Access Control' }).click();
  await page.getByRole('button', { name: 'Manage access' }).click();
  await expect(page.getByText('Any program', { exact: true })).toBeVisible();
  await page.getByText('Any program', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Bachelor of Technology' }).check();
  await page.getByText('Any department', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Computer Science' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Information Technology' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Computer Science' }).check();
  await page.getByText('Any batch', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: '2023-2027' })).toBeVisible();
  await page.getByRole('checkbox', { name: '2023-2027' }).check();
  await page.getByText('Any year', { exact: true }).click();
  await page.getByRole('checkbox', { name: '2027', exact: true }).check();
  await page.getByRole('button', { name: 'Save Access' }).click();
  await expect(page.getByRole('status')).toContainText('Student access updated');
  expect(saved.scope_groups).toEqual([{ program: 'B.Tech', department_code: 'CSE', batch_label: '2023-2027', graduation_year: 2027 }]);
});

test('restoring a previously revoked staff account reports the renewed invitation', async ({ page }) => {
  await setup(page, true, { initialPath: '/dashboard/attendance' });
  await page.route('**/v3/college/staff', route => {
    if (route.request().method() === 'POST') return route.fulfill({ status: 201, json: { user_id: 'staff-1', status: 'invited', email_queued: true, restored: true } });
    return route.fulfill({ json: { staff: [], options: { programs: [{ code: 'B.Tech', display_name: 'Bachelor of Technology', duration_years: 4, departments: [] }], graduation_years: [], batches: [] } } });
  });
  await page.getByRole('navigation', { name: 'Attendance sections' }).getByRole('button', { name: 'Staff Roster' }).click();
  await page.getByLabel('Full name').fill('Former coordinator');
  await page.getByLabel('Work email').fill('former@example.edu');
  await page.getByRole('button', { name: 'Invite staff' }).click();
  await expect(page.getByRole('status')).toContainText('Previous placement access restored');
});

test('Staff roster selectors use the academic and roster catalogs when staff options are empty', async ({ page }) => {
  await setup(page, true, { initialPath: '/dashboard/attendance' });
  await page.route('**/v3/college/staff', route => route.fulfill({ json: {
    staff: [{ user_id: 's1', name: 'Staff', email: 'staff@example.edu', status: 'active', scope_groups: [] }], options: { programs: [], graduation_years: [], batches: [] },
  } }));
  await page.getByRole('navigation', { name: 'Attendance sections' }).getByRole('button', { name: 'Access Control' }).click();
  await page.getByRole('button', { name: 'Manage access' }).click();
  await expect(page.getByText('Any department', { exact: true })).toHaveCount(0);
  await page.getByText('Any program', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Bachelor of Technology' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Bachelor of Technology' }).check();
  await page.getByText('Any department', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Computer Science' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Information Technology' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Computer Science' }).check();
  await page.getByRole('group', { name: 'Program' }).locator('summary').click();
  await page.getByRole('checkbox', { name: 'Bachelor of Technology' }).uncheck();
  await expect(page.getByText('Any department', { exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Bachelor of Technology' }).check();
  await page.getByText('Any department', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Computer Science' })).not.toBeChecked();
  await page.getByText('Any batch', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: '2023-2027' })).toBeVisible();
  await page.getByText('Any year', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: '2027', exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '2028', exact: true })).toBeVisible();
});

test('Staff roster refresh forces a new request and updates the visible list', async ({ page }) => {
  await setup(page, true, { initialPath: '/dashboard/attendance' });
  let requests = 0;
  await page.route(/staff/, route => {
    requests += 1;
    const name = requests <= 2 ? 'First staff member' : 'Updated staff member';
    return route.fulfill({ json: { staff: [{ user_id: 'staff-1', name, email: 'staff@example.edu', status: 'active', scope_groups: [{ program: 'B.Tech' }] }], options: { programs: [], graduation_years: [], batches: [] } } });
  });
  await page.getByRole('navigation', { name: 'Attendance sections' }).getByRole('button', { name: 'Staff Roster' }).click();
  await expect(page.getByText('First staff member')).toBeVisible();
  await page.getByRole('button', { name: 'Refresh staff roster' }).click();
  await expect(page.getByText('Updated staff member')).toBeVisible();
  expect(requests).toBeGreaterThanOrEqual(2);
});

test('Staff roster downloads its spreadsheet template and imports staff with result details', async ({ page }) => {
  await setup(page, true, { initialPath: '/dashboard/attendance' });
  await page.getByRole('navigation', { name: 'Attendance sections' }).getByRole('button', { name: 'Staff Roster' }).click();
  await page.getByText('Import staff from CSV or Excel').click();

  await page.route('**/v3/college/staff/template?format=csv', route => route.fulfill({
    status: 200,
    contentType: 'text/csv',
    headers: { 'content-disposition': 'attachment; filename="staff-import-template.csv"' },
    body: 'full_name,email,program,department_code,batch_label,graduation_year\n',
  }));
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV template' }).click();
  expect((await download).suggestedFilename()).toBe('staff-import-template.csv');

  await page.route('**/v3/college/staff/upload', route => route.fulfill({ json: {
    staff_invited: 1, emails_queued: 1, errors_count: 0,
    invited: [{ name: 'Alex Morgan', email: 'alex@example.edu' }], errors: [],
  } }));
  await page.getByLabel('Staff import file').setInputFiles({
    name: 'staff.csv', mimeType: 'text/csv',
    buffer: Buffer.from('full_name,email,program,department_code,batch_label,graduation_year\nAlex Morgan,alex@example.edu,BTECH,CSE,2022-2026,2026\n'),
  });
  await page.getByRole('button', { name: 'Import staff' }).click();
  await expect(page.getByText('1 staff invited · 1 setup emails queued · 0 errors')).toBeVisible();
  await expect(page.getByText('Invited Alex Morgan (alex@example.edu)')).toBeVisible();
});

test('Removing placement staff revokes access and removes them from the roster', async ({ page }) => {
  await setup(page, true, { initialPath: '/dashboard/attendance' });
  let present = true;
  await page.route(/staff/, route => {
    if (route.request().method() === 'DELETE') {
      present = false;
      return route.fulfill({ json: { status: 'disabled' } });
    }
    return route.fulfill({ json: {
      staff: present ? [{ user_id: 'staff-1', name: 'Former staff member', email: 'former@example.edu', status: 'active', scope_groups: [{ program: 'B.Tech' }] }] : [],
      options: { programs: [], graduation_years: [], batches: [] },
    } });
  });
  await page.getByRole('navigation', { name: 'Attendance sections' }).getByRole('button', { name: 'Staff Roster' }).click();
  await expect(page.getByText('Former staff member')).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Remove staff' }).click();
  await expect(page.getByText(/was removed from the placement staff roster/)).toBeVisible();
  await expect(page.getByText('Former staff member', { exact: true })).toHaveCount(0);
});

test('closed drive can be activated through a confirmation and saves the active status', async ({ page }) => {
  await setup(page, true, {
    initialPath: '/dashboard/placement-management?drive=drive-1',
    driveRows: [{ id: 'drive-1', company_name: 'Example Company', role_title: 'Software Engineer', status: 'closed', max_attempts: 3 }],
    driveDetails: { id: 'drive-1', company_name: 'Example Company', role_title: 'Software Engineer', status: 'closed', max_attempts: 3 },
  });
  let savedStatus = '';
  await page.route('**/v3/college/drives/drive-1', async route => {
    if (route.request().method() !== 'PUT') return route.fallback();
    savedStatus = route.request().postDataJSON().status;
    return route.fulfill({ json: { status: 'updated', warnings: [] } });
  });
  await expect(page.getByRole('button', { name: 'Activate drive' }).first()).toBeVisible({timeout:15000});
  await page.getByRole('button', { name: 'Activate drive' }).first().click();
  await expect(page.getByRole('alertdialog')).toContainText('Activate this drive?');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Activate drive' }).click();
  await expect(page.getByText(/Drive activated/)).toBeVisible();
  expect(savedStatus).toBe('active');
});

test('placement staff manage drive questions and validate a CSV before import', async ({ page }) => {
  await setup(page, true, { initialPath: '/dashboard/placement-management?drive=drive-1&section=questions',
    driveRows: [{id:'drive-1',company_name:'Example Company',role_title:'Software Engineer',status:'active'}],
    driveDetails: {id:'drive-1',company_name:'Example Company',role_title:'Software Engineer',status:'active'} });
  let saved: Record<string, unknown> = {}, previewSeen = false, imported = false;
  await page.route('**/v3/college/drives/drive-1/previous-interview-questions', route => route.fulfill({json:{company_name:'Example Company',role_name:'Software Engineer',count:0,questions:[]}}));
  await page.route('**/v3/college/previous-interview-questions', async route => { saved=route.request().postDataJSON(); return route.fulfill({json:{id:'q1',...saved,verified:true,report_count:1}}); });
  await page.getByRole('button',{name:'Add question',exact:true}).click();
  const addDialog=page.getByRole('dialog',{name:'Add previous interview question'});
  await addDialog.getByLabel('Question').fill('How would you design a reliable API?');
  await addDialog.getByLabel('Internal source/reference').fill('Placement panel notes');
  await addDialog.getByRole('button',{name:'Add question',exact:true}).click();
  await expect(page.getByText('Question added.')).toBeVisible();
  expect(saved.drive_id).toBe('drive-1');
  await page.getByRole('button',{name:'Import CSV / Excel'}).click();
  await page.getByRole('button',{name:'Download template'}).click();
  await page.route('**/v3/college/previous-interview-questions/import**', async route => {
    if(new URL(route.request().url()).searchParams.get('preview_only')==='true') { previewSeen=true; return route.fulfill({json:{preview:[{question_text:'Explain API versioning',round_type:'Technical',canonical_skill:'REST',difficulty:'Intermediate'}],invalid_rows:[]}}); }
    imported=true; return route.fulfill({json:{imported:1,duplicates_merged:0,invalid:0,questions:[]}});
  });
  await page.locator('input[type=file]').setInputFiles({name:'questions.csv',mimeType:'text/csv',buffer:Buffer.from('question_text,round_type,canonical_skill,difficulty,year,interview_date\n"Explain API versioning",Technical,REST,Intermediate,2026,\n')});
  await expect(page.getByText('Validated preview: 1 questions. No rows are saved until you confirm.')).toBeVisible();
  expect(previewSeen).toBe(true);
  await page.getByRole('button',{name:'Confirm import'}).click();
  await expect(page.getByText('Imported: 1 · Duplicates merged: 0 · Invalid: 0')).toBeVisible();
  expect(imported).toBe(true);
});

test('active drive closes through the persisted lifecycle API and remains closed after refresh', async ({ page }) => {
  let currentStatus = 'active';
  await setup(page, true, {
    initialPath: '/dashboard/placement-management?drive=drive-1',
    driveRows: [{ id: 'drive-1', company_name: 'Example Company', role_title: 'Software Engineer', status: 'active', max_attempts: 3 }],
    driveDetails: { id: 'drive-1', company_name: 'Example Company', role_title: 'Software Engineer', status: 'active', max_attempts: 3 },
  });
  let savedStatus = '';
  await page.route('**/v3/college/drives/drive-1', async route => {
    if (route.request().method() === 'PUT') {
      savedStatus = route.request().postDataJSON().status;
      currentStatus = savedStatus;
      return route.fulfill({ json: { status: 'updated', warnings: [] } });
    }
    return route.fulfill({ json: { id: 'drive-1', company_name: 'Example Company', role_title: 'Software Engineer', status: currentStatus, max_attempts: 3 } });
  });
  await expect(page.getByRole('button', { name: 'Close drive' }).first()).toBeVisible({timeout:15000});
  await page.getByRole('button', { name: 'Close drive' }).first().click();
  await expect(page.getByRole('alertdialog')).toContainText('Candidates will no longer be able to start an interview');
  await page.getByRole('alertdialog').getByRole('button', { name: /Confirm close/ }).click();
  await expect(page.getByText('Drive closed.')).toBeVisible();
  expect(savedStatus).toBe('closed');
  await expect(page.getByRole('button', { name: 'Activate drive' }).first()).toBeVisible({timeout:15000});
});

test('drive card reports eligibility and assigned progress without the misleading document-readiness metric', async ({ page }) => {
  await setup(page, true, {
    driveRows: [{ id: 'drive-1', company_name: 'VoiceDot', role_title: 'Software Engineer', status: 'closed', window_start_at: '2026-01-01T00:00:00Z', window_end_at: '2027-01-01T00:00:00Z', latest_snapshot_eligible_count: 2, eligible_with_photo_and_resume_count: 1, assignment_count: 0, created_by_source: 'placement_staff', created_by_full_name: 'Anita Coordinator' }],
  });
  const card = page.getByRole('article').filter({ hasText: 'VoiceDot' });
  await expect(card.getByText('Met drive criteria at last evaluation')).toBeVisible();
  await expect(card.getByText('2 students')).toBeVisible();
  await expect(card.getByText('With photo and readable resume')).toHaveCount(0);
  await expect(card.getByText('No students assigned yet.')).toBeVisible();
  await expect(card.getByText('Closed', { exact: true })).toBeVisible();
  await expect(card.getByText('Staff-created')).toBeVisible();
  await expect(card.getByText('Created by Anita Coordinator')).toBeVisible();
});

test('candidate list shows the current attempt and configured attempt limit', async ({ page }) => {
  await setup(page, true, {
    initialPath: '/dashboard/placement-management?drive=drive-1&section=candidates',
    driveRows: [{ id: 'drive-1', company_name: 'Example Company', role_title: 'Software Engineer', status: 'active', max_attempts: 3 }],
    driveDetails: { id: 'drive-1', company_name: 'Example Company', role_title: 'Software Engineer', status: 'active', max_attempts: 3 },
  });
  await page.route('**/v3/college/drives/drive-1/dashboard/ranking?*', route => route.fulfill({ json: {
    candidates: [{ student_id: 'student-1', full_name: 'Asha Kumar', roll_number: 'CS2026001', assignment_status: 'in_progress', attempt_number: 2, max_attempts: 3 }],
    total_count: 1,
    pagination: { total: 1 },
  } }));
  await page.reload();
  await expect(page.getByText('Attempt 2 of 3 · in progress')).toBeVisible();
});

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
  await page.getByRole('button',{name:'2. Interview setup'}).click();
  await page.getByRole('button',{name:'Add score rule'}).click();
  await page.getByLabel('Rule 1 requires AI Coach').check();
  await page.getByRole('button',{name:'Add score rule'}).click();
  await page.getByLabel('Rule 2 minimum score').fill('0');
  await page.getByLabel('Rule 2 maximum score').fill('78.99');
  await page.getByLabel('Rule 2 maximum attempts').fill('1');
  await expect(page.getByLabel('Rule 1 minimum score')).toHaveValue('79');
  await expect(page.getByLabel('Rule 1 maximum score')).toHaveValue('100');
  await page.getByRole('button',{name:'6. Review & create'}).click();
  await page.getByRole('button', {name:'Create placement drive'}).click();
  await expect(page.getByText('Drive created (active).')).toBeVisible();
  expect(payload.score_attempt_rules).toEqual([
    {min_score:79,max_score:100,max_attempts:2,require_coach:true},
    {min_score:0,max_score:78.99,max_attempts:1,require_coach:false},
  ]);
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
  await page.getByLabel(/Add an interview role/).selectOption('custom-problem');
  await expect(page.getByRole('heading',{name:'Problem Solving Specialist'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Talent Acquisition Specialist'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Problem Solving Specialist'})).toBeVisible();
  await page.getByRole('button',{name:'Remove Talent Acquisition Specialist'}).click();
  await page.getByRole('button',{name:'Remove Problem Solving Specialist'}).click();
  await expect(page.getByRole('button',{name:/Talent Acquisition Specialist Add this interview role/})).toBeVisible();
  await page.getByLabel(/Add an interview role/).selectOption('custom-problem');
  await page.getByLabel(/Add an interview role/).selectOption('default:domain');
  await expect(page.getByLabel(/Add an interview role/).locator('option')).toHaveCount(5);
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
  await page.reload();
  await expect(page.getByRole('heading',{name:'Asha Rao'})).toBeVisible();
  await expect(page.getByText('Interview completed',{exact:true})).toBeVisible();
  await expect(page.getByText('Result hidden',{exact:true})).toBeVisible();
  await expect(page.getByRole('tablist',{name:'Candidate report sections'}).getByRole('tab')).toHaveCount(5);
  await page.getByRole('tablist',{name:'Candidate report sections'}).getByRole('tab',{name:/AI Proctor/}).click();
  await expect(page.getByRole('rowheader',{name:'Tab Hidden',exact:true})).toBeVisible();
  await expect(page.locator('#integrity img')).toHaveCount(0);
  await page.getByRole('tablist',{name:'Candidate report sections'}).getByRole('tab',{name:/Answers/}).click();
  await expect(page.getByText('Explain your project.')).toBeVisible();
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
  await expect(page.getByText(/Saved 25\/09\/2026, 15:31 IST/)).toBeVisible();
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
  await setup(page, true, { initialPath: '/dashboard/attendance' });
  await page.getByRole('button', { name: 'Student Roster', exact: true }).click();
  await page.getByRole('button', { name: 'Add student', exact: true }).click();
  await page.getByLabel('Full name').fill('Example Student');
  await page.getByLabel('Roll number').fill('CSE-2027-001');
  await page.locator('input[name=email]').fill('student@example.edu');
  await page.locator('input[type=tel]').fill('9876543210');
  await page.locator('input[name=cgpa]').fill('8.2');
  await page.getByLabel('Upload photo').setInputFiles({ name: 'student.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('reference-photo') });
  await page.getByLabel(/Department */).selectOption('CSE');
  let payload: Record<string, unknown> = {};
  await page.route('**/v3/college/students', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    payload = route.request().postDataJSON();
    return route.fulfill({ json: { student_id: 'student-1', welcome_email_status: 'queued' } });
  });
  await page.getByRole('button', { name: 'Save student' }).click();
  await expect(page.getByText('The welcome and password setup email was accepted by the delivery queue', { exact: false })).toBeVisible();
  await expect(page.getByText(/single-use setup link remains available until it is used or replaced/i)).toBeVisible();
  await expect(page.getByText(/24 hours/i)).toHaveCount(0);
  expect(payload.password).toBeUndefined();
  expect(payload.confirm_password).toBeUndefined();
  expect(payload.photo).toMatch(/^data:image\/jpeg;base64,/);
  expect(payload.program).toBe('B.Tech');
  expect(payload.department_code).toBe('CSE');
  await page.getByRole('button', { name: 'Academic setup', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add program', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/college-management-mobile.png', fullPage: true });
});

test('student email and roll number become read-only after password setup', async ({ page }) => {
  await setup(page, true, { initialPath: '/dashboard/attendance' });
  await page.route(/\/v3\/college\/students(?:\?.*)?$/, route => route.request().method() === 'GET'
    ? route.fulfill({ json: { total: 1, items: [{ id: 'locked-student', full_name: 'Asha Rao', email: 'asha@example.edu', roll_number: 'CS01', program: 'B.Tech', department_code: 'CSE', graduation_year: 2027, cgpa: 8.4, status: 'active', identity_locked: true }] } })
    : route.fallback());
  await page.getByRole('button', { name: 'Student Roster', exact: true }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Email')).toHaveAttribute('readonly', '');
  await expect(page.getByLabel('Student ID / Roll number')).toHaveAttribute('readonly', '');
  await expect(page.getByText('Locked after the student completed password setup.')).toHaveCount(2);
});

test('Student Analysis shows full drive participation, interview performance and report release state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, true, { initialPath: '/dashboard/attendance' });
  await page.route(/\/v3\/college\/students(?:\?.*)?$/, route => route.request().method() === 'GET'
    ? route.fulfill({ json: { total: 1, items: [{ id: 'student-1', full_name: 'Asha Rao', email: 'asha@example.edu', roll_number: 'CS01', program: 'B.Tech', department_code: 'CSE', graduation_year: 2027, cgpa: 8.4, status: 'active' }] } })
    : route.fallback());
  await page.route('**/v3/college/students/student-1/reports', route => route.fulfill({ json: {
    student: { full_name: 'Asha Rao', roll_number: 'CS01' },
    drives: [
      { assignment_id: 'a1', drive_id: 'd1', company_name: 'Northstar', role_title: 'Data Scientist', assignment_status: 'completed', evaluation_status: 'released', released_to_student_at: '2026-09-20T10:00:00Z', completed_at: '2026-09-20T09:00:00Z', preparation_status: 'ready' },
      { assignment_id: 'a2', drive_id: 'd2', company_name: 'Orbit', role_title: 'Software Engineer', assignment_status: 'invited', evaluation_status: null, preparation_status: 'not_started' },
    ],
    reports: [{ source: 'drive', label: 'Northstar — Data Scientist', assignment_id: 'a1', drive_id: 'd1', session_id: 's1', completed_at: '2026-09-20T09:00:00Z', overall_score: 86, readiness: 'Interview Ready', detail: { agent_breakdown: [{ agent_type: 'hr', status: 'complete', sub_score: 72, readiness: 'Approaching Ready', dimensions: [{ dimension: 'communication', band: 3 }] }, { agent_type: 'domain', status: 'not_reached', sub_score: null, readiness: null, dimensions: [] }], question_reviews: [{ question: 'How did you evaluate the model?', answer: 'Used stratified cross-validation.' }], placement_readiness: { score: 82 } } }],
  } }));
  await page.getByRole('button', { name: 'Student Roster', exact: true }).click();
  await page.getByRole('button', { name: 'Analysis' }).click();
  const dialog = page.getByRole('dialog', { name: 'Student Analysis' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Drive participations')).toBeVisible();
  await expect(dialog.getByText('Interviews taken')).toBeVisible();
  await expect(dialog.getByText('Reports released')).toBeVisible();
  await expect(dialog.getByText('Northstar · Data Scientist')).toBeVisible();
  await expect(dialog.getByText('Orbit · Software Engineer')).toBeVisible();
  await expect(dialog.getByText('Invited')).toBeVisible();
  await dialog.getByText('Northstar — Data Scientist').click();
  await expect(dialog.getByText('Talent Acquisition Specialist')).toBeVisible();
  await expect(dialog.getByText('72 / 100')).toBeVisible();
  await expect(dialog.getByText('Communication')).toBeVisible();
  await expect(dialog.getByText('Band 3 / 4')).toBeVisible();
  await expect(dialog.getByText('Not Reached', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Assessment —')).toHaveCount(0);
  await expect(dialog.getByText('Used stratified cross-validation.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('student roster reports when the welcome and password setup email was not queued', async ({ page }) => {
  await setup(page, true, { initialPath: '/dashboard/attendance' });
  await page.getByRole('button', { name: 'Student Roster', exact: true }).click();
  await page.getByRole('button', { name: 'Add student', exact: true }).click();
  await page.getByLabel('Full name').fill('Example Student');
  await page.getByLabel('Roll number').fill('CSE-2027-002');
  await page.locator('input[name=email]').fill('student-setup@example.edu');
  await page.locator('input[type=tel]').fill('9876543210');
  await page.locator('input[name=cgpa]').fill('8.2');
  await page.getByLabel('Upload photo').setInputFiles({ name: 'student.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('reference-photo') });
  await page.getByLabel(/Department */).selectOption('CSE');
  await page.route('**/v3/college/students', route => route.request().method() === 'POST'
    ? route.fulfill({ json: { student_id: 'student-2', welcome_email_status: 'not_queued' } })
    : route.fallback());
  await page.getByRole('button', { name: 'Save student' }).click();
  await expect(page.getByRole('alert')).toContainText('email was not queued');
  await expect(page.getByRole('alert')).toContainText('request a fresh link from student sign-in');
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
 await setup(page,true,{initialPath:'/dashboard/attendance'});
 await page.getByRole('button',{name:'Student Roster',exact:true}).click();
 const response=page.waitForRequest(r=>{const url=new URL(r.url());return url.pathname.endsWith('/v3/college/students')&&url.searchParams.get('program')==='B.Tech'});
 await page.getByRole('combobox',{name:'Filter by program'}).selectOption('B.Tech');
 await response;
 const batchRequest=page.waitForRequest(r=>new URL(r.url()).searchParams.get('batch_label')==='2023-2027');
 await page.getByRole('combobox',{name:'Filter by batch',exact:true}).selectOption('2023-2027');
 await batchRequest;
 await page.getByRole('button',{name:'Clear filters'}).click();
 await expect(page.getByRole('combobox',{name:'Filter by program'})).toHaveValue('');
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
 await setup(page,true,{initialPath:'/dashboard/attendance'});await page.route('**/v3/college/students/upload',async route=>{expect(route.request().headers()['content-type']).toContain('multipart/form-data; boundary=');expect(route.request().postDataBuffer()?.toString()).toContain('roster.csv');return route.fulfill({json:{records_created:2,records_updated:1,records_processed:3,errors_count:1,errors_sample:['Students row 5: Email is required'],warnings_count:0,warnings_sample:[]}})});
 await page.route('**/v3/college/students/template?format=csv',route=>route.fulfill({contentType:'text/csv',body:'roll_number,full_name,email\r\n'}));
 await page.getByRole('button',{name:'Student Roster',exact:true}).click();await page.getByText('Import students from CSV or Excel',{exact:true}).click();const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download CSV template'}).click();expect((await downloaded).suggestedFilename()).toBe('student-import-template.csv');await page.getByLabel('Student import file').setInputFiles({name:'roster.csv',mimeType:'text/csv',buffer:Buffer.from('roll_number,full_name,email\n001,Asha,asha@example.com')});await page.getByRole('button',{name:'Import students',exact:true}).click();await expect(page.getByText('2 created · 1 updated · 1 errors · 0 warnings')).toBeVisible();await expect(page.getByText('Students row 5: Email is required')).toBeVisible();
});

for (const existing of [true, false]) {
 test(`existing student photo can be ${existing ? 'viewed and replaced' : 'added'} from the roster editor`, async ({page}) => {
  await setup(page,true,{initialPath:'/dashboard/attendance'});
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
  await page.getByRole('button',{name:'Student Roster',exact:true}).click();
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
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
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
  expect(saved.role).toBe('Product interviewer'); expect(saved.intro_message).toContain('{company}');
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
  await expect(page.getByLabel('17 assigned candidates')).toBeVisible();
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

test('drive UI shows scan-friendly ATS and skills and saves readiness and proctor stop policies', async ({page}) => {
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
  let proctorPolicy:Record<string,unknown>|undefined;
  await page.route('**/v3/college/readiness-policy', route => {
    if(route.request().method()==='PUT'){formula=route.request().postDataJSON();return route.fulfill({json:formula});}
    return route.fulfill({json:{interview_readiness:70,resume_readiness:30}});
  });
  await page.route('**/v3/college/interview-results-settings', route => {
    if(route.request().method()==='PUT'){proctorPolicy=route.request().postDataJSON();return route.fulfill({json:proctorPolicy});}
    return route.fulfill({json:{}});
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
  await page.getByLabel('End after recorded AI-proctor warnings').selectOption('3');
  await page.getByLabel('End if multiple people are detected').check();
  await page.getByRole('button',{name:'Save settings'}).click();
  await expect(page.getByText('Interview Results settings saved.')).toBeVisible();
  expect(proctorPolicy).toMatchObject({proctor_auto_end_warning_threshold:3,proctor_auto_end_on_multiple_people:true});
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

test('candidate resume match opens from keyboard focus with only ATS evidence and stays separate from interview status',async({page})=>{
  await setup(page);
  await page.route('**/v3/college/drives/drive-1',route=>route.fulfill({json:{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'active'}}));
  await page.route('**/v3/college/drives/drive-1/dashboard/ranking**',route=>route.fulfill({json:{candidates:[{student_id:'s1',full_name:'Anu Candidate',roll_number:'R1',email:'anu@example.test',department_code:'CSE',program:'B.Tech',assignment_status:'completed'}],total_count:1}}));
  await page.route('**/v3/college/drives/drive-1/dashboard/ats-fit**',route=>route.fulfill({json:{candidates:[{student_id:'s1',assignment_status:'completed',ats_fit_score:82,skills:[{skill:'Python',match_status:'FULL_MATCH',evidence_text:'Built production services in Python'},{skill:'Kubernetes',match_status:'NO_EVIDENCE'}]}]}}));
  await page.getByRole('button',{name:'Manage drive',exact:true}).click();
  await page.getByRole('button',{name:'Candidates',exact:true}).click();
  const trigger=page.getByRole('button',{name:'AI resume match'});
  await trigger.focus();
  const popup=page.getByRole('dialog',{name:'Resume match for Anu Candidate'});
  await expect(popup).toBeVisible();
  await expect(popup).toContainText('82/100');
  await expect(popup).toContainText('Built production services in Python');
  await expect(popup).toContainText('Kubernetes');
  await expect(popup).not.toContainText('Interview not completed');
  await page.keyboard.press('Escape');
  await expect(popup).toBeHidden();
});

test('pending candidate resume summary stays neutral when role analysis is unavailable',async({page})=>{
  await setup(page);
  await page.route('**/v3/college/drives/drive-1',route=>route.fulfill({json:{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'active'}}));
  await page.route('**/v3/college/drives/drive-1/dashboard/ranking**',route=>route.fulfill({json:{candidates:[{student_id:'s1',full_name:'Pending Candidate',roll_number:'R1',assignment_status:'invited'}],total_count:1}}));
  await page.route('**/v3/college/drives/drive-1/dashboard/ats-fit**',route=>route.fulfill({json:{candidates:[{student_id:'s1',assignment_status:'invited',ats_fit_score:null,skills:[]}]}}));
  await page.getByRole('button',{name:'Manage drive',exact:true}).click();
  await page.getByRole('button',{name:'Candidates',exact:true}).click();
  await page.getByRole('button',{name:'AI resume match'}).focus();
  const popup=page.getByRole('dialog',{name:'Resume match for Pending Candidate'});
  await expect(popup).toContainText('Role-specific resume evidence is unavailable');
  await expect(popup).not.toContainText('Strengths');
  await expect(popup).not.toContainText('Gaps');
  await expect(popup).not.toContainText('Interview not completed');
});

test('interview report presents the protected recording and persisted question evidence',async({page})=>{
  await setup(page);
  const started='2026-10-01T10:00:00.000Z';
  await page.route('**/v3/college/drives/drive-1',route=>route.fulfill({json:{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'active',agent_selection:[]}}));
  await page.route('**/v3/college/students/s1/reports**',route=>route.fulfill({json:{student:{full_name:'Anu Candidate',roll_number:'R1',program:'B.Tech',department_code:'CSE',graduation_year:2027},reports:[{source:'drive',drive_id:'drive-1',session_id:'session-1',attempt_number:2,completed_at:started,overall_score:83,readiness:'Approaching Ready',recording:{status:'ready',duration_seconds:60,started_at:started,segment_count:1},detail:{status:'released',placement_readiness:{score:80,comparable:true},job_fit:{score:78},evaluation_confidence:{score:91},hiring_recommendation:{label:'Strong evidence',reasons:[]},strengths:[{label:'Clear implementation reasoning'}],priority_improvement_areas:[{focus:'Add production examples'}],question_reviews:[{turn_id:'turn-1',agent_type:'technical',question:'How do you handle file reads?',answer:'I use a context manager.',evidence_status:'answered',has_audio:false,strength_feedback:['Explained automatic resource cleanup.'],improvement_feedback:[]}]}}]}}));
  await page.route('**/v3/college/students/s1/reports/session-1/recording',route=>route.fulfill({json:{status:'ready',playback_url:'https://media.example/signed.webm',duration_seconds:60,started_at:started,segment_count:1}}));
  await page.route('**/v3/college/students/s1/reports/session-1/transcript',route=>route.fulfill({json:{session_id:'session-1',turns:[{turn_id:'turn-1',turn_index:1,agent_type:'technical',question_text:'How do you handle file reads?',transcript:'I use a context manager.',asked_at:'2026-10-01T10:00:05.000Z',has_audio:false}]}}));
  await page.route('**/v3/college/students/s1/reports/session-1/integrity-events',route=>route.fulfill({json:{events:[{event_id:'event-1',event_type:'tab_hidden',severity:'review',occurred_at:'2026-10-01T10:00:10.000Z'},{event_id:'event-2',event_type:'multiple_faces',severity:'review',occurred_at:'2026-10-01T10:00:20.000Z'}]}}));
  await page.route('**/v3/college/students/s1/reports/session-1/turns/turn-1/audio',route=>route.fulfill({status:200,headers:{'content-type':'audio/wav'},body:Buffer.from('UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAESsAAABAAgAZGF0YQAAAAA=','base64')}));
  await page.route('**/v3/college/drives/drive-1/candidates/s1/decision',route=>route.fulfill({json:{decision:{decision:'shortlist'},publication:{state:'hidden'},history:[]}}));
  await page.route('**/v3/college/interview-results-settings',route=>route.fulfill({json:{}}));
  await page.route('https://media.example/**',route=>route.abort());
  await page.goto('/dashboard/placement-management?drive=drive-1&section=results&candidate=s1');
  await expect(page.getByRole('heading',{name:'Anu Candidate'})).toBeVisible();
  const video=page.getByLabel('Interview recording',{exact:true});
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute('src','https://media.example/signed.webm');
  await expect(page.getByText('How do you handle file reads?').first()).toBeVisible();
  await page.getByRole('tablist',{name:'Candidate report sections'}).getByRole('tab',{name:/Answers/}).click();
  await page.locator('summary').filter({hasText:'How do you handle file reads?'}).click();
  await expect(page.getByText('I use a context manager.').first()).toBeVisible();
  await page.getByRole('tablist',{name:'Candidate report sections'}).getByRole('tab',{name:/AI Proctor/}).click();
  await expect(page.getByRole('rowheader',{name:'Tab Hidden',exact:true})).toBeVisible();
  await expect(page.getByRole('rowheader',{name:'Multiple Faces',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Decision & publication'})).toBeVisible();
});

test('expired interview video leaves the rest of the report available without a broken player',async({page})=>{
  await setup(page);
  await page.route('**/v3/college/drives/drive-1',route=>route.fulfill({json:{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'active',agent_selection:[]}}));
  await page.route('**/v3/college/students/s1/reports**',route=>route.fulfill({json:{student:{full_name:'Anu Candidate',roll_number:'R1'},reports:[{source:'drive',drive_id:'drive-1',session_id:'session-1',completed_at:'2026-01-01T10:00:00Z',recording:{status:'expired'},detail:{status:'released',overall_score:83,readiness:'Ready',strengths:[{label:'Clear reasoning'}]}}]}}));
  await page.route('**/v3/college/interview-results-settings',route=>route.fulfill({json:{}}));
  await page.goto('/dashboard/placement-management?drive=drive-1&section=results&candidate=s1');
  await expect(page.getByText(/Recording retention period ended/)).toBeVisible();
  await expect(page.getByText('Clear reasoning')).toBeVisible();
  await expect(page.getByRole('button',{name:'Load secure recording'})).toHaveCount(0);
  await expect(page.getByLabel('Interview recording',{exact:true})).toHaveCount(0);
});

test('drive editor submits and displays interview windows in IST',async({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management?drive=drive-1&section=settings',driveRows:[{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'scheduled',location:'Chennai'}],driveDetails:{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'scheduled',location:'Chennai',window_start_at:'2027-01-10T03:30:00Z',window_end_at:'2027-01-10T04:30:00Z'}});
  let payload:Record<string,unknown>={};
  await page.route('**/v3/college/drives/drive-1',route=>{
    if(route.request().method()==='PUT'){payload=route.request().postDataJSON();return route.fulfill({json:{id:'drive-1',...payload}});}
    return route.fallback();
  });
  await expect(page.getByText('10/01/2027, 09:00 IST',{exact:true})).toBeVisible();
  await page.locator('article').filter({has:page.getByRole('heading',{name:'Interview configuration'})}).getByRole('button',{name:'Modify section'}).click();
  await page.getByLabel('Interview start').fill('2027-01-10T09:00');
  await page.getByLabel('Interview end').fill('2027-01-10T10:00');
  await page.getByRole('button',{name:'Save this section'}).click();
  expect(payload.window_start).toBe('2027-01-10T03:30:00.000Z');
  expect(payload.window_end).toBe('2027-01-10T04:30:00.000Z');
});

test('unlocked active drive allows eligibility edits and sends new departments for reassignment', async ({page}) => {
  let departments = ['CSE'];
  await setup(page, true, {
    initialPath: '/dashboard/placement-management?drive=drive-1&section=settings',
    driveRows: [{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'active'}],
    driveDetails: {id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'active',criteria_programs:['B.Tech'],criteria_department_codes:departments,criteria_graduation_years:[2027]},
  });
  let savedPayload: Record<string, unknown> | undefined;
  await page.route('**/v3/college/drives/drive-1', async route => {
    if (route.request().method() === 'PUT') {
      savedPayload = route.request().postDataJSON();
      departments = savedPayload.eligible_departments as string[];
      return route.fulfill({json:{status:'updated',warnings:[]}});
    }
    return route.fulfill({json:{id:'drive-1',company_name:'Example Company',role_title:'Engineer',status:'active',criteria_programs:['B.Tech'],criteria_department_codes:departments,criteria_graduation_years:[2027]}});
  });
  const eligibility = page.locator('article').filter({has:page.getByRole('heading',{name:'Eligibility',exact:true})});
  await eligibility.getByRole('button',{name:'Modify section'}).click();
  await page.setViewportSize({width:390,height:844});
  const departmentPicker = page.getByRole('group',{name:'Departments options'});
  const informationTechnology = departmentPicker.getByRole('checkbox',{name:'Information Technology (IT)'});
  await expect(informationTechnology).toBeVisible();
  await informationTechnology.check();
  await expect(page.getByRole('group',{name:'Departments',exact:true})).toContainText('2 selected');
  await page.getByRole('button',{name:'Save this section'}).click();
  await expect(page.getByText('Eligibility criteria saved and candidate assignments refreshed.')).toBeVisible();
  expect(savedPayload?.eligible_departments).toEqual(['CSE','IT']);
  await expect(eligibility).toContainText('CSE, IT');
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

test('student roster creates a student without requiring a verification photo', async ({ page }) => {
  await setup(page, true, { initialPath: '/dashboard/attendance' });
  await page.getByRole('button', { name: 'Student Roster', exact: true }).click();
  await page.getByRole('button', { name: 'Add student', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Save student' })).toBeEnabled();
  await dialog.getByLabel('Full name').fill('Photo Optional Student');
  await dialog.getByLabel('Student ID / Roll number').fill('CS-2027-OPTIONAL');
  await dialog.locator('input[name=email]').fill('optional-photo@example.edu');
  await dialog.locator('input[type=tel]').fill('9876543210');
  await dialog.locator('input[name=cgpa]').fill('8.2');
  await dialog.getByRole('combobox', { name: /Program/ }).selectOption('B.Tech');
  await dialog.getByRole('combobox', { name: /Department/ }).selectOption('CSE');
  let payload: Record<string, unknown> = {};
  await page.route('**/v3/college/students', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    payload = route.request().postDataJSON();
    return route.fulfill({ json: { student_id: 'student-no-photo', welcome_email_status: 'queued' } });
  });
  await dialog.getByRole('button', { name: 'Save student' }).click();
  await expect(page.getByText('The welcome and password setup email was accepted by the delivery queue', { exact: false })).toBeVisible();
  expect(payload.photo || '').toBe('');
});

test('Student Roster exposes the photo permission during add and edit flows', async ({ page }) => {
  await setup(page, true, { initialPath: '/dashboard/attendance' });
  await page.getByRole('button', { name: 'Add student' }).click();
  const permission = page.getByRole('checkbox', { name: /Allow student to upload profile photo/ });
  await expect(permission).not.toBeChecked();
  await expect(page.getByText(/If enabled, the student can upload or capture/)).toBeVisible();
  await permission.check();
  await expect(permission).toBeChecked();
});

test('program without configured departments can preview and create a placement drive', async ({page}) => {
  await setup(page,true,{initialPath:'/dashboard/placement-management'});
  await page.route('**/v3/college/academic-catalog',route=>route.fulfill({json:{programs:[{code:'BCA',display_name:'Bachelor of Computer Applications',duration_years:3,departments:[]}],graduation_years:[2027,2028]}}));
  let preview:Record<string,unknown>|undefined,created:Record<string,unknown>|undefined;
  await page.route('**/v3/college/drives/eligibility/preview',route=>{preview=route.request().postDataJSON();return route.fulfill({json:{total_students:0,eligible_count:0,not_eligible_count:0,missing_photo_count:0,candidates:[]}})});
  await page.route('**/v3/college/drives',route=>{
    if(route.request().method()!=='POST')return route.fallback();
    created=route.request().postDataJSON();return route.fulfill({json:{drive_id:'new-drive',status:'draft',warnings:[]}});
  });
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await page.getByLabel('Company name').fill('Campus Employer');
  await page.locator('#role_title').fill('Business Analyst');
  await page.getByLabel('Location').fill('Chennai');
  await page.getByLabel('Job description').fill('Analyze business requirements and document solutions.');
  await page.getByRole('button',{name:'Continue'}).click();
  await page.getByLabel('Interview starts date').fill('2027-01-10');
  await page.getByLabel('Interview starts hour').selectOption('9');
  await page.getByLabel('Interview starts AM / PM').selectOption('AM');
  await page.getByLabel('Interview ends date').fill('2027-01-11');
  await page.getByLabel('Interview ends hour').selectOption('6');
  await page.getByLabel('Interview ends AM / PM').selectOption('PM');
  await page.getByRole('button',{name:'4. Questions'}).click();
  await page.getByRole('button',{name:'5. Eligibility'}).click();
  await page.getByRole('checkbox',{name:/Bachelor Of Computer Applications BCA/}).check();
  const departmentGroup=page.locator('fieldset[aria-label="Eligible departments"]');
  await expect(departmentGroup).toContainText('Optional');
  await expect(departmentGroup).toContainText('Selected programs have no departments configured');
  await page.locator('#graduation_from').selectOption('2027');
  await page.locator('#graduation_to').selectOption('2027');
  await expect.poll(()=>preview?.eligible_departments).toEqual([]);
  await page.getByRole('button',{name:'Continue'}).click();
  await page.getByRole('button',{name:'Create placement drive'}).click();
  await expect(page.getByText('Drive created (draft).')).toBeVisible();
  expect(created?.eligible_departments).toEqual([]);
});

test('interview date and time fields render required markers while department requirement follows program configuration', async ({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management',academicCatalog:{programs:[{code:'B.Tech',display_name:'Bachelor of Technology',duration_years:4,departments:[{code:'CSE',display_name:'Computer Science'}]},{code:'NO_DEPTS',display_name:'Program without departments',duration_years:3,departments:[]}],graduation_years:[2027,2028]}});
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await page.getByLabel('Company name').fill('Campus Employer');
  await page.locator('#role_title').fill('Software Engineer');
  await page.getByLabel('Location').fill('Chennai');
  await page.getByLabel('Job description').fill('Build and maintain accessible web applications.');
  await page.getByRole('button',{name:'Continue'}).click();
  await expect(page.locator('fieldset.dw-datetime').first()).toContainText('*');
  await page.getByLabel('Interview starts date').fill('2027-01-10');
  await page.getByLabel('Interview ends date').fill('2027-01-11');
  await page.getByRole('button',{name:'4. Questions'}).click();
  await page.getByRole('button',{name:'5. Eligibility'}).click();
  await page.getByRole('checkbox',{name:/Bachelor Of Technology B\.Tech/}).check();
  const departments=page.locator('fieldset[aria-label="Eligible departments"]');
  await expect(departments.locator('legend')).toContainText('Eligible departments*');
  await page.getByRole('checkbox',{name:/Bachelor Of Technology B\.Tech/}).uncheck();
  await page.getByRole('checkbox',{name:/NO_DEPTS/}).check();
  await expect(departments).toContainText('Optional');
});

test('drive interview setup offers resume-based dynamic difficulty', async ({page}) => {
  await setup(page,true,{initialPath:'/dashboard/placement-management'});
  await page.getByRole('button',{name:'Create drive',exact:true}).click();
  await driveFields(page);
  await page.getByRole('button',{name:'2. Interview setup'}).click();
  await page.getByLabel('Interview difficulty').selectOption('dynamic');
  await expect(page.getByLabel('Interview difficulty')).toHaveValue('dynamic');
  await expect(page.getByRole('option',{name:'Personalized'})).toHaveCount(1);
});

test('placement cards and table share active-first ordering, filters and drive actions', async ({page}) => {
  const row = (id:string,status:string,start:string,created:string) => ({id,company_name:id,role_title:'Engineer',status,window_start_at:start,window_end_at:status==='closed'?'2020-01-02T00:00:00Z':'2099-02-01T00:00:00Z',created_at:created});
  await setup(page,true,{initialPath:'/dashboard/placement-management',driveRows:[
    row('Closed drive','closed','2020-01-01T00:00:00Z','2099-01-01T00:00:00Z'),
    row('Scheduled drive','scheduled','2099-01-01T00:00:00Z','2026-01-01T00:00:00Z'),
    row('Older active','active','2024-01-01T00:00:00Z','2026-01-01T00:00:00Z'),
    row('Latest active','active','2025-01-01T00:00:00Z','2026-01-01T00:00:00Z'),
  ]});
  await expect(page.getByRole('heading',{level:3})).toHaveText(['Latest active','Older active','Scheduled drive','Closed drive']);
  await page.getByRole('button',{name:'Table',exact:true}).click();
  const table=page.getByRole('table',{name:'Placement drives'});
  await expect(table.locator('tbody tr td:first-child')).toHaveText(['Latest activeEngineer','Older activeEngineer','Scheduled driveEngineer','Closed driveEngineer']);
  for (const name of ['Manage drive','Edit drive','Lock drive','Delete drive']) await expect(table.getByRole('button',{name,exact:true})).toHaveCount(4);
  await page.getByLabel('Drive status').selectOption('scheduled');
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(table).toContainText('Scheduled drive');
  await page.getByLabel('Drive status').selectOption('');
  await expect(table.locator('tbody tr')).toHaveCount(4);
  let locked=false;
  await page.route('**/v3/college/drives/Latest%20active/lock',route=>{locked=true;return route.fulfill({json:{is_locked:true}});});
  await page.route('**/v3/college/drives/Latest active/lock',route=>{locked=true;return route.fulfill({json:{is_locked:true}});});
  page.on('dialog',dialog=>dialog.accept());
  await table.locator('tbody tr').first().getByRole('button',{name:'Lock drive',exact:true}).click();
  await expect.poll(()=>locked).toBeTruthy();
});

test('placement KPI values refresh without changing drive cards', async ({page}) => {
  await page.clock.install();
  await setup(page,true,{initialPath:'/dashboard/placement-management'});
  let live=0;
  await page.route('**/v3/college/dashboard/overview',route=>route.fulfill({json:{active_drives:4,upcoming_drives:2,eligible_candidates:10,interviews_completed:3,live_interviews:live}}));
  const kpi=page.locator('article').filter({has:page.getByText('Live interviews',{exact:true})});
  await expect(kpi.locator('strong')).toHaveText('0');
  live=2;
  await page.clock.fastForward(16000);
  await expect(kpi.locator('strong')).toHaveText('2');
});

test('deleting a cloud draft also removes its matching device copy', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('voicedots:placement-drive-draft:v2',JSON.stringify({payload:{creationKey:'shared-key',form:{company_name:'Cloud and device draft'}}})));
  await setup(page,true,{initialPath:'/dashboard/placement-management'});
  let deleted=false;
  await page.route('**/v3/college/drive-drafts',route=>route.fulfill({json:deleted?[]:[{id:'shared-draft',client_draft_key:'shared-key',step:0,payload:{form:{company_name:'Cloud and device draft'}}}]}));
  await page.route('**/v3/college/drive-drafts/shared-draft',route=>{deleted=true;return route.fulfill({status:204});});
  await page.reload();
  await page.getByRole('button',{name:'Delete draft',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('voicedots:placement-drive-draft:v2'))).toBeNull();
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Cloud and device draft'})).toHaveCount(0);
});

test('drive overview uses a progress chart without Other and keeps navigation separate from actions', async ({page}) => {
  await setup(page,true,{initialPath:'/dashboard/placement-management?drive=drive-1',driveDetails:{id:'drive-1',company_name:'Example',role_title:'Engineer',status:'active',window_start_at:'2026-01-01T00:00:00Z',window_end_at:'2099-01-01T00:00:00Z'}});
  await page.route('**/v3/college/drives/drive-1/dashboard/overview**',route=>route.fulfill({json:{metrics:{total_assigned:10,interview_completed:3,interview_progress:{completed:3,in_progress:2,not_started:5,other:0}}}}));
  await page.reload();
  await expect(page.getByLabel('10 assigned candidates')).toBeVisible();
  await expect(page.getByText('Other',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Edit drive',exact:true})).toBeVisible();
});

test('candidate stopped by proctor has an ended label and attempt policy controls', async ({page}) => {
  await setup(page,true,{initialPath:'/dashboard/placement-management?drive=drive-1&section=candidates',driveDetails:{id:'drive-1',company_name:'Example',role_title:'Engineer',status:'active',max_attempts:2,score_attempt_rules:[{min_score:0,max_score:50,max_attempts:3,require_coach:true}]}});
  await page.route('**/v3/college/drives/drive-1/dashboard/ranking**',route=>route.fulfill({json:{candidates:[{student_id:'s1',full_name:'Ended Candidate',roll_number:'R1',assignment_status:'expired',preparation_status:'ready',live_session_status:'candidate_ended',live_session_termination_source:'proctor'}],pagination:{total:1}}}));
  await page.reload();
  await expect(page.getByText('Ended by proctor',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'View details',exact:true}).click();
  await expect(page.getByText('Attempt policy & AI Coach')).toBeVisible();
  await expect(page.getByRole('button',{name:'Configure attempt & Coach rules'})).toBeVisible();
});

test('modify drive offers all Create Drive fields through the complete editor', async ({page}) => {
  await setup(page,true,{initialPath:'/dashboard/placement-management?drive=drive-1&section=settings',driveDetails:{id:'drive-1',company_name:'Example',role_title:'Engineer',location:'Remote',jd_raw_text:'Build Python backend services.',status:'draft',difficulty_tier:'dynamic',window_start_at:'2099-01-01T00:00:00Z',window_end_at:'2099-01-02T00:00:00Z'}});
  await page.getByRole('button',{name:'Edit complete setup'}).click();
  await expect(page.getByRole('navigation',{name:'Drive creation steps'})).toBeVisible();
  await page.getByRole('button',{name:'2. Interview setup'}).click();
  await expect(page.getByRole('option',{name:'Personalized',exact:true})).toHaveCount(1);
  await expect(page.getByText('Score-based attempt rules',{exact:false}).first()).toBeVisible();
});

test('ATS filters reset pagination and clear back to all candidates', async ({page}) => {
  await setup(page,true,{initialPath:'/dashboard/placement-management?drive=drive-1&section=ats',driveDetails:{id:'drive-1',company_name:'Example',role_title:'Engineer',status:'active'}});
  let requested='';
  await page.route('**/v3/college/drives/drive-1/dashboard/ats-fit**',route=>{requested=route.request().url();return route.fulfill({json:{candidates:[{student_id:'s1',full_name:'Filter Candidate',roll_number:'R1',assignment_status:'invited'}],pagination:{total:26}}});});
  await page.reload();
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect.poll(()=>new URL(requested).searchParams.get('offset')).toBe('25');
  await page.getByLabel('Eligibility',{exact:false}).selectOption('eligible');
  await expect.poll(()=>new URL(requested).searchParams.get('offset')).toBe('0');
  await expect.poll(()=>new URL(requested).searchParams.get('eligible')).toBe('true');
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();
  await expect.poll(()=>new URL(requested).searchParams.has('eligible')).toBe(false);
});

test('ATS popup reuses already loaded evidence without another matching request', async ({page}) => {
  await setup(page,true,{initialPath:'/dashboard/placement-management?drive=drive-1&section=ats',driveDetails:{id:'drive-1',company_name:'Example',role_title:'Engineer',status:'active'}});
  let requests=0;
  await page.route('**/v3/college/drives/drive-1/dashboard/ats-fit**',route=>{requests++;return route.fulfill({json:{candidates:[{student_id:'s1',full_name:'Evidence Candidate',roll_number:'R1',assignment_status:'completed',ats_fit_score:82,skills:[{skill:'Python',match_status:'FULL_MATCH',evidence_text:'Built Python services'}]}],pagination:{total:1}}});});
  await page.reload();
  await page.getByRole('button',{name:'AI resume match'}).focus();
  await expect(page.getByRole('dialog',{name:'Resume match for Evidence Candidate'})).toContainText('82/100');
  expect(requests).toBe(1);
});


test('attempt rules open the existing drive at Interview setup rather than a new draft',async({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management?drive=drive-1&section=candidates',driveDetails:{id:'drive-1',company_name:'Existing Company',role_title:'Engineer',location:'Remote',jd_raw_text:'Build Python services for customers.',status:'draft',max_attempts:3,window_start_at:'2099-01-01T00:00:00Z',window_end_at:'2099-01-02T00:00:00Z'}});
  await page.route('**/v3/college/drives/drive-1/dashboard/ranking**',route=>route.fulfill({json:{candidates:[{student_id:'s1',full_name:'Anu',roll_number:'R1',assignment_status:'assigned'}],pagination:{total:1}}}));
  await page.reload();await page.getByRole('button',{name:'View details',exact:true}).click();
  await page.getByRole('button',{name:'Configure attempt & Coach rules'}).click();
  await expect(page.getByRole('heading',{name:'Modify placement drive'})).toBeVisible();
  await expect(page.getByRole('button',{name:'2. Interview setup'})).toHaveAttribute('aria-current','step');
  await expect(page.getByText('Score-based attempt rules',{exact:false}).first()).toBeVisible();
  await expect(page.getByRole('heading',{name:'Create placement drive'})).toHaveCount(0);
  await page.getByRole('button',{name:'1. Drive & company'}).click();
  await expect(page.locator('#company_name')).toHaveValue('Existing Company');
});

test('results export includes selected candidates and compact strengths with report access',async({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management?drive=drive-1&section=results'});
  await page.route('**/v3/college/drives/drive-1/dashboard/ranking**',route=>route.fulfill({json:{candidates:[{student_id:'s1',full_name:'Selected Candidate',roll_number:'R1',overall_score:83,ranking_score:80,job_fit_score:78,assignment_status:'completed',report_ready:true}],pagination:{total:1}}}));
  let selected:string[]=[];
  await page.route('**/v3/college/drives/drive-1/results/export',route=>{selected=route.request().postDataJSON().student_ids;return route.fulfill({contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',body:Buffer.from('PK-test')});});
  await page.route('**/v3/college/students/s1/reports',route=>route.fulfill({json:{reports:[{drive_id:'drive-1',detail:{strengths:['Strength one','Strength two','Strength three','Strength four'],priority_improvement_areas:['Gap one','Gap two','Gap three','Gap four']}}]}}));
  await page.reload();await page.getByRole('button',{name:/View strengths/}).click();
  const evidence=page.getByRole('dialog',{name:'Interview strengths and gaps for Selected Candidate'});
  await expect(evidence.getByText('Strength three')).toBeVisible();await expect(evidence.getByText('Strength four')).toHaveCount(0);
  await expect(evidence.getByText('Gap four')).toHaveCount(0);await page.getByRole('button',{name:'Close strengths and gaps'}).click();
  await page.getByLabel('Select Selected Candidate',{exact:true}).check();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export Excel'}).click();
  expect((await download).suggestedFilename()).toBe('interview-results.xlsx');expect(selected).toEqual(['s1']);
  await page.getByRole('group',{name:'Results layout'}).getByRole('button',{name:'Table',exact:true}).click();
  await expect(page.locator('#result-candidate-table th')).toHaveCount(7);
  await expect(page.getByLabel('Select Selected Candidate',{exact:true})).toBeChecked();
  await page.getByRole('group',{name:'Results layout'}).getByRole('button',{name:'Cards',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('button',{name:'Open full report'})).toBeVisible();
  await page.screenshot({path:'/root/voicedots/artifacts/interview-review-20261008/results-mobile.png',fullPage:true});
});

test('report plays real video and audio bytes and has one proctor timeline',async({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management?drive=drive-1&section=results&candidate=s1'});
  const start='2026-10-01T10:00:00Z';
  await page.route('**/v3/college/students/s1/reports',route=>route.fulfill({json:{student:{full_name:'Recorded Candidate',roll_number:'R1'},reports:[{source:'drive',drive_id:'drive-1',session_id:'session-1',completed_at:start,overall_score:83,recording:{status:'processing'},detail:{status:'released'}}]}}));
  await page.route('**/v3/college/students/s1/reports/session-1/recording',route=>route.fulfill({json:{status:'ready',playback_url:'https://media.example/real.webm',started_at:start,duration_seconds:2,segment_count:1}}));
  await page.route('https://media.example/real.webm',route=>route.fulfill({contentType:'video/webm',body:readFileSync('tests/fixtures/interview-test.webm')}));
  await page.reload();const video=page.getByLabel('Interview recording',{exact:true});
  await expect(video).toBeVisible();await expect(video).toHaveAttribute('controls','');
  await video.evaluate(async element=>{const v=element as HTMLVideoElement;await v.play();});
  await expect.poll(()=>video.evaluate(element=>(element as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await expect.poll(()=>video.evaluate(element=>(element as HTMLVideoElement).videoWidth)).toBe(160);
  await expect(page.getByRole('group',{name:'Recording timeline',exact:true})).toHaveCount(1);
  await page.screenshot({path:'/root/voicedots/artifacts/interview-review-20261008/full-report.png',fullPage:true});
});

test('result KPI, search, sorting and advanced reset preserve correct server filters',async({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management?drive=drive-1&section=results'});
  const requests:URL[]=[];
  await page.route('**/v3/college/drives/drive-1/dashboard/ranking**',route=>{
    const url=new URL(route.request().url());if(url.searchParams.get('limit')==='25')requests.push(url);
    return route.fulfill({json:{candidates:[{student_id:'s1',full_name:'Filter Candidate',roll_number:'R1',report_ready:true,assignment_status:'completed'}],pagination:{total:30}}});
  });
  await page.reload();await page.getByRole('button',{name:/^Shortlisted/}).click();
  await expect.poll(()=>requests.at(-1)?.searchParams.get('decision')).toBe('shortlist');
  await page.getByPlaceholder('Name, email or roll number').fill('Filter');
  await expect.poll(()=>requests.at(-1)?.searchParams.get('q')).toBe('Filter');
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect.poll(()=>requests.at(-1)?.searchParams.get('offset')).toBe('25');
  await page.getByLabel('Sort results').selectOption('name');
  await expect.poll(()=>requests.at(-1)?.searchParams.get('offset')).toBe('0');
  await page.getByRole('button',{name:/^Filters/}).click();await page.getByRole('button',{name:'Reset',exact:true}).click();
  await expect(page.getByPlaceholder('Name, email or roll number')).toHaveValue('');
  await expect.poll(()=>requests.at(-1)?.searchParams.get('decision')).toBeNull();
});


test('report answers can expand and collapse without losing saved per-question feedback',async({page})=>{
  await setup(page,true,{initialPath:'/dashboard/placement-management?drive=drive-1&section=results&candidate=s1'});
  const reviews=Array.from({length:6},(_,i)=>({turn_id:`t${i}`,question:`Evidence question ${i+1}`,answer:'Saved response',strength_feedback:['Specific evidence'],improvement_feedback:['Explain the result']}));
  await page.route('**/v3/college/students/s1/reports',route=>route.fulfill({json:{student:{full_name:'Evidence Candidate'},reports:[{source:'drive',drive_id:'drive-1',session_id:'session-1',completed_at:'2026-10-01T10:00:00Z',detail:{question_reviews:reviews}}]}}));
  await page.reload();await expect(page.getByText('Evidence question 6',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Show all 6 answers'}).click();await expect(page.getByText('Evidence question 6',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Show less',exact:true}).click();await expect(page.getByText('Evidence question 6',{exact:true})).toHaveCount(0);
});
