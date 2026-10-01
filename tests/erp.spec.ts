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
  await expect(page.locator('aside').first().getByRole('button',{name:'ERP',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Staff sign in'})).toHaveCount(0);
  await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Students',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Students',exact:true})).toBeVisible();
});
test('existing Client staff can open ERP with scoped modules',async({page})=>{
  await setup(page,true);
  await expect(page).toHaveURL(/\/dashboard\/erp$/);
  await expect(page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Academics',exact:true})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Staff access',exact:true})).toHaveCount(0);
  await expect(page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Import data',exact:true})).toHaveCount(0);
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
 await expect(page.getByRole('navigation',{name:'Fees options'})).toBeVisible();
 await page.getByRole('navigation',{name:'Fees options'}).getByRole('button',{name:'Fee payments',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Fee payments',exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('heading',{name:'Fee payments',exact:true})).toBeVisible();
});
test('fee payment forms use named students and submit typed values',async({page})=>{
 await setup(page);
 await page.route('**/v3/college/erp/students?**',route=>route.fulfill({json:{items:[{id:'student-1',full_name:'Ananya Rao',roll_number:'VT001'}]}}));
 let saved:Record<string,unknown>|null=null;
 await page.route('**/v3/college/erp/records/payments**',route=>{
  if(route.request().method()==='POST'){saved=route.request().postDataJSON();return route.fulfill({json:{id:'payment-1'}});}
  return route.fulfill({json:{items:saved?[{id:'payment-1',student_id:'student-1',amount:500,paid_on:'2026-10-01'}]:[]}});
 });
 await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Fees',exact:true}).click();
 await page.getByRole('navigation',{name:'Fees options'}).getByRole('button',{name:'Fee payments',exact:true}).click();
 await page.getByRole('button',{name:'Add record',exact:true}).click();
 await expect(page.getByRole('option',{name:'Ananya Rao · VT001'})).toHaveCount(1);
 await page.getByLabel('Student *',{exact:true}).selectOption('student-1');
 await page.getByLabel('Amount *',{exact:true}).fill('500');
 await page.getByLabel('Payment date *',{exact:true}).fill('2026-10-01');
 await page.getByRole('button',{name:'Save record',exact:true}).click();
 await expect(page.getByText('Record saved.',{exact:true})).toBeVisible();
 expect(saved).toMatchObject({values:{student_id:'student-1',amount:500,paid_on:'2026-10-01'}});
 await expect(page.locator('tbody').getByText('Ananya Rao · VT001')).toBeVisible();
});
test('editing a record uses ordinary form controls and keeps version checks',async({page})=>{
 await setup(page);
 await page.route('**/v3/college/erp/records/books**',route=>{
  if(route.request().method()==='PUT')return route.fulfill({json:{id:'book-1',title:'Updated book',accession_number:'BK001',version:3}});
  return route.fulfill({json:{items:[{id:'book-1',title:'Physics',accession_number:'BK001',version:2}]}});
 });
 await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Campus',exact:true}).click();
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
 await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Import data',exact:true}).click();
 await page.getByLabel('Resume import review').selectOption('batch-1');
 await expect(page.getByRole('button',{name:'Commit approved rows'})).toBeDisabled();
 await page.getByRole('button',{name:'Review row',exact:true}).click();
 await expect(page.getByText('Normalized values')).toHaveCount(0);
 await page.getByLabel('Email',{exact:true}).fill('ananya@example.edu');
 const pending=page.waitForRequest(r=>r.method()==='POST'&&r.url().endsWith('/resolve'));
 await page.getByRole('button',{name:'Save decision',exact:true}).click();
 expect((await pending).postDataJSON()).toMatchObject({decisions:[{row_id:'row-1',normalized_values:{email:'ananya@example.edu'}}]});
 await expect(page.getByRole('button',{name:'Commit approved rows'})).toBeEnabled();
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
 await page.getByRole('navigation',{name:'ERP sections'}).getByRole('button',{name:'Import data',exact:true}).click();
 await page.getByLabel('Choose workbook',{exact:true}).setInputFiles({name:'Veltech.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('synthetic workbook')});
 await page.getByRole('button',{name:'Read workbook',exact:true}).click();
 await expect(page.getByText('3 sheets found · 2 selected for import')).toBeVisible();
 await expect(page.getByLabel('Data type for Read Me')).toHaveValue('');
 await page.getByRole('checkbox',{name:'Save this mapping as an institution standard'}).check();
 await page.getByLabel('Standard name',{exact:true}).fill('Veltech monthly');
 await page.getByRole('button',{name:'Preview all sheets',exact:true}).click();
 await expect(page.getByText('Standard “Veltech monthly” saved for reuse.',{exact:false})).toBeVisible();
 expect(previewBody).toContain('mapping_json');expect(previewBody).toContain('save_standard_name');expect(previewBody).toContain('Veltech monthly');
 await page.getByRole('button',{name:'Approve ready rows in bulk',exact:true}).click();
 await expect(page.getByRole('button',{name:'Commit approved rows',exact:true})).toBeEnabled();
});
