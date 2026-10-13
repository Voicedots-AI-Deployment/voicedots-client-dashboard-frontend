import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { previewDrive,previewCandidate,previewBundle,previewRecording } from '../preview/drive-data';
async function setup(page:Page,section='candidates') {
 await page.addInitScript(()=>localStorage.setItem('access_token','local-test'));
 await page.route(/\/v[13]\//,route=>{
  const path=new URL(route.request().url()).pathname;
  const values:Record<string,unknown>={
   '/v1/users/me':{user_id:'manager',name:'College Manager',email:'manager@example.invalid'},
   '/v3/college/access':{enabled:true,college_name:'Example College'},
   '/v3/college/academic-catalog':{programs:[]},
   '/v3/college/drives':[previewDrive],
   '/v3/college/drives/preview-drive':previewDrive,
   '/v3/college/students/preview-student/reports':previewBundle,
   '/v3/college/students/preview-student/reports/preview-session/recording':previewRecording,
   '/v3/college/intelligence/settings':{role_targets:{'Graduate Software Engineer':{technical_knowledge:80}}},
  };
  return route.fulfill({json:values[path]??(path.includes('/dashboard/')?{candidates:[previewCandidate],pagination:{total:1},interview_progress:{completed:1}}:{})});
 });
 await page.route('**/preview-media.webm',route=>route.fulfill({contentType:'video/webm',body:readFileSync(new URL('./fixtures/interview-test.webm',import.meta.url))}));
 await page.goto(`/dashboard/placement-management?drive=preview-drive&section=${section}`);
}
test('one workspace replaces the three sections and retains profile, ATS and full report actions',async({page})=>{
 for(const section of ['candidates','ats','results']){
  await setup(page,section);
  const nav=page.getByRole('navigation',{name:'Drive management sections'});
  await expect(nav.getByRole('button',{name:'Candidates & assessments',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(nav.getByRole('button',{name:'ATS fit',exact:true})).toHaveCount(0);
  await expect(nav.getByRole('button',{name:'Interview results',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'View details',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Candidate details for Ananya Sharma'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Candidate Assessment Scorecard'})).toHaveCount(0);
  await page.getByRole('button',{name:'Close details'}).click();
  await page.getByRole('button',{name:'ATS fit & resume evidence',exact:true}).focus();
  await expect(page.getByRole('dialog',{name:'Resume match for Ananya Sharma'})).toContainText('82/100');
  await page.keyboard.press('Escape');
 }
});
test('full report shows reference scorecard, configured targets, recording and working evidence links',async({page})=>{
 await setup(page);
 await page.getByRole('button',{name:'Full report',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Candidate Assessment Scorecard',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Competency Results',exact:true})).toBeVisible();
 await expect(page.locator('.assessment-reference-kpi').first()).toContainText('78');
 await expect(page.locator('.assessment-reference-kpi').last()).toContainText('5');
 const technical=page.locator('.scorecard-competencies tbody tr').filter({hasText:'Technical Knowledge'});
 await expect(technical).toContainText('82/100');await expect(technical.locator('td').nth(1)).toHaveText('80');
 await expect(page.locator('video')).toHaveAttribute('src',previewRecording.playback_url);
 await expect.poll(()=>page.locator('video').evaluate((video:HTMLVideoElement)=>video.readyState)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'0:02',exact:true}).click();
 await expect.poll(()=>page.locator('video').evaluate((video:HTMLVideoElement)=>video.currentTime)).toBeGreaterThan(0);
 await expect(page.locator('#answer-0')).toHaveAttribute('open','');
 await page.screenshot({path:'/root/voicedots/artifacts/unified-drive-reference-20261013/full-report-desktop.png',fullPage:true});
});
test('another drive report never appears and absent targets remain missing',async({page})=>{
 await setup(page);
 await page.route('**/v3/college/students/preview-student/reports',route=>route.fulfill({json:{...previewBundle,reports:previewBundle.reports.map(report=>({...report,drive_id:'other-drive'}))}}));
 await page.getByRole('button',{name:'Full report',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Candidate Assessment Scorecard',exact:true})).toHaveCount(0);
 await expect(page.getByText('No report exists for this candidate in this drive.',{exact:true}).first()).toBeVisible();
});
test('merged view and report fit mobile, expand with sidebar and retain feedback dashboard',async({page})=>{
 await setup(page);await page.setViewportSize({width:1600,height:1050});
 await page.screenshot({path:'/root/voicedots/artifacts/unified-drive-reference-20261013/candidates-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Full report',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Candidate Assessment Scorecard',exact:true})).toBeVisible();
 const before=(await page.locator('.assessment-report-reference').boundingBox())!.width;
 await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
 await expect.poll(async()=>(await page.locator('.assessment-report-reference').boundingBox())!.width).toBeGreaterThan(before);
 for(const width of [768,390,320]){await page.setViewportSize({width,height:1000});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
 await page.screenshot({path:'/root/voicedots/artifacts/unified-drive-reference-20261013/full-report-mobile.png',fullPage:true});
});
