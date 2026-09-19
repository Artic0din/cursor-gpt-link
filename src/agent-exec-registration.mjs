export function patchAgentExecRegistration(source) {
  const marker = '/* subscription-agent-exec-provider */';
  if (source.includes(marker)) return source;
  const before = 'activate:ql,deactivate:Nl';
  const after = 'activate:(context,options)=>ql(context,{...options,registerAgentExecProvider:true}),deactivate:Nl';
  if (source.split(before).length !== 2) throw new Error('Agent-exec activation anchor is not unique: '+before);
  return marker+'\n'+source.replace(before,after);
}
