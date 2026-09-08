import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../src/dailyContent.ts', import.meta.url), 'utf8');
const context = { exports: {} }; vm.createContext(context);
vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { dailyContent, localDay } = context.exports;
test('all stages provide distinct daily activities and tips, including calendar boundaries', () => {
  for (const stage of ['general','expecting','baby','toddler','preschool','bigkid','tween']) {
    for (let i=0;i<400;i++) {
      const day = new Date(2026,0,i+1,12), next = new Date(2026,0,i+2,12);
      const a = dailyContent(day,stage), b=dailyContent(next,stage);
      assert.ok(a.activity.length>20 && a.tip.length>20);
      assert.notEqual(a.activity,b.activity); assert.notEqual(a.tip,b.tip);
      assert.equal(a.activity,dailyContent(new Date(2026,0,i+1,23),stage).activity);
      assert.equal(localDay(next)-localDay(day),1);
    }
  }
});
test('unknown profile uses family content and temperament adapts only suitable child stages', () => {
  const day=new Date(2026,8,8);
  assert.equal(dailyContent(day).activity,dailyContent(day,'general').activity);
  assert.match(dailyContent(day,'preschool',['sensitive']).activity,/Start quietly/);
  assert.match(dailyContent(day,'tween',['independent']).activity,/choose who/);
  assert.equal(dailyContent(day,'baby',['independent']).activity,dailyContent(day,'baby').activity);
});
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const compiled = { './dailyContent': context.exports };
function sourceRequire(name) {
  if (!name.startsWith('./')) return require(name);
  if (compiled[name]) return compiled[name];
  const file = name === './FamilyWeatherPanel' ? name + '.tsx' : name + '.ts';
  const module = { exports: {}, require: sourceRequire };
  vm.createContext(module);
  vm.runInContext(ts.transpileModule(readFileSync(new URL('../src/' + file.slice(2), import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText, module);
  compiled[name] = module.exports; return module.exports;
}
const componentContext = { exports: {}, require: sourceRequire };
vm.createContext(componentContext);
vm.runInContext(ts.transpileModule(readFileSync(new URL('../src/TodayInBreezierDays.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText, componentContext);
test('daily card uses only fresh existing weather, falling back without a location request', () => {
  const render = weather => renderToStaticMarkup(React.createElement(componentContext.exports.default,{stage:'general',weather,onHelp(){}}));
  assert.match(render({description:'Rainy',receivedAt:Date.now()-1000}),/Rainy at your last weather check/);
  assert.doesNotMatch(render({description:'Rainy',receivedAt:Date.now()-3600001}),/Rainy/);
  assert.doesNotMatch(render({description:'Rainy'}),/Rainy/);
  assert.match(render(null),/One easy activity/);
});
