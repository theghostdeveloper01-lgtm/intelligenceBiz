-- Private bucket for encrypted Baileys auth state. Objects are stored at
-- `{tenant_id}/creds.enc` and written/read only by the whatsapp-worker
-- service via the service-role key, never by tenant-facing clients.
insert into storage.buckets (id, name, public)
values ('whatsapp-sessions', 'whatsapp-sessions', false)
on conflict (id) do nothing;

create policy "service role only access to whatsapp session objects"
  on storage.objects for all
  using (bucket_id = 'whatsapp-sessions' and auth.role() = 'service_role')
  with check (bucket_id = 'whatsapp-sessions' and auth.role() = 'service_role');
