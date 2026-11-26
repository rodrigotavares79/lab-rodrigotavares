"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import s from "./riscos.module.css";
import { ProvedorPermissoesRiscos, SemPermissao, usePerfilRiscos, type PermissoesRiscos } from "./PermissoesRiscos";

// Moldura própria do módulo Gestão de Riscos: barra superior + menu lateral
// agrupado. Vale só para as rotas em /seguranca/gestao-de-riscos — o
// cabeçalho e o rodapé globais do lab são escondidos via `.riscos-shell`
// (globals.css), no mesmo padrão já usado pelo Gestão de Condomínio.

const BASE = "/seguranca/gestao-de-riscos";

type Contador = "auditoriaPendentes" | "acoesAtrasadas" | "revisoesVencidas" | "semTratamento" | "aceitacoesPendentes" | "semDono" | "duplicados" | "controlesNaoAvaliados" | "acimaTolerancia" | "apetitePendente" | "krisVermelho";
type ItemMenu = {
  href: string;
  label: string;
  exato?: boolean;
  // Outras rotas que também deixam o item marcado (ex.: o cadastro conta
  // como parte de "Riscos").
  tambem?: string[];
  contador?: Contador;
  // Contador em vermelho (atraso) ou neutro (fila de trabalho).
  alerta?: boolean;
  // Só aparece para quem tem esta permissão.
  exige?: keyof PermissoesRiscos;
};
type GrupoMenu = { titulo: string; itens: ItemMenu[] };

// Início e Guia de uso ficam fora dos grupos (links diretos, no topo e no
// rodapé do menu). Os grupos abrem como sanfona: só um aberto por vez.
const INICIO: ItemMenu = { href: BASE, label: "Início", exato: true };
const GUIA: ItemMenu = { href: `${BASE}/guia-de-uso`, label: "Guia de uso" };

const GRUPOS: GrupoMenu[] = [
  {
    titulo: "Riscos",
    itens: [
      { href: `${BASE}/riscos`, label: "Lista de riscos" },
      { href: `${BASE}/cadastro-de-riscos`, label: "Cadastrar risco", exige: "editarRiscos" },
      { href: `${BASE}/kris`, label: "Indicadores (KRIs)" },
      { href: `${BASE}/cenarios`, label: "Catálogo de cenários" },
      { href: `${BASE}/ativos-criticos`, label: "Ativos e processos" },
      { href: `${BASE}/contatos-risco`, label: "Contatos de negócio" },
      { href: `${BASE}/riscos-duplicados`, label: "Riscos repetidos", contador: "duplicados", exige: "editarRiscos" },
    ],
  },
  {
    // Pendências transversais: tudo aqui tem contador.
    titulo: "Acompanhamento",
    itens: [
      { href: `${BASE}/kris?faixa=vermelho`, label: "KRIs no vermelho", contador: "krisVermelho", alerta: true },
      { href: `${BASE}/riscos?apetite=acima-tolerancia`, label: "Acima da tolerância", contador: "acimaTolerancia", alerta: true },
      { href: `${BASE}/revisoes-vencidas`, label: "Revisões vencidas", contador: "revisoesVencidas", alerta: true },
      { href: `${BASE}/sem-tratamento`, label: "Riscos sem tratamento", contador: "semTratamento", alerta: true },
      { href: `${BASE}/riscos?dono=sem`, label: "Riscos sem dono", contador: "semDono", alerta: true },
      { href: `${BASE}/riscos?controles=nao-avaliados`, label: "Controles não avaliados", contador: "controlesNaoAvaliados" },
    ],
  },
  {
    titulo: "Planos de Ação",
    itens: [
      { href: `${BASE}/planos-de-acao`, label: "Todos os planos" },
      { href: `${BASE}/acoes-atrasadas`, label: "Ações atrasadas", contador: "acoesAtrasadas", alerta: true },
      { href: `${BASE}/aceitacoes-pendentes`, label: "Aceitações pendentes", contador: "aceitacoesPendentes" },
    ],
  },
  {
    titulo: "Auditoria",
    itens: [
      { href: `${BASE}/auditoria`, label: "Fila de auditoria", exato: true, contador: "auditoriaPendentes", exige: "verAuditoria" },
      { href: `${BASE}/auditoria/relatorio`, label: "Relatório de auditoria", exige: "verAuditoria" },
    ],
  },
  {
    titulo: "Conformidade",
    itens: [
      { href: `${BASE}/apetite`, label: "Apetite e tolerância", contador: "apetitePendente" },
      { href: `${BASE}/conformidade`, label: "Frameworks (CIS, NIST, ISO)" },
      { href: `${BASE}/politica`, label: "Política" },
      { href: `${BASE}/processo`, label: "Processo" },
    ],
  },
  {
    titulo: "Relatórios",
    itens: [
      { href: `${BASE}/relatorio-executivo`, label: "Relatório executivo" },
      { href: `${BASE}/dashboard`, label: "Dashboard" },
      { href: `${BASE}/tendencias`, label: "Tendências" },
    ],
  },
];

function casa(pathname: string, href: string, exato?: boolean): boolean {
  if (exato) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ativo(pathname: string, item: ItemMenu): boolean {
  return casa(pathname, item.href, item.exato) || (item.tambem || []).some((h) => casa(pathname, h));
}

export default function RiscosShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  // O Relatório Executivo é uma página de impressão: abre sem a moldura.
  if (pathname.startsWith(`${BASE}/relatorio`)) {
    return <div className="riscos-shell">{children}</div>;
  }
  return (
    <ProvedorPermissoesRiscos>
      <Moldura pathname={pathname}>{children}</Moldura>
    </ProvedorPermissoesRiscos>
  );
}

function Moldura({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const perfil = usePerfilRiscos();
  const [menuAberto, setMenuAberto] = useState(false);
  const [contadores, setContadores] = useState<Partial<Record<Contador, number>>>({});
  // Sanfona: só um grupo aberto. Passar o mouse abre o grupo (com um pequeno
  // atraso, para não piscar ao atravessar o menu); clicar no título fixa ou
  // fecha. Ao tirar o mouse do menu, volta ao grupo fixado ou ao da página.
  const [hover, setHover] = useState<string | null>(null);
  const [fixo, setFixo] = useState<string | null | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function agendar(g: string | null, ms: number) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHover(g), ms);
  }
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  // Ao trocar de página, a sanfona volta a seguir a página atual.
  useEffect(() => {
    setFixo(undefined);
    setHover(null);
  }, [pathname]);

  // Atualiza os contadores a cada troca de tela (ex.: depois de auditar um
  // plano, o número da fila já cai ao voltar para outra página).
  useEffect(() => {
    let cancelado = false;
    fetch("/api/menu-riscos")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelado && !d.error) setContadores(d);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [pathname]);

  function renderItem(item: ItemMenu) {
    const marcado = ativo(pathname, item);
    const n = item.contador ? contadores[item.contador] : undefined;
    return (
      <li key={item.href}>
        <a
          href={item.href}
          className={`${s.itemMenu} ${marcado ? s.itemAtivo : ""}`}
          aria-current={marcado ? "page" : undefined}
          onClick={() => setMenuAberto(false)}
        >
          <span>{item.label}</span>
          {n !== undefined && n > 0 && (
            <span
              className={`${s.contador} ${item.alerta ? s.contadorAlerta : ""}`}
              aria-label={`${n} ${item.alerta ? "atrasada" + (n > 1 ? "s" : "") : "pendente" + (n > 1 ? "s" : "")}`}
            >
              {n}
            </span>
          )}
        </a>
      </li>
    );
  }

  // Itens que o perfil não pode ver somem; grupos que ficam vazios também.
  const grupos = GRUPOS.map((g) => ({
    ...g,
    itens: g.itens.filter((i) => !i.exige || perfil.permissoes[i.exige]),
  })).filter((g) => g.itens.length > 0);
  const grupoDaPagina = grupos.find((g) => g.itens.some((i) => ativo(pathname, i)))?.titulo ?? null;
  const aberto = hover ?? (fixo === undefined ? grupoDaPagina : fixo);

  // Soma dos contadores do grupo, para o alerta aparecer com o grupo fechado.
  function somaGrupo(g: GrupoMenu) {
    let alerta = 0;
    let neutro = 0;
    for (const i of g.itens) {
      const n = i.contador ? contadores[i.contador] ?? 0 : 0;
      if (i.alerta) alerta += n;
      else neutro += n;
    }
    return { alerta, neutro };
  }

  return (
    <div className={`riscos-shell ${s.shell}`}>
      <header className={s.topo}>
        <div className={s.topoEsquerda}>
          <button
            type="button"
            className={s.botaoMenu}
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
          <a href="/" className={s.marca}>
            Rodrigo Tavares <span>/ lab</span>
          </a>
          <span className={s.seloModulo}>
            <span className={s.seloPonto} aria-hidden="true" />
            Gestão de Riscos
          </span>
        </div>
        <div className={s.topoDireita}>
          {perfil.carregado && perfil.rotulo && (
            <span className={s.perfilTopo} title="Seu perfil no Gestão de Riscos">
              {perfil.rotulo}
            </span>
          )}
          <a href="/" className={s.linkTopo}>
            Voltar ao Lab
          </a>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <div className={s.corpo}>
        <aside className={`${s.lateral} ${menuAberto ? s.lateralAberta : ""}`}>
          <nav aria-label="Gestão de Riscos" onMouseLeave={() => agendar(null, 250)}>
            <ul className={s.itensSoltos}>{renderItem(INICIO)}</ul>
            {grupos.map((g) => {
              const estaAberto = aberto === g.titulo;
              const soma = somaGrupo(g);
              const idLista = `menu-${g.titulo.replace(/\s+/g, "-").toLowerCase()}`;
              return (
                <div key={g.titulo} className={`${s.grupo} ${estaAberto ? s.grupoAberto : ""}`} onMouseEnter={() => agendar(g.titulo, 120)}>
                  <button
                    type="button"
                    className={s.grupoBotao}
                    aria-expanded={estaAberto}
                    aria-controls={idLista}
                    onClick={() => {
                      if (timer.current) clearTimeout(timer.current);
                      setHover(null);
                      setFixo(estaAberto ? null : g.titulo);
                    }}
                  >
                    <span>{g.titulo}</span>
                    <span className={s.grupoLado}>
                      {!estaAberto && soma.alerta > 0 && (
                        <span className={`${s.contador} ${s.contadorAlerta}`} aria-label={`${soma.alerta} pendências atrasadas`}>
                          {soma.alerta}
                        </span>
                      )}
                      {!estaAberto && soma.alerta === 0 && soma.neutro > 0 && (
                        <span className={s.contador} aria-label={`${soma.neutro} pendentes`}>
                          {soma.neutro}
                        </span>
                      )}
                      <span className={s.seta} aria-hidden="true" />
                    </span>
                  </button>
                  <div className={s.grupoCorpo} id={idLista} inert={!estaAberto}>
                    <ul>{g.itens.map(renderItem)}</ul>
                  </div>
                </div>
              );
            })}
          </nav>
          <div className={s.lateralRodape}>
            <ul>{renderItem(GUIA)}</ul>
            <span className={s.copyright}>© {new Date().getFullYear()} Rodrigo Tavares</span>
          </div>
        </aside>
        {menuAberto && <div className={s.veu} onClick={() => setMenuAberto(false)} aria-hidden="true" />}

        <main className={s.conteudo}>
          {/* B11: conta sem perfil no módulo não vê nada (as APIs também recusam). */}
          {perfil.carregado && !perfil.permissoes.ler ? (
            <SemPermissao mensagem="Seu usuário não tem acesso ao Gestão de Riscos. Peça a um administrador para definir seu perfil." />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
