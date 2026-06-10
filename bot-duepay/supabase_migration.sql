-- Migration: suporte ao bot local DuePay
-- Rodar no SQL Editor do Supabase

-- Coluna nova: link gerado pelo bot (pra mostrar pro cliente)
alter table pedidos_pendentes
  add column if not exists link_pagamento text;

create table if not exists bot_status (
  bot_id text primary key,
  status text not null,                    -- online | busy | offline | error
  last_heartbeat timestamptz not null default now(),
  last_message text,
  updated_at timestamptz default now()
);

create table if not exists bot_logs (
  id uuid primary key default gen_random_uuid(),
  bot_id text,
  level text not null,                     -- info | warn | error
  message text not null,
  context jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_bot_logs_created on bot_logs(created_at desc);
create index if not exists idx_bot_logs_bot on bot_logs(bot_id, created_at desc);

-- View auxiliar: status do bot com flag de online
create or replace view bot_status_view as
select
  bot_id,
  status,
  last_heartbeat,
  last_message,
  extract(epoch from (now() - last_heartbeat))::int as seconds_since_heartbeat,
  case
    when extract(epoch from (now() - last_heartbeat)) < 60 then true
    else false
  end as is_online
from bot_status;
