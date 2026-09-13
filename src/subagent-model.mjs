// An empty optional Task model means no explicit selection. Keep the native
// resolver in charge of inheritance, defaults, forced models and access checks.
export function normalizeChatgptSubagentModel(options) {
  if(typeof options.parentModelId !== 'string' || !options.parentModelId.startsWith('chatgpt-codex/') || typeof options.requestedModel !== 'string' || options.requestedModel.trim() !== '') return options;
  return {...options,requestedModel:undefined};
}
export function patchSubagentModel(source) {
  const anchor='const{subagentConfig:t,requestedModel:n,parentModelId:r';
  if(source.split(anchor).length!==2)throw new Error('Subagent model resolver anchor is not unique');
  if(source.includes('__normalizeChatgptSubagentModel'))throw new Error('Subagent model patch already present');
  return source.replace(anchor,'e=__normalizeChatgptSubagentModel(e);'+anchor)+'\n'+normalizeChatgptSubagentModel.toString().replace('function normalizeChatgptSubagentModel','function __normalizeChatgptSubagentModel')+'\n';
}
