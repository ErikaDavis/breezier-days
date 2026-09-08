import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/appUpdates.ts',import.meta.url),'utf8');
function setup({version='new-build',editing=false,online=true,query='',prior=null}={}) {
 let clock=1000000,reloads=0,requests=0;const timers=[];const listeners={};const storage=new Map(prior?[[ 'breezier-days.update-reload.v1',JSON.stringify(prior) ]]:[]);
 class Element {isConnected=true;value='draft';className=''; getClientRects(){return [1]} matches(){return true} setAttribute(){} append(){} addEventListener(){} remove(){} }
 const win={setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout(){},setInterval:fn=>(timers.push(fn),timers.length),clearInterval(){},addEventListener:(e,fn)=>listeners[e]=fn,removeEventListener(){}};
 const doc={visibilityState:'visible',activeElement:null,querySelector:()=>new Element(),querySelectorAll:()=>[],addEventListener:(e,fn)=>listeners[e]=fn,removeEventListener(){},createElement:()=>new Element(),body:{append(){}}};
 const ctx={exports:{},window:win,document:doc,navigator:{onLine:online},location:{search:query,hash:'',reload(){reloads++}},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},HTMLElement:Element,AbortController,Date:{now:()=>clock},fetch:async()=>{requests++;return {ok:true,headers:{get:()=> 'application/json'},json:async()=>({buildId:version})}}};
 vm.createContext(ctx);vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);
 const stop=ctx.exports.startAppUpdates('old-build'); if(editing)listeners.input({target:new Element()});
 return {run:async()=>{timers[0]();await new Promise(r=>setImmediate(r));},resume:async()=>{clock+=11000;listeners.focus();await new Promise(r=>setImmediate(r));},reloads:()=>reloads,requests:()=>requests,storage,stop,ctx};
}
test('new build reloads idle Home exactly once and touches only its own session key',async()=>{const a=setup();await a.run();await a.resume();assert.equal(a.reloads(),1);assert.deepEqual([...a.storage.keys()],['breezier-days.update-reload.v1']);});
test('same build, offline, drafts and auth/payment redirects never force a reload',async()=>{for(const options of [{version:'old-build'},{online:false},{editing:true},{query:'?session_id=checkout'}]){const a=setup(options);await a.run();assert.equal(a.reloads(),0);if(options.online===false)assert.equal(a.requests(),0)}});
test('stale response cannot create a reload loop and failed checks retry on resume',async()=>{const a=setup({prior:{buildId:'new-build',at:999999}});await a.run();assert.equal(a.reloads(),0);const b=setup();b.ctx.fetch=async()=>{throw Error('offline')};await b.run();assert.equal(b.reloads(),0);b.ctx.fetch=async()=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>({buildId:'new-build'})});await b.resume();assert.equal(b.reloads(),1)});
test('cleanup prevents future checks',async()=>{const a=setup();a.stop();await a.run();assert.equal(a.requests(),0)});
