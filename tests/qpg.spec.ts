import {test,expect,type Page} from '@playwright/test';
async function setup(page:Page,failed=false,published=false){
 await page.addInitScript(()=>localStorage.setItem('access_token','test-session'));
 let rows:Record<string,unknown>[]=[];
 type SyllabusItem={id:string;subject_id:string;unit_id?:string;code:string;title:string;position:number};
 const syllabus:{current:Record<string,unknown>|null;published_id:string|null;can_write:boolean;structure:{cos:SyllabusItem[];units:SyllabusItem[];topics:SyllabusItem[]}}={current:null,published_id:null,can_write:true,structure:{cos:[],units:[],topics:[]}};
 let versions:Record<string,unknown>[]=[];
 let blueprintRows:Record<string,unknown>[]=[];
 function totals(config:Record<string,unknown>){const sections=config.sections as {id:string;name:string;offered:number;attempted:number;marks_each:number|string}[];const offered=sections.reduce((sum,s)=>sum+s.offered*Number(s.marks_each),0);const attempted=sections.reduce((sum,s)=>sum+s.attempted*Number(s.marks_each),0);return {valid:attempted===Number(config.total_marks),errors:[],checks:['Attempted marks reconcile'],offered_marks:String(offered),attempted_marks:String(attempted),sections:sections.map(s=>({id:s.id,name:s.name,offered_marks:String(s.offered*Number(s.marks_each)),attempted_marks:String(s.attempted*Number(s.marks_each))}))};}
 if(published){syllabus.structure={cos:[{id:'co1',subject_id:'s1',code:'CO1',title:'Networks',position:1}],units:[{id:'u1',subject_id:'s1',code:'U1',title:'Transport',position:1}],topics:[{id:'t1',subject_id:'s1',unit_id:'u1',code:'T1',title:'TCP',position:1}]};syllabus.current={id:'sv1',version:1,status:'PUBLISHED',revision:1,content:structuredClone(syllabus.structure)};syllabus.published_id='sv1';versions=[syllabus.current];}

 function draft(){if(!syllabus.current||syllabus.current.status!=='DRAFT')syllabus.current={id:'sv'+(versions.length+1),version:versions.length+1,revision:1,status:'DRAFT',created_by:'faculty',created_at:new Date().toISOString(),content:structuredClone(syllabus.structure)};}

 let preview={id:'i1',filename:failed?'scan.pdf':'questions.csv',status:failed?'FAILED':'NEEDS_CORRECTION',revision:1,columns:failed?[]:['Question','Type','Marks'],mapping:{question_text:'Question',question_type:'Type',marks:'Marks'},processing_error:failed?'Text could not be extracted from this PDF. OCR support will be added in a future phase.':'',summary:{valid:0,errors:1,imported:0,needs_review:0,skipped:0},rows:failed?[]:[{id:'r1',row_number:1,location:'CSV · row 2',content:{question_text:'Explain TCP.',question_type:'SHORT_ANSWER',marks:'bad',bloom_level:'K2',difficulty:'MEDIUM'},raw_values:{Question:'Explain TCP.',Type:'SHORT_ANSWER',Marks:'bad'},errors:['Marks must be numeric.'],warnings:[],selected:false,removed:false,faculty_confirmed:false}]};
 await page.route(/\/v[13]\//,async route=>{
  const path=new URL(route.request().url()).pathname;const method=route.request().method();
  let json:unknown={};
  if(path.endsWith('/papers'))json={items:[]};
  if(path.endsWith('/users/me'))json={user_id:'faculty',name:'Faculty',email:'faculty@example.edu'};
  if(path.endsWith('/college/access'))json={enabled:true,college_name:'Demo College'};
  if(path.endsWith('/academic-options'))json={programs:[{code:'BTECH',display_name:'B.Tech',duration_years:4,departments:[{code:'CSE',display_name:'Computer Science'}]}],erp_subjects:[],can_setup:true,can_write:true};
  if(path.endsWith('/question-papers/subjects'))json={items:[{id:'s1',code:'CN',name:'Computer Networks'}]};
  if(/\/(cos|units|topics)$/.test(path))json={items:[]};
  if(path.endsWith('/questions')){
   if(method==='POST'){const body=route.request().postDataJSON();rows=[{...body,id:'q1',version:1,status:'DRAFT',updated_by:'faculty',updated_at:new Date().toISOString()}];json=rows[0];}
   else json={items:rows,total:rows.length};
  }
  if(path.endsWith('/questions/q1')){
   if(method==='PUT'){rows=[{...rows[0],...route.request().postDataJSON(),version:2}];}json=rows[0];
  }
  if(path.endsWith('/q1/versions'))json={items:rows.map(q=>({id:'v1',version:q.version,content:q,actor:'faculty',created_at:new Date().toISOString()}))};
  if(path.endsWith('/q1/archive')){rows=[{...rows[0],status:'ARCHIVED',version:3}];json=rows[0];}
  if(path.endsWith('/imports'))json=method==='GET'?{items:[]}:preview;
  if(path.endsWith('/imports/i1/preview'))json=preview;
  if(path.endsWith('/imports/i1/mapping')){preview={...preview,revision:preview.revision+1};json=preview;}
  if(path.endsWith('/imports/i1/rows/r1')){const body=route.request().postDataJSON();preview={...preview,revision:preview.revision+1,status:'PREVIEW_READY',summary:{...preview.summary,valid:1,errors:0},rows:[{...preview.rows[0],...body,errors:[]}]};json=preview;}
  if(path.endsWith('/imports/i1/selection')){preview={...preview,revision:preview.revision+1,status:'READY_TO_IMPORT',rows:preview.rows.map(r=>({...r,selected:true}))};json=preview;}
  if(path.endsWith('/imports/i1/confirm')){rows=[{...preview.rows[0].content,id:'q1',version:1,status:'DRAFT',source_type:'CSV',updated_by:'faculty',updated_at:new Date().toISOString(),options:[]}];preview={...preview,status:'IMPORTED',summary:{...preview.summary,imported:1}};json=preview.summary;}
  if(path.includes('/syllabus')){
   if(path.endsWith('/draft'))draft();
   if(path.endsWith('/publish')){syllabus.current={...syllabus.current,status:'PUBLISHED',published_at:new Date().toISOString(),content:structuredClone(syllabus.structure)};syllabus.published_id=String(syllabus.current.id);versions=[structuredClone(syllabus.current),...versions.map(v=>({...v,status:'ARCHIVED'}))];}
   json=syllabus;
   if(path.endsWith('/versions'))json={items:versions};
   if(/\/versions\/sv/.test(path))json=versions.find(v=>path.endsWith('/'+v.id));
  }
  if(/\/(cos|units|topics)$/.test(path)){
   const kind=path.split('/').pop() as 'cos'|'units'|'topics';
   if(method==='POST'){draft();const body=route.request().postDataJSON();const entry={...body,id:kind+'1',subject_id:'s1',...(kind==='topics'?{unit_id:'units1'}:{}),position:syllabus.structure[kind].length+1};syllabus.structure[kind].push(entry);syllabus.current={...syllabus.current,revision:Number(syllabus.current?.revision)+1,content:structuredClone(syllabus.structure)};json=entry;}
   else json={items:syllabus.structure[kind]};
  }
  if(path.endsWith('/blueprints')){
   if(method==='POST'){const body=route.request().postDataJSON();const b={...body,id:'b1',family_id:'f1',version:1,revision:1,status:'DRAFT',validation:totals(body.config)};blueprintRows=[b];json=b;}
   else json={items:blueprintRows};
  }
  if(/\/blueprints\/b[12]/.test(path)){
   const id=path.split('/')[5];let b=blueprintRows.find(r=>r.id===id)||blueprintRows[0];
   if(method==='PUT'){const body=route.request().postDataJSON();b={...b,config:body.config,revision:Number(b.revision)+1,status:'DRAFT',validation:totals(body.config)};}
   if(path.endsWith('/validate'))b={...b,status:'VALIDATED',revision:Number(b.revision)+1};
   if(path.endsWith('/publish'))b={...b,status:'PUBLISHED',revision:Number(b.revision)+1};
   blueprintRows=blueprintRows.map(r=>r.id===b.id?b:r);json=path.endsWith('/versions')?{items:blueprintRows}:b;
  }
  await route.fulfill({json});
 });
 await page.goto('/dashboard/question-papers');
 await page.getByRole('navigation',{name:'Question paper sections'}).getByRole('button',{name:'Academic Setup',exact:true}).click();
 await page.getByLabel('Program',{exact:true}).selectOption('BTECH');
 await page.getByLabel('Branch',{exact:true}).selectOption('CSE');
 await page.getByLabel('Year',{exact:true}).selectOption('2');
 await page.getByLabel('Semester',{exact:true}).selectOption('4');
 await page.getByLabel('Subject',{exact:true}).selectOption('s1');
 await page.getByRole('navigation',{name:'Question paper sections'}).getByRole('button',{name:'Question Bank',exact:true}).click();
}
test('manual question create edit details and archive',async({page})=>{
 await setup(page);
 await page.getByRole('button',{name:'Add Question',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.getByLabel('Question Text').fill('Explain TCP congestion control.');
 await dialog.getByRole('button',{name:'Save Question',exact:true}).click();
 await expect(page.getByRole('button',{name:'Explain TCP congestion control.',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Edit',exact:true}).click();
 await dialog.getByLabel('Question Text').fill('Explain TCP flow control.');
 await dialog.getByLabel('Change reason').fill('Correct the concept');
 await dialog.getByRole('button',{name:'Save new version'}).click();
 await expect(page.getByText('Version 2',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Explain TCP flow control.',exact:true}).click();
 await expect(dialog.getByText('Version history',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:'Archive',exact:true}).click();
 await expect(page.getByRole('table').getByText('Archived',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Edit',exact:true})).toHaveCount(0);
});
test('context resets and mobile dialog closes with escape',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);
 await page.getByRole('button',{name:'Add Question',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'Change context',exact:true}).click();await page.getByLabel('Year',{exact:true}).selectOption('1');
 await expect(page.getByLabel('Semester',{exact:true})).toHaveValue('');
 await expect(page.getByLabel('Subject',{exact:true})).toHaveValue('');
 await expect(page.getByRole('button',{name:'Add Question',exact:true})).toBeDisabled();
});

test('document preview correction and explicit confirmation',async({page})=>{
 await setup(page);
 await page.getByRole('navigation',{name:'Question bank views'}).getByRole('button',{name:'Import PYQ'}).click();await page.getByRole('button',{name:'Import Questions',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Import Questions'});
 await dialog.getByLabel('Question document').setInputFiles({name:'questions.csv',mimeType:'text/csv',buffer:Buffer.from('Question,Type,Marks\nExplain TCP.,SHORT_ANSWER,bad')});
 await dialog.getByRole('button',{name:'Upload and preview'}).click();
 await expect(dialog.getByText('Marks must be numeric.',{exact:true})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Confirm import'})).toBeDisabled();
 await dialog.getByRole('button',{name:'Apply mapping'}).click();
 await dialog.getByRole('button',{name:'Edit row 1',exact:true}).click();
 await dialog.getByLabel('Row Marks',{exact:true}).fill('2');
 await dialog.getByRole('button',{name:'Save correction'}).click();
 await expect(dialog.getByText('Marks must be numeric.',{exact:true})).toHaveCount(0);
 await dialog.getByRole('button',{name:'Select all valid'}).click();
 await dialog.getByRole('checkbox',{name:'I have reviewed the extracted questions, metadata and duplicate warnings.'}).check();
 await dialog.getByRole('button',{name:'Confirm import',exact:true}).click();
 await expect(dialog.getByRole('status')).toContainText('Imported: 1');
 await dialog.getByRole('button',{name:'Back to Question Bank'}).click();
 await expect(page.getByRole('table').getByRole('button',{name:'Explain TCP.',exact:true})).toBeVisible();
});
test('unreadable PDF shows processing error and no confirm action',async({page})=>{
 await setup(page,true);await page.getByRole('navigation',{name:'Question bank views'}).getByRole('button',{name:'Import PYQ'}).click();await page.getByRole('button',{name:'Import Questions',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.getByLabel('Question document').setInputFiles({name:'scan.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-test')});
 await dialog.getByRole('button',{name:'Upload and preview'}).click();
 await expect(dialog.getByRole('alert')).toContainText('OCR support will be added');
 await expect(dialog.getByRole('button',{name:'Confirm import',exact:true})).toHaveCount(0);
});

test('subject syllabus add save publish and historical view',async({page})=>{
 await setup(page);
 await page.getByRole('button',{name:'Academic Setup',exact:true}).click();await page.getByRole('navigation',{name:'Academic setup views'}).getByRole('button',{name:'Syllabus',exact:true}).click();
 const panel=page.getByRole('region',{name:'Subject syllabus'});
 await panel.getByRole('button',{name:'Save Draft',exact:true}).click();
 for(const [button,code,title] of [['Add CO','CO1','Understand networks'],['Add Unit','U1','Transport Layer'],['Add Topic to U1','T1','TCP']]){
  await panel.getByRole('button',{name:button,exact:true}).click();
  const form=page.getByRole('dialog');await form.getByLabel('Code',{exact:true}).fill(code);await form.getByLabel('Title / description',{exact:true}).fill(title);
  await form.getByRole('button',{name:'Save item',exact:true}).click();await expect(form).toHaveCount(0);
 }
 await panel.getByRole('button',{name:'Save Draft',exact:true}).click();
 await panel.getByRole('button',{name:'Publish',exact:true}).click();
 await expect(panel.getByText('Version 1 · Published',{exact:true})).toBeVisible();
 await expect(panel.getByRole('button',{name:'Add CO',exact:true})).toHaveCount(0);
 await panel.getByRole('button',{name:'View version 1',exact:true}).click();
 await expect(panel.getByRole('button',{name:'Back to current syllabus'})).toBeVisible();
 await expect(panel.getByText('CO1 — Understand networks',{exact:true})).toBeVisible();
});

test('blueprint offered and attempted totals validate and publish',async({page})=>{
 await setup(page,false,true);
 await page.getByRole('button',{name:'Question Papers',exact:true}).click();await page.getByRole('button',{name:'Paper Patterns',exact:true}).click();
 const panel=page.getByRole('region',{name:'Subject blueprint'});
 await panel.getByLabel('Published syllabus',{exact:true}).selectOption('sv1');
 await panel.getByLabel('Blueprint name',{exact:true}).fill('Mid Semester');
 for(const [i,name,offered,attempted,marks] of [[1,'Part A',10,10,1],[2,'Part B',7,5,2],[3,'Part C',4,2,5]] as const){
  if(i>1)await panel.getByRole('button',{name:'Add section',exact:true}).click();
  const section=panel.getByRole('region',{name:`Blueprint section ${i}`,exact:true});
  await section.getByLabel('Section name',{exact:true}).fill(name);
  await section.getByLabel('Questions offered',{exact:true}).fill(String(offered));
  await section.getByLabel('Questions attempted',{exact:true}).fill(String(attempted));
  await section.getByLabel('Marks each',{exact:true}).fill(String(marks));
  if(i>1)await section.getByRole('checkbox',{name:'All offered questions are mandatory'}).uncheck();
 }
 await panel.getByLabel('cos CO1 marks',{exact:true}).fill('30');
 await panel.getByLabel('units U1 marks',{exact:true}).fill('30');
 await panel.getByLabel('topics T1 marks',{exact:true}).fill('6');
 await panel.getByLabel('Bloom K2 percent',{exact:true}).fill('100');
 await panel.getByLabel('Difficulty MEDIUM percent',{exact:true}).fill('100');
 await panel.getByRole('button',{name:'Validate Paper Pattern',exact:true}).click();
 await expect(panel.getByRole('status')).toContainText('Offered Marks: 44');
 await expect(panel.getByRole('status')).toContainText('Attempted Marks: 30');
 await panel.getByRole('button',{name:'Publish Paper Pattern',exact:true}).click();
 await expect(panel.getByText('Blueprint v1 · Published',{exact:true})).toBeVisible();
 await expect(panel.getByLabel('Blueprint name',{exact:true})).toBeDisabled();
 await expect(panel.getByRole('button',{name:'Create new draft version',exact:true})).toBeVisible();
});

async function assemblySetup(page:Page,empty=false,final=false){
 await setup(page,false,true);
 const structure={cos:[{id:'co1',code:'CO1',title:'Networks'}],units:[{id:'u1',code:'U1',title:'Transport'}],topics:[{id:'t1',unit_id:'u1',code:'T1',title:'TCP'}]};
 const section={id:'a',name:'Part A',offered:2,attempted:1,marks_each:'1',question_type:'MCQ',format:'STANDARD',choice_groups:[{id:'g1',name:'Choice 1',offered:2,choose:1}]};
 const blueprint={id:'b1',version:1,status:'PUBLISHED',syllabus_version_id:'sv1',config:{title:'Midterm',duration_minutes:60,sections:[section]}};
 const questions=[1,2].map(n=>({id:'q'+n,question_text:`Which network protocol ${n}?`,marks:1,question_type:'MCQ',co_id:'co1',unit_id:'u1',topic_id:'t1',bloom_level:'K1',difficulty:'EASY',answer:'One',options:['One','Two'],source_type:'MANUAL',source_reference:'Faculty notes',status:'APPROVED',version:2}));
 type MockPaper={metadata?:{instructions?:string};id:string;title:string;status:string;revision:number;version:number;syllabus_version_id:string;blueprint_version:number;duration_minutes:number;blueprint_snapshot:typeof blueprint.config;syllabus_snapshot:typeof structure;totals:{offered_marks:string;attempted_marks:string};validation:{valid:boolean;errors:string[];checks:string[]};items:{id:string;section_id:string;position:number;choice_group:string;snapshot:typeof questions[number]|null;question_version:number|null}[]};
 let paper:MockPaper|null=null;
 const journal:{id:string;paper_id:string;revision:number;action:string;actor:string;comment:string;created_at:string;has_snapshot:boolean;snapshot:MockPaper}[]=[];
 function event(action:string,comment=''){if(paper)journal.push({id:String(journal.length+1),paper_id:paper.id,revision:paper.revision,action,actor:'faculty',comment,created_at:'2026-10-07T12:00:00Z',has_snapshot:true,snapshot:structuredClone(paper)});}
 await page.route(/\/v3\/college\/question-papers\//,async route=>{
  const url=new URL(route.request().url());const path=url.pathname;const method=route.request().method();let json:unknown;
  if(path.endsWith('/syllabus/versions'))json={items:[{id:'sv1',version:1,status:'PUBLISHED'}]};
  else if(path.endsWith('/blueprints'))json={items:[blueprint]};
  else if(path.endsWith('/papers')){
   if(method==='POST'){paper={id:'p1',title:'Midterm',version:1,revision:1,status:final?'FACULTY_REVIEW':'DRAFT',syllabus_version_id:'sv1',blueprint_version:1,duration_minutes:60,blueprint_snapshot:blueprint.config,syllabus_snapshot:structure,totals:{offered_marks:'2',attempted_marks:'1'},validation:{valid:false,errors:[],checks:[]},items:[1,2].map(n=>({id:'i'+n,section_id:'a',position:n,choice_group:'g1',snapshot:final?structuredClone(questions[n-1]):null,question_version:final?2:null}))};if(final)paper.validation={valid:true,errors:[],checks:['Final snapshot valid']};event('CREATED');json=paper;}
   else json={items:paper?[paper]:[]};
  }
  else if(path.includes('/papers/p')&&paper){
   if(path.endsWith('/history'))json={items:journal.filter(h=>h.paper_id===paper!.id)};
   else if(path.includes('/revisions/'))json=journal.find(h=>h.paper_id===paper!.id&&h.revision===Number(path.split('/').pop()))?.snapshot;
   else if(path.endsWith('/export')){await route.fulfill({contentType:'application/pdf',body:'%PDF-1.4 frozen locked snapshot'});return;}
   else if(path.endsWith('/eligible')){const used=paper.items.filter(i=>i.id!==url.searchParams.get('item_id')).map(i=>i.snapshot?.id);const candidates=empty?[]:questions.filter(q=>!used.includes(q.id)&&(!url.searchParams.get('q')||q.question_text.includes(url.searchParams.get('q')!)));json={items:candidates,total:candidates.length,available_distinct:candidates.length,required:paper.items.filter(i=>!i.snapshot).length,counts:{APPROVED:empty?0:2,DRAFT:3,NEEDS_REVIEW:1,ARCHIVED:0},sufficient:candidates.length>=paper.items.filter(i=>!i.snapshot).length};}
   else if(path.endsWith('/availability')){const required=paper.items.filter(i=>!i.snapshot).length;json={sections:[{section_id:'a',name:'Part A',counts:{APPROVED:empty?0:2,DRAFT:3,NEEDS_REVIEW:1,ARCHIVED:0},available_distinct:empty?0:required,required,sufficient:!empty||required===0}]};}
   else{
    if(['/approve','/lock','/request-changes','/reject','/comments','/new-version'].some(action=>path.endsWith(action))){const body=route.request().postDataJSON();const action=path.split('/').pop()!;paper.revision++;if(action==='new-version'){paper.id='p2';paper.version++;paper.revision=1;paper.status='DRAFT';}else paper.status=({approve:'APPROVED',lock:'LOCKED','request-changes':'CHANGES_REQUESTED',reject:'REJECTED',comments:'DRAFT'} as Record<string,string>)[action];event(action,body.comment||'');}
    else if(path.includes('/items/')){const id=path.split('/').pop();const body=route.request().postDataJSON();paper.items=paper.items.map(i=>i.id===id?{...i,snapshot:method==='DELETE'?null:structuredClone(questions.find(q=>q.id===body.question_id)!),question_version:method==='DELETE'?null:2}:i);paper.revision++;paper.status='DRAFT';paper.validation={valid:false,errors:[],checks:[]};}
    else if(path.endsWith('/validate')||path.endsWith('/review')){const valid=paper.items.every(i=>i.snapshot);paper.status=valid?(path.endsWith('/review')?'FACULTY_REVIEW':'VALIDATED'):'DRAFT';paper.validation={valid,errors:valid?[]:['Every offered slot needs an Approved question.'],checks:valid?['Every permitted choice satisfies configured coverage']:[]};paper.revision++;}
    else if(method==='PUT'){const body=route.request().postDataJSON();paper.title=body.title;paper.metadata={instructions:body.instructions};paper.status='DRAFT';paper.revision++;}
    if(method!=='GET'&&!journal.some(h=>h.paper_id===paper!.id&&h.revision===paper!.revision))event(path.split('/').pop()!);
    json=paper;
   }
  }else{return route.fallback();}
  await route.fulfill({json});
 });
 await page.getByRole('button',{name:'Question Papers',exact:true}).click();
 await page.getByLabel('Paper syllabus').selectOption('sv1');
 await page.getByLabel('Published paper pattern').selectOption('b1');
 await page.getByRole('button',{name:'Create Paper',exact:true}).click();
}

test('paper assembly selects choice alternatives, validates, previews, saves and removes',async({page})=>{
 await assemblySetup(page);
 const panel=page.getByRole('region',{name:'Paper assembly'});
 await expect(panel.getByText('Offered Marks: 2 · Attempted Marks: 1',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Validate Paper',exact:true}).click();
 await expect(page.getByText('Every offered slot needs an Approved question.')).toBeVisible();
 await page.getByRole('button',{name:'Select Alternative',exact:true}).first().click();
 let dialog=page.getByRole('dialog');await expect(dialog.getByText('3 Draft',{exact:false})).toBeVisible();
 await dialog.getByLabel('Picker Bloom').selectOption('K1');
 await dialog.getByLabel('Picker Difficulty').selectOption('EASY');
 await dialog.getByRole('button',{name:'Use Question',exact:true}).first().click();
 await expect(dialog).toBeHidden();
 await page.getByRole('button',{name:'Select Alternative',exact:true}).click();
 dialog=page.getByRole('dialog');await expect(dialog.getByRole('button',{name:'Use Question',exact:true})).toHaveCount(1);
 await dialog.getByRole('button',{name:'Use Question',exact:true}).click();
 await page.getByRole('button',{name:'Validate Paper',exact:true}).click();
 await expect(page.getByText('✓ Every permitted choice satisfies configured coverage')).toBeVisible();
 await page.getByRole('button',{name:'Paper Preview',exact:true}).click();
 await expect(page.getByRole('button',{name:'Replace Question',exact:true})).toHaveCount(0);
 await expect(page.getByText('Which network protocol 1?',{exact:true})).toBeVisible();
 await expect(page.getByText('Selected question v2 · Approved',{exact:true})).toHaveCount(2);
 await page.getByRole('button',{name:'Send for Faculty Review',exact:true}).click();
 await expect(page.getByText('Faculty Review · 60 minutes',{exact:false})).toBeVisible();
 await page.getByLabel('Paper title').fill('Faculty midterm draft');
 await page.getByRole('button',{name:'Save Draft',exact:true}).click();
 await page.getByRole('button',{name:'Edit selections',exact:true}).click();
 await page.getByRole('button',{name:'Remove',exact:true}).first().click();
 await expect(page.getByText('No question selected.',{exact:true})).toHaveCount(1);
});

test('mobile assembly shows insufficient approved inventory and picker closes accessibly',async({page})=>{
 await page.setViewportSize({width:390,height:844});await assemblySetup(page,true);
 await expect(page.getByText('Insufficient question availability',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Select Alternative',exact:true}).first().click();
 const dialog=page.getByRole('dialog');await expect(dialog.getByText('No eligible questions match.',{exact:false})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Use Question',exact:true})).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});

async function reviewSetup(page:Page,status='NEEDS_REVIEW',source='MANUAL'){
 await setup(page,false,true);
 let q={id:'q1',subject_id:'s1',question_text:'Explain the TCP protocol.',question_type:'SHORT_ANSWER',marks:2,co_id:'co1',unit_id:'u1',topic_id:'t1',bloom_level:'K2',difficulty:'MEDIUM',answer:'TCP provides reliable delivery.',options:[] as string[],source_type:source,source_reference:source==='CSV'?'questions.csv':'Faculty notes',status,version:status==='APPROVED'?3:1,created_by:'Faculty A',updated_by:'Faculty A',created_at:'2026-10-07T10:00:00Z',updated_at:'2026-10-07T10:00:00Z'};
 type History={id:string;version:number;actor:string;created_at:string;change_reason:string;status:string;previous_status:string|null;event:{action:string;comment:string;reviewed_version:number}|null;content:typeof q};
 let history:History[]=[{id:'v'+q.version,version:q.version,actor:'Faculty A',created_at:q.created_at,change_reason:'Original question',status:q.status,previous_status:null,event:null,content:structuredClone(q)}];
 await page.route(/\/v3\/college\/question-papers\/questions/,async route=>{
  const url=new URL(route.request().url());const path=url.pathname;const method=route.request().method();let json:unknown;
  if(path.endsWith('/review-queue')){const status=url.searchParams.get('status');const matches=!status||q.status===status;json={items:matches?[q]:[],total:matches?1:0};}
  else if(path.endsWith('/review'))json={question:q,history};
  else if(path.endsWith('/review-history')||path.endsWith('/versions'))json={items:history};
  else if(path.includes('/q1')&&method==='POST'){
   const body=route.request().postDataJSON();const action=path.split('/').pop()!;const previous=q.status;const oldVersion=q.version;
   q={...q,status:action==='approve'?'APPROVED':action==='reject'?'DRAFT':action==='comments'?q.status:'NEEDS_REVIEW',version:q.version+1};
   history=[{id:'v'+q.version,version:q.version,actor:'Faculty B',created_at:q.created_at,change_reason:action,status:q.status,previous_status:previous,event:{action,comment:body.comment,reviewed_version:oldVersion},content:structuredClone(q)},...history];json=q;
  }
  else if(path.endsWith('/q1')){if(method==='PUT'){const previous=q.status;q={...q,...route.request().postDataJSON(),version:q.version+1,status:previous==='APPROVED'||previous==='NEEDS_REVIEW'?'NEEDS_REVIEW':'DRAFT'};history=[{id:'v'+q.version,version:q.version,actor:'Faculty A',created_at:q.created_at,change_reason:'Edited question',status:q.status,previous_status:previous,event:null,content:structuredClone(q)},...history];}json=q;}
  else if(path.endsWith('/questions'))json={items:[q],total:1};else return route.fallback();
  await route.fulfill({json});
 });
 await page.getByRole('button',{name:'Question Bank',exact:true}).click();
 await page.getByRole('button',{name:'Question bank review',exact:true}).last().click();
}

test('review queue submit draft and approve a question',async({page})=>{
 await reviewSetup(page,'DRAFT');await page.getByLabel('Review status').selectOption('DRAFT');
 await page.getByRole('button',{name:'Review',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Review Question'});
 await dialog.getByRole('button',{name:'Submit for Review',exact:true}).click();
 await dialog.getByRole('button',{name:'Approve',exact:true}).click();
 await expect(dialog.getByText('Approved',{exact:true})).toBeVisible();
 await expect(dialog.getByText('Version 3 · Approve · Approved',{exact:true})).toBeVisible();
});

test('approved edit creates needs review version and preserves approval history',async({page})=>{
 await reviewSetup(page,'APPROVED');await page.getByLabel('Review status').selectOption('APPROVED');
 await page.getByRole('button',{name:'Review',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Edit',exact:true}).click();
 let dialog=page.getByRole('dialog',{name:'Edit Question'});await dialog.locator('[name="question_text"]').fill('Explain TCP flow control.');
 await dialog.getByRole('button',{name:'Save new version',exact:true}).click();await expect(dialog).toBeHidden();
 await page.getByRole('button',{name:'Review',exact:true}).click();dialog=page.getByRole('dialog',{name:'Review Question'});
 await expect(dialog.getByText('Needs Review',{exact:true})).toBeVisible();
 await expect(dialog.getByText('Version 3 · Saved · Approved',{exact:true})).toBeVisible();
 await expect(dialog.getByText('Version 4 · Saved · Needs Review',{exact:true})).toBeVisible();
});

test('imported question request changes comment edit and approve through same review',async({page})=>{
 await reviewSetup(page,'NEEDS_REVIEW','CSV');await page.getByRole('button',{name:'Review',exact:true}).click();
 let dialog=page.getByRole('dialog');await expect(dialog.getByRole('button',{name:'Request Changes',exact:true})).toBeDisabled();
 await dialog.getByLabel('Reviewer comment').fill('Clarify the TCP solution.');
 await dialog.getByRole('button',{name:'Request Changes',exact:true}).click();
 await expect(dialog.getByText('Clarify the TCP solution.',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Edit',exact:true}).click();dialog=page.getByRole('dialog',{name:'Edit Question'});
 await dialog.locator('[name="answer"]').fill('TCP acknowledges packets and retransmits lost data.');
 await dialog.getByRole('button',{name:'Save new version',exact:true}).click();
 await page.getByRole('button',{name:'Review',exact:true}).click();dialog=page.getByRole('dialog',{name:'Review Question'});
 await dialog.getByRole('button',{name:'Resubmit for Review',exact:true}).click();
 await dialog.getByRole('button',{name:'Approve',exact:true}).click();
 await expect(dialog.getByText('Approved',{exact:true})).toBeVisible();
 await expect(dialog.getByText('questions.csv',{exact:true})).toBeVisible();
});


test('final paper review approves, locks, exports and shows immutable history',async({page})=>{
 await assemblySetup(page,false,true);
 await page.getByRole('button',{name:'Final Review',exact:true}).click();
 await expect(page.getByText('Which network protocol 1?',{exact:true})).toBeVisible();
 await page.getByLabel('Review comment',{exact:true}).fill('Reviewed the complete paper.');
 await page.getByRole('button',{name:'Approve Paper',exact:true}).click();
 await expect(page.getByLabel('Paper title',{exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Save Draft',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Lock Paper',exact:true}).click();
 await expect(page.getByRole('button',{name:'Replace Question',exact:true})).toHaveCount(0);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export PDF',exact:true}).click();
 await expect((await download).suggestedFilename()).toContain('question-paper-v1-r3.pdf');
 await page.getByText('Revision History',{exact:true}).click();
 await expect(page.getByText('Reviewed the complete paper.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'View Revision 1',exact:true}).click();
 await expect(page.getByText('Historical revision · Read-only',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Approve Paper',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Return to Current Revision',exact:true}).click();
 await expect(page.getByRole('button',{name:'Export PDF',exact:true})).toBeVisible();
});

test('paper changes requested can edit, validate, resubmit and approve',async({page})=>{
 await assemblySetup(page,false,true);
 await page.getByLabel('Review comment',{exact:true}).fill('Clarify instructions.');
 await page.getByRole('button',{name:'Request Changes',exact:true}).click();
 await page.getByLabel('Paper instructions',{exact:true}).fill('Answer one question from the pair.');
 await page.getByLabel('Paper title',{exact:true}).fill('Revised midterm');
 await page.getByRole('button',{name:'Save Draft',exact:true}).click();
 await page.getByRole('button',{name:'Validate Paper',exact:true}).click();
 await page.getByRole('button',{name:'Send for Faculty Review',exact:true}).click();
 await page.getByRole('button',{name:'Approve Paper',exact:true}).click();
 await expect(page.getByRole('button',{name:'Lock Paper',exact:true})).toBeVisible();
 await expect(page.getByLabel('Paper instructions',{exact:true})).toHaveValue('Answer one question from the pair.');
});

test('locked paper creates a new editable version with preserved selections',async({page})=>{
 await assemblySetup(page,false,true);
 await page.getByRole('button',{name:'Approve Paper',exact:true}).click();
 await page.getByRole('button',{name:'Lock Paper',exact:true}).click();
 await page.getByRole('button',{name:'Create New Version',exact:true}).click();
 await expect(page.getByLabel('Paper title',{exact:true})).toBeEnabled();
 await expect(page.getByText('Which network protocol 1?',{exact:true})).toBeVisible();
 await expect(page.getByText('Paper v2',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Export PDF',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Save Draft',exact:true})).toBeVisible();
});

async function generationSetup(page:Page,mode='completed'){
 await setup(page,false,true);
 let reviewed=false;
 const candidate={id:'result1',decision:'PENDING',duplicate:false,warnings:['Generated content requires faculty review.'],question:{question_text:'Explain TCP acknowledgments.',answer:'TCP acknowledges received packets.',options:[],question_type:'SHORT_ANSWER',marks:2,rationale:'Based on transport notes.'},provenance:[{filename:'notes.txt',location:'paragraph 1',quote:'TCP acknowledges packets for reliable delivery.',retrieval_score:0.92}]};
 let job={id:'job1',status:mode==='running'?'RUNNING':mode==='failed'?'FAILED':'COMPLETED',revision:3,request:{subject_id:'s1',syllabus_version_id:'sv1',co_id:'co1',unit_id:'u1',topic_id:'t1',question_type:'SHORT_ANSWER',marks:2,bloom_level:'K2',difficulty:'MEDIUM',count:1,instructions:'',conceptual:false},results:mode==='completed'?[candidate]:[],failure_reason:mode==='failed'?'Insufficient source coverage. Upload relevant material.':'',created_at:new Date().toISOString()};
 await page.route(/\/question-papers\/(sources|questions\/(generation|generate))/,async route=>{
  const path=new URL(route.request().url()).pathname;let json:unknown={};
  if(path.endsWith('/generation-config'))json={enabled:true,message:'Ready'};
  if(path.endsWith('/sources'))json={items:[{source_id:'src1',filename:'notes.txt',chunks:1,reviewed}]};
  if(path.endsWith('/chunks'))json={items:[{id:'chunk1',content:'TCP acknowledges packets for reliable delivery.',location:'paragraph 1',warnings:['Review equation boundaries.'],reviewed}]};
  if(path.endsWith('/sources/src1/review')){reviewed=route.request().postDataJSON().reviewed;json={reviewed};}
  if(path.endsWith('/sources/upload'))json={source_id:'src1',chunks:1};
  if(path.endsWith('/generation-jobs'))json={items:[]};
  if(path.endsWith('/questions/generate')||path.endsWith('/generation-jobs/job1'))json=job;
  if(path.endsWith('/cancel')){job={...job,status:'CANCELLED',revision:4};json=job;}
  if(path.endsWith('/accept')||path.endsWith('/reject')){const body=route.request().postDataJSON();candidate.decision=path.endsWith('/accept')?'ACCEPTED':'REJECTED';candidate.question={...candidate.question,...(body.question_text?{question_text:body.question_text}:{})};job={...job,revision:4,results:[candidate]};json=job;}
  await route.fulfill({json});
 });
 await page.getByRole('button',{name:'AI Generate',exact:true}).click();
 await page.getByLabel('Generation syllabus').selectOption('sv1');
 await page.getByLabel('Generation CO',{exact:true}).selectOption('co1');
 await page.getByLabel('Generation Unit',{exact:true}).selectOption('u1');
 await page.getByLabel('Generation Topic',{exact:true}).selectOption('t1');
 return ()=>job;
}

test('AI source review generate edit accept needs review and evidence',async({page})=>{
 await generationSetup(page);
 await page.getByRole('button',{name:'Review source',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog.getByText('TCP acknowledges packets for reliable delivery.',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Confirm extraction for retrieval'}).click();
 await expect(page.getByText('notes.txt · 1 chunks · Ready for retrieval')).toBeVisible();
 await page.getByRole('button',{name:'Generate questions',exact:true}).click();
 await expect(page.getByText('Explain TCP acknowledgments.',{exact:true})).toBeVisible();
 await expect(page.getByText('paragraph 1 · relevance',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Edit candidate'}).click();await page.getByLabel('Candidate question').fill('Explain reliable TCP acknowledgments.');
 await page.getByRole('button',{name:'Accept for review'}).click();
 await expect(page.getByText('Saved to Question Bank · Needs Review')).toBeVisible();
 await expect(page.getByRole('button',{name:'Accept for review'})).toHaveCount(0);
});
test('AI failed generation gives actionable failure and regenerate',async({page})=>{
 await generationSetup(page,'failed');await page.getByRole('button',{name:'Generate questions',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Insufficient source coverage');
 await expect(page.getByRole('button',{name:'Regenerate with same settings'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Accept for review'})).toHaveCount(0);
});
test('AI generation cancel leaves no candidates',async({page})=>{
 await page.setViewportSize({width:390,height:844});await generationSetup(page,'running');
 await page.getByRole('button',{name:'Generate questions',exact:true}).click();await page.getByRole('button',{name:'Cancel generation'}).click();
 await expect(page.getByRole('heading',{name:'Cancelled',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Accept for review'})).toHaveCount(0);
});

test('AI acceptance flows through review approval into paper assembly',async({page})=>{
 const current=await generationSetup(page);
 let q={...current().request,...current().results[0].question,id:'qai',version:1,status:'NEEDS_REVIEW',source_type:'AI_GENERATED',source_reference:'notes.txt · paragraph 1',created_by:'faculty',updated_by:'faculty',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
 const structure={cos:[{id:'co1',code:'CO1',title:'Networks'}],units:[{id:'u1',code:'U1',title:'Transport'}],topics:[{id:'t1',unit_id:'u1',code:'T1',title:'TCP'}]};
 const blueprint={id:'bai',version:1,status:'PUBLISHED',syllabus_version_id:'sv1',config:{title:'AI review demo',duration_minutes:30,sections:[{id:'a',name:'Part A',offered:1,attempted:1,marks_each:'2',question_type:'SHORT_ANSWER',format:'STANDARD',choice_groups:[]}]}};
 const paper={id:'pai',title:'AI review demo',version:1,revision:1,status:'DRAFT',syllabus_version_id:'sv1',blueprint_version:1,duration_minutes:30,blueprint_snapshot:blueprint.config,syllabus_snapshot:structure,totals:{offered_marks:'2',attempted_marks:'2'},validation:{valid:false,errors:[],checks:[]},items:[{id:'iai',section_id:'a',position:1,choice_group:null,snapshot:null as typeof q|null,question_version:null as number|null}]};
 await page.route(/\/v3\/college\/question-papers\//,async route=>{
  const path=new URL(route.request().url()).pathname;const method=route.request().method();let json:unknown;
  if(path.endsWith('/review-queue'))json={items:current().results[0].decision==='ACCEPTED'?[q]:[],total:current().results[0].decision==='ACCEPTED'?1:0};
  else if(path.endsWith('/qai/review'))json={question:q,history:[]};
  else if(path.endsWith('/qai/review-history')||path.endsWith('/qai/validation-history'))json={items:[]};
  else if(path.endsWith('/qai/validate'))json={run_id:'ai-validation',question_version:1,current_question_version:1,stale:false,overall_status:'PASS',overall_score:90,checks:{structural:{status:'PASS',explanation:'Published taxonomy and fields are valid.',origin:'DETERMINISTIC',confidence:null}},warnings:[],failures:[],evidence:[{filename:'notes.txt',location:'paragraph 1',quote:'TCP acknowledges packets.'}],suggestions:[],claims:[],duplicate_matches:[],source_support:'SOURCE_SUPPORTED',validated_at:new Date().toISOString()};
  else if(path.endsWith('/qai/approve')){q={...q,status:'APPROVED',version:2};json=q;}
  else if(path.endsWith('/blueprints'))json={items:[blueprint]};
  else if(path.endsWith('/papers'))json=method==='POST'?paper:{items:[]};
  else if(path.endsWith('/papers/pai/history'))json={items:[]};
  else if(path.endsWith('/papers/pai/availability'))json={sections:[{section_id:'a',name:'Part A',counts:{APPROVED:q.status==='APPROVED'?1:0,NEEDS_REVIEW:q.status==='NEEDS_REVIEW'?1:0},available_distinct:q.status==='APPROVED'?1:0,required:1,sufficient:q.status==='APPROVED'}]};
  else if(path.endsWith('/papers/pai/eligible'))json={items:q.status==='APPROVED'?[q]:[],total:q.status==='APPROVED'?1:0,available_distinct:q.status==='APPROVED'?1:0,required:1,sufficient:q.status==='APPROVED',counts:{APPROVED:q.status==='APPROVED'?1:0,NEEDS_REVIEW:q.status==='NEEDS_REVIEW'?1:0}};
  else if(path.endsWith('/papers/pai/items/iai')){paper.items[0].snapshot=q;paper.items[0].question_version=2;paper.revision++;json=paper;}
  else return route.fallback();
  await route.fulfill({json});
 });
 await page.getByRole('button',{name:'Generate questions',exact:true}).click();
 await page.getByRole('button',{name:'Accept for review'}).click();
 await expect(page.getByText('Saved to Question Bank · Needs Review')).toBeVisible();
 await page.getByRole('button',{name:'Open Review Queue'}).click();
 await page.getByRole('button',{name:'Review',exact:true}).click();const review=page.getByRole('dialog',{name:'Review Question'});
 await expect(review.getByText('Needs Review',{exact:true})).toBeVisible();await review.getByRole('button',{name:'Run Validation',exact:true}).click();await expect(review.getByText('Structural · PASS',{exact:true})).toBeVisible();await expect(review.getByText('Needs Review',{exact:true})).toBeVisible();const beforeApproval=await page.evaluate(async()=>{const r=await fetch('/v3/college/question-papers/papers/pai/eligible');return r.json();});expect(beforeApproval.items).toEqual([]);await review.getByRole('button',{name:'Approve',exact:true}).click();await expect(review.getByText('Approved',{exact:true})).toBeVisible();
 await review.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Question Papers',exact:true}).click();await page.getByLabel('Paper syllabus').selectOption('sv1');await page.getByLabel('Published paper pattern').selectOption('bai');await page.getByRole('button',{name:'Create Paper',exact:true}).click();
 await page.getByRole('button',{name:'Select Question',exact:true}).click();const picker=page.getByRole('dialog');await expect(picker.getByText('Explain TCP acknowledgments.',{exact:true})).toBeVisible();await picker.getByRole('button',{name:'Use Question',exact:true}).click();await expect(picker).toBeHidden();await expect(page.getByRole('region',{name:'Paper assembly'}).getByText('Explain TCP acknowledgments.',{exact:true})).toBeVisible();
});

test('AI duplicate warning requires edit or rejection',async({page})=>{
 await generationSetup(page);
 await page.route('**/questions/generate',async route=>{const body=route.request().postDataJSON();await route.fulfill({json:{id:'duplicate1',status:'COMPLETED',revision:3,request:body,results:[{id:'dup1',decision:'PENDING',duplicate:true,warnings:[],question:{question_text:'Existing TCP question.',answer:'TCP acknowledges packets.',options:[],question_type:'SHORT_ANSWER',marks:2,rationale:'Source based.'},provenance:[]}],failure_reason:'',created_at:new Date().toISOString()}});});
 await page.route('**/generation-jobs/duplicate1/results/dup1/accept',route=>route.fulfill({status:409,json:{detail:'Exact normalized duplicate exists. Edit the candidate or reject it.'}}));
 await page.getByRole('button',{name:'Generate questions',exact:true}).click();await expect(page.getByText('Exact duplicate detected. Edit or reject before acceptance.')).toBeVisible();await page.getByRole('button',{name:'Accept for review'}).click();await expect(page.getByRole('alert')).toContainText('Exact normalized duplicate exists');
});

async function validationSetup(page:Page,unavailable=false){
 await reviewSetup(page,'NEEDS_REVIEW');
 type ValidationMock={run_id:string;question_version:number;current_question_version:number;stale:boolean;overall_status:string;overall_score:number|null;checks:Record<string,{status:string;explanation:string;origin:string;confidence:number|null;detected_bloom?:string}>;warnings:string[];failures:string[];evidence:{filename:string;location:string;quote:string}[];suggestions:string[];claims:unknown[];duplicate_matches:unknown[];source_support:string;validated_at:string};
 let currentVersion=1;const runs:ValidationMock[]=[];
 page.on('request',request=>{if(request.method()==='PUT'&&new URL(request.url()).pathname.endsWith('/questions/q1'))currentVersion++;});
 await page.route(/\/questions\/q1\/(validate|validation|validation-history)/,async route=>{
  const path=new URL(route.request().url()).pathname;let json:unknown;
  if(path.endsWith('/validate')){
   const body=route.request().postDataJSON();const run:ValidationMock={run_id:'vr'+(runs.length+1),question_version:body.expected_version,current_question_version:currentVersion,stale:false,overall_status:unavailable?'VALIDATION_UNAVAILABLE':'WARN',overall_score:unavailable?null:84,checks:{structural:{status:'PASS',explanation:'Fields and taxonomy are valid.',origin:'DETERMINISTIC',confidence:null},bloom_alignment:{status:'WARN',explanation:'Explanation requires understanding rather than application.',origin:unavailable?'UNAVAILABLE':'AI_ASSISTED',confidence:.82,detected_bloom:'K2'}},warnings:unavailable?['Provider unavailable; faculty review remains available.']:['Faculty review required.'],failures:[],evidence:unavailable?[]:[{filename:'transport-notes.txt',location:'page 2',quote:'TCP acknowledges packets for reliable delivery.'}],suggestions:['Clarify the expected reasoning.'],claims:[],duplicate_matches:[],source_support:unavailable?'NO_SOURCE':'SOURCE_SUPPORTED',validated_at:new Date().toISOString()};runs.unshift(run);json=run;
  }else json=path.endsWith('/validation-history')?{items:runs.map(r=>({...r,stale:r.question_version!==currentVersion,current_question_version:currentVersion}))}:{latest:runs[0]||null};
  await route.fulfill({json});
 });
 await page.getByRole('button',{name:'Review',exact:true}).click();
}

test('AI validation shows evidence then edit makes historical run stale and revalidation stays advisory',async({page})=>{
 await validationSetup(page);let dialog=page.getByRole('dialog',{name:'Review Question'});
 await dialog.getByRole('button',{name:'Run Validation',exact:true}).click();
 await expect(dialog.getByText('Bloom Alignment · WARN',{exact:true})).toBeVisible();await expect(dialog.getByText('transport-notes.txt · page 2',{exact:true})).toBeVisible();await expect(dialog.getByText('Needs Review',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Edit',exact:true}).click();dialog=page.getByRole('dialog',{name:'Edit Question'});await dialog.locator('[name="question_text"]').fill('Explain TCP flow control with an example.');await dialog.getByRole('button',{name:'Save new version'}).click();
 await page.getByRole('button',{name:'Review',exact:true}).click();dialog=page.getByRole('dialog',{name:'Review Question'});
 await expect(dialog.getByText(/^Stale — revalidation required for this version/)).toBeVisible();
 await dialog.getByRole('button',{name:'Revalidate',exact:true}).click();await expect(dialog.getByText(/Validated question version 2/)).toBeVisible();
 await dialog.getByLabel('View Previous Validation').selectOption('vr1');await expect(dialog.getByText(/Validated question version 1/)).toBeVisible();await expect(dialog.getByText(/^Stale — revalidation required for this version/)).toBeVisible();
 await dialog.getByRole('button',{name:'Approve',exact:true}).click();await expect(dialog.getByText('Approved',{exact:true})).toBeVisible();
});
test('unavailable AI validation leaves faculty approval controls available',async({page})=>{
 await validationSetup(page,true);const dialog=page.getByRole('dialog',{name:'Review Question'});await dialog.getByRole('button',{name:'Run Validation',exact:true}).click();await expect(dialog.getByText('Provider unavailable; faculty review remains available.',{exact:true})).toBeVisible();await expect(dialog.getByRole('button',{name:'Approve',exact:true})).toBeEnabled();await dialog.getByRole('button',{name:'Approve',exact:true}).click();await expect(dialog.getByText('Approved',{exact:true})).toBeVisible();
});

async function intelligenceMocks(page:Page){
 let version=1;let indexed=false;
 page.on('request',r=>{if(r.method()==='PUT'&&new URL(r.url()).pathname.endsWith('/questions/q1')){version++;indexed=false;}});
 await page.route(/\/questions\/(q1\/(similar|similarity-check|embedding-history)|usage)/,async route=>{
  const path=new URL(route.request().url()).pathname;let json:unknown;
  if(path.endsWith('/similarity-check')){expect(route.request().postDataJSON().expected_version).toBe(version);indexed=true;json={jobs:[{status:'QUEUED'}]};}
  else if(path.endsWith('/embedding-history'))json={items:[{question_version:1,status:'COMPLETED',stale:version!==1,model:'MiniLM',model_revision:'r1',dimension:384,failure_reason:''},...(indexed&&version!==1?[{question_version:version,status:'COMPLETED',stale:false,model:'MiniLM',model_revision:'r1',dimension:384,failure_reason:''}]:[])]};
  else if(path.endsWith('/usage'))json={items:[{times_used:2,number_of_papers:2,number_of_paper_revisions:4,first_used_date:'2025-05-01T10:00:00Z',last_used_date:'2026-05-01T10:00:00Z',history:[{paper_title:'Mid-Sem 2025',paper_version:1,question_version:1,revision:4,used_at:'2025-05-01T10:00:00Z'}]}]};
  else json={question_version:version,complete:indexed||version===1,missing_embeddings:indexed||version===1?0:1,truncated:false,counts:{HIGHLY_SIMILAR:1},message:'Similarity is advisory, not proof of duplication.',novelty:{score:19,label:'Very similar to existing content',formula:'100*(1-max_cosine) with transparent usage penalties'},matches:[{classification:'HIGHLY_SIMILAR',similarity:.91,query_version:version,question:{id:'q2',question_text:'Describe reliable delivery using TCP acknowledgments.',question_type:'SHORT_ANSWER',marks:2,bloom_level:'K2',difficulty:'MEDIUM',status:'APPROVED',version:3,source_type:'MANUAL',source_reference:'Faculty notes',created_at:'2025-05-01T10:00:00Z',mapping:{topics:{code:'T1',title:'TCP'}}}}]};
  await route.fulfill({json});
 });
}

test('Question Bank similarity usage and stale embeddings remain advisory',async({page})=>{
 await reviewSetup(page);await intelligenceMocks(page);
 await page.getByRole('button',{name:'Question Bank',exact:true}).click();await page.getByRole('button',{name:'Explain the TCP protocol.',exact:true}).click();
 let dialog=page.getByRole('dialog',{name:'Question Details'});
 await dialog.getByRole('button',{name:'Find Similar Questions'}).click();await expect(dialog.getByText('Highly Similar · Cosine 0.910',{exact:true})).toBeVisible();
 await dialog.getByText('Inspect matching question',{exact:true}).click();await expect(dialog.getByText(/Version 3/)).toBeVisible();
 await dialog.getByRole('button',{name:'View Usage'}).click();await expect(dialog.getByText(/Times used: 2 · Papers: 2/)).toBeVisible();await expect(dialog.getByText(/Mid-Sem 2025/)).toBeVisible();
 await dialog.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Question bank review',exact:true}).last().click();await page.getByRole('button',{name:'Review',exact:true}).click();dialog=page.getByRole('dialog',{name:'Review Question'});
 await dialog.getByRole('button',{name:'Find Similar Questions'}).click();await expect(dialog.getByRole('button',{name:'Approve',exact:true})).toBeEnabled();
 await dialog.getByRole('button',{name:'Edit',exact:true}).click();dialog=page.getByRole('dialog',{name:'Edit Question'});await dialog.locator('[name="question_text"]').fill('Explain reliable TCP delivery with an example.');await dialog.getByRole('button',{name:'Save new version'}).click();
 await page.getByRole('button',{name:'Review',exact:true}).click();dialog=page.getByRole('dialog',{name:'Review Question'});await dialog.getByRole('button',{name:'Find Similar Questions'}).click();await expect(dialog.getByText(/1 missing or stale embeddings/)).toBeVisible();await dialog.getByRole('button',{name:'Index / Refresh Similarity'}).click();await expect(dialog.getByText('Semantic indexing in progress…')).toBeHidden();await dialog.getByText('Embedding history',{exact:true}).click();await expect(dialog.getByText(/Version 2 · Completed/)).toBeVisible();await expect(dialog.getByRole('button',{name:'Approve',exact:true})).toBeEnabled();
});

test('generated similarity warning keeps accept decision available',async({page})=>{
 await generationSetup(page);
 let generationRequest:Record<string,unknown>={};
 await page.route('**/questions/generate',async route=>{generationRequest=route.request().postDataJSON();await route.fulfill({json:{id:'sim-job',status:'COMPLETED',revision:3,request:route.request().postDataJSON(),results:[{id:'sim-candidate',decision:'PENDING',duplicate:false,warnings:[],question:{question_text:'Explain reliable TCP delivery.',answer:'TCP acknowledges packets.',options:[],question_type:'SHORT_ANSWER',marks:2,rationale:'Related source concept.'},provenance:[],similarity:{semantic_available:true,message:'Similarity is advisory.',matches:[{classification:'HIGHLY_SIMILAR',similarity:.92,question:{id:'q2',version:3,question_text:'Describe TCP acknowledgments.'}}]}}],failure_reason:'',created_at:new Date().toISOString()}});});
 await page.route('**/generation-jobs/sim-job/results/sim-candidate/accept',async route=>{await route.fulfill({json:{id:'sim-job',status:'COMPLETED',revision:4,request:generationRequest,results:[{id:'sim-candidate',decision:'ACCEPTED',duplicate:false,warnings:[],question:{question_text:'Explain reliable TCP delivery.',answer:'TCP acknowledges packets.',options:[],question_type:'SHORT_ANSWER',marks:2,rationale:'Related source concept.'},provenance:[]}],failure_reason:'',created_at:new Date().toISOString()}});});
 await page.getByRole('button',{name:'Generate questions',exact:true}).click();await expect(page.getByRole('heading',{name:'Potentially similar question',exact:true})).toBeVisible();await expect(page.getByText(/Version 3: Describe TCP acknowledgments/)).toBeVisible();await expect(page.getByRole('button',{name:'Accept for review'})).toBeEnabled();await page.getByRole('button',{name:'Accept for review'}).click();await expect(page.getByText('Saved to Question Bank · Needs Review')).toBeVisible();
});

test('paper repetition warns after selection without blocking faculty actions',async({page})=>{
 await assemblySetup(page);
 await page.route(/\/papers\/p1\/(similarity|previous-paper-similarity)/,async route=>{const previous=route.request().url().includes('previous-paper');await route.fulfill({json:{paper_id:'p1',revision:2,semantic_available:true,truncated:false,matches:[{position:1,matched_position:2,classification:'HIGHLY_SIMILAR',similarity:.92,question_version:3,matched_question_version:2,matched_question_text:'Describe TCP acknowledgment and retransmission.',...(previous?{previous_paper_title:'Mid-Sem 2025',previous_paper_version:1,previous_paper_revision:4}:{})}],topic_warnings:previous?[]:[{topic:'TCP',count:3,message:'Topic repetition among offered selections.'}],repeated_topics:[]}});});
 await page.getByRole('button',{name:'Select Alternative',exact:true}).first().click();const picker=page.getByRole('dialog');await picker.getByRole('button',{name:'Use Question',exact:true}).first().click();await expect(picker).toBeHidden();
 const warnings=page.getByRole('region',{name:'Advisory paper repetition'});await expect(warnings.getByText(/Q1 · Highly Similar/).first()).toBeVisible();await expect(warnings.getByText(/Mid-Sem 2025/)).toBeVisible();await expect(page.getByRole('button',{name:'Validate Paper',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'Save Draft',exact:true})).toBeEnabled();
});

test('Question Bank repetition shows unused topics and distribution',async({page})=>{
 await setup(page,false,true);await page.route('**/questions/repetition-analysis?**',route=>route.fulfill({json:{question_count:3,counts:{bloom:{K1:1,K2:2},difficulty:{EASY:2,MEDIUM:1},units:{u1:3},topics:{t1:3},cos:{co1:3}},topics:[{id:'t1',code:'T1',title:'TCP',question_count:3,times_used:4,category:'HEAVILY_USED'},{id:'t2',code:'T2',title:'UDP',question_count:0,times_used:0,category:'UNUSED'}],usage:[],truncated:false,basis:'Immutable finalized paper snapshots.'}}));
 await page.getByRole('button',{name:'Intelligence',exact:true}).click();await page.getByRole('button',{name:'View Repetition Analysis'}).click();await expect(page.getByRole('table').getByText('Unused',{exact:true})).toBeVisible();await expect(page.getByRole('table').getByText('Heavily Used',{exact:true})).toBeVisible();
});

async function blueprintAssistMocks(page:Page,mode='covered'){
 const question={id:'q1',subject_id:'s1',question_text:'Which network protocol 1?',question_type:'MCQ',marks:1,co_id:'co1',unit_id:'u1',topic_id:'t1',bloom_level:'K1',difficulty:'EASY',answer:'One',options:['One','Two'],source_type:'MANUAL',source_reference:'Faculty notes',status:'APPROVED',version:2,created_by:'Faculty',updated_by:'Faculty',created_at:'2026-10-07',updated_at:'2026-10-07'};
 const request={subject_id:'s1',syllabus_version_id:'sv1',co_id:'co1',unit_id:'u1',topic_id:'t1',question_type:'MCQ',marks:1,bloom_level:'K1',difficulty:'EASY',count:1,instructions:'Prepare one source-grounded question.',conceptual:false};
 const recommendation={question_id:'q1',question_version:2,question,match_type:mode==='advisory'?'ADVISORY':'STRICT',similarity_score:.2,novelty_score:74,usage:{historical_papers:1,topic_usage:2},warnings:['Previously used in a finalized paper.'],explanations:['Exact published taxonomy, marks and type.'],format_confirmation_required:false};
 const option={request,labels:{cos:'CO1 · Networks',units:'U1 · Transport',topics:'T1 · TCP'},allowed_blooms:['K1'],allowed_difficulties:['EASY'],allowed_types:['MCQ'],source_scope:[{filename:'notes.txt',location:'paragraph 1'}]};
 const slots=[1,2].map(n=>({slot_id:'i'+n,position:n,status:mode==='covered'?'COVERED':'MISSING',strict_eligible_count:mode==='covered'?2:0,advisory_candidate_count:mode==='advisory'?1:0,requirement:{marks:'1',question_type:'MCQ',format:'STANDARD'},recommended_questions:mode==='covered'||mode==='advisory'?[recommendation]:[],generation_available:mode==='generation',generation_state:mode==='generation'?'READY':'INSUFFICIENT_SOURCE',generation_options:mode==='generation'?[option]:[],reasons:['Existing validation remains authoritative.'],selected_question:null,recommended_question_id:mode==='covered'?'q1':null}));
 const report={analysis_token:'a'.repeat(64),blueprint_version:1,paper_revision:1,overall_status:mode==='covered'?'FEASIBLE':'INFEASIBLE',covered_slots:mode==='covered'?2:0,slot_count:2,partially_covered_slots:0,missing_slots:mode==='covered'?0:2,offered_marks:'2',attempted_marks:'1',warnings:[],slots,stale:false,truncated:false,question_bank_state:'bank-v1'};
 await page.route(/\/(papers\/p1\/ai-assist|blueprints\/b1\/intelligence)/,async route=>{
  if(mode==='stale'&&route.request().method()==='POST')return route.fulfill({status:409,json:{detail:'Analysis is stale. Refresh before applying recommendations.'}});
  if(route.request().method()==='POST')expect(route.request().postDataJSON().expected_analysis_token).toBe(report.analysis_token);
  await route.fulfill({json:report});
 });
 await page.route('**/questions/q1',route=>route.fulfill({json:question}));
 return {question,request,report};
}

test('blueprint analysis displays coverage and uses existing authoritative assignment',async({page})=>{
 await assemblySetup(page);await blueprintAssistMocks(page);let assignments=0;
 page.on('request',r=>{if(r.method()==='PUT'&&r.url().endsWith('/papers/p1/items/i1')){const data=r.postDataJSON();expect(data.expected_revision).toBe(1);expect(data.expected_question_version).toBe(2);assignments++;}});
 const panel=page.getByRole('region',{name:'AI Blueprint Analysis'});await panel.getByRole('button',{name:'Analyze Blueprint'}).click();await expect(panel.getByText('Covered 2 / 2 · Partial 0 · Missing 0')).toBeVisible();expect(assignments).toBe(0);
 await panel.getByRole('button',{name:'View',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'Recommended Question'});await expect(dialog.getByText('One',{exact:true})).toHaveCount(2);await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await panel.getByRole('button',{name:'Use Question',exact:true}).first().click();await expect(page.getByText('Selected question v2 · Approved',{exact:true})).toHaveCount(1);expect(assignments).toBe(1);await expect(page.getByRole('button',{name:'Send for Faculty Review',exact:true})).toBeDisabled();
});

test('advisory blueprint candidates cannot be used and unresolved slots remain visible',async({page})=>{
 await assemblySetup(page);await blueprintAssistMocks(page,'advisory');const panel=page.getByRole('region',{name:'AI Blueprint Analysis'});await panel.getByRole('button',{name:'Analyze Blueprint'}).click();await expect(panel.getByText('Covered 0 / 2 · Partial 0 · Missing 2')).toBeVisible();await expect(panel.getByRole('button',{name:'Use Question',exact:true}).first()).toBeDisabled();await expect(panel.getByRole('button',{name:'Generate Question',exact:true}).first()).toBeDisabled();await panel.getByRole('button',{name:'Leave Unresolved',exact:true}).first().click();await expect(panel.getByText('Left unresolved. The slot still requires faculty attention.')).toBeVisible();await expect(page.getByText('No question selected.',{exact:true})).toHaveCount(2);
});

test('stale analysis blocks applying recommendation while manual assembly remains available',async({page})=>{
 await assemblySetup(page);await blueprintAssistMocks(page,'stale');await page.route('**/papers/p1/ai-assist',async route=>route.fulfill({json:{...(await blueprintAssistReport()),stale:false}}));
 let assignments=0;page.on('request',r=>{if(r.method()==='PUT'&&r.url().includes('/items/'))assignments++;});
 const panel=page.getByRole('region',{name:'AI Blueprint Analysis'});await panel.getByRole('button',{name:'Analyze Blueprint'}).click();await panel.getByRole('button',{name:'Use Question',exact:true}).first().click();await expect(panel.getByRole('alert')).toContainText('Analysis is stale');expect(assignments).toBe(0);await expect(page.getByRole('button',{name:'Select Alternative',exact:true}).first()).toBeEnabled();
});
async function blueprintAssistReport(){return {analysis_token:'a'.repeat(64),blueprint_version:1,paper_revision:1,overall_status:'FEASIBLE',covered_slots:2,slot_count:2,partially_covered_slots:0,missing_slots:0,offered_marks:'2',attempted_marks:'1',warnings:[],slots:[{slot_id:'i1',position:1,status:'COVERED',strict_eligible_count:2,advisory_candidate_count:0,requirement:{marks:'1',question_type:'MCQ',format:'STANDARD'},recommended_questions:[{question_id:'q1',question_version:2,question:{question_text:'Which network protocol 1?',bloom_level:'K1',difficulty:'EASY'},match_type:'STRICT',similarity_score:null,novelty_score:null,usage:{historical_papers:0,topic_usage:0},warnings:[],explanations:[],format_confirmation_required:false}],generation_available:false,generation_state:'NOT_REQUIRED',generation_options:[],reasons:[],selected_question:null,recommended_question_id:'q1'}],stale:false,truncated:false,question_bank_state:'bank-v1'};}

test('blueprint missing slot generation reuses source grounded needs review without assignment',async({page})=>{
 await assemblySetup(page);const {request}=await blueprintAssistMocks(page,'generation');
 const pin={id:'sv1',version:1,status:'PUBLISHED',content:{cos:[{id:'co1',code:'CO1',title:'Networks'}],units:[{id:'u1',code:'U1',title:'Transport'}],topics:[{id:'t1',unit_id:'u1',code:'T1',title:'TCP'}]}};
 await page.route('**/subjects/s1/syllabus/versions/sv1',route=>route.fulfill({json:pin}));
 let accepted=false;let assignments=0;page.on('request',r=>{if(r.method()==='PUT'&&r.url().includes('/items/'))assignments++;});
 await page.route(/\/question-papers\/(sources|imports|questions\/(generation|generate))/,async route=>{
  const path=new URL(route.request().url()).pathname;let json:unknown={items:[]};
  const candidate={id:'candidate',decision:accepted?'ACCEPTED':'PENDING',duplicate:false,warnings:['Faculty approval required.'],question:{question_text:'Which protocol acknowledges packets?',question_type:'MCQ',marks:1,answer:'One',options:['One','Two'],rationale:'Reviewed source context.'},provenance:[{filename:'notes.txt',location:'paragraph 1',quote:'Packets are acknowledged.',retrieval_score:.9}]};
  if(path.endsWith('/generation-config'))json={enabled:true,message:'Ready'};
  else if(path.endsWith('/sources'))json={items:[{source_id:'src1',filename:'notes.txt',chunks:1,reviewed:true}]};
  else if(path.endsWith('/questions/generate')){expect(route.request().postDataJSON()).toMatchObject({...request,conceptual:false});json={id:'planned-job',request,status:'COMPLETED',revision:3,results:[candidate],created_at:new Date().toISOString(),failure_reason:''};}
  else if(path.endsWith('/accept')){accepted=true;json={id:'planned-job',request,status:'COMPLETED',revision:4,results:[{...candidate,decision:'ACCEPTED'}],created_at:new Date().toISOString(),failure_reason:''};}
  await route.fulfill({json});
 });
 const panel=page.getByRole('region',{name:'AI Blueprint Analysis'});await panel.getByRole('button',{name:'Analyze Blueprint'}).click();await panel.getByRole('button',{name:'Generate Question',exact:true}).first().click();await page.getByRole('dialog',{name:'Generate for Q1'}).getByRole('button',{name:'Open Generation'}).click();
 await expect(page.getByLabel('Generation marks',{exact:true})).toBeDisabled();await expect(page.getByLabel('Generation type',{exact:true})).toBeDisabled();await page.getByRole('button',{name:'Generate questions',exact:true}).click();await page.getByRole('button',{name:'Accept for review'}).click();await expect(page.getByText('Saved to Question Bank · Needs Review')).toBeVisible();expect(assignments).toBe(0);await expect(page.getByText('No question selected.',{exact:true})).toHaveCount(2);
});

const templateConfiguration={header_alignment:'CENTER',institution_alignment:'CENTER',logo_placement:'CENTER',show_logo:true,show_address:true,show_page_numbers:true,show_fields:['course_code','course_name','duration','maximum_marks'],address_text:'',contact_text:'',header_text:'',footer_text:'',section_style:'NORMAL',numbering:'CONTINUOUS'};
function documentModel(answer=false){return {institution:{name:'Demo College',address:'Chennai',contact:''},title:'Midterm',paper_version:1,revision:3,document_type:answer?'ANSWER':'STUDENT',layout:templateConfiguration,fields:[{label:'Course Code',value:'CN'},{label:'Maximum Marks',value:'1'}],instructions:'Choose one alternative.',offered_marks:'2',sections:[{title:'Part A',instruction:'Answer 1 of 2 questions.',attempted_marks:'1',questions:[{number:1,text:'Which network protocol 1?',marks:'1',options:['One','Two'],choice_instruction:'Choice 1: choose 1 of 2',or_before:false,...(answer?{answer:'Stored faculty solution.',correct_option:'A. One',marking_scheme:'Marking scheme not provided.'}:{})}]}],warnings:[]};}

test('institution template create edit activate preview and new version',async({page})=>{
 await setup(page);let row={id:'tpl1',name:'',description:'',version:1,revision:1,status:'DRAFT',used:false,has_logo:false,configuration:templateConfiguration};let created=false;
 await page.route(/\/question-papers\/templates/,async route=>{
  const path=new URL(route.request().url()).pathname;const method=route.request().method();let json:unknown={items:created?[row]:[],can_write:true,branding:{name:'Demo College'}};
  if(path.endsWith('/templates')&&method==='POST'){row={...row,...route.request().postDataJSON()};created=true;json=row;}
  else if(path.endsWith('/preview'))json={render_model:documentModel()};
  else if(path.endsWith('/activate')){row={...row,status:route.request().postDataJSON().active?'ACTIVE':'INACTIVE',revision:row.revision+1};json=row;}
  else if(path.endsWith('/new-version')){row={...row,id:'tpl2',version:2,revision:1,status:'DRAFT'};json=row;}
  else if(method==='PUT'){row={...row,...route.request().postDataJSON(),revision:row.revision+1};json=row;}
  await route.fulfill({json});
 });
 await page.getByRole('button',{name:'Templates',exact:true}).click();await page.getByRole('button',{name:'Create Template',exact:true}).click();let dialog=page.getByRole('dialog');await dialog.getByLabel('Template name',{exact:true}).fill('Institution Layout');await dialog.getByLabel('Footer Text',{exact:true}).fill('Examination Office');await dialog.getByRole('button',{name:'Save Template Draft'}).click();await expect(page.getByText('Institution Layout · v1',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Edit Draft Template'}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Header Text',{exact:true}).fill('Official Institution Examination');await dialog.getByRole('button',{name:'Save Template Draft'}).click();
 await page.getByRole('button',{name:'Preview Template'}).click();dialog=page.getByRole('dialog');await expect(dialog.getByRole('article',{name:'Document Preview'})).toBeVisible();await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Activate Template'}).click();await expect(page.getByRole('button',{name:'Deactivate Template'})).toBeVisible();await page.getByRole('button',{name:'New Template Version'}).click();await expect(page.getByRole('dialog',{name:'Edit Draft Template'})).toBeVisible();expect(row.version).toBe(2);expect(row.configuration.footer_text).toBe('Examination Office');
});

async function officialExportSetup(page:Page,allowAnswers=true,failure=false){
 await assemblySetup(page,false,true);await page.getByRole('button',{name:'Approve Paper'}).click();await page.getByRole('button',{name:'Lock Paper'}).click();
 const records:{id:string;revision:number;format:string;document_type:string;template_name:string;template_version:number;created_at:string;sha256:string;byte_size:number;warnings:string[]}[]=[];const requests:URLSearchParams[]=[];
 await page.route(/\/question-papers\/(templates|papers\/p1\/(export|exports))/,async route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  if(path.endsWith('/templates')){await route.fulfill({json:{items:[{id:'tpl1',name:'Institution Layout',version:1,status:'ACTIVE'}]}});return;}
  if(path.endsWith('/exports')){await route.fulfill({json:{items:records,can_export_answers:allowAnswers}});return;}
  if(path.endsWith('/export-preview')){await route.fulfill({json:{render_model:documentModel(url.searchParams.get('document_type')==='ANSWER')}});return;}
  if(path.endsWith('/export')){
   requests.push(url.searchParams);
   if(failure){await route.fulfill({status:503,json:{detail:'Export storage failed. No successful export record was created.'}});return;}
   const format=url.searchParams.get('format')||'PDF',kind=url.searchParams.get('document_type')||'STUDENT';records.push({id:'ex'+records.length,revision:3,format,document_type:kind,template_name:'Institution Layout',template_version:1,created_at:'2026-10-07T12:00:00Z',sha256:'b'.repeat(64),byte_size:200,warnings:kind==='ANSWER'?['Marking scheme not provided.']:[]});await route.fulfill({contentType:format==='PDF'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',body:'canonical mock document'});return;
  }
  if(path.endsWith('/download')){await route.fulfill({contentType:'application/pdf',body:'canonical saved document'});return;}
  await route.fallback();
 });
 await page.getByRole('button',{name:'Export Documents'}).click();return {records,requests};
}

test('locked student and answer documents PDF DOCX preview and export history',async({page})=>{
 const {records,requests}=await officialExportSetup(page);const dialog=page.getByRole('dialog',{name:'Export Locked Paper'});await dialog.getByLabel('Export template').selectOption('tpl1');await dialog.getByRole('button',{name:'Preview Document'}).click();await expect(dialog.getByRole('article',{name:'Document Preview'})).toBeVisible();await expect(dialog.getByText('Answer / solution:',{exact:false})).toHaveCount(0);
 for(const [kind,format] of [['STUDENT','PDF'],['STUDENT','DOCX'],['ANSWER','PDF'],['ANSWER','DOCX']]){
  await dialog.getByRole('radio',{name:`${kind==='ANSWER'?'Answer Key':'Student Paper'} ${format}`,exact:true}).check();
  if(kind==='ANSWER'){await dialog.getByRole('button',{name:'Preview Document'}).click();await expect(dialog.getByText('Answer / solution: Stored faculty solution.',{exact:true})).toBeVisible();}
  const download=page.waitForEvent('download');await dialog.getByRole('button',{name:'Export and Download'}).click();await expect((await download).suggestedFilename()).toContain('.'+format.toLowerCase());
 }
 await expect(dialog.getByRole('button',{name:'Download Saved Export'})).toHaveCount(4);expect(records.length).toBe(4);expect(requests.every(q=>q.get('revision')==='3'&&q.get('template_id')==='tpl1')).toBeTruthy();const download=page.waitForEvent('download');await dialog.getByRole('button',{name:'Download Saved Export'}).first().click();await download;
});

test('readonly answer export options are hidden while student preview is available',async({page})=>{
 await officialExportSetup(page,false);const dialog=page.getByRole('dialog',{name:'Export Locked Paper'});await expect(dialog.getByRole('radio')).toHaveCount(2);await expect(dialog.getByRole('radio',{name:/Answer Key/})).toHaveCount(0);await expect(dialog.getByText('Answer Key / Solution',{exact:true})).toHaveCount(0);await dialog.getByRole('button',{name:'Preview Document'}).click();await expect(dialog.getByRole('article',{name:'Document Preview'})).toBeVisible();
});

test('export storage failure shows a clear error without successful export history',async({page})=>{
 const {records}=await officialExportSetup(page,true,true);await page.getByRole('dialog').getByRole('button',{name:'Export and Download'}).click();await expect(page.getByRole('alert')).toContainText('Export storage failed');expect(records.length).toBe(0);await expect(page.getByRole('button',{name:'Download Saved Export'})).toHaveCount(0);
});

test('grouped QPG navigation preserves subject context and accessible actions',async({page})=>{
 await setup(page);
 const primary=page.getByRole('navigation',{name:'Question paper sections'});
 await expect(primary.getByRole('button')).toHaveText(['Overview','Academic Setup','Question Bank','Question Papers','Templates','Reports']);
 for(const old of ['Syllabus','Blueprint','Paper Assembly','AI Questions','Review Queue','Bank Intelligence','Drafts'])await expect(primary.getByRole('button',{name:old,exact:true})).toHaveCount(0);
 await expect(page.getByRole('region',{name:'Selected academic context'})).toContainText('Year 2 › Semester 4');
 await expect(page.getByLabel('Program',{exact:true})).toHaveCount(0);
 await primary.getByRole('button',{name:'Academic Setup'}).click();
 await expect(page.getByLabel('Program',{exact:true})).toHaveValue('BTECH');
 await page.getByRole('navigation',{name:'Academic setup views'}).getByRole('button',{name:'Syllabus'}).click();
 await expect(page.getByRole('region',{name:'Subject syllabus'})).toBeVisible();
 await primary.getByRole('button',{name:'Question Bank'}).click();
 const bank=page.getByRole('navigation',{name:'Question bank views'});
 await expect(bank.getByRole('button')).toHaveText(['Questions','Import PYQ','AI Generate','Review','Intelligence','Question Drafts']);
 await bank.getByRole('button',{name:'Import PYQ'}).click();await page.getByRole('navigation',{name:'Question bank views'}).getByRole('button',{name:'Import PYQ'}).click();await page.getByRole('button',{name:'Import Questions',exact:true}).click();await expect(page.getByRole('dialog',{name:'Import Questions'})).toBeVisible();await page.keyboard.press('Escape');
 await bank.getByRole('button',{name:'Question Drafts'}).click();await expect(page.getByRole('heading',{name:'Draft Questions'})).toBeVisible();
 await primary.getByRole('button',{name:'Reports'}).click();await expect(page.getByRole('heading',{name:'Reports & Analytics',exact:true})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Question bank views'})).toHaveCount(0);
 await primary.getByRole('button',{name:'Question Papers'}).click();await expect(page.getByRole('navigation',{name:'Question paper views'}).getByRole('button')).toHaveText(['Paper Patterns','Create Paper','Drafts','Review','Final Papers']);
 await page.keyboard.press('Tab');await expect(page.locator(':focus')).toBeVisible();
});

test('paper stage lists filter existing records without changing APIs',async({page})=>{
 await setup(page,false,true);
 await page.route('**/v3/college/question-papers/papers?*',r=>r.fulfill({json:{items:[{id:'pd',title:'Draft Exam',status:'DRAFT'},{id:'pr',title:'Review Exam',status:'FACULTY_REVIEW'},{id:'pf',title:'Final Exam',status:'LOCKED'}]}}));
 await page.getByRole('button',{name:'Question Papers',exact:true}).click();
 const nav=page.getByRole('navigation',{name:'Question paper views'});
 await nav.getByRole('button',{name:'Drafts',exact:true}).click();await expect(page.getByRole('button',{name:'Draft Exam · Draft'})).toBeVisible();await expect(page.getByRole('button',{name:/Final Exam/})).toHaveCount(0);
 await nav.getByRole('button',{name:'Paper review view'}).click();await expect(page.getByRole('button',{name:/Review Exam/})).toBeVisible();await expect(page.getByRole('button',{name:/Draft Exam/})).toHaveCount(0);
 await nav.getByRole('button',{name:'Final Papers'}).click();await expect(page.getByRole('button',{name:/Final Exam/})).toBeVisible();await expect(page.getByRole('button',{name:/Review Exam/})).toHaveCount(0);
 await nav.getByRole('button',{name:'Create paper view'}).click();await expect(page.getByLabel('Published paper pattern')).toBeVisible();
});

test('export permission refresh clears the prior answer preview and selects student output',async({page})=>{
 await officialExportSetup(page);
 let dialog=page.getByRole('dialog',{name:'Export Locked Paper'});
 await expect(dialog.getByRole('radio')).toHaveCount(4);
 await dialog.getByRole('radio',{name:'Answer Key PDF',exact:true}).check();
 await dialog.getByRole('button',{name:'Preview Document'}).click();
 await expect(dialog.getByText('Answer / solution: Stored faculty solution.',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await page.route('**/question-papers/papers/p1/exports',route=>route.fulfill({json:{items:[],can_export_answers:false}}));
 await page.getByRole('button',{name:'Export Documents',exact:true}).click();
 dialog=page.getByRole('dialog',{name:'Export Locked Paper'});
 await expect(dialog.getByRole('radio',{name:/Answer Key/})).toHaveCount(0);
 await expect(dialog.getByRole('radio',{name:'Student Paper PDF',exact:true})).toBeChecked();
 await expect(dialog.getByText('Answer / solution: Stored faculty solution.',{exact:true})).toHaveCount(0);
 await expect(dialog.getByRole('article',{name:'Document Preview'})).toHaveCount(0);
});

function reportFixture(empty=false){return {definition:'Analytics are derived from authoritative QPG records and finalized paper snapshots.',basis:'Current bank counts and finalized offered snapshot usage are separate.',truncated:false,bank:{total:empty?0:4,statuses:empty?{}:{APPROVED:2,NEEDS_REVIEW:1,DRAFT:1},distributions:{co:{co1:4},unit:{u1:4},topic:{t1:4},bloom:{K2:4},difficulty:{MEDIUM:4},type:{SHORT_ANSWER:4},marks:{'2':4}},labels:{co:{co1:'CO1 · Networks'},unit:{u1:'U1 · Transport'},topic:{t1:'T1 · TCP'}},quality:{missing_answers:0,missing_provenance:0}},paper_statuses:{LOCKED:empty?0:1},coverage_threshold:3,coverage:empty?[]:[{id:'t1',code:'T1',title:'TCP',approved:2,review:1,draft:1,offered_uses:1,coverage:'LOW_COVERAGE'}],cos:empty?[]:[{id:'co1',code:'CO1',title:'Networks',approved:2,offered_uses:1}],usage_summary:{questions_used:empty?0:1,unique_questions_used:empty?0:1,offered_uses:empty?0:1},usage:empty?[]:[{question_id:'q1',question_version:3,question_text:'Explain TCP reuse.',paper_count:1,times_used:1,first_used:'2026-10-07',last_used:'2026-10-07',category:'RARELY_USED'}],papers:empty?[]:[{id:'p1',title:'Final Networks Exam',status:'LOCKED',version:1,revision:5,marks:2,question_count:1,approved_at:'2026-10-07',locked_at:'2026-10-07',pattern:'Network Pattern',blueprint_version:1,coverage:{co:{represented:1,available:1}},novelty:{average:null,reason:'No captured novelty.'}}],paper_distributions:{bloom:{K2:1},difficulty:{MEDIUM:1}},patterns:empty?[]:[{id:'b1',version:1,title:'Network Pattern',papers:1}],validation:{runs:1,outcomes:{WARN:1},categories:{bloom_alignment:1},questions_with_warnings:1,version_or_publication_stale:0,note:'Historical advisory runs.'},generation:{candidates:2,decisions:{ACCEPTED:1,REJECTED:1},acceptance_rate:50,basis:'Recorded job decisions.'},sources:[{id:'source1',bank_questions:1}],similarity:{pairs:[],missing_embeddings:4,sample_questions:4,note:'Cached exact-version vectors only.'},novelty:[{question_id:'q1',version:3,score:null,label:'Unavailable / incomplete semantic coverage'}]};}

test('Reports academic filters cards coverage distributions usage papers and CSV',async({page})=>{
 await setup(page,false,true);let captured='';
 await page.route('**/question-papers/reports?*',r=>{captured=r.request().url();return r.fulfill({json:reportFixture()});});
 await page.route('**/question-papers/reports/export?*',r=>{captured=r.request().url();return r.fulfill({contentType:'text/csv',body:'Report,Field,Value\nBank,total,4',headers:{'Content-Disposition':'attachment; filename="qpg-report.csv"'}});});
 await page.getByRole('navigation',{name:'Question paper sections'}).getByRole('button',{name:'Reports',exact:true}).click();
 await expect(page.getByLabel('Program',{exact:true})).toHaveValue('BTECH');
 await page.getByLabel('Report syllabus',{exact:true}).selectOption('sv1');
 await page.getByLabel('Event date range',{exact:true}).selectOption('LAST_7_DAYS');
 await page.getByRole('button',{name:'View Reports',exact:true}).click();
 await expect(page.getByRole('region',{name:'Question Bank',exact:true})).toContainText('4');
 await expect(page.getByRole('heading',{name:'Question Bank coverage',exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'CO coverage',exact:true})).toContainText('CO1');
 await expect(page.getByRole('heading',{name:'Bank Bloom distribution',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Bank Difficulty distribution',exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Question usage',exact:true})).toContainText('Explain TCP reuse.');
 await expect(page.getByRole('region',{name:'Paper analysis',exact:true})).toContainText('Final Networks Exam');
 await expect(page.getByRole('region',{name:'Repetition and novelty',exact:true})).toContainText('Cached exact-version vectors');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export report CSV'}).click();await download;
 expect(captured).toContain('syllabus_version_id=sv1');expect(captured).toContain('preset=LAST_7_DAYS');expect(captured).toContain('subject_id=s1');
});

test('Reports empty state and permission error',async({page})=>{
 await setup(page);let denied=false;
 await page.route('**/question-papers/reports?*',r=>r.fulfill(denied?{status:403,json:{detail:'An academic faculty assignment is required.'}}:{json:reportFixture(true)}));
 await page.getByRole('button',{name:'Reports',exact:true}).click();await page.getByRole('button',{name:'View Reports',exact:true}).click();
 await expect(page.getByText('No questions are recorded for this subject and publication filter.')).toBeVisible();
 await expect(page.getByText('No finalized papers in this event window.')).toBeVisible();
 denied=true;await page.getByRole('button',{name:'View Reports',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('An academic faculty assignment');
 await expect(page.getByRole('button',{name:'Export report CSV'})).toBeDisabled();
});

test('readonly bank details conceal answer and version payload even when an old response contains them',async({page})=>{
 await reviewSetup(page,'NEEDS_REVIEW');
 await page.route('**/question-papers/academic-options',route=>route.fulfill({json:{programs:[{code:'BTECH',display_name:'B.Tech',duration_years:4,departments:[{code:'CSE',display_name:'Computer Science'}]}],erp_subjects:[],can_setup:false,can_write:false}}));
 await page.reload();
 await page.getByRole('navigation',{name:'Question paper sections'}).getByRole('button',{name:'Academic Setup',exact:true}).click();
 await page.getByLabel('Program',{exact:true}).selectOption('BTECH');
 await page.getByLabel('Branch',{exact:true}).selectOption('CSE');
 await page.getByLabel('Year',{exact:true}).selectOption('2');
 await page.getByLabel('Semester',{exact:true}).selectOption('4');
 await page.getByLabel('Subject',{exact:true}).selectOption('s1');
 await page.getByRole('navigation',{name:'Question paper sections'}).getByRole('button',{name:'Question Bank',exact:true}).click();
 await page.getByRole('button',{name:'Explain the TCP protocol.',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Question Details'});
 await expect(dialog.getByText('Answer access requires academic write permission.',{exact:true})).toBeVisible();
 await expect(dialog.getByText('TCP provides reliable delivery.',{exact:true})).toHaveCount(0);
 await dialog.getByText(/Version 1 ·/).click();
 await expect(dialog.getByText('Answer details are restricted.',{exact:true})).toBeVisible();
 await expect(dialog.locator('pre')).not.toContainText('TCP provides reliable delivery.');
});

test('hierarchical blueprint editor saves typed OR children and constraints',async({page})=>{
 await setup(page,false,true);
 await page.getByRole('button',{name:'Question Papers',exact:true}).click();await page.getByRole('button',{name:'Paper Patterns',exact:true}).click();
 const panel=page.getByRole('region',{name:'Subject blueprint'});
 await panel.getByLabel('Published syllabus',{exact:true}).selectOption('sv1');await panel.getByLabel('Blueprint name',{exact:true}).fill('Nested reference');
 await panel.getByLabel('Final attempted marks',{exact:true}).fill('11');await panel.getByLabel('Marks each',{exact:true}).fill('11');
 await panel.getByRole('button',{name:'Add compulsory main question',exact:true}).click();
 const hierarchy=panel.getByRole('group',{name:'Main questions, OR branches and sub-questions'});
 for(let i=0;i<2;i++){
  await hierarchy.getByRole('button',{name:'Add sub-question',exact:true}).nth(i).click();await hierarchy.getByRole('button',{name:'Add sub-question',exact:true}).nth(i).click();
 }
 const children=hierarchy.getByLabel(/Child (i|ii) marks/);await expect(children).toHaveCount(4);
 for(let i=0;i<4;i++)await children.nth(i).fill(i%2?'5':'6');
 for(let i=0;i<4;i++){
  await hierarchy.getByLabel('CO',{exact:true}).nth(i).selectOption('co1');await hierarchy.getByLabel('Unit',{exact:true}).nth(i).selectOption('u1');await hierarchy.getByLabel('Topic',{exact:true}).nth(i).selectOption('t1');await hierarchy.getByLabel('K-Level',{exact:true}).nth(i).selectOption('K3');
 }
 const requestPromise=page.waitForRequest(r=>r.method()==='POST'&&new URL(r.url()).pathname.endsWith('/blueprints'));
 await panel.getByRole('button',{name:'Save Draft',exact:true}).click();const body=(await requestPromise).postDataJSON();
 expect(body.config.sections[0].main_questions).toHaveLength(1);const main=body.config.sections[0].main_questions[0];expect(main.branches).toHaveLength(2);
 expect(main.branches[0].children.map((c:{marks:string})=>c.marks)).toEqual(['6','5']);expect(main.branches[1].children[1].bloom_level).toBe('K3');
 expect(new Set([main.id,...main.branches.flatMap((b:{id:string;children:{id:string}[]})=>[b.id,...b.children.map(c=>c.id)])]).size).toBe(7);
});

test('bound hierarchy generation preserves node and revision identity',async({page})=>{
 await assemblySetup(page);const {request,report}=await blueprintAssistMocks(page,'generation');
 const binding={blueprint_id:'b1',blueprint_version:1,blueprint_revision:3,node_id:'child-i',paper_id:'p1',paper_revision:1};
 const bound={...request,marks:6,binding};
 report.slots[0].generation_options[0].request=bound;
 await page.route('**/papers/p1/ai-assist',route=>route.fulfill({json:report}));
 await page.route('**/subjects/s1/syllabus/versions/sv1',route=>route.fulfill({json:{id:'sv1',version:1,status:'PUBLISHED',content:{cos:[{id:'co1',code:'CO1',title:'Networks'}],units:[{id:'u1',code:'U1',title:'Transport'}],topics:[{id:'t1',unit_id:'u1',code:'T1',title:'TCP'}]}}}));
 await page.route(/\/question-papers\/(sources|imports|questions\/generation-jobs)/,route=>route.fulfill({json:{items:[]}}));
 await page.route('**/questions/generation-config',route=>route.fulfill({json:{enabled:true,message:'Ready'}}));
 await page.route('**/questions/generation-jobs?*',route=>route.fulfill({json:{items:[]}}));
 await page.route('**/questions/generate',async route=>{expect(route.request().postDataJSON().binding).toEqual(binding);expect(route.request().postDataJSON().marks).toBe(6);await route.fulfill({status:409,json:{detail:'Paper binding changed. Refresh the exact node.'}});});
 const panel=page.getByRole('region',{name:'AI Blueprint Analysis'});await panel.getByRole('button',{name:'Analyze Blueprint'}).click();await panel.getByRole('button',{name:'Generate Question',exact:true}).first().click();await page.getByRole('button',{name:'Open Generation',exact:true}).click();
 await expect(page.getByLabel('Generation marks',{exact:true})).toHaveValue('6');await page.getByRole('button',{name:'Generate questions',exact:true}).click();await expect(page.getByText('Paper binding changed. Refresh the exact node.',{exact:true})).toBeVisible();
});
