import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart, formatBRL } from "@/lib/cart";
import bmvarLogo from "@/assets/bmvariedades-logo.png.asset.json";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — BM Variedades" },
      { name: "description", content: "Revise os itens do seu carrinho antes de finalizar a compra." },
    ],
  }),
  component: CarrinhoPage,
});

function CarrinhoPage() {
  const cart = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-gray">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={bmvarLogo.url} alt="BM Variedades" width={160} height={84} loading="eager" className="h-14 w-auto object-contain" />
          </Link>
          <Link to="/" className="flex items-center gap-1 text-sm text-brand-navy hover:underline">
            <ChevronLeft className="h-4 w-4" /> Continuar comprando
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-extrabold text-brand-navy">Meu carrinho</h1>

        {cart.items.length === 0 ? (
          <div className="rounded-lg border border-border bg-white p-10 text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
            <div className="mt-4 text-lg font-bold text-brand-navy">Seu carrinho está vazio</div>
            <p className="mt-1 text-sm text-muted-foreground">Adicione produtos da loja para continuar.</p>
            <Link
              to="/"
              className="mt-5 inline-block rounded-md bg-brand-navy px-5 py-2 text-sm font-bold text-brand-navy-foreground hover:opacity-90"
            >
              Ver produtos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-3 md:col-span-2">
              {cart.items.map((it) => (
                <div key={it.id} className="flex items-center gap-4 rounded-lg border border-border bg-white p-4">
                  <img src={it.img} alt={it.name} width={80} height={80} loading="eager" className="h-20 w-20 shrink-0 object-contain" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{it.name}</div>
                    <div className="text-xs text-muted-foreground">{formatBRL(it.price)} cada</div>
                    <div className="mt-2 inline-flex items-center rounded-md border border-input">
                      <button
                        onClick={() => cart.setQty(it.id, it.qty - 1)}
                        className="px-2 py-1 text-brand-navy hover:bg-brand-gray"
                        aria-label="Diminuir"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-8 px-2 text-center text-sm font-bold">{it.qty}</span>
                      <button
                        onClick={() => cart.setQty(it.id, it.qty + 1)}
                        className="px-2 py-1 text-brand-navy hover:bg-brand-gray"
                        aria-label="Aumentar"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-brand-navy">{formatBRL(it.price * it.qty)}</div>
                    <button
                      onClick={() => cart.remove(it.id)}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand-red"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <aside className="rounded-lg border border-border bg-white p-5">
              <div className="text-sm font-bold uppercase tracking-wider text-brand-navy">Resumo do pedido</div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Itens ({cart.count})</span>
                  <span>{formatBRL(cart.total)}</span>
                </div>
                {(() => {
                  const frete = cart.total <= 140 ? 15 : 0;
                  const total = cart.total + frete;
                  return (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Frete</span>
                        <span>{frete === 0 ? "Grátis" : formatBRL(frete)}</span>
                      </div>
                      {frete > 0 && (
                        <div className="text-[11px] text-muted-foreground">
                          Frete grátis em compras acima de {formatBRL(140)}.
                        </div>
                      )}
                      <div className="border-t border-border pt-3 flex justify-between text-base font-extrabold text-brand-navy">
                        <span>Total</span>
                        <span>{formatBRL(total)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={() => navigate({ to: "/checkout" })}
                className="mt-5 w-full rounded-md bg-brand-navy px-5 py-3 text-sm font-bold text-brand-navy-foreground hover:opacity-90"
              >
                Finalizar compra →
              </button>
              <Link
                to="/"
                className="mt-2 block text-center text-xs text-muted-foreground hover:underline"
              >
                Continuar comprando
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
