create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references tenants (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'owner' check (role in ('owner', 'admin', 'agent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table users is 'Staff/owner accounts, one row per tenant membership, linked to Supabase Auth.';

create index users_tenant_id_idx on users (tenant_id);

alter table users enable row level security;

-- Looks up the tenant of the currently authenticated user. Used by every
-- other table's RLS policy to scope rows to the caller's tenant.
create or replace function current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from users where id = auth.uid()
$$;

create policy "users can read members of their own tenant"
  on users for select
  using (tenant_id = current_tenant_id());

create policy "users can update their own row"
  on users for update
  using (id = auth.uid());

create policy "tenant members can read their own tenant"
  on tenants for select
  using (id = current_tenant_id());
