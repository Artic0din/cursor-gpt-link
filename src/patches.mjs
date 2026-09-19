import {supportedBuild} from './supported-builds.mjs';
import {CURSOR_VERSION} from './patch-symbols.mjs';
import {buildPatches as buildCurrent} from './patches-3.21.12.mjs';

const builders = {[CURSOR_VERSION]: buildCurrent};

export function buildPatches(options) {
  const build = supportedBuild(options.root);
  const builder = builders[build.version];
  if (!builder) throw new Error('No patch definitions for Cursor ' + build.version);
  return builder(options);
}
