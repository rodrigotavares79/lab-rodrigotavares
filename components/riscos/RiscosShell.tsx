"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import s from "./riscos.module.css";

// Moldura própria do módulo Gestão de Riscos: barra superior + menu lateral
// agrupado. Vale só para as rotas em /seguranca/gestao-de-riscos — o
// cabeçalho e o rodapé globais do lab são escondidos via `.riscos-shell`
// (globals.css), no mesmo padrão já usado pelo Gestão de Condomínio.

const BASE = "/seguranca/gestao-de-riscos";

type ItemMenu = { href: string; label: string; exato?: boolean };
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
    titulo: "Operação",
    itens: [
      { href: `${BASE}/cadastro-de-riscos`, label: "Cadastro de Riscos" },
      { href: `${BASE}/riscos`, label: "Lista de Riscos" },
    ],
  },
  {
    titulo: "Auditoria",
    itens: [{ href: `${BASE}/auditoria`, label: "Auditoria de Planos" }],
  },
  {
    titulo: "Governança",
    itens: [
      { href: `${BASE}/politica`, label: "Política" },
      { href: `${BASE}/processo`, label: "Processo" },
    ],
  },
];

function ativo(pathname: string, item: ItemMenu): boolean {
  if (item.exato) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function RiscosShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [menuAberto, setMenuAberto] = useState(false);

  // O Relatório Executivo é uma página de impressão: abre sem a moldura.
  if (pathname.startsWith(`${BASE}/relatorio`)) {
    return <div className="riscos-shell">{children}</div>;
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
          <a href="/" className={s.linkTopo}>
            Voltar ao Lab
          </a>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <div className={s.corpo}>
        <aside className={`${s.lateral} ${menuAberto ? s.lateralAberta : ""}`}>
          <nav aria-label="Gestão de Riscos">
            {GRUPOS.map((g) => (
              <div key={g.titulo} className={s.grupo}>
                <div className={s.grupoTitulo}>{g.titulo}</div>
                <ul>
                  {g.itens.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className={`${s.itemMenu} ${ativo(pathname, item) ? s.itemAtivo : ""}`}
                        aria-current={ativo(pathname, item) ? "page" : undefined}
                        onClick={() => setMenuAberto(false)}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className={s.lateralRodape}>
            <a
              href={`${BASE}/guia-de-uso`}
              className={`${s.itemMenu} ${pathname.startsWith(`${BASE}/guia-de-uso`) ? s.itemAtivo : ""}`}
            >
              Guia de Uso
            </a>
            <span className={s.copyright}>© {new Date().getFullYear()} Rodrigo Tavares</span>
          </div>
        </aside>
        {menuAberto && <div className={s.veu} onClick={() => setMenuAberto(false)} aria-hidden="true" />}

        <main className={s.conteudo}>{children}</main>
      </div>
    </div>
  );
}
