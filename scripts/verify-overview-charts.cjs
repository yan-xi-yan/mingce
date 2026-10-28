const assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto');
const {chromium}=require('C:/Users/xrcy1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const file='assets/vendor/apexcharts/apexcharts.min.js',hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');assert.equal(hash('appdashboard-app/'+file),hash('C:/Users/xrcy1/Desktop/个人资料/AppDashboard-pro/AppDashboard-pro/'+file));
const browser=await chromium.launch({channel:'msedge',headless:true});try{
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:3004/?project='+encodeURIComponent('供应链分析')+'#overview');
assert.equal(await page.locator('.empty-state-text').filter({hasText:'近 7 天暂无运行记录'}).count(),2);
assert.equal(await page.locator('.apexcharts-canvas').count(),0);
const test=await page.evaluate(async()=>{
const {overviewStats}=await import('/assets/js/overview-data.js');const now=Date.parse('2026-10-21T12:00:00+08:00');
const rows=[{start:'2026-10-14T16:00:00Z',status:'SUCCESS'},{start:'2026-10-14T15:59:59Z',status:'FAILED'},{start:'2026-10-21T00:00:00+08:00',status:'PARTIAL_FAILED'},{start:'2026-10-21T13:00:00+08:00',status:'SUCCEEDED'},{start:'invalid',status:'FAILED'}];const result=overviewStats([...rows,{start:now-1000,status:'SUCCEEDED'}],now);return result;
});assert.equal(test.total,3);assert.equal(test.days[0].counts.success,1);assert.equal(test.groups.find(g=>g.key==='failed').count,1);
await page.evaluate(()=>{const now=Date.now();const rows=Array.from({length:21},(_,i)=>({id:'overview-check-'+i,name:'运行验收任务',taskId:'test',type:'code',status:i%3===0?'FAILED':i%3===1?'SUCCEEDED':'STOPPED',start:new Date(now-Math.floor(i/3)*86400000-1000).toISOString(),outputs:[]}));sessionStorage.setItem('mingce.appdashboard.executions.v1.供应链分析',JSON.stringify(rows));});
await page.reload();await page.locator('#projectProgressChart .apexcharts-canvas').waitFor();await page.locator('#taskDistributionChart .apexcharts-canvas').waitFor();
assert.deepEqual(await page.locator('.legend-value').allTextContents(),['7','7','0','7','0']);
assert.equal(await page.locator('.widget-stat-value').nth(2).innerText(),'7');
assert.equal(await page.locator('#main-table tbody tr').count(),5);
assert.equal(await page.locator('.mc-overview-grid').count(),0);
assert.equal(await page.locator('.chart-legend-color').first().evaluate(el=>getComputedStyle(el).width),'12px');
await page.screenshot({path:'artifacts/overview-template-charts.png',fullPage:true});
await page.locator('.sidebar-nav').getByRole('link',{name:'运行记录',exact:true}).click();assert.equal(await page.locator('.apexcharts-canvas').count(),0);
await page.locator('.sidebar-nav').getByRole('link',{name:'项目概览',exact:true}).click();await page.locator('#projectProgressChart .apexcharts-canvas').waitFor();assert.equal(await page.locator('.apexcharts-canvas').count(),2);
await page.reload();await page.locator('#projectProgressChart .apexcharts-canvas').waitFor();assert.deepEqual(await page.locator('.legend-value').allTextContents(),['7','7','0','7','0']);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
console.log('PASS original ApexCharts hash; Shanghai day boundaries; future/invalid dates excluded; empty state; real record counts; recent rows; chart cleanup, navigation and reload.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
