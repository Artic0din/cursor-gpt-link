import {CURSOR_VERSION} from './patch-symbols.mjs';
import {buildVersionPatches} from './patch-orchestrator.mjs';

export function buildPatches(options) {
  return buildVersionPatches(options, CURSOR_VERSION);
}
