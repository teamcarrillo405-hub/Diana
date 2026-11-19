/** Synthetic, loopback-only campus presentation gate. No real account, mail, AI, or paid media. */
import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { chromium } from 'playwright';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';

const args = new Set(process.argv.slice(2));
const base = new URL(process.env.QA_BASE_URL ?? 'http://127.0.0.1:3140');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) || base.protocol !== 'http:') throw new Error('This gate only targets a loopback HTTP server.');
const stamp = (process.env.QA_RUN_NAME ?? `campus-${new Date().toISOString().replace(/[:.]/g, '-')}`).replace(/[^a-zA-Z0-9_-]/g, '-');
const reportRoot = resolve('docs/design/full-app-experience-plan-2026-11-17/implementation-qa');
const outDir = join(reportRoot, stamp);
const privateDir = resolve('.tmp/campus-experience-qa');
const manifestPath = join(privateDir, 'fixture-private.json');
const followUp = args.has('--follow-up');
const refreshOnly = args.has('--refresh-only');
const tutorOnly = args.has('--polish-tutor');
const brightness = args.has('--brightness');
const polish = args.has('--polish') || tutorOnly || brightness;
const viewportList = [{name:'desktop',width:1440,height:1000}, {name:'phone',width:390,height:844}, ...(polish && !brightness ? [{name:'narrow',width:320,height:844},{name:'tablet',width:768,height:1024}] : [])];
const selectedViewport = [...args].find(arg=>arg.startsWith('--viewport='))?.slice('--viewport='.length);
if(selectedViewport){
  if(!viewportList.some(viewport=>viewport.name===selectedViewport))throw new Error('Requested viewport is not in this gate scope.');
  viewportList.splice(0,viewportList.length,...viewportList.filter(viewport=>viewport.name===selectedViewport));
}
const pageSelection = [...args].find(arg=>arg.startsWith('--pages='))?.slice('--pages='.length);
const selectedPages = pageSelection ? new Set(pageSelection.split(',')) : null;
const settingsSections = ['profile','appearance','notifications','accessibility','goals','learning','tutor','ai','connections','security','sign-out'];
const moreSections = ['study','record','wellness','account'];
const publicCases = [
  {slug:'public-home',path:'/',family:'public landing'},
  {slug:'sign-in',path:'/login',family:'entry'},
  {slug:'signup',path:'/signup',family:'entry'},
  {slug:'forgot-password',path:'/forgot-password',family:'entry'},
  {slug:'reset-unavailable',path:'/reset-password',family:'recovery invalid'},
  {slug:'auth-link-invalid',path:'/auth/result?status=invalid-link',family:'recovery invalid'},
  {slug:'auth-recovery-unavailable',path:'/auth/result?status=recovery-unavailable',family:'recovery unavailable'},
  {slug:'auth-callback-empty',path:'/auth/callback',family:'callback recovery'},
  {slug:'offline',path:'/offline',family:'system offline'},
  {slug:'share-unavailable',path:'/share/campus-qa-invalid-token',family:'private link invalid'},
  {slug:'not-found',path:'/campus-qa-page-that-does-not-exist',family:'system 404',statuses:[404]},
  {slug:'privacy',path:'/privacy.html',family:'public document'},
  {slug:'trust',path:'/trust.html',family:'public document'},
];
function privateCases(f) {
  return [
    {slug:'lobby-now',path:'/dashboard?view=now',family:'Lobby',product:true},
    {slug:'lobby-check-in',path:'/dashboard?view=check-in',family:'Lobby',product:true},
    {slug:'lobby-this-week',path:'/dashboard?view=week',family:'Lobby'},
    {slug:'work',path:'/assignments',family:'Work',product:true},
    {slug:'workspace',path:`/assignments/${f.assignmentId}/workspace`,family:'focused Work',product:true},
    {slug:'review',path:`/assignments/${f.readyId}/submit?step=review`,family:'submission'},
    {slug:'hand-in',path:`/assignments/${f.readyId}/submit?step=hand-in`,family:'submission'},
    {slug:'classes',path:'/classes',family:'Classes'},
    {slug:'class-detail',path:`/classes/${f.classId}`,family:'Classes'},
    {slug:'calendar',path:'/calendar',family:'Calendar',product:true},
    {slug:'calendar-week',path:'/calendar?view=week',family:'Calendar'},
    {slug:'calendar-month',path:'/calendar?view=month',family:'Calendar'},
    ...moreSections.map(section=>({slug:`more-${section}`,path:`/more?section=${section}`,family:'commons'})),
    {slug:'notes',path:'/notes',family:'library',scene:'library'},
    {slug:'note-new',path:'/notes/new',family:'library focus',scene:'library'},
    {slug:'note-detail',path:`/notes/${f.noteId}`,family:'library focus',scene:'library'},
    {slug:'quiz-hub',path:'/study',family:'seminar',scene:'seminar'},
    {slug:'saved-practice',path:'/study?view=saved',family:'seminar'},
    {slug:'practice',path:`/study-artifacts/${f.practiceId}`,family:'seminar focus',scene:'seminar',product:true},
    {slug:'study-guide',path:`/study-artifacts/${f.guideId}`,family:'seminar focus',scene:'seminar'},
    {slug:'record',path:'/proof',family:'Record'},
    {slug:'check-in-history',path:'/wellness',family:'courtyard',scene:'courtyard'},
    {slug:'sharing',path:'/sharing',family:'services',scene:'services'},
    {slug:'my-profile',path:'/me',family:'services'},
    {slug:'account-access',path:'/upgrade',family:'services'},
    ...settingsSections.map(section=>({slug:`settings-${section}`,path:`/settings?section=${section}`,family:'services'})),
  ];
}
if(selectedPages){
  if(!brightness)throw new Error('Page selection currently requires the brightness-only gate.');
  const known=new Set([...publicCases,...privateCases({}),{slug:'onboarding-personalize'},{slug:'onboarding-connect'}].map(test=>test.slug));
  if([...selectedPages].some(slug=>!known.has(slug)))throw new Error('Unknown page selection.');
}
if(args.has('--plan')) {
  console.log(JSON.stringify({base:base.origin,publicStates:publicCases.length,authenticatedStates:privateCases({}).length,viewports:viewportList,tabletPrimaryNav:{width:768,height:1024},providerMailAndConsent:'excluded',fixture:'unique synthetic user, deleted in finally unless --keep-fixture',screenshots:'real rendered states only; product candidates use fictional names and no school logo'},null,2));
  process.exit(0);
}
await mkdir(outDir,{recursive:true});
await mkdir(privateDir,{recursive:true});
const report={version:'campus-experience-browser-qa-v1',startedAt:new Date().toISOString(),base:base.origin,run:stamp,scope:brightness?'Brightness correction only: current gallery scenes and entry/setup states at desktop and phone sizes. No unrelated interaction or subject regression rerun.':tutorOnly?'Targeted verification of literal tutor action classes after the CSS Modules selector correction.':polish?'Focused visual polish: selected menu, form, paper and navigation states at desktop, phone, narrow phone and tablet widths. No full application regression rerun.':refreshOnly?'Targeted correction of the canonical Now diagnostic only. The initial and first follow-up results remain historical evidence.':followUp?'Targeted superseding evidence for initial reading, contrast, navigation, callback, and diagnostic-selector findings. Initial 110-state report remains unchanged.':'Representative rendered campus states, not exhaustive route or tutoring certification.',viewports:viewportList,results:[],checks:[],exclusions:['Real user data and passwords','Real Google consent, Calendar account linking, mail delivery, provider billing, and AI/media generation','Subject accuracy, learning outcomes, every assessment/course/group variation, and offline device guarantees'],cleanup:{status:'not-started'}};
let browser,admin,fixture;
function safeError(error) {return String(error?.message ?? error).replace(/https?:\/\/[^\s)]+/g,'[url]').replace(/eyJ[A-Za-z0-9._-]+/g,'[redacted-token]').slice(0,400);}
async function check(name, fn) {try {const evidence=await fn();report.checks.push({name,ok:true,...evidence});}catch(error){report.checks.push({name,ok:false,error:safeError(error)});}}
async function assert(condition,message){if(!condition)throw new Error(message);}
async function database(table, operation, payload){const q=admin.from(table);const result=operation==='insert'?await q.insert(payload):await q.upsert(payload);if(result.error)throw new Error(`Synthetic fixture could not seed ${table}: ${result.error.code ?? 'database error'}`);}
async function updateProfile(patch){const result=await admin.from('profiles').update(patch).eq('user_id',fixture.userId);if(result.error)throw new Error('Synthetic profile update unavailable.');}
async function seedFixture() {
  const tag=`campus-design-qa-${randomUUID()}`;
  const email=`${tag}@local.test`,password=`Qa!${randomBytes(24).toString('base64url')}9`;
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:'Casey Morgan',date_of_birth:'2000-01-01',timezone:'America/Los_Angeles',campus_qa_tag:tag}});
  if(created.error||!created.data.user)throw new Error('Disposable campus account could not be created.');
  fixture={tag,email,password,userId:created.data.user.id,classId:randomUUID(),assignmentId:randomUUID(),readyId:randomUUID(),noteId:randomUUID(),practiceId:randomUUID(),guideId:randomUUID(),shareToken:randomBytes(32).toString('base64url')};
  await writeFile(manifestPath,JSON.stringify(fixture),{mode:0o600});
  const due=new Date(Date.now()+2*86400000).toISOString();
  await database('profiles','upsert',{user_id:fixture.userId,display_name:'Casey Morgan',date_of_birth:'2000-01-01',age_bracket:'adult',timezone:'America/Los_Angeles',onboarded_at:new Date().toISOString(),consent_ai:false,school_name:'Ridgeview High School',school_primary_color:'#24563b',school_secondary_color:'#c6a66b',school_logo_url:null,school_year:11,font_size:'normal',line_spacing:'normal',reading_font:'system',reading_letter_spacing:'normal',reading_word_spacing:'normal',daily_token_budget:0,tokens_used_today:0,extra_time_pct:0,tts_enabled:false,reduced_motion:true});
  await database('classes','insert',{id:fixture.classId,owner_id:fixture.userId,name:'Algebra II',teacher:'Ms. Rivera',ai_mode:'green',color:'#24563b',subject_category:'mathematics'});
  await database('assignments','insert',[
    {id:fixture.assignmentId,owner_id:fixture.userId,class_id:fixture.classId,title:'Linear relationships',description:'Solve 3x + 5 = 20 and explain each step. Use the graph to explain the relationship.',kind:'problem_set',status:'drafting',due_at:due,estimated_minutes:25,reading_load:1,writing_load:1,work_profile:'math',work_profile_source:'student_selected',saved_work:{workspaceMode:'math'}},
    {id:fixture.readyId,owner_id:fixture.userId,class_id:fixture.classId,title:'Equation reflection',description:'Explain how an equation can describe a relationship.',kind:'problem_set',status:'exporting',due_at:due,estimated_minutes:15,reading_load:1,writing_load:1,work_profile:'math',work_profile_source:'student_selected',saved_work:{workspaceMode:'math'}},
  ]);
  await database('assignment_problems','insert',[{owner_id:fixture.userId,assignment_id:fixture.assignmentId,problem_number:1,problem_text:'Solve 3x + 5 = 20. Explain each step.',student_work:{work:'Subtract 5 from both sides.\n3x = 15\nx = 5'},progress_status:'in_progress',source:'manual'}, {owner_id:fixture.userId,assignment_id:fixture.readyId,problem_number:1,problem_text:'Explain the solution of 3x + 5 = 20.',student_work:{work:'Subtracting five keeps both sides equal. Dividing each side by three gives x = 5.'},progress_status:'done',source:'manual'}]);
  await database('notes','insert',{id:fixture.noteId,owner_id:fixture.userId,class_id:fixture.classId,title:'Linear relationships notes',body_text:'A linear relationship has a constant rate of change.\nTo solve 3x + 5 = 20, subtract 5 from both sides and divide by 3.\nThe solution is x = 5.',source:'manual',tags:['campus-qa']});
  const payload={summary:'Practice using evidence from your own notes.',quiz:[{question:'Which operation starts the solution of 3x + 5 = 20?',choices:['Subtract 5 from both sides','Add 5 to both sides'],answer:'Subtract 5 from both sides',hint:'First undo the addition.',sourceAnchor:'Linear relationships notes, line 2'}],guide:[{heading:'Keep the equation balanced',bullets:['Use the same operation on both sides.','Check the result by substitution.']}],cards:[],authorshipReceipt:'Authored synthetic QA practice. No AI provider was called.'};
  await database('study_artifacts','insert',[{id:fixture.practiceId,owner_id:fixture.userId,class_id:fixture.classId,title:'Linear relationships practice',artifact_type:'practice_test',source_type:'note',source_id:fixture.noteId,study_mode:'retrieval_quiz',ai_policy:'green',payload},{id:fixture.guideId,owner_id:fixture.userId,class_id:fixture.classId,title:'Equation study guide',artifact_type:'study_guide',source_type:'note',source_id:fixture.noteId,study_mode:'guided_steps',ai_policy:'green',payload}]);
  const week=Array.from({length:7},(_,index)=>{const day=new Date(Date.now()-(6-index)*86400000);const key=day.toISOString().slice(0,10);return {day,key,index};});
  await database('task_signals','insert',week.map(({day,key,index})=>({owner_id:fixture.userId,kind:'mood_checkin',occurred_at:day.toISOString(),value:{energy:['okay','good','okay','low','okay','good','okay'][index],sleepHours:[7,8,7.5,6,7,8,7.5][index],sleepDate:key,movementType:'walk',movementMinutes:20}})));
  await database('sleep_logs','insert',week.map(({key,index})=>({owner_id:fixture.userId,sleep_date:key,sleep_quality:'ok',sleep_hours:[7,8,7.5,6,7,8,7.5][index]})));
  await database('wellness_activity_logs','insert',week.map(({key,index})=>({owner_id:fixture.userId,logged_for:key,activity_type:'walk',duration_minutes:[20,30,15,10,20,35,20][index],felt:'steady'})));
  await database('share_links','insert',{owner_id:fixture.userId,share_type:'parent_summary',token:fixture.shareToken,expires_at:new Date(Date.now()+3600000).toISOString()});
  return fixture;
}
async function validateFixture(f) {
  await assert(/^campus-design-qa-[0-9a-f-]+@local\.test$/.test(f.email) && typeof f.tag==='string' && f.email.startsWith(f.tag+'@'),'Fixture manifest is not a synthetic campus account.');
  const {data,error}=await admin.auth.admin.getUserById(f.userId);
  await assert(!error && data.user?.email===f.email && data.user?.user_metadata?.campus_qa_tag===f.tag,'Fixture ownership marker could not be verified.');
}
async function installSession(context) {
  const jar=new Map();
  const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar.values()],setAll:values=>values.forEach(cookie=>jar.set(cookie.name,cookie))}});
  const {data,error}=await auth.auth.signInWithPassword({email:fixture.email,password:fixture.password});
  await assert(!error && data.user?.id===fixture.userId,'Synthetic browser sign-in unavailable.');
  await context.addCookies([...jar.values()].map(cookie=>({name:cookie.name,value:cookie.value,url:base.origin,httpOnly:cookie.options?.httpOnly??false,secure:false,sameSite:'Lax'})));
}
async function newContext(viewport, authenticated=false) {
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},isMobile:viewport.name==='phone',hasTouch:viewport.name==='phone',deviceScaleFactor:1,reducedMotion:'reduce',serviceWorkers:'block'});
  // Browser provider calls are blocked. A separate fake route is used only for the sign-in error state.
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.protocol.startsWith('http') && !(url.protocol===base.protocol && ['127.0.0.1','localhost','[::1]'].includes(url.hostname) && url.port===base.port)) return route.fulfill({status:503,contentType:'application/json',body:'{"error":"External provider disabled in synthetic campus QA"}'});
    if(/\/api\/(diana|ai|voice|workers|tutor)\//.test(url.pathname)) return route.fulfill({status:503,contentType:'application/json',body:'{"error":"Provider calls disabled in synthetic campus QA"}'});
    return route.continue();
  });
  if(authenticated)await installSession(context);
  return context;
}
async function open(page,path){return page.goto(new URL(path,base).href,{waitUntil:'domcontentloaded',timeout:60000});}
async function settle(page){await page.locator('h1').first().waitFor({state:'visible',timeout:20000});await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));}
async function screenshot(page,slug,viewport,fullPage=true){const file=`${viewport.name}-${slug}${fullPage?'':'-product'}.png`;await page.screenshot({path:join(outDir,file),fullPage,animations:'disabled'});return file;}
async function inspect(page,viewport){
  return page.evaluate(({width})=>{
    const root=document.documentElement,body=document.body;
    const heading=document.querySelector('h1');
    const shell=document.querySelector('[data-campus-family]');
    const images=[...document.images].filter(image=>{const box=image.getBoundingClientRect();return box.width>0&&box.height>0;});
    const main=document.querySelector('main');
    return {overflow:Math.max(root.scrollWidth,body.scrollWidth)>width+2,documentWidth:root.scrollWidth,heading:heading?.textContent?.trim().slice(0,120)??null,scene:shell?.getAttribute('data-campus-family')??null,mode:shell?.getAttribute('data-campus-mode')??null,missingVisibleImages:images.filter(image=>image.complete&&image.naturalWidth===0).map(image=>new URL(image.currentSrc||image.src).pathname),mainWidth:Math.round(main?.getBoundingClientRect().width??0)};
  },viewport);
}
async function capture(page,test,viewport,authenticated=false) {
  if(selectedPages&&!selectedPages.has(test.slug))return {ok:false,skipped:true};
  const row={slug:test.slug,path:fixture?.shareToken?test.path.replace(fixture.shareToken,"[synthetic-token]"):test.path,family:test.family,viewport:viewport.name,ok:false};
  const errors=[];const assets=[];
  const onError=error=>errors.push(safeError(error));
  const onResponse=response=>{if(response.status()>=400 && /\.(webp|png|woff2|css|js)(\?|$)/.test(response.url()))assets.push(new URL(response.url()).pathname);};
  page.on('pageerror',onError);page.on('response',onResponse);
  try {
    const response=await open(page,test.path);row.status=response?.status()??null;
    await settle(page);
    Object.assign(row,await inspect(page,viewport));
    row.finalPath=new URL(page.url()).pathname.replace(fixture?.shareToken??"not-a-token","[synthetic-token]");
    row.screenshot=await screenshot(page,test.slug,viewport);
    if(test.product)row.productCapture=await screenshot(page,test.slug,viewport,false);
    await assert((test.statuses??[200]).includes(row.status),'Unexpected HTTP result for page state.');
    await assert(!authenticated||!row.finalPath.startsWith('/login'),'Synthetic authenticated page redirected to sign-in.');
    await assert(Boolean(row.heading),'Visible page title missing.');
    if(test.slug==='shared-summary') {
      await assert(row.heading.trim().toLowerCase()==='shared progress','The public share did not show a valid summary.');
      await assert(await page.getByText('Due in seven days',{exact:true}).isVisible(),'The synthetic summary does not show its selected progress data.');
      const dueCount=await page.evaluate(()=>{const label=[...document.querySelectorAll('dt')].find(node=>node.textContent?.trim()==='Due in seven days');return Number(label?.nextElementSibling?.textContent?.trim());});
      await assert(Number.isInteger(dueCount)&&dueCount>0,'The public summary did not include the expected synthetic upcoming work.');
      await assert(!await page.getByText('This link may have expired or been turned off.',{exact:false}).isVisible(),'The synthetic share is unavailable.');
      await assert(!await page.getByText('A linear relationship has a constant rate of change.',{exact:false}).isVisible(),'Private synthetic note content appeared in the summary.');
    }
    await assert(!row.overflow,`Page overflows viewport (${row.documentWidth}px at ${viewport.width}px).`);
    await assert(row.missingVisibleImages.length===0,'A visible image did not load.');
    await assert(assets.length===0,'A local presentation asset returned an error.');
    await assert(errors.length===0,'Browser page error occurred.');
    if(test.scene)await assert(row.scene===test.scene,`Expected ${test.scene} scene family.`);
    row.ok=true;
  }catch(error){row.error=safeError(error);row.screenshot??=await screenshot(page,test.slug+'-problem',viewport).catch(()=>null);}
  finally{page.off('pageerror',onError);page.off('response',onResponse);row.pageErrors=errors;row.assetErrors=assets;report.results.push(row);await writeFile(join(outDir,"progress.json"),JSON.stringify({last:row.slug,viewport:row.viewport,captured:report.results.length,failures:report.results.filter(item=>!item.ok).map(item=>({slug:item.slug,viewport:item.viewport,error:item.error}))},null,2));}
  return row;
}
async function syntheticIep(page,viewport) {
  const pdf=await PDFDocument.create();const sheet=pdf.addPage([612,792]);const font=await pdf.embedFont(StandardFonts.Helvetica);
  sheet.drawText('Synthetic campus QA accommodation example',{x:52,y:730,size:16,font});
  sheet.drawText('Allow 50% extra time for assignments.',{x:52,y:690,size:12,font});
  sheet.drawText('Provide read aloud support. This is fictional test text.',{x:52,y:665,size:12,font});
  const pdfPath=join(outDir,'synthetic-accommodations.pdf');await writeFile(pdfPath,await pdf.save());
  await updateProfile({extra_time_pct:0,tts_enabled:false,accommodations:[]});
  const cleared=await admin.from('iep_imports').delete().eq('owner_id',fixture.userId);if(cleared.error)throw new Error('Synthetic IEP reset unavailable.');
  await open(page,'/settings?section=connections');await settle(page);
  const block=page.locator('section').filter({has:page.getByRole('heading',{name:'IEP / 504 import',exact:true})}).last();
  await block.locator('input[type=file]').setInputFiles(pdfPath);
  const text=block.getByRole('textbox',{name:'Accommodation text'});
  await text.waitFor({state:'visible'});
  await page.waitForFunction(()=>[...document.querySelectorAll('textarea')].some(input=>input.value.includes('50% extra time')),{},{timeout:25000});
  await assert((await text.inputValue()).includes('read aloud support'),'Native PDF extraction did not retain the synthetic text.');
  await assert(await block.getByText('Document text is ready. Review it before applying accommodations.',{exact:true}).isVisible(),'PDF review step missing.');
  const before=await admin.from('profiles').select('extra_time_pct').eq('user_id',fixture.userId).single();
  await assert(before.data?.extra_time_pct===0,'Uploading the PDF changed accommodations before review.');
  await text.fill((await text.inputValue())+'\nReviewed: 50% extra time for reading assignments.');
  const reviewShot=await screenshot(page,'iep-pdf-reviewed',viewport);
  await block.getByRole('button',{name:'Apply accommodations',exact:true}).click();
  await block.getByText('Accommodations applied',{exact:true}).waitFor({state:'visible',timeout:15000});
  const after=await admin.from('profiles').select('extra_time_pct,tts_enabled').eq('user_id',fixture.userId).single();
  const imports=await admin.from('iep_imports').select('id',{count:'exact',head:true}).eq('owner_id',fixture.userId);
  await assert(after.data?.extra_time_pct===50 && after.data?.tts_enabled===true && imports.count===1,'Reviewed accommodations were not persisted to the synthetic owner.');
  const appliedShot=await screenshot(page,'iep-pdf-applied',viewport);
  return {viewport:viewport.name,nativePdfText:true,reviewBeforeMutation:true,reviewedTextApplied:true,pdf:'synthetic-accommodations.pdf',screenshots:[reviewShot,appliedShot]};
}
async function readingPreferences(page,viewport) {
  await updateProfile({reading_font:'atkinson',reading_letter_spacing:'wide',reading_word_spacing:'wide',font_size:'large',line_spacing:'loose'});
  const evidence=[];
  try {
    for(const sample of [{path:`/notes/${fixture.noteId}`,selector:'textarea[aria-label="Note body"]',name:'note-editor'},{path:`/study-artifacts/${fixture.practiceId}`,selector:'section[aria-label="Current quiz question"] h2',name:'quiz-question'}]) {
      await open(page,sample.path);await settle(page);
      const style=await page.locator(sample.selector).evaluate(element=>{const computed=getComputedStyle(element);return {font:computed.fontFamily,letterSpacing:computed.letterSpacing,wordSpacing:computed.wordSpacing,lineHeight:computed.lineHeight,fontSize:computed.fontSize,hook:Boolean(element.closest('.reading-view'))};});
      const shot=await screenshot(page,`reading-${sample.name}`,viewport);
      evidence.push({surface:sample.name,...style,screenshot:shot});
      await assert(style.hook && /atkinson/i.test(style.font),'Reading font preference did not reach the intended content.');
      await assert(parseFloat(style.letterSpacing)>0 && parseFloat(style.wordSpacing)>0,'Reading spacing preferences did not reach the intended content.');
      await assert(parseFloat(style.fontSize)>=18 && parseFloat(style.lineHeight)/parseFloat(style.fontSize)>=1.75,'Saved text size or loose line spacing did not reach the content: '+JSON.stringify(style));
    }
    return {viewport:viewport.name,surfaces:evidence,profileBacked:true};
  }finally{await updateProfile({reading_font:'system',reading_letter_spacing:'normal',reading_word_spacing:'normal',font_size:'normal',line_spacing:'normal'});}
}
async function sectionContinuity(page,viewport) {
  await open(page,`/classes/${fixture.classId}?materials=1&work=${fixture.assignmentId}`);await settle(page);
  await page.getByRole('tab',{name:'Notes',exact:true}).click();
  await assert(new URL(page.url()).searchParams.get('section')==='notes','Class tab did not persist its selection.');
  await page.reload({waitUntil:'domcontentloaded'});await settle(page);
  await assert(await page.getByRole('tab',{name:'Notes',exact:true}).getAttribute('aria-selected')==='true','Class selection was lost after reload.');
  await assert((await page.getByRole('link',{name:'Back to assignment',exact:true}).getAttribute('href'))?.includes(fixture.assignmentId),'Owned assignment return was lost.');
  await open(page,`/assignments/${fixture.readyId}/submit?step=review`);await settle(page);
  await page.getByRole('button',{name:'Continue to hand in',exact:true}).click();
  await assert(new URL(page.url()).searchParams.get('step')==='hand-in','Review continuation was not persisted.');
  await page.reload({waitUntil:'domcontentloaded'});await settle(page);
  await assert(await page.getByRole('tab',{name:'Hand in',exact:true}).getAttribute('aria-selected')==='true','Hand-in step was lost after reload.');
  const shot=await screenshot(page,'tab-continuity-hand-in',viewport);
  return {viewport:viewport.name,classSelectionRetained:true,assignmentReturnRetained:true,handInSelectionRetained:true,screenshot:shot};
}
async function moreInteraction(page,viewport) {
  await open(page,'/more');await settle(page);
  const states=[];
  for(const title of ['Study tools','Record','Wellness','Account']){
    const tab=page.getByRole('tab',{name:title,exact:true});await tab.click();
    await assert(await tab.getAttribute('aria-selected')==='true',`More category ${title} was not selected.`);
    const panel=page.getByRole('tabpanel',{name:title,exact:true});await assert(await panel.isVisible(),`More category ${title} is unavailable.`);
    states.push(title);
  }
  await page.reload({waitUntil:'domcontentloaded'});await settle(page);
  await assert(await page.getByRole('tab',{name:'Account',exact:true}).getAttribute('aria-selected')==='true','More category did not survive refresh.');
  return {viewport:viewport.name,categories:states,refreshRetained:true};
}
async function primaryNavigation(context,viewport) {
  const page=await context.newPage();const results=[];
  try {
    for(const path of ['/dashboard','/assignments','/classes','/calendar','/more']){
      await open(page,path);await settle(page);
      const links=await page.locator('[data-student-navigation] nav a').evaluateAll(elements=>elements.map(element=>{const box=element.getBoundingClientRect();return {label:element.textContent?.trim(),href:element.getAttribute('href'),width:box.width,left:box.left,right:box.right,visible:box.width>0&&box.height>0};}));
      await assert(links.length===5 && links.every(link=>link.visible&&link.left>=0&&link.right<=viewport.width+1),'The five primary tabs do not fit the viewport.');
      const metrics=await inspect(page,viewport);await assert(!metrics.overflow,'Primary page has horizontal overflow.');
      const shot=await screenshot(page,`nav-${path.slice(1)}`,viewport,false);results.push({path,links,screenshot:shot});
    }
    return {viewport:viewport.name,width:viewport.width,results};
  }finally{await page.close();}
}
async function fakeSignInError(page,viewport) {
  let fakeCalls=0;
  await page.route('**/auth/v1/token**',async route=>{fakeCalls++;await route.fulfill({status:400,contentType:'application/json',body:'{"error":"invalid_grant","error_description":"Synthetic sign-in rejection","code":"invalid_credentials"}'});});
  await open(page,'/login?next=https%3A%2F%2Fexample.invalid');await settle(page);
  await page.getByLabel('Email',{exact:true}).fill('fictional-campus-student@local.test');
  await page.getByLabel('Password',{exact:true}).fill('Synthetic-only-password-123!');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  const alert=page.locator('.entry-error[role="alert"]');
  await alert.waitFor({state:'visible'});
  await assert(fakeCalls===1,'Expected only the fake sign-in provider.');
  await assert((await alert.innerText()).includes('could not be confirmed'),'Calm sign-in error missing.');
  await assert((await page.getByRole('link',{name:'Forgot password?'}).getAttribute('href'))?.includes('%2Fdashboard'),'External sign-in destination was not normalized.');
  return {viewport:viewport.name,fakeProviderCalls:fakeCalls,realProviderCalls:0,screenshot:await screenshot(page,'sign-in-fake-error',viewport)};
}
async function tutorControls(page,viewport) {
  const back=page.getByRole('button',{name:'Back to tutor gallery',exact:true});
  if(await back.isVisible())await back.click();
  const states=[];
  for(const label of ['Choose tutor','Save tutor style']) {
    const button=page.getByRole('button',{name:label,exact:true});await button.waitFor({state:'visible'});
    const style=await button.evaluate(element=>{const css=getComputedStyle(element),paint=getComputedStyle(element,'::before'),box=element.getBoundingClientRect();return {height:box.height,size:parseFloat(css.fontSize),mask:paint.maskImage,ink:css.color,paint:paint.backgroundColor};});
    await assert(style.height>=52 && style.size>=24 && style.mask.includes('selection-brush') && (contrastRatio(style.ink,style.paint)??0)>=4.5,'Tutor action did not receive the shared athletic brush styling.');
    await page.keyboard.press('Tab');await button.focus();await assert(await button.evaluate(element=>getComputedStyle(element).outlineStyle)!=='none','Tutor action lacks keyboard focus.');
    await page.emulateMedia({forcedColors:'active'});const forced=await button.evaluate(element=>({mask:getComputedStyle(element,'::before').display,border:parseFloat(getComputedStyle(element).borderTopWidth)}));
    await assert(forced.mask==='none' && forced.border>=1,'Tutor action lacks a forced-color fallback.');await page.emulateMedia({forcedColors:'none'});
    await button.click();
    const status=page.locator('.sd-tutor-status');await status.waitFor({state:'visible'});
    await assert((await status.innerText()).trim()==='Tutor preferences saved.','The synthetic tutor preference save was not confirmed.');
    await page.waitForFunction(()=>!document.querySelector('.sd-tutor-primary')?.disabled);
    states.push({label,...style,forced});
  }
  await assert(!(await inspect(page,viewport)).overflow,'Tutor style screen overflows.');
  return {viewport:viewport.name,states,syntheticPreferenceSaved:true,screenshot:await screenshot(page,'tutor-style',viewport),aiCalls:0};
}
async function polishLayout(page,viewport,slug) {
  const metrics=await page.locator('[data-student-navigation]').evaluate(element=>{
    const header=element.getBoundingClientRect();
    const links=[...element.querySelectorAll('nav a')].map(link=>{const box=link.getBoundingClientRect();return {label:link.textContent.trim(),left:box.left,right:box.right,width:box.width,height:box.height};});
    return {headerHeight:header.height,links};
  });
  await assert(metrics.links.length===5 && metrics.links.every(link=>link.width>=43.9 && link.height>=43.9 && link.left>=0 && link.right<=viewport.width+1),'Primary navigation has clipped or undersized targets.');
  if(viewport.width<=1050)await assert(metrics.headerHeight<=100,'Compact navigation consumes more than 100px.');
  if(slug==='lobby-now' && viewport.width>1050) {
    const identity=await page.locator('[data-today-stage-rail]').innerText();
    await assert(identity.includes('RIDGEVIEW')||identity.includes('Ridgeview'),'Campus identity missing.');
  }
  if(slug==='settings-profile') {
    const save=await page.getByRole('button',{name:'Save settings',exact:true}).boundingBox();
    await assert(save?.height>=44 && save.width>=44,'Profile save target is too small.');
  }
  return {viewport:viewport.name,slug,...metrics};
}
async function polishInteractions(page,viewport) {
  await open(page,'/more');await settle(page);
  if(viewport.width<=760){const labels=await page.locator('[role=tablist][aria-label="More categories"]').evaluate(element=>({paper:getComputedStyle(element).backgroundColor,ink:getComputedStyle(element.querySelector('[aria-selected="false"]')).color}));await assert((contrastRatio(labels.paper,labels.ink)??0)>=4.5,'Phone menu labels lack stable contrast.');}
  const tools=page.getByRole('tab',{name:'Study tools',exact:true});await tools.focus();await tools.press('ArrowRight');
  await assert(await page.getByRole('tab',{name:'Record',exact:true}).getAttribute('aria-selected')==='true','More keyboard selection did not move.');
  await page.reload({waitUntil:'domcontentloaded'});await settle(page);
  await assert(await page.getByRole('tab',{name:'Record',exact:true}).getAttribute('aria-selected')==='true','More selection did not survive reload.');
  await open(page,'/study');await settle(page);
  const choose=page.getByRole('tab',{name:'Choose work',exact:true});await choose.focus();await choose.press('ArrowRight');
  await assert(await page.getByRole('tab',{name:'Saved practice',exact:true}).getAttribute('aria-selected')==='true','Quiz keyboard selection did not move.');
  await choose.click();
  const create=page.getByRole('button',{name:'Create quiz',exact:true});
  const brush=await create.evaluate(element=>{const style=getComputedStyle(element),paint=getComputedStyle(element,'::before'),box=element.getBoundingClientRect();return {height:box.height,font:style.fontFamily,size:style.fontSize,ink:style.color,paint:paint.backgroundColor,mask:paint.maskImage,focus:style.outlineStyle};});
  await assert(brush.height>=52 && brush.mask.includes('selection-brush'),'Quiz action lacks the expected visible brush or target size.');
  await assert((contrastRatio(brush.ink,brush.paint)??0)>=4.5,'Quiz action text lacks sufficient contrast.');
  await page.keyboard.press('Tab');await create.focus();const focus=await create.evaluate(element=>getComputedStyle(element).outlineStyle);await assert(focus!=='none','Quiz action has no keyboard focus indicator.');
  const formState=await create.evaluate(element=>({source:element.form?.querySelector('[name="source"]')?.value,count:element.form?.querySelector('[name="questionCount"]')?.value}));
  await assert(Boolean(formState.source) && formState.count==='6','Quiz source or question-count binding changed.');
  await page.emulateMedia({forcedColors:'active'});
  const forced=await choose.evaluate(element=>{const style=getComputedStyle(element),paint=getComputedStyle(element,'::after');return {mask:paint.display,background:style.backgroundColor,border:parseFloat(style.borderBottomWidth)};});
  await assert(forced.mask==='none' && forced.border>=2 && forced.background!=='rgba(0, 0, 0, 0)','Selected quiz tab has no forced-color fallback.');
  await page.emulateMedia({forcedColors:'none'});
  await open(page,'/settings');await settle(page);
  if(viewport.width<=850){const sections=page.locator('.sd-settings-mobile-sections');await sections.locator('summary').click();await assert(await sections.getByRole('link',{name:'Security',exact:true}).isVisible(),'Phone settings sections are unreachable.');await sections.locator('summary').click();}
  const name=page.getByLabel('Display name',{exact:true});await name.fill('Casey Morgan Preview');
  await page.getByRole('button',{name:'Save settings',exact:true}).click();
  await page.locator('.sd-profile-form-message[data-tone="ok"]').waitFor({state:'visible',timeout:15000});
  await page.reload({waitUntil:'domcontentloaded'});await settle(page);
  await assert(await page.getByLabel('Display name',{exact:true}).inputValue()==='Casey Morgan Preview','Profile save did not survive reload.');
  const input=await page.getByLabel('Display name',{exact:true}).evaluate(element=>{const style=getComputedStyle(element);return {paper:style.backgroundColor,ink:style.color};});
  await assert((contrastRatio(input.paper,input.ink)??0)>=4.5,'Profile field text lacks sufficient contrast.');
  await updateProfile({display_name:'Casey Morgan',reading_font:'atkinson',font_size:'large',line_spacing:'loose',reading_letter_spacing:'wide',reading_word_spacing:'wide',high_contrast:true});
  await open(page,'/settings');await settle(page);
  const preferences=await page.getByLabel('Display name',{exact:true}).evaluate(element=>{const style=getComputedStyle(element);return {font:style.fontFamily,size:style.fontSize,letter:style.letterSpacing,word:style.wordSpacing,paper:style.backgroundColor,ink:style.color};});
  await assert(/atkinson/i.test(preferences.font) && parseFloat(preferences.size)>=18 && parseFloat(preferences.letter)>0 && parseFloat(preferences.word)>0 && (contrastRatio(preferences.paper,preferences.ink)??0)>=7,'Saved accessibility preferences did not reach the Settings form.');
  await updateProfile({reading_font:'system',font_size:'normal',line_spacing:'normal',reading_letter_spacing:'normal',reading_word_spacing:'normal',high_contrast:false});
  return {viewport:viewport.name,preferences,moreKeyboardAndReload:true,quizKeyboard:true,quizFormBinding:formState,quizAction:brush,quizActionFocus:focus,forcedColors:forced,profileSaveAndReload:true,inputContrast:contrastRatio(input.paper,input.ink),aiAndMailCalls:0};
}
async function cleanupFixture() {
  if(!fixture||!admin)return;
  await validateFixture(fixture);
  if(args.has('--keep-fixture')){report.cleanup={status:'retained-by-request',syntheticOnly:true,reuseCommand:'node scripts/qa-campus-experience.mjs --reuse-fixture --keep-fixture'};return;}
  // Explicit removal of synthetic child rows before deleting the owner, with no broad user scans.
  for(const table of ['share_links','iep_imports','flashcards','study_artifacts','assignment_problems','notes','task_signals','sleep_logs','wellness_activity_logs','assignments','classes']) {
    const result=await admin.from(table).delete().eq('owner_id',fixture.userId);
    if(result.error)throw new Error(`Synthetic cleanup could not remove owned ${table}.`);
  }
  const result=await admin.auth.admin.deleteUser(fixture.userId);
  if(result.error)throw new Error('Synthetic owner cleanup could not finish.');
  const verification=await admin.auth.admin.getUserById(fixture.userId);
  if(verification.data.user || verification.error?.status!==404)throw new Error('Synthetic owner deletion could not be verified.');
  await unlink(manifestPath).catch(()=>{});report.cleanup={status:'deleted-and-verified',syntheticOnly:true};
}
try {
  if(args.has('--cleanup-fixture'))args.add('--reuse-fixture');
  else {
    const health=await fetch(new URL('/login',base),{signal:AbortSignal.timeout(15000)});
    await assert(health.ok,'The local production server is not ready. No fixture was created.');
  }
  loadEnvConfig(process.cwd(),false,{info(){},error(){}});
  await assert(Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY&&(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)),'Synthetic QA requires the existing local Supabase environment.');
  admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  if(args.has('--reuse-fixture')){fixture=JSON.parse(await readFile(manifestPath,'utf8'));await validateFixture(fixture);}else{
    try{await readFile(manifestPath);throw new Error('A retained fixture already exists. Use --reuse-fixture or --cleanup-fixture.');}catch(error){if(error.code!=='ENOENT')throw error;}
    await seedFixture();
  }
  if(args.has('--cleanup-fixture')) { args.delete('--keep-fixture'); await cleanupFixture(); fixture=null; }
  else {
  browser=await chromium.launch({headless:true});
  for(const viewport of viewportList){
    await updateProfile({extra_time_pct:0,tts_enabled:false,accommodations:[]});
    if(polish) {
      if(brightness&&(!selectedPages||['sign-in','signup','forgot-password','offline'].some(slug=>selectedPages.has(slug)))){const publicContext=await newContext(viewport),publicPage=await publicContext.newPage();for(const test of publicCases.filter(test=>['sign-in','signup','forgot-password','offline'].includes(test.slug)))await capture(publicPage,test,viewport);await publicContext.close();}
      const context=await newContext(viewport,true),page=await context.newPage();
      const selected=brightness?['lobby-now','work','classes','calendar','more-study','note-detail','quiz-hub','practice','check-in-history','settings-profile','settings-security','settings-tutor']:tutorOnly?['settings-tutor']:['lobby-now','work','classes','calendar','more-study','quiz-hub','notes','note-detail','practice','settings-profile','settings-appearance','settings-security','check-in-history','workspace'];
      const compact=tutorOnly?['settings-tutor']:['lobby-now','work','classes','calendar','more-study','quiz-hub','settings-profile'];
      for(const test of privateCases(fixture).filter(test=>(['narrow','tablet'].includes(viewport.name)?compact:selected).includes(test.slug))) {
        const row=await capture(page,test,viewport,true);
        if(row.ok)await check('polish-layout-'+viewport.name+'-'+test.slug,()=>polishLayout(page,viewport,test.slug));
      }
      if(brightness&&(!selectedPages||['onboarding-personalize','onboarding-connect'].some(slug=>selectedPages.has(slug)))){await updateProfile({onboarded_at:null});for(const step of ['personalize','connect'])await capture(page,{slug:'onboarding-'+step,path:'/onboarding?sdState='+step,family:'entry onboarding'},viewport,true);await updateProfile({onboarded_at:new Date().toISOString()});}
      if(tutorOnly)await check('tutor-controls-'+viewport.name,()=>tutorControls(page,viewport));
      if(!tutorOnly&&!brightness&&['desktop','phone'].includes(viewport.name))await check('polish-interactions-'+viewport.name,()=>polishInteractions(page,viewport));
      await context.close();
      continue;
    }
    if(refreshOnly) {
      const context=await newContext(viewport,true),page=await context.newPage();
      await check(`lobby-router-refresh-${viewport.name}`,()=>lobbyRouterRefresh(page,viewport));
      await context.close();
      continue;
    }
    const publicContext=await newContext(viewport);const publicPage=await publicContext.newPage();
    for(const test of publicCases.filter(test=>!followUp||['auth-callback-empty','public-home'].includes(test.slug)))await capture(publicPage,test,viewport);
    await check(`fake-sign-in-error-${viewport.name}`,()=>fakeSignInError(publicPage,viewport));
    if(!followUp)await capture(publicPage,{slug:'shared-summary',path:`/share/${fixture.shareToken}`,family:'public document'},viewport);
    await publicContext.close();
    const context=await newContext(viewport,true);const page=await context.newPage();
    for(const test of privateCases(fixture).filter(test=>!followUp||['note-detail','practice','check-in-history','account-access'].includes(test.slug)))await capture(page,test,viewport,true);
    if(!followUp) {
      await check(`more-category-interaction-${viewport.name}`,()=>moreInteraction(page,viewport));
      await check(`class-review-continuity-${viewport.name}`,()=>sectionContinuity(page,viewport));
    }
    await check(`reading-preferences-${viewport.name}`,()=>readingPreferences(page,viewport));
    await check(`theme-and-contrast-${viewport.name}`,()=>themePreferences(page,viewport));
    await check(`lobby-router-refresh-${viewport.name}`,()=>lobbyRouterRefresh(page,viewport));
    if(!followUp) {
      await check(`native-iep-pdf-${viewport.name}`,()=>syntheticIep(page,viewport));
      await check(`primary-navigation-${viewport.name}`,()=>primaryNavigation(context,viewport));
      await updateProfile({onboarded_at:null});
      for(const step of ['personalize','connect'])await capture(page,{slug:`onboarding-${step}`,path:`/onboarding?sdState=${step}`,family:'entry onboarding'},viewport,true);
      await updateProfile({onboarded_at:new Date().toISOString()});
    }
    await context.close();
  }
  if(!followUp&&!refreshOnly&&!polish) {
  const tablet={name:'tablet',width:768,height:1024};const tabletContext=await newContext(tablet,true);
  await check('primary-navigation-tablet',()=>primaryNavigation(tabletContext,tablet));await tabletContext.close();
  }
  }
}catch(error){report.fatal=safeError(error);}
finally{
  await browser?.close().catch(()=>{});
  try{await cleanupFixture();}catch(error){report.cleanup={status:'needs-owned-fixture-cleanup',error:safeError(error)};}
  report.finishedAt=new Date().toISOString();
  report.totals={screens:report.results.length,screenPasses:report.results.filter(item=>item.ok).length,screenFailures:report.results.filter(item=>!item.ok).length,checks:report.checks.length,checkPasses:report.checks.filter(item=>item.ok).length,checkFailures:report.checks.filter(item=>!item.ok).length};
  await writeFile(join(outDir,'results.json'),JSON.stringify(report,null,2)+'\n');
  const lines=[`# Campus implementation browser QA`, '', `Run: ${stamp}`, `Target: ${base.origin}`, '', report.scope,'',`- Rendered states: ${report.totals.screenPasses}/${report.totals.screens} passed.`,`- Interactive checks: ${report.totals.checkPasses}/${report.totals.checks} passed.`,`- Fixture cleanup: ${report.cleanup.status}.`,'', 'Only rows in results.json have been exercised. Passing screenshots need visual review; this report does not certify every route or subject.', '', '| Viewport | State | Result | Screenshot |','|---|---|---|---|',...report.results.map(row=>`| ${row.viewport} | ${row.slug} | ${row.ok?'Pass':row.error??'Needs review'} | ${row.screenshot?`[Open](${row.screenshot})`:'Unavailable'} |`),'','## Interactive checks','',...report.checks.map(row=>`- ${row.ok?'Pass':'Needs review'}: ${row.name}${row.error?`: ${row.error}`:''}`),'','## Excluded','',...report.exclusions.map(item=>`- ${item}`)];
  if(report.fatal)lines.push('','Run stopped: '+report.fatal);
  await writeFile(join(outDir,'README.md'),lines.join('\n')+'\n');
  console.log(JSON.stringify({report:relative(process.cwd(),join(outDir,'results.json')),totals:report.totals,cleanup:report.cleanup.status,fatal:report.fatal??null}));
  if(report.fatal||report.totals.screenFailures||report.totals.checkFailures||report.cleanup.status==='needs-owned-fixture-cleanup')process.exitCode=1;
}
function contrastRatio(first,second) {
  const luminance=color=>{let rgb=color.match(/[0-9.]+/g)?.slice(0,3).map(Number);if(!rgb||rgb.length!==3)return null;if(color.startsWith('color(srgb'))rgb=rgb.map(value=>value*255);const linear=rgb.map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;});return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;};
  const a=luminance(first),b=luminance(second);return a===null||b===null?null:(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
async function themePreferences(page,viewport) {
  const states=[];
  try {
    for(const theme of ['Light','Dark','Device']) {
      await page.emulateMedia({colorScheme:'dark'});
      await open(page,'/settings?section=appearance');await settle(page);
      await page.getByRole('group',{name:'Theme',exact:true}).getByRole('button',{name:theme,exact:true}).click();
      await open(page,`/notes/${fixture.noteId}`);await settle(page);
      const values=await page.getByRole('textbox',{name:'Note body',exact:true}).evaluate(element=>{const css=getComputedStyle(element);return {paper:css.backgroundColor,ink:css.color,theme:localStorage.getItem('diana_theme'),rootClass:document.documentElement.className};});
      const ratio=contrastRatio(values.paper,values.ink);await assert(ratio!==null&&ratio>=4.5,'Reading paper and ink lack sufficient contrast.');
      await assert(theme!=='Device'||values.theme===null,'Device theme retained a manual palette.');
      states.push({theme,...values,contrast:Number(ratio.toFixed(2)),screenshot:await screenshot(page,'theme-'+theme.toLowerCase(),viewport)});
    }
    await open(page,`/study-artifacts/${fixture.practiceId}`);await settle(page);
    const choice=page.locator('section[aria-label="Current quiz question"] label').first();
    await choice.click();
    const choiceStyle=await choice.evaluate(element=>{const css=getComputedStyle(element);return {paper:css.backgroundColor,ink:css.color};});
    const ratio=contrastRatio(choiceStyle.paper,choiceStyle.ink);await assert(ratio!==null&&ratio>=4.5,'Selected quiz choice is low contrast in dark mode.');
    await updateProfile({high_contrast:true});
    await open(page,`/notes/${fixture.noteId}`);await settle(page);
    const highContrast=await page.getByRole('textbox',{name:'Note body',exact:true}).evaluate(element=>{const css=getComputedStyle(element);return {paper:css.backgroundColor,ink:css.color,savedPreference:Boolean(element.closest('.high-contrast'))};});
    await assert(highContrast.savedPreference && (contrastRatio(highContrast.paper,highContrast.ink)??0)>=7,'Saved high contrast was not applied to reading paper.');
    const motion=await page.locator('[data-student-navigation] a').first().evaluate(element=>{const css=getComputedStyle(element);return {savedPreference:Boolean(element.closest('.reduced-motion')),animation:css.animationName,transition:css.transitionDuration};});
    await assert(motion.savedPreference&&motion.animation==='none'&&motion.transition.split(',').every(value=>parseFloat(value)===0),'Saved reduced motion was not applied to the sampled control.');
    return {viewport:viewport.name,states,selectedChoice:choiceStyle,selectedChoiceContrast:Number(ratio.toFixed(2)),highContrast,motion,screenshot:await screenshot(page,'high-contrast-reading',viewport)};
  }finally{await updateProfile({high_contrast:false});await page.evaluate(()=>{localStorage.removeItem('diana_theme');document.documentElement.classList.remove('dark','light');});await page.emulateMedia({colorScheme:'light'});}
}
async function lobbyRouterRefresh(page,viewport) {
  await open(page,'/dashboard?view=check-in');await settle(page);
  const energy=page.getByRole('group',{name:'Energy',exact:true});
  const good=energy.getByRole('button',{name:'Good',exact:true});
  const changed=await good.getAttribute('aria-pressed')==='true'?energy.getByRole('button',{name:'Okay',exact:true}):good;
  await changed.click();
  const refresh=page.waitForResponse(response=>response.request().method()==='GET'&&response.request().headers()['rsc']==='1'&&response.request().headers()['next-router-prefetch']!=='1'&&response.request().headers()['purpose']!=='prefetch'&&new URL(response.url()).pathname==='/dashboard',{timeout:25000});
  await page.getByRole('button',{name:'Save check-in',exact:true}).click();
  const response=await refresh;
  const refreshedUrl=new URL(response.url()),selected=refreshedUrl.searchParams.get('view');
  await assert(selected===null||selected==='now','router.refresh requested an earlier Lobby selection.');
  await page.locator('[data-lobby-mode="now"]').waitFor({state:'visible'});
  const notice=page.locator('[data-lobby-check-in-note]');await notice.waitFor({state:'visible'});
  const savedNotice=(await notice.innerText()).trim();await assert(savedNotice.length>0,'Saved check-in notice missing.');
  const current=new URL(page.url()).searchParams.get('view');
  await assert(current===null||current==='now','The Lobby URL lost its Now selection after router.refresh.');
  const savedScreenshot=await screenshot(page,'lobby-router-refresh',viewport);
  await page.reload({waitUntil:'domcontentloaded'});await settle(page);
  await assert(await page.locator('[data-lobby-mode]').getAttribute('data-lobby-mode')==='now','Native reload lost the Now selection.');
  const reloaded=new URL(page.url()).searchParams.get('view');await assert(reloaded===null||reloaded==='now','Reload restored an earlier Lobby URL.');
  return {viewport:viewport.name,actualRouterRefreshRequest:'GET '+refreshedUrl.pathname+(selected?'?view='+selected:''),canonicalDefaultAccepted:true,savedNotice,nativeReloadRetained:true,screenshots:[savedScreenshot,await screenshot(page,'lobby-browser-reload',viewport)]};
}
