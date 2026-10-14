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
 await page.route('**/preview-media.webm',route=>route.fulfill({contentType:'video/mp4',body:readFileSync(new URL('./fixtures/interview-seek-test.mp4',import.meta.url))}));
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

test('attempt selector changes report and recording without mixing evidence',async({page})=>{
 await setup(page);
 const first=previewBundle.reports[0];
 await page.route('**/v3/college/students/preview-student/reports',route=>route.fulfill({json:{...previewBundle,reports:[{...first,session_id:'second-session',attempt_number:2,overall_score:91},first]}}));
 await page.route('**/v3/college/students/preview-student/reports/second-session/recording',route=>route.fulfill({json:{status:'missing'}}));
 await page.getByRole('button',{name:'Full report',exact:true}).click();
 await expect(page.getByLabel('Interview attempt')).toHaveValue('second-session');
 await expect(page.locator('.assessment-reference-kpi').first()).toContainText('91');
 await page.getByLabel('Interview attempt').selectOption('preview-session');
 await expect(page.locator('.assessment-reference-kpi').first()).toContainText('78');
 await expect(page.locator('video')).toHaveAttribute('src',previewRecording.playback_url);
 const decision=page.locator('#decision');
 await expect.poll(()=>decision.evaluate(e=>getComputedStyle(e).display)).toBe('grid');
 const followup=page.locator('.scorecard-employer-followup');
 await expect.poll(()=>followup.evaluate(e=>getComputedStyle(e).display)).toBe('flex');
 await page.screenshot({path:'/root/voicedots/artifacts/candidate-filters-20261014/report-aligned.png',fullPage:true});
});
test('ATS fit opens mandatory core preferred evidence and resume details',async({page})=>{
 await setup(page);
 await page.route('**/v3/college/drives/preview-drive/dashboard/ats-fit?*',route=>route.fulfill({json:{candidates:[{...previewCandidate,mandatory_coverage:'1/1',core_coverage:'0/1',preferred_coverage:'1/1',skills:[{skill:'SQL',priority:'mandatory',match_status:'FULL_MATCH',evidence_text:'Built SQL queries'},{skill:'Testing',priority:'core',match_status:'NO_EVIDENCE'},{skill:'Git',priority:'preferred',match_status:'RELATED_EVIDENCE'}]}]}}));
 await page.getByRole('button',{name:'ATS fit',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'ATS fit details for Ananya Sharma'});
 await expect(dialog).toContainText('Mandatory / Core / Preferred');await expect(dialog).toContainText('Full evidence (1)');await expect(dialog).toContainText('Related evidence (1)');await expect(dialog).toContainText('No evidence (1)');await expect(dialog.getByText('SQL',{exact:true})).toHaveClass(/bg-emerald-100/);await expect(dialog.getByText('Git',{exact:true})).toHaveClass(/bg-amber-100/);await expect(dialog.getByText('Testing',{exact:true})).toHaveClass(/bg-rose-100/);await expect(dialog).toContainText('Original resume');
 await page.getByRole('button',{name:'Close ATS fit'}).click();await expect(dialog).toHaveCount(0);
});

test('report review player, timeline and attempt navigation work without a page reload',async({page})=>{
 await setup(page);
 const first=previewBundle.reports[0];
 await page.route('**/v3/college/students/preview-student/reports',route=>route.fulfill({json:{...previewBundle,reports:[{...first,session_id:'second-session',attempt_number:2,overall_score:91,assignment_status:'completed',detail:{...first.detail,overall_score:91,question_reviews:[{question:'Second attempt only question',answer:'Second attempt answer',asked_at:'2026-10-11T09:42:02Z'}]}},first]}}));
 await page.route('**/v3/college/students/preview-student/reports/second-session/recording',route=>route.fulfill({json:previewRecording}));
 await page.getByRole('button',{name:'Full report',exact:true}).click();
 const navigator=page.getByRole('region',{name:'Attempt navigator'});
 await expect(navigator).toContainText('Attempt 2');
 await expect(page.locator('.assessment-reference-kpi').first()).toContainText('91');
 await navigator.getByRole('button',{name:'Previous attempt'}).click();
 await expect(page.locator('.assessment-reference-kpi').first()).toContainText('78');
 await expect(page.getByRole('group',{name:'Interview evidence timeline'})).toBeVisible();
 await expect(page.getByRole('group',{name:'Video playback controls'})).toBeVisible();
 await expect(page.locator('video')).not.toHaveAttribute('controls','');
 await expect.poll(()=>page.locator('video').evaluate((video:HTMLVideoElement)=>video.readyState)).toBeGreaterThan(0);
 await expect(page.getByRole('slider',{name:'Seek recording'})).toBeEnabled();
 await page.getByRole('slider',{name:'Seek recording'}).fill('1.5');
 await expect.poll(async()=>Number(await page.getByRole('slider',{name:'Seek recording'}).inputValue())).toBeGreaterThan(1);
 await page.getByRole('button',{name:'Mute',exact:true}).click();
 expect(await page.locator('video').evaluate((video:HTMLVideoElement)=>video.muted)).toBe(true);
 await page.getByRole('slider',{name:'Video volume'}).fill('0.5');
 await expect.poll(()=>page.locator('video').evaluate((video:HTMLVideoElement)=>video.volume)).toBeCloseTo(0.5,1);
 await page.getByRole('combobox',{name:'Playback speed'}).selectOption('1.5');
 await expect.poll(()=>page.locator('video').evaluate((video:HTMLVideoElement)=>video.playbackRate)).toBe(1.5);
 await page.getByRole('button',{name:'Fullscreen',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
 const viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));
 const fullscreenVideo=await page.locator('video').boundingBox();
 expect(fullscreenVideo!.width).toBeCloseTo(viewport.width,0);
 expect(fullscreenVideo!.height).toBeCloseTo(viewport.height,0);
 await page.locator('.evidence-marker.question').first().click();
 await expect.poll(()=>page.locator('video').evaluate((video:HTMLVideoElement)=>video.currentTime)).toBeGreaterThanOrEqual(2);
 await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>document.fullscreenElement)).toBe(null);
});

test('full report layout holds at desktop tablet and phone widths',async({page})=>{
 await setup(page);
 await page.getByRole('button',{name:'Full report',exact:true}).click();
 for(const width of [1920,1440,1366,1024,768,390]){
  await page.setViewportSize({width,height:900});
  await expect(page.getByRole('group',{name:'Interview evidence timeline'})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
  expect(overflow,`${width}px viewport has horizontal scrolling`).toBe(false);
  const frame=await page.locator('.review-video-shell').boundingBox();
  const controls=await page.getByRole('group',{name:'Video playback controls'}).boundingBox();
  expect(controls!.y+controls!.height).toBeLessThanOrEqual(frame!.y+frame!.height+2);
  expect(Math.abs(frame!.height-frame!.width*9/16)).toBeLessThan(2);
  await expect(page.locator('.review-video-shell .review-marker-legend')).toContainText('Officer notes');
  await page.screenshot({path:`/root/voicedots/artifacts/candidate-filters-20261014/report-review-${width}.png`,fullPage:true});
 }
});
