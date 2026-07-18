create table agent_configs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  persona_name text not null default 'Assistant',
  system_prompt text not null default '',
  -- Free-form knowledge base entries (docs, FAQs, links) used for
  -- retrieval by ai-engine; shape is owned by that package, not the DB.
  knowledge_base jsonb not null default '[]',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

comment on table agent_configs is 'Per-tenant system prompt/persona/knowledge base for AI replies.';

alter table agent_configs enable row level security;

create policy "tenant members can read their own agent config"
  on agent_configs for select
  using (tenant_id = current_tenant_id());

create policy "tenant admins can update their own agent config"
  on agent_configs for update
  using (
    tenant_id = current_tenant_id()
    and exists (
      select 1 from users
      where users.id = auth.uid() and users.role in ('owner', 'admin')
    )
  );
