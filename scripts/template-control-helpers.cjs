const assert=require('node:assert/strict');

// Drive the actual template menu, rather than mutating its hidden <select>.
async function chooseTemplate(host,label,choice){
 const select=host.locator('select').and(host.getByLabel(label,{exact:true}));
 const outer=select.locator('xpath=../..');
 await outer.locator('.choices__inner').click();
 const option=await outer.locator('.choices__list--dropdown [data-choice]').evaluateAll((options,choice)=>{
  const item=options.find(o=>typeof choice==='object'?o.textContent===choice.label:o.dataset.value===String(choice));
  return item?{value:item.dataset.value,label:item.textContent}:null;
 },choice);
 assert(option,'Missing option: '+label+' / '+JSON.stringify(choice));
 await outer.locator('.choices__list--dropdown [data-choice][data-value='+JSON.stringify(option.value)+']').click();
 assert.equal(await host.locator('select').and(host.getByLabel(label,{exact:true})).inputValue(),option.value);
}

async function auditSelects(host){
 const controls=host.locator('select:not(.flatpickr-monthDropdown-months)');
 for(let i=0;i<await controls.count();i++){
  const select=controls.nth(i);
  assert.equal(await select.getAttribute('data-choice'),'active','Select must be initialized by template Choices');
  assert.equal(await select.getAttribute('data-choices-sort'),'false');
  assert.equal(await select.evaluate(el=>el.closest('.choices')?.querySelectorAll('.choices__inner').length),1,'Exactly one original wrapper');
 }
 return controls.count();
}
module.exports={chooseTemplate,auditSelects};
