import test from 'node:test';
import assert from 'node:assert/strict';
import {patchAgentExecRegistration} from '../src/agent-exec-registration.mjs';

const fixture = `const Al={};var Ul;
const Fl={activate:(Ul={state:Al,activate:ql,deactivate:Nl}).activate,deactivate:Ul.deactivate};
let Ll=!1;async function $l(e){if(G.cursor.cursorAgentHostEnabled){const n=(t=Fl,r=e.extensionPath,{...t,extensionPath:r});e.subscriptions.push(G.cursor.registerAgentHostRuntime(n));if(function(e){return e.localLoopEnabled&&!e.moveExecEnabled}({moveExecEnabled:await Promise.resolve(G.cursor.checkFeatureGate(El)).catch(()=>!1),localLoopEnabled:await Promise.resolve(G.cursor.checkFeatureGate(Il)).catch(()=>!1)})){const{disposeProvider:t}=$a({context:e,runtimeExtensionPath:e.extensionPath,serviceCtx:(0,f.q6)()});e.subscriptions.push({dispose:t})}return}var t,r;G.cursor.cursorAgentHostEnabled||(await ql(e),Ll=!0)}
async function jl(){Ll&&(Ll=!1,await Nl())}`;

function runtime({hostEnabled,moveExec,localLoop=false}) {
  const activations=[],registrations=[],disposals=[];
  const cursor={cursorAgentHostEnabled:hostEnabled,
    checkFeatureGate:async gate=>gate==='move-exec'?moveExec:localLoop,
    registerAgentHostRuntime:handle=>{registrations.push(handle);return {dispose(){}};}};
  const activate=async(context,options={})=>{
    const provider=options.registerAgentExecProvider!==false;
    activations.push({context,options,provider});
    if(provider)context.subscriptions.push({dispose(){}},{dispose(){}});
  };
  const functions=new Function('G','ql','Nl','$a','El','Il','f',patchAgentExecRegistration(fixture)+';return {activate:$l,deactivate:jl};')(
    {cursor},activate,async()=>{disposals.push(true);},()=>({disposeProvider(){}}),'move-exec','local-loop',{q6:()=>({})});
  return {...functions,activations,registrations,disposals};
}

test('host owns activation context and injected options when move-exec is off', async () => {
  const env=runtime({hostEnabled:true,moveExec:false});
  const extension={extensionPath:'/synthetic/exec',subscriptions:[]};
  await env.activate(extension);
  assert.equal(env.activations.length,0);
  assert.equal(env.registrations.length,1);
  const context={extensionPath:'/synthetic/host',subscriptions:[]};
  const options={registerAgentExecProvider:false,runtimeExtensionPath:extension.extensionPath,gitExecutor:{},mcpProvider:{}};
  await env.registrations[0].activate(context,options);
  assert.equal(env.activations.length,1);
  assert.strictEqual(env.activations[0].context,context);
  assert.deepEqual(env.activations[0].options,{...options,registerAgentExecProvider:true});
  assert.strictEqual(env.activations[0].options.gitExecutor,options.gitExecutor);
  assert.strictEqual(env.activations[0].options.mcpProvider,options.mcpProvider);
  assert.equal(env.activations[0].provider,true);
  assert.equal(options.registerAgentExecProvider,false);
  assert.equal(context.subscriptions.length,2);
  await env.deactivate();assert.equal(env.disposals.length,0);
  await env.registrations[0].deactivate();assert.equal(env.disposals.length,1);
});

test('independent host modes never initialize the legacy runtime or take its cleanup ownership', async () => {
  for(const [moveExec,localLoop] of [[true,false],[false,true],[true,true]]){
    const env=runtime({hostEnabled:true,moveExec,localLoop}),context={extensionPath:'/synthetic/exec',subscriptions:[]};
    await env.activate(context);
    assert.equal(env.activations.length,0,'The independent host already owns IDE providers and commands');
    assert.equal(env.registrations.length,1);
    await env.deactivate();
    assert.equal(env.disposals.length,0);
  }
});

test('host-disabled mode retains native activation and cleanup even with independent gates enabled', async () => {
  for(const [moveExec,localLoop] of [[false,false],[true,false],[false,true],[true,true]]){
    const env=runtime({hostEnabled:false,moveExec,localLoop}),context={extensionPath:'/synthetic/exec',subscriptions:[]};
    await env.activate(context);
    assert.equal(env.activations.length,1);
    assert.strictEqual(env.activations[0].context,context);
    assert.equal(env.activations[0].provider,true);
    assert.equal(env.registrations.length,0);
    await env.deactivate();await env.deactivate();
    assert.equal(env.disposals.length,1);
  }
});

test('companion application is idempotent and changed activation anchors fail closed', () => {
  const patched=patchAgentExecRegistration(fixture);
  assert.equal(patchAgentExecRegistration(patched),patched);
  assert.throws(()=>patchAgentExecRegistration('unknown'),/anchor/);
  assert.throws(()=>patchAgentExecRegistration(fixture.repeat(2)),/anchor/);
});
