/* Visual skins only. Navigation, forms, permissions and lifecycle behavior are shared. */
(() => {
'use strict';
const d=document,b=d.body,query=new URLSearchParams(location.search);
const choices={baseline:'当前版',studio:'D · 数据工作室',graphite:'A · 石墨深色',azure:'B · 钴蓝企业',minimal:'C · 极简浅色'};
let view=query.get('view');
try{if(!Object.hasOwn(choices,view))view=sessionStorage.getItem('mingce.ui.variant');}catch{}
if(!Object.hasOwn(choices,view))view='baseline';
try{sessionStorage.setItem('mingce.ui.variant',view);}catch{}
if(!b.classList.contains('mc-app'))return;
b.dataset.mcVariant=view;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const selector=d.createElement('details');selector.className='variant-selector';
selector.innerHTML=`<summary>${choices[view]}<span>⌄</span></summary><div class="mc-dropdown">${Object.entries(choices).map(([key,label])=>{const q=new URLSearchParams(query);q.set('view',key);return `<a href="${esc((b.dataset.page||decodeURIComponent(location.pathname.split('/').pop()))+'?'+q+location.hash)}" ${key===view?'aria-current="page"':''}>${label}${key===view?'<span>✓</span>':''}</a>`;}).join('')}<a class="variant-compare-link" href="方案对比.html">查看风格对比 →</a></div>`;
d.querySelector('.mc-top-right')?.prepend(selector);
function decorateLink(a){const href=a.getAttribute('href');if(!href||/^(https?:|mailto:|#|blob:|data:)/.test(href))return;try{const u=new URL(href,location.href);if(!u.pathname.endsWith('.html')||u.pathname.endsWith('/方案对比.html'))return;if(!a.closest('.variant-selector'))u.searchParams.set('view',view);a.setAttribute('href',decodeURIComponent(u.pathname.split('/').pop())+u.search+u.hash);}catch{}}
d.querySelectorAll('a[href]').forEach(decorateLink);
d.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(a)decorateLink(a);if(!selector.contains(e.target))selector.open=false;});
d.addEventListener('keydown',e=>{if(e.key==='Escape'&&selector.open){selector.open=false;selector.querySelector('summary').focus();}});
})();
