/** Loopback production auth integration. Only this run's marked disposable owner is mutated. */
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';

const {loadEnvConfig}=nextEnv;
const base=new URL(process.env.QA_BASE_URL??'http://localhost:3140');
if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname)||base.protocol!=='http:')throw new Error('Auth QA only targets a loopback HTTP server.');
const run='auth-recovery-'+new Date().toISOString().replace(/[:.]/g,'-');
const outDir=resolve('docs/design/full-app-experience-plan-2026-11-17/implementation-qa/auth-recovery',run);
const privateDir=resolve('.tmp/auth-recovery-qa');
const privateManifest=join(privateDir,run+'.json');
const viewports=[{name:'desktop',width:1440,height:1000},{name:'phone',width:390,height:844}];
const report={version:'auth-recovery-provider-integration-v1',run,base:base.origin,startedAt:new Date().toISOString(),scope:'Production-mode loopback pages, actual Supabase recovery token verification and password updates on a separate disposable synthetic owner.',localOriginNote:'Use localhost consistently. Mixing 127.0.0.1 with the local runtime callback redirect to localhost separates host-only cookies; no cookie protections are bypassed.',checks:[],screenshots:[],cleanup:{status:'not-started'},exclusions:['No reset email was requested or sent. SMTP, email delivery, redirect allow-list and email-template publication remain unverified.','No real student account, Google connection, tutoring provider, AI service or paid media was used.','Only passing checks can establish token_hash recovery. The emailed same-browser PKCE round trip is outside this gate.']};
let admin,browser,fixture,publicUrl,publicKey;
let activeStep='preflight';
class GateFailure extends Error{constructor(code,message){super(message);this.code=code;}}
function requireThat(condition,code,message){if(!condition)throw new GateFailure(code,message);}
function failure(error){return error instanceof GateFailure?{code:error.code,message:error.message}:{code:'unexpected-integration-response',message:'An unexpected response stopped '+activeStep+'. No provider diagnostics or credentials are included.'};}
async function check(name,fn){activeStep=name;try{const evidence=await fn();report.checks.push({name,ok:true,...evidence});}catch(error){report.checks.push({name,ok:false,...failure(error)});throw error;}}
function freshPassword(){return 'Qa!'+randomBytes(28).toString('base64url')+'9';}
async function ownedUser(){const {data,error}=await admin.auth.admin.getUserById(fixture.userId);requireThat(!error&&data.user?.id===fixture.userId&&data.user.email===fixture.email&&data.user.user_metadata?.auth_recovery_qa_tag===fixture.tag,'fixture-ownership','The exact disposable owner marker could not be verified.');return data.user;}
async function seed(){const tag='auth-recovery-qa-'+randomUUID();const email=tag+'@local.test';const password=freshPassword();const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:'Recovery QA student',date_of_birth:'2000-01-01',timezone:'America/Los_Angeles',auth_recovery_qa_tag:tag}});requireThat(!error&&data.user,'fixture-create','The separate disposable authentication owner could not be created.');fixture={tag,email,password,userId:data.user.id};await writeFile(privateManifest,JSON.stringify({tag,email,userId:fixture.userId}),{mode:0o600});await ownedUser();const profile=await admin.from('profiles').upsert({user_id:fixture.userId,display_name:'Recovery QA student',date_of_birth:'2000-01-01',age_bracket:'adult',timezone:'America/Los_Angeles',onboarded_at:new Date().toISOString(),consent_ai:false,school_name:null,school_logo_url:null,daily_token_budget:0,tokens_used_today:0,reduced_motion:true});requireThat(!profile.error,'fixture-profile','The disposable profile could not be prepared.');return {separateOwner:true,ownershipMarkerVerified:true,mailSent:false};}
async function context(viewport){const value=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},isMobile:viewport.name==='phone',hasTouch:viewport.name==='phone',reducedMotion:'reduce',serviceWorkers:'block'});await value.route('**/*',async route=>{const url=new URL(route.request().url());if(url.protocol.startsWith('http')&&url.origin!==base.origin)return route.fulfill({status:503,contentType:'application/json',body:'{"error":"External browser calls disabled in synthetic auth QA"}'});if(/^\/api\/(?:diana|ai|voice|workers|tutor)\//.test(url.pathname))return route.fulfill({status:503,body:'Synthetic auth QA does not call tutoring providers.'});return route.continue();});return value;}
async function open(page,path){return page.goto(new URL(path,base).href,{waitUntil:'domcontentloaded',timeout:60000});}
async function renderReady(page){await page.locator('h1').first().waitFor({state:'visible',timeout:20000});await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));}
async function capture(page,viewport,name){await renderReady(page);const state=await page.evaluate(width=>({overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)>width+2,method:document.querySelector('form')?.method??null,scene:document.querySelector('[data-campus-family]')?.getAttribute('data-campus-family')??null}),viewport.width);requireThat(!state.overflow,'auth-overflow','An authentication page exceeded its viewport.');const file=viewport.name+'-'+name+'.png';const masks=[page.locator('input[type=password]'),page.getByText(fixture.email,{exact:false})];await page.screenshot({path:join(outDir,file),fullPage:true,animations:'disabled',mask:masks});report.screenshots.push({viewport:viewport.name,state:name,file,...state});return file;}
async function passwordWorks(password){const client=createClient(publicUrl,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await client.auth.signInWithPassword({email:fixture.email,password});return !error&&data.user?.id===fixture.userId;}
async function fillReset(page,password){await page.getByLabel('New password',{exact:true}).fill(password);await page.getByLabel('Confirm new password',{exact:true}).fill(password);}
async function fillChange(page,current,password){await page.getByLabel('Current password',{exact:true}).fill(current);await page.getByLabel('New password',{exact:true}).fill(password);await page.getByLabel('Confirm new password',{exact:true}).fill(password);}

async function exercise(viewport){
  const main=await context(viewport),stale=await context(viewport),used=await context(viewport);
  try{
    const page=await main.newPage(),stalePage=await stale.newPage();
    await check(viewport.name+'-untrusted-session-cannot-reset',async()=>{await open(page,'/reset-password');await page.getByRole('heading',{name:'Request a fresh link',exact:true}).waitFor();requireThat(await page.getByLabel('New password',{exact:true}).count()===0,'reset-without-proof','An unverified session received a password reset form.');return {deniedWithoutProof:true,screenshot:await capture(page,viewport,'reset-unavailable')};});
    let hash,oldCookies,beforeRevision;
    await check(viewport.name+'-actual-recovery-token',async()=>{
      await ownedUser();
      const generated=await admin.auth.admin.generateLink({type:'recovery',email:fixture.email,options:{redirectTo:base.origin+'/auth/callback'}});
      requireThat(!generated.error&&typeof generated.data.properties?.hashed_token==='string','recovery-token-create','The provider did not generate a recovery token.');
      hash=generated.data.properties.hashed_token;
      const callback=new URL('/auth/callback',base);callback.searchParams.set('token_hash',hash);callback.searchParams.set('type','recovery');callback.searchParams.set('return_to','/settings?section=security');
      await page.goto(callback.href,{waitUntil:'domcontentloaded',timeout:60000});
      try{await page.getByRole('heading',{name:'A fresh start',exact:true}).waitFor({timeout:12000});}catch{
        const diagnosticCookies=await main.cookies();const diagnosticProof=diagnosticCookies.find(cookie=>cookie.name==='diana-password-recovery');let revisionMatches=null,userMatches=null;
        if(diagnosticProof){try{const payload=JSON.parse(Buffer.from(diagnosticProof.value.split('.')[0],'base64url').toString('utf8'));revisionMatches=payload.revision===(await ownedUser()).updated_at;userMatches=payload.user===fixture.userId;}catch{/* Only booleans leave memory. */}}
        const destination=new URL(page.url());report.callbackDiagnostics={requestHost:base.hostname,finalHost:destination.hostname,cookieHostsMatchFinal:diagnosticCookies.every(cookie=>cookie.domain===destination.hostname||cookie.domain==='.'+destination.hostname),path:destination.pathname,status:destination.searchParams.get('status'),heading:await page.locator('h1').first().textContent().catch(()=>null),authCookiePresent:diagnosticCookies.some(cookie=>cookie.name.includes('auth-token')),proofPresent:Boolean(diagnosticProof),proofSecure:diagnosticProof?.secure??null,proofHttpOnly:diagnosticProof?.httpOnly??null,proofRevisionMatchesCurrentUser:revisionMatches,proofUserMatchesFixture:userMatches};
        await capture(page,viewport,'recovery-callback-unavailable');throw new GateFailure('callback-reset-form-unavailable','The provider callback did not open an authorized password reset form. Safe path/cookie/revision flags are recorded.');
      }
      requireThat(new URL(page.url()).pathname==='/reset-password'&&!new URL(page.url()).search,'token-left-in-url','The token-bearing callback did not settle on a clean reset URL.');
      oldCookies=await main.cookies();const proof=oldCookies.find(cookie=>cookie.name==='diana-password-recovery');
      requireThat(proof?.httpOnly&&proof.sameSite==='Lax','recovery-cookie','The recovery authorization cookie was not private and same-site.');
      beforeRevision=(await ownedUser()).updated_at;requireThat(Boolean(beforeRevision),'provider-revision','The provider did not expose an authoritative account revision.');
      await stale.addCookies(oldCookies);await open(stalePage,'/reset-password');await stalePage.getByRole('heading',{name:'A fresh start',exact:true}).waitFor();
      return {providerTokenVerified:true,requestHost:base.hostname,finalHost:new URL(page.url()).hostname,hostConsistent:new URL(page.url()).hostname===base.hostname,cleanResetUrl:true,httpOnlyProof:true,sameSiteLax:true,preexistingStaleForm:true,mailSent:false,screenshot:await capture(page,viewport,'reset-ready')};
    });
    const recovered=freshPassword();
    await check(viewport.name+'-same-session-password-save',async()=>{
      await page.waitForLoadState('networkidle',{timeout:20000});await fillReset(page,recovered);
      let actionObserved=false,originMatched=false;const actionStatuses=[],pageErrorKinds=[];
      const actionResponse=response=>{if(response.request().method()==='POST'&&new URL(response.url()).pathname==='/reset-password')actionStatuses.push(response.status());};
      const browserError=error=>pageErrorKinds.push(error.name??'BrowserError');page.on('response',actionResponse);page.on('pageerror',browserError);
      const requestObserved=request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/reset-password'){actionObserved=Boolean(request.headers()['next-action']);originMatched=request.headers().origin===base.origin;}};
      page.on('request',requestObserved);
      try{await page.getByRole('button',{name:'Save password',exact:true}).click();await page.getByRole('heading',{name:'Password saved',exact:true}).waitFor({timeout:20000});}catch{
        const text=await page.locator('main').innerText().catch(()=>'');report.saveDiagnostics={host:new URL(page.url()).hostname,actionObserved,originMatched,actionStatuses,pageErrorKinds,heading:await page.locator('h1').first().textContent().catch(()=>null),linkUnavailable:text.includes('This reset link is no longer available.'),passwordNotSaved:text.includes('Your password could not be saved.'),connectionPaused:text.includes('The connection paused.'),passwordRevisionAdvanced:(await ownedUser()).updated_at!==beforeRevision};
        await capture(page,viewport,'password-save-unavailable');throw new GateFailure('password-save-unconfirmed','The authorized reset form did not confirm the password save. Safe action/UI/revision flags are recorded.');
      }finally{page.off('request',requestObserved);page.off('response',actionResponse);page.off('pageerror',browserError);}
      requireThat(actionObserved&&originMatched,'server-action-origin','The hydrated reset action did not retain a same-origin request.');
      requireThat((await page.getByRole('link',{name:'Continue to campus',exact:true}).getAttribute('href'))==='/settings?section=security','private-return-route','The reset continuation did not retain the private requested page.');
      const after=await ownedUser();requireThat(after.updated_at!==beforeRevision,'password-revision-unchanged','The provider account revision did not advance after password save.');
      requireThat(!(await main.cookies()).some(cookie=>cookie.name==='diana-password-recovery'&&cookie.value),'proof-not-cleared','The current browser retained its recovery authorization after save.');
      return {sameOriginServerAction:true,sameBrowserSession:true,passwordRevisionAdvanced:true,recoveryProofCleared:true,privateReturnRetained:true,screenshot:await capture(page,viewport,'reset-saved')};
    });
    await check(viewport.name+'-old-proof-and-token-rejected',async()=>{
      const attempted=freshPassword();await stalePage.waitForLoadState('networkidle',{timeout:20000});await fillReset(stalePage,attempted);await stalePage.getByRole('button',{name:'Save password',exact:true}).click();
      await stalePage.locator('main').getByText(/This reset link is no longer available\./).first().waitFor({timeout:30000});
      const staleShot=await capture(stalePage,viewport,'stale-reset-rejected');
      await open(stalePage,'/reset-password');await stalePage.getByRole('heading',{name:'Request a fresh link',exact:true}).waitFor({timeout:20000});
      requireThat(await passwordWorks(recovered),'reset-password-not-active','The saved synthetic password could not authenticate.');
      requireThat(!(await passwordWorks(attempted)),'stale-proof-wrote-password','A stale proof changed the synthetic password.');
      const usedPage=await used.newPage();const callback=new URL('/auth/callback',base);callback.searchParams.set('token_hash',hash);callback.searchParams.set('type','recovery');await usedPage.goto(callback.href,{waitUntil:'domcontentloaded',timeout:60000});
      requireThat(new URL(usedPage.url()).pathname==='/auth/result'&&new URL(usedPage.url()).searchParams.get('status')==='link-unavailable','token-reuse','A consumed recovery token was accepted again.');
      return {sameOldProofAndSessionRetained:true,staleSubmissionDenied:true,staleRenderDenied:true,savedPasswordAuthenticates:true,staleAttemptPasswordRejected:true,consumedTokenRejected:true,screenshots:[staleShot,await capture(usedPage,viewport,'token-reuse-rejected')]};
    });
    const changed=freshPassword();
    await check(viewport.name+'-private-return-and-current-password-change',async()=>{
      await page.getByRole('link',{name:'Continue to campus',exact:true}).click();await page.getByRole('heading',{name:'Change password',exact:true}).waitFor({timeout:20000});
      requireThat(new URL(page.url()).pathname==='/settings'&&new URL(page.url()).searchParams.get('section')==='security','private-route-lost','The recovered session did not open its private security page.');
      await page.waitForLoadState('networkidle',{timeout:20000});await fillChange(page,freshPassword(),changed);await page.getByRole('button',{name:'Save password',exact:true}).click();
      await page.getByRole('alert').filter({hasText:'Your current password could not be confirmed.'}).waitFor({timeout:30000});const wrongShot=await capture(page,viewport,'current-password-rejected');
      await fillChange(page,recovered,changed);await page.getByRole('button',{name:'Save password',exact:true}).click();await page.getByRole('status').filter({hasText:'Your password is saved.'}).waitFor({timeout:30000});
      requireThat(await page.getByLabel('Current password',{exact:true}).inputValue()===''&&await page.getByLabel('New password',{exact:true}).inputValue()===''&&await page.getByLabel('Confirm new password',{exact:true}).inputValue()==='','private-fields-retained','A successful password change left private fields populated.');
      requireThat(await passwordWorks(changed),'changed-password-not-active','The changed synthetic password could not authenticate.');requireThat(!(await passwordWorks(recovered)),'old-password-still-active','The previous synthetic password could still authenticate.');fixture.password=changed;
      return {recoveredPrivateSessionWorks:true,wrongCurrentPasswordRejected:true,correctCurrentPasswordAccepted:true,privateFieldsCleared:true,newPasswordAuthenticates:true,previousPasswordRejected:true,screenshots:[wrongShot,await capture(page,viewport,'account-password-saved')]};
    });
  }finally{await Promise.allSettled([main.close(),stale.close(),used.close()]);}
}

async function cleanup(){
  if(!fixture){report.cleanup={status:'no-fixture-created'};return;}
  await ownedUser();
  const removed=await admin.auth.admin.deleteUser(fixture.userId);
  requireThat(!removed.error,'fixture-cleanup','The disposable authentication owner could not be deleted.');
  const checked=await admin.auth.admin.getUserById(fixture.userId);
  requireThat(!checked.data.user,'fixture-cleanup-verify','The disposable authentication owner remained after deletion.');
  await unlink(privateManifest).catch(()=>{});
  report.cleanup={status:'deleted-and-verified',syntheticOnly:true,exactOwnershipMarkerChecked:true};
}
await mkdir(outDir,{recursive:true});await mkdir(privateDir,{recursive:true});
try{
  await check('local-production-preflight',async()=>{
    const response=await fetch(new URL('/login',base),{signal:AbortSignal.timeout(15000)});requireThat(response.ok,'server-unavailable','The loopback production app is not ready. No fixture was created.');
    const html=await response.text();requireThat(!html.includes('webpack-hmr')&&!html.includes('nextjs-portal'),'development-server','This gate requires the production-mode app. No fixture was created.');
    loadEnvConfig(process.cwd(),false,{info(){},error(){}});
    publicUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    requireThat(Boolean(publicUrl&&publicKey&&process.env.SUPABASE_SERVICE_ROLE_KEY),'provider-config','The existing local authentication environment is unavailable. No fixture was created.');
    admin=createClient(publicUrl,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    return {loopback:true,loginAvailable:true,noDevelopmentClientObserved:true,existingProviderConfigurationPresent:true,serverRecoveryCapability:'verified by actual callback later in this gate'};
  });
  await check('separate-disposable-owner',seed);
  browser=await chromium.launch({headless:true});
  for(const viewport of viewports)await exercise(viewport);
}catch(error){report.fatal=failure(error);}
finally{
  await browser?.close().catch(()=>{});
  try{await cleanup();}catch(error){report.cleanup={status:'owned-fixture-needs-cleanup',...failure(error)};}
  report.finishedAt=new Date().toISOString();report.totals={checks:report.checks.length,passed:report.checks.filter(row=>row.ok).length,rejected:report.checks.filter(row=>!row.ok).length,screenshots:report.screenshots.length};
  await writeFile(join(outDir,'results.json'),JSON.stringify(report,null,2)+'\n');
  const lines=['# Authentication recovery integration','', 'Run: '+run,'Target: '+base.origin,'',report.scope,'','- Checks: '+report.totals.passed+'/'+report.totals.checks+' passed.','- Cleanup: '+report.cleanup.status+'.','', '## Checks','',...report.checks.map(row=>'- '+(row.ok?'Pass':'Needs review')+': '+row.name+(row.message?' ('+row.message+')':'')),'','## Captures','',...report.screenshots.map(row=>'- ['+row.viewport+' '+row.state+']('+row.file+')'),'','## Boundaries','',...report.exclusions.map(item=>'- '+item)];
  if(report.fatal)lines.push('','Stopped: '+report.fatal.message);
  await writeFile(join(outDir,'README.md'),lines.join('\n')+'\n');
  console.log(JSON.stringify({report:relative(process.cwd(),join(outDir,'results.json')),totals:report.totals,cleanup:report.cleanup.status,fatal:report.fatal??null}));
  if(report.fatal||report.totals.rejected||report.cleanup.status==='owned-fixture-needs-cleanup')process.exitCode=1;
}
