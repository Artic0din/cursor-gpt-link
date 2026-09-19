// Execute Cursor's local task configuration with synthetic inputs. Cursor's
// bundled code is read from a local installation and is never redistributed.
import assert from 'node:assert/strict';
import {configureTaskProps,selectedParameters,selectedModelIds} from '../src/subagent-settings.mjs';
import {exercisePatchedLocalAgent} from './workbench-routing-check.mjs';

export async function verifySubagentSettingsWorkbench(source, prefix='chatgpt-codex/') {
  const selected=await exercisePatchedLocalAgent(source,{modelId:prefix+'test-model',authority:'ssh-remote+test-host',nativeSetting:false,prefix});
  assert.deepEqual(selected.request.availableModelIds,['selected-explore-model']);
  assert.deepEqual(selected.request.runOptions.subagentModelOverrides,[selected.override.toBinary()]);
  const ordinary=await exercisePatchedLocalAgent(source,{modelId:'ordinary-model',authority:'ssh-remote+test-host',nativeSetting:false,prefix});
  assert.deepEqual(ordinary.request.availableModelIds,[]);
  assert.deepEqual(ordinary.request.runOptions.subagentModelOverrides,[ordinary.override.toBinary()]);
}

export function verifySubagentSettings(source) {
 // 3.21.1 rotated the minified locals; the resolver call is what identifies it.
 const match=source.match(/function ([\w$]+)\(e\)\{const t=\(\)=>!1,([\w$]+)=([\w$]+)\(e\),([\w$]+)=null!=\2\?\2:e\.localProvider;/);
 assert.ok(match,'Native local task factory found');
 const tail=source.slice(match.index),end=tail.search(/function [\w$]+\(e\)\{return e instanceof/);
 assert.ok(end>0,'Native local task factory end found');
 const fn=tail.slice(0,end);
 const resolver=fn.match(/[\w$]+=([\w$]+)\("grok-4.5"/)[1];
 const normalize=fn.match(/"explore"===([\w$]+)\(t.subagentType\)/)[1];
 const models=fn.match(/subagentModels:([\w$]+)\([\w$]+,t\)/)[1];
 const policy=fn.match(/subagentModelForcePolicy:([\w$]+),/)[1];
 const dependencies={[match[3]]:e=>e.localProvider,[resolver]:(id,available)=>available.some(m=>m.id===id)?id:undefined,
   [normalize]:value=>value,[models]:models=>({modelsBySlug:new Map(Object.entries(models))}),[policy]:'none'};
 const native=new Function(...Object.keys(dependencies),'return ('+fn+')')(...Object.values(dependencies));
 const parent='chatgpt-codex/parent',child='chatgpt-codex/selected',parentParams=[{id:'reasoning',value:'low'}];
 const selectedParams=[{id:'reasoning',value:'xhigh'},{id:'context',value:'1000000'},{id:'fast',value:'true'}];
 for(const modelId of [child,'another-provider/model']){
  const overrides=[{subagentType:'explore',selection:{case:'model',value:{modelId,parameters:selectedParams}}}];
  const base={modelId:parent,localProvider:{kind:'http',endpoints:[]},modelParameters:parentParams,subagentModelOverrides:overrides};
  assert.equal(native(base).subagentModelOverrides.explore.type,'inherit','Original missing-catalog failure reproduced');
  const input={...base,availableModels:selectedModelIds([],overrides,parent,'chatgpt-codex/').map(id=>({id}))};
  const props=configureTaskProps(input,native(input),'chatgpt-codex/');
  assert.deepEqual(props.subagentModelOverrides.explore,{type:'model',modelId});
  assert.deepEqual(props.parentModelParameters,parentParams);
  assert.deepEqual(selectedParameters(props,{subagent_type:{type:{case:'explore'}},userRequestedModelId:modelId},modelId,undefined,'chatgpt-codex/'),selectedParams);
 }
 for(const mode of ['default','inherit','disabled']){
  const input={modelId:parent,localProvider:{kind:'http'},subagentModelOverrides:mode==='default'?[]:[{subagentType:'explore',selection:{case:mode,value:true}}]};
  const original=native(input),patched=configureTaskProps(input,original,'chatgpt-codex/');
  assert.deepEqual(patched.subagentModelOverrides,original.subagentModelOverrides);
  assert.equal(patched.subagentModelOverrides.explore.type,mode==='default'?'inherit':mode);
 }
 assert.match(source,/modelId:([\w$]+)\.modelDetails\.modelId,modelParameters:\1\.parameters,modelInfo:[\w$]+/);
 assert.ok(source.includes('resolvedModelParameters:__')&&source.includes('SelectedParameters(a,'),'Parameters forwarded into client subagent resolution');
 console.log('Native Explore settings: missing catalog reproduced; model, Default, Inherit, Disabled and parameters passed.');
}
