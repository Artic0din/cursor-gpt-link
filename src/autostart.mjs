const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function bridgeCommandPattern(nodePath, bridgePath) {
  return '^"?' + escapeRegex(nodePath) + '"?\\s+"?' + escapeRegex(bridgePath) + '"?\\s*$';
}

export function buildAutostart({nodePath, bridgePath, stateDir}) {
  // Restart only this installation's worker, not other Node.js processes or
  // bridges installed in another state directory. The pattern is passed as an
  // argument to pkill (no shell), so paths containing quotes cannot become
  // shell instructions. Matching stays case-sensitive so only the exact
  // Node executable and bridge path are selected.
  const pattern = bridgeCommandPattern(nodePath, bridgePath);
  return `
/* cursor-chatgpt-bridge autostart (macOS 26+) */
import("node:child_process").then(({execFile:bridgeKill,spawn:bridgeSpawn})=>{
  const start=()=>{
    const child=bridgeSpawn(${JSON.stringify(nodePath)},[${JSON.stringify(bridgePath)}],{
      detached:true,stdio:"ignore",
      env:{...process.env,ELECTRON_RUN_AS_NODE:undefined,CURSOR_GPT_LINK_HOME:${JSON.stringify(stateDir)}}
    });
    child.on("error",()=>{});child.unref();
  };
  if(process.platform==="darwin")bridgeKill("pkill",["-f",${JSON.stringify(pattern)}],()=>start());
  else start();
});
`;
}
