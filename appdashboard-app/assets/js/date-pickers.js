// Original forms-pickers.html: Date, 24-Hour Time and Date & Time.
// Flatpickr generates the panel; its vendor files and template styles are unchanged.
const instances=new Map();
const locale={
 weekdays:{shorthand:['日','一','二','三','四','五','六'],longhand:['星期日','星期一','星期二','星期三','星期四','星期五','星期六']},
 months:{shorthand:Array.from({length:12},(_,i)=>(i+1)+'月'),longhand:Array.from({length:12},(_,i)=>(i+1)+'月')},
 firstDayOfWeek:1,rangeSeparator:' 至 ',weekAbbreviation:'周',scrollTitle:'滚动调整',toggleTitle:'点击切换',yearAriaLabel:'年份',monthAriaLabel:'月份',hourAriaLabel:'小时',minuteAriaLabel:'分钟',amPM:['上午','下午']
};
function parse(value,kind){
 const raw=value.trim(),time=kind.startsWith('time'),match=(time?/^(\d{2}):(\d{2})$/:kind==='date'?/^(\d{4})-(\d{2})-(\d{2})$/:/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/).exec(raw);
 if(!match)return;
 const today=new Date();
 const [year,month,day,hour=0,minute=0,second=0]=time?[today.getFullYear(),today.getMonth()+1,today.getDate(),...match.slice(1).map(n=>Number(n||0))]:match.slice(1).map(n=>Number(n||0));
 const result=new Date(year,month-1,day,hour,minute,second);result.setFullYear(year);
 if(year<1||result.getFullYear()!==year||result.getMonth()!==month-1||result.getDate()!==day||hour>23||minute>59||second>59)return;
 return result;
}
export function closeDatePickers(host=document){for(const [input,{picker}]of instances)if(host.contains(input))picker.close();}
export function disposeDatePickers(host=document){
 for(const [input,{picker,validate,guard,escape,icon,open,scrollHost,close}]of instances){
  if(!host.contains(input))continue;
  input.removeEventListener('input',validate);input.removeEventListener('blur',guard,true);input.removeEventListener('keydown',guard,true);input.removeEventListener('keydown',escape,true);
  picker.calendarContainer.removeEventListener('keydown',escape,true);icon?.removeEventListener('click',open);scrollHost.removeEventListener('scroll',close);picker.destroy();instances.delete(input);
 }
}
export function syncDatePickers(host=document){
 for(const [input,{picker,validate}]of instances)if(host.contains(input)){const raw=input.value;picker.setDate(parse(raw,input.dataset.picker)||[],false);input.value=raw;validate();}
}
export function mountDatePickers(host){
 for(const input of host.querySelectorAll('input[data-picker]')){
  if(instances.has(input))continue;
  const kind=input.dataset.picker,time=kind.startsWith('time'),datetime=kind==='datetime';
  const validate=()=>{input.setCustomValidity(input.value&&!parse(input.value,kind)?'请输入有效的'+(time?'时间（HH:mm）':datetime?'日期和时间（YYYY-MM-DD HH:mm）':'日期（YYYY-MM-DD）'):'');};
  // Retain invalid manual input for correction instead of silently normalizing Feb 30.
  const guard=event=>{validate();if(input.validity.customError&&(event.type==='blur'||event.key==='Enter'))event.stopImmediatePropagation();};
  input.addEventListener('input',validate);input.addEventListener('blur',guard,true);input.addEventListener('keydown',guard,true);
  const modal=input.closest('.modal'),scrollHost=input.closest('.modal-body')||window,initial=input.value;
  if(initial&&!parse(initial,kind))input.value='';
  const picker=window.flatpickr(input,{
   dateFormat:datetime?'Y-m-d H:i':time?'H:i':'Y-m-d',
   enableTime:time||datetime,noCalendar:time,time_24hr:true,enableSeconds:false,minuteIncrement:1,allowInput:true,disableMobile:true,locale,
   parseDate:value=>parse(value,kind),
   ...(modal?{appendTo:modal,position(instance){
    // Portal inside Bootstrap's focus trap, outside its scrolling body. Only placement changes.
    const panel=instance.calendarContainer,anchor=input.getBoundingClientRect(),bounds=modal.getBoundingClientRect(),height=panel.offsetHeight,width=panel.offsetWidth;
    const above=innerHeight-anchor.bottom<height+2&&anchor.top>=height+2;
    panel.classList.toggle('arrowTop',!above);panel.classList.toggle('arrowBottom',above);panel.classList.add('arrowLeft');
    panel.style.top=(Math.max(2,above?anchor.top-height-2:Math.min(anchor.bottom+2,innerHeight-height-2))-bounds.top+modal.scrollTop)+'px';
    panel.style.left=(Math.max(2,Math.min(anchor.left,innerWidth-width-2))-bounds.left+modal.scrollLeft)+'px';panel.style.right='auto';
   }}:{}),
   onOpen(){for(const [other,{picker:active}]of instances)if(other!==input)active.close();},
   onChange(){validate();}
  });
  const escape=event=>{if(event.key==='Escape'&&picker.isOpen){event.preventDefault();event.stopImmediatePropagation();input.focus({preventScroll:true});picker.close();}};
  input.addEventListener('keydown',escape,true);picker.calendarContainer.addEventListener('keydown',escape,true);
  const icon=input.closest('.input-group')?.querySelector('.input-group-text'),open=()=>{input.focus({preventScroll:true});picker.open();},close=()=>{
   if(!picker.isOpen)return;
   if(modal){const rect=input.getBoundingClientRect(),bounds=scrollHost.getBoundingClientRect();if(rect.top>=bounds.top&&rect.bottom<=bounds.bottom){picker.config.position(picker);return;}}
   picker.close();
  };
  icon?.addEventListener('click',open);scrollHost.addEventListener('scroll',close,{passive:true});
  if(initial&&!parse(initial,kind))input.value=initial;
  instances.set(input,{picker,validate,guard,escape,icon,open,scrollHost,close});validate();
 }
}
