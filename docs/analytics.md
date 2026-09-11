# Analytics measurement contract (v2)

Analytics loads only after consent. No pre-consent events are queued or replayed. Fixed-vocabulary payloads pass through src/analytics.ts; arbitrary properties are discarded. No pricing, access, layout, or recommendation changes.

Common custom-event parameters: feature (fixed family), entry_point (home/help/explore/saved), account_state (unknown/signed_out/signed_in_free/premium), measurement_version (2), traffic_type (external/internal). Page metadata remains sanitized.

| Event | Meaning | Important parameters |
| --- | --- | --- |
| feature_view | Annotated surface becomes visible, excluding hidden/background/modal-obscured content | feature=today identifies daily section |
| feature_open | Deliberately open a tool | action=open |
| feature_start | Explicit request or activity checkbox action | action=request/try |
| result_view | Result actually becomes visible, excluding loading/failed attempts | result_kind=automatic/requested/reused |
| feature_reuse | Request an existing saved result | action=reuse |
| today_interaction | Click an existing Today control | interaction=weather_controls/weather_source |
| activity_mark | Growing & Learning checkbox change persists locally | state=marked/unmarked |
| idea_save | New idea/plan persists locally | item_type=activity/guidance/meal/learning/day_plan/learning_plan/home_reset |
| saved_item_open | Reopened saved guidance/meal/day plan/learning plan becomes visible | feature |
| feature_error | Handled technical failure | code; offer_tool for checkout creation failures |
| feature_blocked | Existing gate or blocked checkout popup | code; offer_tool for popup failure |
| sign_up | New identity accepted; duplicate/obfuscated responses excluded | method=password |
| login | Explicit password sign-in succeeds; session restoration excluded | method=password |
| premium_offer_view | Inline/modal offer becomes visible | placement=inline/modal; offer_tool |
| premium_checkout_created | Checkout API returns a URL | offer_tool |
| premium_checkout_start | window.open returns a window for checkout | offer_tool |
| premium_conversion | Server verifies a complete, paid, positive-value purchase owned by this account for the Premium price | account_state=premium |

activity_try remains recognized for legacy compatibility but is no longer emitted by the checkbox UI. Its historical counts are not completed activities. Standard page_view continues separately.

Codes: generation_failed, no_result, storage_failed, sync_failed, auth_failed, checkout_failed, popup_blocked, verification_failed, weather_unavailable, runtime_error, free_limit, premium_required. Never raw error text.

Feature families: home, help, explore, saved, growing_learning, practical_help, personalized_help, activities, learning, learning_plans, day_planner, home_reset, meals, weather, taking_over, handoff, premium, account, sync, today. Sensitive topics collapse into broad families.

offer_tool: general, unlimited-help-now, deeper-behavior, personalized-daily-plan, time-based-recommendations, food-on-hand, picky-eating, preschool-lunch, multi-child, unlimited-saved, real-reminders, advanced-activities, weather-smart-activities, personalized-learning, learning-plans, home-reset-premium, temperament-personalization, taking_over. These identify product gates, never family content.

## Counting semantics

- Filter v2/date when comparing older data: v1 feature_start combined opens/requests/reuse, and v1 checkout_start meant only URL creation.
- Feature impressions dedupe by feature/navigation area in tab session storage, with 30-minute inactivity expiry. Offers also distinguish placement/tool. Rerender/refresh does not inflate impressions within this window.
- Result/reopen impressions dedupe per request/reuse/try attempt. Opening the same existing result does not create a fresh success. Filter result_kind=requested for request-to-result analysis. Automatic results are discovery, not completion. Stage changes reset attribution without emitting an action.
- Funnels are aggregate approximations: no attempt/content IDs are transmitted, so multiple requests cannot be individually joined. Visibility is not proof of reading. Today interaction measures only existing controls, not passive reading.
- Saves prove local persistence, not cloud delivery. Saved lists are not reopens. Checkbox marking is self-reported state, not independently observed activity completion; feature_start action=try is not a generation request.
- Signup is account creation, not email confirmation. Checkout start proves a browser window returned, not that Stripe finished loading. Created plus popup_blocked identifies a launch failure.
- Conversion is consented browser-return measurement, not the billing ledger or a renewals/revenue report. Declined consent, blockers, no return, or another device affect counts. A SHA-256 receipt stays only in local storage for refresh dedupe; never sent to GA. Different devices may count one purchase separately.

## Owner/developer traffic

Open https://breezierdays.netlify.app/?analytics_test=1 in each testing browser, including the saved Home Screen browser where applicable. After consent this persists only breezier-days.analytics-test=1; events carry traffic_type=internal and debug_mode=true. Preview/localhost hosts are internal. ?analytics_test=0 removes the production-browser flag. Consent and other storage are unchanged.

Exclude traffic_type=internal (or include traffic_type=external) in real-user reports. Marking is forward-only; old owner traffic cannot reliably be separated. A GA internal-traffic filter in Testing state labels without discarding data. Validate classification before any permanent exclusion.

## Privacy and GA4 setup

No User-ID, child identifiers/names, email, ages, questions/answers, notes, health topics, coordinates, sync codes, raw errors, checkout references, content titles, or Remember What Works feedback are sent. No new automatic text capture, paid service, API, or AI call. Pending persistence/conversion events are discarded if consent changes.

The 13 event-scope dimensions registered in property 552900272 on September 10–11, 2026: feature, entry_point, account_state, action, state, item_type, code, placement, measurement_version, result_kind, offer_tool, interaction, traffic_type. debug_mode is built-in; no custom metrics needed. Allow processing time; definitions do not repair historical data.

Use sign_up and premium_conversion as business key events rather than views/clicks. Compare devices and new/returning cohorts after excluding test traffic and gathering enough real users.

