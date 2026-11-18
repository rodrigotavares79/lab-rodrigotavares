"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import s from "@/app/condominio/condominio.module.css";
import { NOME_CONDOMINIO } from "@/lib/condominioFonts";

type Props = {
  nome: string;
  unidade: string | null;
  gerente: boolean;
  chamadosAbertos: number;
  naoLidas: number;
};

type Item = { rotulo: string; href: string; badge?: number; dica?: string; destaque?: boolean };

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

function iniciais(nome: string) {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export default function CondominioSidebar({ nome, unidade, gerente, chamadosAbertos, naoLidas }: Props) {
  const pathname = usePathname();

  const principais: Item[] = [
    {
      rotulo: "Início", href: "/condominio", badge: naoLidas,
      dica: plural(naoLidas, "comunicado não lido", "comunicados não lidos"),
      destaque: true,
    },
    { rotulo: "Abrir chamado", href: "/condominio/novo-chamado" },
    {
      rotulo: "Lista de chamados", href: "/condominio/chamados", badge: chamadosAbertos,
      // Para a administração o número é de chamados com prazo vencido (em
      // vermelho); para o condômino, os chamados dele ainda em aberto.
      dica: gerente
        ? plural(chamadosAbertos, "chamado com prazo vencido", "chamados com prazo vencido")
        : plural(chamadosAbertos, "chamado seu em aberto", "chamados seus em aberto"),
      destaque: gerente,
    },
    { rotulo: "Relatórios", href: "/condominio/relatorios" },
  ];
  const admin: Item[] = [
    { rotulo: "Fornecedores", href: "/condominio/fornecedores" },
    { rotulo: "Catálogo de serviços", href: "/condominio/catalogo-de-servicos" },
    { rotulo: "Condôminos", href: "/condominio/condominos" },
  ];

  const ativo = (href: string) =>
    href === "/condominio" ? pathname === href : pathname?.startsWith(href);

  let n = 0;
  const render = (it: Item) => {
    n += 1;
    return (
      <Link key={it.href} href={it.href} className={`${s.menuItem} ${ativo(it.href) ? s.menuItemAtivo : ""}`}
        aria-current={ativo(it.href) ? "page" : undefined}>
        <span className={s.menuNum}>{String(n).padStart(2, "0")}</span>
        <span className={s.menuRotulo}>{it.rotulo}</span>
        {!!it.badge && (
          <span className={`${s.menuBadge} ${it.destaque ? "" : s.menuBadgeNeutro}`} title={it.dica}>
            <span aria-hidden="true">{it.badge}</span>
            <span className={s.somenteLeitor}>({it.dica})</span>
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className={s.sidebar}>
      <Link href="/condominio" className={s.marca}>
        <span className={s.simbolo}>
          <span className={s.simboloBalao}>{NOME_CONDOMINIO[0]}</span>
          <span className={s.simboloPonto} />
        </span>
        <span>
          <div className={s.marcaNome}>{NOME_CONDOMINIO}</div>
          <div className={s.marcaTag}>Chamados</div>
        </span>
      </Link>

      <nav className={s.menu} aria-label="Navegação do condomínio">
        {principais.map(render)}
        {gerente && (
          <>
            <div className={s.menuGrupo}>Administração</div>
            {admin.map(render)}
          </>
        )}
      </nav>

      <div className={s.usuario}>
        <span className={s.avatar}>{iniciais(nome)}</span>
        <span style={{ minWidth: 0 }}>
          <div className={s.usuarioNome}>{nome}</div>
          {unidade && <div className={s.usuarioUnidade}>{unidade}</div>}
        </span>
      </div>
      <div className={s.rodapeMenu}>
        <a href="/condominio/privacidade" className={s.privacidade}>Política de Privacidade</a>
        <span className={s.rodapeLinks}>
          <a href="/" className={s.privacidade}>Lab</a>
          <SignOutButton redirectUrl="/sign-in">
            <button type="button" className={s.sair}>Sair</button>
          </SignOutButton>
        </span>
      </div>
    </aside>
  );
}
