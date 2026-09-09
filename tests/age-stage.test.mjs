import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const cache={};function load(name){if(cache[name])return cache[name];const m={exports:{},require:load};vm.createContext(m);vm.runInContext(ts.transpileModule(readFileSync(new URL('../src/'+name.replace('./','')+'.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,m);return cache[name]=m.exports;}
const {stageLearningActivities,academicPreviews}=load('./stageLearning');const {learningActivities,buildLearningPlanFromTemplate}=load('./learningData');
const source=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const context={stageLearningActivities};vm.createContext(context);
const start=source.indexOf('const activities: Activity[] = ['),end=source.indexOf('\n];',start)+3;
const ageStart=source.indexOf('const getChildGuidanceAge ='),ageEnd=source.indexOf('\n};',ageStart)+3;
vm.runInContext(ts.transpileModule(source.slice(start,end)+'\n'+source.slice(ageStart,ageEnd)+'\nglobalThis.pool=activities;globalThis.stage=getChildGuidanceAge;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
test('all stages have substantial explicitly aged learning and activity pools',()=>{for(const age of ['baby','toddler','preschool','bigkid','tween']){assert.ok(learningActivities.filter(a=>a.ages.includes(age)).length>=8);assert.ok(context.pool.filter(a=>a.ages.includes(age)).length>=8);assert.ok(academicPreviews(age).length>=2);for(const category of ['language','thinking','independence','creativity']){const plan=buildLearningPlanFromTemplate(`${age}-${category}`,age);assert.equal(plan.plan.length,4);assert.ok(plan.plan.every(d=>d.activity.ages.includes(age)))}}});
test('older children never receive the re-aged preschool defaults',()=>{for(const age of ['bigkid','tween']){const pool=context.pool.filter(a=>a.ages.includes(age));assert.ok(pool.every(a=>!/Bubble Chase|Sock Toss|Stickers \+ Paper|Paint with Water|Hokey Pokey|Letter Walk/.test(a.title)));assert.ok(pool.some(a=>a.needs.includes('get-things-done')));assert.ok(pool.some(a=>a.needs.includes('outside')))}assert.ok(learningActivities.filter(a=>a.ages.includes('baby')).every(a=>a.id.startsWith('baby-')));});
test('numeric and legacy boundaries route consistently without rewriting profiles',()=>{for(const [value,expected] of [['Newborn','baby'],['6 months','baby'],['1 year','toddler'],['2 years','toddler'],['3 years','preschool'],['5 years','preschool'],['6 years','bigkid'],['8 years','bigkid'],['9 years','tween'],['9–11 years','tween'],['9–12 years','tween'],['10 years','tween'],['11 years','tween'],['13+ years','tween']])assert.equal(context.stage(value),expected)});
test('learning identifiers are unique and baby challenge text never requires explanations',()=>{assert.equal(new Set(learningActivities.map(a=>a.id)).size,learningActivities.length);assert.ok(buildLearningPlanFromTemplate('baby-thinking','baby').plan.every(d=>!/explain/.test(d.harder)))});
