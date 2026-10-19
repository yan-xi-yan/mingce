/* Presentation composition only: move existing heading nodes, never clone controls. */
(()=>{
'use strict';
const d=document,b=d.body;if(b.dataset.mcVariant!=='studio')return;
const main=d.querySelector('main'),content=main?.querySelector('.content');if(!main)return;
const category=b.dataset.category;
if(content&&b.dataset.list==='1'){
 const heading=content.querySelector('.section-title'),description=content.querySelector('.mc-page-description');
 if(heading){const block=d.createElement('section');block.className='studio-list-heading';const text=d.createElement('div');const eyebrow=d.createElement('div');eyebrow.className='studio-eyebrow';eyebrow.textContent='项目工作区 / '+(category||'资源');text.append(eyebrow);const title=heading.querySelector('h2');if(title)text.append(title);if(description)text.append(description);block.append(text);[...heading.children].forEach(node=>{if(node.matches('a,button,details'))block.append(node);});heading.remove();main.querySelector('.workspace').before(block);}
 const table=content.querySelector('table');if(table){const meta=d.createElement('div');meta.className='studio-table-meta';meta.setAttribute('role','status');table.before(meta);const update=()=>{const rows=[...table.querySelectorAll('tbody tr')].filter(r=>!r.classList.contains('empty-result-row')),visible=rows.filter(r=>!r.hidden);meta.replaceChildren();const label=d.createElement('span');label.textContent='当前列表';const count=d.createElement('strong');count.textContent=String(visible.length);const unit=d.createElement('span');unit.textContent='项'+(visible.length!==rows.length?' / 共 '+rows.length+' 项':'');meta.append(label,count,unit);};update();new MutationObserver(update).observe(table,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});}
}else{const heading=main.querySelector('.mc-project-heading>div,.resource-header>div,.mc-access-heading');if(heading){const eyebrow=d.createElement('div');eyebrow.className='studio-eyebrow';eyebrow.textContent=b.classList.contains('mc-access')?'访问管理 / 授权工作区':category?'项目工作区 / '+category:'项目工作区';heading.prepend(eyebrow);}}
})();
