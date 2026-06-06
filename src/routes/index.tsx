import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Search, User, ShoppingCart, Menu, ChevronLeft, ChevronRight, Heart,
  Backpack, BookOpen, Pencil, Paperclip, Palette, FolderOpen, Book, Percent,
  Truck, ShieldCheck, CreditCard, Headphones, Megaphone, Users, Facebook, Instagram, Youtube, Lock,
} from "lucide-react";

import heroImg from "@/assets/hero-backpack.jpg";
import kitImg from "@/assets/kit-escolar.jpg";
import bmcellLogo from "@/assets/bmcell-logo.png.asset.json";
import pLapis from "@/assets/prod-lapis.jpg";
import pCaderno from "@/assets/prod-caderno.jpg";
import pCaneta from "@/assets/prod-caneta.jpg";
import pCola from "@/assets/prod-cola.jpg";
import pMochila from "@/assets/prod-mochila.jpg";
import pEstojo from "@/assets/prod-estojo.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BM Cell — Material Escolar" },
      { name: "description", content: "A BM Cell vende materiais escolares com qualidade e preço justo. Kits, mochilas, papelaria e mais." },
      { property: "og:title", content: "BM Cell — Material Escolar" },
      { property: "og:description", content: "A BM Cell vende materiais escolares com qualidade e preço justo." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

const categories = [
  { icon: Backpack, label: "Kits Escolares" },
  { icon: BookOpen, label: "Mochilas e Bolsas" },
  { icon: BookOpen, label: "Cadernos" },
  { icon: Pencil, label: "Escrita" },
  { icon: Paperclip, label: "Papelaria" },
  { icon: Palette, label: "Artes e Pintura" },
  { icon: FolderOpen, label: "Organização" },
  { icon: Book, label: "Livros" },
  { icon: Percent, label: "Ofertas" },
];

const navLinks = ["INÍCIO", "KIT ESCOLAR", "MATERIAL INDIVIDUAL", "PAPELARIA", "MOCHILAS E BOLSAS", "LIVROS", "PROMOÇÕES", "CONTATO"];

const products = [
  { img: pLapis, name: "Lápis de Cor 12 Cores Multicolor", price: "R$ 8,90" },
  { img: pCaderno, name: "Caderno Universitário 1 Matéria 96 Folhas", price: "R$ 6,90" },
  { img: pCaneta, name: "Caneta Esferográfica Azul – 1 Unidade", price: "R$ 1,20" },
  { img: pCola, name: "Cola Branca 90g Lavável", price: "R$ 2,90" },
  { img: pMochila, name: "Mochila Escolar Poliéster", price: "R$ 79,90" },
  { img: pEstojo, name: "Estojo Escolar Duplo", price: "R$ 24,90" },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top utility bar */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>🇧🇷</span>
            <span>BM Cell — Material Escolar</span>
          </div>
          <div className="hidden items-center gap-5 md:flex">
            <span className="flex items-center gap-1">Acessibilidade ♿</span>
            <span className="flex items-center gap-1">Alto Contraste ◐</span>
            <span className="flex items-center gap-1">
              <button className="hover:text-foreground">A-</button>
              <button className="hover:text-foreground">A</button>
              <button className="hover:text-foreground">A+</button>
            </span>
          </div>
        </div>
      </div>

      {/* Logo + Search + Account + Cart */}
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4">
          <a href="/" className="flex items-center gap-3">
            <img src={bmcellLogo.url} alt="BM Cell" width={140} height={72} loading="eager" className="h-14 w-auto object-contain" />
          </a>

          <div className="hidden border-l border-border pl-4 md:block">
            <div className="text-xl font-bold text-brand-navy">Material Escolar BM Cell</div>
            <div className="text-xs text-muted-foreground">Tudo para o ano letivo<br />kits, papelaria e mochilas</div>
          </div>

          <div className="order-last flex-1 md:order-none">
            <div className="relative flex w-full max-w-md">
              <input
                type="text"
                placeholder="O que você procura?"
                className="w-full rounded-l-md border border-border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-navy"
              />
              <button className="rounded-r-md bg-brand-navy px-4 text-brand-navy-foreground hover:opacity-90" aria-label="Buscar">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-6">
            <button className="flex items-center gap-2 text-sm">
              <User className="h-6 w-6 text-brand-navy" />
              <div className="leading-tight text-left">
                <div className="font-semibold">Entrar</div>
                <div className="text-xs text-muted-foreground">Minha conta</div>
              </div>
            </button>
            <button className="flex items-center gap-2 text-sm">
              <div className="relative">
                <ShoppingCart className="h-6 w-6 text-brand-navy" />
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-red text-[10px] font-bold text-brand-red-foreground">0</span>
              </div>
              <div className="leading-tight text-left">
                <div className="font-semibold">Carrinho</div>
                <div className="text-xs text-muted-foreground">R$ 0,00</div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Nav bar */}
      <nav className="bg-brand-navy text-brand-navy-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-stretch px-4">
          <button className="flex items-center gap-2 bg-brand-red px-4 py-3 text-sm font-bold">
            <Menu className="h-4 w-4" /> TODAS CATEGORIAS <ChevronRight className="h-3 w-3" />
          </button>
          <ul className="flex flex-1 flex-wrap items-center">
            {navLinks.map((l, i) => (
              <li key={l}>
                <a href="#" className={`block px-4 py-3 text-xs font-bold tracking-wide hover:text-brand-yellow ${i === 0 ? "text-brand-yellow" : ""}`}>
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Hero */}
      <HeroCarousel />


      {/* Categorias */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-sm font-bold tracking-wider text-foreground">COMPRE POR CATEGORIA</h2>
          <a href="#" className="text-sm text-brand-navy hover:underline">Ver todas ›</a>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-9">
          {categories.map((c) => (
            <button key={c.label} className="group flex flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-white text-brand-navy transition group-hover:border-brand-navy group-hover:shadow-md">
                <c.icon className="h-7 w-7" />
              </div>
              <span className="text-center text-xs text-foreground">{c.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Banners */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 md:grid-cols-2">
        <div className="group relative h-56 overflow-hidden rounded-xl bg-gradient-to-br from-brand-navy to-[oklch(0.22_0.12_265)] p-7 text-brand-navy-foreground shadow-md transition hover:shadow-xl">
          <div className="relative z-10 max-w-[60%]">
            <span className="inline-block rounded-full bg-brand-red px-2.5 py-0.5 text-[10px] font-bold tracking-wider">NOVO</span>
            <h3 className="mt-3 text-2xl font-extrabold leading-tight">
              KIT ESCOLAR
              <br />
              <span className="text-brand-yellow">DA REDE MUNICIPAL</span>
            </h3>
            <p className="mt-2 text-sm opacity-90">Kits completos com tudo para o ano letivo.</p>
            <button className="mt-4 rounded-md bg-white px-5 py-2 text-xs font-bold text-brand-navy transition hover:bg-brand-yellow">CONFIRA →</button>
          </div>
          <img
            src={kitImg}
            alt="Kit escolar"
            width={300}
            height={200}
            loading="eager"
            className="absolute -bottom-2 -right-2 h-[110%] w-auto object-contain drop-shadow-2xl transition group-hover:scale-105"
          />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        </div>

        <div className="group relative h-56 overflow-hidden rounded-xl bg-gradient-to-br from-brand-yellow to-[oklch(0.78_0.15_70)] p-7 text-brand-yellow-foreground shadow-md transition hover:shadow-xl">
          <div className="relative z-10 max-w-[60%]">
            <span className="inline-block rounded-full bg-brand-navy px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-brand-navy-foreground">PROMO</span>
            <h3 className="mt-3 text-2xl font-extrabold leading-tight">
              OFERTAS
              <br />
              <span className="text-brand-red">DA SEMANA</span>
            </h3>
            <p className="mt-2 text-sm">Descontos em materiais selecionados.</p>
            <button className="mt-4 rounded-md bg-brand-navy px-5 py-2 text-xs font-bold text-brand-navy-foreground transition hover:bg-brand-red">APROVEITE →</button>
          </div>
          <div
            className="absolute right-6 top-1/2 flex h-32 w-32 -translate-y-1/2 items-center justify-center rounded-full bg-brand-red text-center text-brand-red-foreground shadow-lg transition group-hover:rotate-12"
            style={{ clipPath: "polygon(50% 0%, 61% 12%, 75% 6%, 79% 21%, 94% 22%, 90% 37%, 100% 50%, 90% 63%, 94% 78%, 79% 79%, 75% 94%, 61% 88%, 50% 100%, 39% 88%, 25% 94%, 21% 79%, 6% 78%, 10% 63%, 0% 50%, 10% 37%, 6% 22%, 21% 21%, 25% 6%, 39% 12%)" }}
          >
            <div>
              <div className="text-xs font-bold">ATÉ</div>
              <div className="text-3xl font-extrabold leading-none">30%</div>
              <div className="text-xs font-bold">OFF</div>
            </div>
          </div>
        </div>
      </section>

      {/* Produtos */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-sm font-bold tracking-wider text-foreground">PRODUTOS EM DESTAQUE</h2>
          <a href="#" className="text-sm text-brand-navy hover:underline">Ver todas ›</a>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {products.map((p) => (
            <article key={p.name} className="group relative rounded-lg border border-border bg-white p-3 transition hover:shadow-md">
              <button className="absolute right-3 top-3 z-10 text-muted-foreground hover:text-brand-red" aria-label="Favoritar">
                <Heart className="h-4 w-4" />
              </button>
              <div className="flex h-36 items-center justify-center">
                <img src={p.img} alt={p.name} width={512} height={512} loading="eager" className="max-h-full max-w-full object-contain" />
              </div>
              <h3 className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs text-foreground">{p.name}</h3>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-base font-bold text-brand-navy">{p.price}</div>
                <button className="rounded-md bg-brand-navy p-1.5 text-brand-navy-foreground hover:opacity-90" aria-label="Adicionar ao carrinho">
                  <ShoppingCart className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Benefícios */}
      <section className="border-y border-border bg-brand-gray">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-6 md:grid-cols-4">
          {[
            { icon: Truck, t: "Entrega rápida", s: "Receba no endereço que preferir." },
            { icon: ShieldCheck, t: "Compra segura", s: "Ambiente 100% seguro e confiável." },
            { icon: CreditCard, t: "Formas de pagamento", s: "Cartão, Pix e Boleto com facilidade." },
            { icon: Headphones, t: "Atendimento", s: "Dúvidas? Fale com a gente!" },
          ].map((b) => (
            <div key={b.t} className="flex items-start gap-3">
              <b.icon className="h-7 w-7 shrink-0 text-brand-navy" />
              <div>
                <div className="text-sm font-bold text-foreground">{b.t}</div>
                <div className="text-xs text-muted-foreground">{b.s}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Avisos / Quem somos / Dúvidas */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-10 md:grid-cols-3">
        <div>
          <div className="mb-3 flex items-center gap-2 text-brand-navy">
            <Megaphone className="h-5 w-5" /> <span className="text-sm font-bold">AVISOS IMPORTANTES</span>
          </div>
          <div className="flex gap-3">
            <div className="h-16 w-12 shrink-0 rounded bg-brand-gray" />
            <div>
              <div className="text-sm font-semibold">Novidades 2026</div>
              <p className="text-xs text-muted-foreground">Confira os lançamentos de materiais escolares para o ano letivo.</p>
              <a href="#" className="mt-1 inline-block text-xs font-semibold text-brand-navy hover:underline">Saiba mais →</a>
            </div>
          </div>
        </div>
        <div>
          <div className="mb-3 flex items-center gap-2 text-brand-navy">
            <Users className="h-5 w-5" /> <span className="text-sm font-bold">QUEM SOMOS</span>
          </div>
          <p className="text-xs text-muted-foreground">
            A BM Cell vende materiais escolares com qualidade e preço justo. Nosso compromisso é equipar os estudantes com tudo o que precisam para ir longe.
          </p>
          <a href="#" className="mt-2 inline-block text-xs font-semibold text-brand-navy hover:underline">Conheça mais sobre a BM Cell →</a>
        </div>
        <div className="rounded-lg bg-brand-navy p-5 text-brand-navy-foreground">
          <div className="text-sm font-bold">DÚVIDAS?</div>
          <p className="mt-1 text-xs opacity-90">Fale com a gente pelo WhatsApp</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white"><path d="M20 3.5A11.5 11.5 0 003.5 19.7L2 22l2.5-1.3A11.5 11.5 0 1020 3.5zM12 21a9 9 0 01-4.6-1.3l-.3-.2-2.5.7.7-2.4-.2-.3A9 9 0 1112 21z"/></svg>
            </div>
            <div className="text-xl font-extrabold">(11) 3397-0505</div>
          </div>
          <p className="mt-3 text-xs opacity-80">Segunda a sexta, das 8h às 17h</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-navy text-brand-navy-foreground">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 rounded-md bg-white p-2">
              <img src={bmcellLogo.url} alt="BM Cell" width={120} height={48} loading="eager" className="h-10 w-auto object-contain" />
            </div>
            <p className="mt-3 text-xs opacity-80">BM Cell — Material Escolar. Todos os direitos reservados.</p>
            <div className="mt-3 flex gap-3 opacity-90">
              <Facebook className="h-4 w-4" /><Instagram className="h-4 w-4" /><Youtube className="h-4 w-4" />
            </div>
          </div>
          <FooterCol title="INSTITUCIONAL" items={["Sobre a BM Cell", "Notícias", "Transparência", "Legislação", "Fale Conosco"]} />
          <FooterCol title="AJUDA" items={["Perguntas Frequentes", "Política de Privacidade", "Trocas e Devoluções", "Termos de Uso"]} />
          <div>
            <div className="mb-3 text-xs font-bold tracking-wider">ATENDIMENTO</div>
            <ul className="space-y-1.5 text-xs opacity-90">
              <li>📞 (11) 3397-0505</li>
              <li>✉ atendimento@bmcell.com.br</li>
              <li>Seg a Sex das 8h às 17h</li>
            </ul>
          </div>
          <div>
            <div className="mb-3 text-xs font-bold tracking-wider">FORMAS DE PAGAMENTO</div>
            <div className="flex flex-wrap gap-1.5">
              {["VISA", "MC", "ELO", "AMEX", "PIX", "BOL"].map((p) => (
                <span key={p} className="rounded bg-white px-2 py-1 text-[10px] font-bold text-brand-navy">{p}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-brand-red">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-xs text-brand-red-foreground">
            <Lock className="h-3 w-3" /> bmcell.com.br
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-3 text-xs font-bold tracking-wider">{title}</div>
      <ul className="space-y-1.5 text-xs opacity-90">
        {items.map((i) => <li key={i}><a href="#" className="hover:underline">{i}</a></li>)}
      </ul>
    </div>
  );
}

const heroSlides = [
  {
    img: heroImg,
    eyebrow: "VOLTA ÀS AULAS",
    title: "Educação que",
    titleAccent: "transforma o futuro",
    text: "Encontre tudo o que os estudantes precisam para aprender mais e ir mais longe.",
    cta: "VER KITS ESCOLARES",
  },
  {
    img: kitImg,
    eyebrow: "KITS COMPLETOS",
    title: "Kit Escolar 2026",
    titleAccent: "pronto para o ano letivo",
    text: "Mochila, cadernos, lápis, canetas e muito mais — tudo em um só lugar.",
    cta: "MONTAR MEU KIT",
  },
  {
    img: pMochila,
    eyebrow: "OFERTAS DA SEMANA",
    title: "Até 30% OFF",
    titleAccent: "em mochilas e estojos",
    text: "Aproveite descontos especiais em itens selecionados por tempo limitado.",
    cta: "APROVEITAR AGORA",
  },
];

function HeroCarousel() {
  const [i, setI] = useState(0);
  const total = heroSlides.length;
  const go = (n: number) => setI((n + total) % total);

  useEffect(() => {
    const t = setInterval(() => setI((c) => (c + 1) % total), 6000);
    return () => clearInterval(t);
  }, [total]);

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[420px] md:h-[480px]">
        {heroSlides.map((s, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-700 ${idx === i ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <img
              src={s.img}
              alt=""
              width={1600}
              height={900}
              loading="eager"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/10" />
            <div className="relative mx-auto grid h-full max-w-7xl grid-cols-1 items-center gap-8 px-4 md:grid-cols-2">
              <div>
                <span className="inline-block rounded-full bg-brand-red px-3 py-1 text-[10px] font-bold tracking-widest text-brand-red-foreground">
                  {s.eyebrow}
                </span>
                <h1 className="mt-4 text-4xl font-extrabold leading-tight text-brand-navy md:text-5xl">
                  {s.title}
                  <br />
                  <span className="text-brand-red">{s.titleAccent}</span>
                </h1>
                <p className="mt-5 max-w-md text-base text-foreground/80">{s.text}</p>
                <button className="mt-7 rounded-md bg-brand-navy px-7 py-3 text-sm font-bold text-brand-navy-foreground shadow-lg hover:opacity-90">
                  {s.cta}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => go(i - 1)}
        className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-brand-navy/30 bg-white/80 p-2 text-brand-navy hover:bg-white"
        aria-label="Anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => go(i + 1)}
        className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-brand-navy/30 bg-white/80 p-2 text-brand-navy hover:bg-white"
        aria-label="Próximo"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {heroSlides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Slide ${idx + 1}`}
            className={`h-2 rounded-full transition-all ${idx === i ? "w-6 bg-brand-navy" : "w-2 bg-brand-navy/30"}`}
          />
        ))}
      </div>
    </section>
  );
}
