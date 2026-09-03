import type { Config } from '@netlify/functions';
import { admin, authenticatedUser, json, stripe } from './_shared/billing';

export default async (request: Request) => {
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const user = await authenticatedUser(request);
    const db = admin();
    const { data: existing, error: lookupError } = await db.from('billing_customers').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
    if (lookupError) throw lookupError;
    const stripeClient = stripe();
    let customerId = existing?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripeClient.customers.create({ metadata: { supabase_user_id: user.id } });
      customerId = customer.id;
      const { error } = await db.from('billing_customers').upsert({ user_id: user.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
    }
    const origin = Netlify.env.get('APP_ORIGIN');
    const price = Netlify.env.get('STRIPE_PREMIUM_PRICE_ID');
    if (!origin || !price) throw new Error('Premium checkout is not fully configured.');
    const session = await stripeClient.checkout.sessions.create({
      mode: 'subscription', customer: customerId, client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      subscription_data: { metadata: { supabase_user_id: user.id } }, metadata: { supabase_user_id: user.id },
      // The return page is informational only. Entitlements are written by the
      // signed Stripe webhook, never by browser-provided Checkout data.
      success_url: `${origin}/?premium=success`,
      cancel_url: `${origin}/?premium=cancelled`,
    });
    if (!session.url) throw new Error('Stripe did not return a Checkout URL.');
    return json({ url: session.url });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Could not start checkout.' }, 500);
  }
};

export const config: Config = { path: '/api/create-checkout-session' };
