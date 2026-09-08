import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const cache={};function load(name){if(cache[name])return cache[name];const m={exports:{},require:load};vm.createContext(m);vm.runInContext(ts.transpileModule(readFileSync(new URL('../src/'+name.replace('./','')+'.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,m);return cache[name]=m.exports;}
const {goodForToday}=load('./goodForToday');
const mild={date:'2026-09-08',high:70,low:50,code:0,rain:0,wind:5};
test('one concise nudge changes daily without location or weather',()=>{let last='';for(let i=0;i<366;i++){const result=goodForToday(new Date(2026,0,i+1));assert.notEqual(result,last);assert.ok(result.length<180);last=result}});
test('weekdays offer flexible schedules rather than assuming daytime availability',()=>{for(let i=0;i<40;i++){const date=new Date(2026,8,i+1);if([0,6].includes(date.getDay()))continue;const text=goodForToday(date,mild);assert.match(text,/pickup|work|school|daycare|dinner|reconnect/);assert.doesNotMatch(text,/nice evening|rain later|before lunch/i)}});
test('adverse forecasts do not produce outings or seasonal outdoor nudges',()=>{for(const forecast of [{...mild,code:95},{...mild,high:99},{...mild,wind:30},{...mild,low:10}]){for(let i=0;i<30;i++){assert.match(goodForToday(new Date(2026,9,i+1),forecast,40),/indoor|home|bedtime/);}}});
test('seasonal nudges respect hemisphere and do not assume seasons for unknown or tropical locations',()=>{let seasonal=0;for(let i=0;i<31;i++){const d=new Date(2026,9,i+1);const north=goodForToday(d,null,40),south=goodForToday(d,null,-40);if(/leaves|pumpkin/.test(north)){seasonal++;assert.match(south,/leaves|blossoms|fruit/)}assert.doesNotMatch(goodForToday(d,null),/pumpkin|autumn|splash pad/);assert.doesNotMatch(goodForToday(d,null,5),/pumpkin|autumn|splash pad/)}assert.ok(seasonal>0)});
