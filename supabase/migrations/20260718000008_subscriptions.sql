create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'enterprise')),
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled')),
  current_period_end timestamptz,
  billing_provider text,
  billing_customer_id text,
  billing_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

comment on table subscriptions is 'Billing/plan state per tenant.';

alter table subscriptions enable row level security;

create policy "tenant members can read their own subscription"
  on subscriptions for select
  using (tenant_id = current_tenant_id());
