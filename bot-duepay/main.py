"""
Bot DuePay - Orquestrador principal.
Roda em loop, fica perguntando pro site se tem pedido novo.
Quando tem, processa no portal TLN e reporta o resultado.

Uso: python main.py
"""
import asyncio
import logging
import signal
import sys
from config import Config
from site_api import SiteAPI
from tln_bot import TLNBot
from ai_helper import AIHelper
from logger import setup_logger

logger = logging.getLogger("main")


class BotOrchestrator:
    def __init__(self):
        self.cfg = Config()
        self.site = SiteAPI(self.cfg)
        self.ai = AIHelper(api_key=self.cfg.OPENAI_API_KEY, model=self.cfg.OPENAI_MODEL)
        self.tln: TLNBot | None = None
        self.running = True
        self.busy = False
        self.consecutive_errors = 0

    async def run(self):
        logger.info("=" * 60)
        logger.info("BOT DUEPAY INICIANDO")
        logger.info(f"  Site: {self.cfg.SITE_URL}")
        logger.info(f"  Bot ID: {self.cfg.BOT_ID}")
        logger.info(f"  Poll: {self.cfg.POLL_INTERVAL}s")
        logger.info(f"  Headless: {self.cfg.TLN_HEADLESS}")
        logger.info(f"  AI: {'habilitado (' + self.cfg.OPENAI_MODEL + ')' if self.ai.enabled else 'desabilitado'}")
        logger.info("=" * 60)

        # 1. Inicia Playwright (com o ai_helper pra leitura inteligente)
        self.tln = TLNBot(self.cfg, ai_helper=self.ai)
        try:
            await self.tln.start()
        except Exception as e:
            logger.error(f"Falha ao iniciar navegador: {e}")
            logger.error("Verifique se o Chrome/Chromium está instalado.")
            return

        # 2. Heartbeat inicial
        await self._safe_heartbeat("online")

        # 3. Loop principal
        while self.running:
            try:
                # Heartbeat a cada iteração (o site considera bot online
                # se ouviu nos últimos 60s)
                await self._safe_heartbeat(
                    "busy" if self.busy else "online"
                )

                # Pergunta pro site se tem pedido
                order = await self.site.get_next_order()
                if not order:
                    self.consecutive_errors = 0
                    await asyncio.sleep(self.cfg.POLL_INTERVAL)
                    continue

                # Tem pedido! Processa.
                self.busy = True
                order_id = order.get("id")
                pedido_num = order.get("shopify_order_number", order_id)
                logger.info(f"[{pedido_num}] Recebido. Processando...")

                try:
                    result = await self.tln.process_payment(order)
                    logger.info(
                        f"[{pedido_num}] Resultado: {result['status']} "
                        f"NSU={result.get('nsu', 's/ NSU')}"
                    )
                    await self.site.report_order(order_id, result)
                    self.consecutive_errors = 0

                except Exception as e:
                    logger.exception(f"[{pedido_num}] Falha: {e}")
                    await self.site.report_order(order_id, {
                        "status": "failed",
                        "error": f"{type(e).__name__}: {e}",
                    })

                    # Se sessão caiu, tenta re-logar
                    if "sessão" in str(e).lower() or "login" in str(e).lower():
                        logger.info("Tentando re-login no TLN...")
                        try:
                            await self.tln.relogin()
                        except Exception as e2:
                            logger.error(f"Re-login falhou: {e2}")

                self.busy = False
                await asyncio.sleep(1)  # respiro entre pedidos

            except Exception as e:
                self.consecutive_errors += 1
                logger.exception(f"Erro no loop principal: {e}")
                backoff = min(30, 2 ** self.consecutive_errors)
                logger.warning(f"Backoff de {backoff}s após erro")
                await asyncio.sleep(backoff)

        # 4. Desligamento
        await self._shutdown()

    async def _safe_heartbeat(self, status: str):
        try:
            await self.site.heartbeat(status)
        except Exception as e:
            logger.debug(f"Heartbeat falhou (não crítico): {e}")

    async def _shutdown(self):
        logger.info("Desligando...")
        try:
            await self._safe_heartbeat("offline")
        except:
            pass
        if self.tln:
            await self.tln.stop()
        await self.site.close()


def main():
    orch = BotOrchestrator()

    def _signal(sig, frame):
        logger.info(f"Sinal {sig} recebido")
        orch.running = False

    signal.signal(signal.SIGINT, _signal)
    signal.signal(signal.SIGTERM, _signal)

    try:
        asyncio.run(orch.run())
    except KeyboardInterrupt:
        pass
    except Exception as e:
        logger.exception(f"Erro fatal: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
