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
