import {test,expect} from '@playwright/test';
import {monday,istDay,isLive} from '../src/pages/dashboard/TimetableWeek';
test('IST week and ongoing period boundaries',()=>{
 const before=Date.parse('2026-10-11T18:29:59Z'),after=Date.parse('2026-10-11T18:30:00Z');
 expect(new Date(monday(before)).toISOString()).toBe('2026-10-05T00:00:00.000Z');
 expect(new Date(monday(after)).toISOString()).toBe('2026-10-12T00:00:00.000Z');
 const now=Date.parse('2026-10-05T03:30:00Z');
 expect(isLive(now,istDay(now),'09:00','09:50')).toBe(true);
 expect(isLive(now+50*60000,istDay(now),'09:00','09:50')).toBe(false);
 expect(isLive(now,istDay(now)+86400000,'09:00','09:50')).toBe(false);
});
test('client and teacher shared timetable week view navigates and rolls over',async({page})=>{
 await page.clock.install({time:new Date('2026-10-11T18:29:58Z')});

 await page.addInitScript(()=>localStorage.setItem('access_token','ui-test'));
 await page.route(/\/v[13]\//,route=>{
  const path=new URL(route.request().url()).pathname;
  const data:Record<string,unknown>={'/v1/users/me':{user_id:'client-1',name:'Manager'},'/v3/college/access':{enabled:true,college_id:'college-1',college_name:'Example'},'/v3/college/erp/me':{role:'institution_admin',permissions:['*'],assignments:[]}};
  const items=path.endsWith('/records/timetable')?[{id:'slot-1',weekday:0,starts_at:'09:00:00',ends_at:'09:50:00',subject_id:'subject-1',upload_batch_id:'upload-1',upload_filename:'schedule.xlsx',active:true}]:[];
  return route.fulfill({json:data[path]||{items}});
 });
 await page.goto('/dashboard/erp');
 await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Class Timetable',exact:true}).click();
 await page.getByRole('button',{name:'Open upload',exact:true}).click();
 // Freeze the running test clock before changing wall time; never rewind pauseAt.
 const freezeAt = await page.evaluate(() => Date.now() + 1000);
 await page.clock.pauseAt(new Date(freezeAt));
 await page.clock.setSystemTime(new Date('2026-10-11T18:29:58Z'));
 await page.clock.runFor(1);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(page.locator('.erp-week-toolbar')).toContainText('5 Oct – 11 Oct 2026');
 await page.clock.fastForward(3000);
 await expect(page.locator('.erp-week-toolbar')).toContainText('12 Oct – 18 Oct 2026');
 await expect(page.locator('thead .erp-week-today')).toContainText('Monday');
 await page.getByRole('button',{name:'Next week',exact:true}).click();
 await expect(page.locator('.erp-week-toolbar')).toContainText('19 Oct – 25 Oct 2026');
 await page.getByRole('button',{name:'Today',exact:true}).click();
 await expect(page.getByRole('rowheader').first()).toHaveText('9:00 AM – 9:50 AM');
 await page.screenshot({path:'/tmp/timetable-week-client.png',fullPage:true});
});
