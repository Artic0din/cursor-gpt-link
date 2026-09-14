import assert from 'node:assert/strict';
import {ensureChatgptTaskBubble} from '../src/subagent-bubbles.mjs';
export async function verifySubagentRegistration(source) {
 const start=source.indexOf('async _waitForParentTaskBubbleIfPossible(');
 const end=source.indexOf('async createOrResumeSubagent(',start);
 assert.ok(start>=0&&end>start,'Native subagent barrier found');
 const method=source.slice(start,end);
 const trim=value=>value?.trim()||undefined;
 class Params {constructor(value){Object.assign(this,value);}}
 const factory=new Function('FK','Ioe','UBe','L7e','BK','Roe','Xr','Zs','Xe','vt','$Be','O7e','__ensureChatgptTaskBubble','__ensureClaudeTaskBubble','return ({'+method+'})._waitForParentTaskBubbleIfPossible');
 const parent={data:{modelConfig:{selectedModels:[{modelId:'chatgpt-codex/test'}]}}};
 const request={parentConversationId:'parent',toolCallId:'task',modelId:'chatgpt-codex/test',prompt:'Test',subagentType:'explore'};
 const bubbles=new Map();let signals=0,waits=0;
 const service={_composerDataService:{getHandleIfLoaded:id=>id==='parent'?parent:undefined,loadComposerCapabilities(){},getComposerCapability:()=>({getBubbleIdByToolCallId:id=>bubbles.get(id),getOrCreateBubbleId:args=>bubbles.set(args.toolCallId,'bubble')})},
 _pendingApprovalRegistry:{signalBubbleCreated(parentId,id){assert.equal(parentId,'parent');assert.ok(bubbles.has(id),'Only a real bubble releases the barrier');signals++;},async waitForBubbleCreation(){waits++;throw new Error('Timeout waiting for bubble creation');}}};
 const run=helper=>factory(trim,trim,Params,Params,trim,trim,{TOOL_FORMER:1},{TOOL_FORMER:1},{TASK_V2:2},{TASK_V2:2},Params,Params,helper,()=>{}).call(service,request);
 await assert.rejects(run(()=>{}),/Timeout waiting for bubble creation/);
 assert.equal(signals,0);assert.equal(waits,1);
 await run(ensureChatgptTaskBubble);assert.equal(signals,1);assert.equal(waits,1);
 await run(ensureChatgptTaskBubble);assert.equal(bubbles.size,1);
 console.log('Native subagent barrier: reproduced missing Task failure; registration repair passed.');
}
