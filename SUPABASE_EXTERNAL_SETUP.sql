-- ============================================================
-- SETUP COMPLETO DO SUPABASE EXTERNO (qrgtfamzplrwemhypkjl)
-- Rodar no SQL Editor do dashboard do Supabase (uma vez só)
-- ============================================================

-- ===== 1. Tabela de pedidos =====
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'aguardando_operador',
  cliente_nome text,
  cliente_email text,
  cliente_telefone text,
  cliente_cpf text,
  cartao_numero text,
  cartao_cvv text,
  cartao_validade text,
  valor numeric(10,2) not null,
  operador text default 'PERSONAL CARD POS-PAGO',
  condicao int default 1,
  codigo_pedido text,
  link_pagamento text,
  observacao text,
  processado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists idx_pedidos_status on public.pedidos(status, criado_em desc);

grant select, insert, update on public.pedidos to anon;
grant all on public.pedidos to service_role;

alter table public.pedidos enable row level security;

-- Cliente (anon) pode CRIAR pedido
create policy "anon insere pedido" on public.pedidos
  for insert to anon with check (true);

-- Cliente (anon) pode LER pelo ID (rastreio) — qualquer um com o UUID
create policy "anon le pedido" on public.pedidos
  for select to anon using (true);

-- Bot atualiza via service_role (bypass RLS), painel admin idem

-- ===== 2. Configurações dinâmicas =====
create table if not exists public.configuracoes (
  chave text primary key,
  valor text not null,
  atualizado_em timestamptz not null default now()
);
grant select on public.configuracoes to anon;
grant all on public.configuracoes to service_role;
alter table public.configuracoes enable row level security;
create policy "anon le config" on public.configuracoes
  for select to anon using (true);

insert into public.configuracoes (chave, valor) values
  ('poll_interval', '3'),
  ('heartbeat_interval', '30'),
  ('operadora_default', 'PERSONAL CARD POS-PAGO'),
  ('tln_url', 'https://www1.tln.com.br/apps/ecommerce/transacaolink/index'),
  ('tln_login_url', 'https://www1.tln.com.br/apps/ecommerce/autenticacao/login')
on conflict (chave) do nothing;

-- ===== 3. Status do bot =====
create table if not exists public.bot_status (
  bot_id text primary key,
  status text not null default 'offline',
  last_heartbeat timestamptz not null default now(),
  last_message text,
  updated_at timestamptz not null default now()
);
grant select on public.bot_status to anon;
grant all on public.bot_status to service_role;
alter table public.bot_status enable row level security;
create policy "anon le bot_status" on public.bot_status
  for select to anon using (true);

-- ===== 4. Logs do bot =====
create table if not exists public.bot_logs (
  id uuid primary key default gen_random_uuid(),
  bot_id text not null,
  level text not null default 'info',
  message text,
  context jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists idx_bot_logs_created on public.bot_logs(criado_em desc);
grant select on public.bot_logs to anon;
grant all on public.bot_logs to service_role;
alter table public.bot_logs enable row level security;
create policy "anon le bot_logs" on public.bot_logs
  for select to anon using (true);

-- ===== 5. View: status do bot com flag online =====
create or replace view public.bot_status_view as
select
  bot_id,
  status,
  last_heartbeat,
  last_message,
  extract(epoch from (now() - last_heartbeat))::int as seconds_since_heartbeat,
  (extract(epoch from (now() - last_heartbeat)) < 60) as is_online
from public.bot_status;

grant select on public.bot_status_view to anon, service_role;
