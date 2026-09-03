import type { Config } from '@netlify/functions';
import Stripe from 'stripe';
import { json, stripe, upsertSubscription } from './_shared/billing';

const subscriptionEvents = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

export default async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const signature = request.headers.get('stripe-signature');
  if (!signature) return json({ error: 'Missing Stripe signature.' }, 400);

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, Netlify.env.get('STRIPE_WEBHOOK_SECRET') || '');
  } catch (error) {
    return json({ error: `Webhook signature verification failed: ${error instanceof Error ? error.message : 'unknown error'}` }, 400);
  }

  try {
    const stripeClient = stripe();
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.subscription) {
        const id = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        await upsertSubscription(await stripeClient.subscriptions.retrieve(id));
      }
    } else if (subscriptionEvents.has(event.type)) {
      const subscription = event.data.object as Stripe.Subscription;
      // Read current Stripe state rather than persisting a stale event snapshot.
      await upsertSubscription(await stripeClient.subscriptions.retrieve(subscription.id));
    } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      // Basil and newer events nest this reference under parent. Accept older
      // event snapshots too, then retrieve current state with our pinned API.
      const subscription = invoice.parent?.subscription_details?.subscription ??
        (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
      if (subscription) {
        const id = typeof subscription === 'string' ? subscription : subscription.id;
        await upsertSubscription(await stripeClient.subscriptions.retrieve(id));
      }
    }
    return json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing failed', { eventId: event.id, type: event.type, error });
    return json({ error: 'Webhook processing failed.' }, 500);
  }
};

export const config: Config = { path: '/api/stripe-webhook' };
