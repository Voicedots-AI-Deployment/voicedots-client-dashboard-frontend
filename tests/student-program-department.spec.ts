import { test, expect, type Page } from '@playwright/test';
async function setup(page: Page, enabled = true, options: { notFound?: string[]; driveRows?: unknown[]; driveDetails?: unknown; companyProfiles?: unknown[]; initialPath?: string; portalRole?: string; studentRows?: unknown[] } = {}) {
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
      '/v3/college/students': { items: options.studentRows ?? [], total: options.studentRows?.length ?? 0 },
      '/v3/college/attendance/setup': { classes: [], students: [], staff: [] },
      '/v3/college/academic-catalog': { programs: [{ code: 'WITH_DEPTS', display_name: 'Program with departments', duration_years: 4, departments: [{ code: 'CSE', display_name: 'Computer Science' }] },{ code: 'NO_DEPTS', display_name: 'Program without departments', duration_years: 3, departments: [] }], graduation_years:[2027,2028] },
    };
    return route.fulfill({ json: values[path] || {} });
  });
  if (options.notFound?.length) await page.route(/\/v[13]\//, route => {
    const path = new URL(route.request().url()).pathname;
    if (options.notFound?.includes(path)) return route.fulfill({ status: 404, json: { detail: 'Endpoint not found' } });
    return route.fallback();
  });
  await page.goto(options.initialPath || '/dashboard/attendance');
}


async function visitRoster(page: Page, studentRows: unknown[] = []) {
  await setup(page, true, { initialPath: '/dashboard/attendance', studentRows });
  await page.getByRole('button', { name: 'Student Roster', exact: true }).click();
}

async function openRoster(page: Page) {
  await visitRoster(page);
  await page.getByRole('button', { name: 'Add student', exact: true }).click();
}
async function fillStudent(page: import('@playwright/test').Page) {
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('Department Test Student');
  await dialog.getByLabel('Student ID / Roll number').fill('DPT-001');
  await dialog.locator('input[name=email]').fill('department-test@example.edu');
  await dialog.locator('input[type=tel]').fill('9876543210');
  await dialog.locator('input[name=cgpa]').fill('8.1');
  await dialog.getByLabel('Upload photo').setInputFiles({ name: 'student.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('reference-photo') });
  await expect(dialog.getByText(/Photo quality verified/)).toBeVisible();
  return dialog;
}

test('Add Student hides Department for no-department programs and clears a previous choice', async ({ page }) => {
  await openRoster(page);
  const dialog = await fillStudent(page);
  const program = dialog.locator('label').filter({ hasText: /^Program/ }).locator('select');
  const department = dialog.locator('label').filter({ hasText: /^Department/ }).locator('select');
  await expect(department).toBeVisible();
  await department.selectOption('CSE');
  await program.selectOption('NO_DEPTS');
  await expect(department).toHaveCount(0);
  let saved: Record<string, unknown> = {};
  await page.route('**/v3/college/students', route => route.request().method() === 'POST'
    ? (saved = route.request().postDataJSON(), route.fulfill({ json: { student_id: 's1', welcome_email_status: 'queued' } }))
    : route.fallback());
  await dialog.getByRole('button', { name: 'Save student' }).click();
  await expect(page.getByText('Student created.', { exact: false })).toBeVisible();
  expect(saved.program).toBe('NO_DEPTS');
  expect(saved.department_code).toBe('');
});

test('Add Student requires Department for programs that configure departments', async ({ page }) => {
  await openRoster(page);
  const dialog = await fillStudent(page);
  const department = dialog.locator('label').filter({ hasText: /^Department/ }).locator('select');
  await expect(department).toBeVisible();
  await expect(department).toHaveAttribute('required', '');
  await expect(department.locator('option')).toHaveCount(2);
});


test('Edit Student hides and clears Department when switched to a Program without departments', async ({ page }) => {
  await visitRoster(page, [{ id: 's1', full_name: 'Existing Student', roll_number: 'R-001', email: 'existing@example.edu', phone: '+919876543210', program: 'WITH_DEPTS', department_code: 'CSE', cgpa: 8.1, graduation_year: 2027, status: 'active', identity_locked: false }]);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const program = dialog.locator('label').filter({ hasText: /^Program/ }).locator('select');
  await expect(dialog.locator('label').filter({ hasText: /^Department/ }).locator('select')).toHaveValue('CSE');
  await program.selectOption('NO_DEPTS');
  await expect(dialog.locator('label').filter({ hasText: /^Department/ }).locator('select')).toHaveCount(0);
  let saved: Record<string, unknown> = {};
  await page.route('**/v3/college/students/s1', route => route.request().method() === 'PUT'
    ? (saved = route.request().postDataJSON(), route.fulfill({ json: { status: 'updated', student_id: 's1' } }))
    : route.fallback());
  await dialog.getByRole('button', { name: 'Save student' }).click();
  await expect(page.getByText('Student updated.', { exact: true })).toBeVisible();
  expect(saved.program).toBe('NO_DEPTS');
  expect(saved.department_code).toBe('');
});

test('Edit Student starts without Department for a no-department Program and shows a required choice after switching', async ({ page }) => {
  await visitRoster(page, [{ id: 's2', full_name: 'Existing Student', roll_number: 'R-002', email: 'existing2@example.edu', phone: '+919876543210', program: 'NO_DEPTS', department_code: '', cgpa: 8.1, graduation_year: 2027, status: 'active', identity_locked: false }]);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('label').filter({ hasText: /^Department/ }).locator('select')).toHaveCount(0);
  const program = dialog.locator('label').filter({ hasText: /^Program/ }).locator('select');
  await program.selectOption('WITH_DEPTS');
  const department = dialog.locator('label').filter({ hasText: /^Department/ }).locator('select');
  await expect(department).toBeVisible();
  await expect(department).toHaveAttribute('required', '');
  await expect(department).toHaveValue('');
});
