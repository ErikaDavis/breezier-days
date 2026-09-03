import type { Config } from '@netlify/functions';
import { admin, authenticatedUser, json, premiumStatus } from './_shared/billing';

export default async (request: Request) => {
  try {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    const user = await authenticatedUser(request);
    const price = Netlify.env.get('STRIPE_PREMIUM_PRICE_ID');
    if (!price) throw new Error('Premium status is not fully configured.');
    const { data, error } = await admin().from('premium_entitlements')
      .select('status, current_period_end, cancel_at_period_end')
      .eq('user_id', user.id)
      .eq('stripe_price_id', price)
      .in('status', ['active', 'trialing']).order('current_period_end', { ascending: false });
    if (error) throw error;
    // A newer canceled subscription must not hide another valid subscription.
    const entitlement = data?.find(row => premiumStatus(row.status, row.current_period_end));
    return json({
      isPremium: Boolean(entitlement),
      currentPeriodEnd: entitlement?.current_period_end ?? null,
      cancelAtPeriodEnd: entitlement?.cancel_at_period_end ?? false,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Could not read Premium status.' }, 500);
  }
};

export const config: Config = { path: '/api/premium-status' };
