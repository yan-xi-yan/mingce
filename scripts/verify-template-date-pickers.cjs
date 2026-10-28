const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {chooseTemplate}=require('./template-control-helpers.cjs');
const {chromium}=require('C:/Users/xrcy1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source='C:/Users/xrcy1/Desktop/个人资料/AppDashboard-pro/AppDashboard-pro/assets/';
for(const file of ['flatpickr.min.js','flatpickr.min.css']){const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');assert.equal(hash(source+'vendor/flatpickr/'+file),hash('appdashboard-app/assets/vendor/flatpickr/'+file));}
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
 const root='http://127.0.0.1:3004/?project='+encodeURIComponent('销售数据工程'),modal=page.getByRole('dialog'),panel=page.locator('.flatpickr-calendar.open');
 const dismiss=async()=>{await modal.getByRole('button',{name:'取消',exact:true}).click();if(await modal.getByRole('button',{name:'放弃修改',exact:true}).isVisible())await modal.getByRole('button',{name:'放弃修改',exact:true}).click();await modal.waitFor({state:'hidden'});};
 await page.goto(root+'#plans');await page.getByRole('button',{name:'新建调度计划',exact:true}).click();await chooseTemplate(modal,'执行任务',{label:'渠道指标计算'});await modal.getByLabel('计划名称',{exact:true}).fill('分钟选择验证');
 await chooseTemplate(modal,'时间规则','once');const once=modal.locator('[name="rule.once"]');
 await once.fill('2030-10-23 09:17');await once.press('Tab');await once.click();await panel.waitFor();
 assert.equal(await once.evaluate(el=>el._flatpickr.config.enableSeconds),false);assert.equal(await panel.locator('.flatpickr-second').count(),0);
 assert.equal(await panel.locator('.flatpickr-hour').getAttribute('aria-label'),'小时');
 await panel.locator('.flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)').filter({hasText:/^24$/}).click();
 await panel.locator('.flatpickr-hour').fill('09');await panel.locator('.flatpickr-hour').press('ArrowUp');await panel.locator('.flatpickr-minute').fill('24');await panel.locator('.flatpickr-minute').press('ArrowUp');await modal.locator('.modal-title').click();
 await page.waitForFunction(()=>document.querySelector('[name="rule.once"]').value==='2030-10-24 10:25');
 await page.waitForFunction(()=>document.querySelector('#schedule-preview').textContent.includes('2030-10-24 10:25'));
 await once.click();await panel.waitFor();await panel.locator('.flatpickr-minute').focus();await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});assert(await modal.isVisible());
 await once.fill('2030-02-30 10:25');await once.press('Tab');assert.equal(await once.inputValue(),'2030-02-30 10:25');assert.equal(await once.evaluate(el=>el.validity.valid),false);
 await once.fill('2030-10-24 10:25:12');await once.press('Tab');assert.equal(await once.evaluate(el=>el.validity.valid),false,'Manual seconds are not accepted');
 await once.fill('2030-10-24 10:25');await once.press('Tab');await once.click();await panel.waitFor();
 await page.screenshot({path:'artifacts/template-minute-picker.png'});
 // Same generated panel, styled only by the untouched source assets.
 const reference=await browser.newPage();await reference.setContent((await page.content()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,''));
 for(const file of ['vendor/bootstrap/css/bootstrap.min.css','vendor/flatpickr/flatpickr.min.css','css/main.css'])await reference.addStyleTag({content:fs.readFileSync(source+file,'utf8')});
 const props=['backgroundColor','color','fontSize','borderRadius','boxShadow','paddingTop','paddingLeft'];
 await page.mouse.move(0,0);await page.waitForTimeout(350);await reference.waitForTimeout(350);
 for(const selector of ['.flatpickr-calendar.open','.flatpickr-calendar.open .flatpickr-months','.flatpickr-calendar.open .flatpickr-weekdays','.flatpickr-calendar.open .flatpickr-day.selected','.flatpickr-calendar.open .flatpickr-time']){
  const styles=p=>p.locator(selector).first().evaluate((el,props)=>Object.fromEntries(props.map(k=>[k,getComputedStyle(el)[k]])),props);assert.deepEqual(await styles(page),await styles(reference),selector+' matches source CSS');
 }await reference.close();await page.keyboard.press('Escape');
 await modal.getByRole('button',{name:'创建停用计划',exact:true}).click();await modal.waitFor({state:'hidden'});
 const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('mingce.appdashboard.plans.v1.销售数据工程')).find(x=>x.name==='分钟选择验证'));assert.equal(stored.rule.once,'2030-10-24T10:25');
 await page.locator('#workspace-message').getByRole('button',{name:'查看详情',exact:true}).click();await page.locator('#resource-detail-actions [data-action=edit]').click();assert.equal(await modal.locator('[name="rule.once"]').inputValue(),'2030-10-24 10:25');
 await chooseTemplate(modal,'时间规则','day');await modal.getByRole('button',{name:'添加时间',exact:true}).click();
 const times=modal.locator('[name=scheduleTime]');await times.nth(0).fill('08:15');await times.nth(0).press('Tab');await times.nth(1).fill('17:45');await times.nth(1).press('Tab');
 await modal.getByRole('button',{name:'保存配置',exact:true}).click();await modal.waitFor({state:'hidden'});await page.locator('#resource-detail-actions [data-action=edit]').click();
 await modal.locator('[name=scheduleTime]').first().waitFor();assert.deepEqual(await modal.locator('[name=scheduleTime]').evaluateAll(nodes=>nodes.map(n=>n.value)),['08:15','17:45']);
 await modal.getByRole('button',{name:'移除执行时间 2',exact:true}).click();assert.equal(await times.count(),1);await dismiss();await page.waitForFunction(()=>document.querySelector('#workspace-modal-body').childElementCount===0);assert.equal(await page.locator('.flatpickr-calendar').count(),0);
 console.log('PASS original asset hashes and 5 panel style comparisons; calendar/time selection, minute-only UI/storage, invalid dates/seconds, Escape, save/edit, multiple execution times and disposal.');
 await page.goto(root+'#runs');const from=page.locator('#filter-from'),to=page.locator('#filter-to');
 await from.fill('2026-10-01');await from.press('Tab');await to.fill('2026-10-31');await to.press('Tab');await page.getByRole('button',{name:'查询',exact:true}).click();assert.equal(await from.inputValue(),'2026-10-01');
 await from.click();await panel.waitFor();assert.equal(await panel.locator('.flatpickr-time').count(),0);await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'重置',exact:true}).click();assert.equal(await from.inputValue(),'');assert.equal(await from.evaluate(el=>el._flatpickr.selectedDates.length),0);
 await page.goto(root+'#tasks');await page.locator('#main-table tbody [data-action=inspect]').first().click();await page.getByRole('tab',{name:'运行记录',exact:true}).click();
 await page.locator('#run-from').fill('2026-10-01');await page.locator('#run-from').press('Tab');await page.locator('[data-action=reset-run-filters]').click();assert.equal(await page.locator('#run-from').evaluate(el=>el._flatpickr.selectedDates.length),0);
 for(const viewport of [{width:1280,height:720},{width:1920,height:1080}]){
  await page.setViewportSize(viewport);await page.goto(root+'#plans');await page.getByRole('button',{name:'新建调度计划',exact:true}).click();await modal.locator('[name="rule.end"]').click();await panel.waitFor();
  assert(await panel.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;}),'Picker inside desktop viewport');
  assert(await panel.locator('.flatpickr-minute').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'Time input not clipped by the modal footer');
  await page.keyboard.press('Escape');await dismiss();
 }
 assert.deepEqual(errors,[]);console.log('PASS list/detail date filters and reset; desktop popup bounds and footer hit targets; no runtime errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
