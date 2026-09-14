import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {buildAutostart} from '../src/autostart.mjs';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
for(const seeded of [false,true]) test('autostart survives host exit: '+(seeded?'replace worker':'cold start'), {skip:process.platform!=='win32',timeout:30000}, async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bridge-autostart-'));
  const worker=path.join(dir,'worker.mjs'), pidFile=path.join(dir,'pid.txt');
  fs.writeFileSync(worker,'import fs from "node:fs";fs.writeFileSync('+JSON.stringify(pidFile)+',String(process.pid));setTimeout(()=>process.exit(0),25000);');
  let first,host;
  try {
    if(seeded){
      first=spawn(process.execPath,[worker],{windowsHide:true,stdio:'ignore'});
      for(let i=0;i<100&&!fs.existsSync(pidFile);i++)await delay(50);
      assert.ok(fs.existsSync(pidFile),'original worker started');
    }
    const hostPath=path.join(dir,'host.mjs');
    fs.writeFileSync(hostPath,'await '+buildAutostart({nodePath:process.execPath,bridgePath:worker,stateDir:dir})+'\nprocess.exit(0);');
    host=spawn(process.execPath,[hostPath],{windowsHide:true,stdio:'ignore'});
    const [code]=await once(host,'exit');
    assert.equal(code,0);
    let replacement;
    for(let i=0;i<400;i++){
      const pid=fs.existsSync(pidFile)?Number(fs.readFileSync(pidFile,'utf8')):0;
      if(pid&&pid!==first?.pid&&alive(pid)){replacement=pid;break;}
      await delay(50);
    }
    assert.ok(replacement,'new worker starts after its original host exits');
    if(first)assert.equal(alive(first.pid),false,'old worker stopped');
  } finally {
    if(host&&host.exitCode===null)host.kill();
    if(first&&alive(first.pid))first.kill();
    if(fs.existsSync(pidFile)){
      const pid=Number(fs.readFileSync(pidFile,'utf8'));
      if(pid&&alive(pid))process.kill(pid);
    }
    assert.equal(path.dirname(path.resolve(dir)),path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('bridge-autostart-'));
    fs.rmSync(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100});
  }
});
