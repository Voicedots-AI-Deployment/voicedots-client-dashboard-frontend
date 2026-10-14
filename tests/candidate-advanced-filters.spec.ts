import {test,expect,type Page} from '@playwright/test';
import {previewDrive,previewCandidate} from '../preview/drive-data';
async function setup(page:Page){
 let last:URL|null=null;
 await page.addInitScript(()=>localStorage.setItem('access_token','local-only'));
 await page.route(/\/v[13]\//,route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  const rows=[previewCandidate,{...previewCandidate,student_id:'pending',full_name:'Pending Candidate',report_ready:false,overall_score:null,ranking_score:null,job_fit_score:null,agent_summary:[],assignment_status:'invited'}];
  const lookup:Record<string,unknown>={'/v1/users/me':{name:'Test manager'},'/v3/college/access':{enabled:true,college_name:'Test college'},'/v3/college/drives/preview-drive':previewDrive,'/v3/college/academic-catalog':{programs:[{code:'B.Tech',display_name:'B.Tech',departments:[{code:'CSE',display_name:'Computer Science'},{code:'ECE',display_name:'Electronics'}]}]}};
  if(path.endsWith('/dashboard/ranking')){if(url.searchParams.get('limit')==='25')last=url;const applied=JSON.parse(url.searchParams.get('filters')||'[]');return route.fulfill({json:{candidates:applied.length?rows.slice(0,1):rows,pagination:{total:applied.length?1:2},filter_options:{department:['CSE','ECE'],program:['B.Tech'],graduation_year:['2026','2027'],batch_label:['2023-2027'],academic_status:['active']}}})}
  return route.fulfill({json:lookup[path]||(path.includes('/dashboard/')?{candidates:rows,interview_progress:{completed:1}}:{})});
 });
 await page.goto('/dashboard/placement-management?drive=preview-drive&section=results');await expect(page.getByRole('button',{name:'Advanced Filters',exact:true})).toBeVisible();
 return ()=>last;
}
test('multi-selects and score ranges combine on the server, survive layout changes and can be removed',async({page})=>{
 const last=await setup(page);await page.getByRole('button',{name:'Advanced Filters',exact:true}).click();const drawer=page.getByRole('dialog',{name:'Advanced Filters'});await expect(drawer).toBeVisible();
 await drawer.getByRole('button',{name:'Add academic filter',exact:true}).click();await drawer.getByLabel('Lower CGPA').fill('7');await drawer.getByLabel('Upper CGPA').fill('9');
 await drawer.getByRole('button',{name:'Add academic filter',exact:true}).click();await drawer.getByLabel('Filter field',{exact:true}).last().selectOption('department');
 const choices=drawer.getByRole('group',{name:'Department options'});await choices.getByRole('checkbox',{name:'CSE',exact:true}).check();await choices.getByRole('checkbox',{name:'ECE',exact:true}).check();
 await drawer.getByRole('button',{name:'Apply Filters',exact:true}).click();await expect(drawer).toHaveCount(0);
 await expect.poll(()=>last()?.searchParams.get('match_mode')).toBe('all');await expect.poll(()=>JSON.parse(last()?.searchParams.get('filters')||'[]').length).toBe(2);
 const rules=JSON.parse(last()!.searchParams.get('filters')!);expect(rules).toContainEqual(expect.objectContaining({field:'department',operator:'is_any_of',values:['CSE','ECE']}));expect(rules).toContainEqual(expect.objectContaining({field:'cgpa',operator:'between',value:'7',value_end:'9'}));
 await expect(page.getByText('Showing 1–1 of 1 candidates',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Table',exact:true}).click();await expect(page.locator('#result-candidate-table')).toBeVisible();await expect(page.getByRole('button',{name:'Advanced Filters (2)',exact:true})).toBeVisible();
 await page.getByRole('button',{name:/^Department:/}).click();await expect.poll(()=>JSON.parse(last()?.searchParams.get('filters')||'[]').length).toBe(1);
 await page.getByRole('button',{name:/^Advanced Filters/}).click();await page.getByRole('button',{name:'Reset All',exact:true}).click();await expect.poll(()=>last()?.searchParams.has('filters')).toBe(false);
});
test('cancel and escape discard edits, invalid CGPA is explained, and the drawer fits phones',async({page})=>{
 const last=await setup(page);
 await page.getByRole('button',{name:'Advanced Filters',exact:true}).click();await page.getByRole('button',{name:'Add academic filter',exact:true}).click();await page.getByLabel('Lower CGPA').fill('11');await page.getByLabel('Upper CGPA').fill('12');await page.getByRole('button',{name:'Apply Filters',exact:true}).click();await expect(page.getByRole('alert')).toContainText('CGPA');expect(last()?.searchParams.has('filters')).toBe(false);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Advanced Filters',exact:true}).click();await expect(page.getByLabel('Filter field',{exact:true})).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.screenshot({path:'/root/voicedots/artifacts/candidate-filters-20261014/drawer-mobile.png',fullPage:true});await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Advanced Filters',exact:true})).toBeFocused();
});
test('cards and table remain readable across widths and unavailable assessments stay compact',async({page})=>{
 await setup(page);await expect(page.getByText('Assessment scores not available yet.',{exact:true})).toBeVisible();
 for(const width of [1920,1440,1024,768,390]){await page.setViewportSize({width,height:1050});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);const cards=await page.locator('#result-candidate-cards>article').all();const first=await cards[0].boundingBox(),second=await cards[1].boundingBox();expect(Math.abs(first!.x-second!.x)).toBeLessThan(1);expect(Math.abs(first!.width-second!.width)).toBeLessThan(1);expect(second!.y).toBeGreaterThanOrEqual(first!.y+first!.height+15);await page.screenshot({path:`/root/voicedots/artifacts/candidate-filters-20261014/cards-${width}.png`,fullPage:true});await page.getByRole('button',{name:'Table',exact:true}).click();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);await page.screenshot({path:`/root/voicedots/artifacts/candidate-filters-20261014/table-${width}.png`,fullPage:true});await page.getByRole('button',{name:'Cards',exact:true}).click();}
});

test('not-available filters are sent even when no numeric value is required',async({page})=>{
 const last=await setup(page);await page.getByRole('button',{name:'Advanced Filters',exact:true}).click();await page.getByRole('button',{name:'Add academic filter',exact:true}).click();await page.getByLabel('Filter operator',{exact:true}).selectOption('is_unavailable');await page.getByRole('button',{name:'Apply Filters',exact:true}).click();await expect.poll(()=>JSON.parse(last()?.searchParams.get('filters')||'[]')[0]?.operator).toBe('is_unavailable');await expect(page.getByRole('button',{name:'CGPA: Not available',exact:true})).toBeVisible();
});
