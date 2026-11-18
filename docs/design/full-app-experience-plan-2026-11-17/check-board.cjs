const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const folder=__dirname,root=path.resolve(folder,'../../..');
const {chromium}=createRequire(path.join(root,'package.json'))('playwright');
(async()=>{
 const inventory=JSON.parse(fs.readFileSync(path.join(folder,'route-inventory.json'),'utf8'));
 const backgrounds=JSON.parse(fs.readFileSync(path.join(folder,'background-plan.json'),'utf8'));
 assert.equal(inventory.pages.length,93);assert.equal(new Set(inventory.pages.map(p=>p.route)).size,93);
 assert.equal(backgrounds.proposed.length,6);assert.equal(backgrounds.existing.length,4);
 for(const p of inventory.pages)assert.ok(fs.existsSync(path.join(root,p.source)),p.source);
 for(const f of ['entry-and-system-pages.md','primary-pages.md','more-settings-and-study-pages.md','README.md','route-inventory.md'])assert.ok(fs.statSync(path.join(folder,f)).size>500);
 const pageCsv=fs.readFileSync(path.join(folder,'page-checklist.csv'),'utf8');assert.equal(pageCsv.trim().split(/\r?\n/).length,94);
 const browser=await chromium.launch({headless:true});
 const errors=[],checks=[];
 try{
  const context=await browser.newContext();await context.route(/^https?:/,route=>route.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const [label,width,height] of [['desktop',1440,1000],['phone',390,844]]){
   await page.setViewportSize({width,height});await page.goto(pathToFileURL(path.join(folder,'index.html')).href);
   await page.locator('#count').waitFor();assert.match(await page.locator('#count').innerText(),/^93 of 93/);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
   await page.screenshot({path:path.join(folder,'plan-overview-'+label+'.png'),fullPage:false});
   await page.locator('#kind').selectOption('rendered page candidate');await page.locator('#query').fill('/notes');assert.match(await page.locator('#count').innerText(),/^3 of 93/);
   await page.locator('#query').fill('');await page.locator('#kind').selectOption('redirect');assert.match(await page.locator('#count').innerText(),/^42 of 93/);
   await page.locator('#kind').selectOption('rendered page candidate');assert.match(await page.locator('#count').innerText(),/^45 of 93/);
   await page.locator('#kind').selectOption('');await page.locator('#scene').selectOption('NEW-');assert.ok(await page.locator('#rows tr').count()>0);
   assert.ok((await page.locator('#rows tr').allTextContents()).every(t=>t.includes('NEW-')));
   await page.locator('#scene').selectOption('');
   if(label==='desktop'){
    for(const image of await page.locator('img').all()){await image.scrollIntoViewIfNeeded();await image.evaluate(async n=>n.decode());}
    assert.equal(await page.locator('img').evaluateAll(nodes=>nodes.filter(n=>n.naturalWidth>0).length),4);
    await page.locator('#backgrounds').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(folder,'plan-backgrounds-desktop.png'),fullPage:false});
   }
   checks.push({label,width,height,search:true,redirectCount:42,renderedCount:45,sceneFilter:true,noPageOverflow:true});
  }
  assert.equal(errors.length,0);const receipt={passed:true,baseline:inventory.baseline,sourcePageFiles:93,stateChecklistRows:fs.readFileSync(path.join(folder,'state-checklist.csv'),'utf8').trim().split(/\r?\n/).length-1,newSceneBriefs:6,existingScenes:4,checks,browserErrors:errors,externalNetworkAllowed:false,generatedImages:0};
  fs.writeFileSync(path.join(folder,'plan-verification.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
 }finally{await browser.close();}
})().catch(e=>{console.error('Plan verification did not complete: '+e.message);process.exit(1);});
