// Source: AppDashboard Pro / forms-select.html, DOMContentLoaded initialization.
// The original Choices.js vendor creates all component markup. Its JS and CSS are unchanged.
// Only labels, search settings and lifecycle are adapted for these dynamic business pages.
const instances=new Map();
const formKey=select=>select.form?.dataset.resourceFilters||select.form?.id||select.id;

function templateConfig(el){
 return {
  removeItemButton:el.dataset.choicesRemoveitem==='true',
  searchEnabled:el.dataset.choicesSearch==='true',
  shouldSort:el.dataset.choicesSort!=='false',
  placeholderValue:el.dataset.choicesPlaceholder||null,
  maxItemCount:el.dataset.choicesMaxitems?parseInt(el.dataset.choicesMaxitems):-1,
  duplicateItemsAllowed:el.dataset.choicesUnique!=='true',
  editItems:el.dataset.choicesText==='true',
  addItems:el.dataset.choicesText==='true',
  searchPlaceholderValue:'搜索选项…',
  itemSelectText:'',
  classNames:{
   containerOuter:'choices',containerInner:'choices__inner',input:'choices__input',
   inputCloned:'choices__input--cloned',list:'choices__list',listItems:'choices__list--multiple',
   listSingle:'choices__list--single',listDropdown:'choices__list--dropdown',
   item:'choices__item',itemSelectable:'choices__item--selectable',itemDisabled:'choices__item--disabled',
   itemChoice:'choices__item--choice',placeholder:'choices__placeholder',group:'choices__group',
   groupHeading:'choices__heading',button:'choices__button',activeState:'is-active',
   focusState:'is-focused',openState:'is-open',disabledState:'is-disabled',
   highlightedState:'is-highlighted',selectedState:'is-selected',flippedState:'is-flipped',loadingState:'is-loading'
  },
  allowHTML:false,searchResultLimit:1000,noResultsText:'没有匹配的选项',noChoicesText:'暂无可选项'
 };
}

// Scope disposal to the surface being replaced. A background list refresh must
// never destroy the controls of an open editor.
export function disposeFilterSelects(host=document){
 let resume;
 for(const [select,{instance,updateTitle,onEscape,onOpen}]of instances){
  if(!host.contains(select))continue;
  const outer=instance.containerOuter.element;
  if(outer.contains(document.activeElement))resume={key:formKey(select),id:select.id,name:select.name,open:outer.classList.contains('is-open'),search:instance.input.element.value};
  select.removeEventListener('change',updateTitle);select.removeEventListener('showDropdown',onOpen);outer.removeEventListener('keydown',onEscape,true);instance.destroy();
  instances.delete(select);
 }
 return resume;
}

export function mountFilterSelects(host,resume){
 for(const select of host.querySelectorAll('select[data-choices]')){
  if(instances.has(select))continue;
  const label=select.labels[0];
  if(label&&!label.id)label.id=select.id+'-label';
  const instance=new window.Choices(select,{...templateConfig(select),labelId:label?.id});
  if(select.matches(':disabled'))instance.disable();
  const outer=instance.containerOuter.element;
  // Choices' automatic flip checks the window. Inside the template's scrollable
  // modal, use its built-in top/bottom placement against the modal body instead.
  const onOpen=()=>{
   const body=outer.closest('.modal-body');if(!body)return;
   const bounds=body.getBoundingClientRect(),rect=outer.getBoundingClientRect(),height=instance.dropdown.element.getBoundingClientRect().height;
   const above=rect.top-Math.max(0,bounds.top),below=Math.min(innerHeight,bounds.bottom)-rect.bottom;
   const up=below<height&&above>below;
   instance.containerOuter.position=up?'top':'bottom';
   if(instance.containerOuter.isFlipped!==up){instance.containerOuter.close();instance.containerOuter.open(rect.bottom+height,height);}
   if(Math.max(above,below)<height)body.scrollTop+=up?above-height:height-below;
  };
  select.addEventListener('showDropdown',onOpen);
  // The template's select and Bootstrap modal both handle Escape. Close the
  // inner component first, so dismissing a menu does not discard the editor.
  const onEscape=event=>{
   if(event.key==='Escape'&&outer.classList.contains('is-open')){
    event.preventDefault();event.stopPropagation();instance.hideDropdown();outer.focus({preventScroll:true});
   }
  };
  outer.addEventListener('keydown',onEscape,true);
  instance.input.element.setAttribute('aria-label','搜索'+(label?.textContent||'')+'选项');
  const updateTitle=()=>{outer.title=select.selectedOptions[0]?.textContent||'';};
  select.addEventListener('change',updateTitle);updateTitle();
  instances.set(select,{instance,updateTitle,onEscape,onOpen});
  if(resume?.key===formKey(select)&&(resume.name?resume.name===select.name:resume.id===select.id)){
   outer.focus({preventScroll:true});
   if(resume.open){instance.showDropdown();instance.input.element.value=resume.search;instance.input.element.dispatchEvent(new Event('input',{bubbles:true}));}
  }
 }
}

// History restoration changes the underlying form values; update the same template
// instance as well so its displayed option always agrees with the applied filter.
export function syncFilterSelects(host){
 for(const [select,{instance,updateTitle}]of instances){
  if(host.contains(select)){instance.setChoiceByValue(select.value);updateTitle();}
 }
}
