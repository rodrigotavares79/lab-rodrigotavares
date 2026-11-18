"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { pieSlices, linePath, areaPath } from "@/lib/chartHelpers";
import r from "./relatorios.module.css";

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

type RelatoriosData = {
  kpis: Kpis;
  servicoMaisSolicitado: ServicoMaisSolicitado;
  finalizados: Painel;
  andamento: Painel;
  atividadeMensal: AtividadeDia[];
  porTipoMensal: TotalPorTipo[];
  recentes: Recente[];
  apenasMeusChamados?: boolean;
};

const CORES_TIPO: Record<string, string> = {
  "Problema": "var(--danger)",
  "Demanda": "var(--accent)",
};

function mesAtualRotulo(): string {
  const texto = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Cada status tem cor própria, para que nenhum par de fatias se confunda.
const CORES_STATUS: Record<string, string> = {
  "Novo": "var(--accent)",
  "Em andamento": "var(--warning)",
  "Aguardando fornecedor": "#7a5ea8",
  "Paralisado": "#5c6670",
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

function formatPct(pct: string | number): string {
  return Number(pct).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

function SemDados() {
  return <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Sem dados suficientes.</p>;
}

// --- Rosca com o total no centro e legenda em colunas alinhadas
// (cor · rótulo · quantidade · %). Em painel estreito, a legenda desce
// para baixo do gráfico em vez de espremer o texto ao lado. ---
function GraficoPizza({
  titulo,
  dados,
}: {
  titulo: string;
  dados: { label: string; value: number; color: string }[];
}) {
  const fatias = pieSlices(dados, 100, 100, 92);
  const total = dados.reduce((soma, d) => soma + d.value, 0);
  return (
    <div className="dash-panel">
      <div className="dash-panel-header">{titulo}</div>
      <div className={`dash-panel-body ${r.painelCorpo}`}>
        {fatias.length === 0 ? (
          <SemDados />
        ) : (
          <div className={r.pizza}>
            <svg viewBox="0 0 200 200" className={r.pizzaSvg} role="img" aria-label={`${titulo}: ${total} chamados`}>
              {fatias.map((d) => (
                <path key={d.label} d={d.path} fill={d.color} stroke="var(--surface)" strokeWidth="2" />
              ))}
              <circle cx="100" cy="100" r="54" fill="var(--surface)" />
              <text x="100" y="96" fontSize="34" fontWeight="700" fill="var(--text)" textAnchor="middle" dominantBaseline="middle">
                {total}
              </text>
              <text x="100" y="124" fontSize="14" fill="var(--text-muted)" textAnchor="middle">
                total
              </text>
            </svg>
            <ul className={r.legenda}>
              {fatias.map((d) => (
                <li key={d.label} className={r.legendaItem}>
                  <span className={r.legendaCor} style={{ background: d.color }} />
                  <span className={r.legendaRotulo}>{d.label}</span>
                  <span className={r.legendaValor}>{d.value}</span>
                  <span className={r.legendaPct}>{formatPct(d.pct)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Barra horizontal: rótulo à esquerda, quantidade em destaque à direita. ---
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
          <SemDados />
        ) : (
          <div className={r.barras}>
            {dados.map((d) => (
              <div key={d.label}>
                <div className={r.barraCabecalho}>
                  <span className={r.barraRotulo}>{d.label}</span>
                  <span className={r.barraValor}>{d.total}</span>
                </div>
                <div className={r.barraTrilho}>
                  <div className={r.barraPreenchimento} style={{ width: `${(d.total / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Linhas: chamados abertos (vermelho) x encerrados (verde) ao longo do
// mês corrente, com eixo de quantidade à esquerda e dias embaixo. ---
function GraficoAtividadeMensal({ dados }: { dados: AtividadeDia[] }) {
  const larguraTotal = 640;
  const padLeft = 30;
  const padRight = 8;
  const padTop = 16;
  const padBottom = 26;
  const w = larguraTotal - padLeft - padRight;
  const h = 170;
  const maxBruto = Math.max(1, ...dados.flatMap((d) => [d.abertos, d.encerrados]));
  const linhasGrade = 4;
  const max = Math.ceil(maxBruto / linhasGrade) * linhasGrade;
  const abertosValores = dados.map((d) => d.abertos);
  const encerradosValores = dados.map((d) => d.encerrados);
  const passoRotulo = Math.max(1, Math.ceil(dados.length / 10));
  const totalAbertos = abertosValores.reduce((a, b) => a + b, 0);
  const totalEncerrados = encerradosValores.reduce((a, b) => a + b, 0);

  function px(i: number) {
    return dados.length > 1 ? (i / (dados.length - 1)) * w : w / 2;
  }
  function py(v: number) {
    return h - (v / max) * h;
  }

  return (
    <div className="dash-panel">
      <div className="dash-panel-header">Atividade do Mês — Abertos x Encerrados</div>
      <div className="dash-panel-body">
        {dados.length === 0 ? (
          <SemDados />
        ) : (
          <>
            <svg viewBox={`0 0 ${larguraTotal} ${padTop + h + padBottom}`} width="100%" role="img" aria-label="Chamados abertos e encerrados ao longo do mês">
              <g transform={`translate(${padLeft} ${padTop})`}>
                {Array.from({ length: linhasGrade + 1 }).map((_, i) => {
                  const y = (i / linhasGrade) * h;
                  const valor = Math.round(max - (i / linhasGrade) * max);
                  return (
                    <g key={i}>
                      <line x1={0} y1={y} x2={w} y2={y} stroke="var(--border)" strokeWidth="1" />
                      <text x={-8} y={y} fontSize="11" fill="var(--text-muted)" textAnchor="end" dominantBaseline="middle">
                        {valor}
                      </text>
                    </g>
                  );
                })}
                <path d={areaPath(abertosValores, w, h, max)} fill="var(--danger)" opacity="0.08" />
                <path d={linePath(abertosValores, w, h, max)} fill="none" stroke="var(--danger)" strokeWidth="2" />
                <path d={areaPath(encerradosValores, w, h, max)} fill="var(--success)" opacity="0.08" />
                <path d={linePath(encerradosValores, w, h, max)} fill="none" stroke="var(--success)" strokeWidth="2" />
                {dados.map((d, i) => (
                  <g key={d.dia}>
                    {d.abertos > 0 && <circle cx={px(i)} cy={py(d.abertos)} r="3" fill="var(--danger)" />}
                    {d.encerrados > 0 && <circle cx={px(i)} cy={py(d.encerrados)} r="3" fill="var(--success)" />}
                    <title>{`Dia ${diaDoMes(d.dia)}: ${d.abertos} aberto(s), ${d.encerrados} encerrado(s)`}</title>
                  </g>
                ))}
                {dados.map((d, i) => {
                  const ultimo = i === dados.length - 1;
                  if (i % passoRotulo !== 0 && !ultimo) return null;
                  return (
                    <text key={`x-${d.dia}`} x={px(i)} y={h + 18} fontSize="11" fill="var(--text-muted)" textAnchor="middle">
                      {diaDoMes(d.dia)}
                    </text>
                  );
                })}
              </g>
            </svg>
            <div className={r.legendaLinha}>
              <span><span className={r.legendaCor} style={{ background: "var(--danger)" }} /> Abertos: <strong>{totalAbertos}</strong></span>
              <span><span className={r.legendaCor} style={{ background: "var(--success)" }} /> Encerrados: <strong>{totalEncerrados}</strong></span>
              <span className="text-muted">eixo horizontal = dia do mês</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Problemas x Demandas no mês: dois números grandes e uma barra de
// proporção, mais fácil de ler que bolhas com só duas categorias. ---
function GraficoBolhas({ dados }: { dados: TotalPorTipo[] }) {
  const totalProblema = dados.find((d) => d.tipo === "Problema")?.total ?? 0;
  const totalDemanda = dados.find((d) => d.tipo === "Demanda")?.total ?? 0;
  const soma = totalProblema + totalDemanda;

  return (
    <div className="dash-panel">
      <div className="dash-panel-header">Problemas x Demandas — {mesAtualRotulo()}</div>
      <div className="dash-panel-body">
        {soma === 0 ? (
          <SemDados />
        ) : (
          <>
            <div className={r.comparativo}>
              <div className={r.comparativoCartao}>
                <div className={r.comparativoValor} style={{ color: CORES_TIPO["Problema"] }}>{totalProblema}</div>
                <div className={r.comparativoRotulo}>Problemas · {formatPct((totalProblema / soma) * 100)}</div>
              </div>
              <div className={r.comparativoCartao}>
                <div className={r.comparativoValor} style={{ color: CORES_TIPO["Demanda"] }}>{totalDemanda}</div>
                <div className={r.comparativoRotulo}>Demandas · {formatPct((totalDemanda / soma) * 100)}</div>
              </div>
            </div>
            <div className={r.comparativoBarra} role="img" aria-label={`${totalProblema} problemas e ${totalDemanda} demandas`}>
              <div style={{ width: `${(totalProblema / soma) * 100}%`, background: CORES_TIPO["Problema"] }} />
              <div style={{ width: `${(totalDemanda / soma) * 100}%`, background: CORES_TIPO["Demanda"] }} />
            </div>
            <p className={r.comparativoNota}>{soma} chamados abertos no mês</p>
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

export default function CondominioRelatorios() {
  const [data, setData] = useState<RelatoriosData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/condominio-relatorios")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar os relatórios."))
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
          <h1>Relatórios</h1>
          <p className="lede">Visão executiva dos chamados do condomínio.</p>

          {carregando && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}

          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar os relatórios.</strong>
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
                  titulo="Relatórios — Chamados Finalizados"
                  painel={data.finalizados}
                  slaLabels={{ ok: "Dentro do prazo", nok: "Fora do prazo" }}
                />
                <PainelChamados
                  titulo="Relatórios — Chamados em Andamento"
                  painel={data.andamento}
                  slaLabels={{ ok: "Dentro do prazo", nok: "Vencido" }}
                />
              </div>

              <div className={r.linhaGraficos}>
                <GraficoAtividadeMensal dados={data.atividadeMensal} />
                <GraficoBolhas dados={data.porTipoMensal} />
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">{data.apenasMeusChamados ? "Meus Chamados Recentes" : "Chamados Recentes"}</div>
                <div className="dash-panel-body">
                  {(!data.recentes || data.recentes.length === 0) ? (
                    <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>{data.apenasMeusChamados ? "Você ainda não abriu nenhum chamado." : "Nenhum chamado cadastrado ainda."}</p>
                  ) : (
                    <div className={r.tabelaRolagem}>
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
                        {data.recentes.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <Link href={`/condominio/chamados/${c.id}`} style={{ color: "var(--accent)", fontWeight: 600 }}>
                                #{c.id}
                              </Link>
                            </td>
                            <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>{c.titulo}</td>
                            <td>{c.status}</td>
                            <td>{c.aberto_por_nome}</td>
                            <td>{formatDataHora(c.criado_em)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
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
