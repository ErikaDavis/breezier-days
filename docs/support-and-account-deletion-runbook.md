# Breezier Days launch support and account deletion runbook

## Support setup

1. Create and monitor one real support mailbox.
2. Set `VITE_SUPPORT_EMAIL` to that address in the Netlify production environment.
3. Rebuild and deploy. This is a Vite build-time setting.
4. Test the footer, Subscription Information, and Delete My Data email links.

Use the mailbox for account/data deletion, billing/subscription questions, refunds,
password/account problems, and general support. Never ask a customer to send a
password, recovery token, full card number, or sensitive child information.

## Verified account-deletion request

1. Require the request from the email address on the Supabase Premium account.
   If it comes from another address, reply to the account email and require confirmation.
2. Ask the customer to use **Manage Subscription** to cancel. If they cannot, locate the
   mapped Stripe customer and cancel the correct subscription according to the approved
   cancellation policy. Decide explicitly whether access ends immediately or at period end.
3. Record only the minimum operational evidence needed to show the request was fulfilled.
4. In Supabase, identify the authenticated user ID from the verified email. Confirm that the
   corresponding `billing_customers.user_id` maps to the expected Stripe customer.
5. Delete rows belonging to that user from `premium_entitlements`, then
   `billing_customers`. Do not delete records belonging to any other user.
6. Delete the Supabase Auth user with the Supabase Dashboard or a trusted server/admin
   operation. The service-role key must never be placed in the browser or shared by email.
7. Tell the customer to use **Delete My Data** on every browser/device where they used the
   app. That clears locally stored child profiles, notes, saved answers/plans, usage state,
   and the local sync identifiers on that device.
8. Confirm completion without claiming that all third-party records were permanently erased.

## Data intentionally not blindly deleted

Do not delete Stripe customers, invoices, charges, refunds, disputes, tax records, or payment
audit history merely because the Breezier Days login was deleted. Retain or remove those
records according to Stripe capabilities, the approved retention policy, accounting/tax
requirements, fraud and dispute needs, and counsel's advice. Netlify/Supabase/Stripe logs and
backups may also age out under provider retention schedules rather than disappearing instantly.

## Refund and billing requests

Verify the request against the Premium account email and the mapped Stripe customer. Apply
the published refund policy consistently, record the decision, and issue any approved refund
through Stripe. Never request card details by email.

## Production Stripe checks

- Confirm the product is Breezier Days Premium and active.
- Confirm the production price is USD 4.99, recurring every month, and active.
- Copy that production `price_...` identifier into Netlify `STRIPE_PREMIUM_PRICE_ID`.
- Confirm `APP_ORIGIN` is the production Breezier Days HTTPS origin.
- Confirm the webhook endpoint is `/api/stripe-webhook`, uses the production signing secret,
  and subscribes to checkout completion, subscription changes, and invoice paid/failed events.
- In the Stripe customer portal, enable payment-method updates and cancellation with the
  approved end-of-period behavior. Ensure the return URL uses the production origin.
- Complete one real purchase, renewal/status check, cancellation, portal return, and refund
  support test before launch.
