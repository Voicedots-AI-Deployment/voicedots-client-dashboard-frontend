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
 await page.getByLabel('Year',{exact:true}).selectOption('1');
 await expect(page.getByLabel('Semester',{exact:true})).toHaveValue('');
 await expect(page.getByLabel('Subject',{exact:true})).toHaveValue('');
 await expect(page.getByRole('button',{name:'Add Question',exact:true})).toBeDisabled();
});

test('document preview correction and explicit confirmation',async({page})=>{
 await setup(page);
 await page.getByRole('button',{name:'Import Questions',exact:true}).click();
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
 await setup(page,true);await page.getByRole('button',{name:'Import Questions',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.getByLabel('Question document').setInputFiles({name:'scan.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-test')});
 await dialog.getByRole('button',{name:'Upload and preview'}).click();
 await expect(dialog.getByRole('alert')).toContainText('OCR support will be added');
 await expect(dialog.getByRole('button',{name:'Confirm import',exact:true})).toHaveCount(0);
});

test('subject syllabus add save publish and historical view',async({page})=>{
 await setup(page);
 await page.getByRole('navigation',{name:'Question paper sections'}).getByRole('button',{name:'Syllabus',exact:true}).click();
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
 await page.getByRole('navigation',{name:'Question paper sections'}).getByRole('button',{name:'Blueprint',exact:true}).click();
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
 await panel.getByRole('button',{name:'Validate Blueprint',exact:true}).click();
 await expect(panel.getByRole('status')).toContainText('Offered Marks: 44');
 await expect(panel.getByRole('status')).toContainText('Attempted Marks: 30');
 await panel.getByRole('button',{name:'Publish Blueprint',exact:true}).click();
 await expect(panel.getByText('Blueprint v1 · Published',{exact:true})).toBeVisible();
 await expect(panel.getByLabel('Blueprint name',{exact:true})).toBeDisabled();
 await expect(panel.getByRole('button',{name:'Create new draft version',exact:true})).toBeVisible();
});

async function assemblySetup(page:Page,empty=false){
 await setup(page,false,true);
 const structure={cos:[{id:'co1',code:'CO1',title:'Networks'}],units:[{id:'u1',code:'U1',title:'Transport'}],topics:[{id:'t1',unit_id:'u1',code:'T1',title:'TCP'}]};
 const section={id:'a',name:'Part A',offered:2,attempted:1,marks_each:'1',question_type:'MCQ',format:'STANDARD',choice_groups:[{id:'g1',name:'Choice 1',offered:2,choose:1}]};
 const blueprint={id:'b1',version:1,status:'PUBLISHED',syllabus_version_id:'sv1',config:{title:'Midterm',duration_minutes:60,sections:[section]}};
 const questions=[1,2].map(n=>({id:'q'+n,question_text:`Which network protocol ${n}?`,marks:1,question_type:'MCQ',co_id:'co1',unit_id:'u1',topic_id:'t1',bloom_level:'K1',difficulty:'EASY',answer:'One',options:['One','Two'],source_type:'MANUAL',source_reference:'Faculty notes',status:'APPROVED',version:2}));
 type MockPaper={id:string;title:string;status:string;revision:number;version:number;syllabus_version_id:string;blueprint_version:number;duration_minutes:number;blueprint_snapshot:typeof blueprint.config;syllabus_snapshot:typeof structure;totals:{offered_marks:string;attempted_marks:string};validation:{valid:boolean;errors:string[];checks:string[]};items:{id:string;section_id:string;position:number;choice_group:string;snapshot:typeof questions[number]|null;question_version:number|null}[]};
 let paper:MockPaper|null=null;
 await page.route(/\/v3\/college\/question-papers\//,async route=>{
  const url=new URL(route.request().url());const path=url.pathname;const method=route.request().method();let json:unknown;
  if(path.endsWith('/syllabus/versions'))json={items:[{id:'sv1',version:1,status:'PUBLISHED'}]};
  else if(path.endsWith('/blueprints'))json={items:[blueprint]};
  else if(path.endsWith('/papers')){
   if(method==='POST'){paper={id:'p1',title:'Midterm',version:1,revision:1,status:'DRAFT',syllabus_version_id:'sv1',blueprint_version:1,duration_minutes:60,blueprint_snapshot:blueprint.config,syllabus_snapshot:structure,totals:{offered_marks:'2',attempted_marks:'1'},validation:{valid:false,errors:[],checks:[]},items:[1,2].map(n=>({id:'i'+n,section_id:'a',position:n,choice_group:'g1',snapshot:null,question_version:null}))};json=paper;}
   else json={items:paper?[paper]:[]};
  }
  else if(path.includes('/papers/p1')&&paper){
   if(path.endsWith('/eligible')){const used=paper.items.filter(i=>i.id!==url.searchParams.get('item_id')).map(i=>i.snapshot?.id);const candidates=empty?[]:questions.filter(q=>!used.includes(q.id)&&(!url.searchParams.get('q')||q.question_text.includes(url.searchParams.get('q')!)));json={items:candidates,total:candidates.length,available_distinct:candidates.length,required:paper.items.filter(i=>!i.snapshot).length,counts:{APPROVED:empty?0:2,DRAFT:3,NEEDS_REVIEW:1,ARCHIVED:0},sufficient:candidates.length>=paper.items.filter(i=>!i.snapshot).length};}
   else if(path.endsWith('/availability')){const required=paper.items.filter(i=>!i.snapshot).length;json={sections:[{section_id:'a',name:'Part A',counts:{APPROVED:empty?0:2,DRAFT:3,NEEDS_REVIEW:1,ARCHIVED:0},available_distinct:empty?0:required,required,sufficient:!empty||required===0}]};}
   else{
    if(path.includes('/items/')){const id=path.split('/').pop();const body=route.request().postDataJSON();paper.items=paper.items.map(i=>i.id===id?{...i,snapshot:method==='DELETE'?null:structuredClone(questions.find(q=>q.id===body.question_id)!),question_version:method==='DELETE'?null:2}:i);paper.revision++;paper.status='DRAFT';paper.validation={valid:false,errors:[],checks:[]};}
    else if(path.endsWith('/validate')||path.endsWith('/review')){const valid=paper.items.every(i=>i.snapshot);paper.status=valid?(path.endsWith('/review')?'FACULTY_REVIEW':'VALIDATED'):'DRAFT';paper.validation={valid,errors:valid?[]:['Every offered slot needs an Approved question.'],checks:valid?['Every permitted choice satisfies configured coverage']:[]};paper.revision++;}
    else if(method==='PUT'){paper.title=route.request().postDataJSON().title;paper.status='DRAFT';paper.revision++;}
    json=paper;
   }
  }else{return route.fallback();}
  await route.fulfill({json});
 });
 await page.getByRole('button',{name:'Paper Assembly',exact:true}).click();
 await page.getByLabel('Paper syllabus').selectOption('sv1');
 await page.getByLabel('Published blueprint').selectOption('b1');
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
