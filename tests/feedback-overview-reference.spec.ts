import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const sample=JSON.parse(readFileSync(new URL('../preview/feedback-data.json',import.meta.url),'utf8'));
async function setup(page:import('@playwright/test').Page){
 await page.addInitScript(()=>localStorage.setItem('access_token','local-preview-only'));
 await page.route(/\/v[13]\//,route=>{const path=new URL(route.request().url()).pathname;const responses:Record<string,unknown>={'/v1/users/me':{user_id:'preview',name:'College Manager',email:'preview@example.invalid'},'/v3/college/access':{enabled:true,college_name:'Example Engineering College',timezone:'Asia/Kolkata'},'/v3/college/drives':sample.by_drive.map((row:{id:string;name:string})=>({id:row.id,company_name:row.name,role_title:'Campus placement'}))};return route.fulfill({json:path==='/v3/college/feedback/dashboard'?sample:responses[path]||{}});});
 await page.goto('/dashboard/placement-management?view=feedback');
 await expect(page.locator('.feedback-kpis')).toContainText('1032');
 await expect(page.locator('.feedback-dashboard').getByRole('button',{name:'Refresh',exact:true})).toBeEnabled();
}
test('overview matches reference charts and keeps donut text centered on every viewport',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
 await expect(page.getByRole('heading',{name:'Common student suggestions'})).toBeVisible();
 await expect(page.getByRole('columnheader',{name:'College',exact:true})).toBeVisible();
 await expect(page.locator('.fo-chart-legend')).toContainText('Average rating');
 await expect(page.locator('.fo-batch-legend li')).toHaveCount(4);
 await expect(page.locator('.fo-donut-center')).toContainText('1,032');
 for(const width of [1600,1366,768,390,320]){
  await page.setViewportSize({width,height:1050});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  const ring=await page.locator('.fo-donut').boundingBox(),center=await page.locator('.fo-donut-center').boundingBox();
  expect(Math.abs(ring!.width-ring!.height)).toBeLessThan(1);
  expect(Math.abs((ring!.x+ring!.width/2)-(center!.x+center!.width/2))).toBeLessThan(1);
  expect(Math.abs((ring!.y+ring!.height/2)-(center!.y+center!.height/2))).toBeLessThan(1);
  if(width===1600||width===390)await page.screenshot({path:`/root/voicedots/artifacts/feedback-overview-reference-20261013/dashboard-${width}.png`,fullPage:true});
 }
 expect(errors).toEqual([]);
});
test('suggestions are based on real provided comments and filter action focuses existing controls',async({page})=>{
 await setup(page);await expect(page.locator('.fo-suggestions')).toContainText('More technical questions');
 await page.getByRole('button',{name:'Filter',exact:true}).click();await expect(page.locator('#feedback-overview-filters select').first()).toBeFocused();
 await page.getByText('View drive labels and values',{exact:true}).click();await expect(page.locator('.fo-chart-data')).toContainText('Tech Mahindra');
});
test('per-drive feedback keeps its original charts and layout',async({page})=>{
 await setup(page);await page.goto('/dashboard/placement-management?drive=drive-1&section=feedback');
 await expect(page.locator('.feedback-kpis')).toContainText('1032');
 await expect(page.locator('.feedback-dashboard')).not.toHaveClass(/feedback-overview/);
 await expect(page.locator('.feedback-overview-charts')).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Topics to review'})).toBeVisible();
 await expect(page.locator('.feedback-chart .recharts-wrapper')).toHaveCount(1);
});
