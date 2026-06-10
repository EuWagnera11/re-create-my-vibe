"""
Script de diagnóstico - abre uma página do TLN e imprime TODOS os campos
do formulário. Roda isso uma vez pra saber os seletores corretos.

Uso:
  python inspect_page.py login       -> abre a página de login e mostra os campos
  python inspect_page.py gera_link   -> abre "Gerar link" e mostra os campos
  python inspect_page.py payment     -> tu cola a URL do link de pagamento e ele abre
"""
import asyncio
import sys
from playwright.async_api import async_playwright
from config import Config


PAGES = {
    "login": "https://www1.tln.com.br/apps/ecommerce/autenticacao/login",
    "gera_link": "https://www1.tln.com.br/apps/ecommerce/transacaolink/index",
}


async def inspect(page, label: str):
    """Inspeciona todos os inputs/selects/buttons de uma página."""
    print(f"\n{'=' * 70}")
    print(f"  INSPEÇÃO: {label}")
    print(f"  URL: {page.url}")
    print(f"{'=' * 70}")

    # Espera carregar
    try:
        await page.wait_for_load_state("networkidle", timeout=8000)
    except Exception:
        pass
    await asyncio.sleep(1)

    # Pega o HTML dos campos do formulário
    selectors_summary = await page.evaluate("""
        () => {
            const results = [];
            // Inputs
            document.querySelectorAll('input').forEach(el => {
                if (el.type === 'hidden') return;
                const labelText = el.labels && el.labels[0] ? el.labels[0].innerText.trim() : '';
                results.push({
                    tag: 'input',
                    type: el.type || 'text',
                    name: el.name || '',
                    id: el.id || '',
                    placeholder: el.placeholder || '',
                    value: el.value || '',
                    label: labelText,
                    selector_name: el.name ? `input[name="${el.name}"]` : '',
                    selector_id: el.id ? `#${el.id}` : '',
                });
            });
            // Selects
            document.querySelectorAll('select').forEach(el => {
                const labelText = el.labels && el.labels[0] ? el.labels[0].innerText.trim() : '';
                const options = Array.from(el.options).map(o => o.text + (o.value ? ` (${o.value})` : '')).slice(0, 10);
                results.push({
                    tag: 'select',
                    name: el.name || '',
                    id: el.id || '',
                    label: labelText,
                    options: options,
                    selector_name: el.name ? `select[name="${el.name}"]` : '',
                    selector_id: el.id ? `#${el.id}` : '',
                });
            });
            // Buttons
            document.querySelectorAll('button, input[type="submit"], input[type="button"]').forEach(el => {
                if (el.tagName === 'BUTTON' || (el.tagName === 'INPUT' && ['submit', 'button'].includes(el.type))) {
                    results.push({
                        tag: el.tagName.toLowerCase(),
                        type: el.type || 'submit',
                        name: el.name || '',
                        id: el.id || '',
                        text: (el.innerText || el.value || '').trim(),
                        selector_text: el.tagName === 'BUTTON' ? `button:has-text("${(el.innerText || '').trim()}")` : '',
                        selector_value: el.value ? `${el.tagName.toLowerCase()}[value="${el.value}"]` : '',
                    });
                }
            });
            return results;
        }
    """)

    if not selectors_summary:
        print("  ❌ Nenhum campo encontrado. Página não carregou?")
        return

    # Imprime formatado
    for item in selectors_summary:
        print()
        if item["tag"] == "input":
            print(f"  📝 INPUT  [{item['type']:10s}]")
            print(f"     label:     {item.get('label', '?')}")
            print(f"     name:      {item.get('name', '(vazio)')}")
            print(f"     id:        {item.get('id', '(vazio)')}")
            print(f"     placeholder: {item.get('placeholder', '-')}")
            print(f"     → CSS:     {item['selector_name'] or item['selector_id']}")
        elif item["tag"] == "select":
            print(f"  📋 SELECT")
            print(f"     label:   {item.get('label', '?')}")
            print(f"     name:    {item.get('name', '(vazio)')}")
            print(f"     id:      {item.get('id', '(vazio)')}")
            print(f"     opções:  {', '.join(item.get('options', [])[:5])}")
            print(f"     → CSS:   {item['selector_name'] or item['selector_id']}")
        elif item["tag"] in ("button", "input"):
            print(f"  🔘 BUTTON  [{item.get('text', '') or item.get('value', '')}]")
            print(f"     name:    {item.get('name', '(vazio)')}")
            print(f"     id:      {item.get('id', '(vazio)')}")
            print(f"     → CSS:   {item.get('selector_text', '') or item.get('selector_value', '')}")

    print()
    print("COPIE PRO SEU .env (substitua os placeholders):")
    for item in selectors_summary:
        if item["tag"] == "input" and item["type"] in ("text", "email", "tel", "number", "password"):
            label_hint = item.get("label", "").lower() + item.get("name", "").lower() + item.get("placeholder", "").lower()
            env_name = "?"
            if "senha" in label_hint or item["type"] == "password":
                env_name = "SEL_PASSWORD"
            elif "usu" in label_hint or "login" in label_hint or "cpf" in label_hint or "cnpj" in label_hint or "documento" in label_hint:
                env_name = "SEL_USERNAME"
            elif "valor" in label_hint or "transa" in label_hint:
                env_name = "SEL_VALOR"
            elif "email" in label_hint:
                env_name = "SEL_EMAIL_CONFIRMACAO"
            elif "cartao" in label_hint or "cartão" in label_hint or "numero" in label_hint:
                env_name = "SEL_PAYMENT_CARD"
            elif "pin" in label_hint or "senha" in label_hint:
                env_name = "SEL_PAYMENT_PIN"
            if env_name != "?" and (item["selector_name"] or item["selector_id"]):
                css = item["selector_name"] or item["selector_id"]
                print(f"  {env_name}={css}")
        elif item["tag"] == "select":
            label_hint = (item.get("label", "") + item.get("name", "")).lower()
            env_name = "?"
            if "operad" in label_hint:
                env_name = "SEL_OPERADORA"
            elif "condi" in label_hint:
                env_name = "SEL_CONDICAO"
            if env_name != "?" and (item["selector_name"] or item["selector_id"]):
                css = item["selector_name"] or item["selector_id"]
                print(f"  {env_name}={css}")
        elif item["tag"] in ("button", "input") and item.get("type", "") in ("submit", "button", ""):
            text = (item.get("text", "") or item.get("value", "") or "").strip()
            css = item.get("selector_text", "") or item.get("selector_value", "") or f'{item["tag"]}[type="submit"]'
            if "logar" in text.lower() or "entrar" in text.lower():
                print(f"  SEL_LOGIN_BTN={css}")
            elif "gerar" in text.lower():
                print(f"  SEL_GERAR_BTN={css}")
            elif "confirmar" in text.lower() or "pagar" in text.lower():
                print(f"  SEL_PAYMENT_SUBMIT={css}")
            else:
                print(f"  # button: {text!r} → {css}")


async def main():
    cfg = Config()
    target = sys.argv[1] if len(sys.argv) > 1 else "login"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1366, "height": 900})
        page = await context.new_page()

        try:
            if target in PAGES:
                await page.goto(PAGES[target], wait_until="domcontentloaded")
                await inspect(page, target)
            elif target == "payment":
                url = input("Cole a URL do link de pagamento (https://www1.tln.com.br/us/...): ").strip()
                if not url:
                    print("URL vazia, saindo")
                    return
                await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                await inspect(page, "tela de pagamento")
            else:
                print(f"Argumento inválido: {target}")
                print(f"Use: python inspect_page.py [login|gera_link|payment]")
                return
        finally:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
