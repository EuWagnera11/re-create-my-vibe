"""
Configuração do bot - carrega tudo do .env
"""
import os
from dataclasses import dataclass, field


def _env(key: str, default: str = "") -> str:
    return os.getenv(key, default)


def _env_float(key: str, default: float) -> float:
    try:
        return float(os.getenv(key, str(default)))
    except Exception:
        return default


def _env_bool(key: str, default: bool) -> bool:
    return os.getenv(key, str(default)).lower() in ("true", "1", "yes", "s", "sim")


@dataclass
class Config:
    # ===== Site (Lovable) =====
    SITE_URL: str = _env("SITE_URL", "https://seu-app.lovable.app")
    BOT_TOKEN: str = _env("BOT_TOKEN", "")
    BOT_ID: str = _env("BOT_ID", "loja-pc-01")
    POLL_INTERVAL: float = _env_float("POLL_INTERVAL", 3.0)
    HEARTBEAT_INTERVAL: float = _env_float("HEARTBEAT_INTERVAL", 30.0)

    # Paths dos endpoints (descubra no Network tab do DevTools)
    PATH_NEXT_ORDER: str = _env("PATH_NEXT_ORDER", "/_serverFn/getNextOrder")
    PATH_REPORT: str = _env("PATH_REPORT", "/_serverFn/reportOrder")
    PATH_HEARTBEAT: str = _env("PATH_HEARTBEAT", "/_serverFn/heartbeat")

    # ===== TLN =====
    TLN_LOGIN_URL: str = _env(
        "TLN_LOGIN_URL",
        "https://www1.tln.com.br/apps/ecommerce/autenticacao/login",
    )
    TLN_LINK_PAGE: str = _env(
        "TLN_LINK_PAGE",
        "https://www1.tln.com.br/apps/ecommerce/transacaolink/index",
    )
    TLN_USERNAME: str = _env("TLN_USERNAME", "")
    TLN_PASSWORD: str = _env("TLN_PASSWORD", "")
    TLN_HEADLESS: bool = _env_bool("TLN_HEADLESS", True)
    TLN_SLOW_MO: float = _env_float("TLN_SLOW_MO", 0.0)
    TLN_TIMEOUT: float = _env_float("TLN_TIMEOUT", 15.0)
    DEFAULT_OPERADORA: str = _env("DEFAULT_OPERADORA", "PERSONAL CARD POS-PAGO")
    TLN_FALLBACK_EMAIL: str = _env("TLN_FALLBACK_EMAIL", "")

    # ===== Selectors do TLN (descubra com F12) =====
    # --- LOGIN ---
    SEL_USERNAME: str = _env("SEL_USERNAME", 'input[name="CpfCnpj"]')
    SEL_PASSWORD: str = _env("SEL_PASSWORD", 'input[name="Senha"]')
    SEL_LOGIN_BTN: str = _env("SEL_LOGIN_BTN", 'input[value="Logar"]')

    # --- FORM "GERAR LINK" ---
    SEL_OPERADORA: str = _env("SEL_OPERADORA", 'select[name="operadora"]')
    SEL_VALOR: str = _env("SEL_VALOR", 'input[name="valor"]')
    SEL_CONDICAO: str = _env("SEL_CONDICAO", 'select[name="condicao"]')
    SEL_EMAIL_CONFIRMACAO: str = _env("SEL_EMAIL_CONFIRMACAO", 'input[name="emailConfirmacao"]')
    SEL_EMAIL_LINK: str = _env("SEL_EMAIL_LINK", 'input[name="emailLink"]')
    SEL_CODIGO_PEDIDO: str = _env("SEL_CODIGO_PEDIDO", 'input[name="codigoPedido"]')
    SEL_GERAR_BTN: str = _env("SEL_GERAR_BTN", 'input[value="Gerar link de transação"]')
    SEL_RESULT_LINK: str = _env("SEL_RESULT_LINK", '')

    # --- TELA DE PAGAMENTO (depois de clicar no link gerado) ---
    # IMPORTANTE: essa tela NÃO tem campo de CPF, só cartão + senha + botão
    # Os seletores abaixo usam [name*=] (contém) pra pegar variações
    SEL_PAYMENT_CARD: str = _env("SEL_PAYMENT_CARD", 'input[name*="cartao" i], input[name*="numero" i]')
    SEL_PAYMENT_PIN: str = _env("SEL_PAYMENT_PIN", 'input[name*="senha" i], input[type="password"]')
    SEL_PAYMENT_SUBMIT: str = _env("SEL_PAYMENT_SUBMIT", 'input[value="Confirmar Transação"], button:has-text("Confirmar Transação")')
    SEL_PAYMENT_RESULT: str = _env("SEL_PAYMENT_RESULT", '.alert, .message, .resultado, [class*="result" i], [class*="status" i]')
    SEL_PAYMENT_NSU: str = _env("SEL_PAYMENT_NSU", '[class*="nsu" i], [class*="autorizacao" i], [class*="protocolo" i]')

    # Palavras-chave pra classificar resultado (fallback se IA falhar)
    APPROVED_KEYWORDS: list = field(default_factory=lambda:
        _env("APPROVED_KEYWORDS", "aprovado,autorizado,confirmado,success,sucesso,pago").split(","))
    REJECTED_KEYWORDS: list = field(default_factory=lambda:
        _env("REJECTED_KEYWORDS", "recusado,rejeitado,negado,denied,failed,falha,inválido,insuficiente").split(","))

    # ===== OpenAI (IA) =====
    OPENAI_API_KEY: str = _env("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = _env("OPENAI_MODEL", "gpt-4o")
    USE_AI_FOR_RESULT: bool = _env_bool("USE_AI_FOR_RESULT", True)

    # ===== Diretórios =====
    LOG_DIR: str = _env("LOG_DIR", "logs")
    SCREENSHOT_DIR: str = _env("SCREENSHOT_DIR", "logs/screenshots")

    def validate(self):
        errors = []
        if not self.BOT_TOKEN:
            errors.append("BOT_TOKEN vazio")
        if not self.TLN_USERNAME:
            errors.append("TLN_USERNAME vazio")
        if not self.TLN_PASSWORD:
            errors.append("TLN_PASSWORD vazio")
        if errors:
            raise ValueError("Configuração inválida:\n  - " + "\n  - ".join(errors))
