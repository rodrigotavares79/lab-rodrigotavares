"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import GraficoLinhas from "@/components/riscos/GraficoLinhas";
import { MiniGrafico } from "@/components/riscos/KriVisual";
import { MATRIZ_5X5, FAIXAS_NIVEL_RISCO, ROTULOS_ESCALA_5 } from "@/lib/metodologiaRisco";
import { altosOuCriticos, conformidadeTratamento, rotuloMes, serie, type FotoIndicadores } from "@/lib/fotosIndicadores";
import { ROTULO_PRIORIDADE, type Recomendacao } from "@/lib/recomendacoesRisco";
import { fmt, textoLimites, type FaixaKri } from "@/lib/kriRisco";
import { moeda, textoFrequencia } from "@/lib/exposicaoRisco";

// B26 · Relatório Executivo completo, pronto para imprimir ou salvar em PDF:
// resumo, recomendações priorizadas, matriz, tendências de 12 meses, riscos
// acima do apetite e da tolerância, KRIs em alerta, riscos críticos e altos e
// situação dos planos. Sem projetoId, o portfólio consolidado. A data de
// referência é a posição do dia da emissão e vai no nome do PDF.

type RiscoLinha = {
  id: number;
  categoria: string | null;
  gatilho: string | null;
  titulo?: string | null;
  impacto_qualitativo: string;
  status: string;
  tem_plano_aberto?: boolean;
};

type RiscoApetite = RiscoLinha & {
  situacao: "acima_tolerancia" | "acima_apetite";
  apetite: string | null;
  tolerancia: string | null;
  dono_nome: string | null;
};

type KriAlerta = {
  codigo: string;
  nome: string;
  unidade: string;
  risco_id: number;
  ultimo_valor: number;
  ultima_referencia: string;
  ultima_faixa: FaixaKri;
  direcao: string;
  limite_amarelo: number;
  limite_vermelho: number;
  historico: { referencia: string; valor: number; faixa: FaixaKri }[];
};

type PlanoLinha = {
  id: number;
  titulo: string;
  status: string;
  auditoria_status: string | null;
  risco_id: number;
  total_acoes: number;
  acoes_concluidas: number;
  acoes_atrasadas: number;
  proximo_prazo: string | null;
};

type RelatorioData = {
  projeto: string;
  consolidado: boolean;
  dataReferencia: string;
  kpis: {
    total: number;
    ativos: number;
    mitigados: number;
    criticos_abertos: number;
    altos_abertos: number;
    acimaTolerancia: number;
    krisVermelho: number;
    conformidade: number | null;
    acoesAtrasadas: number;
    revisoesVencidas: number;
  };
  matriz: { prob: number; imp: number; total: number }[];
  mitigacao: { melhorou: number; manteve: number; piorou: number };
  tendencias: { meses: string[]; fotos: { referencia: string; dados: FotoIndicadores }[] };
  apetite: { versao: number | null; acimaTolerancia: number; acimaApetite: number; riscos: RiscoApetite[] };
  kris: { total: number; semMedicao: number; alerta: KriAlerta[] };
  riscosAbertos: RiscoLinha[];
  planosResumo: {
    total: number;
    concluidos: number;
    abertos: number;
    acoesVencidas: number;
    aguardandoAuditoria: number;
    acoesTotal: number;
    acoesConcluidas: number;
  };
  planos: PlanoLinha[];
  recomendacoes: Recomendacao[];
  exposicao?: {
    total: number;
    totalMin: number;
    totalMax: number;
    comEstimativa: number;
    ativos: number;
    ranking: (RiscoLinha & {
      exposicao_ale: string;
      exposicao_min: string;
      exposicao_max: string;
      freq_anual_provavel: string;
      perda_evento_provavel: string;
      perda_origem: string | null;
    })[];
  };
};

const BADGE_POR_NIVEL: Record<string, string> = {
  Baixo: "badge-baixo",
  "Médio": "badge-medio",
  Alto: "badge-alto",
  "Crítico": "badge-critico",
};

const COR_NIVEL: Record<number, { fundo: string; texto: string }> = {
  1: { fundo: "#d7ebdd", texto: "#24593a" },
  2: { fundo: "#f6e7b0", texto: "#6b5000" },
  3: { fundo: "#f3c79a", texto: "#7a3a07" },
  4: { fundo: "#e7a3a3", texto: "#6e1423" },
};

const COR_PRIORIDADE: Record<number, string> = { 1: "var(--danger)", 2: "var(--warning-text)", 3: "var(--text-muted)" };

// Paleta validada das tendências (B22).
const C1 = "#257de0";
const C2 = "#f47230";
const C3 = "#00b894";

function classeStatusTexto(status: string): string {
  if (status === "Mitigado") return "report-status-mitigado";
  if (status === "Identificado") return "report-status-identificado";
  return "report-status-tratamento";
}

function dataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

function nomeRisco(r: { titulo?: string | null; gatilho: string | null }) {
  return r.titulo || r.gatilho || "—";
}

function Matriz({ celulas }: { celulas: RelatorioData["matriz"] }) {
  const contagem = new Map(celulas.map((c) => [`${c.prob}-${c.imp}`, c.total]));
  const cel = { width: "2.6rem", height: "2.1rem", display: "flex", alignItems: "center", justifyContent: "center" } as const;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: "0.72rem", color: "var(--text-muted)" }}>Probabilidade</span>
      <div>
        <div role="table" aria-label="Riscos ativos por probabilidade e impacto (nível atual)" style={{ display: "grid", gap: 3 }}>
          {[5, 4, 3, 2, 1].map((p) => (
            <div role="row" key={p} style={{ display: "flex", gap: 3 }}>
              <div role="rowheader" title={ROTULOS_ESCALA_5[p - 1]} style={{ ...cel, width: "1.4rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>{p}</div>
              {[1, 2, 3, 4, 5].map((i) => {
                const nivel = MATRIZ_5X5[p - 1][i - 1];
                const n = contagem.get(`${p}-${i}`) || 0;
                return (
                  <div
                    role="cell"
                    key={i}
                    className="report-cor"
                    style={{ ...cel, background: COR_NIVEL[nivel].fundo, color: COR_NIVEL[nivel].texto, fontWeight: 700, borderRadius: 4 }}
                  >
                    {n || ""}
                  </div>
                );
              })}
            </div>
          ))}
          <div role="row" style={{ display: "flex", gap: 3 }}>
            <div style={{ ...cel, width: "1.4rem" }} aria-hidden="true" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div role="columnheader" key={i} title={ROTULOS_ESCALA_5[i - 1]} style={{ ...cel, height: "1.2rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>{i}</div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)" }}>Impacto</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "0.4rem", fontSize: "0.72rem" }}>
          {FAIXAS_NIVEL_RISCO.map((f) => (
            <span key={f.nivel} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <i className="report-cor" style={{ width: 10, height: 10, borderRadius: 2, background: COR_NIVEL[f.nivel].fundo, display: "inline-block" }} />
              {f.rotulo} ({f.min}–{f.max})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function RelatorioConteudo() {
  const searchParams = useSearchParams();
  const projetoId = searchParams.get("projetoId");

  const [dados, setDados] = useState<RelatorioData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [emitidoEm] = useState(() => new Date());

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    fetch(projetoId ? `/api/relatorio?projetoId=${projetoId}` : "/api/relatorio")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDados(d);
        // O título vira o nome sugerido do PDF: projeto + data de referência.
        document.title = `Relatório executivo de riscos - ${d.projeto} - ${d.dataReferencia}`;
      })
      .catch((e) => setErro(e.message || "Erro ao carregar o relatório."))
      .finally(() => setCarregando(false));
  }, [projetoId]);

  const s = (fn: (f: FotoIndicadores) => number | null) =>
    dados ? serie(dados.tendencias.meses, dados.tendencias.fotos, (f) => fn(f) as number).map((v) => (v === undefined ? null : v)) : [];
  const temTendencia = !!dados && dados.tendencias.fotos.length > 0;

  return (
    <>
      <div className="report-toolbar">
        <button className="btn-primary" onClick={() => window.print()}>
          🖶 Imprimir / Salvar como PDF
        </button>
        <a href="/seguranca/gestao-de-riscos/relatorio-executivo" className="status-tag" style={{ marginTop: 0 }}>
          ← Escolher outro projeto
        </a>
      </div>

      {carregando && <p className="text-muted" style={{ textAlign: "center", marginTop: "3rem" }}>Carregando relatório...</p>}

      {erro && (
        <div className="error-banner" style={{ maxWidth: "34rem", margin: "3rem auto" }}>
          <span className="success-icon error-icon">!</span>
          <span className="success-text">{erro}</span>
        </div>
      )}

      {!carregando && !erro && dados && (
        <div className="report-page">
          <div className="report-header">
            <div>
              <span className="report-brand">Rodrigo Tavares — Gestão de Riscos de TI</span>
              <h1>Relatório Executivo de Riscos</h1>
              <div className="report-subtitle">{dados.consolidado ? "Portfólio: todos os projetos" : `Projeto: ${dados.projeto}`}</div>
            </div>
            <div className="report-meta">
              <strong>Data de referência</strong>
              {dataBR(dados.dataReferencia)}
              <br />
              <strong style={{ marginTop: "0.4rem" }}>Emitido em</strong>
              {emitidoEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              <br />
              <strong style={{ marginTop: "0.4rem" }}>Apetite a risco</strong>
              {dados.apetite.versao ? `versão ${dados.apetite.versao}` : "não aprovado"}
            </div>
          </div>

          <div className="report-section">
            <h2>Resumo Executivo</h2>
            <div className="report-kpi-row" style={{ flexWrap: "wrap" }}>
              <div className="report-kpi-box">
                <div className="report-kpi-label">Riscos Ativos</div>
                <div className="report-kpi-value">{dados.kpis.ativos}</div>
              </div>
              <div className={`report-kpi-box ${dados.kpis.criticos_abertos + dados.kpis.altos_abertos > 0 ? "report-alert" : ""}`}>
                <div className="report-kpi-label">Críticos e Altos</div>
                <div className="report-kpi-value">{dados.kpis.criticos_abertos + dados.kpis.altos_abertos}</div>
              </div>
              <div className={`report-kpi-box ${dados.kpis.acimaTolerancia > 0 ? "report-alert" : "report-ok"}`}>
                <div className="report-kpi-label">Acima da Tolerância</div>
                <div className="report-kpi-value">{dados.kpis.acimaTolerancia}</div>
              </div>
              <div className={`report-kpi-box ${dados.kpis.krisVermelho > 0 ? "report-alert" : "report-ok"}`}>
                <div className="report-kpi-label">KRIs no Vermelho</div>
                <div className="report-kpi-value">{dados.kpis.krisVermelho}</div>
              </div>
              <div className="report-kpi-box">
                <div className="report-kpi-label">Alto/Crítico com Tratamento</div>
                <div className="report-kpi-value">{dados.kpis.conformidade === null ? "—" : `${dados.kpis.conformidade}%`}</div>
              </div>
              {dados.exposicao && dados.exposicao.comEstimativa > 0 && (
                <div className="report-kpi-box">
                  <div className="report-kpi-label">Perda Anual Esperada</div>
                  <div className="report-kpi-value" style={{ fontSize: "1.35rem" }}>{moeda(dados.exposicao.total, true)}</div>
                </div>
              )}
              <div className={`report-kpi-box ${dados.kpis.acoesAtrasadas > 0 ? "report-alert" : "report-ok"}`}>
                <div className="report-kpi-label">Ações Atrasadas</div>
                <div className="report-kpi-value">{dados.kpis.acoesAtrasadas}</div>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h2>Recomendações Priorizadas</h2>
            {dados.recomendacoes.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>Nenhuma ação pendente: o portfólio está dentro do apetite e em dia.</p>
            ) : (
              <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "grid", gap: "0.55rem" }}>
                {dados.recomendacoes.map((r, i) => (
                  <li key={i} style={{ fontSize: "0.88rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: COR_PRIORIDADE[r.prioridade], marginRight: "0.4rem" }}>
                      {ROTULO_PRIORIDADE[r.prioridade]}
                    </span>
                    <strong>{r.titulo}</strong>
                    {r.riscos.length > 0 && (
                      <span className="text-muted"> ({r.riscos.slice(0, 8).map((id) => `#${id}`).join(", ")}{r.riscos.length > 8 ? ` e mais ${r.riscos.length - 8}` : ""})</span>
                    )}
                    <div className="text-muted" style={{ fontSize: "0.8rem" }}>{r.porque}</div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="report-section">
            <h2>Matriz de Riscos e Efeito dos Controles</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", alignItems: "flex-start" }}>
              <Matriz celulas={dados.matriz} />
              <div style={{ flex: "1 1 14rem" }}>
                <p className="text-muted" style={{ fontSize: "0.82rem", margin: "0 0 0.5rem" }}>
                  Riscos ativos pela posição atual (após os controles existentes). Desde o cadastro:
                </p>
                <div className="report-mitig-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.35rem" }}>
                  <span><span className="report-dot report-cor" style={{ background: "var(--success)" }} /><strong>{dados.mitigacao.melhorou}</strong> melhoraram de nível</span>
                  <span><span className="report-dot report-cor" style={{ background: "var(--text-muted)" }} /><strong>{dados.mitigacao.manteve}</strong> sem mudança</span>
                  <span><span className="report-dot report-cor" style={{ background: "var(--danger)" }} /><strong>{dados.mitigacao.piorou}</strong> pioraram de nível</span>
                </div>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h2>Tendências (12 meses)</h2>
            {!temTendencia ? (
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>Ainda não há fotos mensais dos indicadores.</p>
            ) : (
              <div className="report-grade-graficos">
                <GraficoLinhas
                  titulo="Riscos Alto ou Crítico"
                  meses={dados.tendencias.meses.map(rotuloMes)}
                  series={[
                    { nome: "Inerente", cor: C1, valores: s((f) => altosOuCriticos(f.inerente)) },
                    { nome: "Atual", cor: C2, valores: s((f) => altosOuCriticos(f.atual)) },
                    { nome: "Projetado", cor: C3, valores: s((f) => altosOuCriticos(f.projetado)), tracejada: true },
                  ]}
                />
                <GraficoLinhas
                  titulo="Alto/Crítico com tratamento (política)"
                  meses={dados.tendencias.meses.map(rotuloMes)}
                  sufixo="%"
                  maximo={100}
                  series={[{ nome: "Conformidade", cor: C1, valores: s((f) => conformidadeTratamento(f)) }]}
                />
              </div>
            )}
          </div>

          {dados.exposicao && (
            <div className="report-section">
              <h2>Exposição Financeira (Perda Anual Esperada)</h2>
              {dados.exposicao.comEstimativa === 0 ? (
                <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>Nenhum risco ativo com estimativa de frequência e perda.</p>
              ) : (
                <>
                  <p className="text-muted" style={{ fontSize: "0.82rem", margin: "0 0 0.5rem" }}>
                    {dados.exposicao.comEstimativa} de {dados.exposicao.ativos} riscos ativos estimados. Exposição somada:{" "}
                    <strong>{moeda(dados.exposicao.total)}</strong> por ano (faixa de {moeda(dados.exposicao.totalMin)} a {moeda(dados.exposicao.totalMax)}).
                    Frequência anual × perda por evento, com média PERT das faixas.
                  </p>
                  <table className="report-table">
                    <thead>
                      <tr><th>#</th><th>Risco</th><th>Nível</th><th>Frequência</th><th>Perda por evento</th><th>Perda anual esperada</th><th>Plano</th></tr>
                    </thead>
                    <tbody>
                      {dados.exposicao.ranking.map((r, i) => (
                        <tr key={r.id}>
                          <td>{i + 1}º</td>
                          <td><strong>#{r.id}</strong> {nomeRisco(r)}</td>
                          <td><span className={`badge ${BADGE_POR_NIVEL[r.impacto_qualitativo] || ""}`}>{r.impacto_qualitativo}</span></td>
                          <td style={{ fontSize: "0.78rem" }}>{textoFrequencia(Number(r.freq_anual_provavel))}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {moeda(r.perda_evento_provavel)}
                            {r.perda_origem === "ativo" && <div className="text-muted" style={{ fontSize: "0.7rem" }}>custo do ativo</div>}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <strong>{moeda(r.exposicao_ale)}</strong>
                            <div className="text-muted" style={{ fontSize: "0.7rem" }}>{moeda(r.exposicao_min, true)} a {moeda(r.exposicao_max, true)}</div>
                          </td>
                          <td>{r.status === "Aceito" ? "Aceito" : r.tem_plano_aberto ? "Em andamento" : <span style={{ color: "var(--danger)", fontWeight: 600 }}>Sem plano</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          <div className="report-section">
            <h2>Riscos Acima do Apetite e da Tolerância</h2>
            <p className="text-muted" style={{ fontSize: "0.82rem", margin: "0 0 0.5rem" }}>
              {dados.apetite.versao
                ? `Nível atual comparado aos limites da categoria (versão ${dados.apetite.versao}): ${dados.apetite.acimaTolerancia} acima da tolerância e ${dados.apetite.acimaApetite} acima do apetite.`
                : "O apetite e a tolerância a risco ainda não foram aprovados."}
            </p>
            {dados.apetite.riscos.length > 0 && (
              <table className="report-table">
                <thead>
                  <tr><th>ID</th><th>Categoria</th><th>Risco</th><th>Nível</th><th>Limite (apetite / tolerância)</th><th>Situação</th><th>Plano</th></tr>
                </thead>
                <tbody>
                  {dados.apetite.riscos.map((r) => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{r.categoria || "—"}</td>
                      <td>{nomeRisco(r)}</td>
                      <td><span className={`badge ${BADGE_POR_NIVEL[r.impacto_qualitativo] || ""}`}>{r.impacto_qualitativo}</span></td>
                      <td>{r.apetite} / {r.tolerancia}</td>
                      <td style={{ fontWeight: 600, color: r.situacao === "acima_tolerancia" ? "var(--danger)" : "var(--warning-text)" }}>
                        {r.situacao === "acima_tolerancia" ? "▲▲ Acima da tolerância" : "▲ Acima do apetite"}
                      </td>
                      <td>{r.status === "Aceito" ? "Aceito" : r.tem_plano_aberto ? "Em andamento" : <span style={{ color: "var(--danger)", fontWeight: 600 }}>Sem plano</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="report-section">
            <h2>Indicadores-Chave de Risco (KRIs) em Alerta</h2>
            <p className="text-muted" style={{ fontSize: "0.82rem", margin: "0 0 0.5rem" }}>
              {dados.kris.total} KRI(s) ativos; {dados.kris.alerta.length} no amarelo ou vermelho
              {dados.kris.semMedicao ? `; ${dados.kris.semMedicao} sem medição no prazo` : ""}.
            </p>
            {dados.kris.alerta.length > 0 && (
              <table className="report-table">
                <thead>
                  <tr><th>KRI</th><th>Risco</th><th>Última medição</th><th>Limiares</th><th>Tendência</th></tr>
                </thead>
                <tbody>
                  {dados.kris.alerta.map((k) => (
                    <tr key={k.codigo}>
                      <td><strong>{k.codigo}</strong> · {k.nome}</td>
                      <td>#{k.risco_id}</td>
                      <td style={{ fontWeight: 600, color: k.ultima_faixa === "vermelho" ? "var(--danger)" : "var(--warning-text)", whiteSpace: "nowrap" }}>
                        {k.ultima_faixa === "vermelho" ? "▲▲" : "▲"} {fmt(k.ultimo_valor)} {k.unidade}
                        <div className="text-muted" style={{ fontWeight: 400, fontSize: "0.72rem" }}>{dataBR(k.ultima_referencia)}</div>
                      </td>
                      <td style={{ fontSize: "0.75rem" }}>{textoLimites(k)}</td>
                      <td className="report-cor"><MiniGrafico pontos={k.historico} largura={96} altura={24} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="report-section">
            <h2>Riscos Críticos e Altos em Aberto</h2>
            {dados.riscosAbertos.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>Nenhum risco Crítico ou Alto em aberto.</p>
            ) : (
              <table className="report-table">
                <thead>
                  <tr><th>ID</th><th>Categoria</th><th>Risco</th><th>Nível</th><th>Status</th><th>Plano</th></tr>
                </thead>
                <tbody>
                  {dados.riscosAbertos.map((r) => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{r.categoria || "—"}</td>
                      <td>{nomeRisco(r)}</td>
                      <td><span className={`badge ${BADGE_POR_NIVEL[r.impacto_qualitativo] || ""}`}>{r.impacto_qualitativo}</span></td>
                      <td className={classeStatusTexto(r.status)}>{r.status}</td>
                      <td>{r.status === "Aceito" ? "Aceito" : r.tem_plano_aberto ? "Em andamento" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="report-section">
            <h2>Situação dos Planos de Ação</h2>
            <div className="report-plan-summary">
              <div><strong>{dados.planosResumo.total}</strong>planos cadastrados</div>
              <div><strong>{dados.planosResumo.abertos}</strong>em aberto</div>
              <div><strong>{dados.planosResumo.aguardandoAuditoria}</strong>aguardando auditoria</div>
              <div><strong>{dados.planosResumo.concluidos}</strong>concluídos</div>
              <div><strong>{dados.planosResumo.acoesConcluidas}/{dados.planosResumo.acoesTotal}</strong>ações concluídas</div>
              <div><strong style={{ color: dados.planosResumo.acoesVencidas ? "var(--danger)" : undefined }}>{dados.planosResumo.acoesVencidas}</strong>ações com prazo vencido</div>
            </div>
            {dados.planos.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>Nenhum plano de ação cadastrado.</p>
            ) : (
              <table className="report-table">
                <thead>
                  <tr><th>Plano</th><th>Risco</th><th>Status</th><th>Auditoria</th><th>Ações</th><th>Atrasadas</th></tr>
                </thead>
                <tbody>
                  {dados.planos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.titulo}</td>
                      <td>#{p.risco_id}</td>
                      <td className={classeStatusTexto(p.status === "Concluído" ? "Mitigado" : "Em Tratamento")}>{p.status}</td>
                      <td style={{ color: p.auditoria_status === "Não conforme" ? "var(--danger)" : p.auditoria_status === "Conforme" ? "var(--success)" : undefined }}>
                        {p.auditoria_status || "—"}
                      </td>
                      <td>{p.acoes_concluidas} / {p.total_acoes}</td>
                      <td style={{ color: p.acoes_atrasadas ? "var(--danger)" : undefined, fontWeight: p.acoes_atrasadas ? 600 : undefined }}>
                        {p.acoes_atrasadas || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="report-footer">
            <span>Gerado pelo sistema de Gestão de Riscos — lab.rodrigotavares.com.br · posição de {dataBR(dados.dataReferencia)}</span>
            <span>Uso interno</span>
          </div>
        </div>
      )}
    </>
  );
}

export default function RelatorioExecutivo() {
  return (
    <Suspense fallback={<p className="text-muted" style={{ textAlign: "center", marginTop: "3rem" }}>Carregando...</p>}>
      <RelatorioConteudo />
    </Suspense>
  );
}
