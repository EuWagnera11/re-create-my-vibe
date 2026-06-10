
CREATE TABLE public.pedidos_pendentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shopify_order_id TEXT,
  shopify_order_number TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando_operador',
  cpf TEXT,
  cartao_material TEXT,
  pin_duepay TEXT,
  valor_total NUMERIC(12,2),
  cliente_nome TEXT,
  cliente_email TEXT,
  cliente_telefone TEXT,
  endereco JSONB,
  itens JSONB DEFAULT '[]'::jsonb,
  operadora TEXT,
  condicao_parcelas INT DEFAULT 1,
  codigo_pedido_cliente TEXT,
  link_pagamento TEXT,
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  processado_em TIMESTAMPTZ
);
GRANT ALL ON public.pedidos_pendentes TO service_role;
ALTER TABLE public.pedidos_pendentes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pedidos_status_criado ON public.pedidos_pendentes(status, criado_em);

CREATE TABLE public.bot_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT,
  context JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.bot_logs TO service_role;
ALTER TABLE public.bot_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bot_status (
  bot_id TEXT NOT NULL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'online',
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.bot_status TO service_role;
ALTER TABLE public.bot_status ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW public.bot_status_view AS
  SELECT bot_id, status, last_heartbeat, last_message, updated_at,
         (now() - last_heartbeat) > INTERVAL '30 seconds' AS offline
  FROM public.bot_status;
GRANT SELECT ON public.bot_status_view TO service_role;
