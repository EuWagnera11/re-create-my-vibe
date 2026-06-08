import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabase } from "../supabase";

/**
 * Endpoints publicos relacionados a pedidos DuePay.
 * - createDuePayOrder: cliente finaliza o checkout, cria pedido na fila
 * - getOrderStatus: cliente acompanha o processamento
 */

const itemSchema = z.object({
  nome: z.string(),
  quantidade: z.number(),
  preco: z.number(),
});

const enderecoSchema = z.object({
  cep: z.string(),
  rua: z.string(),
  numero: z.string(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string(),
  estado: z.string(),
});

// === Cliente cria pedido ==========================================
export const createDuePayOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      cpf: z.string().min(11).max(14),
      cartao_material: z.string().min(1),
      pin_duepay: z.string().length(6).optional(),
      valor_total: z.number().positive(),
      cliente_nome: z.string().min(1),
      cliente_email: z.string().email().optional(),
      cliente_telefone: z.string().optional(),
      endereco: enderecoSchema.optional(),
      itens: z.array(itemSchema).default([]),
      operadora: z.string().default("PERSONAL CARD POS-PAGO"),
      condicao_parcelas: z.number().int().min(1).max(12).default(1),
      codigo_pedido_cliente: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getSupabase();
    const orderNumber = `LP-${Date.now().toString().slice(-8)}`;

    const { data: order, error } = await supabase
      .from("pedidos_pendentes")
      .insert({
        shopify_order_id: orderNumber,
        shopify_order_number: orderNumber,
        status: "aguardando_operador",
        cpf: data.cpf.replace(/\D/g, ""),
        cartao_material: data.cartao_material,
        pin_duepay: data.pin_duepay ?? null,
        valor_total: data.valor_total,
        cliente_nome: data.cliente_nome,
        cliente_email: data.cliente_email ?? null,
        cliente_telefone: data.cliente_telefone ?? null,
        endereco: data.endereco ?? null,
        itens: data.itens,
        operadora: data.operadora,
        condicao_parcelas: data.condicao_parcelas,
        codigo_pedido_cliente: data.codigo_pedido_cliente ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("createDuePayOrder erro:", error);
      return { ok: false as const, error: error.message };
    }
    return {
      ok: true as const,
      order_id: order.id,
      order_number: order.shopify_order_number,
    };
  });

// === Cliente acompanha ===========================================
export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      order_id: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getSupabase();
    const { data: pedido } = await supabase
      .from("pedidos_pendentes")
      .select(
        "id, shopify_order_number, status, criado_em, processado_em, observacao, valor_total, link_pagamento"
      )
      .eq("id", data.order_id)
      .single();

    if (!pedido) return { found: false as const };
    return { found: true as const, pedido };
  });

// === Cliente ou operador confirma pagamento manualmente =========
// (usado até liberarem a API/webhook do TLN)
export const confirmPayment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      order_id: z.string().min(1),
      observacao: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getSupabase();
    const { data: pedido, error } = await supabase
      .from("pedidos_pendentes")
      .update({
        status: "processado",
        observacao: data.observacao ?? "Confirmado manualmente",
        processado_em: new Date().toISOString(),
      })
      .eq("id", data.order_id)
      .select()
      .single();

    if (error) {
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const, pedido };
  });

// === Admin: listar todos os pedidos ==============================
export const listOrders = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      status: z
        .enum([
          "aguardando_operador",
          "processando",
          "processado",
          "falha",
          "todos",
        ])
        .default("todos"),
      limit: z.number().int().min(1).max(200).default(50),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getSupabase();
    let query = supabase
      .from("pedidos_pendentes")
      .select(
        "id, shopify_order_number, status, cliente_nome, valor_total, criado_em, processado_em, observacao"
      )
      .order("criado_em", { ascending: false })
      .limit(data.limit);

    if (data.status !== "todos") {
      query = query.eq("status", data.status);
    }

    const { data: pedidos, error } = await query;
    if (error) {
      console.error("listOrders erro:", error);
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const, pedidos: pedidos ?? [] };
  });
