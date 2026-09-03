import { createClient } from '@supabase/supabase-js';

export type PremiumUser = { id: string; email: string | null };

type PremiumStatus = {
  isPremium: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  error?: string | null;
};

type ApiResult<T> = T & { error?: string | null };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

const toPremiumUser = (user: { id: string; email?: string | null; is_anonymous?: boolean } | null): PremiumUser | null =>
  user?.email && !user.is_anonymous ? { id: user.id, email: user.email } : null;

export async function getPremiumUser(): Promise<PremiumUser | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return toPremiumUser(user);
}

export function onPremiumAuthChange(listener: (user: PremiumUser | null) => void) {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => listener(toPremiumUser(session?.user ?? null)));
  return () => subscription.unsubscribe();
}

export async function signInToPremium(email: string, password: string): Promise<{ user: PremiumUser | null; error: string | null }> {
  if (!supabase) return { user: null, error: 'Premium is not configured. Please contact support.' };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: toPremiumUser(data.user), error: error?.message ?? null };
}

export async function createPremiumAccount(email: string, password: string): Promise<{ user: PremiumUser | null; confirmationRequired: boolean; error: string | null }> {
  if (!supabase) return { user: null, confirmationRequired: false, error: 'Premium is not configured. Please contact support.' };
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: toPremiumUser(data.user), confirmationRequired: !data.session && !error, error: error?.message ?? null };
}

async function accessToken(): Promise<string> {
  if (!supabase) throw new Error('Premium is not configured. Please contact support.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !toPremiumUser(session.user)) throw new Error('Please sign in to your Premium account first.');
  return session.access_token;
}

async function request<T>(path: string, method: 'GET' | 'POST'): Promise<ApiResult<T>> {
  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
    ...(method === 'POST' ? { body: '{}' } : {}),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Premium service is unavailable.');
  return body as ApiResult<T>;
}

export async function checkPremiumStatus(): Promise<PremiumStatus> {
  try { return await request<PremiumStatus>('/api/premium-status', 'GET'); }
  catch (error) {
    return { isPremium: false, currentPeriodEnd: null, cancelAtPeriodEnd: false, error: error instanceof Error ? error.message : 'Premium service is unavailable.' };
  }
}

export async function createCheckoutSession(): Promise<{ url: string | null; error: string | null }> {
  try {
    const result = await request<{ url: string }>('/api/create-checkout-session', 'POST');
    return { url: result.url, error: result.error ?? null };
  }
  catch (error) { return { url: null, error: error instanceof Error ? error.message : 'Could not start checkout.' }; }
}

export async function createPortalSession(): Promise<{ url: string | null; error: string | null }> {
  try {
    const result = await request<{ url: string }>('/api/create-portal-session', 'POST');
    return { url: result.url, error: result.error ?? null };
  }
  catch (error) { return { url: null, error: error instanceof Error ? error.message : 'Could not open subscription management.' }; }
}
