"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import s from "./riscos.module.css";
import { ProvedorPermissoesRiscos, usePerfilRiscos, type PermissoesRiscos } from "./PermissoesRiscos";

// Moldura própria do módulo Gestão de Riscos: barra superior + menu lateral
// agrupado. Vale só para as rotas em /seguranca/gestao-de-riscos — o
// cabeçalho e o rodapé globais do lab são escondidos via `.riscos-shell`
// (globals.css), no mesmo padrão já usado pelo Gestão de Condomínio.

const BASE = "/seguranca/gestao-de-riscos";

type Contador = "auditoriaPendentes" | "acoesAtrasadas" | "revisoesVencidas";
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

const GRUPOS: GrupoMenu[] = [
  {
    titulo: "Visão geral",
    itens: [
      { href: BASE, label: "Início", exato: true },
      { href: `${BASE}/dashboard`, label: "Dashboard" },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { href: `${BASE}/riscos`, label: "Riscos", tambem: [`${BASE}/cadastro-de-riscos`] },
      { href: `${BASE}/acoes-atrasadas`, label: "Ações atrasadas", contador: "acoesAtrasadas", alerta: true },
      { href: `${BASE}/revisoes-vencidas`, label: "Revisões vencidas", contador: "revisoesVencidas", alerta: true },
    ],
  },
  {
    titulo: "Auditoria",
    itens: [
      {
        href: `${BASE}/auditoria`,
        label: "Auditoria de Planos",
        exato: true,
        contador: "auditoriaPendentes",
        exige: "verAuditoria",
      },
    ],
  },
  {
    titulo: "Conformidade",
    itens: [{ href: `${BASE}/conformidade`, label: "Frameworks (CIS, NIST, ISO)" }],
  },
  {
    titulo: "Relatórios",
    itens: [
      { href: `${BASE}/relatorio-executivo`, label: "Relatório Executivo" },
      { href: `${BASE}/auditoria/relatorio`, label: "Relatório de Auditoria", exige: "verAuditoria" },
    ],
  },
];

// Documentos de consulta: ficam no rodapé do menu, fora das telas de trabalho.
const DOCUMENTOS: ItemMenu[] = [
  { href: `${BASE}/politica`, label: "Política" },
  { href: `${BASE}/processo`, label: "Processo" },
  { href: `${BASE}/guia-de-uso`, label: "Guia de Uso" },
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
          <nav aria-label="Gestão de Riscos">
            {grupos.map((g) => (
              <div key={g.titulo} className={s.grupo}>
                <div className={s.grupoTitulo}>{g.titulo}</div>
                <ul>{g.itens.map(renderItem)}</ul>
              </div>
            ))}
          </nav>
          <div className={s.lateralRodape}>
            <div className={s.grupoTitulo}>Documentos</div>
            <ul>{DOCUMENTOS.map(renderItem)}</ul>
            <span className={s.copyright}>© {new Date().getFullYear()} Rodrigo Tavares</span>
          </div>
        </aside>
        {menuAberto && <div className={s.veu} onClick={() => setMenuAberto(false)} aria-hidden="true" />}

        <main className={s.conteudo}>{children}</main>
      </div>
    </div>
  );
}
