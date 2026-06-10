# BM Variedades — Loja com integração DuePay

E-commerce de material escolar com integração automatizada ao programa
Cartão Material DuePay (Personal Card) da Prefeitura de São Paulo.

## O que é

Loja online que vende uniformes e kits escolares pra famílias que recebem
o auxílio municipal. O cliente escolhe os produtos, preenche um form com
os dados do Cartão Material DuePay, e o sistema processa o pagamento
automaticamente no portal TLN/Personal Card via um bot que roda no PC
da loja.

## Arquitetura

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Cliente       │         │   Site Lovable   │         │   Supabase      │
│   (navegador)   │────────▶│  (TanStack Start)│────────▶│   (banco)       │
└─────────────────┘  form   └────────┬─────────┘  fila   └────────┬────────┘
                                    │                              │
                                    │  getNextOrder                ▲
                                    │  reportOrder                 │
                                    │  heartbeat                   │ atualiza status
                                    ▼                              │
                          ┌──────────────────┐                     │
                          │   Bot Python     │─────Supabase────────┘
                          │  (PC da loja)    │
                          └────────┬─────────┘
                                   │ Playwright
                                   ▼
                          ┌──────────────────┐
                          │  Portal TLN      │
                          │  (Personal Card) │
                          └──────────────────┘
```

### Componentes

1. **Site (este repo, Lovable / TanStack Start + Vite + Supabase)**
   - Form de checkout com CPF, cartão material, PIN, valor, condição
   - Painel de rastreio pro cliente (auto-refresh a cada 5s)
   - Painel admin com status do bot
   - Server functions: `createDuePayOrder`, `getOrderStatus`, `confirmPayment`, `getNextOrder`, `reportOrder`, `heartbeat`, `getBotStatus`

2. **Bot Python (neste repo, pasta `bot-duepay/`)**
   - Roda 24/7 no PC da loja
   - Python 3.12 + Playwright + aiohttp
   - A cada 3s pergunta pro site se tem pedido novo
   - Loga no TLN, gera link, preenche cartão+PIN do cliente, submete
   - Reporta o resultado de volta pro site
   - Logs em `bot-duepay/logs/`
   - Modo "humano visível": Chrome abre na tela, digita devagar com pausas

3. **Supabase**
   - Tabela `pedidos_pendentes` — fila de pedidos
   - Tabela `bot_status` — heartbeat do bot
   - Tabela `bot_logs` — log centralizado
   - View `bot_status_view` — flag online/offline

## Como rodar

### 1. Setup do site (uma vez)

```bash
npm install --legacy-peer-deps
npm install @supabase/supabase-js
cp .env.example .env
# Editar .env com SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOT_SHARED_TOKEN
npm run dev
```

### 2. Setup do Supabase (uma vez)

1. Cria projeto em https://supabase.com
2. Vai no SQL Editor, cola e roda o conteúdo de `supabase_migration.sql`
3. Copia a URL e a service_role key pro `.env`

### 3. Setup do bot (PC da loja, uma vez)

```powershell
cd bot-duepay
.\setup.bat
copy .env.example .env
# Editar .env com TLN_USERNAME, TLN_PASSWORD, BOT_TOKEN (mesmo do site), SITE_URL
.\run.bat
```

## Deploy

```bash
git push origin main
```

Lovable detecta automaticamente e faz deploy. Em 1-2 min o site atualizado
tá no ar.

## Documentação

- `HANDOFF.md` — contexto completo pra retomar em outra sessão/IA
- `bot-duepay/README.md` — instruções específicas do bot
- `bot-duepay/inspect_page.py` — script pra descobrir seletores do TLN
- `bot-duepay/discover_selectors.py` — auto-descoberta com IA

## Limitações conhecidas

- DuePay/Personal Card é sistema fechado, sem API pública
- Sem webhook de confirmação → confirmação manual via botão "Já paguei"
- Automação usa navegador headless (Playwright) — pode quebrar se TLN mudar layout
- OpenAI (GPT-4o) é opcional — bot funciona com keyword matching sem IA
- Bot precisa de PC ligado 24/7 na loja
