"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { pieSlices, linePath, areaPath } from "@/lib/chartHelpers";

type Kpis = {
  total: number;
  urgentes_total: number;
  urgentes_finalizados: number;
  em_aberto: number;
  sla_vencido: number;
  resolvidos: number;
  cadastrados_periodo_atual: number;
  cadastrados_periodo_anterior: number;
  demandas_em_aberto: number;
  demandas_atendidas: number;
};

type ServicoMaisSolicitado = {
  servico: string;
  tipo: string | null;
  urgencia: string | null;
  total: number;
  tem_global: boolean;
} | null;

type PainelStatus = { status: string; total: number };
type PainelServico = { servico: string; total: number };
type PainelFornecedor = { fornecedor: string; total: number };
type PainelSla = { dentro_prazo: number; fora_prazo?: number; vencido?: number };

type Painel = {
  porStatus: PainelStatus[];
  porServico: PainelServico[];
  porFornecedor: PainelFornecedor[];
  sla: PainelSla;
};

type AtividadeDia = { dia: string; abertos: number; encerrados: number };
type TotalPorTipo = { tipo: string; total: number };
type Recente = { id: number; titulo: string; status: string; urgencia: string | null; aberto_por_nome: string; criado_em: string };

type DashboardData = {
  kpis: Kpis;
  servicoMaisSolicitado: ServicoMaisSolicitado;
  finalizados: Painel;
  andamento: Painel;
  atividadeMensal: AtividadeDia[];
  porTipoMensal: TotalPorTipo[];
  recentes: Recente[];
};

const CORES_TIPO: Record<string, string> = {
  "Problema": "var(--danger)",
  "Demanda": "var(--accent)",
};

function mesAtualRotulo(): string {
  const texto = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const CORES_STATUS: Record<string, string> = {
  "Novo": "var(--accent)",
  "Em andamento": "var(--warning)",
  "Aguardando fornecedor": "var(--warning)",
  "Paralisado": "var(--danger)",
  "Resolvido": "var(--success)",
  "Reaberto": "var(--danger)",
  "Cancelado": "#9db4c4",
};

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function diaDoMes(dia: string): number {
  return Number(dia.slice(8, 10));
}

// --- Gráfico de pizza (fatias preenchidas, sem furo), com legenda ao
// lado, rotulada. ---
function GraficoPizza({
  titulo,
  dados,
}: {
  titulo: string;
  dados: { label: string; value: number; color: string }[];
}) {
  const fatias = pieSlices(dados, 100, 100, 90);
  return (
    <div className="dash-panel">
      <div className="dash-panel-header">{titulo}</div>
      <div className="dash-panel-body">
        {fatias.length === 0 ? (
          <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Sem dados suficientes.</p>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <svg
              viewBox="0 0 200 200"
              width="100%"
              style={{ maxWidth: "110px", flex: "0 0 auto", display: "block" }}
              role="img"
              aria-label={titulo}
            >
              {fatias.map((d) => (
                <path key={d.label} d={d.path} fill={d.color} stroke="var(--surface)" strokeWidth="1.5" />
              ))}
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {fatias.map((d) => (
                <span key={d.label} style={{ fontSize: "0.72rem", color: "var(--text)" }}>
                  <span className="legend-dot" style={{ background: d.color }} />
                  {d.label} — {d.value} ({d.pct}%)
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Gráfico de barra horizontal genérico, com rótulo e valor por linha. ---
function GraficoBarraHorizontal({
  titulo,
  dados,
}: {
  titulo: string;
  dados: { label: string; total: number }[];
}) {
  const max = Math.max(1, ...dados.map((d) => d.total));
  return (
    <div className="dash-panel">
      <div className="dash-panel-header">{titulo}</div>
      <div className="dash-panel-body">
        {dados.length === 0 ? (
          <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Sem dados suficientes.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {dados.map((d) => (
              <div key={d.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", marginBottom: "0.2rem" }}>
                  <span>{d.label}</span>
                  <span className="text-muted">{d.total}</span>
                </div>
                <div style={{ background: "var(--border)", borderRadius: "3px", height: "8px" }}>
                  <div style={{ width: `${(d.total / max) * 100}%`, background: "var(--accent)", height: "100%", borderRadius: "3px" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Linha com grade ao fundo: chamados abertos (vermelho) x encerrados
// (verde) ao longo do mês corrente. ---
function GraficoAtividadeMensal({ dados }: { dados: AtividadeDia[] }) {
  const w = 1000;
  const h = 220;
  const padTop = 22;
  const padBottom = 56;
  const max = Math.max(1, ...dados.flatMap((d) => [d.abertos, d.encerrados]));
  const abertosValores = dados.map((d) => d.abertos);
  const encerradosValores = dados.map((d) => d.encerrados);
  const linhasGrade = 4;
  const passoRotulo = Math.max(1, Math.ceil(dados.length / 15));

  function pontoXY(valores: number[], i: number) {
    const x = dados.length > 1 ? (i / (dados.length - 1)) * w : w / 2;
    const y = h - (valores[i] / max) * h;
    return { x, y };
  }

  return (
    <div className="dash-panel">
      <div className="dash-panel-header">Atividade do Mês — Abertos x Encerrados</div>
      <div className="dash-panel-body">
        {dados.length === 0 ? (
          <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Sem dados suficientes.</p>
        ) : (
          <>
            <svg viewBox={`0 0 ${w} ${padTop + h + padBottom}`} width="100%" role="img" aria-label="Chamados abertos e encerrados ao longo do mês">
              <g transform={`translate(0 ${padTop})`}>
                {Array.from({ length: linhasGrade + 1 }).map((_, i) => {
                  const y = (i / linhasGrade) * h;
                  return <line key={i} x1={0} y1={y} x2={w} y2={y} stroke="var(--border)" strokeWidth="1" />;
                })}
                <path d={areaPath(abertosValores, w, h, max)} fill="var(--danger)" opacity="0.1" />
                <path d={linePath(abertosValores, w, h, max)} fill="none" stroke="var(--danger)" strokeWidth="2" />
                <path d={areaPath(encerradosValores, w, h, max)} fill="var(--success)" opacity="0.1" />
                <path d={linePath(encerradosValores, w, h, max)} fill="none" stroke="var(--success)" strokeWidth="2" />

                {/* Cada número fica no próprio vértice da linha, deslocado
                    pra fora da área preenchida — acima do ponto, pra
                    abertos; abaixo, pra encerrados. */}
                {dados.map((d, i) => {
                  if (d.abertos === 0) return null;
                  const { x, y } = pontoXY(abertosValores, i);
                  return (
                    <text key={`a-${d.dia}`} x={x} y={y - 8} fontSize="10" fill="var(--danger)" textAnchor="middle" fontWeight="700">
                      {d.abertos}
                    </text>
                  );
                })}
                {dados.map((d, i) => {
                  if (d.encerrados === 0) return null;
                  const { x, y } = pontoXY(encerradosValores, i);
                  return (
                    <text key={`e-${d.dia}`} x={x} y={y + 18} fontSize="10" fill="var(--success)" textAnchor="middle" fontWeight="700">
                      {d.encerrados}
                    </text>
                  );
                })}
              </g>

              {dados.map((d, i) => {
                const ultimo = i === dados.length - 1;
                if (i % passoRotulo !== 0 && !ultimo) return null;
                const x = dados.length > 1 ? (i / (dados.length - 1)) * w : w / 2;
                return (
                  <text key={d.dia} x={x} y={padTop + h + 40} fontSize="9" fill="var(--text-muted)" textAnchor="middle">
                    {diaDoMes(d.dia)}
                  </text>
                );
              })}
            </svg>
            <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.5rem", fontSize: "0.76rem" }}>
              <span><span className="legend-dot" style={{ background: "var(--danger)" }} /> Abertos</span>
              <span><span className="legend-dot" style={{ background: "var(--success)" }} /> Encerrados</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Bolhas: eixo X é o mês, eixo Y é a quantidade (com grade cinza-clara
// ao fundo) — uma bolha para o total de Problemas e outra para o total de
// Demandas no mês corrente. O tamanho da bolha reforça a quantidade. ---
function GraficoBolhas({ dados }: { dados: TotalPorTipo[] }) {
  const w = 640;
  const h = 80;
  const padTop = 26;
  const padBottom = 22;
  const padLeft = 32;
  const linhasGrade = 4;

  const totalProblema = dados.find((d) => d.tipo === "Problema")?.total ?? 0;
  const totalDemanda = dados.find((d) => d.tipo === "Demanda")?.total ?? 0;
  const maxValor = Math.max(1, totalProblema, totalDemanda);

  function r(total: number) {
    const rMin = 8;
    const rMax = 20;
    return total === 0 ? 0 : rMin + Math.sqrt(total / maxValor) * (rMax - rMin);
  }

  function y(total: number) {
    return padTop + h - (total / maxValor) * h;
  }

  const bolhas = [
    { tipo: "Problema", total: totalProblema, cx: padLeft + (w - padLeft) * 0.35 },
    { tipo: "Demanda", total: totalDemanda, cx: padLeft + (w - padLeft) * 0.65 },
  ];

  const semDados = totalProblema === 0 && totalDemanda === 0;

  return (
    <div className="dash-panel">
      <div className="dash-panel-header">Problemas x Demandas — {mesAtualRotulo()}</div>
      <div className="dash-panel-body">
        {semDados ? (
          <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Sem dados suficientes.</p>
        ) : (
          <>
            <svg viewBox={`0 0 ${w} ${padTop + h + padBottom}`} width="100%" role="img" aria-label="Total de chamados do tipo Problema e do tipo Demanda no mês corrente, por quantidade">
              {Array.from({ length: linhasGrade + 1 }).map((_, i) => {
                const gy = padTop + (i / linhasGrade) * h;
                const valor = Math.round(maxValor - (i / linhasGrade) * maxValor);
                return (
                  <g key={i}>
                    <line x1={padLeft} y1={gy} x2={w} y2={gy} stroke="var(--border)" strokeWidth="1" />
                    <text x={padLeft - 6} y={gy} fontSize="9" fill="var(--text-muted)" textAnchor="end" dominantBaseline="middle">
                      {valor}
                    </text>
                  </g>
                );
              })}
              <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + h} stroke="var(--border)" strokeWidth="1" />

              {bolhas.map((b) => (
                <g key={b.tipo}>
                  <circle cx={b.cx} cy={y(b.total)} r={r(b.total)} fill={CORES_TIPO[b.tipo]} opacity="0.85" />
                  <text x={b.cx} y={y(b.total)} fontSize="9" fill="#fff" fontWeight="700" textAnchor="middle" dominantBaseline="middle">
                    {b.total}
                  </text>
                </g>
              ))}

              <text x={padLeft + (w - padLeft) / 2} y={padTop + h + padBottom - 4} fontSize="10" fill="var(--text)" fontWeight="600" textAnchor="middle">
                {mesAtualRotulo()}
              </text>
            </svg>
            <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.5rem", fontSize: "0.76rem", justifyContent: "center" }}>
              <span><span className="legend-dot" style={{ background: "var(--danger)" }} /> Problema</span>
              <span><span className="legend-dot" style={{ background: "var(--accent)" }} /> Demanda</span>
              <span className="text-muted">tamanho = quantidade no mês</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Painel agrupado (Finalizados / Em andamento): status, serviço,
// fornecedor, SLA e a linha de atividade, todos rotulados. ---
function PainelChamados({
  titulo,
  painel,
  slaLabels,
}: {
  titulo: string;
  painel: Painel;
  slaLabels: { ok: string; nok: string };
}) {
  const statusDados = painel.porStatus.map((s) => ({
    label: s.status,
    value: s.total,
    color: CORES_STATUS[s.status] || "#9db4c4",
  }));
  const slaOk = painel.sla.dentro_prazo ?? 0;
  const slaNok = painel.sla.fora_prazo ?? painel.sla.vencido ?? 0;
  const slaDados = [
    { label: slaLabels.ok, value: slaOk, color: "var(--success)" },
    { label: slaLabels.nok, value: slaNok, color: "var(--danger)" },
  ];
  const servicoDados = painel.porServico.map((s) => ({ label: s.servico, total: s.total }));
  const fornecedorDados = painel.porFornecedor.map((f) => ({ label: f.fornecedor, total: f.total }));

  return (
    <div className="dash-group-panel">
      <div className="dash-group-panel-header">{titulo}</div>
      <div className="dash-group-panel-body">
        <div className="dash-group-charts-grid">
          <GraficoPizza titulo="Por Status" dados={statusDados} />
          <GraficoPizza titulo="SLA" dados={slaDados} />
          <GraficoBarraHorizontal titulo="Por Serviço" dados={servicoDados} />
          <GraficoBarraHorizontal titulo="Por Fornecedor" dados={fornecedorDados} />
        </div>
      </div>
    </div>
  );
}

export default function CondominioDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/condominio-dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar o dashboard."))
      .finally(() => setCarregando(false));
  }, []);

  const kpis = data?.kpis;

  const tendenciaAtual = kpis?.cadastrados_periodo_atual ?? 0;
  const tendenciaAnterior = kpis?.cadastrados_periodo_anterior ?? 0;
  const tendenciaPct = tendenciaAnterior > 0 ? Math.round(((tendenciaAtual - tendenciaAnterior) / tendenciaAnterior) * 100) : null;
  const tendenciaDirecao = tendenciaAtual === tendenciaAnterior ? "igual" : tendenciaAtual > tendenciaAnterior ? "alta" : "baixa";

  const servico = data?.servicoMaisSolicitado;

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Condomínio</span>
          <h1>Dashboard</h1>
          <p className="lede">Visão executiva dos chamados do condomínio.</p>

          {carregando && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}

          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar o dashboard.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {!carregando && !erro && kpis && data && (
            <div className="dashboard">
              <div className="kpi-grid-9">
                <div className="kpi-card kpi-card-square">
                  <div className="kpi-card-header">Chamados Cadastrados</div>
                  <div className="kpi-card-value">{kpis.total}</div>
                  <div className="kpi-card-trend">
                    {tendenciaPct === null ? (
                      <span className="text-muted">sem comparativo</span>
                    ) : (
                      <span className={`kpi-trend kpi-trend-${tendenciaDirecao}`}>
                        {tendenciaDirecao === "alta" ? "▲" : tendenciaDirecao === "baixa" ? "▼" : "►"} {Math.abs(tendenciaPct)}% (30 dias)
                      </span>
                    )}
                  </div>
                </div>
                <div className="kpi-card kpi-card-square">
                  <div className="kpi-card-header" style={{ background: "var(--danger)" }}>Chamados Urgentes Cadastrados</div>
                  <div className="kpi-card-value">{kpis.urgentes_total}</div>
                </div>
                <div className="kpi-card kpi-card-square">
                  <div className="kpi-card-header" style={{ background: "var(--success)" }}>Chamados Urgentes Finalizados</div>
                  <div className="kpi-card-value">{kpis.urgentes_finalizados}</div>
                </div>
                <div className="kpi-card kpi-card-square">
                  <div className="kpi-card-header">Demandas em Aberto</div>
                  <div className="kpi-card-value">{kpis.demandas_em_aberto}</div>
                </div>
                <div className="kpi-card kpi-card-square">
                  <div className="kpi-card-header" style={{ background: "var(--success)" }}>Demandas Atendidas</div>
                  <div className="kpi-card-value">{kpis.demandas_atendidas}</div>
                </div>
                <div className="kpi-card kpi-card-square">
                  <div className="kpi-card-header">Em Aberto</div>
                  <div className="kpi-card-value">{kpis.em_aberto}</div>
                </div>
                <div className="kpi-card kpi-card-square">
                  <div className="kpi-card-header" style={{ background: "var(--danger)" }}>SLA Vencido</div>
                  <div className="kpi-card-value">{kpis.sla_vencido}</div>
                </div>
                <div className="kpi-card kpi-card-square">
                  <div className="kpi-card-header" style={{ background: "var(--success)" }}>Resolvidos</div>
                  <div className="kpi-card-value">{kpis.resolvidos}</div>
                </div>
                <div className="kpi-card kpi-card-square">
                  <div className="kpi-card-header">Serviço Mais Solicitado (30 dias)</div>
                  {servico ? (
                    <>
                      <div className="kpi-card-value kpi-card-value-texto">{servico.servico}</div>
                      <div className="kpi-card-trend text-muted">{servico.total} chamado{servico.total > 1 ? "s" : ""}</div>
                    </>
                  ) : (
                    <div className="kpi-card-value kpi-card-value-texto">
                      <span className="text-muted">Sem chamados no período</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="dash-dual-panel-row">
                <PainelChamados
                  titulo="Dashboard — Chamados Finalizados"
                  painel={data.finalizados}
                  slaLabels={{ ok: "Dentro do prazo", nok: "Fora do prazo" }}
                />
                <PainelChamados
                  titulo="Dashboard — Chamados em Andamento"
                  painel={data.andamento}
                  slaLabels={{ ok: "Dentro do prazo", nok: "Vencido" }}
                />
              </div>

              <div className="dash-row-charts" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <GraficoAtividadeMensal dados={data.atividadeMensal} />
                <GraficoBolhas dados={data.porTipoMensal} />
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">Chamados Recentes</div>
                <div className="dash-panel-body">
                  {(!data.recentes || data.recentes.length === 0) ? (
                    <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Nenhum chamado cadastrado ainda.</p>
                  ) : (
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Título</th>
                          <th>Status</th>
                          <th>Aberto por</th>
                          <th>Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentes.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <Link href={`/condominio/chamados/${r.id}`} style={{ color: "var(--accent)", fontWeight: 600 }}>
                                #{r.id}
                              </Link>
                            </td>
                            <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>{r.titulo}</td>
                            <td>{r.status}</td>
                            <td>{r.aberto_por_nome}</td>
                            <td>{formatDataHora(r.criado_em)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          <a
            href="/condominio"
            className="status-tag"
            style={{ marginTop: "2.5rem", display: "inline-block" }}
          >
            ← Voltar para Gestão de Condomínio
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
