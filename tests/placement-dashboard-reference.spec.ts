import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { placementSample } from '../preview/placement-data';
const artifacts = '/root/voicedots/artifacts/placement-dashboard-reference-20261013';
async function setup(page: Page) {
 await page.addInitScript(() => localStorage.setItem('access_token', 'preview-only'));
 await page.route(/\/v[13]\//, route => {
  const path = new URL(route.request().url()).pathname;
  const responses: Record<string, unknown> = { '/v1/users/me': { user_id: 'preview', name: 'College Manager', email: 'preview@example.invalid' }, '/v3/college/access': { enabled: true, college_name: 'Example Engineering College' }, '/v3/college/intelligence/dashboard': placementSample };
  return route.fulfill({ json: responses[path] || {} });
 });
 await page.goto('/dashboard/placement-management?view=dashboard');
 await expect(page.locator('.pi-kpis')).toContainText('1250');
}
test('reference dashboard has real metric semantics and centered donuts across viewport sizes', async ({ page }) => {
 const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
 await setup(page); mkdirSync(artifacts, { recursive: true });
 await expect(page.getByRole('heading', { name: 'Institutional Comparisons', exact: true })).toBeVisible();
 await expect(page.getByRole('heading', { name: 'Alerts & Human Review', exact: true })).toBeVisible();
 await expect(page.locator('.pdo-ring-center').nth(1)).toContainText('46%');
 for (const width of [1600, 1366, 768, 390, 320]) {
  await page.setViewportSize({ width, height: 1050 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  for (const ring of await page.locator('.pdo-ring').all()) {
   const box = (await ring.boundingBox())!, center = (await ring.locator('.pdo-ring-center').boundingBox())!;
   expect(Math.abs(box.width - box.height)).toBeLessThan(1);
   expect(Math.abs(box.x + box.width / 2 - center.x - center.width / 2)).toBeLessThan(1);
   expect(Math.abs(box.y + box.height / 2 - center.y - center.height / 2)).toBeLessThan(1);
  }
  if (width === 1600 || width === 390) await page.screenshot({ path: `${artifacts}/dashboard-${width}.png`, fullPage: true });
 }
 expect(errors).toEqual([]);
});
test('filters reach the API and dashboard actions open existing workflows', async ({ page }) => {
 await setup(page);
 const request = page.waitForRequest(request => request.url().includes('intelligence/dashboard?') && new URL(request.url()).searchParams.get('department') === 'CSE');
 await page.getByLabel('Department', { exact: true }).selectOption('CSE'); await request;
 await page.getByRole('button', { name: 'Role analytics' }).click();
 await expect(page.getByRole('heading', { name: 'Role-specific Competency & Skill Gaps' })).toBeVisible();
 await page.getByRole('button', { name: 'Command center', exact: true }).click();
 await page.getByRole('button', { name: 'Review alerts', exact: true }).click();
 await expect(page.getByRole('heading', { name: 'Department Benchmarking', exact: true })).toBeVisible();
 await page.getByRole('button', { name: 'Integrations', exact: true }).click();
 await expect(page.getByRole('heading', { name: 'Connected Assessment Data' })).toBeVisible();
});
test('empty assessments never invent readiness or competency metrics', async ({ page }) => {
 await setup(page);
 await page.route('**/v3/college/intelligence/dashboard?**', route => route.fulfill({ json: { ...placementSample, summary: { ...placementSample.summary, interviews: 0, candidates: 0, average_competency: null, satisfaction: null, positive_experience_percent: null }, competencies: [], readiness: [], experience_distribution: [], by_category: [], trend: [], recent_interviews: [] } }));
 await page.getByRole('button', { name: 'Refresh analytics' }).click();
 await expect(page.locator('.pi-kpis')).toContainText('Not measured');
 await expect(page.locator('.pdo-ring')).toHaveCount(0);
 await expect(page.getByText('No competency evidence saved yet.')).toBeVisible();
});
