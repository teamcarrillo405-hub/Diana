/** Read-only PDF proof for the existing tagged synthetic campus QA owner. */
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

nextEnv.loadEnvConfig(process.cwd());
const base = new URL('http://127.0.0.1:3140');
const out = 'docs/design/full-app-experience-plan-2026-11-17/implementation-qa/pdf';
await mkdir(out, { recursive: true });
const fixture = JSON.parse(await readFile('.tmp/campus-experience-qa/fixture-private.json', 'utf8'));
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
if (typeof fixture.tag !== 'string' || !/^campus-design-qa-[0-9a-f-]+$/.test(fixture.tag) || fixture.email !== `${fixture.tag}@local.test`) throw Error('Fixture identity does not match the synthetic campus tag.');
const { data, error } = await admin.auth.admin.getUserById(fixture.userId);
if (error || data.user?.email !== fixture.email || data.user?.user_metadata?.campus_qa_tag !== fixture.tag) throw Error('Fixture owner marker could not be verified.');
if (process.argv.includes('--print-only')) {
  const checks=[];
  const record=(name,ok,detail)=>{checks.push({name,ok:Boolean(ok),...(detail?{detail}:{})});console.log(`${ok?'PASS':'FAIL'} ${name}${detail?`: ${detail}`:''}`);};
  let browser;
  try {
    const digest=createHash('sha256').update(fixture.shareToken).digest('hex');
    const share=await admin.from('share_links').select('id').eq('owner_id',fixture.userId).eq('share_type','parent_summary').eq('token_digest',digest).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
    if(share.error||!share.data)throw Error('Tagged synthetic public share is unavailable.');
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',reducedMotion:'reduce'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===base.origin?route.continue():route.abort());
    const page=await context.newPage();
    await page.goto(new URL(`/share/${fixture.shareToken}`,base).href,{waitUntil:'networkidle'});
    await page.getByRole('heading',{name:'Shared progress'}).waitFor();
    await page.emulateMedia({media:'print'});
    const style=await page.evaluate(()=>({print:matchMedia('print').matches,display:getComputedStyle(document.querySelector('footer button')).display}));
    record('Print mode hides the report action',style.print&&style.display==='none',JSON.stringify(style));
    const pdfPath=join(out,'synthetic-shared-summary-fixed.pdf');
    await page.pdf({path:pdfPath,printBackground:true,format:'Letter'});
    const bytes=await readFile(pdfPath), doc=await PDFDocument.load(bytes);
    const pdfText=(await promisify(execFile)('pdftotext',['-layout',pdfPath,'-'],{maxBuffer:2000000})).stdout;
    record('Print PDF contains summary and no action',doc.getPageCount()>=1&&/shared progress/i.test(pdfText)&&/due in seven days/i.test(pdfText)&&!/print report/i.test(pdfText)&&!pdfText.includes(fixture.shareToken),`${doc.getPageCount()} page(s)`);
    const bbox=(await promisify(execFile)('pdftotext',['-f','1','-l','1','-bbox',pdfPath,'-'],{maxBuffer:2000000})).stdout;
    const words=[...bbox.matchAll(/<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)"/g)].map(m=>m.slice(1).map(Number));
    const extents=words.length?{left:Math.min(...words.map(v=>v[0])),top:Math.min(...words.map(v=>v[1])),right:Math.max(...words.map(v=>v[2])),bottom:Math.max(...words.map(v=>v[3]))}:null;
    const {width,height}=doc.getPages()[0].getSize();
    record('First-page text stays within print margins',!!extents&&extents.left>=36&&extents.top>=36&&extents.right<=width-36&&extents.bottom<=height-36,JSON.stringify({extents,width,height}));
    await promisify(execFile)('pdftoppm',['-f','1','-l','1','-singlefile','-png','-r','110',pdfPath,join(out,'shared-summary-page-1-fixed')]);
    await context.close();
  } catch(e) { record('Print-only followup completed',false,String(e?.message??e).replace(/https?:\/\/[^\s)]+/g,'[url]').slice(0,300)); }
  finally { if(browser)await browser.close(); await writeFile(join(out,'print-followup-results.json'),JSON.stringify({timestamp:new Date().toISOString(),fixture:'verified synthetic owner and existing valid share',checks},null,2)); }
  process.exit(checks.some(c=>!c.ok)?1:0);
}
if (process.argv.includes('--share-followup')) {
  const checks = [];
  const assert = (condition, message) => { if (!condition) throw Error(message); };
  const record = (name, ok, detail) => { checks.push({name,ok:Boolean(ok),...(detail?{detail}:{})}); console.log(`${ok?'PASS':'FAIL'} ${name}${detail?`: ${detail}`:''}`); };
  const verifyOwner = async () => { const current = await admin.auth.admin.getUserById(fixture.userId); assert(!current.error && current.data.user?.email === fixture.email && current.data.user?.user_metadata?.campus_qa_tag === fixture.tag, 'Synthetic fixture ownership changed.'); };
  let browser;
  try {
    // Delete only the exact artifact generated during this QA, then its binding.
    const meta = JSON.parse(await readFile(join(out,'synthetic-delivery-cleanup.json'),'utf8'));
    await verifyOwner();
    assert(meta.syntheticOnly && meta.bucket === 'assignment-submissions', 'Cleanup metadata is not for the synthetic submission bucket.');
    if (meta.objectRemoved && meta.bindingRemoved) {
      const rowCheck = await admin.from('assignment_submission_files').select('id').eq('id',meta.fileId).maybeSingle();
      assert(!rowCheck.error && !rowCheck.data,'Previously removed synthetic delivery binding reappeared.');
      record('Exact synthetic delivery previously removed',true);
    } else {
    assert(meta.objectKey?.startsWith(`${fixture.userId}/${fixture.readyId}/`), 'Cleanup object does not match synthetic owner and assignment.');
    const located = await admin.from('assignment_submission_files').select('id,owner_id,assignment_id,storage_bucket,storage_key').eq('id',meta.fileId).eq('owner_id',fixture.userId).eq('assignment_id',fixture.readyId).maybeSingle();
    assert(!located.error && located.data?.storage_bucket === meta.bucket && located.data?.storage_key === meta.objectKey, 'Synthetic delivery binding does not match its recorded metadata.');
    const removedObject = await admin.storage.from(meta.bucket).remove([meta.objectKey]);
    assert(!removedObject.error,'Synthetic delivery object could not be removed.');
    await verifyOwner();
    const deletedRow = await admin.from('assignment_submission_files').delete().eq('id',meta.fileId).eq('owner_id',fixture.userId).eq('assignment_id',fixture.readyId).eq('storage_key',meta.objectKey).select('id');
    assert(!deletedRow.error && deletedRow.data?.length === 1,'Synthetic delivery binding could not be removed.');
    const rowCheck = await admin.from('assignment_submission_files').select('id').eq('id',meta.fileId).maybeSingle();
    assert(!rowCheck.error && !rowCheck.data,'Synthetic delivery binding still exists.');
    const parts = meta.objectKey.split('/'); const name = parts.pop(); const objects = await admin.storage.from(meta.bucket).list(parts.join('/'),{search:name});
    assert(!objects.error && !objects.data.some(item => item.name === name),'Synthetic delivery object still exists.');
    await writeFile(join(out,'synthetic-delivery-cleanup.json'),JSON.stringify({fileId:meta.fileId,bucket:meta.bucket,syntheticOnly:true,objectRemoved:true,bindingRemoved:true},null,2));
    record('Exact synthetic delivery object and binding removed',true);
    }

    const found = await admin.from('share_links').select('id,owner_id,share_type,token_digest,expires_at,revoked_at').eq('owner_id',fixture.userId).eq('share_type','parent_summary');
    assert(!found.error && found.data?.length===1,'Expected exactly one synthetic parent summary share.');
    const row=found.data[0], expectedDigest=createHash('sha256').update(fixture.shareToken).digest('hex');
    record('Synthetic share token model verified',true,row.token_digest === expectedDigest ? 'Previously repaired share matches the private fixture token.' : 'Original digest mismatched; database trigger derives digest from token.');
    const now = new Date(), nowIso=now.toISOString(), next7Iso=new Date(now.getTime()+7*86400000).toISOString();
    const counts=await admin.from('assignments').select('id',{count:'exact',head:true}).eq('owner_id',fixture.userId).gte('due_at',nowIso).lte('due_at',next7Iso).not('status','in','(done,submitted,graded)');
    assert(!counts.error && typeof counts.count==='number','Could not obtain synthetic due count.');
    await verifyOwner();
    const expired=await admin.from('share_links').update({token:fixture.shareToken,expires_at:new Date(Date.now()-60000).toISOString(),revoked_at:null}).eq('id',row.id).eq('owner_id',fixture.userId).eq('share_type','parent_summary').select('id,token_digest');
    assert(!expired.error && expired.data?.length===1 && expired.data[0].token_digest===expectedDigest,'Synthetic expired-share setup failed.');
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',reducedMotion:'reduce'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===base.origin?route.continue():route.abort());
    const page=await context.newPage();
    const sharePath=`/share/${fixture.shareToken}`;
    await page.goto(new URL(sharePath,base).href,{waitUntil:'networkidle'});
    const unavailable=await page.getByRole('heading',{name:'Link unavailable'}).isVisible().catch(()=>false);
    record('Expired synthetic recipient link is unavailable',unavailable);
    await page.screenshot({path:join(out,'shared-summary-expired.png'),fullPage:true,animations:'disabled'});

    await verifyOwner();
    const valid=await admin.from('share_links').update({expires_at:new Date(Date.now()+3600000).toISOString()}).eq('id',row.id).eq('owner_id',fixture.userId).eq('share_type','parent_summary').eq('token_digest',expectedDigest).select('id');
    assert(!valid.error && valid.data?.length===1,'Synthetic valid-share setup failed.');
    await page.reload({waitUntil:'networkidle'});
    for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'phone',width:390,height:844}]){
      await page.setViewportSize({width:viewport.width,height:viewport.height});
      await page.getByRole('heading',{name:'Shared progress'}).waitFor({timeout:10000});
      const summary=await page.evaluate(()=>{const labels=[...document.querySelectorAll('dt')];const due=labels.find(x=>x.textContent.trim()==='Due in seven days');return {heading:document.querySelector('h1')?.innerText,due:due?.nextElementSibling?.textContent?.trim(),text:document.body.innerText,scroll:document.documentElement.scrollWidth,width:innerWidth};});
      const onlySummary=!summary.text.includes('A linear relationship has a constant rate of change.')&&!summary.text.includes('Subtracting five keeps both sides equal.')&&!summary.text.includes(fixture.email)&&!summary.text.includes(fixture.shareToken);
      record(`Valid synthetic public summary ${viewport.name}`,summary.heading?.toLowerCase()==='shared progress'&&summary.due===String(counts.count)&&counts.count>0&&onlySummary&&!summary.text.includes('Link unavailable')&&summary.scroll<=summary.width,`due count verified: ${counts.count}; no private work text; width ${summary.scroll}/${summary.width}`);
      await page.screenshot({path:join(out,`shared-summary-${viewport.name}.png`),fullPage:true,animations:'disabled'});
    }
    await page.setViewportSize({width:1280,height:900});
    await page.emulateMedia({media:'print'});
    const pdfPath=join(out,'synthetic-shared-summary.pdf'); await page.pdf({path:pdfPath,printBackground:true,format:'Letter'});
    const bytes=await readFile(pdfPath), doc=await PDFDocument.load(bytes);
    const text=(await promisify(execFile)('pdftotext',['-layout',pdfPath,'-'],{maxBuffer:2_000_000})).stdout;
    const good=doc.getPageCount()>=1 && /shared progress/i.test(text) && /due in seven days/i.test(text) && !text.includes('A linear relationship has a constant rate of change.') && !text.includes(fixture.shareToken);
    record('Public synthetic summary prints as readable PDF',good,`${doc.getPageCount()} page(s), selected aggregate present`);
    await promisify(execFile)('pdftoppm',['-f','1','-l','1','-singlefile','-png','-r','110',pdfPath,join(out,'shared-summary-page-1')]);
    await context.close();
  } catch(e) { record('Share follow-up completed',false,String(e?.message??e).replace(/https?:\/\/[^\s)]+/g,'[url]').slice(0,300)); }
  finally { if(browser)await browser.close(); await writeFile(join(out,'share-followup-results.json'),JSON.stringify({timestamp:new Date().toISOString(),fixture:'verified tagged synthetic owner',checks,limitations:['Only selected synthetic aggregate fields were checked; no real recipient, email or account.','Public share evidence uses a repaired test fixture and does not validate external distribution.']},null,2)); }
  process.exit(checks.some(c=>!c.ok)?1:0);
}
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
const storageOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.origin === storageOrigin && url.pathname.startsWith('/storage/v1/object/sign/')) return route.continue();
  if (url.origin !== base.origin) return route.abort();
  if (/^\/api\/(?:diana|ai|voice|workers|tutor)\//.test(url.pathname)) return route.abort();
  return route.continue();
});
const jar = new Map();
const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => [...jar.values()], setAll: values => values.forEach(cookie => jar.set(cookie.name, cookie)) } });
const signed = await auth.auth.signInWithPassword({ email: fixture.email, password: fixture.password });
if (signed.error || signed.data.user?.id !== fixture.userId) throw Error('Synthetic fixture sign-in failed.');
await context.addCookies([...jar.values()].map(c => ({ name: c.name, value: c.value, url: base.origin, httpOnly: c.options?.httpOnly ?? false, secure: false, sameSite: 'Lax' })));
const checks = [];
const record = (name, ok, detail) => { checks.push({ name, ok: Boolean(ok), ...(detail ? { detail } : {}) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`); };
const page = await context.newPage();
const run = async (name, task) => { try { await task(); } catch (e) { record(name, false, String(e?.message ?? e).replace(/https?:\/\/[^\s)]+/g, '[url]').slice(0, 350)); } };
try {
  await run('Review screen', async () => {
    const result = await page.goto(new URL(`/assignments/${fixture.readyId}/submit?step=review`, base).href, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Equation reflection' }).waitFor();
    const heading = await page.getByRole('heading', { name: 'Your work' }).isVisible();
    const content = await page.getByText(/Subtracting five keeps both sides equal/).isVisible();
    const download = await page.getByRole('button', { name: 'Download PDF' }).isVisible();
    record('Review shows synthetic saved work and PDF action', result?.status() === 200 && heading && content && download);
    await page.screenshot({ path: join(out, 'review.png'), fullPage: true, animations: 'disabled' });
  });
  await run('Hand-in screen', async () => {
    const result = await page.goto(new URL(`/assignments/${fixture.readyId}/submit?step=hand-in`, base).href, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Hand in at school' }).waitFor();
    const download = await page.getByRole('button', { name: 'Download PDF' }).isVisible();
    const directions = await page.getByText(/Download your PDF, then hand it in/).isVisible();
    record('Hand-in shows PDF and explicit hand-in directions', result?.status() === 200 && download && directions);
    await page.screenshot({ path: join(out, 'hand-in.png'), fullPage: true, animations: 'disabled' });
  });
  await run('Actual PDF download button', async () => {
    const userCheck = await admin.auth.admin.getUserById(fixture.userId);
    if (userCheck.error || userCheck.data.user?.email !== fixture.email || userCheck.data.user?.user_metadata?.campus_qa_tag !== fixture.tag) throw Error('Fixture owner marker changed before PDF preparation.');
    const before = await admin.from('assignments').select('status').eq('id', fixture.readyId).eq('owner_id', fixture.userId).single();
    if (before.error || before.data.status !== 'exporting') throw Error('Synthetic assignment is not in the expected review state.');
    const promise = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: 'Download PDF' }).click();
    const download = await promise;
    const failure = await download.failure();
    if (failure) throw Error('Synthetic PDF download failed.');
    const pdfPath = join(out, 'synthetic-assignment-download.pdf');
    await download.saveAs(pdfPath);
    const bytes = await readFile(pdfPath);
    const doc = await PDFDocument.load(bytes);
    const text = (await promisify(execFile)('pdftotext', ['-layout', pdfPath, '-'], { maxBuffer: 2_000_000 })).stdout;
    const expected = ['Equation reflection', 'Subtracting five keeps both sides equal', 'x = 5'];
    record('Hand-in Download PDF produces readable assignment', bytes.length > 1000 && doc.getPageCount() >= 1 && expected.every(value => text.includes(value)), `${doc.getPageCount()} pages, ${bytes.length} bytes, ${expected.filter(value => text.includes(value)).length}/${expected.length} phrases`);
    await promisify(execFile)('pdftoppm', ['-f', '1', '-l', '1', '-singlefile', '-png', '-r', '110', pdfPath, join(out, 'assignment-download-page-1')]);
    const after = await admin.from('assignments').select('status').eq('id', fixture.readyId).eq('owner_id', fixture.userId).single();
    const fileResult = await admin.from('assignment_submission_files').select('id,assignment_id,owner_id,storage_bucket,storage_key,integrity_status').eq('assignment_id', fixture.readyId).eq('owner_id', fixture.userId).eq('integrity_status', 'bound').order('created_at', { ascending: false }).limit(1);
    const file = fileResult.data?.[0];
    record('Prepared PDF belongs to synthetic owner and does not submit work', !after.error && after.data.status === 'exporting' && !fileResult.error && file?.owner_id === fixture.userId && file?.assignment_id === fixture.readyId && Boolean(file.storage_bucket && file.storage_key));
    if (file) await writeFile(join(out, 'synthetic-delivery-cleanup.json'), JSON.stringify({ fileId: file.id, bucket: file.storage_bucket, objectKey: file.storage_key, syntheticOnly: true }, null, 2));
  });
  await run('PDF export', async () => {
    // The UI button persists a storage object and a DB binding. This read-only
    // route uses the same canonical PDF renderer and leaves the fixture intact.
    const response = await context.request.get(new URL(`/api/assignments/${fixture.readyId}/submission-artifact`, base).href);
    const headers = response.headers();
    record('Authenticated canonical PDF endpoint and no-store', response.status() === 200 && headers['content-type']?.includes('application/pdf') && headers['cache-control']?.includes('no-store'), `HTTP ${response.status()}`);
    if (response.status() !== 200) return;
    const bytes = await response.body();
    const pdfPath = join(out, 'synthetic-assignment-download.pdf');
    const doc = await PDFDocument.load(bytes);
    const pages = doc.getPages();
    record('Canonical PDF parses with nonempty pages', pages.length >= 1 && bytes.length > 1000 && pages.every(p => p.getWidth() > 0 && p.getHeight() > 0), `${pages.length} pages, ${bytes.length} bytes`);
    const text = (await promisify(execFile)('pdftotext', ['-layout', pdfPath, '-'], { maxBuffer: 2_000_000 })).stdout;
    const expected = ['Equation reflection', 'Subtracting five keeps both sides equal', 'x = 5'];
    record('Export contains assignment title and student work', expected.every(value => text.includes(value)), `matched ${expected.filter(value => text.includes(value)).length}/${expected.length} expected phrases`);
    await writeFile(join(out, 'assignment-extracted.txt'), text);
    record('First assignment page rasterizes', true);
  });
  await run('Public share print', async () => {
    const guest = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    await guest.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort());
    const share = await guest.newPage();
    const response = await share.goto(new URL(`/share/${fixture.shareToken}`, base).href, { waitUntil: 'networkidle' });
    const heading = await share.locator('h1').first().innerText().catch(() => '');
    if (response?.status() !== 200 || !heading || /not active|unavailable/i.test(heading)) { checks.push({name:'Synthetic shared summary print',ok:null,detail:'Skipped: existing synthetic share unavailable or expired; no new share was created.'}); console.log('SKIP Synthetic shared summary print: existing synthetic share unavailable or expired'); await guest.close(); return; }
    const file = join(out, 'synthetic-shared-summary.pdf');
    await share.emulateMedia({ media: 'print' });
    await share.pdf({ path: file, printBackground: true, format: 'Letter' });
    const bytes = await readFile(file);
    const doc = await PDFDocument.load(bytes);
    const text = (await promisify(execFile)('pdftotext', ['-layout', file, '-'])).stdout;
    record('Synthetic shared summary prints to readable PDF', doc.getPageCount() >= 1 && text.trim().length > 40, `${doc.getPageCount()} pages, ${text.trim().length} extracted characters`);
    await promisify(execFile)('pdftoppm', ['-f', '1', '-l', '1', '-singlefile', '-png', '-r', '110', file, join(out, 'shared-summary-page-1')]);
    await guest.close();
  });
} finally {
  await context.close();
  await browser.close();
  await writeFile(join(out, 'results.json'), JSON.stringify({ timestamp: new Date().toISOString(), target: base.origin, fixture: 'verified synthetic owner; one authorized PDF delivery artifact', checks, limitations: ['The test creates one synthetic PDF storage object and database binding for the retained fixture; cleanup metadata is recorded separately.', 'No external school submission, user accounts, paid providers, email, or real student data were used.'] }, null, 2));
}
process.exitCode = checks.some(c => c.ok === false) ? 1 : 0;
