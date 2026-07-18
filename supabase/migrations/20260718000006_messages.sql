create table messages (
  id uuid primary key default gen_random_uuid(),
  -- Denormalized alongside conversation_id so RLS can filter this
  -- high-volume table directly on tenant_id without a join.
  tenant_id uuid not null references tenants (id) on delete cascade,
  conversation_id uuid not null references conversations (id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  sender_type text not null check (sender_type in ('customer', 'ai_agent', 'human_agent')),
  content jsonb not null,
  external_message_id text,
  status text not null default 'sent'
    check (status in ('queued', 'sent', 'delivered', 'read', 'failed')),
  created_at timestamptz not null default now()
);

comment on table messages is 'Inbound/outbound messages within a conversation. content mirrors channel-core MessageContent.';

create index messages_conversation_id_idx on messages (conversation_id, created_at);
create index messages_tenant_id_idx on messages (tenant_id);

alter table messages enable row level security;

create policy "tenant members can read their own messages"
  on messages for select
  using (tenant_id = current_tenant_id());
