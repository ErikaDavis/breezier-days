type PremiumStatus = {
  isPremium: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  error?: string | null;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

async function callFunction<T>(
  functionName: string,
  body: Record<string, unknown>
): Promise<{ data: T | null; error: string | null }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { data: null, error: 'Supabase is not configured in this project.' };
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      }
    );

    const text = await response.text();
    let payload: unknown = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text || null;
    }

    if (!response.ok) {
      const message =
        payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        typeof (payload as { error?: unknown }).error === 'string'
          ? (payload as { error: string }).error
          : `Request failed (${response.status}).`;

      return { data: null, error: message };
    }

    return { data: payload as T, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error.',
    };
  }
}

export async function checkPremiumStatus(
  identity: string,
  migrateFrom?: string
): Promise<PremiumStatus> {
  const result = await callFunction<Partial<PremiumStatus>>('check-premium-status', {
    identity,
    migrateFrom,
  });

  if (result.error) {
    return {
      isPremium: false,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      error: result.error,
    };
  }

  return {
    isPremium: Boolean(result.data?.isPremium),
    currentPeriodEnd: result.data?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: Boolean(result.data?.cancelAtPeriodEnd),
    error: null,
  };
}

export async function createCheckoutSession(
  identity: string,
  origin: string
): Promise<{ url: string | null; error: string | null }> {
  const result = await callFunction<{ url?: string }>('create-checkout-session', {
    identity,
    origin,
  });

  return {
    url: result.data?.url ?? null,
    error: result.error,
  };
}

export async function createPortalSession(
  identity: string,
  origin: string
): Promise<{ url: string | null; error: string | null }> {
  const result = await callFunction<{ url?: string }>('create-portal-session', {
    identity,
    origin,
  });

  return {
    url: result.data?.url ?? null,
    error: result.error,
  };
}
