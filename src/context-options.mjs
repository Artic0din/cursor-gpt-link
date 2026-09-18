// Use the subscription catalog's declared window. An API model's context limit
// or a larger experimental ceiling does not establish subscription availability.
export function validContextWindow(model) {
  const full=Number(model?.context_window);
  return Number.isSafeInteger(full)&&full>0;
}
export function contextSizes(model) {
  if(!validContextWindow(model))throw new Error('Model catalog has no valid context window.');
  const full=Number(model.context_window);
  return [...new Set([Math.min(200000,full),full])];
}
export const contextLabel=value=>value>=1000000?String(value/1000000)+'M':String(value/1000)+'K';
export function contextDefinition(sizes) {
  return {id:'context',name:'Context',markdownTooltip:'Choose the conversation context window. A larger window can use more of your subscription allowance and take longer. Reasoning effort and Fast are configured separately.',
    parameterType:{enumParameter:{values:sizes.map(value=>({value:String(value),displayName:contextLabel(value),modelPickerBadges:[]}))}}};
}
