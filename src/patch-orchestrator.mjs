import {patchConversationActionsWorkbench, patchConversationActionsRuntime} from './conversation-actions.mjs';
import {patchAgentHostRouting} from './agent-host-routing.mjs';
import {patchAgentExecRegistration} from './agent-exec-registration.mjs';
import {patchSubagentLifecycle} from './subagent-lifecycle.mjs';
import {patchMaxMode} from './max-mode.mjs';
import {patchSubagentSettingsWorkbench, patchSubagentSettingsRuntime} from './subagent-settings.mjs';
import {patchSubagentModel} from './subagent-model.mjs';
import {patchSubagentBubbles} from './subagent-bubbles.mjs';
import {buildAutostart} from './autostart.mjs';
import {usageSectionSrc} from './usage-section.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {patchRemoteRouting} from './remote-routing.mjs';
import {pickerSectionHelpersSrc, patchPickerSections} from './picker-sections.mjs';
import {SUBSCRIPTION_PREFIX, workbenchEntry} from './patch-symbols.mjs';

export function replaceOnce(source, from, to) {
  if (source.split(from).length !== 2) throw new Error('Patch anchor not unique: ' + from.slice(0, 100));
  return source.replace(from, to);
}

function wrapGetter(source) {
  if (/getAvailableDefaultModels\(\)\{return __withChatgptBridgeModels\(/.test(source)) return source;
  const getter = source.includes('return __withClaudeBridgeModels([...this._availableDefaultModels()])')
    ? 'getAvailableDefaultModels(){return __withClaudeBridgeModels([...this._availableDefaultModels()])}'
    : 'getAvailableDefaultModels(){return[...this._availableDefaultModels()]}';
  return replaceOnce(source, getter, getter.replace(/return\s*(.+)}/, 'return __withChatgptBridgeModels($1)}'));
}

function wrapMap(source, surface) {
  const models = surface.models, mapper = surface.mapper;
  const gpt = models + '=__withChatgptBridgeModels(' + models + ').map(' + mapper + ')';
  const nested = models + '=__withChatgptBridgeModels(__withClaudeBridgeModels(' + models + ')).map(' + mapper + ')';
  if (source.includes(gpt) || source.includes(nested) || source.includes('__withClaudeBridgeModels(__withChatgptBridgeModels(')) return source;
  const claude = models + '=__withClaudeBridgeModels(' + models + ').map(' + mapper + ')';
  if (source.includes(claude)) return replaceOnce(source, claude, nested);
  return replaceOnce(source, models + '=' + models + '.map(' + mapper + ')', gpt);
}

function addUsage(source, usage) {
  if (!source.includes('function __chatgptUsageSection')) source = replaceOnce(source, usage.fn, usageSectionSrc(usage) + usage.fn);
  if (source.includes(usage.jsx + '(__chatgptUsageSection,{})')) return source;
  const children = source.includes(usage.childrenClaude) ? usage.childrenClaude : usage.children;
  return replaceOnce(source, children, children.slice(0, -1) + ',' + usage.jsx + '(__chatgptUsageSection,{})]');
}

export function patchLocalBridgeMode(source, surface) {
  const chatgptLocal = 'const __chatgptLocal=__isChatgptBridgeModel(u?.requestedModel?.modelId??i?.modelId);';
  const claudeCheck = '__isClaudeBridgeModel(u?.requestedModel?.modelId??i?.modelId)';
  if (source.includes(chatgptLocal)) {
    if (!source.includes(claudeCheck)) {
      return replaceOnce(source, chatgptLocal, chatgptLocal.replace(';', '||(typeof __isClaudeBridgeModel==="function"&&' + claudeCheck + ');'));
    }
    return source;
  }
  if (source.includes('const __claudeLocal=' + claudeCheck + ';')) {
    source = replaceOnce(source, 'const __claudeLocal=' + claudeCheck + ';',
      'const __claudeLocal=' + claudeCheck + ';' + chatgptLocal);
    return source.replaceAll('||__claudeLocal', '||__claudeLocal||__chatgptLocal');
  }
  const before = surface.run;
  const after = before.replace('{const ', '{const __chatgptLocal=__isChatgptBridgeModel(u?.requestedModel?.modelId??i?.modelId);const ');
  source = replaceOnce(source, before, after);
  return replaceOnce(source,
    'localMode:' + surface.local + '.localMode});if(' + surface.local + '.localMode){',
    'localMode:' + surface.local + '.localMode||__chatgptLocal});if(' + surface.local + '.localMode||__chatgptLocal){');
}

function loginCommand({register, baseClass, notifier, errorPrefix}) {
  const title = '{value:"ChatGPT: Sign in (subscription)",original:"ChatGPT: Sign in (subscription)"}';
  const fetchLogin = 'const r=await fetch(__chatgptBridgeBase+"/login",{method:"POST",headers:{Authorization:"Bearer "+__chatgptBridgeKey}})';
  if (notifier) {
    return '\n' + register + '(class extends ' + baseClass + '{constructor(){super({id:"cursor.chatgpt.login",title:' + title + ',f1:!0})}async run(e){try{' + fetchLogin + ';if(!r.ok)throw new Error("Could not start sign-in");e.get(' + notifier + ').info("Complete ChatGPT sign-in in your browser, then reload the Cursor window.")}catch(error){e.get(' + notifier + ').error("Cannot reach the ChatGPT connection. Restart Cursor.")}}});\n';
  }
  return '\n' + register + '(class extends ' + baseClass + '{constructor(){super({id:"cursor.chatgpt.login",title:' + title + ',f1:!0})}async run(){' + fetchLogin + ';if(!r.ok)throw new Error("' + (errorPrefix ?? '') + 'Could not start sign-in")}});\n';
}

export function wrapRuntime(runtime) {
  if (runtime.includes('t.startsWith("chatgpt-codex/")')) return runtime;
  const anchor = runtime.match(/\}\(([\w$]+)\);if\(typeof t==="string"&&t\.startsWith\("claude-subscription\/"\)/)
    ?? runtime.match(/\}\(([\w$]+)\);if\(void 0===a\)return;if\(void 0!==i&&"openai_compatible"===[\w$]+\)/);
  if (!anchor) throw new Error('Reasoning effort anchor missing');
  const params = anchor[1];
  const gpt = '}(' + params + ');if(typeof t==="string"&&t.startsWith("chatgpt-codex/")){const selected=' + params + '?.find(p=>p.id==="reasoning")?.value;if(selected!==undefined){e.reasoning={...e.reasoning,effort:selected};delete e.reasoning_effort}const fast=' + params + '?.find(p=>p.id==="fast")?.value;if(fast==="true")e.service_tier="priority";else delete e.service_tier;return}';
  return replaceOnce(runtime, anchor[0], gpt + anchor[0].slice(('}(' + params + ');').length));
}

export const patchRuntimeReasoning = wrapRuntime;

function patchWorkbenchSurface(source, surfaceName, anchors, features, prefix, version, prelude) {
  const surface = anchors[surfaceName];
  source = prelude + source;
  source = wrapGetter(source);
  source = replaceOnce(source, 'async refreshDefaultModels(){', 'async refreshDefaultModels(){await __refreshChatgptBridgeModels();');
  source = wrapMap(source, surface);
  source = patchPickerSections(source, replaceOnce, surface.picker);
  source = replaceOnce(source, surface.provider,
    surface.provider + 'if(__isChatgptBridgeModel(' + surface.model + '))return{baseUrl:__chatgptBridgeBase+"/v1",apiKey:__chatgptBridgeKey,customHeaders:{}};');
  source = patchLocalBridgeMode(source, surface);
  source = patchAgentHostRouting(source);
  source += loginCommand(surface.login);
  source = addUsage(source, surface.usage);
  source = patchRemoteRouting(source, surfaceName, version);
  if (features.max) source = patchMaxMode(source, prefix);
  if (features.settings) source = patchSubagentSettingsWorkbench(source, prefix);
  if (features.bubbles) source = patchSubagentBubbles(source, surfaceName, version);
  if (features.lifecycle) source = patchSubagentLifecycle(source, surfaceName, prefix, version);
  if (features.actions) source = patchConversationActionsWorkbench(source, surfaceName, prefix);
  return source;
}

export function buildVersionPatches({root, cfg, models, nodePath, bridgePath, stateDir}, version) {
  const anchors = workbenchEntry(version);
  const features = anchors.features;
  const prefix = SUBSCRIPTION_PREFIX;
  const pending = [];
  const base = 'http://127.0.0.1:' + cfg.port;
  const prelude = `\n/* cursor-chatgpt-bridge 0.1.3: account credentials stay in local bridge */\nvar __chatgptBridgeModels=${JSON.stringify(models)};\nconst __chatgptBridgeBase=${JSON.stringify(base)},__chatgptBridgeKey=${JSON.stringify(cfg.key)};\nfunction __isChatgptBridgeModel(m){return typeof m==="string"&&m.startsWith(${JSON.stringify(prefix)})}\nfunction __withChatgptBridgeModels(models){return [...models.filter(m=>!__isChatgptBridgeModel(m.name)),...__chatgptBridgeModels]}\nasync function __refreshChatgptBridgeModels(){try{const r=await fetch(__chatgptBridgeBase+"/picker-models",{headers:{Authorization:"Bearer "+__chatgptBridgeKey},signal:AbortSignal.timeout(2500)});if(r.ok){const data=await r.json();if(Array.isArray(data.models))__chatgptBridgeModels=data.models}}catch{}}\n${pickerSectionHelpersSrc}\n`;
  for (const surfaceName of ['desktop', 'glass']) {
    const workbenchPath = path.join(root, 'out/vs/workbench/workbench.' + surfaceName + '.main.js');
    pending.push({
      path: workbenchPath,
      content: patchWorkbenchSurface(fs.readFileSync(workbenchPath, 'utf8'), surfaceName, anchors, features, prefix, version, prelude)
    });
  }
  for (const relative of ['extensions/cursor-agent-exec/dist/main.js', 'extensions/cursor-local-agent-runtime/dist/main.js']) {
    let source = wrapRuntime(fs.readFileSync(path.join(root, relative), 'utf8'));
    if (features.model) source = patchSubagentModel(source);
    if (features.settings) source = patchSubagentSettingsRuntime(source, prefix);
    if (features.actions) source = patchConversationActionsRuntime(source, prefix);
    if (relative === 'extensions/cursor-agent-exec/dist/main.js') source = patchAgentExecRegistration(source);
    pending.push({path: path.join(root, relative), content: source});
  }
  const mainPath = path.join(root, 'out/main.js');
  pending.push({path: mainPath, content: fs.readFileSync(mainPath, 'utf8') + buildAutostart({nodePath, bridgePath, stateDir})});
  const productPath = path.join(root, 'product.json');
  const product = JSON.parse(fs.readFileSync(productPath, 'utf8'));
  const desktop = pending.find(file => file.path.endsWith('workbench.desktop.main.js'));
  product.checksums['vs/workbench/workbench.desktop.main.js'] = crypto.createHash('sha256').update(desktop.content).digest('base64').replace(/=+$/, '');
  pending.push({path: productPath, content: JSON.stringify(product, null, 2)});
  return pending;
}
