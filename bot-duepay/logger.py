"""
Setup de logging - arquivo rotativo + console colorido.
"""
import logging
import os
import sys
from logging.handlers import RotatingFileHandler


class ColorFormatter(logging.Formatter):
    """Cor simples pro terminal."""

    COLORS = {
        "DEBUG": "\033[37m",    # cinza
        "INFO": "\033[36m",     # ciano
        "WARNING": "\033[33m",  # amarelo
        "ERROR": "\033[31m",    # vermelho
        "CRITICAL": "\033[41m", # vermelho fundo
    }
    RESET = "\033[0m"

    def format(self, record):
        color = self.COLORS.get(record.levelname, "")
        msg = super().format(record)
        return f"{color}{msg}{self.RESET}" if color and sys.stdout.isatty() else msg


def setup_logger():
    """Configura o logger raiz. Retorna o logger."""
    log = logging.getLogger()
    log.setLevel(logging.INFO)

    # Limpa handlers existentes (evita duplicação em reimports)
    log.handlers.clear()

    fmt_str = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"

    # Console
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    console.setFormatter(ColorFormatter(fmt_str, datefmt=datefmt))
    log.addHandler(console)

    # Arquivo (rotativo, 10MB x 5 backups)
    os.makedirs("logs", exist_ok=True)
    file_handler = RotatingFileHandler(
        "logs/bot.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter(fmt_str, datefmt=datefmt))
    log.addHandler(file_handler)

    # Silencia logs barulhentos do Playwright/aiohttp
    logging.getLogger("playwright").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)

    return log
