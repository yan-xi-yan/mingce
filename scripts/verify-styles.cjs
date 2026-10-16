const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const files=fs.readdirSync('.').filter(f=>f.endsWith('.html'));
 for(const skin of ['graphite','azure','minimal']){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(v=>sessionStorage.setItem('mingce.ui.variant',v),skin);
  const goto=f=>page.goto('http://127.0.0.1:8000/'+encodeURI(f));
  for(const file of files){await goto(file);if(await page.locator('body.mc-app').count())assert.equal(await page.locator('body').getAttribute('data-mc-variant'),skin);assert(!/草稿/.test(await page.locator('body').innerText()),file);}
  await goto('项目概览.html');
  const nav=page.getByRole('navigation',{name:'项目工作区导航'});
  for(const label of ['项目总览','数据连接','采集任务','数据集','转换流程','代码任务','调度计划','说明文档'])assert.equal(await nav.getByRole('link',{name:label,exact:true}).count(),1,'All styles retain the approved navigation');
  assert.equal(await nav.getByRole('link',{name:/权限|授权/}).count(),0);
  await page.getByRole('searchbox',{name:'搜索资源类型'}).fill('代码');assert.equal(await page.locator('[data-resource]:visible').count(),1);
  await page.getByRole('searchbox',{name:'搜索资源类型'}).fill('');
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),skin+' mobile width');await page.screenshot({path:'artifacts/ux/'+skin+'-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await goto('项目成员与权限.html');
  await page.getByRole('button',{name:'＋ 添加成员',exact:true}).click();assert(await page.locator('#permission-dialog').isVisible());await page.getByRole('button',{name:'取消',exact:true}).click();
  await page.screenshot({path:'artifacts/ux/'+skin+'-permissions.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS '+skin+': all pages, unchanged navigation, search, permission dialog, mobile layout');await context.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
