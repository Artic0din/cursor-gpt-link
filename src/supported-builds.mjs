import fs from 'node:fs';
import path from 'node:path';
import {CURSOR_VERSION} from './patch-symbols.mjs';

export {CURSOR_VERSION};

export function supportedBuild(root){
 const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
 if(version!==CURSOR_VERSION)throw new Error('Unsupported Cursor version: '+version);
 const build=JSON.parse(fs.readFileSync(new URL('supported-build-'+CURSOR_VERSION+'.json',import.meta.url),'utf8'));
 if(build.platform!=='darwin'||build.arch!=='arm64')throw new Error('Cursor '+version+' has no verified macOS arm64 metadata. Capture hashes from an original Mac app with scripts/capture-hashes.mjs.');
 const product=JSON.parse(fs.readFileSync(path.join(root,'product.json'),'utf8'));
 if(product.commit!==build.commit)throw new Error('Unsupported Cursor commit.');
 return build;
}
