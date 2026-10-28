const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/xrcy1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(7000);page.on('pageerror',error=>errors.push(error.message));
  const root='http://127.0.0.1:3004/?project='+encodeURIComponent('销售数据工程');
  const body=page.locator('#resource-detail-body'),heading=page.locator('#workspace-heading h1');
  const noModal=async()=>{await page.locator('.modal.show').waitFor({state:'hidden'});await page.locator('.modal-backdrop').waitFor({state:'hidden'});assert.equal(await page.locator('.modal.show,.modal-backdrop').count(),0);};
  const urls={};
  for(const [view,kind]of Object.entries({connections:'connection',tasks:'tasks',datasets:'dataset',code:'code',plans:'plan',runs:'run',flows:'flows'})){
   await page.goto(root+'#'+view);
   await page.locator('#main-table tbody [data-action=inspect]').first().click();await body.waitFor();
   assert.equal(new URL(page.url()).searchParams.get('detail'),kind);await noModal();
   const title=await heading.innerText();
   const tabs=body.getByRole('tab');let lastTab='';
   if(await tabs.count()){
    lastTab=await tabs.last().innerText();await tabs.last().click();
    await page.waitForFunction(()=>!!new URL(location.href).searchParams.get('tab'));
   }
   urls[kind]=page.url();await page.reload();await body.waitFor();assert.equal(await heading.innerText(),title);
   if(lastTab)assert.equal(await body.getByRole('tab',{name:lastTab,exact:true}).getAttribute('aria-selected'),'true');
   await noModal();
   await page.goBack();await page.locator('#main-table').waitFor();assert.equal(new URL(page.url()).searchParams.has('detail'),false);
   await page.goForward();await body.waitFor();assert.equal(await heading.innerText(),title);await noModal();
   if(lastTab)assert.equal(await body.getByRole('tab',{name:lastTab,exact:true}).getAttribute('aria-selected'),'true');
  }
  console.log('PASS seven resource modules: main-content details, independent URL, selected tab refresh, browser back/forward, no detail modal.');

  await page.goto(root+'#datasets');
  const filters=page.locator('[data-resource-filters]'),keyword=filters.getByRole('searchbox');
  await keyword.fill('订单');await filters.getByRole('button',{name:'查询',exact:true}).click();
  const appliedRows=await page.locator('#main-table tbody').innerText();
  await keyword.fill('退款'); // Unsaved draft and applied query must remain distinct on return.
  await page.locator('#main-table').getByRole('link',{name:'订单明细',exact:true}).click();
  await body.getByRole('tab',{name:'来源与去向',exact:true}).click();
  await body.getByRole('link',{name:'订单业务库',exact:true}).first().click();
  await page.reload();await body.waitFor();
  await page.locator('[data-action=back-detail]').click();await heading.filter({hasText:'订单明细'}).waitFor();
  assert.equal(await body.getByRole('tab',{name:'来源与去向',exact:true}).getAttribute('aria-selected'),'true');
  await page.locator('[data-action=back-detail]').click();await filters.waitFor();
  assert.equal(await keyword.inputValue(),'退款');assert.equal(await page.locator('#main-table tbody').innerText(),appliedRows);
  console.log('PASS list → dataset lineage → source connection → reload → return chain, including draft/applied filters.');

  const fresh=await context.newPage();
  await fresh.goto(urls.code);await fresh.locator('#resource-detail-body').waitFor();
  await fresh.getByRole('button',{name:'返回代码任务',exact:true}).click();await fresh.locator('#main-table').waitFor();
  const missing=new URL(urls.connection);missing.searchParams.set('id','removed-resource');
  await fresh.goto(missing.href);await fresh.getByText('资源不存在或已移除。',{exact:true}).waitFor();
  await fresh.getByRole('button',{name:'返回数据连接',exact:true}).click();await fresh.locator('#main-table').waitFor();
  const readonly=new URL(urls.code);readonly.searchParams.set('as','chen');
  await fresh.goto(readonly.href);await fresh.locator('#resource-detail-body').waitFor();
  assert(await fresh.getByRole('button',{name:'编辑配置',exact:true}).isDisabled());
  assert(await fresh.getByRole('button',{name:'运行',exact:true}).isDisabled());
  const forbidden=new URL(urls.connection);forbidden.searchParams.set('as','zhou');
  await fresh.goto(forbidden.href);await fresh.getByText('无权查看此资源，请联系项目负责人。',{exact:true}).waitFor();
  assert.equal(await fresh.locator('#resource-detail-body').count(),0);await fresh.close();
  console.log('PASS direct resource URL and fallback list return, missing resource and role access controls.');

  await page.goto(root+'#connections');
  await page.locator('#main-table').getByRole('link',{name:'订单业务库',exact:true}).click();
  await page.getByRole('button',{name:'编辑配置',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('连接名称',{exact:true}).fill('未保存的连接名称');
  await page.goBack();await dialog.getByRole('button',{name:'继续编辑',exact:true}).click();
  assert.equal(new URL(page.url()).searchParams.get('detail'),'connection');
  assert.equal(await dialog.getByLabel('连接名称',{exact:true}).inputValue(),'未保存的连接名称');
  await page.goBack();await dialog.getByRole('button',{name:'放弃修改',exact:true}).click();
  await dialog.waitFor({state:'hidden'});await page.locator('#main-table').waitFor();
  assert.equal(new URL(page.url()).searchParams.has('detail'),false);
  await page.goForward();await body.waitFor();assert.equal(await heading.innerText(),'订单业务库');await noModal();
  await page.goBack();await page.locator('#main-table').waitFor();
  console.log('PASS browser Back with unsaved edits: keep draft, retry/discard, then intact Forward/Back history.');

  await page.goto(urls.code);
  for(const width of [1280,1440,1920]){
   await page.setViewportSize({width,height:1000});await body.waitFor();await noModal();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.setViewportSize({width:1440,height:1000});
  await body.getByRole('tab',{name:'任务配置',exact:true}).click();
  await page.screenshot({path:'artifacts/code-detail-page.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS desktop page bounds and no browser errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
