import {test,expect,type Page} from '@playwright/test';
const columns=[{key:'roll_number',label:'Student ID'},{key:'full_name',label:'Student name'},{key:'email',label:'Email'},{key:'program',label:'Program'},{key:'department_code',label:'Department'},{key:'cgpa',label:'CGPA'}];
const row={row_number:2,values:{roll_number:'001',full_name:'Ananya Sharma',email:'ananya@example.edu',program:'B.Tech',department_code:'CSE',cgpa:'85'},issues:[{field:'cgpa',message:'Enter a number from 0 to 10, for example 8.25. Percentages are not CGPA.'}],warnings:[],action:'create'};
const review={status:'review',columns,rows:[row],catalog_rows:[],catalog_issues:[],catalog:[{code:'B.Tech',display_name:'Bachelor of Technology',departments:[{code:'CSE',display_name:'Computer Science'}]}],errors_count:1,duplicates_count:0,valid_count:0};
async function setup(page:Page){
 await page.addInitScript(()=>localStorage.setItem('access_token','test'));
 await page.route(/\/v[13]\//,route=>{const path=new URL(route.request().url()).pathname;const values:Record<string,unknown>={
 '/v1/users/me':{user_id:'client-1',name:'College Manager',email:'manager@example.edu'},
 '/v3/college/access':{enabled:true,college_name:'Example College'},
 '/v3/college/students':{items:[],total:0},'/v3/college/attendance/setup':{classes:[],students:[],staff:[]},
 '/v3/college/roster-options':{batches:[],graduation_years:[],statuses:['active']},'/v3/college/academic-catalog':{programs:review.catalog,graduation_years:[]},
 };return route.fulfill({json:values[path]||{}});});
 await page.goto('/dashboard/attendance');await page.getByText('Import students or update CGPA in bulk',{exact:true}).click();
}
async function upload(page:Page){await page.getByLabel('Student import file',{exact:true}).setInputFiles({name:'roster.csv',mimeType:'text/csv',buffer:Buffer.from('Student ID,Student name,CGPA\n001,Ananya,85')});await page.getByRole('button',{name:'Review file',exact:true}).click();}
const saved={records_created:1,records_updated:0,records_processed:1,errors_count:0,errors_sample:[],warnings_count:0,warnings_sample:[],welcome_emails_queued:1};

test('review is read-only, edit errors in place, recheck and explicitly confirm',async({page})=>{
 await setup(page);let previews=0,commits=0;
 await page.route('**/v3/college/students/upload?**',route=>{
  expect(route.request().headers()['content-type']).toContain('multipart/form-data; boundary=');
  if(route.request().url().includes('reviewed=true')){commits++;expect(route.request().postDataBuffer()?.toString()).toContain('"cgpa":"8.25"');return route.fulfill({json:saved});}
  previews++;return route.fulfill({json:previews===1?review:{...review,errors_count:0,valid_count:1,rows:[{...row,values:{...row.values,cgpa:'8.25'},issues:[]}]}});
 });
 await upload(page);expect(commits).toBe(0);await expect(page.getByRole('button',{name:'Confirm import',exact:true})).toBeDisabled();
 const input=page.getByLabel('Row 2 CGPA',{exact:true});await expect(input).toHaveAttribute('aria-invalid','true');await expect(page.getByText('Enter a number from 0 to 10, for example 8.25. Percentages are not CGPA.')).toBeVisible();
 await input.fill('8.25');await expect(page.getByText('Changes not checked.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Recheck rows',exact:true}).click();
 await expect(page.getByRole('button',{name:'Confirm import',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Confirm import',exact:true}).click();await expect(page.getByText('1 created · 0 updated · 0 errors · 0 warnings',{exact:true})).toBeVisible();expect(commits).toBe(1);
});

test('exact duplicates can be removed and conflicting rows expose their original row numbers',async({page})=>{
 await setup(page);await page.route('**/v3/college/students/upload?**',route=>route.fulfill({json:{...review,duplicates_count:1,rows:[row,{...row,row_number:7,issues:[],action:'skip_duplicate',warnings:['Exact duplicate of row 2; this row will be skipped.']},{...row,row_number:12,issues:[{field:'roll_number',message:'Student ID conflicts with row 2. Remove one row or correct the Student ID.'}]}]}}));
 await upload(page);await expect(page.getByLabel('Row 12 Student ID',{exact:true})).toHaveAttribute('aria-invalid','true');await page.getByRole('button',{name:'Remove exact duplicates',exact:true}).click();await expect(page.getByLabel('Row 7 Student ID',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Remove row 12',exact:true}).click();await expect(page.getByLabel('Row 12 Student ID',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Confirm import',exact:true})).toBeDisabled();
});

test('academic catalog errors stay editable and valid program choices appear next to rows',async({page})=>{
 await setup(page);await page.route('**/v3/college/students/upload?**',route=>route.fulfill({json:{...review,catalog_rows:[{program_code:'MCA',program_name:'MCA',duration_years:'12',department_code:'',department_name:''}],catalog_issues:[{row_number:2,field:'Academic Setup',message:'Duration years must be 1–8'}]}}));
 await upload(page);await expect(page.getByRole('alert')).toContainText('Academic Catalog row 2');await page.getByText('Review academic mappings (1)',{exact:true}).click();await page.getByLabel('Academic row 2 Duration years',{exact:true}).fill('2');await expect(page.getByRole('button',{name:'Confirm import',exact:true})).toBeDisabled();await expect(page.locator('#import-2-program option')).toHaveAttribute('value','B.Tech');
});

test('CGPA review uses only identity and score, with a separate confirmation action',async({page})=>{
 await setup(page);await page.getByLabel('Student import action').selectOption('cgpa');let requests:string[]=[];
 await page.route('**/v3/college/students/upload?**',route=>{requests.push(route.request().url());return route.fulfill({json:requests.length===1?{...review,columns:[columns[0],columns[5]],errors_count:0,valid_count:1,rows:[{...row,values:{roll_number:'001',cgpa:'8.25'},issues:[],action:'update'}]}:{...saved,records_created:0,records_updated:1}});});
 await upload(page);await expect(page.getByRole('table',{name:'Student import review'})).not.toContainText('Student name');await page.getByRole('button',{name:'Confirm CGPA update',exact:true}).click();await expect(page.getByText('0 created · 1 updated · 0 errors · 0 warnings',{exact:true})).toBeVisible();expect(requests).toEqual([expect.stringContaining('mode=cgpa&preview=true'),expect.stringContaining('mode=cgpa&reviewed=true')]);
});

test('clear server errors and correction table fit mobile without page overflow',async({page})=>{
 await setup(page);let requests=0;await page.route('**/v3/college/students/upload?**',route=>route.fulfill(++requests===1?{status:400,json:{detail:'Repeated column headings. Keep Student ID only once.'}}:{json:review}));
 await upload(page);await expect(page.getByRole('alert')).toContainText('Repeated column headings');await expect(page.getByRole('button',{name:'Confirm import',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Review file',exact:true}).click();await expect(page.getByLabel('Row 2 CGPA',{exact:true})).toBeVisible();
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:'/root/voicedots/artifacts/roster-review-mobile-20261013.png',fullPage:true});
});

test('templates have friendly download names and upload guide distinguishes Sheets and CGPA format',async({page})=>{
 await setup(page);await expect(page.getByRole('region',{name:'Student upload guide'})).toContainText('Google Sheets');await page.route('**/v3/college/students/template?**',route=>route.fulfill({contentType:'text/csv',body:'Student ID,CGPA\n'}));await page.getByLabel('Student import action').selectOption('cgpa');const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download CSV template',exact:true}).click();expect((await download).suggestedFilename()).toBe('student-cgpa-template.csv');await expect(page.getByRole('region',{name:'Student upload guide'})).toContainText('2027CS001,8.25');
});
