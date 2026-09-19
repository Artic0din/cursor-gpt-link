import {workbenchEntry} from './patch-symbols.mjs';

export const remoteRoutingPrelude = `
function __useChatgptDedicatedRuntime(model, remoteAuthority) {
  return __isChatgptBridgeModel(model) && typeof remoteAuthority === "string" && remoteAuthority.length > 0;
}
`;

export function spelledAnchors(surface) {
  return {
    selector: surface.native + '?',
    selection: '(__useChatgptDedicatedRuntime(' + surface.nativeModel + ',this.environmentService.remoteAuthority)||' + surface.native + ')?',
    activation: surface.activation,
    enabled: surface.activation.replace('return ', 'return typeof __chatgptBridgeBase==="string"||')
  };
}

export function patchRemoteRouting(source, surface, version) {
  if (version == null) throw new Error('Unsupported routing version');
  const row = workbenchEntry(version)[surface];
  if (!row) throw new Error('Unknown workbench surface: ' + surface);
  const anchors = spelledAnchors(row);
  for (const [before, after] of [[anchors.selector, anchors.selection], [anchors.activation, anchors.enabled]]) {
    if (source.split(before).length !== 2) throw new Error('Remote routing anchor not unique: ' + surface + ': ' + before);
    source = source.replace(before, after);
  }
  return remoteRoutingPrelude + source;
}
