// Cursor 3.20.17 can dispatch a local subagent before its legacy Task bubble
// exists in the Agents Window. Materialize that bubble through ToolFormer so
// the normal parent-linking barrier can observe it. Never signal a fake bubble.
export function ensureChatgptTaskBubble(service, request, parent, taskType, Params, capabilityType) {
  if (!parent || typeof request.modelId !== 'string' || !request.modelId.startsWith('chatgpt-codex/')) return;
  request.abortSignal?.throwIfAborted();
  const model = parent.data?.modelConfig;
  const ids = [model?.modelName, ...(model?.selectedModels ?? []).map(entry => entry.modelId)];
  if (!ids.some(id => typeof id === 'string' && id.startsWith('chatgpt-codex/'))) return;
  service.loadComposerCapabilities?.(parent);
  const toolFormer = service.getComposerCapability(parent, capabilityType);
  if (!toolFormer || toolFormer.getBubbleIdByToolCallId(request.toolCallId) !== undefined) return;
  const name = request.subagentType || 'general-purpose';
  toolFormer.getOrCreateBubbleId({
    toolCallId:request.toolCallId, toolIndex:0, modelCallId:'', toolCallType:taskType, name:'task_v2',
    params:{case:'taskV2Params', value:new Params({description:name, prompt:request.prompt ?? '',
      subagentType:name, name, model:request.modelId, mode:request.mode})}
  });
}

export function patchSubagentBubbles(source, surface, version = '3.20.17') {
  const desktop = surface === 'desktop';
  if (!desktop && surface !== 'glass') throw new Error('Unknown workbench surface');
  const request = desktop ? 'e' : 't', parent = desktop ? 't' : 'e';
  if (!['3.20.17','3.20.21'].includes(version)) throw new Error('Unsupported subagent bubble version');
  const current = version === '3.20.21';
  const trim = current ? (desktop ? 'FK' : 'Ioe') : (desktop ? 'BK' : 'Roe');
  const anchor = 'async _waitForParentTaskBubbleIfPossible('+request+'){const '+parent+'='+trim+'('+request+'.parentConversationId),n='+trim+'('+request+'.toolCallId);if(!'+parent+'||!n)return;const i=this._composerDataService.getHandleIfLoaded('+parent+');';
  if (source.split(anchor).length !== 2) throw new Error('Subagent bubble anchor is not unique: '+surface);
  const call = '__ensureChatgptTaskBubble(this._composerDataService,'+request+',i,'+(current ? (desktop?'Xe.TASK_V2,UBe,Xr.TOOL_FORMER':'vt.TASK_V2,L7e,Zs.TOOL_FORMER') : (desktop?'Xe.TASK_V2,$Be,Xr.TOOL_FORMER':'vt.TASK_V2,O7e,Zs.TOOL_FORMER'))+');';
  return ensureChatgptTaskBubble.toString().replace('function ensureChatgptTaskBubble','function __ensureChatgptTaskBubble')+'\n'+source.replace(anchor,anchor+call);
}
