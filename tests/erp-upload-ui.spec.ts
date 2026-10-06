import {test,expect,type Page} from '@playwright/test';
const catalogs:Record<string,unknown[]>={departments:[{code:'CSE',display_name:'Computer Science and Engineering in Artificial Intelligence and Machine Learning',program:'BTECH'},{code:'ECE',display_name:'Electronics and Communication Engineering',program:'BTECH'}],years:[{id:'year-1',label:'2026-27'},{id:'year-2',label:'2025-26'}],semesters:[{id:'sem-1',academic_year_id:'year-1',number:1},{id:'sem-2',academic_year_id:'year-2',number:2}],batches:[{id:'batch-1',label:'2023-2027',program_code:'BTECH'}],sections:[{id:'section-1',batch_id:'batch-1',department_code:'CSE'}]};
async function setup(page:Page){
 await page.addInitScript(()=>localStorage.setItem('access_token','ui-test'));
 await page.route(/\/v[13]\//,route=>{
  const path=new URL(route.request().url()).pathname;
  const data:Record<string,unknown>={'/v1/users/me':{user_id:'client-1',name:'Manager',email:'test@example.edu'},'/v3/college/access':{enabled:true,college_id:'college-1',college_name:'Example'},'/v3/college/erp/me':{role:'institution_admin',permissions:['*'],assignments:[]},'/v3/email/capabilities':{email_enabled:false}};
  return route.fulfill({json:path.includes('/catalog/')?{items:catalogs[path.split('/').pop()!]||[]}:data[path]||{items:[]}});
 });
 await page.goto('/dashboard/erp');
 await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Class Timetable',exact:true}).click();
}
async function upload(page:Page){await page.getByRole('button',{name:'Upload',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();}
const workbook={name:'attendance.csv',mimeType:'text/csv',buffer:Buffer.from('Roll No,Status\n12345,Present')};
test('file-picker cancellation keeps modal and selections usable',async({page})=>{
 await setup(page);await upload(page);
 await page.getByLabel('Upload department').selectOption('CSE');
 await page.getByLabel('Upload academic year').selectOption('year-1');
 await page.getByLabel('Upload batch').selectOption('batch-1');
 await page.getByLabel('Service upload file').setInputFiles(workbook);
 await page.getByLabel('Service upload file').dispatchEvent('cancel',{bubbles:true});
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByLabel('Upload department')).toHaveValue('CSE');
 await expect(page.getByLabel('Upload batch')).toHaveValue('batch-1');
 await expect(page.getByText('attendance.csv',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Check records',exact:true})).toBeEnabled();
 await page.getByLabel('Upload semester').selectOption('sem-1');
 await expect(page.getByLabel('Upload semester')).toHaveValue('sem-1');
 await page.getByRole('button',{name:'Close upload'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Upload',exact:true})).toBeFocused();
});
test('Escape closes modal and repeated reopening restores page interaction',async({page})=>{
 await setup(page);
 for(let i=0;i<3;i++){
  await upload(page);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
 }
 await page.getByLabel('Filter department').selectOption('ECE');await expect(page.getByLabel('Filter department')).toHaveValue('ECE');
});
test('native selects apply values immediately and reset dependent context',async({page})=>{
 await setup(page);await upload(page);
 for(const label of ['Upload department','Upload academic year','Upload semester','Upload batch'])await expect(page.getByLabel(label)).toHaveJSProperty('tagName','SELECT');
 await expect(page.getByLabel('Upload academic year')).toBeDisabled();
 await page.getByLabel('Upload department').selectOption('CSE');
 await page.getByLabel('Upload academic year').selectOption('year-1');await page.getByLabel('Upload semester').selectOption('sem-1');await page.getByLabel('Upload batch').selectOption('batch-1');
 await page.getByLabel('Upload academic year').selectOption('year-2');
 await expect(page.getByLabel('Upload semester')).toHaveValue('');await expect(page.getByLabel('Upload batch')).toHaveValue('');
 await expect(page.getByLabel('Upload semester').locator('option[value="sem-1"]')).toHaveCount(0);
});
for(const width of [390,768,1440,1920])test(`upload and main filters fit ${width}px viewport`,async({page})=>{
 await page.setViewportSize({width,height:900});await setup(page);
 await expect(page.locator('.erp-filter-grid select')).toHaveCount(4);
 const fields=await page.locator('.erp-filter-grid select').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width};}));
 expect(fields).toHaveLength(4);for(const field of fields){expect(field.x).toBeGreaterThanOrEqual(0);expect(field.right).toBeLessThanOrEqual(width);}
 if(width>=1440)expect(fields[0].width).toBeGreaterThan(fields[1].width);
 await upload(page);const modal=page.getByRole('dialog');const bounds=await modal.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
 expect(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 const uploadFields=await modal.locator('.erp-upload-context select').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));
 if(width>=1440)expect(uploadFields[0]).toBeGreaterThan(uploadFields[1]);
 await page.screenshot({path:`/tmp/erp-upload-${width}.png`,fullPage:true});
});
test('review and commit preserve conflicts, errors and upload colours',async({page})=>{
 await setup(page);
 await page.route('**/v3/college/erp/records/timetable/preview',r=>r.fulfill({json:{batch_id:'batch-upload-123',upload_color:'#8b5cf6',rows:[{id:'valid',row_number:2,status:'valid',original_values:{Subject:'Chemistry'},issues:[]},{id:'conflict',row_number:3,status:'conflict',original_values:{Subject:'Maths'},issues:[{action:'Approve existing record update'}]},{id:'invalid',row_number:4,status:'invalid',original_values:{Subject:'Unknown'},issues:[{action:'Subject not found'}]}]}}));
 await page.route('**/v3/college/erp/records/timetable/commit',r=>r.fulfill({json:{batch_id:'batch-upload-123',upload_color:'#8b5cf6',committed:2,skipped:1}}));
 await upload(page);await page.getByLabel('Upload department').selectOption('CSE');await page.getByLabel('Upload academic year').selectOption('year-1');await page.getByLabel('Upload batch').selectOption('batch-1');await page.getByLabel('Service upload file').setInputFiles(workbook);
 await page.getByRole('button',{name:'Check records',exact:true}).click();
 for(const label of ['Valid (1)','Conflicts (1)','Errors (1)'])await expect(page.getByRole('button',{name:label,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Errors (1)',exact:true}).click();await expect(page.getByLabel('Import row 4')).toBeDisabled();
 await page.getByRole('button',{name:'Conflicts (1)',exact:true}).click();await page.getByLabel('Import row 3').check();
 await expect(page.getByRole('button',{name:'Import 2 selected rows',exact:true})).toBeDisabled();await page.getByLabel('Skip the 1 unselected rows').check();
 const request=page.waitForRequest(r=>r.url().endsWith('/timetable/commit')&&r.method()==='POST');await page.getByRole('button',{name:'Import 2 selected rows',exact:true}).click();expect((await request).postDataJSON()).toEqual({batch_id:'batch-upload-123',approved_rows:['valid','conflict']});
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByText('2 records saved. 1 rows skipped.',{exact:true})).toBeVisible();
 await expect(page.locator('.erp-upload-batch-marker')).toHaveCSS('border-left-color','rgb(139, 92, 246)');
});
test('preview errors leave selections available for retry',async({page})=>{
 await setup(page);await page.route('**/v3/college/erp/records/timetable/preview',r=>r.fulfill({status:422,json:{detail:'Invalid workbook columns'}}));
 await upload(page);await page.getByLabel('Upload department').selectOption('CSE');await page.getByLabel('Upload academic year').selectOption('year-1');await page.getByLabel('Upload batch').selectOption('batch-1');await page.getByLabel('Service upload file').setInputFiles(workbook);await page.getByRole('button',{name:'Check records',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();await expect(page.getByRole('button',{name:'Check records',exact:true})).toBeEnabled();await expect(page.getByLabel('Upload department')).toHaveValue('CSE');
});
test('attendance requires semester and template remains downloadable',async({page})=>{
 await setup(page);await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Attendance',exact:true}).click();await upload(page);
 await page.getByLabel('Upload department').selectOption('CSE');await page.getByLabel('Upload academic year').selectOption('year-1');await page.getByLabel('Upload batch').selectOption('batch-1');await page.getByLabel('Service upload file').setInputFiles(workbook);
 await expect(page.getByRole('button',{name:'Check records',exact:true})).toBeDisabled();await page.getByLabel('Upload semester').selectOption('sem-1');await expect(page.getByRole('button',{name:'Check records',exact:true})).toBeEnabled();
 await page.route('**/v3/college/erp/records/attendance/download?template=true',r=>r.fulfill({contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',body:Buffer.from('mock')}));
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download upload template',exact:true}).click();expect((await pending).suggestedFilename()).toBe('attendance-template.xlsx');
});
test('all eleven ERP services retain upload download and view actions',async({page})=>{
 await setup(page);
 for(const service of ['Class Timetable','Attendance','Internal Marks','Semester Marks','Fees','Homework','Circulars','Exam Schedules','OPAC Search','Hostel Attendance','Mess Attendance']){
  await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:service,exact:true}).click();
  const actions=page.getByRole('region',{name:'Bulk data actions'});
  for(const action of ['Upload','Download','View'])await expect(actions.getByRole('button',{name:action,exact:true})).toBeVisible();
  await upload(page);await expect(page.getByLabel('Service upload file')).toHaveAttribute('accept','.xlsx,.csv');await page.getByRole('button',{name:'Close upload'}).click();
 }
});
test('academic filters persist across services and prefill uploads',async({page})=>{
 await setup(page);await page.getByLabel('Filter department').selectOption('CSE');await page.getByLabel('Filter academic year').selectOption('year-1');await page.getByLabel('Filter semester').selectOption('sem-1');await page.getByLabel('Filter batch').selectOption('batch-1');
 await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Internal Marks',exact:true}).click();
 for(const [label,value] of [['Filter department','CSE'],['Filter academic year','year-1'],['Filter semester','sem-1'],['Filter batch','batch-1']])await expect(page.getByLabel(label)).toHaveValue(value);
 await upload(page);for(const [label,value] of [['Upload department','CSE'],['Upload academic year','year-1'],['Upload semester','sem-1'],['Upload batch','batch-1']])await expect(page.getByLabel(label)).toHaveValue(value);
 await page.getByRole('button',{name:'Close upload'}).click();await page.reload();await expect(page.getByLabel('Filter department')).toHaveValue('CSE');
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(page.getByLabel('Filter department')).toHaveValue('');
});
test('modal remains usable in dark theme with keyboard focus trapped',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Switch to dark theme'}).click();await upload(page);
 const modal=page.getByRole('dialog');await expect(page.getByRole('button',{name:'Close upload'})).toBeFocused();
 for(let i=0;i<12;i++){await page.keyboard.press('Tab');expect(await modal.evaluate(el=>el.contains(document.activeElement)||document.activeElement===document.body)).toBe(true);}
 await page.screenshot({path:'/tmp/erp-upload-dark.png'});await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);
});
