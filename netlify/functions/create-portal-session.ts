import type { Config } from '@netlify/functions';
import { admin, authenticatedUser, json, stripe } from './_shared/billing';

export default async (request: Request) => {
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const user = await authenticatedUser(request);
    const { data, error } = await admin().from('billing_customers').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: 'No billing account was found for this user.' }, 404);
    const origin = Netlify.env.get('APP_ORIGIN');
    if (!origin) throw new Error('Premium management is not fully configured.');
    const session = await stripe().billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${origin}/` });
    return json({ url: session.url });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Could not open subscription management.' }, 500);
  }
};

export const config: Config = { path: '/api/create-portal-session' };
