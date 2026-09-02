type PremiumStatus = {
  isPremium: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  error?: string | null;
};

// Breezier Days Premium — Stripe Payment Link
const STRIPE_PAYMENT_LINK =
  'https://buy.stripe.com/14AfZaa1cehs6NrcB03F600';

export async function checkPremiumStatus(
  _identity: string,
  _migrateFrom?: string
): Promise<PremiumStatus> {
  // Temporary until secure Stripe subscription verification is connected.
  return {
    isPremium: false,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    error: null,
  };
}

export async function createCheckoutSession(
  _identity: string,
  _origin: string
): Promise<{ url: string | null; error: string | null }> {
  return {
    url: STRIPE_PAYMENT_LINK,
    error: null,
  };
}

export async function createPortalSession(
  _identity: string,
  _origin: string
): Promise<{ url: string | null; error: string | null }> {
  return {
    url: null,
    error: 'Subscription management is not connected yet.',
  };
}
