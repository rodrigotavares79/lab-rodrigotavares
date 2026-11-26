"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import s from "@/components/riscos/Cockpit.module.css";
import {
  BASE,
  linkRiscos,
  TileKpi,
  MatrizCalor,
  ApetitePorCategoria,
  FunilTratamento,
  AcoesPorPrazo,
  Aceitacoes,
  SemaforoKris,
  TopExposicao,
  CoberturaFrameworks,
  Pendencias,
  type KriCockpit,
} from "@/components/riscos/Cockpit";
import { moeda } from "@/lib/exposicaoRisco";
import { nomeFramework } from "@/lib/catalogoControles";
import type { FrameworkId } from "@/lib/conformidadeFrameworks";
import type { LinhaApetite, EstagioTratamento, FaixaPrazo } from "@/lib/cockpitRisco";

// Dashboard (cockpit): a leitura gerencial ao vivo em cinco faixas — comando,
// onde está o risco, andamento do tratamento, sinais de alerta e governança.
// Início é a fila de trabalho; Relatório Executivo, o documento para enviar;
// Tendências, o histórico.

type Projeto = { id: number; nome: string };
type NivelRisco = { nivel: string; total: number };

type DashboardData = {
  dataReferencia: string;
  kpis: {
    total: number;
    ativos: number;
    mitigados: number;
    criticos: number;
    altos: number;
    criticosAltos: number;
    acimaTolerancia: number;
    acimaApetite: number;
    perdaAnual: number;
    comEstimativa: number;
    conformidade: number | null;
    altoCriticoTotal: number;
    acoesAtrasadas: number;
  };
  tendencia: { meses: string[]; ativos: (number | null)[]; criticosAltos: (number | null)[]; conformidade: (number | null)[]; acoesAtrasadas: (number | null)[] };
  matriz: { prob: number; imp: number; total: number }[];
  apetite: { versao: number | null; porCategoria: LinhaApetite[] };
  funil: Record<EstagioTratamento, number>;
  acoesPrazo: Record<FaixaPrazo, number>;
  aceitacoes: { vigentes: number; pendentes: number; vencendo: number };
  mitigacao: { melhorou: number; manteve: number; piorou: number };
  niveisIniciais: NivelRisco[];
  niveisAtuaisTodos: NivelRisco[];
  kris: KriCockpit[];
  exposicao: { total: number; comEstimativa: number; ativos: number; top: { id: number; titulo: string | null; gatilho: string | null; impacto_qualitativo: string | null; ale: number }[] };
  coberturaFrameworks: { framework: string; controles: number; percentual: number | null }[];
  pendencias: {
    semTratamento: number;
    revisoesVencidas: number;
    auditoriaPendentes: number;
    aceitacoesPendentes: number;
    apetitePendente: number | null;
    semDono: number;
    krisSemMedicao: number;
  };
  consolidado: { projeto: string; projeto_id: number; total: number; ativos: number; criticos: number; acimaTolerancia: number; perdaAnual: number }[];
};

const ORDEM_NIVEIS = ["Baixo", "Médio", "Alto", "Crítico"];

function InerenteXAtual({ data }: { data: DashboardData }) {
  const ini = new Map(data.niveisIniciais.map((n) => [n.nivel, n.total]));
  const atu = new Map(data.niveisAtuaisTodos.map((n) => [n.nivel, n.total]));
  const comp = ORDEM_NIVEIS.map((nivel) => ({ nivel, inicial: ini.get(nivel) || 0, atual: atu.get(nivel) || 0 }));
  const W = 600, H = 130, topo = 18;
  const max = Math.max(1, ...comp.flatMap((c) => [c.inicial, c.atual]));
  const gap = 24, sub = 4;
  const gw = (W - gap * (comp.length - 1)) / comp.length;
  const sw = (gw - sub) / 2;
  const m = data.mitigacao;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(12rem, 1fr)", gap: "1.5rem", alignItems: "center" }}>
      <div>
        <div className="legend-row">
          <span><span className="legend-dot" style={{ background: "#c7cdd3" }} />Nível inerente</span>
          <span><span className="legend-dot" style={{ background: "var(--rs-primaria)" }} />Nível atual</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H + topo + 22}`} width="100%" role="img" aria-label={comp.map((c) => `${c.nivel}: inerente ${c.inicial}, atual ${c.atual}`).join("; ")}>
          {comp.map((c, i) => {
            const x = i * (gw + gap);
            const hI = (c.inicial / max) * H, hA = (c.atual / max) * H;
            return (
              <g key={c.nivel}>
                <rect x={x} y={topo + H - hI} width={sw} height={hI} fill="#c7cdd3" rx="3" />
                {c.inicial > 0 && <text x={x + sw / 2} y={topo + H - hI - 5} fontSize="11" fill="var(--rs-text)" textAnchor="middle">{c.inicial}</text>}
                <rect x={x + sw + sub} y={topo + H - hA} width={sw} height={hA} fill="var(--rs-primaria)" rx="3" />
                {c.atual > 0 && <text x={x + sw + sub + sw / 2} y={topo + H - hA - 5} fontSize="11" fill="var(--rs-text)" textAnchor="middle">{c.atual}</text>}
                <text x={x + gw / 2} y={topo + H + 16} fontSize="11" fill="var(--rs-muted)" textAnchor="middle">{c.nivel}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className={s.mini} style={{ gridTemplateColumns: "1fr" }}>
        {[
          { rotulo: "Melhoraram de nível", n: m.melhorou, cor: "var(--rs-ok)" },
          { rotulo: "Sem mudança de nível", n: m.manteve, cor: "#a7adb8" },
          { rotulo: "Pioraram de nível", n: m.piorou, cor: "var(--rs-perigo)" },
        ].map((x) => (
          <div key={x.rotulo} className={s.miniItem} style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
            <span className={s.miniRotulo}>
              <span className={s.ponto} style={{ background: x.cor }} />
              {x.rotulo}
            </span>
            <span className={s.miniValor}>{x.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Painel({ titulo, children, id }: { titulo: string; children: React.ReactNode; id?: string }) {
  return (
    <div className="dash-panel" id={id}>
      <div className="dash-panel-header">{titulo}</div>
      <div className="dash-panel-body">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [projetoId, setProjetoId] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projetos")
      .then((r) => r.json())
      .then((d) => setProjetos(d.projetos || []))
      .catch(() => setProjetos([]));
  }, []);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    const url = projetoId ? `/api/dashboard?projetoId=${projetoId}` : "/api/dashboard";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar dashboard."))
      .finally(() => setCarregando(false));
  }, [projetoId]);

  const k = data?.kpis;
  const t = data?.tendencia;
  const pend = data?.pendencias;
  const semDados = !carregando && !erro && k?.total === 0;
  const dataRef = data?.dataReferencia ? data.dataReferencia.split("-").reverse().join("/") : "";

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Dashboard</h1>
          <p className="lede">
            Cockpit gerencial: a posição de hoje, o que mudou desde o mês passado e onde agir. Clique em qualquer número para abrir a lista
            correspondente.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
            <div className="form-field" style={{ maxWidth: "20rem", flex: "1 1 14rem", margin: 0 }}>
              <label htmlFor="filtroProjeto">Projeto</label>
              <select id="filtroProjeto" value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
                <option value="">Todos os Projetos</option>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <a
              href={`${BASE}/relatorio${projetoId ? `?projetoId=${projetoId}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", minHeight: "2.75rem" }}
            >
              Emitir Relatório Executivo
            </a>
            {dataRef && <span className="text-muted" style={{ fontSize: "0.8rem", marginLeft: "auto" }}>Posição de {dataRef}</span>}
          </div>

          {carregando && !data && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}

          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar o dashboard.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {semDados && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-body">
                <p className="text-muted" style={{ margin: 0 }}>
                  Nenhum risco cadastrado ainda {projetoId ? "para esse projeto" : ""}. Cadastre riscos na página{" "}
                  <a href={`${BASE}/cadastro-de-riscos`}>Cadastro de Riscos</a> para ver os indicadores aqui.
                </p>
              </div>
            </div>
          )}

          {!erro && !semDados && data && k && t && pend && (
            <div className="dashboard" style={{ opacity: carregando ? 0.55 : 1, transition: "opacity 0.15s" }}>
              {/* 1. Comando */}
              <section className={s.faixa} aria-labelledby="f1">
                <h2 id="f1" className={s.tituloFaixa}>Indicadores principais</h2>
                <div className={s.tiles}>
                  <TileKpi rotulo="Riscos ativos" valor={k.ativos} href={linkRiscos({ ativos: 1 }, projetoId)} serie={t.ativos} meses={t.meses} nota={`${k.mitigados} mitigados · ${k.total} no total`} />
                  <TileKpi
                    rotulo="Críticos e altos"
                    valor={k.criticosAltos}
                    href={linkRiscos({ nivel: "critico-alto" }, projetoId)}
                    serie={t.criticosAltos}
                    meses={t.meses}
                    sentido="menor"
                    nota={`${k.criticos} críticos · ${k.altos} altos`}
                  />
                  <TileKpi
                    rotulo="Acima da tolerância"
                    valor={k.acimaTolerancia}
                    href={linkRiscos({ apetite: "acima-tolerancia" }, projetoId)}
                    nota={`${k.acimaApetite} acima do apetite, dentro da tolerância`}
                    alerta={k.acimaTolerancia > 0}
                  />
                  <TileKpi
                    rotulo="Perda anual esperada"
                    valor={moeda(k.perdaAnual, true)}
                    href="#exposicao"
                    nota={`${k.comEstimativa} de ${k.ativos} riscos ativos com estimativa`}
                  />
                  <TileKpi
                    rotulo="Críticos e altos com tratamento"
                    valor={k.conformidade === null ? "—" : `${k.conformidade}%`}
                    href={`${BASE}/sem-tratamento`}
                    serie={t.conformidade}
                    meses={t.meses}
                    sentido="maior"
                    sufixoDelta=" p.p."
                    nota="Plano de ação ou aceitação válida"
                  />
                  <TileKpi
                    rotulo="Ações atrasadas"
                    valor={k.acoesAtrasadas}
                    href={`${BASE}/acoes-atrasadas`}
                    serie={t.acoesAtrasadas}
                    meses={t.meses}
                    sentido="menor"
                    alerta={k.acoesAtrasadas > 0}
                  />
                </div>
              </section>

              {/* 2. Onde está o risco */}
              <section className={s.faixa} aria-labelledby="f2">
                <h2 id="f2" className={s.tituloFaixa}>Onde está o risco</h2>
                <div className={s.grade2}>
                  <Painel titulo="Matriz de calor (nível atual)">
                    <MatrizCalor celulas={data.matriz} projetoId={projetoId} />
                  </Painel>
                  <Painel titulo={`Apetite por categoria${data.apetite.versao ? ` · versão ${data.apetite.versao}` : ""}`}>
                    <ApetitePorCategoria linhas={data.apetite.porCategoria} projetoId={projetoId} />
                  </Painel>
                </div>
              </section>

              {/* 3. Tratamento */}
              <section className={s.faixa} aria-labelledby="f3">
                <h2 id="f3" className={s.tituloFaixa}>O tratamento está andando?</h2>
                <div className={s.grade3}>
                  <Painel titulo="Funil do tratamento">
                    <FunilTratamento funil={data.funil} projetoId={projetoId} />
                  </Painel>
                  <Painel titulo="Ações por prazo">
                    <AcoesPorPrazo prazos={data.acoesPrazo} />
                  </Painel>
                  <Painel titulo="Aceitações de risco">
                    <Aceitacoes a={data.aceitacoes} projetoId={projetoId} />
                  </Painel>
                </div>
                <Painel titulo="Nível inerente x nível atual">
                  <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: 0 }}>
                    Todos os riscos (inclusive mitigados): o nível calculado na criação comparado ao nível atual, depois dos controles e
                    reavaliações. É a medida do efeito do tratamento.
                  </p>
                  <InerenteXAtual data={data} />
                </Painel>
              </section>

              {/* 4. Sinais de alerta */}
              <section className={s.faixa} aria-labelledby="f4">
                <h2 id="f4" className={s.tituloFaixa}>Sinais de alerta</h2>
                <div className={s.grade2}>
                  <Painel titulo="Semáforo dos KRIs">
                    <SemaforoKris kris={data.kris} />
                  </Painel>
                  <Painel titulo="Maior exposição financeira" id="exposicao">
                    <TopExposicao exposicao={data.exposicao} />
                  </Painel>
                </div>
              </section>

              {/* 5. Governança e conformidade */}
              <section className={s.faixa} aria-labelledby="f5">
                <h2 id="f5" className={s.tituloFaixa}>Governança e conformidade</h2>
                <div className={s.grade2}>
                  <Painel titulo="Cobertura por framework">
                    <CoberturaFrameworks cobertura={data.coberturaFrameworks} nome={(fw) => nomeFramework(fw as FrameworkId)} />
                  </Painel>
                  <Painel titulo="Pendências de governança">
                    <Pendencias
                      itens={[
                        { rotulo: "Críticos e altos sem tratamento no prazo", n: pend.semTratamento, href: `${BASE}/sem-tratamento`, grave: true },
                        { rotulo: "Revisões vencidas ou antecipadas", n: pend.revisoesVencidas, href: `${BASE}/revisoes-vencidas` },
                        { rotulo: "Planos aguardando auditoria", n: pend.auditoriaPendentes, href: `${BASE}/auditoria` },
                        { rotulo: "Aceitações aguardando aprovação", n: pend.aceitacoesPendentes, href: `${BASE}/aceitacoes-pendentes` },
                        { rotulo: "Riscos ativos sem dono", n: pend.semDono, href: linkRiscos({ dono: "sem" }, projetoId) },
                        { rotulo: "KRIs com medição atrasada", n: pend.krisSemMedicao, href: `${BASE}/kris` },
                        {
                          rotulo: "Versão de apetite aguardando o CISO",
                          n: pend.apetitePendente === null ? 0 : `v${pend.apetitePendente}`,
                          href: `${BASE}/apetite`,
                        },
                      ]}
                    />
                  </Painel>
                </div>

                {!projetoId && data.consolidado.length > 0 && (
                  <Painel titulo="Consolidado por projeto">
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Projeto</th>
                          <th style={{ textAlign: "right" }}>Ativos</th>
                          <th style={{ textAlign: "right" }}>Críticos</th>
                          <th style={{ textAlign: "right" }}>Acima da tolerância</th>
                          <th style={{ textAlign: "right" }}>Perda anual esperada</th>
                          <th style={{ textAlign: "right" }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.consolidado.map((c) => (
                          <tr key={c.projeto}>
                            <td>
                              <button
                                type="button"
                                onClick={() => setProjetoId(String(c.projeto_id))}
                                style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "var(--rs-primaria)", cursor: "pointer", fontWeight: 600 }}
                                title="Ver o dashboard só deste projeto"
                              >
                                {c.projeto}
                              </button>
                            </td>
                            <td style={{ textAlign: "right" }}>{c.ativos}</td>
                            <td style={{ textAlign: "right" }}>{c.criticos}</td>
                            <td style={{ textAlign: "right", color: c.acimaTolerancia ? "var(--rs-perigo)" : undefined, fontWeight: c.acimaTolerancia ? 700 : undefined }}>
                              {c.acimaTolerancia ? `▲▲ ${c.acimaTolerancia}` : 0}
                            </td>
                            <td style={{ textAlign: "right" }}>{c.perdaAnual ? moeda(c.perdaAnual, true) : "—"}</td>
                            <td style={{ textAlign: "right" }}>{c.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Painel>
                )}
              </section>

              <p className="text-muted" style={{ fontSize: "0.8rem", margin: 0 }}>
                A evolução mensal de cadastros agora fica em <Link href={`${BASE}/tendencias`}>Tendências</Link>.
              </p>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
