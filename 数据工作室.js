/* Presentation composition only: move existing heading nodes, never clone controls. */
(()=>{
'use strict';
const d=document,b=d.body;if(b.dataset.mcVariant!=='studio')return;
const main=d.querySelector('main'),content=main?.querySelector('.content');if(!main)return;
const category=b.dataset.category;
// List modules update .content .total during filtering. Retain that node in its
// original module scope when the visual heading is composed outside the table.
const moduleTotal=content?.querySelector('.section-title .total');
if(moduleTotal){moduleTotal.remove();content.prepend(moduleTotal);moduleTotal.hidden=true;}
// Some legacy connection pages put h1 beside a redundant breadcrumb.
// Normalize only the title nodes; keep every existing control and handler.
main.querySelectorAll('.resource-header').forEach(header=>{const title=[...header.children].find(n=>n.tagName==='H1');if(!title)return;header.querySelector(':scope > .breadcrumb')?.remove();const group=d.createElement('div');group.className='studio-resource-title';header.prepend(group);group.append(title);});
if(content&&b.dataset.list==='1'){
 const heading=content.querySelector('.section-title'),description=content.querySelector('.mc-page-description');
 if(heading){const block=d.createElement('section');block.className='studio-list-heading';const text=d.createElement('div');const eyebrow=d.createElement('div');eyebrow.className='studio-eyebrow';eyebrow.textContent='项目工作区 / '+(category||'资源');text.append(eyebrow);const title=heading.querySelector('h2');if(title)text.append(title);if(description)text.append(description);block.append(text);[...heading.children].forEach(node=>{if(node.matches('a,button,details'))block.append(node);});heading.remove();main.querySelector('.workspace').before(block);}
 const table=content.querySelector('table');if(table){const meta=d.createElement('div');meta.className='studio-table-meta';meta.setAttribute('role','status');table.before(meta);const update=()=>{const rows=[...table.querySelectorAll('tbody tr')].filter(r=>!r.classList.contains('empty-result-row')),visible=rows.filter(r=>!r.hidden);meta.replaceChildren();const label=d.createElement('span');label.textContent='当前列表';const count=d.createElement('strong');count.textContent=String(visible.length);const unit=d.createElement('span');unit.textContent='项'+(visible.length!==rows.length?' / 共 '+rows.length+' 项':'');meta.append(label,count,unit);};update();new MutationObserver(update).observe(table,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});}
}else{const heading=main.querySelector('.mc-project-heading>div,.resource-header>div,.mc-access-heading');if(heading){const eyebrow=d.createElement('div');eyebrow.className='studio-eyebrow';eyebrow.textContent=b.classList.contains('mc-access')?'访问管理 / 授权工作区':category?'项目工作区 / '+category:'项目工作区';heading.prepend(eyebrow);}}
// Make visual titles programmatically discoverable without replacing label nodes.
main.querySelectorAll('.field,.grid>div,.two-fields>div').forEach(field=>{const input=field.querySelector('input:not([type="checkbox"]):not([type="radio"]),textarea,select'),label=field.querySelector('label');if(input&&label&&input.id&&!label.htmlFor)label.htmlFor=input.id;});
// Existing template/upload panels are custom dialogs, not native dialog elements.
const panel=[...d.querySelectorAll('.modal,.drawer')].find(n=>n.querySelector('.modalhead'));
if(panel&&!panel.hidden){panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');const title=panel.querySelector('.modalhead');if(title){if(!title.id)title.id='studio-dialog-title';panel.setAttribute('aria-labelledby',title.id);}panel.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const controls=[...panel.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(n=>!n.disabled&&n.getAttribute('aria-disabled')!=='true'&&n.offsetParent!==null),first=controls[0],last=controls.at(-1);if(e.shiftKey&&d.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&d.activeElement===last){e.preventDefault();first?.focus();}});panel.querySelector('button,input,a[href]')?.focus();}
})();
