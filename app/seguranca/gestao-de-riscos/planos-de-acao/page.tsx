"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

// Todos os planos de ação, de todos os riscos, com filtros. Cada linha leva
// aos planos do risco de origem, onde o plano é editado.

const BASE = "/seguranca/gestao-de-riscos";

type Plano = {
  id: number;
  titulo: string;
  status: string | null;
  criado_em: string;
  concluido_em: string | null;
  auditoria_status: string | null;
  risco_id: number;
  gatilho: string | null;
  categoria: string | null;
  impacto_qualitativo: string | null;
  risco_status: string | null;
  acoes_total: number;
  acoes_concluidas: number;
  acoes_atrasadas: number;
  proximo_prazo: string | null;
  responsaveis: string[];
};

const BADGE_POR_NIVEL: Record<string, string> = {
  Baixo: "badge-baixo",
  "Médio": "badge-medio",
  Alto: "badge-alto",
  "Crítico": "badge-critico",
};
const NIVEIS = ["Crítico", "Alto", "Médio", "Baixo"];

function formatData(d: string | null) {
  if (!d) return "—";
  return new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("pt-BR");
}

function unicos(lista: (string | null)[]): string[] {
  return [...new Set(lista.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export default function TodosOsPlanos() {
  const [planos, setPlanos] = useState<Plano[] | null>(null);
  const [verAuditoria, setVerAuditoria] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("");
  const [nivel, setNivel] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [auditoria, setAuditoria] = useState("");
  const [soAtrasados, setSoAtrasados] = useState(false);

  useEffect(() => {
    fetch("/api/planos-acao/todos")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setPlanos(d.planos || []);
        setVerAuditoria(!!d.verAuditoria);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar os planos."));
  }, []);

  const opcoes = useMemo(() => {
    const p = planos || [];
    return {
      situacoes: unicos(p.map((x) => x.status)),
      responsaveis: unicos(p.flatMap((x) => x.responsaveis || [])),
      auditorias: unicos(p.map((x) => x.auditoria_status)),
    };
  }, [planos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (planos || []).filter((p) => {
      if (situacao && p.status !== situacao) return false;
      if (nivel && p.impacto_qualitativo !== nivel) return false;
      if (responsavel && !(p.responsaveis || []).includes(responsavel)) return false;
      if (auditoria && p.auditoria_status !== auditoria) return false;
      if (soAtrasados && p.acoes_atrasadas === 0) return false;
      if (termo) {
        const texto = `${p.titulo} #${p.risco_id} ${p.gatilho || ""} ${p.categoria || ""}`.toLowerCase();
        if (!texto.includes(termo)) return false;
      }
      return true;
    });
  }, [planos, busca, situacao, nivel, responsavel, auditoria, soAtrasados]);

  const filtroAtivo = !!(busca || situacao || nivel || responsavel || auditoria || soAtrasados);

  function limpar() {
    setBusca("");
    setSituacao("");
    setNivel("");
    setResponsavel("");
    setAuditoria("");
    setSoAtrasados(false);
  }

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Todos os planos</h1>
          <p className="lede">
            Planos de ação de todos os riscos. Para editar um plano ou suas ações, abra o risco de origem.
          </p>

          {!planos && !erro && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}

          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar os planos.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {planos && planos.length === 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-body">
                <p className="text-muted" style={{ margin: 0 }}>Nenhum plano de ação cadastrado ainda.</p>
              </div>
            </div>
          )}

          {planos && planos.length > 0 && (
            <>
              <div className="form-grid" style={{ marginTop: "1.5rem" }}>
                <div className="form-field">
                  <label htmlFor="buscaPlanos">Buscar</label>
                  <input
                    id="buscaPlanos"
                    type="search"
                    value={busca}
                    placeholder="Título do plano, nº ou gatilho do risco"
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="filtroSituacao">Situação do plano</label>
                  <select id="filtroSituacao" value={situacao} onChange={(e) => setSituacao(e.target.value)}>
                    <option value="">Todas</option>
                    {opcoes.situacoes.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="filtroNivel">Nível do risco</label>
                  <select id="filtroNivel" value={nivel} onChange={(e) => setNivel(e.target.value)}>
                    <option value="">Todos</option>
                    {NIVEIS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="filtroResponsavel">Responsável</label>
                  <select id="filtroResponsavel" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
                    <option value="">Todos</option>
                    {opcoes.responsaveis.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                {verAuditoria && (
                  <div className="form-field">
                    <label htmlFor="filtroAuditoria">Auditoria</label>
                    <select id="filtroAuditoria" value={auditoria} onChange={(e) => setAuditoria(e.target.value)}>
                      <option value="">Todas</option>
                      {opcoes.auditorias.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-field" style={{ alignSelf: "end" }}>
                  <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontWeight: 400 }}>
                    <input type="checkbox" checked={soAtrasados} onChange={(e) => setSoAtrasados(e.target.checked)} />
                    Só planos com ação atrasada
                  </label>
                </div>
              </div>

              <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
                <div className="dash-panel-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <span>
                    {filtrados.length} de {planos.length} {planos.length > 1 ? "planos" : "plano"}
                  </span>
                  {filtroAtivo && (
                    <button
                      type="button"
                      onClick={limpar}
                      style={{ background: "none", border: 0, padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit" }}
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
                <div className="dash-panel-body">
                  {filtrados.length === 0 ? (
                    <p className="text-muted" style={{ margin: 0 }}>Nenhum plano com esses filtros.</p>
                  ) : (
                    <div className="dash-table-scroll">
                      <table className="dash-table">
                        <thead>
                          <tr>
                            <th>Plano</th>
                            <th>Risco</th>
                            <th>Nível</th>
                            <th>Situação</th>
                            <th>Ações</th>
                            <th>Próximo prazo</th>
                            <th>Responsáveis</th>
                            {verAuditoria && <th>Auditoria</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {filtrados.map((p) => (
                            <tr key={p.id}>
                              <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>
                                <Link
                                  href={`${BASE}/riscos/${p.risco_id}#planos-de-acao`}
                                  style={{ color: "var(--accent)", fontWeight: 600 }}
                                >
                                  {p.titulo}
                                </Link>
                                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                  criado em {formatData(p.criado_em)}
                                </div>
                              </td>
                              <td style={{ whiteSpace: "normal", minWidth: "12rem" }}>
                                #{p.risco_id} · {p.gatilho || p.categoria || "—"}
                              </td>
                              <td>
                                {p.impacto_qualitativo ? (
                                  <span className={`badge ${BADGE_POR_NIVEL[p.impacto_qualitativo] || ""}`}>
                                    {p.impacto_qualitativo}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td>{p.status || "—"}</td>
                              <td>
                                {p.acoes_concluidas}/{p.acoes_total} concluídas
                                {p.acoes_atrasadas > 0 && (
                                  <div style={{ color: "var(--danger)", fontWeight: 600, fontSize: "0.8rem" }}>
                                    {p.acoes_atrasadas} atrasada{p.acoes_atrasadas > 1 ? "s" : ""}
                                  </div>
                                )}
                              </td>
                              <td>{formatData(p.proximo_prazo)}</td>
                              <td style={{ whiteSpace: "normal", minWidth: "10rem" }}>
                                {(p.responsaveis || []).join(", ") || "—"}
                              </td>
                              {verAuditoria && <td>{p.auditoria_status || "—"}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <a href={BASE} className="status-tag" style={{ marginTop: "2.5rem", display: "inline-block" }}>
            ← Voltar para Gestão de Riscos
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
