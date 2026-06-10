-- Migration: setup completo do banco DuePay
-- Rodar no SQL Editor do Supabase

-- ===== Tabela principal: pedidos =====
create table if not exists pedidos_pendentes (
  id uuid primary key default gen_random_uuid(),
  shopify_order_id text unique not null,
  shopify_order_number text,
  status text not null,
  cliente_nome text,
  cliente_email text,
  cliente_telefone text,
  cpf text,
  cartao_material text,
  pin_duepay text,
  valor_total numeric(10,2),
  itens jsonb,
  endereco jsonb,
  operadora text default 'PERSONAL CARD POS-PAGO',
  condicao_parcelas int default 1,
  codigo_pedido_cliente text,
  observacao text,
  processado_em timestamptz,
  criado_em timestamptz default now()
);
create index if not exists idx_pedidos_status on pedidos_pendentes(status, criado_em desc);

-- Coluna pra armazenar o link de pagamento gerado pelo TLN
alter table pedidos_pendentes add column if not exists link_pagamento text;

-- ===== Bot heartbeat =====
create table if not exists bot_status (
  bot_id text primary key,
  status text not null,
  last_heartbeat timestamptz not null default now(),
  last_message text,
  updated_at timestamptz default now()
);

-- ===== Logs do bot =====
create table if not exists bot_logs (
  id uuid primary key default gen_random_uuid(),
  bot_id text,
  level text not null,
  message text not null,
  context jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_bot_logs_created on bot_logs(created_at desc);
create index if not exists idx_bot_logs_bot on bot_logs(bot_id, created_at desc);

-- ===== View: status do bot com flag online/offline =====
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
