import { test, expect, type Page } from '@playwright/test';
async function setup(page: Page, enabled = true) {
  await page.addInitScript(() => localStorage.setItem('access_token', 'test-session'));
  await page.route(/\/v[13]\//, route => {
    const path = new URL(route.request().url()).pathname;
    const values: Record<string, unknown> = {
      '/v1/users/me': { user_id: 'client-1', name: 'College Manager', email: 'manager@example.edu' },
      '/v3/email/capabilities': { email_enabled: false },
      '/v3/college/access': { enabled, college_name: 'Example Engineering College' },
      '/v3/college/drives': [{ id: 'drive-1', company_name: 'Example Company', role_title: 'Software Engineer', status: 'draft', location: 'Chennai' }],
      '/v3/college/students': { items: [], total: 0 },
      '/v3/college/academic-catalog': { programs: [{ code: 'B.Tech', display_name: 'Bachelor of Technology', duration_years: 4, departments: [{ code: 'CSE', display_name: 'Computer Science' }] }] },
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
  await page.getByLabel('Eligible program codes').fill('B.Tech');
  await page.getByLabel('Eligible department codes').fill('CSE, IT');
  await page.getByLabel('Graduation years').fill('2027, 2028');
}

test('unassigned client cannot see management navigation or controls', async ({ page }) => {
  await setup(page, false);
  await expect(page.getByText('College management is not enabled', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'College management', exact: true })).toHaveCount(0);
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
