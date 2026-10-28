import {validateCodeBindings,inputReference} from './code-bindings.js';
import {assertWrite,datasets,codes} from './domain/domain.js';

export function downloadCodeTemplate(project,task={}) {
 assertWrite(project.name);
 const available=datasets(project),binding=validateCodeBindings(task,available,codes(project));
 const config={task:task.name.trim(),inputs:binding.inputs.map((data,i)=>({reference:inputReference(task,data.id,i),datasetId:data.id,name:data.name,fields:(data.schema||[]).map(field=>({name:field.name,type:field.type}))})),outputs:binding.outputs.map(output=>({reference:output.reference,name:output.outputName,datasetId:output.target?.id||null,fields:(output.target?.schema||[]).map(field=>({name:field.name,type:field.type}))}))};
 const source='# -*- coding: utf-8 -*-\n'+
 '# 明策代码任务开发模板（Python）\n'+
 '# 仅包含配置和字段说明，不包含数据行、连接凭据或已上传代码。\n'+
 '# 下载模板 → 本地开发和验证 → 将 main.py 及依赖文件打包为 ZIP → 上传代码包。\n'+
 '# 当前平台为前端演示，不执行 Python；以下为本地开发约定，非生产运行时 SDK。\n'+
 '# 输入为字典：每个引用名称对应一个输入数据集的行列表；返回字典包含全部输出引用名称及其行列表。\n'+
 '# 修改任务输入或输出配置后，请重新下载模板。\n#\n'+
 JSON.stringify(config,null,2).split('\n').map(line=>'# '+line).join('\n')+
 '\n\ndef transform(inputs):\n    """按上方引用名称读取输入，并返回 {输出引用名称: 行列表}，必须包含所有已声明输出。"""\n    # 示例：rows = inputs["input_1"]\n    # 在此编写清洗、关联或聚合逻辑。\n    raise NotImplementedError("请实现业务加工逻辑后再打包上传")\n';
 const url=URL.createObjectURL(new Blob([source],{type:'text/x-python;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='mingce-task-template.py';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
