create table conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  whatsapp_connection_id uuid references whatsapp_connections (id) on delete set null,
  customer_phone text not null,
  customer_name text,
  status text not null default 'open'
    check (status in ('open', 'human_takeover', 'closed')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, customer_phone)
);

comment on table conversations is 'One thread per customer per tenant.';

create index conversations_tenant_id_idx on conversations (tenant_id);
create index conversations_tenant_last_message_idx on conversations (tenant_id, last_message_at desc);

alter table conversations enable row level security;

create policy "tenant members can read their own conversations"
  on conversations for select
  using (tenant_id = current_tenant_id());

create policy "tenant members can update their own conversations"
  on conversations for update
  using (tenant_id = current_tenant_id());
