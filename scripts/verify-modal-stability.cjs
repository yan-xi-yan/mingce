const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/xrcy1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {chooseTemplate}=require('./template-control-helpers.cjs');

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],dialogs=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('dialog',async dialog=>{dialogs.push(dialog.type());await dialog.dismiss();});
  const root='http://127.0.0.1:3004/',project=root+'?project='+encodeURIComponent('销售数据工程'),modal=page.locator('#workspace-modal'),body=modal.locator('#workspace-modal-body');
  const button=name=>modal.getByRole('button',{name,exact:true});let comparisons=0;
  async function frame(){return modal.evaluate(el=>{
   const rect=node=>{const r=node.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};
   return {content:rect(el.querySelector('.modal-content')),header:rect(el.querySelector('.modal-header')),footer:rect(el.querySelector('.modal-footer')),pageY:window.scrollY};
  });}
  async function stable(before,label){
   const after=await frame();for(const part of ['content','header','footer'])after[part].forEach((value,i)=>assert(Math.abs(value-before[part][i])<1,label+' moved '+part+' ['+i+']: '+JSON.stringify({before,after})));
   assert.equal(after.pageY,before.pageY,label+' moved the underlying page');comparisons++;
   assert(await modal.evaluate(el=>{const c=el.querySelector('.modal-content').getBoundingClientRect(),f=el.querySelector('.modal-footer').getBoundingClientRect();return c.top>=0&&c.bottom<=innerHeight&&f.bottom<=innerHeight;}),label+' footer outside viewport');
  }
  async function open(route,label){
   await page.goto((route==='projects'?root:project)+'#'+route);await page.getByRole('button',{name:label,exact:true}).click();await modal.locator('.modal-content').waitFor();
   await modal.locator('.modal-dialog').evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));
   assert.equal(await modal.locator('.modal-dialog-centered').count(),0);assert.equal(await modal.locator('.modal-dialog-scrollable .modal-content.h-100').count(),1);return frame();
  }
  async function dismiss(){await button('取消').click();if(await button('放弃修改').isVisible())await button('放弃修改').click();await modal.waitFor({state:'hidden'});}

  for(const [route,label,kind]of [['projects','创建项目','project'],['connections','新建数据连接','connection'],['tasks','新建采集任务','task'],['datasets','新建数据集','dataset'],['code','新建代码任务','code'],['flows','新建转换流程','flow'],['plans','新建调度计划','plan'],['members','添加成员','member']]){
   const before=await open(route,label);assert.equal(await modal.getAttribute('data-editor-kind'),kind);
   const name=modal.locator('[name=name]');if(await name.count())await name.fill('弹窗稳定性检查');
   const textarea=modal.locator('textarea').first();if(await textarea.count()){
    // User resizing a native template textarea must also stay within the form frame.
    await textarea.evaluate(el=>{el.style.height='600px';});await stable(before,kind+' expanded textarea');
   }
   if(kind==='member')await chooseTemplate(modal,'组织成员','chen');
   await stable(before,kind+' input');
   await button('取消').click();if(await button('继续编辑').isVisible()){
    await stable(before,kind+' discard prompt');await button('继续编辑').click();await stable(before,kind+' return to editor');await dismiss();
   }else await modal.waitFor({state:'hidden'});
  }
  console.log('PASS all 8 editor frames, expanded native textareas, discard prompt and resume positions.');

  let before=await open('connections','新建数据连接');await button('测试连接（演示）').click();await modal.locator('#form-error .alert').waitFor();await stable(before,'connection validation');
  for(const type of ['PostgreSQL','SQL Server','MySQL']){await chooseTemplate(modal,'数据库类型',{label:type});await stable(before,'connection type '+type);}await dismiss();

  before=await open('tasks','新建采集任务');await modal.locator('[name=name]').fill('稳定采集');await button('下一步').click();await stable(before,'collection table step');
  await modal.locator('[data-source-view=orders]').click();await modal.locator('[data-source-view=customers]').click();await stable(before,'collection source selections');
  await button('下一步').click();await stable(before,'collection rules step');
  for(const mode of ['incremental','continuous','full']){await chooseTemplate(modal,'采集方式',mode);await stable(before,'collection mode '+mode);}
  await button('下一步').click();await stable(before,'collection outputs step');await button('上一步').click();await stable(before,'collection back');await dismiss();

  before=await open('datasets','新建数据集');await chooseTemplate(modal,'创建方式','csv');await stable(before,'CSV mode');
  await modal.getByLabel('CSV 文件',{exact:true}).setInputFiles({name:'stability.csv',mimeType:'text/csv',buffer:Buffer.from('id,name,total\n1,Alice,99\n2,Bob,38')});await modal.locator('#import-fields').waitFor();await stable(before,'CSV upload preview');
  await chooseTemplate(modal,'首行含义','data');await stable(before,'CSV header change');await modal.locator('[data-form-action=remove-file]').click();await stable(before,'CSV removal');await dismiss();

  before=await open('code','新建代码任务');await modal.locator('[name=name]').fill('稳定代码任务');
  for(let i=0;i<3;i++){await button('添加输出').click();await stable(before,'code add output '+i);}
  await chooseTemplate(modal,'输出方式 2','existing');await stable(before,'code output mode');
  await modal.locator('[data-form-action=remove-code-output]').last().click();await stable(before,'code remove output');
  await modal.locator('[name=codeFile]').setInputFiles({name:'stability.zip',mimeType:'application/zip',buffer:Buffer.from('PK\x05\x06'+'\x00'.repeat(18),'binary')});await modal.locator('.upload-file-name').waitFor();await stable(before,'ZIP file list');
  const description=modal.locator('[name=description]');await description.fill('保留滚动位置与文件');await description.focus();
  const scroll=await body.evaluate(el=>el.scrollTop);assert(scroll>0,'Long form must scroll inside its body');
  await page.keyboard.press('Escape');await button('继续编辑').waitFor();await stable(before,'scrolled discard');await button('继续编辑').click();await stable(before,'scrolled resume');
  assert.equal(await body.evaluate(el=>el.scrollTop),scroll,'Restore the exact body scroll offset');assert(await description.evaluate(el=>el===document.activeElement),'Restore focus without scrolling');
  assert.equal(await modal.locator('[name=codeFile]').evaluate(el=>el.files[0].name),'stability.zip');
  await page.screenshot({path:'artifacts/modal-stable-code.png'});await dismiss();

  before=await open('plans','新建调度计划');
  for(const rule of ['second','minute','hour','day','week','month','year','once']){await chooseTemplate(modal,'时间规则',rule);await stable(before,'schedule '+rule);}
  await chooseTemplate(modal,'时间规则','month');await chooseTemplate(modal,'月内规则','week');await stable(before,'schedule week of month');
  await chooseTemplate(modal,'执行任务',{label:'渠道指标计算'});await modal.getByRole('radio',{name:'上游更新触发',exact:true}).check();await stable(before,'schedule upstream mode');
  await chooseTemplate(modal,'组合规则','all');await stable(before,'schedule upstream condition');await modal.getByRole('radio',{name:'定时触发',exact:true}).check();await stable(before,'schedule return to timed');await dismiss();
  console.log('PASS validation, collection steps/rules, CSV upload/removal, code outputs/ZIP and schedule branches; scrolled form focus and file preserved.');

  // Standalone confirmations stay compact, with no sizing leaked from the prior editor.
  await page.goto(project+'#members');await page.locator('[data-action=remove-member][data-id=chen]').click();await modal.waitFor({state:'visible'});
  assert.equal(await modal.getAttribute('data-editor-kind'),null);assert.equal(await modal.locator('.modal-dialog-centered').count(),1);assert((await frame()).content[3]<400);
  await modal.evaluate(el=>{
   window.confirmationClosingFrames=[];
   el.addEventListener('hide.bs.modal',()=>{
    const sample=()=>{if(getComputedStyle(el).display==='none')return;const r=el.querySelector('.modal-content').getBoundingClientRect();window.confirmationClosingFrames.push({width:r.width,height:r.height,title:el.querySelector('.modal-title').textContent});requestAnimationFrame(sample);};requestAnimationFrame(sample);
   },{once:true});
  });
  const confirmation=await frame();await button('取消').click();await modal.waitFor({state:'hidden'});
  const closing=await page.evaluate(()=>window.confirmationClosingFrames);assert(closing.length>0);assert(closing.every(f=>Math.abs(f.width-confirmation.content[2])<1&&Math.abs(f.height-confirmation.content[3])<1&&f.title==='移除成员？'),'Closing confirmation must not flash the prior editor');
  await page.locator('[data-action=remove-member][data-id=chen]').click();await button('确认移除').click();await modal.waitFor({state:'hidden'});assert.equal(await page.locator('[data-action=remove-member][data-id=chen]').count(),0);
  for(const viewport of [{width:1280,height:720},{width:1440,height:900},{width:1920,height:1080}]){
   await page.setViewportSize(viewport);before=await open('tasks','新建采集任务');await modal.locator('[name=name]').fill('尺寸检查');await button('下一步').click();await stable(before,'viewport '+viewport.height+' table step');
   await page.screenshot({path:'artifacts/modal-stable-'+viewport.height+'.png'});await dismiss();
  }
  // Resize an already open editor, then keep that new frame stable on structural changes.
  await open('code','新建代码任务');await page.setViewportSize({width:1280,height:720});before=await frame();await button('添加输出').click();await stable(before,'resized open editor');await dismiss();
  assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);console.log('PASS '+comparisons+' frame comparisons; compact standalone confirmation, three desktop heights, live resize; no runtime errors or native dialogs.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
