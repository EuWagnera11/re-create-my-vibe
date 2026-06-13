-- =====================================================================
-- DuePay — Setup do Supabase EXTERNO (qrgtfamzplrwemhypkjl)
-- Rode tudo no SQL Editor do projeto externo.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- pedidos_pendentes (única tabela de pedidos) ----------
create table if not exists public.pedidos_pendentes (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  processado_em timestamptz,

  status text not null default 'pendente',
  source text default 'site',

  -- cliente
  cliente_nome text,
  cliente_cpf text,
  cliente_telefone text,
  cliente_email text,

  -- endereço de entrega
  cliente_cep text,
  cliente_endereco text,
  cliente_numero text,
  cliente_complemento text,
  cliente_bairro text,
  cliente_cidade text,
  cliente_estado text,

  -- cartão (Personal Card)
  cartao_numero text,
  cartao_cvv text,
  cartao_validade text,
  cartao_nome text,

  -- produto / valores
  produto_nome text,
  produto_quantidade integer default 1,
  subtotal numeric(10,2),
  valor_frete numeric(10,2) default 0,
  valor numeric(10,2) not null,

  -- bot / TLN
  operador text default 'PERSONAL CARD POS-PAGO',
  condicao integer default 1,
  codigo_pedido text,
  link_pagamento text,
  observacao text,
  resultado_status text,
  resultado_ns text,
  erro_mensagem text
);

-- Garante colunas novas em bases já existentes
alter table public.pedidos_pendentes
  add column if not exists cliente_cep text,
  add column if not exists cliente_endereco text,
  add column if not exists cliente_numero text,
  add column if not exists cliente_complemento text,
  add column if not exists cliente_bairro text,
  add column if not exists cliente_cidade text,
  add column if not exists cliente_estado text,
  add column if not exists cartao_nome text,
  add column if not exists produto_nome text,
  add column if not exists produto_quantidade integer default 1,
  add column if not exists subtotal numeric(10,2),
  add column if not exists valor_frete numeric(10,2) default 0,
  add column if not exists source text default 'site';

alter table public.pedidos_pendentes enable row level security;

drop policy if exists "anon insert pedidos" on public.pedidos_pendentes;
drop policy if exists "anon read pedidos"   on public.pedidos_pendentes;
drop policy if exists "anon update pedidos" on public.pedidos_pendentes;
drop policy if exists "anon delete pedidos" on public.pedidos_pendentes;

create policy "anon insert pedidos" on public.pedidos_pendentes for insert to anon with check (true);
create policy "anon read pedidos"   on public.pedidos_pendentes for select to anon using (true);
create policy "anon update pedidos" on public.pedidos_pendentes for update to anon using (true) with check (true);
create policy "anon delete pedidos" on public.pedidos_pendentes for delete to anon using (true);

-- ---------- configuracoes ----------
create table if not exists public.configuracoes (
  chave text primary key,
  valor text not null,
  atualizado_em timestamptz not null default now()
);
alter table public.configuracoes enable row level security;
drop policy if exists "anon read config" on public.configuracoes;
create policy "anon read config" on public.configuracoes for select to anon using (true);

insert into public.configuracoes (chave, valor) values
  ('poll_interval', '3'),
  ('heartbeat_interval', '30'),
  ('operadora_default', 'PERSONAL CARD POS-PAGO'),
  ('tln_url', 'https://www1.tln.com.br/apps/ecommerce/transacaolink/index'),
  ('tln_login_url', 'https://www1.tln.com.br/apps/ecommerce/autenticacao/login')
on conflict (chave) do nothing;

-- ---------- bot_status / bot_logs (telemetria do bot) ----------
create table if not exists public.bot_status (
  bot_id text primary key,
  status text not null default 'online',
  last_heartbeat timestamptz not null default now(),
  last_message text,
  updated_at timestamptz not null default now()
);
alter table public.bot_status enable row level security;
drop policy if exists "anon read bot_status" on public.bot_status;
create policy "anon read bot_status" on public.bot_status for select to anon using (true);

create table if not exists public.bot_logs (
  id uuid primary key default gen_random_uuid(),
  bot_id text not null,
  level text not null default 'info',
  message text,
  context jsonb,
  criado_em timestamptz not null default now()
);
alter table public.bot_logs enable row level security;
drop policy if exists "anon read bot_logs" on public.bot_logs;
create policy "anon read bot_logs" on public.bot_logs for select to anon using (true);
