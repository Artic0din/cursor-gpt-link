// An empty optional Task model means no explicit selection. Keep the native
// resolver in charge of inheritance, defaults, forced models and access checks.
export function normalizeChatgptSubagentModel(options) {
  if(typeof options.parentModelId !== 'string' || !options.parentModelId.startsWith('chatgpt-codex/') || typeof options.requestedModel !== 'string' || options.requestedModel.trim() !== '') return options;
  return {...options,requestedModel:undefined};
}
export function patchSubagentModel(source) {
  // Cursor 3.21.1 rotated the minified locals in both runtime bundles.
  const matches=[...source.matchAll(/const\{subagentConfig:[\w$]+,requestedModel:[\w$]+,parentModelId:[\w$]+/g)];
  if(matches.length!==1)throw new Error('Subagent model resolver anchor is not unique');
  const anchor=matches[0][0];
  if(source.includes('__normalizeChatgptSubagentModel'))throw new Error('Subagent model patch already present');
  return source.replace(anchor,'e=__normalizeChatgptSubagentModel(e);'+anchor)+'\n'+normalizeChatgptSubagentModel.toString().replace('function normalizeChatgptSubagentModel','function __normalizeChatgptSubagentModel')+'\n';
}
