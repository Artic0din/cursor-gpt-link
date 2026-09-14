import assert from 'node:assert/strict';
import {subscriptionComposer} from '../src/subagent-lifecycle.mjs';

// Execute Cursor's extracted methods, not a rewritten approximation of them.
export async function verifySubagentLifecycle(source, prefixes) {
  function method(start,end) {
    const p=source.indexOf(start),q=source.indexOf(end,p+start.length);
    assert.ok(p>=0&&q>p,start+' found');return source.slice(p,q);
  }
  const methods=[method('cancelChat(', 'async cancelCurrentStep('),
    method('async stopSubagentTree(', 'async _loadSubagentTreeForStop('),
    method('classifyBubble(', 'getBubbleLoadState(')];
  // cancelChat also has call sites earlier in the bundle.
  methods[0]=method(source.includes('cancelChat(e){const t=this.composerDataService')?'cancelChat(e){const t=this.composerDataService':'cancelChat(t){const e=this.composerDataService','async cancelCurrentStep(');
  const native=new Function('subscriptionComposer','__subscriptionSubagentPrefixes','SZe','Cde','fu','Zg','tr','cs','Wr','bs',
    'return ({'+methods.join(',')+'})')(subscriptionComposer,prefixes,1,1,()=>false,()=>false,fn=>fn(),fn=>fn(),()=>{},()=>{});
  for(const prefix of prefixes) {
    const controllers=new Map(['parent','child','grandchild','unrelated'].map(id=>[id,new AbortController()]));
    const handles=new Map([...controllers.keys()].map(id=>[id,{data:{composerId:id,status:id==='parent'?'completed':'generating',modelConfig:{modelName:prefix+'test'},subagentComposerIds:id==='parent'?['child']:id==='child'?['grandchild']:[]}}]));
    const dataService={getHandleIfLoaded:id=>handles.get(id),getComposerData:h=>h.data};
    const cancelTree=id=>{controllers.get(id)?.abort();for(const child of handles.get(id)?.data.subagentComposerIds??[])cancelTree(child);};
    let hostCalls=0,loadCalls=0;
    const service={_composerDataService:dataService,composerDataService:dataService,
      cancelSubagentTree:cancelTree,instantiationService:{invokeFunction:fn=>fn({get:()=>({cancelSubagentTree:cancelTree})})},
      composerEventService:{fireDidComposerStopGenerating(){}},
      _loadSubagentTreeForStop:async()=>{loadCalls++;return new Map();},
      _interruptAgentHostSessionTree:async()=>{hostCalls++;}};
    native.cancelChat.call(service,'parent');
    assert.ok(controllers.get('child').signal.aborted);assert.ok(controllers.get('grandchild').signal.aborted);
    assert.equal(controllers.get('unrelated').signal.aborted,false);
    const stopped=native.stopSubagentTree.call(service,'unrelated');
    assert.equal(controllers.get('unrelated').signal.aborted,true,'Cancel happens before yielding');
    await stopped;assert.equal(loadCalls,0);assert.equal(hostCalls,0);
    const child=handles.get('child');child.data.subagentInfo={parentComposerId:'parent'};
    child.data.fullConversationHeadersOnly=[{bubbleId:'message'}];child.data.conversationMap={};
    const transcript={composerId:'child',composerHandle:child,composerDataService:dataService,
      getHeaderBubbleIdSet:()=>new Set(['message'])};
    assert.equal(native.classifyBubble.call(transcript,'message').status,'unloaded');
    child.data.conversationMap={message:{text:'Hydrated after switching chats'}};
    assert.equal(native.classifyBubble.call(transcript,'message').bubble.text,'Hydrated after switching chats');
  }
  console.log('Native subagent lifecycle: idle-parent cascade, immediate local stop and transcript cache refresh passed.');
}
