/** Exact-origin, SHA-pinned live campus QA. No email, real student, AI or school-provider operation. */
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, open as openFile, readFile, writeFile, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, join } from 'node:path';

const ORIGIN = 'https://diana-umber.vercel.app';
const PROJECT = 'https://oitipayrriupcitgmzju.supabase.co';
const MARKER = 'production_campus_qa_tag';
const args = process.argv.slice(2);
if (args.some(arg => !/^--(?:plan|expected-sha=[a-f0-9]{40}|run=[a-z0-9][a-z0-9-]{0,70}|cleanup=[a-z0-9][a-z0-9-]{0,70})$/.test(arg))) throw Error('Unknown or invalid production gate argument.');
const expectedSha = args.find(arg => arg.startsWith('--expected-sha='))?.slice(15);
if (!expectedSha || !/^[a-f0-9]{40}$/.test(expectedSha)) throw Error('A full --expected-sha is required.');
const cleanupRun = args.find(arg => arg.startsWith('--cleanup='))?.slice(10);
const run = cleanupRun ?? args.find(arg => arg.startsWith('--run='))?.slice(6) ?? new Date().toISOString().toLowerCase().replace(/[:.]/g, '-');
const viewports = [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'phone', width: 390, height: 844 }];
const routeLabels = ['Lobby Now', 'Check-in', 'This Week', 'Work', 'Workspace', 'Classes', 'Class detail', 'Calendar', 'More', 'Settings', 'Security', 'Notes', 'Note detail', 'Quiz', 'Practice', 'Review', 'Hand-in'];
if (args.includes('--plan')) {
  if (cleanupRun) throw Error('Plan and cleanup are separate operations.');
  console.log(JSON.stringify({ readOnly: true, target: ORIGIN, expectedSha, buildPin: '/api/build-info before any remote fixture and after verification', viewports, routes: routeLabels, fixture: 'unique marked adult @local.test user; no raw credentials or browser state written', allowedBrowserOrigins: [ORIGIN, PROJECT + '/auth/v1/{token,user,logout}', PROJECT + '/storage/v1/object/sign/assignment-submissions/{owned ready-assignment prefix}'], effects: 'normal run creates only its own fixture, saves its onboarding/note and one PDF per viewport, then verifies cleanup', exclusions: ['Mail and callback delivery', 'AI or paid generation', 'Actual school/Calendar connection or submission', 'Offline-device guarantees', 'Exhaustive subjects and every page permutation'] }, null, 2));
  process.exit(0);
}
const output = resolve('docs/design/full-app-experience-plan-2026-11-17/implementation-qa', 'production-' + run);
const privateRoot = resolve('.tmp/campus-production-qa');
const manifestPath = join(privateRoot, run + '.json');
const resultFile = cleanupRun ? 'cleanup-results.json' : 'results.json';
const report = { version: 'canonical-campus-production-v1', run, target: ORIGIN, expectedSha, startedAt: new Date().toISOString(), checks: [], captures: [], cleanup: { status: 'not-started' }, limitations: ['Representative live rendering and owned functional paths, not all subjects or route permutations.', 'No real student, email, OAuth connection, AI generation or external school submission.', 'Browser service workers are blocked; prior local production-worker evidence is separate.'] };
let admin, browser, fixture;
const invocationIdentity = randomUUID();
let manifestHandle, manifestOwned = false, reservationConflict = false, authRequestStarted = false, canWriteReport = false;
let expectedReservationId = invocationIdentity;
let blockedProviderCalls = 0;
class GateError extends Error {}
function requireThat(value, message) { if (!value) throw new GateError(message); }
function safeError(error) { return error instanceof GateError ? error.message : 'A browser, local utility or provider response stopped this check; private diagnostics were omitted.'; }
async function checkpoint() { if (canWriteReport) { await mkdir(output, { recursive: true }); await writeFile(join(output, resultFile), JSON.stringify(report, null, 2)); } }
async function check(name, fn, required = false) { try { const detail = await fn(); report.checks.push({ name, ok: true, ...detail }); } catch (error) { report.checks.push({ name, ok: false, error: safeError(error) }); if (required) throw error; } finally { await checkpoint(); } }
async function pin() {
  const response = await fetch(ORIGIN + '/api/build-info', { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(15000) });
  requireThat(response.status === 200 && new URL(response.url).origin === ORIGIN, 'Canonical build identity was not available directly.');
  const identity = await response.json();
  requireThat(identity.gitCommitSha === expectedSha && typeof identity.deploymentId === 'string', 'Canonical deployment does not match the required release SHA. No fixture may be created for another release.');
  return { gitCommitSha: identity.gitCommitSha, deploymentId: identity.deploymentId };
}
async function configureAdmin() {
  nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
  requireThat(process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') === PROJECT && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), 'Existing local credentials do not identify the fixed Diana backend.');
  admin = createClient(PROJECT, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function owner() {
  requireThat(fixture?.version === 1 && fixture.target === ORIGIN && fixture.project === PROJECT && /^campus-release-qa-[0-9a-f-]{36}$/.test(fixture.tag) && fixture.email === fixture.tag + '@local.test', 'Cleanup manifest is not a marked canonical QA fixture.');
  for (const key of ['userId', 'classId', 'assignmentId', 'readyId', 'noteId', 'practiceId']) requireThat(/^[0-9a-f-]{36}$/.test(fixture[key]), 'A fixture identifier is invalid.');
  const result = await admin.auth.admin.getUserById(fixture.userId);
  requireThat(!result.error && result.data.user?.email === fixture.email && result.data.user?.user_metadata?.[MARKER] === fixture.tag, 'The exact disposable owner marker could not be verified.');
}
async function insert(table, rows) { const result = await admin.from(table).insert(rows); requireThat(!result.error, 'Synthetic fixture seeding stopped at ' + table + '.'); }
async function profile(patch) { await owner(); const result = await admin.from('profiles').update(patch).eq('user_id', fixture.userId); requireThat(!result.error, 'Synthetic profile update could not be confirmed.'); }
async function persistRecord(handle, record) {
  const safe = { ...record }; delete safe.password;
  const bytes = Buffer.from(JSON.stringify(safe));
  const written = await handle.write(bytes, 0, bytes.length, 0);
  requireThat(written.bytesWritten === bytes.length, 'Reservation state could not be fully written.');
  await handle.truncate(bytes.length); await handle.sync();
}
async function reserveManifest(file, record) {
  const handle = await openFile(file, 'wx', 0o600);
  try { await persistRecord(handle, record); return handle; }
  catch (error) { error.reservationHandle = handle; throw error; }
}
async function removeReservation(file, identity, expectedRun) {
  const saved = JSON.parse(await readFile(file, 'utf8'));
  requireThat(saved.reservationId === identity && saved.run === expectedRun, 'Reservation ownership changed; the manifest was preserved.');
  await unlink(file);
}
async function reserveFixture() {
  const tag = 'campus-release-qa-' + randomUUID();
  fixture = { version: 1, target: ORIGIN, project: PROJECT, run, reservationId: invocationIdentity, phase: 'reserved', tag, email: tag + '@local.test', userId: null, classId: randomUUID(), assignmentId: randomUUID(), readyId: randomUUID(), noteId: randomUUID(), practiceId: randomUUID() };
  await mkdir(privateRoot, { recursive: true });
  try { manifestHandle = await reserveManifest(manifestPath, fixture); manifestOwned = true; canWriteReport = true; }
  catch (error) {
    if (error.reservationHandle) { manifestHandle = error.reservationHandle; manifestOwned = true; canWriteReport = true; }
    if (error.code === 'EEXIST') { reservationConflict = true; throw new GateError('This run is reserved by another invocation. No provider call was made.'); }
    throw error;
  }
}
async function releaseManifest() {
  await manifestHandle?.close(); manifestHandle = null;
  await removeReservation(manifestPath, expectedReservationId, run); manifestOwned = false;
}
async function seed() {
  const password = 'Qa!' + randomBytes(28).toString('base64url') + '9';
  fixture.phase = 'auth-request-started'; await persistRecord(manifestHandle, fixture);
  authRequestStarted = true;
  const created = await admin.auth.admin.createUser({ email: fixture.email, password, email_confirm: true, user_metadata: { display_name: 'Casey Morgan', date_of_birth: '2000-01-01', timezone: 'America/Los_Angeles', [MARKER]: fixture.tag } });
  if (created.data?.user?.id) { fixture.userId = created.data.user.id; fixture.phase = 'owned'; await persistRecord(manifestHandle, fixture); }
  requireThat(!created.error && fixture.userId, 'Auth creation was not confirmed; preserve this reservation and reconcile its exact marker/email.');
  fixture.password = password; // Memory only; reservation updates always exclude it.
  await owner();
  const prefs = await admin.from('profiles').upsert({ user_id: fixture.userId, display_name: 'Casey Morgan', date_of_birth: '2000-01-01', age_bracket: 'adult', timezone: 'America/Los_Angeles', onboarded_at: null, consent_ai: false, daily_token_budget: 0, tokens_used_today: 0, school_name: 'Release Preview High School', school_primary_color: '#24563b', school_secondary_color: '#c6a66b', school_logo_url: null, school_year: 11, font_size: 'normal', line_spacing: 'normal', reading_font: 'system', reduced_motion: true });
  requireThat(!prefs.error, 'The disposable profile could not be prepared.');
  await insert('classes', { id: fixture.classId, owner_id: fixture.userId, name: 'Algebra II', teacher: 'Ms. Rivera', ai_mode: 'green', color: '#24563b', subject_category: 'mathematics' });
  const common = { owner_id: fixture.userId, class_id: fixture.classId, kind: 'problem_set', due_at: new Date(Date.now() + 172800000).toISOString(), estimated_minutes: 25, reading_load: 1, writing_load: 1, work_profile: 'math', work_profile_source: 'student_selected', saved_work: { workspaceMode: 'math' } };
  await insert('assignments', [{ ...common, id: fixture.assignmentId, title: 'Linear relationships', description: 'Solve 3x + 5 = 20 and explain each step.', status: 'drafting' }, { ...common, id: fixture.readyId, title: 'Equation reflection', description: 'Explain the solution of 3x + 5 = 20.', status: 'exporting' }]);
  await insert('assignment_problems', [fixture.assignmentId, fixture.readyId].map((id, index) => ({ owner_id: fixture.userId, assignment_id: id, problem_number: 1, problem_text: 'Solve 3x + 5 = 20. Explain each step.', student_work: { work: 'Subtracting five keeps both sides equal. Dividing each side by three gives x = 5.' }, progress_status: index ? 'done' : 'in_progress', source: 'manual' })));
  await insert('notes', { id: fixture.noteId, owner_id: fixture.userId, class_id: fixture.classId, title: 'Linear relationships notes', body_text: 'A linear relationship has a constant rate of change. The solution of 3x + 5 = 20 is x = 5.', source: 'manual', tags: ['production-campus-qa'] });
  await insert('study_artifacts', { id: fixture.practiceId, owner_id: fixture.userId, class_id: fixture.classId, title: 'Linear relationships practice', artifact_type: 'practice_test', source_type: 'note', source_id: fixture.noteId, study_mode: 'retrieval_quiz', ai_policy: 'green', payload: { summary: 'Practice from synthetic notes.', quiz: [{ question: 'Which operation starts the solution of 3x + 5 = 20?', choices: ['Subtract 5 from both sides', 'Add 5 to both sides'], answer: 'Subtract 5 from both sides', hint: 'First undo the addition.', sourceAnchor: 'Synthetic notes' }], guide: [], cards: [], authorshipReceipt: 'Authored synthetic release QA; no AI provider called.' } });
}
async function contextFor(viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.name === 'phone', hasTouch: viewport.name === 'phone', reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!url.protocol.startsWith('http')) return route.continue();
    if (url.origin === ORIGIN && !/^\/api\/(?:diana|ai|voice|workers|tutor)(?:\/|$)/.test(url.pathname)) return route.continue();
    if (url.origin === PROJECT && ['/auth/v1/token', '/auth/v1/user', '/auth/v1/logout'].includes(url.pathname)) return route.continue();
    if (url.origin === PROJECT && url.pathname.startsWith('/storage/v1/object/sign/assignment-submissions/' + fixture.userId + '/' + fixture.readyId + '/')) return route.continue();
    blockedProviderCalls++;
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"External providers are excluded from synthetic release QA"}' });
  });
  return context;
}
async function open(page, path) { return page.goto(new URL(path, ORIGIN).href, { waitUntil: 'domcontentloaded', timeout: 45000 }); }
async function settled(page) { await page.locator('h1').first().waitFor({ state: 'visible' }); await page.evaluate(() => document.fonts.ready); await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))); }
async function shot(page, viewport, slug) {
  const masks = [page.getByText(fixture.email, { exact: false })];
  for (const input of await page.locator('input[type=password]').all()) if (await input.inputValue()) masks.push(input);
  const file = viewport.name + '-' + slug + '.png';
  await page.screenshot({ path: join(output, file), fullPage: true, animations: 'disabled', mask: masks, maskColor: '#173026' });
  return file;
}
async function capture(page, viewport, slug, path, expectedScene) {
  const errors = [], assets = [];
  const onError = () => errors.push('browser-error');
  const onResponse = response => { if (response.status() >= 400 && /\.(?:webp|png|woff2|css|js)(?:\?|$)/.test(response.url())) assets.push('presentation-asset-error'); };
  page.on('pageerror', onError); page.on('response', onResponse);
  const row = { viewport: viewport.name, slug, ok: false };
  try {
    const response = await open(page, path); await settled(page);
    requireThat(response?.status() === 200 && new URL(page.url()).origin === ORIGIN && new URL(page.url()).pathname === new URL(path, ORIGIN).pathname, 'Page did not render directly as the synthetic student.');
    const metrics = await page.evaluate(width => ({ overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > width + 2, scene: document.querySelector('[data-campus-family]')?.getAttribute('data-campus-family'), missingImages: [...document.images].filter(img => img.getBoundingClientRect().width > 0 && img.complete && !img.naturalWidth).length }), viewport.width);
    requireThat(!metrics.overflow && !metrics.missingImages && !errors.length && !assets.length, 'Page has overflow, an asset problem or a browser error.');
    if (expectedScene) requireThat(metrics.scene === expectedScene, 'Page displayed another campus scene.');
    const nav = page.locator('[data-student-navigation] nav a');
    if (await nav.count()) { const boxes = await nav.evaluateAll(links => links.map(link => { const b = link.getBoundingClientRect(); return { width: b.width, height: b.height, left: b.left, right: b.right }; })); requireThat(boxes.length === 5 && boxes.every(b => b.width >= 44 && b.height >= 44 && b.left >= 0 && b.right <= viewport.width + 1), 'Five primary navigation targets do not fit.'); }
    row.ok = true; row.scene = metrics.scene;
  } catch (error) { row.error = safeError(error); }
  finally { page.off('pageerror', onError); page.off('response', onResponse); row.screenshot = await shot(page, viewport, slug).catch(() => null); report.captures.push(row); await checkpoint(); }
}
async function signInAndOnboard(page, viewport) {
  const diagnostic = { viewport: viewport.name, stage: 'prepare', authResponses: [], alerts: [] };
  (report.signInDiagnostics ??= []).push(diagnostic);
  const onResponse = response => { const url = new URL(response.url()); if (url.origin === PROJECT && url.pathname.startsWith('/auth/v1/')) diagnostic.authResponses.push({ path: url.pathname, status: response.status() }); };
  page.on('response', onResponse);
  try {
    await profile({ onboarded_at: null });
    await open(page, '/login'); await settled(page); await shot(page, viewport, 'sign-in');
    diagnostic.stage = 'sign-in';
    await page.getByLabel('Email', { exact: true }).fill(fixture.email); await page.getByLabel('Password', { exact: true }).fill(fixture.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    const entered = await Promise.race([page.getByRole('heading', { name: 'Make it yours', exact: true }).waitFor({ timeout: 30000 }).then(() => true), page.locator('.entry-error[role=alert]').waitFor({ timeout: 30000 }).then(() => false)]);
    requireThat(entered, 'The actual sign-in form reported a rejection.');
    diagnostic.stage = 'personalize';
    await page.getByRole('radio', { name: 'Time Management', exact: true }).click();
    await page.getByRole('radiogroup', { name: 'Study schedule', exact: true }).getByRole('radio', { name: 'Morning', exact: true }).click();
    await page.getByLabel('School name', { exact: true }).fill('Release Preview High School');
    await page.getByLabel('First school color', { exact: true }).fill('#24563b'); await page.getByLabel('Second school color', { exact: true }).fill('#c6a66b');
    await shot(page, viewport, 'onboarding-personalize');
    diagnostic.stage = 'continue-to-connect';
    await page.getByRole('button', { name: 'Continue', exact: true }).click(); await page.getByRole('heading', { name: 'Connect your school', exact: true }).waitFor();
    diagnostic.stage = 'skip-connections';
    await shot(page, viewport, 'onboarding-connect'); await page.getByRole('button', { name: 'Skip for now', exact: true }).click();
    await page.locator('[data-student-navigation]').waitFor();
    diagnostic.stage = 'verify-save';
    const saved = await admin.from('profiles').select('onboarded_at,school_name,school_primary_color,school_secondary_color,consent_ai,daily_token_budget').eq('user_id', fixture.userId).single();
    requireThat(!saved.error && saved.data.onboarded_at && saved.data.school_name === 'Release Preview High School' && saved.data.school_primary_color?.toLowerCase() === '#24563b' && saved.data.school_secondary_color?.toLowerCase() === '#c6a66b' && saved.data.consent_ai === false && saved.data.daily_token_budget === 0, 'Actual onboarding did not retain the fixture preferences and provider boundaries.');
    diagnostic.stage = 'complete';
    return { actualUiSignIn: true, actualOnboardingSave: true, connectionsSkipped: true };
  } catch {
    diagnostic.path = new URL(page.url()).pathname;
    diagnostic.alerts = (await page.locator('.entry-error[role=alert]').allTextContents().catch(() => [])).map(value => value.replaceAll(fixture.email, '[synthetic email]').slice(0, 300));
    diagnostic.failureScreenshot = await shot(page, viewport, 'auth-stopped').catch(() => null);
    throw new GateError('Actual sign-in/onboarding stopped at ' + diagnostic.stage + '.');
  } finally { page.off('response', onResponse); await checkpoint(); }
}
function cases() { return [
  ['lobby-now', '/dashboard?view=now'], ['check-in', '/dashboard?view=check-in'], ['this-week', '/dashboard?view=week'], ['work', '/assignments', 'work'], ['workspace', '/assignments/' + fixture.assignmentId + '/workspace'], ['classes', '/classes', 'classes'], ['class-detail', '/classes/' + fixture.classId], ['calendar', '/calendar', 'calendar'], ['more', '/more?section=study', 'commons'], ['settings', '/settings', 'services'], ['security', '/settings?section=security', 'services'], ['notes', '/notes', 'library'], ['note-detail', '/notes/' + fixture.noteId, 'library'], ['quiz', '/study', 'seminar'], ['practice', '/study-artifacts/' + fixture.practiceId, 'seminar'], ['review', '/assignments/' + fixture.readyId + '/submit?step=review'], ['hand-in', '/assignments/' + fixture.readyId + '/submit?step=hand-in'],
]; }
function contrast(a, b) { const lum = value => { const rgb = value.match(/[0-9.]+/g)?.slice(0, 3).map(Number); if (!rgb || rgb.length !== 3) return null; return rgb.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, index) => sum + v * [.2126, .7152, .0722][index], 0); }; const x = lum(a), y = lum(b); return x === null || y === null ? 0 : (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
async function interactions(page, viewport) {
  await open(page, '/more'); await settled(page); const tab = page.getByRole('tab', { name: 'Study tools', exact: true }); await tab.focus(); await tab.press('ArrowRight');
  requireThat(await page.getByRole('tab', { name: 'Record', exact: true }).getAttribute('aria-selected') === 'true', 'More keyboard selection did not move.'); await page.reload(); await settled(page); requireThat(await page.getByRole('tab', { name: 'Record', exact: true }).getAttribute('aria-selected') === 'true', 'More selection did not persist.');
  await open(page, '/classes/' + fixture.classId); await settled(page); await page.getByRole('tab', { name: 'Notes', exact: true }).click(); await page.reload(); await settled(page); requireThat(await page.getByRole('tab', { name: 'Notes', exact: true }).getAttribute('aria-selected') === 'true', 'Class tab did not persist.');
  await open(page, '/notes/' + fixture.noteId); await settled(page); const note = 'Synthetic ' + viewport.name + ' release note. The solution is x = 5.'; await page.getByRole('textbox', { name: 'Note body', exact: true }).fill(note); await page.getByRole('button', { name: 'Save note', exact: true }).click(); await page.getByText('Saved', { exact: true }).waitFor(); await page.reload(); await settled(page); requireThat(await page.getByRole('textbox', { name: 'Note body', exact: true }).inputValue() === note, 'Note save did not survive reload.');
  await profile({ reading_font: 'atkinson', font_size: 'large', reading_letter_spacing: 'wide', reading_word_spacing: 'wide', high_contrast: true }); await page.reload(); await settled(page);
  const reading = await page.getByRole('textbox', { name: 'Note body', exact: true }).evaluate(element => { const s = getComputedStyle(element); return { font: s.fontFamily, size: parseFloat(s.fontSize), letter: parseFloat(s.letterSpacing), word: parseFloat(s.wordSpacing), paper: s.backgroundColor, ink: s.color }; });
  requireThat(/atkinson/i.test(reading.font) && reading.size >= 18 && reading.letter > 0 && reading.word > 0 && contrast(reading.paper, reading.ink) >= 7, 'Saved reading preferences or contrast did not reach the note editor.'); await profile({ reading_font: 'system', font_size: 'normal', reading_letter_spacing: 'normal', reading_word_spacing: 'normal', high_contrast: false });
  await open(page, '/assignments/' + fixture.readyId + '/submit?step=review'); await settled(page); await page.getByRole('button', { name: 'Continue to hand in', exact: true }).click(); await page.reload(); await settled(page); requireThat(new URL(page.url()).searchParams.get('step') === 'hand-in' && await page.getByRole('tab', { name: 'Hand in', exact: true }).getAttribute('aria-selected') === 'true', 'Review continuation did not survive reload.');
  return { moreKeyboardAndReload: true, classTabReload: true, noteSaveReload: true, reading, reviewHandInReload: true };
}
async function downloadPdf(page, viewport) {
  await owner(); await open(page, '/assignments/' + fixture.readyId + '/submit?step=hand-in'); await settled(page);
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: /^download pdf$/i }).click()]);
  requireThat(!await download.failure(), 'The actual PDF download did not complete.'); const file = join(output, viewport.name + '-assignment.pdf'); await download.saveAs(file);
  const bytes = await readFile(file), pdf = await PDFDocument.load(bytes); requireThat(bytes.length > 1000 && pdf.getPageCount() > 0, 'The downloaded PDF is empty or invalid.');
  const extracted = await promisify(execFile)('pdftotext', ['-layout', file, '-'], { maxBuffer: 2000000 }); requireThat(['Equation reflection', 'Subtracting five keeps both sides equal', 'x = 5'].every(value => extracted.stdout.includes(value)), 'The downloaded PDF lacks the synthetic assignment or saved work.');
  const status = await admin.from('assignments').select('status').eq('owner_id', fixture.userId).eq('id', fixture.readyId).single();
  const files = await admin.from('assignment_submission_files').select('id,owner_id,assignment_id,storage_bucket,storage_key,integrity_status').eq('owner_id', fixture.userId).eq('assignment_id', fixture.readyId);
  requireThat(!status.error && status.data.status === 'exporting' && !files.error && files.data.some(row => row.integrity_status === 'bound' && row.storage_bucket === 'assignment-submissions' && row.storage_key.startsWith(fixture.userId + '/' + fixture.readyId + '/')), 'PDF binding is unavailable or downloading changed the submission state.');
  return { actualDownload: true, pages: pdf.getPageCount(), bytes: bytes.length, containsSavedWork: true, remainsUnsubmitted: true };
}
async function cleanOwnedStorage() {
  const bucket = admin.storage.from('assignment-submissions'); let removedCount = 0;
  for (const assignmentId of [fixture.assignmentId, fixture.readyId]) {
    const prefix = fixture.userId + '/' + assignmentId;
    const versions = await bucket.list(prefix, { limit: 100 });
    requireThat(!versions.error && versions.data.length < 100, 'Owned PDF folders could not be bounded for cleanup.');
    for (const version of versions.data) {
      requireThat(!version.id && /^[0-9a-f-]{36}$/.test(version.name), 'Owned PDF folder has an unexpected shape.');
      const folder = prefix + '/' + version.name, files = await bucket.list(folder, { limit: 100 });
      requireThat(!files.error && files.data.length < 100 && files.data.every(file => file.id && /^[0-9a-f-]{36}\.pdf$/.test(file.name)), 'Owned PDF objects could not be bounded for cleanup.');
      const keys = files.data.map(file => folder + '/' + file.name);
      if (keys.length) { const removed = await bucket.remove(keys); requireThat(!removed.error, 'Owned PDF storage removal could not be confirmed.'); removedCount += keys.length; }
      const after = await bucket.list(folder, { limit: 100 }); requireThat(!after.error && after.data.length === 0, 'An owned PDF object remained after cleanup.');
    }
  }
  return removedCount;
}
async function cleanup() {
  if (reservationConflict) { report.cleanup = { status: 'run-reservation-not-owned', providerSideEffects: false }; return; }
  if (!fixture) { report.cleanup = { status: cleanupRun ? 'cleanup-manifest-not-validated' : 'no-fixture-created' }; return; }
  if (!manifestOwned && !authRequestStarted) { report.cleanup = { status: 'no-provider-side-effects', reservationOwnershipUnconfirmed: true }; return; }
  if (!fixture.userId) {
    if (manifestOwned && !authRequestStarted && !cleanupRun) { await releaseManifest(); report.cleanup = { status: 'reservation-released-no-provider-call' }; }
    else report.cleanup = { status: 'needs-auth-reconciliation', run, marker: fixture.tag, email: fixture.email, reservationId: fixture.reservationId, instruction: 'Preserve this run manifest. Reconcile only its exact email and metadata marker; do not enumerate users or delete another reservation.' };
    return;
  }
  await owner();
  const files = await admin.from('assignment_submission_files').select('id,assignment_id,storage_bucket,storage_key').eq('owner_id', fixture.userId);
  requireThat(!files.error, 'Owned submission bindings could not be inspected for cleanup.');
  for (const file of files.data ?? []) {
    requireThat([fixture.readyId, fixture.assignmentId].includes(file.assignment_id) && file.storage_bucket === 'assignment-submissions' && file.storage_key.startsWith(fixture.userId + '/' + file.assignment_id + '/') && !file.storage_key.split('/').some(part => part === '.' || part === '..'), 'Submission cleanup encountered an unexpected storage binding.');
  }
  const storageObjects = await cleanOwnedStorage();
  for (const table of ['assignment_submission_files', 'study_artifacts', 'notes', 'assignment_problems', 'assignments', 'classes']) { await owner(); const removed = await admin.from(table).delete().eq('owner_id', fixture.userId); requireThat(!removed.error, 'Owned cleanup stopped at ' + table + '.'); const count = await admin.from(table).select('id', { count: 'exact', head: true }).eq('owner_id', fixture.userId); requireThat(!count.error && count.count === 0, 'Owned rows remain in ' + table + '.'); }
  await owner(); const removed = await admin.auth.admin.deleteUser(fixture.userId); requireThat(!removed.error, 'Synthetic Auth owner deletion could not be confirmed.'); const verification = await admin.auth.admin.getUserById(fixture.userId); requireThat(!verification.data.user && verification.error?.status === 404, 'Synthetic Auth owner deletion did not return 404.');
  await releaseManifest(); fixture.password = undefined; report.cleanup = { status: 'deleted-and-verified', ownedStorageObjectsRemoved: storageObjects, authNotFound: true };
}
try {
  if (!cleanupRun) { await reserveFixture(); report.initialBuild = await pin(); }
  await configureAdmin();
  if (cleanupRun) { const saved = JSON.parse(await readFile(manifestPath, 'utf8')); requireThat(saved.run === run && /^[0-9a-f-]{36}$/.test(saved.reservationId), 'Cleanup manifest does not identify this reserved run.'); fixture = saved; expectedReservationId = saved.reservationId; manifestOwned = true; canWriteReport = true; }
  else {
    await seed(); browser = await chromium.launch({ headless: true });
    for (const viewport of viewports) {
      const context = await contextFor(viewport), page = await context.newPage();
      try { await check('sign-in-onboarding-' + viewport.name, () => signInAndOnboard(page, viewport), true);
        for (const [slug, path, scene] of cases()) await capture(page, viewport, slug, path, scene);
        await check('owned-interactions-' + viewport.name, () => interactions(page, viewport));
        await check('actual-pdf-' + viewport.name, () => downloadPdf(page, viewport));
      } finally { await context.close(); }
    }
    report.finalBuild = await pin();
  }
} catch (error) { report.fatal = safeError(error); }
finally {
  await browser?.close().catch(() => {});
  try { await cleanup(); } catch (error) { report.cleanup = { status: 'needs-exact-owned-cleanup', error: safeError(error), recovery: 'node scripts/qa-campus-production.mjs --expected-sha=' + expectedSha + ' --cleanup=' + run }; }
  report.finishedAt = new Date().toISOString(); report.blockedProviderCalls = blockedProviderCalls;
  report.totals = { screens: report.captures.length, screenPasses: report.captures.filter(row => row.ok).length, checks: report.checks.length, checkPasses: report.checks.filter(row => row.ok).length };
  await manifestHandle?.close().catch(() => {}); manifestHandle = null;
  if (canWriteReport) { await mkdir(output, { recursive: true }); await writeFile(join(output, resultFile), JSON.stringify(report, null, 2) + '\n'); }
  console.log(JSON.stringify({ report: canWriteReport ? 'implementation-qa/production-' + run + '/' + resultFile : null, totals: report.totals, cleanup: report.cleanup.status, fatal: report.fatal ?? null }));
  if (report.fatal || !['deleted-and-verified', 'no-fixture-created', 'reservation-released-no-provider-call'].includes(report.cleanup.status) || report.totals.screens !== report.totals.screenPasses || report.totals.checks !== report.totals.checkPasses) process.exitCode = 1;
}
