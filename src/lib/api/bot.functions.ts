import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabase } from "../supabase";

/**
 * Endpoints chamados pelo bot Python que roda no PC da loja.
 *
 * Auth: header `X-Bot-Token` deve ser igual a BOT_SHARED_TOKEN.
 * O bot chama esses endpoints a cada 3s pra perguntar se tem pedido novo,
 * e POSTa o resultado do processamento quando termina.
 */

function authenticate(token: string | null): boolean {
  const expected = process.env.BOT_SHARED_TOKEN;
  if (!expected) {
    console.error("BOT_SHARED_TOKEN nao definido!");
    return false;
  }
  return token === expected;
}

// === 1. Bot pergunta: tem pedido novo? =============================
export const getNextOrder = createServerFn({ method: "GET" }).handler(
  async ({ request }) => {
    if (!authenticate(request.headers.get("x-bot-token"))) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    const supabase = getSupabase();
    const { data } = await supabase
      .from("pedidos_pendentes")
      .select("*")
      .eq("status", "aguardando_operador")
      .order("criado_em", { ascending: true })
      .limit(1)
      .single();

    if (!data) {
      return new Response(null, { status: 204 });
    }

    // Marca como processando pra nenhum outro bot pegar
    await supabase
      .from("pedidos_pendentes")
      .update({ status: "processando" })
      .eq("id", data.id);

    return Response.json(data);
  }
);

// === 2. Bot reporta: processei este pedido =========================
export const reportOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      order_id: z.string(),
      status: z.enum(["paid", "failed"]),
      nsu: z.string().nullable().optional(),
      message: z.string().optional(),
      error: z.string().optional(),
      bot_id: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getSupabase();
    const { data: pedido } = await supabase
      .from("pedidos_pendentes")
      .select("*")
      .eq("id", data.order_id)
      .single();

    if (!pedido) {
      return Response.json({ error: "order not found" }, { status: 404 });
    }

    const isApproved = data.status === "paid";

    await supabase
      .from("pedidos_pendentes")
      .update({
        status: isApproved ? "processado" : "falha",
        observacao: data.message ?? data.error ?? null,
        processado_em: new Date().toISOString(),
      })
      .eq("id", data.order_id);

    await supabase.from("bot_logs").insert({
      bot_id: data.bot_id ?? "unknown",
      level: isApproved ? "info" : "error",
      message: `Pedido ${pedido.shopify_order_number}: ${data.status}`,
      context: {
        nsu: data.nsu,
        message: data.message,
        error: data.error,
      },
    });

    return { ok: true };
  });

// === 3. Heartbeat ==================================================
export const heartbeat = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      bot_id: z.string().default("loja-pc-01"),
      status: z.string().default("online"),
      message: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getSupabase();
    await supabase.from("bot_status").upsert({
      bot_id: data.bot_id,
      status: data.status,
      last_heartbeat: new Date().toISOString(),
      last_message: data.message ?? null,
      updated_at: new Date().toISOString(),
    });
    return { ok: true };
  });

// === 4. Admin: ler status do bot ==================================
export const getBotStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("bot_status_view")
      .select("*")
      .order("last_heartbeat", { ascending: false });
    return { bots: data ?? [] };
  }
);
