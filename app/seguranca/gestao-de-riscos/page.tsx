"use client";

import { situacaoInicio } from "@/lib/situacaoInicio";
import { hojeSaoPaulo } from "@/lib/revisaoRisco";
import { useEffect, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { FAIXAS_NIVEL_RISCO, MATRIZ_5X5, ROTULOS_ESCALA_5 } from "@/lib/metodologiaRisco";
import GraficosInicio from "@/components/riscos/GraficosInicio";
import s from "./inicio.module.css";
import { usePerfilRiscos } from "@/components/riscos/PermissoesRiscos";

// Página inicial do módulo: poucos KPIs, três gráficos pequenos, a matriz 5×5 com a contagem de
// riscos ativos e os riscos críticos e altos.
// A navegação completa continua no menu lateral (RiscosShell).

const BASE = "/seguranca/gestao-de-riscos";

type Resumo = {
  kpis: {
    total: number;
    ativos: number;
    criticos: number;
    altos: number;
    planosAbertos: number;
    acoesTotal: number;
    acoesConcluidas: number;
    acoesAtrasadas: number;
    revisoesVencidas: number;
    semTratamento: number;
    altoCriticoComTratamento: number;
    altoCriticoTotal: number;
  };
  matriz: { prob: number; imp: number; total: number }[];
  categorias: { categoria: string; total: number }[];
  niveis: { nivel: string; total: number }[];
  trimestres: { trimestre: number; total: number; mitigados: number }[];
  atencao: {
    id: number;
    gatilho: string | null;
    titulo?: string | null;
    categoria: string | null;
    impacto_qualitativo: string | null;
    proximo_prazo: string | null;
    status: string | null;
    planos_abertos: number;
  }[];
};

const NIVEL_CLASSE: Record<number, string> = { 1: s.n1, 2: s.n2, 3: s.n3, 4: s.n4 };
const NIVEL_NOMES: Record<number, string> = { 1: "Baixo", 2: "Médio", 3: "Alto", 4: "Crítico" };
const BADGE_POR_NIVEL: Record<string, string> = {
  Baixo: "badge-baixo",
  "Médio": "badge-medio",
  "Alto": "badge-alto",
  "Crítico": "badge-critico",
};

// B25: o que cada destaque quer dizer (dica ao passar o mouse).
const TITULO_ALERTA: Record<string, string> = {
  sem_plano: "Risco crítico ou alto sem plano de ação aberto nem aceitação formal",
  sem_prazo: "Há plano aberto, mas nenhuma ação pendente tem prazo definido",
  atrasado: "A próxima ação do plano está com o prazo vencido",
};

function Valor({ v }: { v: number | undefined }) {
  return <>{v === undefined ? "—" : v}</>;
}

export default function GestaoDeRiscos() {
  const perfil = usePerfilRiscos();
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
  const criticosEAltos = k ? k.criticos + k.altos : undefined;
  const pctCriticos = k && k.ativos ? (k.criticos / k.ativos) * 100 : 0;
  const pctAltos = k && k.ativos ? (k.altos / k.ativos) * 100 : 0;
  const pctAcoes = k && k.acoesTotal ? Math.round((k.acoesConcluidas / k.acoesTotal) * 100) : 0;
  const atrasadas = k?.acoesAtrasadas ?? 0;
  const revisoesVencidas = k?.revisoesVencidas ?? 0;
  const semTratamento = k?.semTratamento ?? 0;
  const pctTratamento = k && k.altoCriticoTotal ? Math.round((k.altoCriticoComTratamento / k.altoCriticoTotal) * 100) : null;

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
            {perfil.permissoes.editarRiscos && (
            <div className={s.acoes}>
              <Link href={`${BASE}/cadastro-de-riscos`} className={s.botaoPri}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Novo risco
              </Link>
            </div>
            )}
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
              <span className={s.kpiRotulo}>Críticos e altos</span>
              <span className={`${s.kpiValor} ${s.valorAlerta}`}><Valor v={criticosEAltos} /></span>
              <div className={s.barra} aria-hidden="true">
                <div style={{ width: `${pctCriticos}%`, background: "#c0392b" }} />
                <div style={{ width: `${pctAltos}%`, background: "#e8a065" }} />
              </div>
              <span className={s.kpiNota}>{k ? `${k.criticos} críticos · ${k.altos} altos` : " "}</span>
            </div>
            <div className={s.kpi}>
              <span className={s.kpiRotulo}>Planos de ação abertos</span>
              <span className={s.kpiValor}><Valor v={k?.planosAbertos} /></span>
              <div className={s.barra} aria-hidden="true">
                <div style={{ width: `${pctAcoes}%`, background: "var(--accent)" }} />
              </div>
              <span className={s.kpiNota}>{k ? `${pctAcoes}% das ações concluídas` : " "}</span>
            </div>
            <Link
              href={`${BASE}/acoes-atrasadas`}
              className={`${s.kpi} ${s.kpiLink} ${atrasadas > 0 ? s.kpiAviso : ""}`}
            >
              <span className={s.kpiRotulo}>Ações atrasadas</span>
              <span className={s.kpiValor}><Valor v={k?.acoesAtrasadas} /></span>
              <span className={s.kpiNota}>
                {k ? (atrasadas > 0 ? "Ver ações com prazo vencido →" : "Tudo dentro do prazo") : " "}
              </span>
            </Link>
            <Link
              href={`${BASE}/revisoes-vencidas`}
              className={`${s.kpi} ${s.kpiLink} ${revisoesVencidas > 0 ? s.kpiAviso : ""}`}
            >
              <span className={s.kpiRotulo}>Revisões vencidas</span>
              <span className={s.kpiValor}><Valor v={k?.revisoesVencidas} /></span>
              <span className={s.kpiNota}>
                {k ? (revisoesVencidas > 0 ? "Ver riscos a reavaliar →" : "Revisões em dia") : " "}
              </span>
            </Link>
            <Link
              href={`${BASE}/sem-tratamento`}
              className={`${s.kpi} ${s.kpiLink} ${semTratamento > 0 ? s.kpiAlerta : ""}`}
            >
              <span className={s.kpiRotulo}>Riscos sem tratamento</span>
              <span className={s.kpiValor}><Valor v={k?.semTratamento} /></span>
              <div className={s.barra} aria-hidden="true">
                <div style={{ width: `${pctTratamento ?? 0}%`, background: "var(--accent)" }} />
              </div>
              <span className={s.kpiNota}>
                {k
                  ? `${pctTratamento ?? 100}% dos críticos e altos com tratamento (política)`
                  : " "}
              </span>
            </Link>
          </section>

          <GraficosInicio
            categorias={dados?.categorias || []}
            niveis={dados?.niveis || []}
            trimestres={dados?.trimestres}
            totalAtivos={k?.ativos || 0}
          />

          <section className={s.meio}>
            <div className={`${s.painel} ${s.painelMatriz}`}>
              <div className={s.painelTopo}>
                <h2>Matriz de Riscos</h2>
                <span>riscos ativos por célula</span>
              </div>
              <div className={s.matriz}>
                <span className={s.eixoY}>Probabilidade</span>
                <div>
                  <div className={s.gradeComEixos} role="table" aria-label="Riscos ativos por probabilidade e impacto">
                    {[5, 4, 3, 2, 1].map((p) => (
                      <div key={p} role="row" className={s.linhaMatriz}>
                        <div role="rowheader" className={s.rotuloLinha} title={ROTULOS_ESCALA_5[p - 1]}>{p}</div>
                        {[1, 2, 3, 4, 5].map((i) => {
                          const nivel = MATRIZ_5X5[p - 1][i - 1];
                          const n = contagem.get(`${p}-${i}`) || 0;
                          return (
                            <div
                              key={`${p}-${i}`}
                              role="cell"
                              className={`${s.celula} ${NIVEL_CLASSE[nivel]}`}
                              title={`Probabilidade ${p} × Impacto ${i} = ${p * i} (${NIVEL_NOMES[nivel]}): ${n} risco(s)`}
                            >
                              {n > 0 ? n : ""}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div role="row" className={s.linhaMatriz}>
                      <div aria-hidden="true" />
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} role="columnheader" className={s.rotuloColuna} title={ROTULOS_ESCALA_5[i - 1]}>{i}</div>
                      ))}
                    </div>
                  </div>
                  <div className={s.eixoX}>Impacto</div>
                </div>
              </div>
              <div className={s.legenda}>
                {FAIXAS_NIVEL_RISCO.map((f) => (
                  <span key={f.nivel}>
                    <i className={NIVEL_CLASSE[f.nivel]} aria-hidden="true" />
                    {f.rotulo} ({f.min}–{f.max})
                  </span>
                ))}
              </div>
            </div>

            <div className={`${s.painel} ${s.painelAtencao}`}>
              <div className={s.painelTopo}>
                <h2>Riscos Críticos e Altos</h2>
                <Link href={`${BASE}/riscos`} className={s.verTodos}>Ver todos</Link>
              </div>
              {dados && dados.atencao.length === 0 && (
                <p className="text-muted" style={{ margin: 0 }}>Nenhum risco crítico ou alto ativo no momento.</p>
              )}
              {!dados && !erro && <p className="text-muted" style={{ margin: 0 }}>Carregando...</p>}
              <ul className={s.lista}>
                {(dados?.atencao || []).map((r) => {
                  const sit = situacaoInicio(r, hojeSaoPaulo());
                  return (
                    <li key={r.id}>
                      <Link href={`${BASE}/riscos/${r.id}`} className={s.item}>
                        <span className={s.itemId}>#{r.id}</span>
                        <span className={s.itemTexto}>
                          <span className={s.itemTitulo}>{r.titulo || r.gatilho || r.categoria || "Risco sem descrição"}</span>
                          {(r.titulo || r.gatilho) && r.categoria && <span className={s.itemSub}>{r.categoria}</span>}
                        </span>
                        {r.impacto_qualitativo && (
                          <span className={`badge ${BADGE_POR_NIVEL[r.impacto_qualitativo] || ""}`}>
                            {r.impacto_qualitativo}
                          </span>
                        )}
                        {sit.alerta ? (
                          <span className={s.itemAlerta} title={TITULO_ALERTA[sit.tipo]}>
                            <span aria-hidden="true">!</span> {sit.texto}
                          </span>
                        ) : (
                          <span className={s.itemPrazo}>{sit.texto}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

        </div>
      </section>
      <Footer />
    </>
  );
}
