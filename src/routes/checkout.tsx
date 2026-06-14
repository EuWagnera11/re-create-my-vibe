import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Lock } from "lucide-react";
import { useCart, formatBRL } from "@/lib/cart";
import { sb, PEDIDOS_TABLE } from "@/lib/supabase-external";
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

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB",
  "PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

// ------- máscaras -------
const onlyDigits = (s: string) => s.replace(/\D/g, "");
const maskCPF = (s: string) => {
  const d = onlyDigits(s).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};
const maskPhone = (s: string) => {
  const d = onlyDigits(s).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => `(${a}) ${b}${c ? "-" + c : ""}`).trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
};
const maskCEP = (s: string) => onlyDigits(s).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
const maskCard = (s: string) => onlyDigits(s).slice(0, 17).replace(/(\d{4})(?=\d)/g, "$1 ");

// validação CPF
const validaCPF = (cpf: string) => {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i);
  let r = (s * 10) % 11; if (r === 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i);
  r = (s * 10) % 11; if (r === 10) r = 0;
  return r === parseInt(d[10]);
};

type FormState = {
  nome: string; email: string; telefone: string; cpf: string;
  cep: string; endereco: string; numero: string; complemento: string;
  bairro: string; cidade: string; estado: string;
  cartaoNumero: string; cartaoSenha: string; cartaoPincode: string;
};

const empty: FormState = {
  nome: "", email: "", telefone: "", cpf: "",
  cep: "", endereco: "", numero: "", complemento: "",
  bairro: "", cidade: "", estado: "",
  cartaoNumero: "", cartaoSenha: "", cartaoPincode: "",
};

function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (cart.items.length === 0) navigate({ to: "/carrinho" });
  }, [cart.items.length, navigate]);

  const set = <K extends keyof FormState>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const buscarCEP = async () => {
    const cep = onlyDigits(form.cep);
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await r.json();
      if (!j.erro) {
        setForm((f) => ({
          ...f,
          endereco: j.logradouro || f.endereco,
          bairro: j.bairro || f.bairro,
          cidade: j.localidade || f.cidade,
          estado: (j.uf || f.estado).toUpperCase(),
        }));
      }
    } catch {} finally { setCepLoading(false); }
  };

  const validar = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (form.nome.trim().length < 5 || /\d/.test(form.nome)) e.nome = "Nome completo, sem números (mín. 5)";
    if (!validaCPF(form.cpf)) e.cpf = "CPF inválido";
    if (onlyDigits(form.telefone).length !== 11) e.telefone = "Telefone com DDD (11 dígitos)";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
    if (onlyDigits(form.cep).length !== 8) e.cep = "CEP inválido";
    if (!form.endereco.trim()) e.endereco = "Obrigatório";
    if (!form.numero.trim()) e.numero = "Obrigatório";
    if (!form.bairro.trim()) e.bairro = "Obrigatório";
    if (!form.cidade.trim()) e.cidade = "Obrigatório";
    if (!UFS.includes(form.estado)) e.estado = "UF inválida";
    const cartLen = onlyDigits(form.cartaoNumero).length;
    if (cartLen !== 16 && cartLen !== 17) e.cartaoNumero = "16 ou 17 dígitos";
    if (onlyDigits(form.cartaoSenha).length !== 4) e.cartaoSenha = "Senha de 4 dígitos";
    if (onlyDigits(form.cartaoPincode).length !== 6) e.cartaoPincode = "PIN de 6 dígitos";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    try {
      const qtd = cart.items.reduce((s, i) => s + i.qty, 0);
      const subtotal = cart.total;
      const frete = subtotal <= 140 ? 15 : 0;
      const total = subtotal + frete;
      const produtoNome = cart.items.length === 1
        ? cart.items[0].name
        : cart.items.map((i) => `${i.qty}x ${i.name}`).join(" | ");

      const payload = {
        status: "pendente",
        source: "site",

        cliente_nome: form.nome.trim(),
        cliente_cpf: onlyDigits(form.cpf),
        cliente_telefone: onlyDigits(form.telefone),
        cliente_email: form.email.trim(),

        cliente_cep: maskCEP(form.cep),
        cliente_endereco: form.endereco.trim(),
        cliente_numero: form.numero.trim(),
        cliente_complemento: form.complemento.trim() || null,
        cliente_bairro: form.bairro.trim(),
        cliente_cidade: form.cidade.trim(),
        cliente_estado: form.estado.toUpperCase(),

        cartao_numero: onlyDigits(form.cartaoNumero),
        cartao_senha: onlyDigits(form.cartaoSenha),
        cartao_pincode: onlyDigits(form.cartaoPincode),

        produto_nome: produtoNome,
        produto_quantidade: qtd,
        subtotal,
        valor_frete: frete,
        valor: total,

        operador: "PERSONAL CARD POS-PAGO",
        condicao: 1,
      };

      const { data, error } = await sb
        .from(PEDIDOS_TABLE)
        .insert(payload)
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

  const Err = ({ k }: { k: keyof FormState }) =>
    errors[k] ? <div className="mt-1 text-xs text-red-600">{errors[k]}</div> : null;

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
            {/* DADOS PESSOAIS */}
            <section className="rounded-lg border border-border bg-white p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-brand-navy">Seus dados</h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium">Nome completo *</label>
                  <input type="text" value={form.nome} onChange={(e) => set("nome", e.target.value)}
                    className="w-full rounded-md border border-input px-3 py-2 text-sm" required />
                  <Err k="nome" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium">CPF *</label>
                    <input type="text" value={form.cpf} onChange={(e) => set("cpf", maskCPF(e.target.value))}
                      placeholder="000.000.000-00" inputMode="numeric"
                      className="w-full rounded-md border border-input px-3 py-2 text-sm" required />
                    <Err k="cpf" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Telefone (WhatsApp) *</label>
                    <input type="tel" value={form.telefone} onChange={(e) => set("telefone", maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000" inputMode="numeric"
                      className="w-full rounded-md border border-input px-3 py-2 text-sm" required />
                    <Err k="telefone" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">E-mail *</label>
                  <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                    className="w-full rounded-md border border-input px-3 py-2 text-sm" required />
                  <Err k="email" />
                </div>
              </div>
            </section>

            {/* ENDEREÇO */}
            <section className="rounded-lg border border-border bg-white p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-brand-navy">Endereço de entrega</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
                  <div>
                    <label className="mb-1 block text-xs font-medium">CEP *</label>
                    <div className="relative">
                      <input type="text" value={form.cep}
                        onChange={(e) => set("cep", maskCEP(e.target.value))}
                        onBlur={buscarCEP}
                        placeholder="00000-000" inputMode="numeric"
                        className="w-full rounded-md border border-input px-3 py-2 text-sm" required />
                      {cepLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    <Err k="cep" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Endereço (rua) *</label>
                    <input type="text" value={form.endereco} onChange={(e) => set("endereco", e.target.value)}
                      className="w-full rounded-md border border-input px-3 py-2 text-sm" required />
                    <Err k="endereco" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Número *</label>
                    <input type="text" value={form.numero} onChange={(e) => set("numero", e.target.value)}
                      className="w-full rounded-md border border-input px-3 py-2 text-sm" required />
                    <Err k="numero" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Complemento</label>
                    <input type="text" value={form.complemento} onChange={(e) => set("complemento", e.target.value)}
                      className="w-full rounded-md border border-input px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_100px]">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Bairro *</label>
                    <input type="text" value={form.bairro} onChange={(e) => set("bairro", e.target.value)}
                      className="w-full rounded-md border border-input px-3 py-2 text-sm" required />
                    <Err k="bairro" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Cidade *</label>
                    <input type="text" value={form.cidade} onChange={(e) => set("cidade", e.target.value)}
                      className="w-full rounded-md border border-input px-3 py-2 text-sm" required />
                    <Err k="cidade" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">UF *</label>
                    <select value={form.estado} onChange={(e) => set("estado", e.target.value)}
                      className="w-full rounded-md border border-input bg-white px-2 py-2 text-sm" required>
                      <option value="">—</option>
                      {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <Err k="estado" />
                  </div>
                </div>
              </div>
            </section>

            {/* CARTÃO */}
            <section className="rounded-lg border border-border bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-navy">
                <Lock className="h-4 w-4" /> Dados do cartão Personal Card
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium">Número do cartão *</label>
                  <input type="text" value={form.cartaoNumero}
                    onChange={(e) => set("cartaoNumero", maskCard(e.target.value))}
                    placeholder="0000 0000 0000 0000" inputMode="numeric"
                    className="w-full rounded-md border border-input px-3 py-2 text-sm font-mono" required />
                  <Err k="cartaoNumero" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Senha do cartão (4 dígitos) *</label>
                    <input type="password" value={form.cartaoSenha}
                      onChange={(e) => set("cartaoSenha", onlyDigits(e.target.value).slice(0, 4))}
                      placeholder="••••" inputMode="numeric" maxLength={4} autoComplete="off"
                      className="w-full rounded-md border border-input px-3 py-2 text-sm" required />
                    <Err k="cartaoSenha" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">PIN Code (6 dígitos) *</label>
                    <input type="password" value={form.cartaoPincode}
                      onChange={(e) => set("cartaoPincode", onlyDigits(e.target.value).slice(0, 6))}
                      placeholder="••••••" inputMode="numeric" maxLength={6} autoComplete="off"
                      className="w-full rounded-md border border-input px-3 py-2 text-sm" required />
                    <Err k="cartaoPincode" />
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Não pedimos validade nem nome impresso do cartão.
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
              {(() => {
                const frete = cart.total <= 140 ? 15 : 0;
                const total = cart.total + frete;
                return (
                  <>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span><span>{formatBRL(cart.total)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Frete</span>
                      <span>{frete === 0 ? "Grátis" : formatBRL(frete)}</span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between text-base font-extrabold text-brand-navy">
                      <span>Total</span><span>{formatBRL(total)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
            <button type="submit" disabled={submitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-brand-navy px-5 py-3 text-sm font-bold text-brand-navy-foreground hover:opacity-90 disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Processando..." : "Finalizar pedido"}
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
