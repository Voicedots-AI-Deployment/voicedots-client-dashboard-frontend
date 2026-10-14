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

test('dense real-world evidence fits all reference widths without stretching neighbouring cards', async ({ page }) => {
 await setup(page);
 const longText = 'You connected the project manager role to guiding teams, handling clients and keeping delivery on track from start to production. Explain the checks and your own contribution clearly. '.repeat(3);
 const names = ['Communication','Role Fit','Confidence Conduct','Resume Ownership','Structured Thinking','Domain Knowledge','Applied Evidence','Role Awareness','Practical Application','Analytical Reasoning','Problem Solving','Communication Evidence','Technical Knowledge'];
 await page.route('**/v3/college/intelligence/dashboard?**', route => route.fulfill({json:{...placementSample,competencies:names.map((name,index)=>({key:`dimension_${index}`,name,score:25+index,responses:30,weight:null,target:null})),strengths:Array.from({length:5},(_,i)=>({text:`Evidence ${i+1}: ${longText}`,count:i+1}))}}));
 await page.getByRole('button',{name:'Refresh analytics'}).click();
 await expect(page.locator('.pdo-metric-row')).toHaveCount(13);
 for (const width of [1920,1440,1366,1024,768,390]) {
  await page.setViewportSize({width,height:1000});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  const evidence=await page.locator('.pdo-insights').boundingBox();expect(evidence!.height).toBeLessThan(1300);
  const readiness=await page.getByRole('heading',{name:'Career Readiness',exact:true}).locator('..').boundingBox();expect(readiness!.height).toBeLessThan(650);
  const filters=await page.locator('.pi-filter-panel select').all();for(const filter of filters){const box=await filter.boundingBox();expect(box!.width).toBeGreaterThan(120);}
  await page.screenshot({path:`/root/voicedots/artifacts/dashboard-layout-20261014/client-${width}.png`,fullPage:true});
 }
 await page.locator('.pdo-evidence summary').first().click();
 await expect(page.locator('.pdo-evidence details').first()).toHaveAttribute('open','');
 await expect(page.locator('.pdo-evidence details p').first()).toHaveText(`Evidence 1: ${longText}`.trim());
 await page.getByRole('button',{name:'Reset',exact:true}).click();
 await expect(page.getByLabel('Department',{exact:true})).toHaveValue('');
});

test('card grids use consistent spacing and aligned boundaries at each breakpoint',async({page})=>{
 await setup(page);

 for(const width of [1920,1440,1366,1024,768,390]){
  await page.setViewportSize({width,height:1050});
  const selector='.pi-kpis,.pdo-grid';
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  const grids=await page.locator(selector).evaluateAll(elements=>elements.map(element=>{
   const style=getComputedStyle(element);return {gap:parseFloat(style.gap),cards:Array.from(element.children).map(child=>{const r=child.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}})};
  }));
  for(const grid of grids){expect(grid.gap).toBe(width<=700?12:16);for(const card of grid.cards){const sameRow=grid.cards.filter(other=>Math.abs(other.top-card.top)<1);for(const other of sameRow)expect(Math.abs(other.bottom-card.bottom)).toBeLessThan(2);}}
  await page.screenshot({path:`/root/voicedots/artifacts/dashboard-grid-20261014/client-${width}.png`,fullPage:true});
 }
});
