export const CREATE_AGENT_ROUTE = /async createAgent\(([\w$]+),([\w$]+),([\w$]+)\)\{const ([\w$]+)=this\.resolveEnvironmentRepo\(\2\)/;

export const remoteControlPrelude = `
function __subscriptionRemoteControlEnvironment(environment, options) {
  if (!environment || environment.type !== "new" || environment.environment?.usePrivateWorker !== true) return environment;
  const models = [options?.modelConfig?.modelName, ...(options?.modelConfig?.selectedModels ?? []).map(model => model?.modelId)];
  if (!models.some(model => typeof model === "string" && (model.startsWith("chatgpt-codex/") || model.startsWith("claude-subscription/")))) return environment;
  const local = environment.environment.privateWorkspaceIdentifier ?? options?.privateWorkspaceIdentifier;
  if (local === undefined) return environment;
  return {type: "existing", environment: local};
}
`;

export function patchRemoteControlRouting(source, surfaceName) {
  if (source.includes('function __subscriptionRemoteControlEnvironment(')) return source;
  const matches = [...source.matchAll(new RegExp(CREATE_AGENT_ROUTE.source, 'g'))];
  if (matches.length === 0) {
    if (surfaceName === 'glass') throw new Error('Remote Control createAgent routing anchor missing');
    return source;
  }
  if (matches.length !== 1) throw new Error('Remote Control createAgent routing anchor not unique');
  const [match] = matches;
  const [, prompt, environment, options, repo] = match;
  const patched = 'async createAgent(' + prompt + ',' + environment + ',' + options + '){' +
    environment + '=__subscriptionRemoteControlEnvironment(' + environment + ',' + options + ');const ' + repo +
    '=this.resolveEnvironmentRepo(' + environment + ')';
  return remoteControlPrelude + source.replace(match[0], patched);
}
