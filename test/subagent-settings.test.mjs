import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedModelIds,configureTaskProps,selectedParameters,patchSubagentSettingsWorkbench,patchSubagentSettingsRuntime} from '../src/subagent-settings.mjs';
import {modelTooltip} from '../src/model-tooltip.mjs';
import {GPT_PREFIX} from '../src/subscription-prefix.mjs';
const parent='chatgpt-codex/parent',child='chatgpt-codex/child';
const params=[{id:'reasoning',value:'xhigh'},{id:'context',value:'1000000'},{id:'fast',value:'true'}];
const selection={subagentType:'explore',selection:{case:'model',value:{modelId:child,parameters:params}}};
test('Explore model selection is available locally without changing Default, Inherit or Disabled',()=>{
 const original=['native'];
 assert.deepEqual(selectedModelIds(original,[selection],parent,GPT_PREFIX),['native',child]);
 assert.deepEqual(selectedModelIds(original,[{...selection,selection:{case:'model',value:{modelId:'another-provider/model'}}}],parent,GPT_PREFIX),['native','another-provider/model']);
 for(const mode of ['default','inherit','disabled'])assert.deepEqual(selectedModelIds(original,[{selection:{case:mode}}],parent,GPT_PREFIX),original);
 assert.strictEqual(selectedModelIds(original,[selection],'ordinary',GPT_PREFIX),original);
 assert.deepEqual(original,['native']);
});
test('Explore selection keeps its parameters; inherited and unrelated tasks keep their own parameters',()=>{
 const native={parentRequestedModelName:parent,subagentModels:{modelsBySlug:new Map()},subagentModelOverrides:{explore:{type:'model',modelId:child}}};
 const props=configureTaskProps({modelId:parent,modelParameters:[{id:'reasoning',value:'low'}],subagentModelOverrides:[selection]},native,GPT_PREFIX);
 assert.strictEqual(props.subagentModelOverrides,native.subagentModelOverrides);
 const config={subagent_type:{type:{case:'explore'}},userRequestedModelId:child};
 assert.deepEqual(selectedParameters(props,config,child,undefined,GPT_PREFIX),params);
 assert.notStrictEqual(selectedParameters(props,config,child,undefined,GPT_PREFIX),params);
 assert.deepEqual(props.parentModelParameters,[{id:'reasoning',value:'low'}]);
 assert.equal(selectedParameters(props,config,'explicit-tool-model','fallback',GPT_PREFIX),'fallback');
 assert.equal(selectedParameters(props,{...config,subagent_type:{type:{case:'custom'}}},child,'fallback',GPT_PREFIX),'fallback');
 assert.strictEqual(configureTaskProps({modelId:'ordinary'},native,GPT_PREFIX),native);
 for(const mode of ['inherit','disabled']){
  const source={...native,subagentModelOverrides:{explore:{type:mode}}};
  assert.strictEqual(configureTaskProps({modelId:parent},source,GPT_PREFIX).subagentModelOverrides,source.subagentModelOverrides);
 }
});
test('unknown patch anchors fail before returning a modified bundle',()=>{
 assert.throws(()=>patchSubagentSettingsWorkbench('unrecognized',GPT_PREFIX),/anchor/);
 assert.throws(()=>patchSubagentSettingsRuntime('unrecognized',GPT_PREFIX),/anchor/);
});
test('serialized Explore helpers do not close over Node imports',()=>{
 for (const fn of [selectedModelIds, configureTaskProps, selectedParameters]) {
  const source=fn.toString();
  assert.equal(source.includes('requireSubscriptionPrefix'),false,fn.name);
  assert.equal(source.includes('GPT_PREFIX'),false,fn.name);
  assert.equal(source.includes('import.meta'),false,fn.name);
 }
});
test('model tooltip matches Cursor title, context and italic effort layout',()=>{
 assert.equal(modelTooltip('Model','Description',256000,'high').markdownContent,'**Model**  \nDescription\n\n256k context window\n\n*Version: high effort*');
 assert.match(modelTooltip('Model','Description',1000000,'xhigh',true).markdownContent,/1M context window\n\n\*Version: very high effort, fast\*$/);
 assert.equal(modelTooltip('Model','Description',200000).markdownContent.includes('Version:'),false);
 assert.ok(modelTooltip('<Model>','[link](url)',200000,'low').markdownContent.includes('\\<Model\\>'));
});
