"""
AI Helper - usa GPT-4o vision pra ler telas do TLN.
Substitui o keyword matching por leitura real de imagem quando habilitado.

Vantagens:
  - Mais robusto a mudanças de layout (TLN pode mudar o site a qualquer hora)
  - Extrai NSU automaticamente da tela de resultado
  - Pode diagnosticar erros olhando o screenshot

Fallback: se a chamada à API falhar, retorna string vazia / dict vazio
e o bot usa o método antigo (keyword matching).
"""
import base64
import json
import logging
from typing import Optional

logger = logging.getLogger("ai_helper")

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("openai não instalado. Rode: pip install openai")


class AIHelper:
    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self.enabled = False
        if not OPENAI_AVAILABLE:
            logger.warning("AIHelper desabilitado: openai não está instalado")
            return
        if not api_key or api_key.startswith("sk-proj-XXXXX"):
            logger.info("AIHelper desabilitado: OPENAI_API_KEY não configurada")
            return
        try:
            self.client = OpenAI(api_key=api_key)
            self.model = model
            self.enabled = True
            logger.info(f"AIHelper habilitado (modelo: {model})")
        except Exception as e:
            logger.error(f"Falha ao inicializar OpenAI: {e}")

    def _encode_image(self, path: str) -> Optional[str]:
        try:
            with open(path, "rb") as f:
                return base64.b64encode(f.read()).decode("utf-8")
        except Exception as e:
            logger.error(f"Falha ao ler imagem {path}: {e}")
            return None

    def _ask(self, image_path: str, prompt: str, json_mode: bool = False) -> str:
        if not self.enabled:
            return ""
        img_b64 = self._encode_image(image_path)
        if not img_b64:
            return ""
        try:
            kwargs = dict(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{img_b64}",
                                    "detail": "high",
                                },
                            },
                        ],
                    }
                ],
                max_tokens=1500,
            )
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            response = self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"AI call falhou: {e}")
            return ""

    # =============================================================
    # Casos de uso
    # =============================================================

    def read_payment_result(self, screenshot_path: str) -> dict:
        """
        Lê a tela de resultado do pagamento e retorna:
        { status: 'paid'|'failed'|'unknown', nsu, message, valor, confidence }
        """
        prompt = """Você está vendo a tela de resultado de uma transação com Cartão Material DuePay
no portal TLN/Personal Card de um lojista credenciado.

Analise a imagem e retorne APENAS um JSON válido (sem markdown, sem crases, sem texto extra)
com EXATAMENTE esta estrutura:

{
  "status": "paid" se a tela indica aprovação/autorização/confirmação de pagamento,
            "failed" se indica recusa/rejeição/erro/saldo insuficiente,
            "unknown" se você não consegue identificar com segurança,
  "nsu": "o número do NSU/protocolo/código de autorização visível, ou null se não houver",
  "message": "o texto literal principal que aparece na tela descrevendo o resultado",
  "valor": "o valor da transação como string formatada (ex: 'R$ 149,97'), ou null",
  "confidence": número de 0.0 a 1.0 indicando sua certeza sobre o status identificado
}

Critérios para classificar:
- "paid": tem palavras como "aprovado", "autorizado", "confirmado", "pago", "success"
- "failed": tem "recusado", "rejeitado", "negado", "saldo insuficiente", "erro"
- "unknown": tela em branco, loading, ou sem indicação clara

Seja conservador: se não tiver certeza, use "unknown" e confidence baixo."""
        raw = self._ask(screenshot_path, prompt, json_mode=True)
        if not raw:
            return {"status": "unknown", "nsu": None, "message": "", "valor": None, "confidence": 0.0}
        try:
            data = json.loads(raw)
            if data.get("status") not in ("paid", "failed", "unknown"):
                data["status"] = "unknown"
            data.setdefault("nsu", None)
            data.setdefault("message", "")
            data.setdefault("valor", None)
            data.setdefault("confidence", 0.0)
            return data
        except Exception as e:
            logger.warning(f"Resposta da AI não é JSON válido: {e}\nResposta: {raw[:200]}")
            return {"status": "unknown", "nsu": None, "message": raw, "valor": None, "confidence": 0.0}

    def discover_form_fields(self, screenshot_path: str, page_type: str) -> dict:
        """
        Analisa um screenshot e tenta mapear os campos do formulário pra seletores CSS.
        Retorna: { fields: [{purpose, selector_guess, type}], submit_button, result_area }
        """
        prompt = f"""Esta é uma tela do portal TLN/Personal Card de um lojista.
Descrição da tela: "{page_type}"

Identifique TODOS os campos de formulário visíveis, botões e áreas de resultado.
Para cada campo, dê um "purpose" descritivo e o seletor CSS provável baseado em padrões comuns
de input (ex: input[name='X'], input[id='X'], input[type='X']).

Retorne APENAS um JSON válido (sem markdown) com esta estrutura:

{{
  "fields": [
    {{"purpose": "username|cpf|cnpj|password|valor|email|condicao|cartao|pin|operadora|outro", "selector_guess": "input[name='X']", "type": "text|password|email|number|select|button", "visible_label": "label que aparece perto do campo"}},
    ...
  ],
  "submit_button": {{"purpose": "login|generate|submit|pay|confirm|outro", "selector_guess": "input[value='X'] ou button[type='submit']"}},
  "result_area": "seletor provável da div/span que mostra o resultado final (aprovado/recusado), ou null"
}}

Seja conservador: só liste o que está claramente visível."""
        raw = self._ask(screenshot_path, prompt, json_mode=True)
        if not raw:
            return {"fields": [], "submit_button": None, "result_area": None}
        try:
            return json.loads(raw)
        except Exception as e:
            logger.warning(f"Resposta da AI não é JSON: {e}\nResposta: {raw[:200]}")
            return {"fields": [], "submit_button": None, "result_area": None, "raw": raw}

    def diagnose_error(self, screenshot_path: str, error_msg: str, context: str = "") -> str:
        """Pede à AI pra explicar o erro olhando o screenshot."""
        prompt = f"""O bot de automação do portal TLN encontrou este erro:

ERRO: {error_msg}

{f"CONTEXTO: {context}" if context else ""}

Olhe a tela atual (screenshot) e responda em português de forma OBJETIVA (máximo 4 frases curtas):
1. O que a tela mostra agora (em 1 frase)
2. Causa provável do erro (em 1 frase)
3. O que ajustar pra resolver (em 1-2 frases)

Não invente. Se não der pra saber, diga "não dá pra diagnosticar pela imagem"."""
        return self._ask(screenshot_path, prompt, json_mode=False)

    def suggest_selector_for_field(
        self, screenshot_path: str, field_description: str
    ) -> str:
        """Pergunta qual seletor CSS usar pra um campo específico."""
        prompt = f"""Olhe o screenshot. Qual é o seletor CSS mais provável do campo de "{field_description}"?

Responda APENAS com o seletor CSS (ex: input[name="cpf"]), sem explicação."""
        return self._ask(screenshot_path, prompt, json_mode=False).strip()
