import test from 'node:test';
import assert from 'node:assert/strict';
import {patchAgentHostRouting} from '../src/agent-host-routing.mjs';

const turnFields = ['ctx','conversationState','action','modelDetails','interactionListener','resourceAccessor',
  'blobStore','conversationActionManager','checkpointHandler','mcpTools','runOptions'];

function fixture(optionsName, nativeName) {
  return `const ${nativeName}=class{constructor(client){this.agentClientService=client}executeTurn(e){return this.agentClientService.run(${turnFields.map(field=>'e.'+field).join(',')})}};
class Compat{constructor(${optionsName},client,experimentService){this.agentClientService=client;this.experimentService=experimentService;this._executionStrategy=${optionsName}?.executionStrategy??new ${nativeName}(this.agentClientService)}
runAgentLoop(turn){return this._executionStrategy.executeTurn(turn)}
resume(turn){return this._executionStrategy.executeTurn(turn)}
summarize(turn){return this._executionStrategy.executeTurn(turn)}}`;
}

for (const [surface, optionsName, nativeName] of [['desktop','e','W6d'],['glass','t','sdm']]) {
  test(surface + ': subscription turns reach the local client with an injected Agent Host strategy', () => {
    const calls = [], result = Promise.resolve('local response');
    const client = {run(...args){calls.push(args);return result;}};
    class Host {
      #disposed = false;
      executeTurn(turn){assert.equal(this.#disposed,false);return {runtime:'connect',turn};}
      get disposed(){return this.#disposed;}
      dispose(){this.#disposed=true;}
    }
    const host = new Host();
    const build = new Function('client','options',patchAgentHostRouting(fixture(optionsName,nativeName))+';return new Compat(options,client,{checkFeatureGate:()=>false});');
    const compat = build(client,{executionStrategy:host});
    const abortController = new AbortController();
    const turn = Object.fromEntries(turnFields.map(field=>[field,{field}]));
    turn.ctx.signal=abortController.signal;
    turn.runOptions={requestedModel:{modelId:'chatgpt-codex/test'}};
    turn.modelDetails={modelId:'ordinary-model'};
    for (const operation of ['runAgentLoop','resume','summarize']) {
      assert.strictEqual(compat[operation](turn),result,operation+' must bypass the injected host for ChatGPT');
      const args=calls.at(-1);
      for (const [index,field] of turnFields.entries()) assert.strictEqual(args[index],turn[field],field);
    }
    abortController.abort();
    assert.equal(calls[0][0].signal.aborted,true);
    for (const modelId of ['ordinary-model','claude-subscription/haiku',undefined,'']) {
      turn.runOptions={requestedModel:{modelId}};
      turn.modelDetails={modelId:'ordinary-model'};
      assert.deepEqual(compat.resume(turn),{runtime:'connect',turn});
    }
    turn.runOptions={};turn.modelDetails={modelId:'chatgpt-codex/test'};
    assert.strictEqual(compat.summarize(turn),result);
    turn.runOptions={requestedModel:{modelId:'ordinary-model'}};
    assert.deepEqual(compat.runAgentLoop(turn),{runtime:'connect',turn});
    const fallback=build(client,undefined);
    assert.strictEqual(fallback.runAgentLoop(turn),result);
    assert.equal(compat._executionStrategy.disposed,false);
    compat._executionStrategy.dispose();
    assert.equal(host.disposed,true);
    const failure=new Error('native request failed');
    client.run=()=>{throw failure;};
    turn.runOptions={requestedModel:{modelId:'chatgpt-codex/test'}};
    assert.throws(()=>compat.resume(turn),error=>error===failure);
  });

  test(surface + ': independent host modes reject only subscription turns before native dispatch', async () => {
    const build = new Function('client','options','experiments',patchAgentHostRouting(fixture(optionsName,nativeName))+';return new Compat(options,client,experiments);');
    for (const [moveExec,localLoop] of [[true,false],[false,true],[true,true]]) {
      const localCalls=[],hostCalls=[],gateCalls=[];
      const localResult=Promise.resolve('local');
      const client={run(...args){localCalls.push(args);return localResult;}};
      const host={executeTurn(turn){hostCalls.push(turn);return turn;}};
      const experiments={checkFeatureGate(gate,options){assert.deepEqual(options,{disableExposureLog:true});gateCalls.push(gate);return gate==='cursor_agent_host_move_exec'?moveExec:localLoop;}};
      const compat=build(client,{executionStrategy:host},experiments);
      for (const operation of ['runAgentLoop','resume','summarize']) {
        const turn={runOptions:{requestedModel:{modelId:'chatgpt-codex/test'}},modelDetails:{modelId:'ordinary-model'}};
        await assert.rejects(compat[operation](turn),/Subscription models are temporarily unsupported in Cursor's independent Agent Host runtime/);
        turn.runOptions={};turn.modelDetails={modelId:'chatgpt-codex/test'};
        await assert.rejects(compat[operation](turn),/independent Agent Host runtime/);
        const before=gateCalls.length;
        turn.runOptions={requestedModel:{modelId:'ordinary-model'}};
        assert.strictEqual(compat[operation](turn),turn);
        turn.runOptions={};turn.modelDetails=undefined;
        assert.strictEqual(compat[operation](turn),turn);
        assert.equal(gateCalls.length,before,'Ordinary/default turns do not evaluate compatibility gates');
      }
      assert.equal(localCalls.length,0,'Unsupported modes cannot enter the provider wait');
      assert.equal(hostCalls.length,6);
      const fallback=build(client,undefined,experiments),before=gateCalls.length;
      assert.strictEqual(fallback.resume({modelDetails:{modelId:'chatgpt-codex/test'}}),localResult);
      assert.equal(gateCalls.length,before,'Legacy mode ignores independent host gates');
      const nullStrategy=build(client,{executionStrategy:null},experiments);
      assert.strictEqual(nullStrategy.resume({modelDetails:{modelId:'chatgpt-codex/test'}}),localResult);
      assert.equal(gateCalls.length,before,'Null strategies use the native fallback too');
    }
  });
}

test('unrecognized or repeated AgentCompat constructors fail before patching', () => {
  assert.throws(()=>patchAgentHostRouting('unrecognized'),/anchor/);
  assert.throws(()=>patchAgentHostRouting(fixture('e','W6d').repeat(2)),/anchor/);
});
