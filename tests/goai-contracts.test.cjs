/* Copyright (C) 2026 Synapxnet. All rights reserved.
 * Synapxnet Proprietary and Confidential. Unauthorized copying, distribution or use is forbidden.
 * 实际请求字段与异步保存边界测试。Actual request-field and asynchronous-save boundary tests.
 * Author: maoyo | Department: 研发部 | Date: 2026-09-13 | Version: 1.0.0 | Security Level: INTERNAL
 * __version__: 1.0.0 | __author__: maoyo | __copyright__: Copyright 2026 Synapxnet
 * __maintainer__: maoyo | __email__: synapxnet@gmail.com
 */
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const test=require('node:test');
const ts=require('typescript');const {ref}=require('vue');
const src=path.resolve(__dirname, '../apps/web-antd/src');
/** 编译真实TS模块，测试只替换网络与通知边界。Compile real TS modules while replacing only network and notification boundaries. */
function loadModule(file,client,notices=[]) {
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const value={exports:{}};
 /** 仅解析该模块实际使用的本地依赖。Resolve only actual dependencies used by the tested module. */
 function scopedRequire(name){if(name==='#/api/request')return {mepRequestClient:client,dppRequestClient:client,smpRequestClient:client,mtpRequestClient:client};if(name==='#/api/public-error')return loadModule(`${src}/api/public-error.ts`,client,notices);if(name==='ant-design-vue')return {message:{success:m=>notices.push(m),error:()=>{}}};if(name.startsWith('.'))return loadModule(path.resolve(path.dirname(file),name)+'.ts',client,notices);throw new Error(name);}
 new Function('require','module','exports',code)(scopedRequire,value,value.exports);return value.exports;
}
const normalization=loadModule(`${src}/views/MEP/api/normalizers.ts`,{});
/** 原始文件包络必须拒绝业务失败，同时保留成功空目录和CAS权限信息。 Raw file envelopes must reject business failures while retaining successful empty directories and CAS permissions. */
test('algorithm file reads reject failure envelopes and preserve empty CAS results',async()=>{
 let response={code:500,message:'internal exception /api/storage',data:null};
 const module=loadModule(`${src}/views/SMP/api/algorithmManager.ts`,{get:async()=>response});
 await assert.rejects(module.fetchAlgorithmFileList('1','/'),/服务处理失败/);
 response={code:0,message:'Success',data:[],isCAS:true};
 assert.deepEqual(await module.fetchAlgorithmFileList('1','/'),response);
});
/** 重开工作流时连线按数据库外键映射回UID，保留零坐标。Reopened graphs map database keys back to UIDs and preserve zero positions. */
test('workflow graph roundtrip preserves references and conditions across new database keys',()=>{
 const graph=loadModule(`${src}/views/XAA/workflow/graph-contract.ts`,{});
 const nodes=[{id:101,uid:'start',nodeType:'start',title:'开始',positionX:0,positionY:0,configJson:'{}'},{id:102,uid:'end',nodeType:'end',title:'结束',positionX:250,positionY:0}];
 const edges=[{id:3,uid:'edge',sourceNodeId:101,targetNodeId:102,edgeType:'success',conditionJson:'{"ok":true}',sortOrder:2}];
 const canvas=graph.decodeGraph(nodes,edges);assert.equal(canvas.nodes[0].position.x,0);assert.equal(canvas.edges[0].source,'start');assert.equal(canvas.edges[0].target,'end');
 const saved=graph.encodeGraph(7,canvas);assert.equal(saved.edges[0].sourceNodeUid,'start');assert.equal(saved.edges[0].conditionJson,'{"ok":true}');assert.equal(saved.edges[0].edgeType,'success');assert.equal(saved.edges[0].sortOrder,2);
 assert.throws(()=>graph.decodeGraph(nodes,[{...edges[0],targetNodeId:999}]),/缺失节点/);
});
/** 不完整配置显示错误，不让forEach破坏页面。Incomplete configuration must report an error rather than crashing a page iterator. */
test('dataset config rejects malformed arrays and performs actual label update',async()=>{
 const writes=[];const api=loadModule(`${src}/views/SMP/api/datasetConfig.ts`,{get:async()=>[],put:async(url,body)=>writes.push({url,body})});
 await assert.rejects(api.fetchConfig(),/结构不完整/);
 assert.deepEqual(api.validateDatasetConfig({datasetTypes:[],datasetZones:[]}),{datasetTypes:[],datasetZones:[]});
 assert.throws(()=>api.validateDatasetConfig({datasetTypes:[{label:null}],datasetZones:[]}),/格式无效/);
 await api.updateConfigItem('datasetTypes','text/type',{label:'文本'});assert.equal(writes[0].url,'/smp/dataset-config/datasetTypes/text%2Ftype');assert.deepEqual(writes[0].body,{label:'文本'});
});
/** 集群未知数据拒绝而非标记全零健康。Reject unknown cluster data rather than showing healthy zero counts. */
test('cluster rejects incomplete topology response',async()=>{
 const api=loadModule(`${src}/views/SMP/api/clusterManagement.ts`,{get:async()=>[]});
 await assert.rejects(api.getClusterTopology('hadoop'),/结构不完整/);
});
/** 验证真实Java实体的字段和String配置格式。Verify actual Java entity fields and string-backed configuration. */
test('MEP request maps entity keys and preserves nested JSON keys',()=>{
 const result=normalization.toEntityPayload({node_uid:'node-1',model_name:'model',resource_config:{gpu_count:1,customKey:'unchanged'},labels:['one'],replicas:2});
 assert.equal(result.nodeUid,'node-1');assert.equal(result.modelName,'model');assert.deepEqual(JSON.parse(result.resourceConfig),{gpu_count:1,customKey:'unchanged'});assert.equal(result.labels,'["one"]');assert.equal(result.replicas,2);
});
/** 验证列表响应的配置恢复而非把字符串当对象。Restore configuration from list responses instead of treating strings as objects. */
test('MEP response restores JSON config and rejects corrupt config',()=>{
 const result=normalization.fromEntityResponse([{modelName:'model',resourceConfig:'{"gpu_count":2}',healthCheck:'{"enabled":false}'}]);
 assert.equal(result[0].model_name,'model');assert.equal(result[0].resource_config.gpu_count,2);assert.equal(result[0].health_check.enabled,false);
 assert.throws(()=>normalization.fromEntityResponse({config:'{invalid'}));
});
/** 直接测试节点创建和Map型连接测试的不同后端契约。Test distinct entity and map contracts for node creation and connection tests. */
test('node API normalizes create but preserves test-connection map keys',async()=>{
 const requests=[];const api=loadModule(`${src}/views/MEP/api/node.ts`,{post:async(url,body)=>{requests.push({url,body});return {id:1};}});
 await api.createNode({name:'node',ip_address:'127.0.0.1',cpu_cores:4,labels:['test']});
 await api.testNodeConnection({ip_address:'127.0.0.1',port:22});
 assert.equal(requests[0].body.ipAddress,'127.0.0.1');assert.equal(requests[0].body.cpuCores,4);assert.equal(requests[0].body.labels,'["test"]');assert.equal(requests[1].body.ip_address,'127.0.0.1');assert.equal('ipAddress' in requests[1].body,false);
});
/** 持久化失败不得产生成功提示。Persistence failures must not emit success notices. */
test('failed MEP creation never emits success',async()=>{
 const notices=[];const api=loadModule(`${src}/views/MEP/api/deployment.ts`,{post:async()=>{throw new Error('unavailable');}},notices);
 await assert.rejects(api.createDeployment({name:'test'}));assert.deepEqual(notices,[]);
});
/** 知识库创建和更新遵守已存在的snake_case实体。Knowledge-base writes honor existing snake_case entities. */
test('knowledge-base API serializes settings and archive state correctly',async()=>{
 const requests=[];const client={post:async(url,body)=>{requests.push(body);return {id:1,chunk_size:body.chunk_size};},put:async(url,body)=>{requests.push(body);return {id:1,status:body.status};}};
 const api=loadModule(`${src}/views/DPP/KnowledgeBase/api.ts`,client);
 const result=await api.createKnowledgeBase({name:'KB',chunkSize:500,chunkOverlap:50,vectorDbType:'milvus',rerankEnabled:false});
 await api.updateKnowledgeBase(1,{status:'archived'});
 assert.equal(requests[0].chunk_size,500);assert.equal(requests[0].chunk_overlap,50);assert.equal(requests[0].rerank_enabled,false);assert.equal(requests[0].vector_db_type,'milvus');assert.equal(result.chunkSize,500);assert.deepEqual(requests[1],{status:'archived'});
});
/** 提取真实编辑器保存处理器，在Vue响应式状态上验证时序。Extract real editor save handlers and verify ordering against Vue reactive state. */
function workflowHarness(){
 const text=fs.readFileSync(`${src}/views/XAA/workflow/designer/WorkflowDesigner.vue`,'utf8');const script=text.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];const parsed=ts.createSourceFile('editor.ts',script,ts.ScriptTarget.Latest,true);
 const functions=parsed.statements.filter(node=>ts.isFunctionDeclaration(node)&&['saveWorkflow','finishSave'].includes(node.name.text)).map(node=>node.getText(parsed)).join('\n');
 const code=ts.transpileModule(functions,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const events=[];const nodes=ref([{id:'initial'}]);const edges=ref([]);const saving=ref(false);const isDirty=ref(true);
 const result=new Function('nodes','edges','saving','isDirty','emit','let pendingGraph="";'+code+';return {saveWorkflow,finishSave};')(nodes,edges,saving,isDirty,(...args)=>events.push(args));
 return {...result,nodes,edges,saving,isDirty,events};
}
/** 失败保持草稿，重复点击不重复提交。Preserve drafts on failure and reject duplicate submits. */
test('workflow waits for actual save and rejects duplicate clicks',async()=>{
 const editor=workflowHarness();await editor.saveWorkflow();await editor.saveWorkflow();assert.equal(editor.events.length,1);assert.equal(editor.isDirty.value,true);assert.equal(editor.saving.value,true);editor.finishSave(false);assert.equal(editor.isDirty.value,true);assert.equal(editor.saving.value,false);
});
/** 迟到成功不能清除更新后的编辑标记。Late success must not clear newer edits. */
test('workflow success preserves edits made during pending save',async()=>{
 const editor=workflowHarness();await editor.saveWorkflow();editor.nodes.value.push({id:'new edit'});editor.finishSave(true);assert.equal(editor.isDirty.value,true);
});
/** 无后续编辑的成功才清除未保存状态。Only successful saves without newer edits clear dirty state. */
test('workflow exact saved graph clears dirty state',async()=>{
 const editor=workflowHarness();await editor.saveWorkflow();editor.finishSave(true);assert.equal(editor.isDirty.value,false);assert.equal(editor.saving.value,false);
});
