// Deliberately no generic properties, DOM text, URLs, or identity arguments.
export const features = ['home', 'help', 'explore', 'saved', 'growing_learning', 'practical_help', 'personalized_help', 'activities', 'learning', 'learning_plans', 'day_planner', 'home_reset', 'meals', 'weather', 'taking_over', 'handoff', 'premium', 'account', 'sync', 'today'] as const;
export type Feature = typeof features[number];
export type AccountState = 'unknown' | 'signed_out' | 'signed_in_free' | 'premium';
export type EventName = 'feature_view' | 'feature_start' | 'result_view' | 'activity_try' | 'idea_save' | 'saved_item_open' | 'feature_error' | 'feature_blocked' | 'sign_up' | 'login' | 'premium_offer_view' | 'premium_checkout_start' | 'premium_conversion' | 'feature_open' | 'feature_reuse' | 'activity_mark' | 'today_interaction' | 'premium_checkout_created';
const events: EventName[] = ['feature_view', 'feature_start', 'result_view', 'activity_try', 'idea_save', 'saved_item_open', 'feature_error', 'feature_blocked', 'sign_up', 'login', 'premium_offer_view', 'premium_checkout_start', 'premium_conversion', 'feature_open', 'feature_reuse', 'activity_mark', 'today_interaction', 'premium_checkout_created'];
const codes = ['generation_failed', 'no_result', 'storage_failed', 'sync_failed', 'auth_failed', 'checkout_failed', 'popup_blocked', 'verification_failed', 'weather_unavailable', 'runtime_error', 'free_limit', 'premium_required'] as const;
type Code = typeof codes[number];
export const offerTools = ['general','unlimited-help-now','deeper-behavior','personalized-daily-plan','time-based-recommendations','food-on-hand','picky-eating','preschool-lunch','multi-child','unlimited-saved','real-reminders','advanced-activities','weather-smart-activities','personalized-learning','learning-plans','home-reset-premium','temperament-personalization','taking_over'] as const;
export type OfferTool = typeof offerTools[number];
type Fields = { offer_tool?: string; result_kind?: 'automatic' | 'requested' | 'reused'; interaction?: 'weather_controls' | 'weather_source'; placement?: 'inline' | 'modal'; action?: 'open' | 'request' | 'reuse' | 'try'; state?: 'marked' | 'unmarked'; code?: Code; item_type?: 'activity' | 'guidance' | 'meal' | 'learning' | 'day_plan' | 'learning_plan' | 'home_reset'; account_state?: AccountState };
let transport: ((event: string, params: Record<string, string | boolean>) => void) | null = null;
let account: AccountState = 'unknown';
let page = 'home';
let revision = 0;
const key = 'breezier-days.measurement.v2';
const resultKinds: Record<string, 'automatic' | 'requested' | 'reused'> = {};
export function analyticsTraffic(): Record<string, string | boolean> {
  let internal = typeof window !== 'undefined' && window.location.hostname !== 'breezierdays.netlify.app';
  try {
    const flag = new URLSearchParams(window.location.search).get('analytics_test');
    if (flag === '1') internal = true;
    if (flag === '1') localStorage.setItem('breezier-days.analytics-test', '1');
    if (flag === '0') localStorage.removeItem('breezier-days.analytics-test');
    internal = internal || localStorage.getItem('breezier-days.analytics-test') === '1';
  } catch { /* Missing storage must not affect the app. */ }
  return internal ? {traffic_type:'internal', debug_mode:true} : {traffic_type:'external'};
}
type Ledger = { touched: number; seen: Record<string, boolean>; attempts: Record<string, number> };
let memory: Ledger = { touched: 0, seen: {}, attempts: {} };

function ledger(): Ledger {
  try {
    const stored = sessionStorage.getItem(key);
    const value = stored ? JSON.parse(stored) : null;
    if (value && typeof value.touched === 'number' && value.seen && typeof value.seen === 'object' && value.attempts && typeof value.attempts === 'object') memory = value;
  } catch { /* Memory-only deduplication if storage is unavailable. */ }
  if (!memory.seen || !memory.attempts || Date.now() - memory.touched > 30 * 60 * 1000) memory = { touched: Date.now(), seen: {}, attempts: {} };
  return memory;
}
function persist(value: Ledger) {
  value.touched = Date.now();
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Never affect the product. */ }
}
export function setAnalyticsTransport(next: typeof transport) { transport = next; if (!next) revision++; }
export function analyticsEpoch() { return revision; }
export function analyticsEnabled() { return transport !== null; }
// A profile/stage change can replace content without a new user request.
export function resetResultAttribution() {
  for (const feature of Object.keys(resultKinds)) delete resultKinds[feature];
}
export function setAnalyticsContext(nextPage: string, nextAccount: AccountState) {
  page = ['home', 'help', 'explore', 'saved'].includes(nextPage) ? nextPage : 'home';
  account = ['unknown', 'signed_out', 'signed_in_free', 'premium'].includes(nextAccount) ? nextAccount : 'unknown';
}
export function track(event: EventName, feature: Feature, fields: Fields = {}, once?: string): boolean {
  if (!transport || !events.includes(event) || !features.includes(feature)) return false;
  const data = ledger();
  const dedupe = once ? `${event}:${feature}:${once}` : null;
  if (dedupe && data.seen[dedupe]) return false;
  const params: Record<string, string | boolean> = { feature, entry_point: page, account_state: account, measurement_version: '2', ...analyticsTraffic() };
  if (fields.offer_tool && offerTools.includes(fields.offer_tool as OfferTool)) params.offer_tool = fields.offer_tool;
  if (fields.result_kind && ['automatic','requested','reused'].includes(fields.result_kind)) params.result_kind = fields.result_kind;
  if (fields.interaction && ['weather_controls','weather_source'].includes(fields.interaction)) params.interaction = fields.interaction;
  if (fields.action && ['open', 'request', 'reuse', 'try'].includes(fields.action)) params.action = fields.action;
  if (fields.placement === 'inline' || fields.placement === 'modal') params.placement = fields.placement;
  if (fields.state === 'marked' || fields.state === 'unmarked') params.state = fields.state;
  if (fields.code && codes.includes(fields.code)) params.code = fields.code;
  if (fields.item_type && ['activity', 'guidance', 'meal', 'learning', 'day_plan', 'learning_plan', 'home_reset'].includes(fields.item_type)) params.item_type = fields.item_type;
  if (fields.account_state && ['unknown', 'signed_out', 'signed_in_free', 'premium'].includes(fields.account_state)) params.account_state = fields.account_state;
  if (event === 'login' || event === 'sign_up') params.method = 'password';
  try {
    transport(event, params);
    if (event === 'feature_error' || event === 'feature_blocked') data.seen[`failed:${feature}:${data.attempts[feature] || 0}`] = true;
    if (dedupe) data.seen[dedupe] = true;
    persist(data);
    return true;
  } catch { return false; }
}
export function startFeature(feature: Feature, action: NonNullable<Fields['action']> = 'open') {
  const event = action === 'open' ? 'feature_open' : action === 'reuse' ? 'feature_reuse' : 'feature_start';
  if (!track(event, feature, { action })) return;
  if (action === 'open') { resultKinds[feature] = 'automatic'; return; }
  const data = ledger();
  data.attempts[feature] = (data.attempts[feature] || 0) + 1;
  resultKinds[feature] = action === 'reuse' ? 'reused' : 'requested';
  persist(data);
}
export function observeFeature(event: 'feature_view' | 'result_view' | 'premium_offer_view' | 'saved_item_open', feature: Feature, kind?: 'automatic'|'requested'|'reused') {
  if (!transport) return;
  const data = ledger();
  if (event === 'result_view' && data.seen[`failed:${feature}:${data.attempts[feature] || 0}`]) return;
  const result_kind = kind ?? resultKinds[feature] ?? 'automatic';
  track(event, feature, event === 'result_view' ? {result_kind} : {}, event === 'feature_view' ? page : `${data.attempts[feature] || 0}`);
}
export function helpFeature(id: string): Feature {
  return id === 'activities' ? 'activities' : id === 'mealtime' ? 'meals' : 'practical_help';
}
export function itemType(category: string): NonNullable<Fields['item_type']> {
  return ({ Activity: 'activity', Meal: 'meal', Learning: 'learning', 'Home Reset': 'home_reset' } as const)[category as 'Activity'] || 'guidance';
}

// Conversion dedupe is device-local. The checkout reference NEVER enters GA.
export function recordVerifiedConversion(receipt: string, verified: boolean) {
  if (!transport || !verified || !/^[a-f0-9]{64}$/.test(receipt)) return;
  const receiptKey = `breezier-days.conversion.${receipt}`;
  try {
    if (localStorage.getItem(receiptKey)) return;
    // Fail closed if durable dedupe is unavailable; refresh must not inflate purchases.
    localStorage.setItem(receiptKey, 'recorded');
    if (!track('premium_conversion', 'premium', { account_state: 'premium' })) localStorage.removeItem(receiptKey);
  } catch { /* Do not send a conversion without a durable dedupe marker. */ }
}

// Observe explicitly annotated surfaces only. No scraping or automatic click capture.
export function observeAnalyticsSurfaces() {
  if (typeof IntersectionObserver === 'undefined' || typeof MutationObserver === 'undefined') return () => {};
  const visible = new Set<Element>();
  const watched = new Set<Element>();
  const emit = (element: Element) => {
    if (!transport || document.visibilityState === 'hidden' || !element.isConnected) return;
    // An offer overlay obscures the background even though it intersects the viewport.
    const modal = document.querySelector('.legal-overlay, .legal-modal-overlay, .taking-over-modal-overlay');
    if (modal && !modal.contains(element)) return;
    for (const [attribute, event] of [['data-analytics-view', 'feature_view'], ['data-analytics-result', 'result_view'], ['data-analytics-offer', 'premium_offer_view'], ['data-analytics-reopened', 'saved_item_open']] as const) {
      const feature = element.getAttribute(attribute) as Feature;
      if (features.includes(feature)) {
        if (event === 'premium_offer_view') {
          const placement = element.getAttribute('data-analytics-placement') === 'modal' ? 'modal' : 'inline';
          const tool = element.getAttribute('data-analytics-tool') || 'general';
          const offer_tool = offerTools.includes(tool as OfferTool) ? tool : 'general';
          track(event, feature, { placement, offer_tool }, `${page}:${placement}:${offer_tool}`);
        } else observeFeature(event, feature, element.getAttribute('data-analytics-reopened') ? 'reused' : undefined);
      }
    }
  };
  const intersection = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRect.height >= Math.min(80, entry.boundingClientRect.height)) { visible.add(entry.target); emit(entry.target); }
      else visible.delete(entry.target);
    }
  }, { threshold: [0, 0.01, 0.1, 0.5, 1] });
  const scan = () => {
    for (const element of watched) if (!element.isConnected) { intersection.unobserve(element); watched.delete(element); visible.delete(element); }
    document.querySelectorAll('[data-analytics-view], [data-analytics-result], [data-analytics-offer], [data-analytics-reopened]').forEach(element => {
      if (!watched.has(element)) { watched.add(element); intersection.observe(element); }
    });
    visible.forEach(emit);
  };
  const mutations = new MutationObserver(scan);
  mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-analytics-view', 'data-analytics-result', 'data-analytics-offer', 'data-analytics-reopened', 'data-analytics-tool'] });
  document.addEventListener('visibilitychange', scan);
  scan();
  return () => { intersection.disconnect(); mutations.disconnect(); document.removeEventListener('visibilitychange', scan); };
}
