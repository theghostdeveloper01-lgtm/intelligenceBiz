create table whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  phone_number text,
  connection_type text not null default 'unofficial_baileys'
    check (connection_type in ('unofficial_baileys', 'official_cloud_api')),
  status text not null default 'pending_qr'
    check (status in ('pending_qr', 'connecting', 'connected', 'disconnected', 'logged_out')),
  -- Path to the encrypted Baileys auth state object in the
  -- `whatsapp-sessions` Supabase Storage bucket. The DB never holds the
  -- raw session content, only the pointer + rotation metadata.
  session_storage_path text,
  session_updated_at timestamptz,
  last_connected_at timestamptz,
  last_disconnect_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

comment on table whatsapp_connections is 'One WhatsApp connection per tenant. MVP supports a single number per tenant.';

create index whatsapp_connections_tenant_id_idx on whatsapp_connections (tenant_id);

alter table whatsapp_connections enable row level security;

create policy "tenant members can read their own connection"
  on whatsapp_connections for select
  using (tenant_id = current_tenant_id());
