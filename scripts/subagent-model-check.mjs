import assert from 'node:assert/strict';
import {normalizeChatgptSubagentModel} from '../src/subagent-model.mjs';
export async function verifySubagentModels(source) {
 const anchor=source.indexOf('const{subagentConfig:t,requestedModel:n,parentModelId:r');
 const start=source.lastIndexOf('async function(e){',anchor),end=source.indexOf('}({subagentConfig:',anchor);
 assert.ok(start>=0&&end>start,'Native subagent model resolver found');
 const identity=value=>value;
 const forced=async options=>options.forceModelId && !options.isModelBlocked(options.forceModelId)?options.forceModelId:undefined;
 const vars={u0:identity,i0:'explore',Pne:identity,xne:()=>false,qne:forced,Jne:'forced',XK:'fast',VK:'auto',Lq:Error,
  nvt:identity,Zwt:'explore',mNt:identity,dNt:()=>false,SNt:forced,wNt:'forced',Gpt:'fast',jpt:'auto',I8:Error,
  l0:identity,o0:'explore',Ene:identity,Ine:()=>false,Dne:forced,Nne:'forced',Cne:identity,YK:'fast',KK:'auto',Jq:Error,
  evt:identity,Kwt:'explore',lNt:identity,uNt:()=>false,TNt:forced,gNt:'forced',cNt:identity,Upt:'fast',qpt:'auto',E8:Error,
  __normalizeClaudeSubagentModel:identity,__normalizeChatgptSubagentModel:normalizeChatgptSubagentModel};
 const make=values=>new Function(...Object.keys(values),'return ('+source.slice(start,end+1)+')')(...Object.values(values));
 const resolve=make(vars),parent='chatgpt-codex/test';
 const options={subagentConfig:{subagent_type:'generalPurpose'},requestedModel:'',parentModelId:parent,parentMaxMode:false,
  subagentModels:{modelsBySlug:new Map([[parent,{slug:parent}],['configured',{slug:'configured'}]])},isModelBlocked:()=>false,isModelValid:()=>true,compareModelCosts:()=>0};
 await assert.rejects(make({...vars,__normalizeChatgptSubagentModel:identity})(options),/non-empty string/);
 for(const requestedModel of ['', '  ', undefined, 'inherit'])assert.equal(await resolve({...options,requestedModel}),parent);
 assert.equal(options.requestedModel,'','Caller input is unchanged');
 assert.equal(await resolve({...options,requestedModel:'configured'}),'configured');
 assert.equal(await resolve({...options,subagentConfig:{...options.subagentConfig,defaultModelIds:['configured']}}),'configured');
 assert.equal(await resolve({...options,forceModelId:'configured',subagentModelForcePolicy:'forced'}),'configured');
 await assert.rejects(resolve({...options,isModelBlocked:()=>true}),/No usable model/);
 await assert.rejects(resolve({...options,requestedModel:'not-a-model',isModelValid:()=>false}),/Invalid model selection/);
 await assert.rejects(resolve({...options,parentModelId:'ordinary'}),/non-empty string/);
 console.log('Native subagent model resolver: empty-model failure reproduced; inheritance, defaults and restrictions passed.');
}
