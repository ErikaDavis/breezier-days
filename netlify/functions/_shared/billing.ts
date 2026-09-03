import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const required = (name: string): string => {
  const value = Netlify.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const stripe = () => new Stripe(required('STRIPE_SECRET_KEY'), { apiVersion: '2025-03-31.basil' });
export const admin = () => createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { autoRefreshToken: false, persistSession: false } });
export const publicSupabase = () => createClient(required('SUPABASE_URL'), required('SUPABASE_ANON_KEY'), { auth: { autoRefreshToken: false, persistSession: false } });

export async function authenticatedUser(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Response(JSON.stringify({ error: 'Authentication is required.' }), { status: 401 });
  const { data, error } = await publicSupabase().auth.getUser(authorization.slice(7));
  // Billing is deliberately limited to normal email accounts. This stays true
  // even if anonymous sign-ins are enabled elsewhere in the project later.
  if (error || !data.user || !data.user.email || (data.user as { is_anonymous?: boolean }).is_anonymous) {
    throw new Response(JSON.stringify({ error: 'Please sign in to your email account to use Premium.' }), { status: 401 });
  }
  return data.user;
}

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export const premiumStatus = (status: string, currentPeriodEnd: string | null) =>
  (status === 'active' || status === 'trialing') && currentPeriodEnd !== null && new Date(currentPeriodEnd).getTime() > Date.now();

export async function upsertSubscription(subscription: Stripe.Subscription) {
  // Basil moves billing periods onto subscription items. Use the Premium
  // item's period so another product cannot extend this entitlement.
  const premiumItem = subscription.items.data.find(item => item.price.id === required('STRIPE_PREMIUM_PRICE_ID'));
  const periodEnd = premiumItem?.current_period_end;
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const db = admin();
  const { data: mapping, error: mappingError } = await db.from('billing_customers')
    .select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
  if (mappingError) throw mappingError;
  const metadataUserId = subscription.metadata.supabase_user_id;
  if (mapping && metadataUserId && mapping.user_id !== metadataUserId) {
    throw new Error(`Subscription ${subscription.id} has conflicting user mappings.`);
  }
  // Only server-managed identity is trusted. This also supports a legacy
  // purchase once its ownership has been verified and its customer mapped.
  const userId = mapping?.user_id || metadataUserId;
  if (!userId) throw new Error(`Subscription ${subscription.id} has no verified user mapping.`);
  const { error } = await db.from('premium_entitlements').upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: premiumItem?.price.id ?? null,
    status: subscription.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' });
  if (error) throw new Error(`Could not persist entitlement: ${error.message}`);
}
