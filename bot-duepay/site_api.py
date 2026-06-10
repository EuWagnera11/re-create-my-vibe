"""
Comunicação com o site (Lovable / TanStack Start).
Polling, report e heartbeat.
"""
import logging
from typing import Optional
import aiohttp
from config import Config

logger = logging.getLogger("site_api")


class SiteAPI:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self._session: Optional[aiohttp.ClientSession] = None

    def _headers(self) -> dict:
        return {
            "X-Bot-Token": self.cfg.BOT_TOKEN,
            "Content-Type": "application/json",
            "User-Agent": f"DuePay-Bot/{self.cfg.BOT_ID}",
        }

    async def _session_get(self) -> aiohttp.ClientSession:
        if not self._session or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=self.cfg.TLN_TIMEOUT)
            self._session = aiohttp.ClientSession(
                headers=self._headers(),
                timeout=timeout,
            )
        return self._session

    def _url(self, path: str) -> str:
        """Garante que a URL tá bem formada (sem barra duplicada)."""
        base = self.cfg.SITE_URL.rstrip("/")
        path = path if path.startswith("/") else "/" + path
        return base + path

    async def get_next_order(self) -> Optional[dict]:
        """Pergunta pro site: tem pedido? Retorna dict ou None."""
        s = await self._session_get()
        url = self._url(self.cfg.PATH_NEXT_ORDER)
        try:
            async with s.get(url) as resp:
                if resp.status == 204:
                    return None
                if resp.status == 401:
                    logger.error("Bot token rejeitado pelo site (401)")
                    return None
                resp.raise_for_status()
                return await resp.json()
        except aiohttp.ClientError as e:
            logger.warning(f"Falha ao buscar pedido: {e}")
            return None
        except Exception as e:
            logger.exception(f"Erro inesperado em get_next_order: {e}")
            return None

    async def report_order(self, order_id: str, result: dict) -> bool:
        """Envia o resultado do processamento pro site."""
        s = await self._session_get()
        url = self._url(self.cfg.PATH_REPORT)
        payload = {
            "order_id": order_id,
            "bot_id": self.cfg.BOT_ID,
            **result,
        }
        try:
            async with s.post(url, json=payload) as resp:
                if resp.status >= 400:
                    text = await resp.text()
                    logger.error(f"report_order falhou: {resp.status} {text}")
                    return False
                logger.debug(f"report_order OK para {order_id}")
                return True
        except Exception as e:
            logger.exception(f"report_order exception: {e}")
            return False

    async def heartbeat(self, status: str, message: str = None) -> bool:
        """Avisa o site que o bot está vivo."""
        s = await self._session_get()
        url = self._url(self.cfg.PATH_HEARTBEAT)
        payload = {
            "bot_id": self.cfg.BOT_ID,
            "status": status,
            "message": message,
        }
        try:
            async with s.post(url, json=payload) as resp:
                if resp.status >= 400:
                    return False
                return True
        except Exception as e:
            logger.debug(f"heartbeat falhou: {e}")
            return False

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()
