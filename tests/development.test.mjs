import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the production handlers with React's functional state-update contract.
const source = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const handlers = source.slice(source.indexOf('  const toggleDevelopmentActivity ='), source.indexOf('  useEffect(() => { if (weatherError)'));
function app(children, selectedChildId = null) {
  const context = { selectedChildId, children, startFeature() {}, afterStored() {}, setChildren(update) { children = update(children); context.children = children; } };
  vm.createContext(context);
  vm.runInContext(ts.transpileModule(handlers + '\nglobalThis.actions = { toggleDevelopmentActivity, removeDevelopmentActivity };', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return { ...context.actions, children: () => children };
}
const idea = { title: 'Tell a silly story', area: 'Communication', description: 'Take turns telling a story.' };

test('first click completes the displayed child activity with the editor closed', () => {
  const a = app([{ id: 1, development: [] }]);
  a.toggleDevelopmentActivity(1, idea);
  assert.equal(a.children()[0].development.length, 1);
  assert.equal(a.children()[0].development[0].completed, true);
  a.toggleDevelopmentActivity(1, idea);
  assert.equal(a.children()[0].development.length, 1);
  assert.equal(a.children()[0].development[0].completed, false);
});

test('displayed child owns updates and removals even when another profile is open', () => {
  const a = app([{ id: 1, development: [] }, { id: 2, development: [] }], 2);
  a.toggleDevelopmentActivity(1, idea);
  assert.equal(a.children()[1].development.length, 0);
  const id = a.children()[0].development[0].id;
  a.removeDevelopmentActivity(1, id);
  assert.equal(a.children()[0].development.length, 0);
});

test('legacy incomplete records complete on one click without duplicates and survive rehydration', () => {
  const a = app([{ id: 1, development: [{ ...idea, id: 99, completed: false }] }]);
  a.toggleDevelopmentActivity(1, idea);
  const b = app(JSON.parse(JSON.stringify(a.children())));
  assert.equal(b.children()[0].development[0].completed, true);
  b.toggleDevelopmentActivity(1, idea);
  assert.equal(b.children()[0].development.length, 1);
  assert.equal(b.children()[0].development[0].id, 99);
  assert.equal(b.children()[0].development[0].completed, false);
});

test('deleted child cannot redirect an update to another child', () => {
  const a = app([{ id: 2, development: [] }], 2);
  a.toggleDevelopmentActivity(1, idea);
  assert.equal(a.children()[0].development.length, 0);
});
