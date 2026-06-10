"""
Bot DuePay - Automação completa do portal TLN.
Gera link de pagamento, preenche cartão+PIN do cliente, submete, captura resultado.

Fluxo end-to-end (em segundos):
  1. Login (uma vez, sessão fica viva)
  2. /transacaolink/index → preenche Operadora + Valor + Condição + Email
  3. Captura o link gerado
  4. Abre o link em outra aba
  5. Preenche CPF + Cartão + PIN do cliente (que veio do nosso form)
  6. Submete
  7. Lê o resultado (aprovado/recusado + NSU)
  8. Reporta pro site

Os campos do passo 5/6 precisam ser mapeados - o usuário descobre com F12.
"""
import asyncio
import logging
import os
import re
from typing import Optional
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from config import Config

logger = logging.getLogger("tln_bot")


class TLNBot:
    def __init__(self, cfg: Config, ai_helper=None):
        self.cfg = cfg
        self.ai = ai_helper  # AIHelper opcional (GPT-4o vision)
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.payment_page: Optional[Page] = None  # segunda aba pro link de pagamento
        self._logged_in = False

    async def start(self):
        logger.info("Iniciando navegador (visível)...")
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=self.cfg.TLN_HEADLESS,
            # Janela em tamanho realista, com posição destacada pra tu ver
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--window-size=1366,800",
                "--window-position=100,100",
            ],
        )
        self.context = await self.browser.new_context(
            viewport={"width": 1366, "height": 800},
            # Slow motion global: cada ação do bot leva 0,5-1,5s (parece humano)
            slow_mo=self.cfg.TLN_SLOW_MO,
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        self.page = await self.context.new_page()
        # Garante que a janela aparece no topo pra tu ver
        await asyncio.sleep(0.5)
        await self.login()

    async def login(self):
        logger.info(f"Acessando {self.cfg.TLN_LOGIN_URL}")
        await self.page.goto(self.cfg.TLN_LOGIN_URL, wait_until="domcontentloaded")
        await self._wait_idle()
        await asyncio.sleep(0.5)  # pausa pra tu ver a tela carregar

        await self.page.wait_for_selector(self.cfg.SEL_USERNAME, timeout=10000)
        await self.page.wait_for_selector(self.cfg.SEL_PASSWORD, timeout=5000)

        # Digita caractere por caractere (mais humano)
        await self.page.click(self.cfg.SEL_USERNAME)
        await self._type_human(self.cfg.SEL_USERNAME, self.cfg.TLN_USERNAME)
        await asyncio.sleep(0.3)
        await self._type_human(self.cfg.SEL_PASSWORD, self.cfg.TLN_PASSWORD)
        await asyncio.sleep(0.5)  # pausa antes de clicar

        async with self.page.expect_navigation(wait_until="domcontentloaded", timeout=15000):
            await self.page.click(self.cfg.SEL_LOGIN_BTN)

        await asyncio.sleep(1.5)  # pausa pra transição de página
        current_url = self.page.url
        if "login" in current_url.lower() or "autenticacao" in current_url.lower():
            await self._screenshot("login_failed")
            raise Exception("Login falhou - ainda na tela de login (credenciais erradas?)")
        self._logged_in = True
        logger.info(f"Login OK. URL atual: {current_url}")

    async def _type_human(self, selector: str, text: str, delay_ms: int = 80):
        """Digita caractere por caractere com delay — parece humano."""
        try:
            el = await self.page.query_selector(selector)
            if not el:
                return
            for ch in str(text):
                await el.type(ch, delay=delay_ms)
        except Exception as e:
            logger.debug(f"Falha no type human, caindo pro fill: {e}")
            try:
                await self.page.fill(selector, str(text))
            except Exception:
                pass

    async def relogin(self):
        self._logged_in = False
        try:
            await self.page.goto(self.cfg.TLN_LOGIN_URL, wait_until="domcontentloaded")
        except Exception:
            pass
        await self.login()

    # =========================================================
    # FLUXO COMPLETO: gera link → processa pagamento → resultado
    # =========================================================

    async def process_payment(self, order: dict) -> dict:
        """
        Faz tudo em sequência. Tempo esperado: 5-15s por pedido.
        Retorna: { status, nsu, link, message }
        """
        if not self._logged_in:
            await self.login()

        order_num = order.get("shopify_order_number", order.get("id", "?"))
        log_prefix = f"[{order_num}]"

        # ETAPA 1: gera o link
        logger.info(f"{log_prefix} Etapa 1/2: gerando link no TLN...")
        link = await self.generate_link(order)
        logger.info(f"{log_prefix} Link gerado: {link[:80]}")

        # ETAPA 2: processa o pagamento via o link
        logger.info(f"{log_prefix} Etapa 2/2: processando pagamento...")
        result = await self.complete_payment(
            link=link,
            cpf=order.get("cpf", ""),
            cartao=order.get("cartao_material", ""),
            pin=order.get("pin_duepay", ""),
            order_num=order_num,
        )

        return {
            "status": result["status"],
            "nsu": result.get("nsu"),
            "link": link,
            "message": result.get("message", ""),
        }

    # =========================================================
    # ETAPA 1: gerar link de pagamento
    # =========================================================

    async def generate_link(self, order: dict) -> str:
        """
        Loga, vai em "Gerar link", preenche form, captura o link.
        Retorna a URL do link gerado.
        """
        order_num = order.get("shopify_order_number", order.get("id", "?"))
        log_prefix = f"[{order_num}]"

        url = self.cfg.TLN_LINK_PAGE
        logger.info(f"{log_prefix} Acessando {url}")
        await self.page.goto(url, wait_until="domcontentloaded")
        await self._wait_idle()

        operadora = order.get("operadora") or self.cfg.DEFAULT_OPERADORA
        valor = float(order.get("valor_total", 0))
        condicao = int(order.get("condicao_parcelas", 1))
        email = (
            order.get("cliente_email")
            or order.get("email_link")
            or self.cfg.TLN_FALLBACK_EMAIL
        )
        codigo = order.get("codigo_pedido_cliente") or order.get("shopify_order_number", "")

        valor_str = f"{valor:.2f}".replace(".", ",")

        logger.info(
            f"{log_prefix} Form: op={operadora} valor={valor_str} cond={condicao}x"
        )

        await self._select_option(self.cfg.SEL_OPERADORA, operadora, "Operadora")
        await self._fill(self.cfg.SEL_VALOR, valor_str, "Valor")
        await self._select_option(self.cfg.SEL_CONDICAO, str(condicao), "Condição")
        if email and self.cfg.SEL_EMAIL_CONFIRMACAO:
            await self._fill(self.cfg.SEL_EMAIL_CONFIRMACAO, email, "Email confirmação")
        if email and self.cfg.SEL_EMAIL_LINK and self.cfg.SEL_EMAIL_LINK != self.cfg.SEL_EMAIL_CONFIRMACAO:
            await self._fill(self.cfg.SEL_EMAIL_LINK, email, "Email link")
        if codigo and self.cfg.SEL_CODIGO_PEDIDO:
            await self._fill(self.cfg.SEL_CODIGO_PEDIDO, codigo, "Código do pedido")

        await self._screenshot(f"before_generate_{order_num}")
        await self.page.click(self.cfg.SEL_GERAR_BTN)
        await asyncio.sleep(2)
        await self._screenshot(f"after_generate_{order_num}")

        link = await self._extract_link()
        if not link:
            raise Exception("Não consegui extrair o link gerado do TLN")
        return link

    # =========================================================
    # ETAPA 2: completar o pagamento no link gerado
    # =========================================================

    async def complete_payment(
        self,
        link: str,
        cpf: str,
        cartao: str,
        pin: str,
        order_num: str = "?",
    ) -> dict:
        """
        Abre o link numa nova aba, preenche cartão + PIN, submete, lê resultado.
        Retorna: { status: 'paid'|'failed', nsu?, message }
        """
        log_prefix = f"[{order_num}]"

        # Abre o link numa nova aba (mantém a aba do merchant aberta)
        logger.info(f"{log_prefix} Abrindo link de pagamento em nova aba...")
        if self.payment_page is None or self.payment_page.is_closed():
            self.payment_page = await self.context.new_page()
        else:
            # Reutiliza a aba, mas limpa
            try:
                await self.payment_page.goto("about:blank")
            except Exception:
                self.payment_page = await self.context.new_page()

        try:
            await self.payment_page.goto(link, wait_until="domcontentloaded", timeout=self.cfg.TLN_TIMEOUT * 1000)
            await self._wait_idle_page(self.payment_page)
        except Exception as e:
            raise Exception(f"Falha ao abrir o link de pagamento: {e}")

        await self._screenshot_page(self.payment_page, f"payment_open_{order_num}")

        # Preenche os campos do cliente
        # IMPORTANTE: a tela de pagamento do TLN NÃO tem campo de CPF
        # Só tem Número do cartão + Senha do cartão
        if cartao:
            await self._fill_page(self.payment_page, self.cfg.SEL_PAYMENT_CARD, cartao, "Cartão")
        if pin:
            await self._fill_page(self.payment_page, self.cfg.SEL_PAYMENT_PIN, pin, "Senha do cartão (PIN)")

        await self._screenshot_page(self.payment_page, f"payment_filled_{order_num}")

        # Submete
        logger.info(f"{log_prefix} Submetendo pagamento...")
        await self.payment_page.click(self.cfg.SEL_PAYMENT_SUBMIT)

        # Espera o resultado
        try:
            await self.payment_page.wait_for_selector(
                self.cfg.SEL_PAYMENT_RESULT, timeout=self.cfg.TLN_TIMEOUT * 1000
            )
        except Exception:
            logger.warning(f"{log_prefix} Timeout esperando resultado, tentando ler página...")

        await asyncio.sleep(3)  # respiro pro JS renderizar
        result_screenshot = await self._screenshot_page(
            self.payment_page, f"payment_result_{order_num}", return_path=True
        )

        # Lê o resultado (IA primeiro, fallback pra keyword matching)
        ai_result = None
        if self.ai and self.ai.enabled and self.cfg.USE_AI_FOR_RESULT and result_screenshot:
            try:
                logger.info(f"{log_prefix} Lendo resultado via GPT-4o vision...")
                ai_result = self.ai.read_payment_result(result_screenshot)
                logger.info(
                    f"{log_prefix} AI: status={ai_result.get('status')} "
                    f"nsu={ai_result.get('nsu')} conf={ai_result.get('confidence', 0):.2f}"
                )
            except Exception as e:
                logger.warning(f"{log_prefix} AI falhou: {e}")

        # Fallback: lê o texto da página e classifica por keyword
        result_text = ""
        nsu = None
        status = None
        if ai_result and ai_result.get("status") in ("paid", "failed") and ai_result.get("confidence", 0) >= 0.6:
            status = ai_result["status"]
            nsu = ai_result.get("nsu")
            result_text = ai_result.get("message", "")
        else:
            logger.info(f"{log_prefix} Fallback: lendo página por keyword matching...")
            result_text = await self._read_result_page(self.payment_page)
            nsu = await self._read_nsu_page(self.payment_page)
            if not result_text:
                raise Exception("Não consegui ler o resultado do pagamento (tela de aprovado/recusado)")
            status = self._classify_result(result_text)

        logger.info(f"{log_prefix} Resultado: '{result_text[:100]}' → {status}")

        return {
            "status": status,
            "nsu": nsu,
            "message": result_text[:500],
        }

    # =========================================================
    # Helpers compartilhados
    # =========================================================

    def _classify_result(self, text: str) -> str:
        t = text.lower()
        for kw in self.cfg.APPROVED_KEYWORDS:
            if kw.strip().lower() in t:
                return "paid"
        for kw in self.cfg.REJECTED_KEYWORDS:
            if kw.strip().lower() in t:
                return "failed"
        # Se não reconheceu, marca como falha por segurança
        logger.warning(f"Não consegui classificar: {text[:200]}")
        return "failed"

    async def _fill(self, selector: str, value: str, field_name: str):
        return await self._fill_page(self.page, selector, value, field_name)

    async def _fill_page(self, page: Page, selector: str, value: str, field_name: str):
        try:
            el = await page.wait_for_selector(selector, timeout=5000)
            await el.fill(str(value))
            logger.debug(f"Página {page.url[:40]} - '{field_name}' preenchido")
        except Exception as e:
            logger.warning(f"Não consegui preencher '{field_name}': {e}")
            raise

    async def _select_option(self, selector: str, value: str, field_name: str):
        try:
            el = await self.page.wait_for_selector(selector, timeout=5000)
            try:
                await el.select_option(value=value)
            except Exception:
                await el.select_option(label=value)
            logger.debug(f"Select '{field_name}': {value}")
        except Exception as e:
            logger.warning(f"Não consegui selecionar '{field_name}': {e}")
            raise

    async def _extract_link(self) -> Optional[str]:
        """Extrai o link gerado da página de Gera Link."""
        for sel in [
            self.cfg.SEL_RESULT_LINK,
            "a[href*='http']",
            "input[readonly]",
            ".link",
            "[class*='link' i]",
        ]:
            try:
                el = await self.page.query_selector(sel)
                if el:
                    href = await el.get_attribute("href")
                    if href and href.startswith("http"):
                        return href
                    value = await el.get_attribute("value")
                    if value and (value.startswith("http") or "tln" in value):
                        return value
                    text = (await el.text_content() or "").strip()
                    match = re.search(r"https?://[^\s\"'<>]+", text)
                    if match:
                        return match.group(0)
            except Exception:
                continue
        try:
            body_text = await self.page.text_content("body")
            if body_text:
                match = re.search(r"https?://[^\s\"'<>]+", body_text)
                if match:
                    return match.group(0)
        except Exception:
            pass
        return None

    async def _read_result_page(self, page: Page) -> str:
        for sel in [
            self.cfg.SEL_PAYMENT_RESULT,
            ".alert", ".message", ".resultado", ".status",
            "[class*='result' i]", "[class*='status' i]", "body",
        ]:
            try:
                el = await page.query_selector(sel)
                if el:
                    text = (await el.text_content() or "").strip()
                    if text and len(text) > 3:
                        return text
            except Exception:
                continue
        return ""

    async def _read_nsu_page(self, page: Page) -> Optional[str]:
        try:
            el = await page.query_selector(self.cfg.SEL_PAYMENT_NSU)
            if el:
                text = (await el.text_content() or "").strip()
                match = re.search(r"\d{6,}", text)
                if match:
                    return match.group(0)
        except Exception:
            pass
        return None

    async def _wait_idle(self):
        await self._wait_idle_page(self.page)

    async def _wait_idle_page(self, page: Page):
        try:
            await page.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass

    async def _screenshot(self, name: str):
        await self._screenshot_page(self.page, name)

    async def _screenshot_page(self, page: Page, name: str, return_path: bool = False):
        try:
            os.makedirs(self.cfg.SCREENSHOT_DIR, exist_ok=True)
            path = os.path.join(self.cfg.SCREENSHOT_DIR, f"{name}.png")
            await page.screenshot(path=path, full_page=True)
            logger.debug(f"Screenshot: {path}")
            return path if return_path else None
        except Exception as e:
            logger.debug(f"Falha no screenshot: {e}")
            return None if return_path else None

    async def stop(self):
        try:
            if self.browser:
                await self.browser.close()
        except Exception:
            pass
        try:
            if self.playwright:
                await self.playwright.stop()
        except Exception:
            pass
        logger.info("Navegador encerrado")
