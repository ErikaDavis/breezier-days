import type { Config } from '@netlify/functions';
import { authenticatedUser, json, stripe } from './_shared/billing';

// Read-only payment verification. Does not grant entitlements or send analytics.
export default async (request: Request) => {
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const user = await authenticatedUser(request);
    const body = await request.json();
    if (typeof body.sessionId !== 'string' || !/^cs_(?:live|test)_[A-Za-z0-9]+$/.test(body.sessionId)) return json({ error: 'Invalid checkout reference.' }, 400);
    const session = await stripe().checkout.sessions.retrieve(body.sessionId, { expand: ['line_items'] });
    if (session.client_reference_id !== user.id || session.metadata?.supabase_user_id !== user.id) return json({ error: 'Checkout is not available.' }, 403);
    const price = Netlify.env.get('STRIPE_PREMIUM_PRICE_ID');
    const verified = Boolean(price && session.mode === 'subscription' && session.status === 'complete'
      && session.payment_status === 'paid' && (session.amount_total ?? 0) > 0
      && session.line_items?.data.some(item => item.price?.id === price));
    const digest = verified ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(session.id)) : null;
    const receipt = digest ? Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') : null;
    return json({ verified, receipt });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: 'Checkout verification is unavailable.' }, 503);
  }
};
export const config: Config = { path: '/api/verify-checkout' };
