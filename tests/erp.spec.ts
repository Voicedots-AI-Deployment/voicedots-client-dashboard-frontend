import {test, expect, type Page} from '@playwright/test';
async function setup(page:Page, staff=false, enabled=true){
  await page.addInitScript(()=>localStorage.setItem('access_token','test-session'));
  await page.route(/\/v[13]\//, route=>{
    const path=new URL(route.request().url()).pathname;
    const responses:Record<string,unknown>={
      '/v1/users/me':{user_id:'client-1',name:'College Manager',email:'manager@example.edu',...(staff?{portal_role:'placement_staff'}:{})},
      '/v3/email/capabilities':{email_enabled:false},
      '/v3/college/access':{enabled,college_id:'college-1',college_name:'Example College'},
      '/v3/college/erp/me':{role:staff?'staff':'institution_admin',permissions:staff?['students.read','attendance.read']:['*'],assignments:[]},
      '/v3/college/erp/dashboard':{students:4},
      '/v3/college/erp/students':{items:[]},
      '/v3/college/erp/records/attendance':{items:[]},
    };
    return route.fulfill({json:responses[path]||{items:[]}});
  });
  await page.goto('/dashboard/erp');
}
test('ERP uses Client login and appears as its own dashboard sidebar option',async({page})=>{
  await setup(page);
  await expect(page.getByRole('heading',{name:'Academic operations'})).toBeVisible();
  const services = page.getByRole('navigation',{name:'ERP sections'});
  for (const name of ['Class Timetable','Attendance','Internal Marks','Semester Marks','Fees','Homework','Circulars','Exam Schedules','OPAC Search','Hostel Attendance','Mess Attendance']) {
    await expect(services.getByRole('button',{name,exact:true})).toBeVisible();
  }
  await expect(services.getByRole('button')).toHaveCount(11);

  await expect(page.locator('aside').first().getByRole('button',{name:'ERP',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Staff sign in'})).toHaveCount(0);
  await page.getByLabel('Manage ERP',{exact:true}).selectOption('students');
  await expect(page.getByRole('heading',{name:'Students & Families',exact:true})).toBeVisible();
});
test('existing Client staff can open ERP with scoped modules',async({page})=>{
  await setup(page,true);
  await expect(page).toHaveURL(/\/dashboard\/erp$/);
  await expect(page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Attendance',exact:true})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Staff access',exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Manage ERP',{exact:true}).locator('option[value=imports]')).toHaveCount(0);
});
test('unassigned Client accounts cannot open institution ERP',async({page})=>{
  await setup(page,false,false);
  await expect(page.getByRole('heading',{name:'ERP access required'})).toBeVisible();
  await expect(page.locator('.erp-shell')).toHaveCount(0);
});

test('ERP uses top section options and remembers the selected section',async({page})=>{
 await setup(page);
 await expect(page.locator('.erp-sidebar')).toHaveCount(0);
 await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Fees',exact:true}).click();
 await expect(page).toHaveURL(/section=fee-accounts/);
 await expect(page.getByLabel('Fees record type',{exact:true})).toBeVisible();
 await page.getByLabel('Fees record type',{exact:true}).selectOption('payments');
 await expect(page.getByRole('heading',{name:'Fee payments',exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('heading',{name:'Fee payments',exact:true})).toBeVisible();
});
test('all eleven services offer bulk upload download and view',async({page})=>{
 await setup(page);
 for(const name of ['Class Timetable','Attendance','Internal Marks','Semester Marks','Fees','Homework','Circulars','Exam Schedules','OPAC Search','Hostel Attendance','Mess Attendance']){
  await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name,exact:true}).click();
  const actions=page.getByRole('region',{name:'Bulk data actions'});
  for(const action of ['Upload','Download','View'])await expect(actions.getByRole('button',{name:action,exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Add record',exact:true})).toHaveCount(0);
 }
 await page.getByLabel('Manage ERP',{exact:true}).selectOption('students');
 await expect(page.getByRole('button',{name:'Add student',exact:true})).toHaveCount(0);
});
test('service bulk import selects context and reviews counted rows before commit',async({page})=>{
 await setup(page);
 const catalogs:Record<string,unknown[]>={departments:[{code:'CSE',display_name:'Computer Science',program:'BTECH'}],years:[{id:'year-1',label:'2026–27'}],semesters:[{id:'semester-1',academic_year_id:'year-1',number:1},{id:'other-semester',academic_year_id:'other-year',number:2}],batches:[{id:'batch-1',label:'2026 intake',program_code:'BTECH'}],sections:[{id:'class-1',batch_id:'batch-1',department_code:'CSE',name:'A'}]};
 await page.route('**/v3/college/erp/catalog/**',r=>r.fulfill({json:{items:catalogs[new URL(r.request().url()).pathname.split('/').pop()!]||[]}}));
 await page.route('**/v3/college/erp/records/fee-accounts/preview',r=>r.fulfill({json:{batch_id:'bulk-1',rows:[{id:'valid-1',row_number:2,status:'valid',original_values:{'Student Roll Number':'TEST001'},issues:[]},{id:'update-1',row_number:3,status:'conflict',original_values:{'Student Roll Number':'TEST002'},issues:[{action:'Existing record requires approval.'}]},{id:'error-1',row_number:4,status:'invalid',original_values:{'Total Fee':-1},issues:[{action:'Total fee must be non-negative.'}]}]}}));
 await page.route('**/v3/college/erp/records/fee-accounts/commit',r=>r.fulfill({json:{committed:2,skipped:1}}));
 await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Fees',exact:true}).click();
 await page.getByRole('button',{name:'Upload',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Upload records in bulk'})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Upload',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Upload',exact:true}).click();
 await page.getByRole('button',{name:'Close upload'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'Upload',exact:true}).click();
 await page.getByLabel('Upload department').selectOption('CSE');await page.getByLabel('Upload academic year').selectOption('year-1');await page.getByLabel('Upload batch').selectOption('batch-1');
 await expect(page.getByLabel('Upload semester').locator('option[value=other-semester]')).toHaveCount(0);
 await page.getByLabel('Upload semester').selectOption('semester-1');
 await page.getByLabel('Service upload file').setInputFiles({name:'fees.csv',mimeType:'text/csv',buffer:Buffer.from('Student Roll Number,Total Fee\nTEST001,1000')});
 await page.getByRole('button',{name:'Check records',exact:true}).click();
 const reportDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download correction report',exact:true}).click();const report=await reportDownload;expect(report.suggestedFilename()).toBe('fee-accounts-correction-report.csv');
 for(const name of ['Valid (1)','Conflicts (1)','Errors (1)'])await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
 await expect(page.getByText('View uploaded values',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Conflicts (1)',exact:true}).click();await page.getByLabel('Import row 3').check();
 await expect(page.getByRole('button',{name:'Import 2 selected rows',exact:true})).toBeDisabled();
 await page.getByLabel('Skip the 1 unselected rows').check();
 const pending=page.waitForRequest(r=>r.method()==='POST'&&r.url().endsWith('/records/fee-accounts/commit'));
 await page.getByRole('button',{name:'Import 2 selected rows',exact:true}).click();
 expect((await pending).postDataJSON()).toEqual({batch_id:'bulk-1',approved_rows:['valid-1','update-1']});
 await expect(page.getByText('2 records saved together. 1 rows skipped.',{exact:true})).toBeVisible();
});
test('editing a record uses ordinary form controls and keeps version checks',async({page})=>{
 await setup(page);
 await page.route('**/v3/college/erp/records/books**',route=>{
  if(route.request().method()==='PUT')return route.fulfill({json:{id:'book-1',title:'Updated book',accession_number:'BK001',version:3}});
  return route.fulfill({json:{items:[{id:'book-1',title:'Physics',accession_number:'BK001',version:2}]}});
 });
 await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'OPAC Search',exact:true}).click();
 await page.getByRole('button',{name:'Edit',exact:true}).click();
 await expect(page.getByLabel('Title *',{exact:true})).toHaveValue('Physics');
 await expect(page.getByRole('textbox',{name:'Edit record values'})).toHaveCount(0);
 await page.getByLabel('Title *',{exact:true}).fill('Updated book');
 const pending=page.waitForRequest(r=>r.method()==='PUT'&&r.url().includes('/records/books/book-1'));
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 expect((await pending).postDataJSON()).toMatchObject({values:{title:'Updated book'},expected_version:2});
 await expect(page.getByText('Updated book',{exact:true})).toBeVisible();
});
test('mobile section navigation stays within the screen',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);
 await expect(page.getByRole('navigation',{name:'ERP sections'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});

test('import review uses editable fields and waits for saved approvals',async({page})=>{
 await setup(page);
 const row={id:'row-1',sheet_name:'Students',row_number:3,original_values:{'Student Name':'Ananya'},normalized_values:{full_name:'Ananya',email:''},status:'invalid',issues:[{id:'issue-1',severity:'error',code:'missing_email',field:'email',action:'Provide an email address'}]};
 await page.route('**/v3/college/erp/imports**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/resolve'))return route.fulfill({json:{rows:[{...row,status:'approved',issues:[]}]}});
  if(path.endsWith('/batch-1'))return route.fulfill({json:{rows:[row]}});
  return route.fulfill({json:{items:[{id:'batch-1',original_filename:'students.xlsx',status:'reviewing'}]}});
 });
 await page.getByLabel('Manage ERP',{exact:true}).selectOption('imports');
 await page.getByLabel('Resume import review').selectOption('batch-1');
 await expect(page.getByRole('button',{name:'Import approved records'})).toBeDisabled();
 await page.getByRole('navigation',{name:'Import result groups'}).getByRole('button',{name:/^Errors/}).click();
 await page.getByRole('button',{name:'Review row',exact:true}).click();
 await expect(page.getByText('Normalized values')).toHaveCount(0);
 await page.getByLabel('Email',{exact:true}).fill('ananya@example.edu');
 const pending=page.waitForRequest(r=>r.method()==='POST'&&r.url().endsWith('/resolve'));
 await page.getByRole('button',{name:'Save decision',exact:true}).click();
 expect((await pending).postDataJSON()).toMatchObject({decisions:[{row_id:'row-1',normalized_values:{email:'ananya@example.edu'}}]});
 await expect(page.getByRole('button',{name:'Import approved records'})).toBeEnabled();
});

test('one workbook maps multiple sheets and saves a reusable standard',async({page})=>{
 await setup(page);
 const mapping={sheets:[
  {source_sheet:'Students',target_sheet:'Students',header_row:2,columns:{'Student ID':1,'Roll Number':2,'Registration Number':3,'Student Name':4},defaults:{}},
  {source_sheet:'Marks',target_sheet:'Marks',header_row:2,columns:{'Registration Number':1,'Subject':2,'Marks':3},defaults:{}},
  {source_sheet:'Read Me',target_sheet:null,header_row:1,columns:{},defaults:{}}
 ]};
 const targets=[{name:'Students',fields:['Student ID','Roll Number','Registration Number','Student Name'],required:['Student ID','Roll Number','Registration Number','Student Name']},{name:'Marks',fields:['Registration Number','Subject','Marks','Maximum Marks','Assessment Name'],required:['Registration Number','Subject','Marks']}];
 const inspect={mapping,targets,matching_templates:[],standard:{name:'Veltech student workbook',sheets:{}},sheets:mapping.sheets.map(m=>({name:m.source_sheet,data_rows:2,suggested_header_row:m.header_row,instruction_sheet:!m.target_sheet,header_rows:[{row:m.header_row,columns:Object.entries(m.columns).map(([label,index])=>({label,index}))}]}))};
 let previewBody='';
 await page.route('**/v3/college/erp/imports/inspect',route=>route.fulfill({json:inspect}));
 await page.route('**/v3/college/erp/imports/preview',route=>{previewBody=route.request().postData()||'';return route.fulfill({json:{batch_id:'new-batch',saved_template:{name:'Veltech monthly'},rows:[{id:'new-row',sheet_name:'Marks',row_number:3,status:'valid',normalized_values:{marks:80},original_values:{Marks:80},issues:[]}]}})});
 await page.route('**/v3/college/erp/imports/new-batch/approve-ready',route=>route.fulfill({json:{approved_count:1,rows:[{id:'new-row',sheet_name:'Marks',row_number:3,status:'approved',normalized_values:{marks:80},original_values:{Marks:80},issues:[]}]}}));
 await page.getByLabel('Manage ERP',{exact:true}).selectOption('imports');
 await page.getByLabel('Choose workbook',{exact:true}).setInputFiles({name:'Veltech.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('synthetic workbook')});
 await page.getByRole('button',{name:'Read workbook',exact:true}).click();
 await expect(page.getByText('3 sheets found · 2 selected for import')).toBeVisible();
 await expect(page.getByLabel('Data type for Read Me')).not.toBeVisible();
 await page.getByText('Adjust sheet and column mapping',{exact:true}).click();
 await expect(page.getByLabel('Data type for Read Me')).toHaveValue('');
 await page.getByText('Adjust sheet and column mapping',{exact:true}).click();
 await page.getByRole('checkbox',{name:'Remember this format for next time'}).check();
 await page.getByLabel('Format name',{exact:true}).fill('Veltech monthly');
 await page.getByRole('button',{name:'Check records',exact:true}).click();
 await expect(page.getByText('Format “Veltech monthly” saved for next time.',{exact:false})).toBeVisible();
 expect(previewBody).toContain('mapping_json');expect(previewBody).toContain('save_standard_name');expect(previewBody).toContain('Veltech monthly');
 await page.getByRole('button',{name:'Approve ready records',exact:true}).click();
 await expect(page.getByRole('button',{name:'Import approved records',exact:true})).toBeEnabled();
});

test('student profile connects family and records without asking for student IDs',async({page})=>{
 await setup(page);
 const person={id:'student-1',full_name:'Ananya Rao',roll_number:'VT001',email:'ananya@example.edu',program:'BTECH',department_code:'CSE',version:3};
 await page.route('**/v3/college/erp/students?**',r=>r.fulfill({json:{items:[person]}}));
 let saved:Record<string,unknown>|null=null;
 await page.route('**/v3/college/erp/students/student-1/profile?**',r=>{
  const tab=new URL(r.request().url()).searchParams.get('tab');
  const sections=tab==='family'?[{module:'guardians',items:saved?[{id:'link-1',version:1,contact_version:1,...(saved.values as object)}]:[],has_more:false}]:tab==='fees'?[{module:'payments',items:[],has_more:false}]:[{module:'enrollments',items:[],has_more:false}];
  return r.fulfill({json:{student:person,tabs:['overview','family','fees'],sections}});
 });
 await page.route('**/v3/college/erp/students/student-1/family',r=>{saved=r.request().postDataJSON();return r.fulfill({json:{id:'link-1'}})});
 await page.getByLabel('Manage ERP',{exact:true}).selectOption('students');
 await page.getByRole('button',{name:'Open profile',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Ananya Rao',exact:true})).toBeVisible();
 await expect(page).toHaveURL(/student=student-1/);
 await page.getByRole('navigation',{name:'Student profile sections'}).getByRole('button',{name:'Family',exact:true}).click();
 await page.getByRole('button',{name:'Add family contact',exact:true}).click();
 await page.getByLabel('Relationship *').selectOption('mother');
 await page.getByLabel('Full name *').fill('Meera Rao');
 await page.getByLabel('Mobile number (include country code)').fill('9999999999');
 await page.getByRole('button',{name:'Save family contact',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Meera Rao',exact:true})).toBeVisible();
 expect(saved).toMatchObject({values:{full_name:'Meera Rao',relationship:'mother',mobile:'9999999999',is_primary:false}});
 await page.getByRole('navigation',{name:'Student profile sections'}).getByRole('button',{name:'Fees',exact:true}).click();
 await page.getByRole('button',{name:'Add record',exact:true}).click();
 await expect(page.getByLabel('Student *',{exact:true})).toHaveCount(0);
 await page.getByLabel('Amount *',{exact:true}).fill('100');
 await page.getByLabel('Payment date *',{exact:true}).fill('2026-10-01');
 const submitted=page.waitForRequest(r=>r.method()==='POST'&&r.url().includes('/records/payments'));
 await page.getByRole('button',{name:'Save record',exact:true}).click();
 expect((await submitted).postDataJSON()).toMatchObject({values:{student_id:'student-1',amount:100}});
 await page.getByRole('button',{name:'← Back to students',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Students & Families',exact:true})).toBeVisible();
});

test('setup tools stay behind settings and family profile fits a mobile screen',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);
 await expect(page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Academic setup',exact:true})).toHaveCount(0);
 await expect(page.getByLabel('Manage ERP',{exact:true}).locator('option[value=catalog]')).toHaveCount(1);
 await expect(page.getByRole('navigation',{name:'ERP sections'}).getByRole('button')).toHaveCount(11);
 await page.route('**/v3/college/erp/students/student-1/profile?**',r=>r.fulfill({json:{student:{id:'student-1',full_name:'Ananya Rao',roll_number:'VT001'},tabs:['overview','family'],sections:[{module:'enrollments',items:[],has_more:false}]}}));
 await page.goto('/dashboard/erp?section=students&student=student-1');
 await expect(page.getByRole('heading',{name:'Ananya Rao',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});

test('workbook results show counted groups and only ten records at a time',async({page})=>{
 await setup(page);
 const rows=Array.from({length:28},(_,i)=>({id:`row-${i}`,sheet_name:i<20?'Students':'Marks',row_number:i+3,original_values:{Name:`Example ${i}`},normalized_values:{full_name:`Example ${i}`},status:i<22?'valid':i<25?'conflict':'invalid',issues:i<22?[]:[{id:`issue-${i}`,severity:i<25?'warning':'error',code:'review_required',action:'Check this record'}]}));
 await page.route('**/v3/college/erp/imports**',r=>r.fulfill({json:new URL(r.request().url()).pathname.endsWith('/batch-groups')?{rows}:{items:[{id:'batch-groups',original_filename:'example.xlsx',status:'reviewing'}]}}));
 await page.getByLabel('Manage ERP',{exact:true}).selectOption('imports');
 await page.getByLabel('Resume import review').selectOption('batch-groups');
 await expect(page.locator('.erp-import-group.valid strong')).toHaveText('22');
 await expect(page.locator('.erp-import-group.conflicts strong')).toHaveText('3');
 await expect(page.locator('.erp-import-group.errors strong')).toHaveText('3');
 await expect(page.locator('.erp-import-row')).toHaveCount(0);
 await page.getByRole('navigation',{name:'Import result groups'}).getByRole('button',{name:/^Valid/}).click();
 await expect(page.locator('.erp-import-row')).toHaveCount(10);
 await page.getByRole('button',{name:'Next records',exact:true}).click();
 await expect(page.getByText('Showing 11–20 of 22 records')).toBeVisible();
 await page.getByRole('navigation',{name:'Import result groups'}).getByRole('button',{name:/^Errors/}).click();
 await expect(page.locator('.erp-import-row')).toHaveCount(3);
 await page.getByLabel('Review sheet').selectOption('Students');
 await expect(page.locator('.erp-import-group.errors strong')).toHaveText('0');
 await expect(page.locator('.erp-import-row')).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});

test('overview explains actionable summaries and removes raw record KPI cards',async({page})=>{
 await setup(page);
 await page.route('**/v3/college/erp/dashboard',r=>r.fulfill({json:{students:16,imports_needing_review:1,outstanding_fees_inr:null}}));
 await page.reload();
 await expect(page.getByRole('button',{name:/Student profiles.*16/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Imports needing review.*1/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Outstanding fees \(INR\).*Not available/})).toBeVisible();
 await expect(page.locator('.erp-overview-stats').getByText('Marks',{exact:true})).toHaveCount(0);
 await expect(page.locator('.erp-overview-stats').getByText('Attendance',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:/Imports needing review.*1/}).click();
 await expect(page).toHaveURL(/section=imports/);
});


test('branch choices remain available when one academic catalogue fails',async({page})=>{
 await setup(page);
 await page.route('**/v3/college/erp/catalog/departments',r=>r.fulfill({json:{items:[{code:'CSE',display_name:'Computer Science',program:'BTECH'}]}}));
 await page.route('**/v3/college/erp/catalog/years',r=>r.fulfill({status:503,json:{detail:'Try again'}}));
 await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Fees',exact:true}).click();
 await page.getByRole('button',{name:'Upload',exact:true}).click();
 await expect(page.getByLabel('Upload department').locator('option[value=CSE]')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Retry options',exact:true})).toBeVisible();
 await expect(page.getByText('Academic setup is incomplete.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Open Academic Setup',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Academic catalog',exact:true})).toBeVisible();
});

test('shared academic filters persist across tabs and prefill upload and downloads',async({page})=>{
 await setup(page);
 const catalogs:Record<string,unknown[]>={departments:[{code:'CSE',display_name:'Computer Science',program:'BTECH'}],years:[{id:'year-1',label:'2026–27'}],semesters:[{id:'semester-1',academic_year_id:'year-1',number:1}],batches:[{id:'batch-1',label:'2026 intake',program_code:'BTECH'}],sections:[{id:'class-1',batch_id:'batch-1',department_code:'CSE',name:'A'}]};
 await page.route('**/v3/college/erp/catalog/*',route=>route.fulfill({json:{items:catalogs[new URL(route.request().url()).pathname.split('/').pop()!]||[]}}));
 await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Fees',exact:true}).click();
 await page.getByLabel('Filter department').selectOption('CSE');await page.getByLabel('Filter academic year').selectOption('year-1');await page.getByLabel('Filter semester').selectOption('semester-1');await page.getByLabel('Filter batch').selectOption('batch-1');
 const pending=page.waitForRequest(r=>r.url().includes('/records/attendance?')&&r.url().includes('batch_id=batch-1'));
 await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Attendance',exact:true}).click();await pending;
 await expect(page.getByLabel('Filter department')).toHaveValue('CSE');await expect(page.getByLabel('Filter semester')).toHaveValue('semester-1');
 await page.getByRole('button',{name:'Upload',exact:true}).click();
 for(const [label,value] of [['Upload department','CSE'],['Upload academic year','year-1'],['Upload semester','semester-1'],['Upload batch','batch-1']])await expect(page.getByLabel(label)).toHaveValue(value);
 await page.getByRole('button',{name:'Close upload'}).click();
 await page.route('**/v3/college/erp/records/attendance/download?*',route=>route.fulfill({contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',body:Buffer.from('fixture')}));
 const downloaded=page.waitForRequest(r=>r.url().includes('/attendance/download?'));await page.getByRole('button',{name:'Download',exact:true}).click();const url=new URL((await downloaded).url());expect(url.searchParams.get('batch_id')).toBe('batch-1');expect(url.searchParams.get('semester_id')).toBe('semester-1');
 await page.reload();await expect(page.getByLabel('Filter academic year')).toHaveValue('year-1');
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(page.getByLabel('Filter department')).toHaveValue('');
});

test('record search and sorting are sent to the server',async({page})=>{
 await setup(page);await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'OPAC Search',exact:true}).click();
 const search=page.waitForRequest(r=>r.url().includes('/records/books?')&&r.url().includes('q=Example'));await page.getByLabel('Search service records').fill('Example');await search;
 const sorted=page.waitForRequest(r=>r.url().includes('/records/books?')&&r.url().includes('sort_by=title'));await page.getByLabel('Sort service records').selectOption('title');await sorted;
 const order=page.waitForRequest(r=>r.url().includes('/records/books?')&&r.url().includes('sort_direction=asc'));await page.getByLabel('Service sort order').selectOption('asc');await order;
 await expect(page.getByText('No matching records. Adjust your filters or search. Records need a matching academic assignment to appear in filtered views.',{exact:true})).toBeVisible();
});

test('service tables show student names and open their linked profile',async({page})=>{
 await setup(page);await page.route('**/v3/college/erp/records/attendance?*',route=>route.fulfill({json:{items:[{id:'attendance-1',student_id:'student-1',student_name:'Example Student',student_roll_number:'EX001',period:'semester',percentage:90,version:1}]}}));
 await page.route('**/v3/college/erp/students/student-1/profile?*',route=>route.fulfill({json:{student:{id:'student-1',full_name:'Example Student',roll_number:'EX001'},tabs:['overview'],sections:[]}}));
 await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Attendance',exact:true}).click();await expect(page.getByText('EX001',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Example Student',exact:true}).click();await expect(page.getByRole('heading',{name:'Example Student',exact:true})).toBeVisible();
});
