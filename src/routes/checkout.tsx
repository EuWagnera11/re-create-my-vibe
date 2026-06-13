import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Lock } from "lucide-react";
import { useCart, formatBRL } from "@/lib/cart";
import { sb } from "@/lib/supabase-external";
import bmvarLogo from "@/assets/bmvariedades-logo.png.asset.json";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — BM Variedades" },
      { name: "description", content: "Finalize seu pedido com pagamento seguro." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    cartaoNumero: "",
    cartaoCvv: "",
    cartaoValidade: "",
    condicao: "1",
    operador: "PERSONAL CARD POS-PAGO",
  });
  const [submitting, setSubmitting] = useState(false);

  // Sem itens → manda pro carrinho
  useEffect(() => {
    if (cart.items.length === 0) navigate({ to: "/carrinho" });
  }, [cart.items.length, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.cpf || !form.cartaoNumero || !form.cartaoCvv || !form.cartaoValidade) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    setSubmitting(true);
    try {
      const resumo = cart.items.map((i) => `${i.qty}x ${i.name}`).join(" | ");
      const { data, error } = await sb
        .from("pedidos")
        .insert({
          status: "aguardando_operador",
          cliente_nome: form.nome,
          cliente_email: form.email || null,
          cliente_telefone: form.telefone || null,
          cliente_cpf: form.cpf,
          cartao_numero: form.cartaoNumero.replace(/\s/g, ""),
          cartao_cvv: form.cartaoCvv,
          cartao_validade: form.cartaoValidade,
          valor: cart.total,
          operador: form.operador,
          condicao: parseInt(form.condicao, 10),
          observacao: resumo,
        })
        .select("id")
        .single();
      if (error) throw error;
      cart.clear();
      navigate({ to: "/pedido/$id", params: { id: data.id } });
    } catch (err) {
      alert("Erro ao criar pedido: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-gray">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={bmvarLogo.url} alt="BM Variedades" width={160} height={84} loading="eager" className="h-14 w-auto object-contain" />
          </Link>
          <Link to="/carrinho" className="flex items-center gap-1 text-sm text-brand-navy hover:underline">
            <ChevronLeft className="h-4 w-4" /> Voltar ao carrinho
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-extrabold text-brand-navy">Finalizar compra</h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-5 md:col-span-2">
            <section className="rounded-lg border border-border bg-white p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-brand-navy">Seus dados</h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium">Nome completo *</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className="w-full rounded-md border border-input px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium">E-mail</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-md border border-input px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Telefone</label>
                    <input
                      type="tel"
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                      className="w-full rounded-md border border-input px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-navy">
                <Lock className="h-4 w-4" /> Pagamento
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium">CPF *</label>
                  <input
                    type="text"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                    placeholder="00000000000"
                    inputMode="numeric"
                    maxLength={11}
                    className="w-full rounded-md border border-input px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Número do cartão *</label>
                  <input
                    type="text"
                    value={form.cartaoNumero}
                    onChange={(e) => setForm({ ...form, cartaoNumero: e.target.value.replace(/\D/g, "").slice(0, 19) })}
                    placeholder="0000 0000 0000 0000"
                    inputMode="numeric"
                    className="w-full rounded-md border border-input px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Validade (MM/AA) *</label>
                    <input
                      type="text"
                      value={form.cartaoValidade}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                        setForm({ ...form, cartaoValidade: v });
                      }}
                      placeholder="MM/AA"
                      maxLength={5}
                      className="w-full rounded-md border border-input px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">CVV *</label>
                    <input
                      type="text"
                      value={form.cartaoCvv}
                      onChange={(e) => setForm({ ...form, cartaoCvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      placeholder="000"
                      inputMode="numeric"
                      maxLength={4}
                      className="w-full rounded-md border border-input px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Operadora</label>
                    <select
                      value={form.operador}
                      onChange={(e) => setForm({ ...form, operador: e.target.value })}
                      className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                    >
                      <option>PERSONAL CARD POS-PAGO</option>
                      <option>PERSONAL CARD PRE-PAGO</option>
                      <option>TRIO CARD POS-PAGO</option>
                      <option>TRIO CARD PRE-PAGO</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Parcelas</label>
                    <select
                      value={form.condicao}
                      onChange={(e) => setForm({ ...form, condicao: e.target.value })}
                      className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                    >
                      {Array.from({ length: 12 }, (_, n) => (
                        <option key={n + 1} value={n + 1}>{n + 1}x de {formatBRL(cart.total / (n + 1))}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-lg border border-border bg-white p-5">
            <div className="text-sm font-bold uppercase tracking-wider text-brand-navy">Resumo</div>
            <div className="mt-4 space-y-3 text-sm">
              {cart.items.map((it) => (
                <div key={it.id} className="flex items-start gap-2">
                  <img src={it.img} alt="" width={40} height={40} loading="eager" className="h-10 w-10 shrink-0 object-contain" />
                  <div className="flex-1">
                    <div className="line-clamp-2 text-xs font-semibold">{it.name}</div>
                    <div className="text-xs text-muted-foreground">{it.qty}x {formatBRL(it.price)}</div>
                  </div>
                  <div className="text-xs font-bold text-brand-navy">{formatBRL(it.price * it.qty)}</div>
                </div>
              ))}
              <div className="border-t border-border pt-3 flex justify-between text-base font-extrabold text-brand-navy">
                <span>Total</span>
                <span>{formatBRL(cart.total)}</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-brand-navy px-5 py-3 text-sm font-bold text-brand-navy-foreground hover:opacity-90 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Processando..." : "Pagar agora"}
            </button>
            <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" /> Pagamento seguro
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
