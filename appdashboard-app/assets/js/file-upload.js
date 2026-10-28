import {escape as e,icon} from './html.js';

// Native markup from AppDashboard Pro/forms-upload.html: Compact Dropzone + File List.
// The template's original main.css owns all upload component visuals.
export function fileUpload({name,label,accept,hint}){
 const id='upload-'+name;
 return `<div class="mb-3" data-upload-field><label class="form-label" for="${id}">${e(label)}</label><div class="upload-dropzone upload-dropzone-compact" data-upload-zone role="button" tabindex="0" aria-label="选择${e(label)}" aria-describedby="${id}-help"><input type="file" id="${id}" name="${name}" accept="${e(accept)}" aria-label="${e(name==='codeFile'?'代码包':label)}" hidden><div class="upload-dropzone-content"><i class="bi bi-cloud-arrow-up me-2" aria-hidden="true"></i><span>拖拽文件到这里，或 <a href="#" class="upload-browse-link" tabindex="-1">选择文件</a></span></div></div><div class="form-text" id="${id}-help">${e(hint)}</div><div class="upload-file-list mt-3" id="file-status" aria-live="polite"></div><div id="upload-feedback" aria-live="polite"></div></div>`;
}

export function selectedFile({name,fileName,size,status}){
 if(!fileName)return '';
 const bytes=Number.isFinite(size)?(size<1024?size+' B':size<1024*1024?(size/1024).toFixed(1)+' KB':(size/1024/1024).toFixed(1)+' MB'):'';
 return `<div class="upload-file-item"><div class="upload-file-icon">${icon(name==='codeFile'?'file-earmark-zip text-warning':'file-earmark-spreadsheet text-success')}</div><div class="upload-file-info"><span class="upload-file-name" title="${e(fileName)}">${e(fileName)}</span><span class="upload-file-size">${e([bytes,status].filter(Boolean).join(' · '))}</span></div><button type="button" class="btn btn-sm btn-outline-danger upload-file-remove" data-form-action="remove-file" data-file-name="${name}" aria-label="${name==='codeFile'?'移除代码包':'移除 CSV 文件'}" title="移除文件">${icon('x-lg')}</button></div>`;
}

export function bindFileUploads(host){
 const onClick=event=>{const zone=event.target.closest('[data-upload-zone]');if(!zone||event.target.matches('input'))return;event.preventDefault();zone.querySelector('input').click();};
 const onKey=event=>{if(event.target.matches('[data-upload-zone]')&&['Enter',' '].includes(event.key)){event.preventDefault();event.target.querySelector('input').click();}};
 const onDrag=event=>{
  const zone=event.target.closest('[data-upload-zone]');if(!zone)return;event.preventDefault();event.stopPropagation();
  if(['dragenter','dragover'].includes(event.type)){zone.classList.add('dragover');if(event.dataTransfer)event.dataTransfer.dropEffect='copy';}
  else if(event.type==='drop'||!zone.contains(event.relatedTarget))zone.classList.remove('dragover');
  if(event.type==='drop'&&event.dataTransfer?.files.length){const input=zone.querySelector('input');input.files=event.dataTransfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));}
 };
 const events={click:onClick,keydown:onKey,dragenter:onDrag,dragover:onDrag,dragleave:onDrag,drop:onDrag};
 for(const [name,handler]of Object.entries(events))host.addEventListener(name,handler);
 return ()=>{for(const [name,handler]of Object.entries(events))host.removeEventListener(name,handler);};
}
