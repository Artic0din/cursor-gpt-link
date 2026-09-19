// AgentCompat can receive an Agent Host strategy that bypasses the local client.
// Keep its lifecycle and native dispatch for every other model.
export function chatgptTurnStrategy(strategy, local, prefix, isIndependentHost) {
  return new Proxy(strategy, {
    get(target, property) {
      if (property === 'executeTurn') return turn => {
        const model = turn.runOptions?.requestedModel?.modelId ?? turn.modelDetails?.modelId;
        if (typeof model !== 'string' || !model.startsWith(prefix)) return target.executeTurn(turn);
        if (isIndependentHost()) return Promise.reject(new Error("Subscription models are temporarily unsupported in Cursor's independent Agent Host runtime."));
        return local.executeTurn(turn);
      };
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

export function patchAgentHostRouting(source) {
  const matches = [...source.matchAll(/([\w$]+)\?\.executionStrategy\?\?new ([\w$]+)\(this\.agentClientService\)/g)];
  if (matches.length !== 1) throw new Error('AgentCompat execution strategy anchor is not unique');
  const [anchor, options, Native] = matches[0];
  const independentHost = '()=>'+options+'?.executionStrategy!=null&&(this.experimentService.checkFeatureGate("cursor_agent_host_move_exec",{disableExposureLog:!0})||this.experimentService.checkFeatureGate("agent_host_local_loop",{disableExposureLog:!0}))';
  const patched = source.replace(anchor, '__ChatgptTurnStrategy(' + anchor + ',new ' + Native + '(this.agentClientService),"chatgpt-codex/",'+independentHost+')');
  return chatgptTurnStrategy.toString().replace('function chatgptTurnStrategy', 'function __ChatgptTurnStrategy') + '\n' + patched;
}
