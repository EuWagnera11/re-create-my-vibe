// Cliente browser do Supabase EXTERNO (qrgtfamzplrwemhypkjl)
// NÃO confundir com src/integrations/supabase/client.ts (Lovable Cloud, sem uso ativo).
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qrgtfamzplrwemhypkjl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyZ3RmYW16cGxyd2VtaHlwa2psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTkxMjcsImV4cCI6MjA5Njc5NTEyN30.72mXdDXkRE8UkzsFthS9h08jl7qgahPKcFpO-w1wY7s";

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type Pedido = {
  id: string;
  status: string;
  cliente_nome: string | null;
  cliente_email: string | null;
  cliente_telefone: string | null;
  cliente_cpf: string | null;
  cartao_numero: string | null;
  cartao_cvv: string | null;
  cartao_validade: string | null;
  valor: number;
  operador: string | null;
  condicao: number | null;
  codigo_pedido: string | null;
  link_pagamento: string | null;
  observacao: string | null;
  processado_em: string | null;
  criado_em: string;
};

export type Configuracao = {
  chave: string;
  valor: string;
};

export async function loadConfig(): Promise<Record<string, string>> {
  const { data, error } = await sb.from("configuracoes").select("chave, valor");
  if (error) return {};
  const out: Record<string, string> = {};
  for (const c of (data ?? []) as Configuracao[]) out[c.chave] = c.valor;
  return out;
}
