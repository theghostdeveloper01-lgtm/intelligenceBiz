alter table whatsapp_connections
  add column qr_data text,
  add column qr_expires_at timestamptz;

comment on column whatsapp_connections.qr_data is 'Current pairing QR payload from Baileys, cleared once connected. Rendered client-side into an image — never sent to a third party.';
