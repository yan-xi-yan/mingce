const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/xrcy1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source=process.env.APPDASHBOARD_TEMPLATE||'C:/Users/xrcy1/Desktop/个人资料/AppDashboard-pro/AppDashboard-pro/assets';
const destination=path.resolve('appdashboard-app/assets');
const files=[['css/main.css','css/main.css'],['vendor/bootstrap/css/bootstrap.min.css','vendor/bootstrap/css/bootstrap.min.css'],['vendor/bootstrap/js/bootstrap.bundle.min.js','vendor/bootstrap/js/bootstrap.bundle.min.js'],['vendor/bootstrap-icons/bootstrap-icons.css','vendor/bootstrap-icons/bootstrap-icons.css'],['vendor/bootstrap-icons/fonts/bootstrap-icons.woff2','vendor/bootstrap-icons/fonts/bootstrap-icons.woff2'],['js/main.js','js/template-main.js']];
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
files.push(['img/profile-img.webp','img/profile-img.webp']);
for(const file of ['choices.min.js','choices.min.css'])files.push(['vendor/choices.js/'+file,'vendor/choices.js/'+file]);
for(const file of ['flatpickr.min.js','flatpickr.min.css'])files.push(['vendor/flatpickr/'+file,'vendor/flatpickr/'+file]);
for(const [a,b]of files)assert.equal(hash(path.join(source,a)),hash(path.join(destination,b)),b+' differs from the supplied template');
const layout=fs.readFileSync('appdashboard-app/assets/css/workspace.css','utf8').replace(/\/\*[\s\S]*?\*\//g,'');
for(const block of layout.matchAll(/([^{}]+)\{([^}]+)\}/g))for(const declaration of block[2].split(';').filter(x=>x.trim())){
 const property=declaration.trim().split(':')[0],modalFrame=block[1].trim().split(',').every(selector=>/^#workspace-modal\[data-editor-kind(?:="[a-z]+")?\] \.modal-dialog-scrollable$/.test(selector.trim()));
 assert(['display','grid-template-columns','gap','min-width','overflow-wrap'].includes(property)||(modalFrame&&property==='height'),'Custom visual override: '+declaration);
}
const props=['backgroundColor','color','fontFamily','fontSize','fontWeight','lineHeight','borderTopWidth','borderTopStyle','borderTopColor','borderRadius','boxShadow','paddingTop','paddingRight','paddingBottom','paddingLeft'];
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),reference=await browser.newPage({viewport:{width:1440,height:1000}});let checks=0;
  async function compare(selectors){
   // Identical business DOM, but only the untouched SOURCE template CSS in the reference.
   const html=(await page.content()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');
   await reference.setContent(html);
   await reference.addStyleTag({content:fs.readFileSync(path.join(source,'vendor/bootstrap/css/bootstrap.min.css'),'utf8')});
   await reference.addStyleTag({content:fs.readFileSync(path.join(source,'vendor/choices.js/choices.min.css'),'utf8')});
   await reference.addStyleTag({content:fs.readFileSync(path.join(source,'vendor/flatpickr/flatpickr.min.css'),'utf8')});
   await reference.addStyleTag({content:fs.readFileSync(path.join(source,'css/main.css'),'utf8')});
   // Compare resting states after template transitions, without pointer/focus differences.
   await page.mouse.move(0,0);await reference.mouse.move(0,0);
   await page.evaluate(()=>document.activeElement?.blur());
   await page.waitForTimeout(500);await reference.waitForTimeout(500);
   for(const selector of selectors){
    const styles=async p=>p.locator(selector).first().evaluate((node,props)=>Object.fromEntries(props.map(name=>[name,getComputedStyle(node)[name]])),props);
    assert.deepEqual(await styles(page),await styles(reference),'Appearance differs from source: '+selector);checks++;
   }
  }
  await page.goto('http://127.0.0.1:3004/');
  assert.equal(await page.locator('.card.widget-stat').count(),0,'Project list must not show statistic cards');
  await compare(['body','.sidebar','.header','.user-dropdown .dropdown-toggle','.user-dropdown .avatar','.user-dropdown .user-name','.sidebar-toggle','.sidebar .nav-link.active','.page-title','.card-header','.card-subtitle','.card-body','.table th','.table td','.badge-soft-success','.btn-primary','.input-group-text']);
  await compare(['.choices','.choices__inner','.choices__list--single','.choices__list--dropdown']);
  await page.goto('http://127.0.0.1:3004/?project='+encodeURIComponent('销售数据工程')+'#overview');
  await compare(['.widget-stat','.widget-stat-icon','.widget-stat-value']);
  await page.goto('http://127.0.0.1:3004/?project='+encodeURIComponent('销售数据工程')+'#connections');
  await page.getByRole('button',{name:'新建数据连接',exact:true}).click();await page.locator('.modal.show').waitFor();await page.waitForTimeout(350);
  await compare(['.modal-content','.modal-header','.modal-body','.modal-footer','.modal .form-control','.modal .form-label','.modal .alert-info','.modal .btn-primary']);
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await page.locator('.sidebar-nav').getByRole('link',{name:'采集任务',exact:true}).click();await page.getByRole('button',{name:'新建采集任务',exact:true}).click();
  await compare(['.wizard-steps','.wizard-step.active .wizard-step-icon','.wizard-step-label','.modal .form-select']);
  await page.getByRole('textbox',{name:'任务名称',exact:true}).fill('模板检查');await page.getByRole('button',{name:'下一步',exact:true}).click();
  await compare(['.form-check-input','.form-check','.form-check-label']);
  await page.getByRole('button',{name:'取消',exact:true}).click();await compare(['.modal-content','.modal-header','.modal-body','.modal-footer','.modal .btn-danger']);await page.getByRole('button',{name:'放弃修改',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.locator('.sidebar-nav').getByRole('link',{name:'数据集',exact:true}).click();await page.locator('tbody [data-action="inspect"]').first().click();await page.locator('#resource-detail-body').waitFor();
  await compare(['.nav-tabs','.nav-tabs .nav-link.active','.nav-tabs .nav-link:not(.active)','.tab-content','.tab-pane.active']);
  await page.locator('#resource-detail-actions [data-action=back-detail]').click();await page.locator('#main-table').waitFor();
  await page.locator('.sidebar-nav').getByRole('link',{name:'代码任务',exact:true}).click();await page.getByRole('button',{name:'新建代码任务',exact:true}).click();
  await page.getByLabel('代码包',{exact:true}).setInputFiles({name:'template-style.zip',mimeType:'application/zip',buffer:Buffer.from('PK-template-style')});await page.locator('.upload-file-name').waitFor();
  await compare(['.upload-dropzone','.upload-dropzone-content','.upload-browse-link','.upload-file-item','.upload-file-icon','.upload-file-info','.upload-file-name','.upload-file-size','.upload-file-remove']);
  console.log(`PASS ${files.length} original asset hashes; ${checks} computed component appearances match source CSS; business CSS contains layout declarations only.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
