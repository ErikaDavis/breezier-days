// Run: node --experimental-vm-modules --test tests/premium.test.mjs
// Real handlers and Stripe signature verification; external services are in-memory fixtures.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import Stripe from 'stripe';

const root = new URL('../', import.meta.url);
const future = new Date(Date.now() + 86400000).toISOString();
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon-test', SUPABASE_SERVICE_ROLE_KEY: 'service-test', STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture', STRIPE_PREMIUM_PRICE_ID: 'price_premium', APP_ORIGIN: 'https://example.test' };
const user = { id: 'user-a', email: 'a@example.test', is_anonymous: false };

async function backend(options = {}) {
  const rows = options.rows || [];
  const mappings = options.mappings || [];
  const writes = [];
  let checkout;
  const subscription = { id: 'sub_test', customer: 'cus_test', metadata: { supabase_user_id: user.id }, status: 'active', cancel_at_period_end: false, items: { data: [{ price: { id: 'price_premium' }, current_period_end: Math.floor(Date.now()/1000) + 86400 }] }, ...options.subscription };
  const stripe = new Stripe('sk_test_fixture');
  function FakeStripe(_key, config) {
    assert.equal(config?.apiVersion, '2025-03-31.basil', 'billing requests must support Managed Payments');
    return { webhooks: stripe.webhooks, subscriptions: { retrieve: async () => subscription }, customers: { create: async () => ({ id: 'cus_test' }) }, checkout: { sessions: { create: async value => { checkout = value; return { url: 'https://checkout.stripe.com/test' }; } } } };
  }
  const db = { auth: { getUser: async token => token === 'valid' ? { data: { user: options.user || user }, error: null } : { data: { user: null }, error: new Error('invalid token') } }, from(table) {
    const stored = table === 'billing_customers' ? mappings : rows;
    let selected = stored;
    const query = {
      select() { return query; },
      eq(key, value) { selected = selected.filter(row => row[key] === value); return query; },
      in(key, values) { selected = selected.filter(row => values.includes(row[key])); return query; },
      order() { return query; },
      limit(n) { selected = selected.slice(0, n); return query; },
      maybeSingle: async () => ({ data: selected[0] || null, error: options.lookupError ? new Error('lookup failed') : null }),
      then(resolve) { return Promise.resolve({ data: selected, error: null }).then(resolve); },
      async upsert(row) {
        if (options.writeError) return { error: new Error('database unavailable') };
        writes.push({ table, row });
        const key = table === 'billing_customers' ? 'user_id' : 'stripe_subscription_id';
        const index = stored.findIndex(value => value[key] === row[key]);
        if (index < 0) stored.push(row); else stored[index] = row;
        return { error: null };
      },
    };
    return query;
  } };
  const context = vm.createContext({ Request, Response, console: { error() {} }, Netlify: { env: { get: name => env[name] } } });
  const cache = new Map();
  async function load(url) {
    if (cache.has(url)) return cache.get(url);
    const source = await readFile(new URL(url), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    const module = new vm.SourceTextModule(code, { context, identifier: url });
    cache.set(url, module);
    await module.link(async (specifier, referencing) => {
      if (specifier === 'stripe' || specifier === '@supabase/supabase-js') {
        return new vm.SyntheticModule(specifier === 'stripe' ? ['default'] : ['createClient'], function () {
          this.setExport(specifier === 'stripe' ? 'default' : 'createClient', specifier === 'stripe' ? FakeStripe : () => db);
        }, { context });
      }
      return load(new URL(specifier + '.ts', referencing.identifier).href);
    });
    return module;
  }
  async function call(name, { token = 'valid', method = 'GET', body, headers = {} } = {}) {
    const module = await load(new URL(`netlify/functions/${name}.ts`, root).href);
    if (module.status !== 'evaluated') await module.evaluate();
    return module.namespace.default(new Request(`https://example.test/api/${name}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, ...(body ? { body } : {}) }));
  }
  return { call, writes, subscription, get checkout() { return checkout; }, stripe };
}

test('checkout authenticates and links the same user to session and subscription', async () => {
  const b = await backend();
  assert.equal((await b.call('create-checkout-session', { method: 'POST' })).status, 200);
  assert.equal(b.checkout.client_reference_id, user.id);
  assert.equal(b.checkout.subscription_data.metadata.supabase_user_id, user.id);
  assert.equal(b.checkout.line_items[0].price, env.STRIPE_PREMIUM_PRICE_ID);
  assert.equal(b.checkout.success_url, env.APP_ORIGIN + '/?premium=success');
});

test('billing rejects missing, invalid and anonymous identities', async () => {
  for (const token of [null, 'forged']) {
    const b = await backend();
    for (const [route, method] of [['premium-status','GET'], ['create-checkout-session','POST'], ['create-portal-session','POST']]) {
      assert.equal((await b.call(route, { token, method })).status, 401);
    }
    assert.equal(b.writes.length, 0);
  }
  const b = await backend({ user: { ...user, is_anonymous: true } });
  assert.equal((await b.call('create-checkout-session', { method: 'POST' })).status, 401);
});

test('status belongs to the authenticated user and configured Premium price', async () => {
  const row = { user_id: user.id, stripe_price_id: 'price_premium', status: 'active', current_period_end: future, cancel_at_period_end: true };
  for (const rows of [[], [{ ...row, user_id: 'someone-else' }], [{ ...row, stripe_price_id: 'price_other' }], [{ ...row, current_period_end: null }], [{ ...row, current_period_end: '2000-01-01' }], [{ ...row, status: 'past_due' }]]) {
    const b = await backend({ rows });
    assert.equal((await (await b.call('premium-status')).json()).isPremium, false);
  }
  const b = await backend({ rows: [{ ...row, status: 'canceled' }, row] });
  const result = await (await b.call('premium-status')).json();
  assert.equal(result.isPremium, true);
  assert.equal(result.cancelAtPeriodEnd, true);
});

async function webhook(b, event, tamper = false) {
  const body = JSON.stringify(event);
  const signature = b.stripe.webhooks.generateTestHeaderString({ payload: body, secret: env.STRIPE_WEBHOOK_SECRET });
  return b.call('stripe-webhook', { method: 'POST', body: body + (tamper ? ' ' : ''), headers: { 'stripe-signature': signature } });
}
test('signed checkout writes a server entitlement; forged payload does not', async () => {
  const b = await backend();
  const event = { id: 'evt_test', type: 'checkout.session.completed', data: { object: { mode: 'subscription', subscription: 'sub_test' } } };
  assert.equal((await webhook(b, event, true)).status, 400);
  assert.equal(b.writes.length, 0);
  assert.equal((await webhook(b, event)).status, 200);
  assert.equal(b.writes[0].row.user_id, user.id);
  assert.equal(b.writes[0].row.status, 'active');
  assert.equal(b.writes[0].row.stripe_subscription_id, 'sub_test');
});
test('webhook uses current Stripe status and returns failure when persistence fails', async () => {
  const event = { id: 'evt_test', type: 'customer.subscription.updated', data: { object: { id: 'sub_test', status: 'active' } } };
  const b = await backend({ subscription: { status: 'canceled' } });
  assert.equal((await webhook(b, event)).status, 200);
  assert.equal(b.writes[0].row.status, 'canceled');
  assert.equal((await webhook(await backend({ writeError: true }), event)).status, 500);
  assert.equal((await webhook(await backend({ subscription: { metadata: {} } }), event)).status, 500);
});

test('legacy subscriptions require trusted mapping and reject conflicting identities', async () => {
  const event = { id: 'evt_legacy', type: 'customer.subscription.updated', data: { object: { id: 'sub_test' } } };
  const mapping = { user_id: user.id, stripe_customer_id: 'cus_test' };
  const b = await backend({ mappings: [mapping], subscription: { metadata: {} } });
  assert.equal((await webhook(b, event)).status, 200);
  assert.equal(b.writes[0].row.user_id, user.id);
  for (const options of [
    { mappings: [{ ...mapping, user_id: 'other-user' }] },
    { lookupError: true },
    { subscription: { metadata: {} }, mappings: [{ ...mapping, stripe_customer_id: 'other-customer' }] },
  ]) {
    const rejected = await backend(options);
    assert.equal((await webhook(rejected, event)).status, 500);
    assert.equal(rejected.writes.length, 0);
  }
});

test('checkout, signed payment webhook, and authenticated status share persisted identity', async () => {
  const b = await backend();
  assert.equal((await (await b.call('premium-status')).json()).isPremium, false);
  assert.equal((await b.call('create-checkout-session', { method: 'POST' })).status, 200);
  for (const invoice of [
    { subscription: 'sub_test' },
    { parent: { subscription_details: { subscription: { id: 'sub_test' } } } },
  ]) {
    assert.equal((await webhook(b, { id: 'evt_paid', type: 'invoice.paid', data: { object: invoice } })).status, 200);
    assert.equal((await (await b.call('premium-status')).json()).isPremium, true);
  }
  b.subscription.status = 'past_due';
  assert.equal((await webhook(b, { id: 'evt_failed', type: 'invoice.payment_failed', data: { object: { subscription: 'sub_test' } } })).status, 200);
  assert.equal((await (await b.call('premium-status')).json()).isPremium, false);
});

async function appEffect(containing) {
  const source = await readFile(new URL('src/App.tsx', root), 'utf8');
  const file = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect' && node.arguments[0]?.getText(file).includes(containing)) callback = node.arguments[0].getText(file);
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert.ok(callback);
  return callback;
}

test('late initial auth lookup cannot overwrite a newer restored session', async () => {
  let resolveInitial, listener, current, ready = false;
  const run = vm.runInNewContext('(' + await appEffect('const unsubscribe = onPremiumAuthChange') + ')', {
    getPremiumUser: () => new Promise(resolve => { resolveInitial = resolve; }),
    onPremiumAuthChange: fn => { listener = fn; return () => {}; },
    setPremiumUser: value => { current = value; }, setPremiumAuthReady: value => { ready = value; },
  });
  const cleanup = run();
  listener(user);
  resolveInitial(null);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(current, user);
  assert.equal(ready, true);
  cleanup();
});

test('visibility refresh preserves verified status on transport failure and rejects old-user results', async () => {
  let visible, premium = true, result = { isPremium: false, error: 'Network unavailable' };
  const identity = { current: user.id };
  const run = vm.runInNewContext('(' + await appEffect('const handleVisibility') + ')', {
    document: { visibilityState: 'visible', addEventListener: (_name, fn) => { visible = fn; }, removeEventListener() {} },
    premiumUser: user, premiumUserIdRef: identity, isPremium: true,
    checkPremiumStatus: async () => result,
    setIsPremium: value => { premium = value; }, setCancelAtPeriodEnd() {}, setPremiumUntil() {}, setShowPremiumSuccess() {},
  });
  run(); visible(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(premium, true);
  result = { isPremium: false, currentPeriodEnd: null, cancelAtPeriodEnd: false };
  visible(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(premium, false, 'a successful revocation response must still remove Premium');
  result = { isPremium: true }; identity.current = 'other-user';
  visible(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(premium, false);
});

test('Basil persists the Premium item billing period and never borrows another price period', async () => {
  const period = Math.floor(Date.now() / 1000) + 86400;
  const event = { id: 'evt_basil', type: 'customer.subscription.updated', data: { object: { id: 'sub_test' } } };
  const other = { price: { id: 'price_other' }, current_period_end: period + 86400 };
  for (const premiumItem of [
    { price: { id: 'price_premium' }, current_period_end: period },
    { price: { id: 'price_premium' } },
    { price: { id: 'price_premium' }, current_period_end: 1 },
  ]) {
    const b = await backend({ subscription: { items: { data: [other, premiumItem] } } });
    assert.equal((await webhook(b, event)).status, 200);
    assert.equal(b.writes[0].row.stripe_price_id, 'price_premium');
    assert.equal(b.writes[0].row.current_period_end, premiumItem.current_period_end ? new Date(premiumItem.current_period_end * 1000).toISOString() : null);
    assert.equal((await (await b.call('premium-status')).json()).isPremium, premiumItem.current_period_end === period);
  }
  const b = await backend({ subscription: { items: { data: [other] } } });
  assert.equal((await webhook(b, event)).status, 200);
  assert.equal((await (await b.call('premium-status')).json()).isPremium, false);
});

// Execute the actual return effect from App.tsx with controlled auth and timers.
// This reproduces auth restoration and StrictMode cleanup without a real payment.
test('checkout return survives delayed auth and StrictMode, polling until the server confirms', async () => {
  const source = await readFile(new URL('src/App.tsx', root), 'utf8');
  const file = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect' && node.arguments[0]?.getText(file).includes("params.get('premium') === 'success'")) callback = node.arguments[0].getText(file);
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert.ok(callback);
  let reads = 0;
  let premium = false;
  let replacement;
  const timers = [];
  const ctx = { URLSearchParams, premiumAuthReady: false, premiumUser: null,
    window: { location: { search: '?premium=success&keep=1', pathname: '/', hash: '#section' }, history: { replaceState: (_a,_b,url) => { replacement = url; } } },
    setTimeout: fn => timers.push(fn), setPremiumChecking() {}, setShowPremiumSuccess() {}, setShowPremiumModal() {}, setPremiumAuthMessage() {}, setCheckoutError() {},
    checkPremiumStatus: async () => ({ isPremium: ++reads >= 2, currentPeriodEnd: future, cancelAtPeriodEnd: false }),
    applyPremiumStatus: remote => { premium = remote; }, setIsPremium: value => { premium = value; }, setCancelAtPeriodEnd() {}, setPremiumUntil() {},
  };
  const run = vm.runInNewContext('(' + callback + ')', ctx);
  run();
  assert.equal(replacement, undefined, 'must not consume the return before auth restoration');
  assert.equal(reads, 0);
  ctx.premiumAuthReady = true;
  run(); // Signed out: keep the marker for sign-in.
  assert.equal(replacement, undefined);
  ctx.premiumUser = user;
  const cleanup = run(); cleanup(); run(); // StrictMode effect replay.
  while (timers.length) await timers.shift()();
  assert.equal(reads, 2);
  assert.equal(premium, true);
  assert.equal(replacement, '/?keep=1#section');
});
