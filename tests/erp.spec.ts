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
    return route.fulfill({json:responses[path]||{}});
  });
  await page.goto('/dashboard/erp');
}
test('ERP uses Client login and appears as its own dashboard sidebar option',async({page})=>{
  await setup(page);
  await expect(page.getByRole('heading',{name:'Academic operations'})).toBeVisible();
  await expect(page.locator('aside').first().getByRole('button',{name:'ERP',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Staff sign in'})).toHaveCount(0);
  await page.locator('.erp-sidebar').getByRole('button',{name:'Students',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Students',exact:true})).toBeVisible();
});
test('existing Client staff can open ERP with scoped modules',async({page})=>{
  await setup(page,true);
  await expect(page).toHaveURL(/\/dashboard\/erp$/);
  await expect(page.locator('.erp-sidebar').getByRole('button',{name:'Attendance',exact:true})).toBeVisible();
  await expect(page.locator('.erp-sidebar').getByRole('button',{name:'Staff access',exact:true})).toHaveCount(0);
  await expect(page.locator('.erp-sidebar').getByRole('button',{name:'Excel import',exact:true})).toHaveCount(0);
});
test('unassigned Client accounts cannot open institution ERP',async({page})=>{
  await setup(page,false,false);
  await expect(page.getByRole('heading',{name:'ERP access required'})).toBeVisible();
  await expect(page.locator('.erp-shell')).toHaveCount(0);
});
