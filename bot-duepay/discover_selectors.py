"""
Auto-descobridor de seletores - usa GPT-4o vision pra mapear os campos do TLN.

Roda uma vez pra configurar o bot sem precisar inspecionar HTML manualmente.
O script:
  1. Abre cada tela do portal TLN
  2. Tira um screenshot
  3. Manda pro GPT-4o perguntando "quais são os seletores CSS dos campos?"
  4. Imprime o resultado pronto pra colar no .env

Uso:
  1. Configure TLN_USERNAME e TLN_PASSWORD no .env
  2. Configure OPENAI_API_KEY no .env
  3. Rode: python discover_selectors.py
  4. Copie os seletores impressos pro .env
"""
import asyncio
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright

from config import Config
from ai_helper import AIHelper


SCREENSHOTS_DIR = Path("logs/discovery")
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)


async def screenshot(page, name: str) -> str:
    path = SCREENSHOTS_DIR / f"{name}.png"
    await page.screenshot(path=str(path), full_page=True)
    print(f"   📸 {path}")
    return str(path)


def print_separador(titulo: str):
    print()
    print("=" * 70)
    print(f"  {titulo}")
    print("=" * 70)


def format_env_lines(prefix: str, fields: list) -> str:
    """Formata os campos descobertos como linhas de .env."""
    lines = []
    for f in fields:
        sel = f.get("selector_guess", "").strip()
        if sel:
            purpose = f.get("purpose", "outro").upper().replace(" ", "_")
            lines.append(f"{prefix}{purpose}={sel}")
    return "\n".join(lines)


async def main():
    cfg = Config()

    # Valida pré-requisitos
    if not cfg.OPENAI_API_KEY or cfg.OPENAI_API_KEY.startswith("sk-proj-XXXXX"):
        print("❌ OPENAI_API_KEY não configurada no .env")
        print("   Adiciona no .env:  OPENAI_API_KEY=sk-proj-...")
        return
    if not cfg.TLN_USERNAME or not cfg.TLN_PASSWORD:
        print("❌ TLN_USERNAME e TLN_PASSWORD precisam estar no .env")
        return

    ai = AIHelper(api_key=cfg.OPENAI_API_KEY, model=cfg.OPENAI_MODEL)
    if not ai.enabled:
        print("❌ AIHelper não inicializou. Verifica a OPENAI_API_KEY.")
        return

    print("🚀 AUTO-DESCOBRIDOR DE SELETORES DO TLN")
    print(f"   Modelo: {cfg.OPENAI_MODEL}")
    print(f"   Screenshots serão salvos em: {SCREENSHOTS_DIR.absolute()}")

    # IMPORTANTE: headless=False pra você ver o navegador e poder interagir se precisar
    async with async_playwright().start() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(viewport={"width": 1366, "height": 900})
        page = await context.new_page()

        try:
            # ============================================================
            # 1) TELA DE LOGIN
            # ============================================================
            print_separador("1) TELA DE LOGIN")
            print("Abrindo tela de login...")
            await page.goto(cfg.TLN_LOGIN_URL, wait_until="domcontentloaded")
            await page.wait_for_load_state("networkidle", timeout=8000)
            await asyncio.sleep(1)

            login_shot = await screenshot(page, "01_login")
            print("Perguntando pro GPT-4o sobre os campos de login...")
            login_info = ai.discover_form_fields(login_shot, "login de credenciado (CNPJ/CPF + senha)")
            print(f"   Campos encontrados: {len(login_info.get('fields', []))}")
            for f in login_info.get("fields", []):
                print(f"     - {f.get('purpose'):20s} {f.get('type'):10s} {f.get('selector_guess', '')}")
            print(f"   Botão submit: {login_info.get('submit_button', {}).get('selector_guess', '')}")

            # ============================================================
            # 2) LOGA
            # ============================================================
            print_separador("2) FAZENDO LOGIN")
            user_field = next(
                (f for f in login_info.get("fields", [])
                 if any(k in f.get("purpose", "").lower() for k in ["user", "cpf", "cnpj", "login"])),
                None,
            )
            pass_field = next(
                (f for f in login_info.get("fields", [])
                 if "pass" in f.get("purpose", "").lower() or "senha" in f.get("purpose", "").lower()),
                None,
            )
            submit_btn = login_info.get("submit_button", {}).get("selector_guess", 'input[value="Logar"]')

            user_sel = user_field.get("selector_guess") if user_field else 'input[name="loginCpfCnpj"]'
            pass_sel = pass_field.get("selector_guess") if pass_field else 'input[type="password"]'

            try:
                await page.fill(user_sel, cfg.TLN_USERNAME)
                await page.fill(pass_sel, cfg.TLN_PASSWORD)
                await page.click(submit_btn)
                await page.wait_for_load_state("networkidle", timeout=10000)
                await asyncio.sleep(2)
            except Exception as e:
                print(f"❌ Falha no login: {e}")
                print("Você pode logar manualmente na janela aberta.")
                input("Pressiona ENTER quando tiver logado...")

            current = page.url
            if "login" in current.lower() or "autenticacao" in current.lower():
                print("❌ Ainda na tela de login. Verifique as credenciais.")
                return
            print(f"   ✅ Login OK (agora em: {current})")

            # ============================================================
            # 3) TELA "GERAR LINK"
            # ============================================================
            print_separador("3) TELA 'GERAR LINK DE TRANSAÇÃO'")
            await page.goto(cfg.TLN_LINK_PAGE, wait_until="domcontentloaded")
            await page.wait_for_load_state("networkidle", timeout=8000)
            await asyncio.sleep(1)

            link_shot = await screenshot(page, "02_gera_link")
            print("Perguntando pro GPT-4o sobre os campos de 'Gera Link'...")
            link_info = ai.discover_form_fields(link_shot, "gerar link de pagamento por link (operadora + valor + condição + email)")
            print(f"   Campos encontrados: {len(link_info.get('fields', []))}")
            for f in link_info.get("fields", []):
                print(f"     - {f.get('purpose'):20s} {f.get('type'):10s} {f.get('selector_guess', '')}")
            print(f"   Botão submit: {link_info.get('submit_button', {}).get('selector_guess', '')}")

            # ============================================================
            # 4) GERA UM LINK DE TESTE
            # ============================================================
            print_separador("4) GERANDO UM LINK DE TESTE")
            try:
                # Pega os campos descobertos
                op_field = next((f for f in link_info.get("fields", []) if "operad" in f.get("purpose", "").lower()), None)
                val_field = next((f for f in link_info.get("fields", []) if "valor" in f.get("purpose", "").lower() or "transa" in f.get("purpose", "").lower()), None)
                cond_field = next((f for f in link_info.get("fields", []) if "condi" in f.get("purpose", "").lower()), None)
                email_field = next((f for f in link_info.get("fields", []) if "email" in f.get("purpose", "").lower()), None)

                if op_field:
                    try:
                        await page.select_option(op_field.get("selector_guess", ""), label="PERSONAL CARD POS-PAGO")
                    except Exception:
                        pass
                if val_field:
                    await page.fill(val_field.get("selector_guess", ""), "1,00")
                if cond_field:
                    try:
                        await page.select_option(cond_field.get("selector_guess", ""), value="1")
                    except Exception:
                        pass
                if email_field:
                    await page.fill(email_field.get("selector_guess", ""), "teste@bot.local")
                gen_btn_sel = link_info.get("submit_button", {}).get("selector_guess", 'input[value="Gerar link de transação"]')
                await page.click(gen_btn_sel)
                await page.wait_for_load_state("networkidle", timeout=10000)
                await asyncio.sleep(2)
                print("   ✅ Link gerado (deve aparecer na tela)")
            except Exception as e:
                print(f"⚠️ Falha ao gerar link de teste: {e}")
                print("   Você pode gerar manualmente e copiar o link.")

            # Tira screenshot da resposta
            link_result_shot = await screenshot(page, "03_link_gerado")
            print("Procurando a URL do link gerado na tela...")
            import re
            body_text = await page.text_content("body")
            link_match = re.search(r"https?://[^\s\"'<>]+", body_text or "")
            if link_match:
                generated_link = link_match.group(0)
                print(f"   Link gerado: {generated_link}")

                # ========================================================
                # 5) ABRE O LINK DE PAGAMENTO (em nova aba anônima)
                # ========================================================
                print_separador("5) TELA DE PAGAMENTO (onde cliente digita cartão+PIN)")
                # Cria um novo contexto SEM cookies (pra simular cliente)
                anon_context = await browser.new_context(viewport={"width": 1366, "height": 900})
                anon_page = await anon_context.new_page()
                await anon_page.goto(generated_link, wait_until="domcontentloaded", timeout=15000)
                await anon_page.wait_for_load_state("networkidle", timeout=8000)
                await asyncio.sleep(2)

                payment_shot = await screenshot(anon_page, "04_payment")
                print("Perguntando pro GPT-4o sobre os campos da tela de pagamento...")
                payment_info = ai.discover_form_fields(payment_shot, "tela onde o cliente digita CPF, número do cartão e PIN pra pagar")
                print(f"   Campos encontrados: {len(payment_info.get('fields', []))}")
                for f in payment_info.get("fields", []):
                    print(f"     - {f.get('purpose'):20s} {f.get('type'):10s} {f.get('selector_guess', '')}")
                print(f"   Botão submit: {payment_info.get('submit_button', {}).get('selector_guess', '')}")
                print(f"   Área de resultado: {payment_info.get('result_area', '?')}")

                await anon_context.close()
            else:
                print("⚠️ Não consegui encontrar a URL do link gerado na página.")
                print("   Tire o print e olhe manualmente (logs/discovery/03_link_gerado.png).")
                payment_info = {"fields": [], "submit_button": None, "result_area": None}

            # ============================================================
            # 6) IMPRIME O RESUMO PRO .env
            # ============================================================
            print_separador("RESULTADO - COLE ISSO NO SEU .env")
            print()
            print("# --- LOGIN ---")
            for f in login_info.get("fields", []):
                purpose = f.get("purpose", "").upper()
                if "user" in purpose.lower() or "cpf" in purpose.lower() or "cnpj" in purpose.lower():
                    print(f"SEL_USERNAME={f.get('selector_guess', '')}")
                elif "pass" in purpose.lower() or "senha" in purpose.lower():
                    print(f"SEL_PASSWORD={f.get('selector_guess', '')}")
            btn = login_info.get("submit_button", {}).get("selector_guess", "")
            if btn:
                print(f"SEL_LOGIN_BTN={btn}")
            print()
            print("# --- GERAR LINK ---")
            for f in link_info.get("fields", []):
                purpose = f.get("purpose", "").upper()
                sel = f.get("selector_guess", "")
                if "operad" in purpose.lower():
                    print(f"SEL_OPERADORA={sel}")
                elif "valor" in purpose.lower() or "transa" in purpose.lower():
                    print(f"SEL_VALOR={sel}")
                elif "condi" in purpose.lower():
                    print(f"SEL_CONDICAO={sel}")
                elif "email" in purpose.lower():
                    print(f"SEL_EMAIL_CONFIRMACAO={sel}")
                elif "codigo" in purpose.lower() or "pedido" in purpose.lower():
                    print(f"SEL_CODIGO_PEDIDO={sel}")
            btn = link_info.get("submit_button", {}).get("selector_guess", "")
            if btn:
                print(f"SEL_GERAR_BTN={btn}")
            print()
            print("# --- TELA DE PAGAMENTO ---")
            for f in payment_info.get("fields", []):
                purpose = f.get("purpose", "").upper()
                sel = f.get("selector_guess", "")
                if "cpf" in purpose.lower():
                    print(f"SEL_PAYMENT_CPF={sel}")
                elif "carta" in purpose.lower() or "card" in purpose.lower():
                    print(f"SEL_PAYMENT_CARD={sel}")
                elif "pin" in purpose.lower() or "senha" in purpose.lower():
                    print(f"SEL_PAYMENT_PIN={sel}")
            btn = payment_info.get("submit_button", {}).get("selector_guess", "")
            if btn:
                print(f"SEL_PAYMENT_SUBMIT={btn}")
            res = payment_info.get("result_area", "")
            if res:
                print(f"SEL_PAYMENT_RESULT={res}")

            print()
            print("=" * 70)
            print("✅ PRONTO. Copie as linhas acima pro seu .env e rode run.bat.")
            print(f"   Screenshots salvos em: {SCREENSHOTS_DIR.absolute()}")
            print("=" * 70)

        finally:
            print()
            input("Pressiona ENTER pra fechar o navegador...")
            await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
