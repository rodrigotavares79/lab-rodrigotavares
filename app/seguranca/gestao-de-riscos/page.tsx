"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { MATRIZ_5X5 } from "@/lib/metodologiaRisco";
import s from "./inicio.module.css";

// Página inicial do módulo: poucos KPIs, a matriz 5×5 com a contagem de
// riscos ativos, os riscos que pedem atenção e atalhos curtos para as telas.
// A navegação completa continua no menu lateral (RiscosShell).

const BASE = "/seguranca/gestao-de-riscos";

type Resumo = {
  kpis: {
    total: number;
    ativos: number;
    altos: number;
    significativos: number;
    planosAbertos: number;
    acoesTotal: number;
    acoesConcluidas: number;
    acoesAtrasadas: number;
  };
  matriz: { prob: number; imp: number; total: number }[];
  atencao: {
    id: number;
    gatilho: string | null;
    categoria: string | null;
    impacto_qualitativo: string | null;
    proximo_prazo: string | null;
  }[];
};

const NIVEL_CLASSE: Record<number, string> = { 1: s.n1, 2: s.n2, 3: s.n3, 4: s.n4 };
const NIVEL_NOMES: Record<number, string> = { 1: "Baixo", 2: "Moderado", 3: "Significativo", 4: "Alto" };
const BADGE_POR_NIVEL: Record<string, string> = {
  Baixo: "badge-baixo",
  Moderado: "badge-medio",
  Significativo: "badge-alto",
  Alto: "badge-critico",
};

const ATALHOS = [
  { titulo: "Política", sub: "Diretrizes e papéis", href: `${BASE}/politica`, icone: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" },
  { titulo: "Processo", sub: "Etapas do tratamento", href: `${BASE}/processo`, icone: "M5 6h14M5 12h10M5 18h6" },
  { titulo: "Cadastro", sub: "Individual ou CSV", href: `${BASE}/cadastro-de-riscos`, icone: "M12 5v14M5 12h14" },
  { titulo: "Lista de riscos", sub: "Detalhe e planos", href: `${BASE}/riscos`, icone: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" },
  { titulo: "Dashboard", sub: "Visão executiva", href: `${BASE}/dashboard`, icone: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { titulo: "Guia de uso", sub: "Telas e matriz 5×5", href: `${BASE}/guia-de-uso`, icone: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5" },
];

function formatPrazo(prazo: string | null): { texto: string; atrasado: boolean } {
  if (!prazo) return { texto: "sem prazo", atrasado: false };
  const data = new Date(String(prazo).slice(0, 10) + "T00:00:00");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (data < hoje) return { texto: "atrasado", atrasado: true };
  return {
    texto: "vence " + data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    atrasado: false,
  };
}

function Valor({ v }: { v: number | undefined }) {
  return <>{v === undefined ? "—" : v}</>;
}

export default function GestaoDeRiscos() {
  const [dados, setDados] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/inicio-riscos")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDados(d);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar o resumo."));
  }, []);

  const k = dados?.kpis;
  const criticos = k ? k.altos + k.significativos : undefined;
  const pctAltos = k && k.ativos ? (k.altos / k.ativos) * 100 : 0;
  const pctSignif = k && k.ativos ? (k.significativos / k.ativos) * 100 : 0;
  const pctAcoes = k && k.acoesTotal ? Math.round((k.acoesConcluidas / k.acoesTotal) * 100) : 0;
  const atrasadas = k?.acoesAtrasadas ?? 0;

  const contagem = new Map((dados?.matriz || []).map((m) => [`${m.prob}-${m.imp}`, m.total]));

  return (
    <>
      <section className="content-block">
        <div className={`container ${s.pagina}`}>
          <header className={s.topo}>
            <div>
              <span className="eyebrow">Segurança da Informação</span>
              <h1>Gestão de Riscos</h1>
              <p className={s.subtitulo}>
                Identificar, avaliar e tratar riscos aos ativos de TI antes que virem incidentes.
              </p>
            </div>
            <div className={s.acoes}>
              <Link href={`${BASE}/dashboard`} className={s.botaoSec}>Ver dashboard</Link>
              <Link href={`${BASE}/cadastro-de-riscos`} className={s.botaoPri}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Novo risco
              </Link>
            </div>
          </header>

          {erro && (
            <div className="error-banner">
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar os indicadores.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          <section aria-label="Indicadores" className={s.kpis}>
            <div className={s.kpi}>
              <span className={s.kpiRotulo}>Riscos ativos</span>
              <span className={s.kpiValor}><Valor v={k?.ativos} /></span>
              <span className={s.kpiNota}>{k ? `${k.total - k.ativos} mitigados de ${k.total}` : " "}</span>
            </div>
            <div className={s.kpi}>
              <span className={s.kpiRotulo}>Altos e significativos</span>
              <span className={`${s.kpiValor} ${s.valorAlerta}`}><Valor v={criticos} /></span>
              <div className={s.barra} aria-hidden="true">
                <div style={{ width: `${pctAltos}%`, background: "#c0392b" }} />
                <div style={{ width: `${pctSignif}%`, background: "#e8a065" }} />
              </div>
              <span className={s.kpiNota}>{k ? `${k.altos} altos · ${k.significativos} significativos` : " "}</span>
            </div>
            <div className={s.kpi}>
              <span className={s.kpiRotulo}>Planos de ação abertos</span>
              <span className={s.kpiValor}><Valor v={k?.planosAbertos} /></span>
              <div className={s.barra} aria-hidden="true">
                <div style={{ width: `${pctAcoes}%`, background: "var(--accent)" }} />
              </div>
              <span className={s.kpiNota}>{k ? `${pctAcoes}% das ações concluídas` : " "}</span>
            </div>
            <div className={`${s.kpi} ${atrasadas > 0 ? s.kpiAlerta : ""}`}>
              <span className={s.kpiRotulo}>Ações atrasadas</span>
              <span className={s.kpiValor}><Valor v={k?.acoesAtrasadas} /></span>
              <span className={s.kpiNota}>{k ? (atrasadas > 0 ? "Prazo vencido" : "Tudo dentro do prazo") : " "}</span>
            </div>
          </section>

          <section className={s.meio}>
            <div className={`${s.painel} ${s.painelMatriz}`}>
              <div className={s.painelTopo}>
                <h2>Matriz de riscos 5×5</h2>
                <span>riscos ativos por célula</span>
              </div>
              <div className={s.matriz}>
                <span className={s.eixoY}>Probabilidade</span>
                <div>
                  <div className={s.grade} role="table" aria-label="Riscos ativos por probabilidade e impacto">
                    {[5, 4, 3, 2, 1].map((p) =>
                      [1, 2, 3, 4, 5].map((i) => {
                        const nivel = MATRIZ_5X5[p - 1][i - 1];
                        const n = contagem.get(`${p}-${i}`) || 0;
                        return (
                          <div
                            key={`${p}-${i}`}
                            role="cell"
                            className={`${s.celula} ${NIVEL_CLASSE[nivel]}`}
                            title={`Probabilidade ${p} × Impacto ${i}: ${n} risco(s)`}
                          >
                            {n > 0 ? n : ""}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className={s.eixoX}>Impacto</div>
                </div>
              </div>
              <div className={s.legenda}>
                {[1, 2, 3, 4].map((n) => (
                  <span key={n}>
                    <i className={NIVEL_CLASSE[n]} aria-hidden="true" />
                    {NIVEL_NOMES[n]}
                  </span>
                ))}
              </div>
            </div>

            <div className={`${s.painel} ${s.painelAtencao}`}>
              <div className={s.painelTopo}>
                <h2>Atenção agora</h2>
                <Link href={`${BASE}/riscos`} className={s.verTodos}>Ver todos</Link>
              </div>
              {dados && dados.atencao.length === 0 && (
                <p className="text-muted" style={{ margin: 0 }}>Nenhum risco ativo no momento.</p>
              )}
              {!dados && !erro && <p className="text-muted" style={{ margin: 0 }}>Carregando...</p>}
              <ul className={s.lista}>
                {(dados?.atencao || []).map((r) => {
                  const prazo = formatPrazo(r.proximo_prazo);
                  return (
                    <li key={r.id}>
                      <Link href={`${BASE}/riscos/${r.id}`} className={s.item}>
                        <span className={s.itemId}>#{r.id}</span>
                        <span className={s.itemTexto}>
                          <span className={s.itemTitulo}>{r.gatilho || r.categoria || "Risco sem descrição"}</span>
                          {r.gatilho && r.categoria && <span className={s.itemSub}>{r.categoria}</span>}
                        </span>
                        {r.impacto_qualitativo && (
                          <span className={`badge ${BADGE_POR_NIVEL[r.impacto_qualitativo] || ""}`}>
                            {r.impacto_qualitativo}
                          </span>
                        )}
                        <span className={`${s.itemPrazo} ${prazo.atrasado ? s.prazoAtrasado : ""}`}>{prazo.texto}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          <section className={s.atalhosBloco}>
            <h2 className={s.tituloSecao}>Acesso rápido</h2>
            <div className={s.atalhos}>
              {ATALHOS.map((a) => (
                <Link key={a.href} href={a.href} className={s.atalho}>
                  <span className={s.atalhoIcone}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={a.icone} />
                    </svg>
                  </span>
                  <span className={s.atalhoTitulo}>{a.titulo}</span>
                  <span className={s.atalhoSub}>{a.sub}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>
      <Footer />
    </>
  );
}
