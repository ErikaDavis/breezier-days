# Analytics measurement contract (v1)

GA is loaded only after analytics consent. No pre-consent custom events are queued or replayed. Existing page-view and consent behavior is retained. All custom payloads pass through `src/analytics.ts`; arbitrary properties are discarded.

Common parameters: `feature` (fixed feature family), `entry_point` (home/help/explore/saved), `account_state` (unknown/signed_out/signed_in_free/premium), `measurement_version` (1). Unknown includes authenticated users awaiting an authoritative membership response. Existing sanitized page metadata is attached by the consent component.

| Event | Trigger | Additional parameters |
| --- | --- | --- |
| feature_view | An explicitly annotated feature surface becomes visible, excluding obscured background content | none |
| feature_start | A deliberate open, request, reuse, or try action | action: open/request/reuse/try |
| result_view | A result surface actually becomes visible; loading and failed attempts are excluded | none |
| activity_try | Growing & Learning marked/unmarked state successfully persists locally | state: marked/unmarked |
| idea_save | A new idea, day plan, or learning plan successfully persists locally | item_type: activity/guidance/meal/learning/day_plan/learning_plan/home_reset |
| saved_item_open | A reopened saved answer, meal, day plan, or learning plan becomes visible | none |
| feature_error | A handled generation, persistence, sync, authentication, checkout, verification, weather, or runtime failure | code: fixed code below |
| feature_blocked | An existing quota or Premium gate blocks an action | code: free_limit/premium_required |
| sign_up | Supabase returns a newly created identity; duplicate/obfuscated responses excluded | method: password |
| login | Explicit password sign-in succeeds; session restoration excluded | method: password |
| premium_offer_view | An existing inline or modal Premium offer becomes visible | placement: inline/modal |
| premium_checkout_start | Authenticated checkout session creation returns a checkout URL | none |
| premium_conversion | Authenticated server verification confirms the returned session is complete, paid, positive-value, owned by this account, and contains the configured Premium price | none |

Error codes: generation_failed, no_result, storage_failed, sync_failed, auth_failed, checkout_failed, popup_blocked, verification_failed, weather_unavailable, runtime_error. Never raw exception messages.

Feature families: home, help, explore, saved, growing_learning, practical_help, personalized_help, activities, learning, learning_plans, day_planner, home_reset, meals, weather, taking_over, handoff, premium, account, sync. Specific health/development topics are collapsed into broad families.

## Counting semantics

- Feature impressions dedupe by feature and navigation area in tab session storage, with 30 minutes of inactivity expiry. Offers also distinguish placement. Refresh/rerender does not create another impression within that window.
- Result/reopen impressions dedupe per explicit request/reuse/try attempt. Merely opening the same existing result does not create a fresh success. Default displayed results may count once without a preceding request. Compare request funnels separately from default discovery.
- Explicit repeated actions are intentionally counted. New local saves exclude duplicates and hydration; these events prove local persistence, not cloud delivery. Marked activity means the user marked it, not independently verified real-world completion.
- Signup means account creation accepted, not email confirmation. Login starts with unknown membership until the server answers.
- Checkout start means a session was created, not proof the checkout page loaded. Popup failure is separate.
- Conversion is consented browser-return measurement, not the billing ledger. It does not count all renewals or users who never return, decline consent, or block analytics. A SHA-256 receipt stays only in local storage for refresh dedupe; it is never sent to GA. Different devices can still count the same purchase separately. No revenue, transaction identifier, or GA ecommerce purchase payload is sent.
- Normal GA page_view on refresh remains legitimate. Session/returning-user metrics follow GA's consent, cookie, device, and reporting constraints.

## Privacy and operations

No GA User-ID, child identifiers, email, exact age, questions/answers, notes, moods, health topics, coordinates, sync codes, raw error strings, checkout reference, or content titles are sent. No automatic DOM-text/click capture is added. Account IDs are used internally only to reject stale authentication results. GA transport receives only a predefined vocabulary. Pending persistence/conversion events are discarded if consent changes.

In GA4, register event-scoped custom dimensions for feature, entry_point, account_state, action, state, item_type, code, and placement as needed. Mark sign_up and premium_conversion as key events; avoid marking every view or click. Keep premium_conversion distinct from financial reporting. Build exploration funnels by feature using feature_view -> feature_start (action=request) -> result_view -> idea_save/saved_item_open; default result views and different attempts require aggregate interpretation, as no attempt identifiers are transmitted. Compare by device category and GA new/returning cohorts. Review enhanced measurement for unnecessary form/search/outbound text capture and exclude test traffic through an approved GA configuration. No GA Admin settings are changed by this code.

Collect several representative weeks and enough users per major feature before product decisions. Review rates, repeat usage, failures/limits, saves/reopens, and account/Premium progression together; do not rank features solely by raw event totals.
