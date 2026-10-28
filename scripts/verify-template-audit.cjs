const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {chooseTemplate,auditSelects}=require('./template-control-helpers.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/xrcy1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source='C:/Users/xrcy1/Desktop/个人资料/AppDashboard-pro/AppDashboard-pro';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const components={
 'forms-select.html':['data-choices','choices__inner','searchEnabled'],
 'forms-elements.html':['form-control','form-select','form-check','type="date"','type="time"','type="datetime-local"'],
 'forms-upload.html':['upload-dropzone-compact','upload-file-item','upload-file-remove'],
 'forms-wizard.html':['wizard-steps','wizard-step-icon','wizard-step-label'],
 'components-modal.html':['modal-dialog-centered','modal-header','modal-footer'],
 'components-nav-tabs.html':['nav nav-tabs','data-bs-toggle="tab"','tab-pane'],
 'users.html':['users-person'],
 'dashboard-projects.html':['projectProgressChart','taskDistributionChart','widget-stat'],
 'assets/css/main.css':['.chart-legend-item','.users-person','.card-subtitle','.empty-state']
};
for(const [file,markers]of Object.entries(components)){const html=fs.readFileSync(source+'/'+file,'utf8');for(const marker of markers)assert(html.includes(marker),file+' must supply '+marker);}
for(const file of ['vendor/apexcharts/apexcharts.min.js','img/profile-img.webp',...Array.from({length:5},(_,i)=>'img/avatars/avatar-'+(i+1)+'.webp')])assert.equal(hash(source+'/assets/'+file),hash('appdashboard-app/assets/'+file));

(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],dialogs=[];
 page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.type());await d.dismiss();});
 const root='http://127.0.0.1:3004/',project=root+'?project='+encodeURIComponent('销售数据工程');
 const modal=page.getByRole('dialog'),detail=page.locator('#resource-detail-body');
 let selects=0,tabs=0;
 async function audit(host){selects+=await auditSelects(host);assert.equal(await host.locator('.choices .choices').count(),0,'No nested plugin wrappers');}
 async function dismiss(){await modal.getByRole('button',{name:'取消',exact:true}).click();if(await modal.getByRole('button',{name:'放弃修改',exact:true}).isVisible())await modal.getByRole('button',{name:'放弃修改',exact:true}).click();await modal.waitFor({state:'hidden'});}
 async function open(route,create){await page.goto(project+'#'+route);await page.getByRole('button',{name:create,exact:true}).click();await modal.waitFor();await modal.locator('.modal-dialog').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));await audit(modal);}
 async function menu(label){
  const select=modal.locator('select').and(modal.getByLabel(label,{exact:true})),outer=select.locator('xpath=../..');
  await outer.locator('.choices__inner').click();const dropdown=outer.locator('.choices__list--dropdown');await dropdown.waitFor({state:'visible'});
  assert.equal(await dropdown.getAttribute('style'),null,'No replacement width/position CSS');
  assert(await dropdown.evaluate(el=>{const r=el.getBoundingClientRect(),b=el.closest('.modal-body').getBoundingClientRect();return r.top>=b.top-2&&r.bottom<=b.bottom+2;}),label+' must be visible immediately, above the modal footer');
  const option=dropdown.locator('[data-choice-selectable]').last();await option.scrollIntoViewIfNeeded();
  assert(await option.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),label+' menu must not be clipped');
  await page.keyboard.press('Escape');await dropdown.waitFor({state:'hidden'});assert.equal(await outer.getAttribute('aria-expanded'),'false');assert(await modal.isVisible(),'Escape closes the selector before the editor');
 }
 const pages=[['projects','创建项目'],['organization',null],['overview',null],['connections','新建数据连接'],['tasks','新建采集任务'],['datasets','新建数据集'],['flows','新建转换流程'],['code','新建代码任务'],['plans','新建调度计划'],['runs',null],['members','添加成员'],['documents',null]];
 for(const [route,create]of pages){
  await page.goto((['projects','organization'].includes(route)?root:project)+'#'+route);await page.locator('h1').waitFor();
  assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('#workspace-heading .badge').count(),0);await audit(page.locator('#workspace-content'));
  if(['organization','members'].includes(route)){
   const images=page.locator('#workspace-content .users-person img');assert(await images.count()>0);await images.evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
   assert(await images.evaluateAll(imgs=>imgs.every(img=>img.naturalWidth>0&&img.getBoundingClientRect().width<=48)));
   if(route==='members')assert.equal(await page.locator('[data-table-search]').count(),0,'Project member tables do not need search');
  }
  if(create){await page.getByRole('button',{name:create,exact:true}).click();await modal.waitFor();await audit(modal);
   assert.equal(await modal.locator('.modal-content > .modal-header').count(),1);assert.equal(await modal.locator('.modal-content > .modal-footer button[type="submit"][form="workspace-form"]').count(),1);
   for(const select of await modal.locator('select:not(:disabled):not(.flatpickr-monthDropdown-months)').all()){const label=await select.evaluate(el=>el.labels[0].textContent);await menu(label);}
   await dismiss();
  }
 }
 console.log('PASS 12 page surfaces, 8 creation forms, source avatars, original modal structure and every initial selector hit target.');

 for(const route of ['connections','tasks','flows','code','plans','members']){
  await page.goto(project+'#'+route);
  if(route==='members')await page.locator('tbody [data-action=edit]:not(:disabled)').first().click();
  else{await page.locator('#main-table tbody [data-action=inspect]').first().click();await detail.waitFor();await page.locator('#resource-detail-actions [data-action=edit]').click();}
  await modal.waitFor();await audit(modal);
  if(route==='members'){const select=modal.locator('[name=member]');assert(await select.isDisabled());assert.equal(await select.locator('xpath=../..').getAttribute('aria-disabled'),'true');}
  else assert(await modal.locator('input[name=name]').inputValue());
  await dismiss();
 }
 for(const route of ['connections','tasks','datasets','flows','code','plans','runs']){
  await page.goto(project+'#'+route);await page.locator('#main-table tbody [data-action=inspect]').first().click();await detail.waitFor();assert.equal(await page.locator('.modal.show').count(),0);
  for(const tab of await detail.getByRole('tab').all()){await tab.click();assert.equal(await tab.getAttribute('data-bs-toggle'),'tab');assert.equal(await tab.getAttribute('aria-selected'),'true');await audit(detail);tabs++;}
  await page.locator('#resource-detail-actions [data-action=back-detail]').click();await page.locator('#main-table').waitFor();
 }
 console.log('PASS 6 edit forms and 7 independent detail pages; '+tabs+' detail tabs and return paths.');

 await open('tasks','新建采集任务');await modal.locator('[name=name]').fill('模板采集检查');await modal.getByRole('button',{name:'下一步',exact:true}).click();
 await modal.getByLabel('orders',{exact:true}).check();await modal.getByRole('button',{name:'下一步',exact:true}).click();
 for(const value of ['incremental','continuous','full']){await chooseTemplate(modal,'采集方式',value);await audit(modal);await menu('采集方式');}
 await modal.getByRole('button',{name:'下一步',exact:true}).click();assert.equal(await modal.locator('.wizard-step.completed').count(),3);await dismiss();

 await open('datasets','新建数据集');await chooseTemplate(modal,'创建方式','csv');await modal.getByLabel('CSV 文件',{exact:true}).setInputFiles({name:'fields.csv',mimeType:'text/csv',buffer:Buffer.from('id,name\n1,Alice')});await modal.locator('#import-fields').waitFor();await audit(modal);
 await menu('字段类型 2');await chooseTemplate(modal,'字段类型 1','BIGINT');await chooseTemplate(modal,'首行含义','data');await audit(modal);await chooseTemplate(modal,'首行含义','header');await page.screenshot({path:'artifacts/template-audit-csv.png',fullPage:true});await dismiss();

 await open('code','新建代码任务');
 const footerSelect=modal.locator('select[name="codeout.0.mode"]').locator('xpath=../..');
 const point=await footerSelect.evaluate(outer=>{outer.focus({preventScroll:true});const body=outer.closest('.modal-body');body.scrollTop+=outer.getBoundingClientRect().bottom-body.getBoundingClientRect().bottom+8;const r=outer.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
 await page.mouse.click(point.x,point.y);await footerSelect.locator('.choices__list--dropdown').waitFor({state:'visible'});
 assert(await footerSelect.evaluate(el=>el.classList.contains('is-flipped')),'Use original upward menu at the modal footer');
 assert(await footerSelect.evaluate(el=>{const r=el.querySelector('.choices__list--dropdown').getBoundingClientRect(),b=el.closest('.modal-body').getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom;}));
 await page.screenshot({path:'artifacts/template-audit-code-select.png'});await page.keyboard.press('Escape');await footerSelect.locator('.choices__list--dropdown').waitFor({state:'hidden'});
 await chooseTemplate(modal,'输出方式 1','existing');await audit(modal);await menu('输出数据集 1');await chooseTemplate(modal,'输出方式 1','new');
 await modal.getByRole('button',{name:'添加输出',exact:true}).click();await chooseTemplate(modal,'输出方式 2','existing');await menu('输出方式 2');await menu('输出数据集 2');await audit(modal);
 await modal.getByRole('button',{name:'取消',exact:true}).click();await modal.getByRole('button',{name:'继续编辑',exact:true}).click();await menu('输出方式 2');await dismiss();

 await open('plans','新建调度计划');
 for(const value of ['second','minute','hour','day','week','month','year','once']){await chooseTemplate(modal,'时间规则',value);await audit(modal);await menu('时间规则');}
 await chooseTemplate(modal,'时间规则','month');await chooseTemplate(modal,'月内规则','week');await chooseTemplate(modal,'周序','last');await chooseTemplate(modal,'星期','5');await audit(modal);
 await chooseTemplate(modal,'执行任务',{label:'渠道指标计算'});await modal.getByRole('radio',{name:'上游更新触发',exact:true}).check();await chooseTemplate(modal,'组合规则','all');await audit(modal);await dismiss();
 console.log('PASS dynamic wizard, CSV field types, multi-output bindings, discard/resume and all schedule rule branches; template menus are clickable and not clipped.');

 await page.goto(project+'#members');
 for(const tab of await page.getByRole('tab').all()){await tab.click();assert.equal(await tab.getAttribute('aria-selected'),'true');}
 await page.locator('#access-tab-preview').click();await chooseTemplate(page.locator('#workspace-content'),'预览成员','chen');assert.match(await page.locator('#permission-preview').innerText(),/陈杰/);
 await page.locator('#access-tab-members').click();await page.locator('[data-action=preview-member][data-id=wang]').click();assert.equal(await page.locator('#permission-member').inputValue(),'wang');assert.match(await page.locator('#permission-member').locator('xpath=../..').locator('.choices__list--single').innerText(),/王琳/);
 await page.locator('#access-tab-members').click();const remove=page.locator('[data-action=remove-member][data-id=chen]');
 await remove.click();await modal.waitFor();await modal.getByRole('button',{name:'取消',exact:true}).click();await modal.waitFor({state:'hidden'});assert(await remove.isVisible());
 await remove.click();await modal.waitFor();await page.waitForFunction(()=>getComputedStyle(document.querySelector('#workspace-modal')).opacity==='1');await page.screenshot({path:'artifacts/template-audit-confirmation.png',fullPage:true});await modal.getByRole('button',{name:'确认移除',exact:true}).click();await modal.waitFor({state:'hidden'});assert.equal(await remove.count(),0);
 console.log('PASS member tabs, preview value synchronization, original confirmation cancel/confirm, no browser dialogs.');

 for(const width of [1280,1440,1920,2560]){
  await page.setViewportSize({width,height:1000});await open('connections','新建数据连接');await menu('数据库类型');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await dismiss();
  await open('code','新建代码任务');await chooseTemplate(modal,'输出方式 1','existing');await menu('输出数据集 1');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await dismiss();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);console.log(`PASS ${selects} initialized-select observations, original component sources/assets, 4 desktop widths; no page errors.`);
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exit(1);});
