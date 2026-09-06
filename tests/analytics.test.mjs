import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function browser(saved = null) {
  let consent = saved;
  const state = [], effects = [], scripts = [];
  let cursor = 0, reloads = 0;
  const window = { location: { origin: 'https://breezierdays.netlify.app', hostname: 'breezierdays.netlify.app', reload() { reloads++; } }, addEventListener() {}, removeEventListener() {} };
  const jsx = (type, props) => ({ type, props });
  const react = {
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], value => { state[i] = value; }]; },
    useEffect(effect) { effects.push(effect); },
  };
  const source = readFileSync(new URL('../src/AnalyticsConsent.tsx', import.meta.url), 'utf8').replace('import.meta.env.VITE_GA_MEASUREMENT_ID', JSON.stringify('G-GTWY7W5NE9'));
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  const analyticsExports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/analytics.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: analyticsExports });
  vm.runInNewContext(js, { exports, require: name => name === 'react' ? react : name === './analytics' ? analyticsExports : { jsx, jsxs: jsx, Fragment: 'fragment' }, window, document: { cookie: '', createElement: () => ({}), head: { appendChild: script => scripts.push(script) } }, localStorage: { getItem: () => consent, setItem: (_key, value) => { consent = value; } }, console });
  function render(page = 'home') { cursor = 0; const tree = exports.default({ page }); effects.splice(0).forEach(fn => fn()); return tree; }
  function click(tree, text) {
    if (!tree || typeof tree !== 'object') return false;
    if (tree.type === 'button' && tree.props.children === text) { tree.props.onClick(); return true; }
    return [tree.props?.children].flat().some(child => click(child, text));
  }
  return { render, click, scripts, window, saved: () => consent, reloads: () => reloads };
}

test('no tag before consent or after rejection; acceptance sends one page_view and SPA navigation', () => {
  const b = browser();
  let tree = b.render();
  assert.equal(b.scripts.length, 0);
  assert.equal(b.window.dataLayer, undefined);
  assert.ok(b.click(tree, 'Reject analytics'));
  tree = b.render();
  assert.equal(b.scripts.length, 0);
  assert.equal(b.saved(), 'denied');
  b.click(tree, 'Cookie settings');
  tree = b.render();
  b.click(tree, 'Accept analytics');
  b.render(); b.render(); b.render('help');
  assert.equal(b.scripts.length, 1);
  assert.match(b.scripts[0].src, /gtag\/js\?id=G-GTWY7W5NE9$/);
  const events = Array.from(b.window.dataLayer, args => Array.from(args)).filter(args => args[0] === 'event');
  assert.deepEqual(events.map(args => args[1]), ['page_view', 'page_view']);
  assert.deepEqual(events.map(args => args[2].page_location), ['https://breezierdays.netlify.app/', 'https://breezierdays.netlify.app/help']);
});

test('saved consent is restored; withdrawal disables collection and reloads', () => {
  const b = browser('granted');
  let tree = b.render('saved');
  assert.equal(b.scripts.length, 1);
  b.click(tree, 'Cookie settings'); tree = b.render('saved');
  b.click(tree, 'Reject analytics');
  assert.equal(b.saved(), 'denied');
  assert.equal(b.window['ga-disable-G-GTWY7W5NE9'], true);
  assert.equal(b.reloads(), 1);
  const revisit = browser(b.saved()); revisit.render();
  assert.equal(revisit.scripts.length, 0);
});

test('unrecognized legacy consent fails closed', () => {
  const b = browser('true'); b.render();
  assert.equal(b.scripts.length, 0);
});
