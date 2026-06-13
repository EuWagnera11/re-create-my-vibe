import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, Clock, CreditCard, Loader2, XCircle } from "lucide-react";
import { sb, type Pedido } from "@/lib/supabase-external";
import { formatBRL } from "@/lib/cart";
import bmvarLogo from "@/assets/bmvariedades-logo.png.asset.json";

export const Route = createFileRoute("/pedido/$id")({
  head: () => ({
    meta: [
      { title: "Acompanhar pedido — BM Variedades" },
      { name: "description", content: "Acompanhe em tempo real o status do seu pedido." },
    ],
  }),
  component: PedidoPage,
});

const STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  aguardando_operador: { label: "Aguardando processamento", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-5 w-5" /> },
  processando: { label: "Gerando link de pagamento", color: "bg-blue-100 text-blue-800", icon: <Loader2 className="h-5 w-5 animate-spin" /> },
  link_gerado: { label: "Link gerado — clique pra pagar", color: "bg-purple-100 text-purple-800", icon: <CreditCard className="h-5 w-5" /> },
  processado: { label: "Pagamento confirmado!", color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-5 w-5" /> },
  falha: { label: "Pagamento não aprovado", color: "bg-red-100 text-red-800", icon: <XCircle className="h-5 w-5" /> },
};

function PedidoPage() {
  const { id } = Route.useParams();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const load = async () => {
    const { data } = await sb.from("pedidos").select("*").eq("id", id).maybeSingle();
    setPedido((data as Pedido) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!pedido) return;
    if (!["aguardando_operador", "processando", "link_gerado"].includes(pedido.status)) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [pedido?.status]);

  const handleConfirm = async () => {
    if (!confirm("Confirma que o pagamento foi feito no portal?")) return;
    setConfirming(true);
    await sb
      .from("pedidos")
      .update({ status: "processado", observacao: "Confirmado manualmente", processado_em: new Date().toISOString() })
      .eq("id", id);
    await load();
    setConfirming(false);
  };

  const s = pedido ? STATUS[pedido.status] ?? STATUS.aguardando_operador : null;

  return (
    <div className="min-h-screen bg-brand-gray">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={bmvarLogo.url} alt="BM Variedades" width={160} height={84} loading="eager" className="h-14 w-auto object-contain" />
          </Link>
          <Link to="/" className="flex items-center gap-1 text-sm text-brand-navy hover:underline">
            <ChevronLeft className="h-4 w-4" /> Voltar à loja
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10">
        {loading ? (
          <div className="rounded-lg border border-border bg-white p-10 text-center text-muted-foreground">
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
            <div className="mt-3 text-sm">Carregando pedido...</div>
          </div>
        ) : !pedido ? (
          <div className="rounded-lg border border-border bg-white p-10 text-center">
            <XCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <div className="mt-3 text-lg font-bold text-brand-navy">Pedido não encontrado</div>
            <Link to="/" className="mt-4 inline-block text-sm text-brand-navy underline">Voltar à loja</Link>
          </div>
        ) : (
          <>
            <div className="mb-2 text-center text-xs text-muted-foreground">
              Pedido <span className="font-mono">{pedido.id.slice(0, 8)}</span>
            </div>
            <h1 className="mb-6 text-center text-2xl font-extrabold text-brand-navy">
              Obrigado pela sua compra!
            </h1>

            <div className="rounded-lg border border-border bg-white p-5">
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${s!.color}`}>{s!.icon}</div>
                <div className="flex-1">
                  <div className="text-base font-bold text-brand-navy">{s!.label}</div>
                  <div className="text-xs text-muted-foreground">
                    Valor: {formatBRL(Number(pedido.valor))}
                  </div>
                </div>
              </div>

              {pedido.status === "link_gerado" && pedido.link_pagamento && (
                <div className="mt-4 rounded-md border-2 border-brand-navy/30 bg-brand-navy/5 p-4">
                  <div className="mb-2 text-sm font-bold text-brand-navy">
                    👇 Clique abaixo pra concluir o pagamento:
                  </div>
                  <a
                    href={pedido.link_pagamento}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-md bg-brand-navy px-5 py-3 text-center text-sm font-bold text-brand-navy-foreground hover:opacity-90"
                  >
                    PAGAR AGORA →
                  </a>
                </div>
              )}

              {(pedido.status === "link_gerado" || pedido.status === "processando") && (
                <div className="mt-4 rounded-md border border-border bg-brand-gray p-3">
                  <div className="text-xs text-muted-foreground">
                    Já pagou? Após confirmar no portal, marque aqui:
                  </div>
                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border-2 border-brand-navy bg-white px-4 py-2 text-sm font-bold text-brand-navy hover:bg-brand-navy hover:text-brand-navy-foreground disabled:opacity-60"
                  >
                    {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
                    ✓ Já fiz o pagamento, confirmar
                  </button>
                </div>
              )}

              {pedido.observacao && (
                <div className="mt-3 rounded-md bg-brand-gray p-3 text-xs text-muted-foreground">
                  {pedido.observacao}
                </div>
              )}

              {["aguardando_operador", "processando", "link_gerado"].includes(pedido.status) && (
                <div className="mt-3 text-center text-xs text-muted-foreground">
                  Esta tela atualiza sozinha a cada 5 segundos.
                </div>
              )}
            </div>

            <div className="mt-4 text-center text-xs text-muted-foreground">
              Guarde este link para acompanhar seu pedido:
              <div className="mt-1 break-all rounded bg-white p-2 font-mono">
                {typeof window !== "undefined" ? window.location.href : ""}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
