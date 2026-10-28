const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/xrcy1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source=process.env.APPDASHBOARD_TEMPLATE_ROOT||'C:/Users/xrcy1/Desktop/个人资料/AppDashboard-pro/AppDashboard-pro';
const props=['backgroundColor','color','fontSize','fontFamily','fontWeight','lineHeight','borderRadius','borderTopColor','borderTopWidth','boxShadow','paddingTop','paddingRight','paddingBottom','paddingLeft'];
const styles=locator=>locator.evaluate((node,props)=>Object.fromEntries(props.map(key=>[key,getComputedStyle(node)[key]])),props);

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),reference=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(7000);
  const root='http://127.0.0.1:3004/?project='+encodeURIComponent('销售数据工程');
  await reference.goto(pathToFileURL(source+'/forms-select.html').href);
  const original=reference.locator('.choices').filter({has:reference.locator('#basicSelect')});
  await original.click();await reference.mouse.move(0,0);await reference.waitForTimeout(300);
  const originalStyles={};
  for(const selector of ['.choices__inner','.choices__list--single','.choices__list--dropdown','.choices__item--choice.is-highlighted'])originalStyles[selector]=await styles(original.locator(selector));
  let controls=0;
  for(const view of ['projects','connections','tasks','datasets','code','plans','runs']){
   await page.goto(root+'#'+view);
   const filters=page.locator('[data-resource-filters]'),selects=filters.locator('select');await filters.waitFor();
   assert.equal(await selects.count(),await filters.locator('.choices').count(),view+' has an uninitialized filter');
   for(const select of await selects.all()){
    const widget=select.locator('..').locator('..');
    assert.equal(await select.getAttribute('data-choice'),'active');
    assert.equal(await widget.locator('.choices__list--single').getAttribute('class'),'choices__list choices__list--single');
    assert.equal(await widget.locator('.choices__list--dropdown').getAttribute('style'),null,'No custom menu width/position');
    await widget.click();await widget.locator('.choices__list--dropdown').waitFor({state:'visible'});await page.mouse.move(0,0);await page.waitForTimeout(250);
    for(const [selector,expected]of Object.entries(originalStyles))assert.deepEqual(await styles(widget.locator(selector)),expected,view+': '+selector+' differs from the live original template');
    const option=widget.locator('[data-choice-selectable]').last();
    // Runtime rows can refresh during this check; trial click retries with the
    // remounted original component and checks the same real pointer target.
    await option.click({trial:true});
    assert(await option.evaluate(node=>{const r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'Dropdown option clipped/covered');
    const value=await option.getAttribute('data-value'),label=await option.innerText();
    await option.click();assert.equal(await select.inputValue(),value);assert.equal(await widget.locator('.choices__list--single').innerText(),label);
    await widget.click();await page.keyboard.press('Escape');assert.equal(await widget.getAttribute('aria-expanded'),'false');
    controls++;
   }
   await filters.getByRole('button',{name:'重置',exact:true}).click();
   for(const select of await selects.all())assert.equal(await select.inputValue(),'');
  }
  console.log(`PASS ${controls} list filters: live source-template component styles/markup, no custom menu positioning, selection, hit targets, Escape and reset.`);

  for(const [view,task]of [['tasks','订单持续采集'],['code','渠道指标计算']]){
   await page.goto(root+'#'+view);await page.locator('#main-table').getByRole('link',{name:task,exact:true}).click();
   await page.getByRole('tab',{name:'运行记录',exact:true}).click();
   const filters=page.locator('#run-filters');await filters.waitFor();assert.equal(await filters.locator('.choices').count(),2);
   for(const id of ['run-status','run-trigger']){
    const select=page.locator('#'+id),widget=filters.locator('.choices').filter({has:select});
    await widget.click();const option=widget.locator('[data-choice-selectable]').nth(1),value=await option.getAttribute('data-value');await option.click();
    assert.equal(await select.inputValue(),value);assert.equal(await widget.locator('.choices__list--single').innerText(),value);
   }
   await page.reload();await filters.waitFor();
   for(const select of await filters.locator('select').all())assert.equal(await select.locator('..').locator('.choices__list--single').innerText(),await select.inputValue());
   await filters.getByRole('button',{name:'重置',exact:true}).click();
   for(const select of await filters.locator('select').all()){assert.equal(await select.inputValue(),'');assert.equal(await select.locator('..').locator('.choices__list--single').innerText(),'全部');}
   const status=filters.locator('.choices').filter({has:page.locator('#run-status')});
   await status.click();await status.getByRole('option',{name:'已停止',exact:true}).click();
   await page.getByRole('tab',{name:'任务配置',exact:true}).click();await page.getByRole('tab',{name:'运行记录',exact:true}).click();
   assert.equal(await status.locator('.choices__list--single').innerText(),'已停止');
   if(view==='tasks'){
    await page.locator('#job-history tbody tr:visible [data-action=inspect]').first().click();
    await page.locator('[data-action=back-detail]').click();await filters.waitFor();
    assert.equal(await status.locator('.choices__list--single').innerText(),'已停止');
    await page.evaluate(()=>dispatchEvent(new Event('storage')));
    assert.equal(await status.locator('.choices__list--single').innerText(),'已停止');
    await filters.getByRole('button',{name:'重置',exact:true}).click();
    const trigger=filters.locator('.choices').filter({has:page.locator('#run-trigger')});
    await trigger.click();await page.waitForFunction(()=>getComputedStyle(document.querySelector('#job-pane-history')).opacity==='1');
    await page.screenshot({path:'artifacts/detail-filters-after.png',fullPage:true});
   }
  }
  console.log('PASS collection/code detail filters: same original component, chosen label/value, reload, tab change, nested back, refresh and reset.');
  await page.goto(root+'#datasets');
  for(const width of [1280,1440,1920,2560]){
   await page.setViewportSize({width,height:1000});
   for(const widget of await page.locator('[data-resource-filters] .choices').all()){
    const menu=widget.locator('.choices__list--dropdown');await widget.click();await menu.waitFor({state:'visible'});const r=await menu.boundingBox();
    assert(r.x>=0&&r.x+r.width<=width);await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.setViewportSize({width:1440,height:1000});await page.getByRole('combobox',{name:'来源',exact:true}).click();
  await page.screenshot({path:'artifacts/filters-after.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS all dropdown desktop bounds and no JavaScript errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
