import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function functionSource(name) {
  let found;
  const visit = n => { if (ts.isVariableDeclaration(n) && n.name.getText(ast) === name) found = n.initializer?.getText(ast); ts.forEachChild(n, visit); };
  visit(ast); assert.ok(found,name); return found;
}
function evaluate(name, context) {
  const code=ts.transpileModule('globalThis.fn = '+functionSource(name),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInContext(code,context);return context.fn;
}

test('shared guidance result retains personalized request attribution and excludes loading', () => {
  let expression;
  const visit=n=>{
    if(ts.isJsxOpeningElement(n) && n.tagName.getText(ast)==='section') {
      const attrs=n.attributes.properties;
      if(attrs.some(a=>a.name?.getText(ast)==='tabIndex') && attrs.some(a=>a.name?.getText(ast)==='ref' && a.initializer?.getText(ast)==='{contentRef}')) {
        expression=attrs.find(a=>a.name?.getText(ast)==='data-analytics-result')?.initializer?.expression?.getText(ast);
      }
    }
    ts.forEachChild(n,visit);
  };
  visit(ast);assert.ok(expression);
  const c=vm.createContext({routedHelpResult:{},justTellMeLoading:false,selectedHelp:'help-now',helpFeature:()=> 'practical_help'});
  assert.equal(vm.runInContext(expression,c),'personalized_help');
  c.justTellMeLoading=true;assert.equal(vm.runInContext(expression,c),undefined);
  c.routedHelpResult=null;assert.equal(vm.runInContext(expression,c),'practical_help');
});
test('save emits only after successful persistence, never hydration, duplicates or rejected storage', () => {
  const sent=[], queue=[];let records=[];
  const context=vm.createContext({savedIdeas:records,checkSavedIdeaLimit:()=>true,
    afterStored:(_bucket,fn)=>queue.push(fn),track:(...args)=>sent.push(args),itemType:()=> 'activity',
    setSavedIdeas:fn=>{records=fn(records);context.savedIdeas=records;},setRecentlySavedAnswer(){},setSavedAnswerToast(){},
    savedAnswerTimeoutRef:{current:null},window:{setTimeout:()=>1,clearTimeout(){}}});
  const save=evaluate('saveIdea',context);
  save({title:'Synthetic QA',category:'Activity',description:'private input must stay local'});
  assert.equal(records.length,1);assert.equal(sent.length,0);assert.equal(queue.length,1);
  queue.shift()(); assert.equal(sent[0][0],'idea_save');assert.ok(!JSON.stringify(sent).includes('private'));
  save({title:'Synthetic QA',category:'Activity'});assert.equal(records.length,1);assert.equal(queue.length,0);
  const state=vm.createContext({pendingMeasurements:{current:[{bucket:'ideas',epoch:2,emit:()=>sent.push(['success'])}]},analyticsEpoch:()=>2,track:(...args)=>sent.push(args)});
  const flush=evaluate('storedMeasurements',state);flush('ideas',false);assert.equal(sent.at(-1)[0],'feature_error');
  flush('ideas',true);assert.equal(sent.length,2,'rerender/hydration cannot emit another save');
  state.pendingMeasurements.current=[{bucket:'ideas',epoch:1,emit:()=>sent.push(['stale'])}];flush('ideas',true);assert.equal(sent.length,2,'consent-withdrawn work cannot replay');
});
test('authentication events follow successful responses, never session restoration or failed signup', async () => {
  for (const [mode,result,expected] of [
    ['sign-in',{user:{id:'private'},error:null},'login'],
    ['sign-in',{user:null,error:'private email'},null],
    ['sign-up',{user:{id:'private'},created:true,confirmationRequired:true,error:null},'sign_up'],
    ['sign-up',{user:{id:'private'},created:false,confirmationRequired:true,error:null},null],
    ['sign-up',{user:null,error:'private error'},null],
  ]) {
    const sent=[];
    const c=vm.createContext({premiumAuthEmail:'private@example.test',premiumAuthPassword:'private',premiumAuthMode:mode,
      signInToPremium:async()=>result,createPremiumAccount:async()=>result,track:(...args)=>sent.push(args),
      setCheckoutLoading(){},setPremiumAuthMessage(){},setPremiumAuthMode(){},setPremiumAuthPassword(){},setPremiumUser(){}});
    await evaluate('submitPremiumAuth',c)();
    assert.deepEqual(sent.filter(e=>e[0]==='sign_up'||e[0]==='login').map(e=>e[0]),expected?[expected]:[]);
    assert.ok(!JSON.stringify(sent).includes('private'));
  }
});
test('sync remains local-first and never sends stored profiles to analytics', () => {
  const moduleSource=readFileSync(new URL('../src/useCloudSync.ts',import.meta.url),'utf8');
  const state=[], effects=[];let index=0;
  const store=new Map([['breezier-days-sync-passcode','private-code'],['breezier-days-remote-data',JSON.stringify({children:[{name:'Private'}]})]]);
  const react={useState(initial){const i=index++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return[state[i],v=>state[i]=typeof v==='function'?v(state[i]):v];},useEffect(fn){effects.push(fn);},useCallback:fn=>fn,useMemo:fn=>fn()};
  const exports={};vm.runInNewContext(ts.transpileModule(moduleSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:()=>react,window:{localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}},crypto:globalThis.crypto});
  const render=()=>{index=0;const result=exports.useCloudSync();effects.splice(0).forEach(fn=>fn());return result;};
  let result=render();assert.equal(result.syncPasscode,'private-code');assert.equal(result.remoteData.children[0].name,'Private');
  result.schedulePush();result=render();assert.equal(result.syncState,'synced');assert.equal(result.remoteData.children[0].name,'Private');
});
