create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  updated_at timestamptz not null default now()
);

create table if not exists public.premium_entitlements (
  stripe_subscription_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_price_id text,
  status text not null check (status in ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists premium_entitlements_user_id_updated_at_idx
  on public.premium_entitlements (user_id, updated_at desc);

alter table public.billing_customers enable row level security;
alter table public.premium_entitlements enable row level security;

create policy "Users can read their own Premium entitlement"
  on public.premium_entitlements for select to authenticated
  using (auth.uid() = user_id);

-- No client-side write policies: only the server-side Stripe webhook uses the service-role key.
