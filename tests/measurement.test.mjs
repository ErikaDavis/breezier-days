import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/analytics.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function storage(map = new Map()) { return { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k) }; }
function analytics(sessionStorage = storage(), localStorage = storage(), extras = {}) {
  const exports = {}, sent = [];
  vm.runInNewContext(code, { exports, sessionStorage, localStorage, ...extras });
  return { ...exports, sent, enable() { exports.setAnalyticsTransport((event, fields) => sent.push({ event, ...fields })); } };
}
test('no events, history or replay before consent; revocation stops immediately', () => {
  const session=storage(), a=analytics(session);
  a.startFeature('activities'); a.observeFeature('result_view','activities');
  assert.equal(a.sent.length,0); assert.equal(session.getItem('breezier-days.measurement.v2'),null);
  a.enable(); assert.equal(a.sent.length,0);
  a.startFeature('activities'); assert.equal(a.sent.length,1);
  const epoch=a.analyticsEpoch(); a.setAnalyticsTransport(null);
  a.track('idea_save','saved'); assert.equal(a.sent.length,1); assert.notEqual(a.analyticsEpoch(),epoch);
});
test('only fixed vocabulary leaves the browser; arbitrary properties and identity are discarded', () => {
  const a=analytics();a.enable();a.setAnalyticsContext('https://secret.test?email=x','bad');
  a.track('activity_try','growing_learning',{state:'marked',email:'a@b.test',child_id:42,question:'private',code:'raw failure',item_type:'private',account_state:'premium',action:'try'});
  assert.deepEqual(JSON.parse(JSON.stringify(a.sent[0])),{event:'activity_try',feature:'growing_learning',entry_point:'home',account_state:'premium',measurement_version:'2',traffic_type:'external',state:'marked',action:'try'});
  a.track('private_event','activities');a.track('feature_start','private_health_topic');assert.equal(a.sent.length,1);
});
test('views survive refresh without duplicates, while explicit reuse produces a new result', () => {
  const shared=storage();let a=analytics(shared);a.enable();a.startFeature('activities','request');
  a.observeFeature('feature_view','activities');a.observeFeature('result_view','activities');a.observeFeature('result_view','activities');
  assert.equal(a.sent.length,3);
  a=analytics(shared);a.enable();a.observeFeature('feature_view','activities');a.observeFeature('result_view','activities');assert.equal(a.sent.length,0);
  a.startFeature('activities','request');a.observeFeature('result_view','activities');assert.equal(a.sent.length,2);
});
test('conversion requires verification, consent and durable dedupe; no receipt is transmitted', () => {
  const local=storage(), receipt='a'.repeat(64);let a=analytics(storage(),local);
  a.recordVerifiedConversion(receipt,true);assert.equal(a.sent.length,0);
  a.enable();a.recordVerifiedConversion(receipt,false);a.recordVerifiedConversion('bad',true);assert.equal(a.sent.length,0);
  a.recordVerifiedConversion(receipt,true);a.recordVerifiedConversion(receipt,true);assert.equal(a.sent.length,1);
  assert.ok(!JSON.stringify(a.sent).includes(receipt));
  a=analytics(storage(),local);a.enable();a.recordVerifiedConversion(receipt,true);assert.equal(a.sent.length,0);
  a=analytics(storage(),{getItem(){return null;},setItem(){throw Error('blocked');}});a.enable();a.recordVerifiedConversion('b'.repeat(64),true);assert.equal(a.sent.length,0);
});

test('opening an existing result or failing a request cannot create a new success', () => {
  const a=analytics();a.enable();
  a.observeFeature('result_view','activities');
  a.startFeature('activities','open');a.observeFeature('result_view','activities');
  assert.equal(a.sent.filter(e=>e.event==='result_view').length,1);
  a.startFeature('activities','request');a.track('feature_error','activities',{code:'no_result'});
  a.observeFeature('result_view','activities');
  assert.equal(a.sent.filter(e=>e.event==='result_view').length,1);
  a.startFeature('activities','request');a.observeFeature('result_view','activities');
  assert.equal(a.sent.filter(e=>e.event==='result_view').length,2);
});
test('invisible, background, or overlay-obscured surfaces do not count as viewed', () => {
  let callback, mutation, modal=null;
  const element={isConnected:true,getAttribute:k=>k==='data-analytics-result'?'activities':null};
  const doc={visibilityState:'visible',body:{},querySelector:()=>modal,querySelectorAll:()=>[element],addEventListener(){},removeEventListener(){}};
  const a=analytics(storage(),storage(),{document:doc,IntersectionObserver:class { constructor(fn){callback=fn;}observe(){}unobserve(){}disconnect(){} },MutationObserver:class {constructor(fn){mutation=fn;}observe(){}disconnect(){}}});
  a.enable();const cleanup=a.observeAnalyticsSurfaces();assert.equal(a.sent.length,0);
  const entry={target:element,isIntersecting:true,intersectionRect:{height:200},boundingClientRect:{height:300}};
  doc.visibilityState='hidden';callback([entry]);assert.equal(a.sent.length,0);
  doc.visibilityState='visible';modal={contains:()=>false};mutation();assert.equal(a.sent.length,0);
  modal=null;mutation();assert.equal(a.sent.length,1);mutation();assert.equal(a.sent.length,1);cleanup();
});

test('v2 distinguishes automatic results, opens, requests and reuse',()=>{const a=analytics();a.enable();a.observeFeature('result_view','activities');a.startFeature('activities');a.startFeature('activities','request');a.observeFeature('result_view','activities');a.startFeature('activities','reuse');a.observeFeature('result_view','activities');a.observeFeature('saved_item_open','activities');assert.deepEqual(a.sent.filter(e=>e.event==='result_view').map(e=>e.result_kind),['automatic','requested','reused']);assert.equal(a.sent.filter(e=>e.event==='feature_start').length,1);assert.equal(a.sent.filter(e=>e.event==='feature_open').length,1);assert.equal(a.sent.filter(e=>e.event==='feature_reuse').length,1);});
test('new parameters are fixed vocabulary and never accept private input',()=>{const a=analytics();a.enable();a.track('premium_offer_view','premium',{offer_tool:'food-on-hand'});assert.equal(a.sent[0].offer_tool,'food-on-hand');a.track('today_interaction','today',{interaction:'weather_controls',offer_tool:'private child name',result_kind:'private answer'});assert.equal(a.sent[1].interaction,'weather_controls');assert.equal(a.sent[1].offer_tool,undefined);assert.equal(a.sent[1].result_kind,undefined);});
test('test traffic is opt-in on production and never overrides consent',()=>{const local=storage();const win={location:{hostname:'breezierdays.netlify.app',search:'?analytics_test=1'}};const a=analytics(storage(),local,{window:win,URLSearchParams});a.track('feature_view','today');assert.equal(local.getItem('breezier-days.analytics-test'),null);a.enable();a.track('feature_view','today');assert.equal(a.sent[0].traffic_type,'internal');assert.equal(a.sent[0].debug_mode,true);win.location.search='';a.track('feature_open','activities');assert.equal(a.sent[1].traffic_type,'internal');win.location.search='?analytics_test=0';a.track('feature_open','activities');assert.equal(a.sent[2].traffic_type,'external');assert.equal(a.sent[2].debug_mode,undefined);});

test('profile replacement cannot attribute automatic content to a previous request', () => {
  const a=analytics(); a.enable(); a.startFeature('activities','request');
  a.resetResultAttribution(); a.observeFeature('result_view','activities');
  assert.equal(a.sent.at(-1).result_kind,'automatic');
});

test('test flags and preview hosts remain internal if storage is blocked', () => {
  for (const location of [{hostname:'breezierdays.netlify.app',search:'?analytics_test=1'}, {hostname:'localhost',search:''}]) {
    const a=analytics(storage(),{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},{window:{location},URLSearchParams});
    a.enable(); a.track('feature_view','today'); assert.equal(a.sent[0].traffic_type,'internal');
  }
});
