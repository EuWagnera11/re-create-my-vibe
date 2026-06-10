# Bot DuePay

Bot Python que roda 24/7 num PC da loja. Faz a ponte entre a Shopify/Lovable e o portal manual do DuePay/TLN.

## O que ele faz

```
1. Pergunta pro site (Lovable) a cada 3s: "tem pedido DuePay novo?"
2. Se sim, recebe os dados (CPF, cartão, valor, NSU desejado)
3. Loga no portal TLN (Playwright/Chromium)
4. Preenche o formulário de venda
5. Submete
6. Captura o resultado (aprovado/recusado + NSU se houver)
7. Reporta pro site
8. Site marca o pedido como pago no Shopify + manda e-mail ao cliente
```

A cada 30s também manda um "heartbeat" — o site mostra "bot online" no painel admin.

## Instalação (uma vez)

### 1. Instalar Python
Baixe Python 3.11+ de https://www.python.org/downloads/windows/
- ✅ Marque **"Add Python to PATH"** na instalação

### 2. Rodar setup
Dá dois cliques em `setup.bat` (ou roda pelo terminal):
```
setup.bat
```

Isso:
- Cria um ambiente virtual `.venv/`
- Instala as dependências
- Baixa o Chromium do Playwright
- Cria um `.env` a partir do `.env.example`

### 3. Configurar o `.env`
Abra o arquivo `.env` num editor de texto (Notepad, VS Code, etc.) e preencha:

```ini
SITE_URL=https://seu-app.lovable.app        # URL do app Lovable
BOT_TOKEN=um-token-seguro-de-pelo-menos-32-chars  # invente um
TLN_USERNAME=seu-usuario-tln
TLN_PASSWORD=sua-senha-tln
```

Pra gerar um token seguro, abre o PowerShell e roda:
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### 4. Descobrir os selectors do TLN (1x)

Os "selectors" são como o bot encontra cada campo no portal TLN. Você precisa descobri-los 1 vez:

1. Abra o portal TLN no Chrome: https://www1.tln.com.br/apps/ecommerce/autenticacao/login
2. Aperte **F12** (DevTools)
3. Clique com botão direito no campo "Usuário" > "Inspecionar"
4. Vai aparecer o HTML. O campo tem tipo `input`. Copie o `name=""` ou `id=""`
5. Repita pra cada campo (senha, botão de login, depois CPF, cartão, valor, etc.)
6. Coloque no `.env`:

```ini
SEL_USERNAME=input[name="login"]      # ex: o name que você viu
SEL_PASSWORD=input[name="senha"]      # ex: o name que você viu
SEL_LOGIN_BTN=button[type="submit"]
SEL_CPF=input[name="cpf"]
SEL_CARD=input[name="cartao"]
SEL_VALUE=input[name="valor"]
SEL_SUBMIT=button[type="submit"]
SEL_RESULT=.alert                     # div que mostra "Aprovado" / "Recusado"
```

**Dica**: se o TLN mostrar "Aprovado" ou "Recusado" num texto específico da página, configure o `SEL_RESULT` pra esse seletor.

## Rodar

Dá dois cliques em `run.bat` (ou `python main.py` no terminal).

Você vai ver no console:
```
2025-01-15 10:23:45 [INFO] main: BOT DUEPAY INICIANDO
2025-01-15 10:23:45 [INFO] main:   Site: https://...
2025-01-15 10:23:46 [INFO] tln_bot: Iniciando navegador...
2025-01-15 10:23:48 [INFO] tln_bot: Acessando https://www1.tln.com.br/...
2025-01-15 10:23:50 [INFO] tln_bot: Login OK. URL atual: ...
2025-01-15 10:23:50 [INFO] main: Bot pronto. Aguardando pedidos...
```

Quando um pedido chegar:
```
2025-01-15 10:25:12 [INFO] main: [#1042] Recebido. Processando...
2025-01-15 10:25:12 [INFO] tln_bot: TLN respondeu: 'Aprovado' → paid
2025-01-15 10:25:13 [INFO] main: [#1042] Resultado: paid (NSU 123456)
```

## Rodar 24/7 (auto-start no boot)

Pra rodar como serviço do Windows (sobe sozinho quando o PC liga):

### Opção A: Iniciar com o Windows (mais simples)
1. Aperte `Win + R`, digite `shell:startup`, Enter
2. Cria um atalho pro `run.bat` lá dentro

### Opção B: Task Scheduler (mais robusto)
1. Abre o **Agendador de Tarefas** do Windows
2. "Criar Tarefa Básica" → nome: "Bot DuePay"
3. Disparador: "Ao fazer logon"
4. Ação: "Iniciar um programa" → aponta pro `run.bat`
5. ✅ Marque "Executar estando o usuário conectado ou não" (se quiser)
6. Configura pra reiniciar se falhar (em "Configurações")

## Logs

- **Console**: tempo real, colorido
- **Arquivo**: `logs/bot.log` (rotativo, 10MB x 5 backups = até 50MB de histórico)
- **Screenshots de erro**: `logs/screenshots/` — o bot tira foto da tela quando algo dá errado

## Quando algo dá errado

1. **Olhe o console** — a mensagem de erro geralmente diz o que aconteceu
2. **Olhe `logs/screenshots/`** — vê o que o bot estava vendo quando falhou
3. **Olhe `logs/bot.log`** — histórico completo
4. Se for o TLN que mudou o site, ajuste os selectors no `.env`

## Estrutura de arquivos

```
bot-duepay/
├── main.py              # Orquestrador (loop principal)
├── config.py            # Lê .env e expõe configs
├── site_api.py          # Comunicação com Lovable
├── tln_bot.py           # Playwright + automação TLN
├── logger.py            # Setup de logging
├── .env                 # CONFIGURAÇÕES (não commitar!)
├── .env.example         # template
├── requirements.txt     # deps Python
├── setup.bat            # instala tudo
├── run.bat              # roda
├── logs/                # criado automaticamente
│   ├── bot.log
│   └── screenshots/
└── .venv/               # ambiente virtual (criado pelo setup)
```

## Próximos passos / melhorias futuras

- [ ] Múltiplos bots (com lock distribuído)
- [ ] Notificação Telegram quando bot cai ou tem erro
- [ ] Auto-update do .env via painel Lovable
- [ ] Retry automático com backoff exponencial
- [ ] Suporte a captcha (se TLN adicionar)
