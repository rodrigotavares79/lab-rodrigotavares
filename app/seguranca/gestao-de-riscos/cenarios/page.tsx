"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import FormCenarioCatalogo, { type DadosForm } from "@/components/riscos/FormCenarioCatalogo";

// B27 · Catálogo de cenários: o mesmo cenário em vários projetos, sem juntar
// os riscos. Cada linha mostra quantos projetos o cenário afeta, os níveis e
// o tratamento, e se já existe risco corporativo para ele.

const BASE = "/seguranca/gestao-de-riscos";
const VAZIO: DadosForm = { nome: "", evento: "", causa: "", consequencia: "", categoria: "", descricao: "" };

type Resumo = {
  projetos: number;
  riscos: number;
  porNivel: Record<string, number>;
  altosOuCriticos: number;
  comPlano: number;
  aceitos: number;
  mitigados: number;
  semTratamento: number;
  candidatoCorporativo: boolean;
};
type Cenario = {
  id: number;
  codigo: string;
  nome: string;
  categoria: string | null;
  ativo: boolean;
  risco_corporativo_id: number | null;
  resumo: Resumo;
};

const CORES: Record<string, string> = {
  Crítico: "var(--danger)",
  Alto: "#d9822b",
  Médio: "#d6b400",
  Baixo: "#3a9d5d",
};

function BarraNiveis({ porNivel }: { porNivel: Record<string, number> }) {
  const total = Object.values(porNivel).reduce((a, b) => a + b, 0);
  if (!total) return <span className="text-muted">—</span>;
  return (
    <div>
      <div style={{ display: "flex", height: "0.55rem", borderRadius: "0.3rem", overflow: "hidden", minWidth: "8rem" }}>
        {["Crítico", "Alto", "Médio", "Baixo"].map((n) =>
          porNivel[n] ? <div key={n} style={{ flex: porNivel[n], background: CORES[n] }} title={`${n}: ${porNivel[n]}`} /> : null
        )}
      </div>
      <div className="text-muted" style={{ fontSize: "0.72rem", marginTop: "0.2rem" }}>
        {["Crítico", "Alto", "Médio", "Baixo"]
          .filter((n) => porNivel[n])
          .map((n) => `${porNivel[n]} ${n}`)
          .join(" · ")}
      </div>
    </div>
  );
}

export default function CatalogoCenarios() {
  const [cenarios, setCenarios] = useState<Cenario[] | null>(null);
  const [podeEditar, setPodeEditar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  function carregar() {
    fetch(`/api/cenarios${mostrarInativos ? "?inativos=1" : ""}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setCenarios(d.cenarios || []);
        setPodeEditar(!!d.podeEditar);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar o catálogo."));
  }
  useEffect(carregar, [mostrarInativos]);

  async function criar(d: DadosForm): Promise<string | null> {
    const r = await fetch("/api/cenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return j.error || "Não foi possível salvar.";
    setNovo(false);
    carregar();
    return null;
  }

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <h1>Catálogo de cenários</h1>
              <p className="lede">
                Cenários de risco padrão. Cada projeto avalia e trata o seu risco; o catálogo mostra o mesmo cenário em
                todos os projetos e onde vale um tratamento central (risco corporativo).
              </p>
            </div>
            {podeEditar && !novo && (
              <button type="button" className="btn-primary" onClick={() => setNovo(true)}>
                + Novo cenário
              </button>
            )}
          </div>

          {novo && (
            <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
              <div className="dash-panel-header">Novo cenário</div>
              <div className="dash-panel-body">
                <FormCenarioCatalogo inicial={VAZIO} onSalvar={criar} onCancelar={() => setNovo(false)} />
              </div>
            </div>
          )}

          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "1.5rem" }}>
            <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} />
            Mostrar inativos
          </label>

          {!cenarios && !erro && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}
          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar o catálogo.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {cenarios && (
            <div className="dash-panel" style={{ marginTop: "1rem" }}>
              <div className="dash-panel-header">
                {cenarios.length} {cenarios.length === 1 ? "cenário" : "cenários"}
              </div>
              <div className="dash-panel-body">
                {cenarios.length === 0 ? (
                  <p className="text-muted" style={{ margin: 0 }}>Nenhum cenário no catálogo.</p>
                ) : (
                  <div className="dash-table-scroll">
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Cenário</th>
                          <th>Projetos</th>
                          <th>Níveis</th>
                          <th>Tratamento</th>
                          <th>Risco corporativo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cenarios.map((c) => (
                          <tr key={c.id} style={c.ativo ? undefined : { opacity: 0.55 }}>
                            <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>
                              <a href={`${BASE}/cenarios/${c.id}`} style={{ fontWeight: 600 }}>
                                {c.codigo}
                              </a>{" "}
                              · {c.nome}
                              {!c.ativo && <span className="text-muted"> · inativo</span>}
                              {c.categoria && (
                                <div className="text-muted" style={{ fontSize: "0.75rem" }}>{c.categoria}</div>
                              )}
                            </td>
                            <td>
                              {c.resumo.projetos}
                              <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                                {c.resumo.riscos} risco{c.resumo.riscos === 1 ? "" : "s"}
                              </div>
                            </td>
                            <td>
                              <BarraNiveis porNivel={c.resumo.porNivel} />
                            </td>
                            <td style={{ fontSize: "0.8rem", whiteSpace: "normal", minWidth: "10rem" }}>
                              {c.resumo.semTratamento > 0 && (
                                <div style={{ color: "var(--danger)", fontWeight: 600 }}>{c.resumo.semTratamento} sem tratamento</div>
                              )}
                              {c.resumo.comPlano > 0 && <div>{c.resumo.comPlano} com plano</div>}
                              {c.resumo.aceitos > 0 && <div>{c.resumo.aceitos} aceito(s)</div>}
                              {c.resumo.mitigados > 0 && <div>{c.resumo.mitigados} mitigado(s)</div>}
                            </td>
                            <td style={{ fontSize: "0.8rem" }}>
                              {c.risco_corporativo_id ? (
                                <a href={`${BASE}/riscos/${c.risco_corporativo_id}`}>#{c.risco_corporativo_id}</a>
                              ) : c.resumo.candidatoCorporativo ? (
                                <span style={{ color: "var(--danger)" }}>candidato ({c.resumo.projetos} projetos)</span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
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
