import assert from 'node:assert/strict';

export async function verifyAgentHostRouting(source, prefixes = ['chatgpt-codex/']) {
  const assignment = 'this._executionStrategy=';
  const start = source.indexOf(assignment), end = source.indexOf(',this._register(',start);
  assert.ok(start>=0 && end>start && end-start<2000,'Native AgentCompat strategy constructor found');
  const expression = source.slice(start+assignment.length,end);
  const fallback = expression.match(/([\w$]+)\?\.executionStrategy\?\?new ([\w$]+)\(this\.agentClientService\)/);
  assert.ok(fallback,'Native fallback strategy retained');
  const nativeStart = source.indexOf(fallback[2]+'=class{');
  const nativeEnd = source.indexOf('}},',nativeStart);
  assert.ok(nativeStart>=0 && nativeEnd>nativeStart,'Native strategy class found');
  const native = 'const '+source.slice(nativeStart,nativeEnd+2)+';';
  const helpers = [...source.matchAll(/function __(?:Chatgpt|Claude)TurnStrategy\([\s\S]*?\n\}/g)];
  assert.equal(helpers.length,prefixes.length,'One wrapper per installed provider');
  const create = new Function(fallback[1],native+helpers.map(match=>match[0]).join('\n')+';return '+expression);
  const calls = [...source.matchAll(/this\._executionStrategy\.executeTurn\(/g)];
  assert.equal(calls.length,3,'Regular, resumed and summarized turns share the strategy');
  const entries = ['runAgentLoop','resume','summarize'];
  const owners = calls.map(call=>entries.reduce((owner,name)=>
    source.lastIndexOf('async '+name+'(',call.index)>source.lastIndexOf('async '+owner+'(',call.index)?name:owner));
  assert.deepEqual(owners,entries);
  const fields = ['ctx','conversationState','action','modelDetails','interactionListener','resourceAccessor',
    'blobStore','conversationActionManager','checkpointHandler','mcpTools','runOptions'];
  const hostCalls=[], localCalls=[], localResult=Promise.resolve('synthetic local result');
  const host={executeTurn(turn){hostCalls.push(turn);return turn;}};
  const client={run(...args){localCalls.push(args);return localResult;}};
  const gates=new Set(),gateCalls=[];
  const gateMethod=source.match(/checkFeatureGate\([\w$]+,[\w$]+\)\{if\(![\w$]+\.doNotUseIgnoreLocalOverridesExceptForDeveloperOverrideUi[\s\S]*?\}(?=_checkGateWithoutOverride\()/);
  assert.ok(gateMethod,'Native renderer feature-gate method found');
  const experimentService={
    checkFeatureGate:new Function('return ({'+gateMethod[0]+'}).checkFeatureGate')(),
    _featureFlagOverrides:new Map(),_canUseOverrides:()=>false,
    _systemGateValues:{get(gate){gateCalls.push(gate);return gates.has(gate);}}
  };
  assert.throws(()=>experimentService.checkFeatureGate('cursor_agent_host_move_exec'),
    {name:'TypeError',message:"Cannot read properties of undefined (reading 'doNotUseIgnoreLocalOverridesExceptForDeveloperOverrideUi')"});
  const receiver={agentClientService:client,experimentService};
  const strategy=create.call(receiver,{executionStrategy:host});
  for(const prefix of prefixes) for(const entry of entries) {
    const turn=Object.fromEntries(fields.map(field=>[field,{field,entry}]));
    turn.runOptions={requestedModel:{modelId:prefix+'test'}};
    turn.modelDetails={modelId:'ordinary-model'};
    turn.ctx.signal=new AbortController().signal;
    assert.strictEqual(strategy.executeTurn(turn),localResult);
    for(const [index,field] of fields.entries()) assert.strictEqual(localCalls.at(-1)[index],turn[field],field);
    turn.runOptions={};turn.modelDetails={modelId:prefix+'test'};
    assert.strictEqual(strategy.executeTurn(turn),localResult,'Model-details fallback stays local');
    turn.runOptions={requestedModel:{modelId:'ordinary-model'}};
    assert.strictEqual(strategy.executeTurn(turn),turn,'Explicit ordinary selection retains Agent Host');
  }
  for(const modelId of ['ordinary-model',undefined,'']) {
    const turn={runOptions:{requestedModel:{modelId}}};
    assert.strictEqual(strategy.executeTurn(turn),turn);
    assert.strictEqual(hostCalls.at(-1),turn);
  }
  for(const enabled of [['cursor_agent_host_move_exec'],['agent_host_local_loop'],['cursor_agent_host_move_exec','agent_host_local_loop']]) {
    gates.clear();for(const gate of enabled)gates.add(gate);
    for(const prefix of prefixes)for(const entry of entries) {
      const turn={entry,modelDetails:{modelId:prefix+'test'}};
      const beforeLocal=localCalls.length,beforeHost=hostCalls.length;
      await assert.rejects(strategy.executeTurn(turn),/Subscription models are temporarily unsupported in Cursor's independent Agent Host runtime/);
      assert.equal(localCalls.length,beforeLocal,'Unsupported turns cannot enter provider wait');
      assert.equal(hostCalls.length,beforeHost,'Unsupported turns cannot enter remote inference');
      turn.runOptions={requestedModel:{modelId:'ordinary-model'}};
      const beforeGates=gateCalls.length;
      assert.strictEqual(strategy.executeTurn(turn),turn);
      assert.equal(gateCalls.length,beforeGates,'Ordinary override never evaluates compatibility gates');
    }
    for(const options of [undefined,{executionStrategy:null}]) {
      const legacy=create.call(receiver,options),before=gateCalls.length;
      assert.strictEqual(legacy.executeTurn({modelDetails:{modelId:prefixes[0]+'test'}}),localResult);
      assert.equal(gateCalls.length,before,'Native fallback does not depend on independent host gates');
    }
  }
  console.log('Native AgentCompat: shared-runtime subscription routing and independent-mode rejection passed; ordinary/default routes and argument identities preserved.');
}
