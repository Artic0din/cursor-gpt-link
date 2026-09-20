import {GPT_PREFIX} from './subscription-prefix.mjs';

export const CURSOR_VERSION = '3.21.13';
export const SUBSCRIPTION_PREFIX = GPT_PREFIX;

export const workbench = {
  [CURSOR_VERSION]: {
    commit: 'e44a49c17e334d442e58bbde931d791200f014a0',
    features: {max: true, settings: true, lifecycle: true, actions: true, bubbles: true, model: true},
    desktop: {
      picker: {
        groupReturn: 'return c.mergeLeadingIntoPromotedSection===!0?{leading:[],promoted:[...ie,...ee],others:le}:{leading:ie,promoted:ee,others:le}',
        promotedAnchor: 'jP(smt,{models:B.promoted,title:c?.promotedSectionTitle',
        modelsVar: 'B', jsx: 'jP', fmt: 'smt', renderModel: 'x'
      },
      models: 'c',
      mapper: 'V=>DLt(V)',
      provider: 'async getLocalAgentProviderConfig(e,t){',
      model: 't?.requestedModel?.modelId??e?.modelId',
      local: 'zc',
      run: 'async run(e,t,n,i,r,s,o,a,c,l,u){const h=a6d(u,',
      native: 'qh(this.storageService,"useDedicatedLocalAgentRuntimeHost")',
      nativeModel: 'g',
      activation: 'function nhp(e){return zc.localMode&&e?.get(Ooy,-1)==="true"}',
      login: {register: '$e', baseClass: 'ct', notifier: 'si'},
      usage: {
        jsx: 'GIy', useState: 'Zur', useEffect: 'eIy', card: 'ob', zs: 'ks', bar: 'kA', barStyle: 'rdr',
        fn: 'function ZIy(e){const t=Obp(119)',
        children: 'title:"Plan & Usage",children:[sn,qt,dn,bn]',
        childrenClaude: 'title:"Plan & Usage",children:[sn,qt,dn,bn,GIy(__claudeUsageSection,{})]'
      }
    },
    glass: {
      picker: {
        groupReturn: 'return l.mergeLeadingIntoPromotedSection===!0?{leading:[],promoted:[...ne,...X],others:ie}:{leading:ne,promoted:X,others:ie}',
        promotedAnchor: 'Y5(e9t,{models:N.promoted,title:l?.promotedSectionTitle',
        modelsVar: 'N', jsx: 'Y5', fmt: 'e9t', renderModel: 'w'
      },
      models: 'l',
      mapper: 'U=>Von(U)',
      provider: 'async getLocalAgentProviderConfig(t,e){',
      model: 'e?.requestedModel?.modelId??t?.modelId',
      local: 'Rl',
      run: 'async run(t,e,n,i,r,s,o,a,l,c,u){const d=wum(u,',
      native: 'Rp(this.storageService,"useDedicatedLocalAgentRuntimeHost")',
      nativeModel: 'p',
      activation: 'function lNg(t){return Rl.localMode&&t?.get(fNg,-1)==="true"}',
      login: {register: 'Lt', baseClass: 'Qt', errorPrefix: 'ChatGPT-'},
      usage: {
        jsx: 'xik', useState: 'gds', useEffect: 'Eik', card: 'Pf', zs: 'Os', bar: 'Om', barStyle: 'EEi',
        fn: 'function Rik(t){const e=fBg(119)',
        children: 'title:"Plan & Usage",children:[pt,bt,gt,St]',
        childrenClaude: 'title:"Plan & Usage",children:[pt,bt,gt,St,xik(__claudeUsageSection,{})]'
      }
    }
  }
};

export function workbenchEntry(version = CURSOR_VERSION) {
  const entry = workbench[version];
  if (!entry) throw new Error('Unsupported Cursor version: ' + version);
  return entry;
}
