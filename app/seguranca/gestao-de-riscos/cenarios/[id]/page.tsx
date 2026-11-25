"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Footer from "@/components/Footer";
import FormCenarioCatalogo, { type DadosForm } from "@/components/riscos/FormCenarioCatalogo";
import SeletorDono, { DONO_VAZIO, donoPreenchido, type ValorDono } from "@/components/riscos/SeletorDono";

// B27 · Um cenário do catálogo: texto padrão, riscos de cada projeto ligados
// a ele, resumo e risco corporativo (dono e tratamento central).

const BASE = "/seguranca/gestao-de-riscos";
const BADGE: Record<string, string> = { Baixo: "badge-baixo", "Médio": "badge-medio", Alto: "badge-alto", "Crítico": "badge-critico" };

type Dados = {
  cenario: any;
  riscos: any[];
  resumo: any;
  podeEditar: boolean;
};

function Indicador({ rotulo, valor, alerta }: { rotulo: string; valor: number | string; alerta?: boolean }) {
  return (
    <div className="dash-panel" style={{ margin: 0 }}>
      <div className="dash-panel-body" style={{ padding: "0.8rem 1rem" }}>
        <div className="text-muted" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {rotulo}
        </div>
        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: alerta ? "var(--danger)" : undefined }}>{valor}</div>
      </div>
    </div>
  );
}

export default function CenarioDetalhe() {
  const params = useParams<{ id: string }>();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [dono, setDono] = useState<ValorDono>(DONO_VAZIO);
  const [erroCorp, setErroCorp] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    fetch(`/api/cenarios/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDados(d);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar o cenário."));
  }, [params.id]);
  useEffect(carregar, [carregar]);

  async function salvar(d: DadosForm): Promise<string | null> {
    const r = await fetch(`/api/cenarios/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return j.error || "Não foi possível salvar.";
    setEditando(false);
    carregar();
    return null;
  }

  async function alternarSituacao() {
    await fetch(`/api/cenarios/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !dados?.cenario.ativo }),
    });
    carregar();
  }

  async function registrarCorporativo() {
    if (!donoPreenchido(dono)) {
      setErroCorp("Escolha o dono corporativo do risco.");
      return;
    }
    setEnviando(true);
    setErroCorp(null);
    const r = await fetch(`/api/cenarios/${params.id}/risco-corporativo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        donoEmail: dono.donoEmail || null,
        donoContatoId: dono.donoContatoId,
        pontoFocalEmail: dono.pontoFocalEmail || null,
      }),
    });
    const j = await r.json().catch(() => ({}));
    setEnviando(false);
    if (!r.ok) return setErroCorp(j.error || "Não foi possível registrar.");
    setRegistrando(false);
    carregar();
  }

  const c = dados?.cenario;
  const resumo = dados?.resumo;
  const deProjetos = (dados?.riscos || []).filter((r) => !r.corporativo);
  const botaoLink: React.CSSProperties = { background: "none", border: 0, padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit" };

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">
            <a href={`${BASE}/cenarios`}>Catálogo de cenários</a>
          </span>

          {erro && (
            <div className="error-banner" style={{ marginTop: "1.5rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar o cenário.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}
          {!dados && !erro && <p className="text-muted">Carregando...</p>}

          {c && resumo && (
            <>
              <h1>
                {c.codigo} · {c.nome}
              </h1>
              {!c.ativo && <p className="field-helper">Inativo: não aparece nas sugestões do cadastro.</p>}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
                <Indicador rotulo="Projetos afetados" valor={resumo.projetos} />
                <Indicador rotulo="Altos ou críticos" valor={resumo.altosOuCriticos} alerta={resumo.altosOuCriticos > 0} />
                <Indicador rotulo="Alto/crítico sem tratamento" valor={resumo.semTratamento} alerta={resumo.semTratamento > 0} />
                <Indicador rotulo="Baixo/médio sem plano" valor={resumo.outrosSemPlano} />
                <Indicador rotulo="Com plano" valor={resumo.comPlano} />
                <Indicador rotulo="Aceitos" valor={resumo.aceitos} />
              </div>

              <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
                <div className="dash-panel-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <span>Cenário padrão</span>
                  {dados?.podeEditar && !editando && (
                    <span>
                      <button type="button" style={botaoLink} onClick={() => setEditando(true)}>
                        Editar
                      </button>
                      {" · "}
                      <button type="button" style={botaoLink} onClick={alternarSituacao}>
                        {c.ativo ? "Inativar" : "Reativar"}
                      </button>
                    </span>
                  )}
                </div>
                <div className="dash-panel-body">
                  {editando ? (
                    <FormCenarioCatalogo
                      inicial={{
                        nome: c.nome,
                        evento: c.evento,
                        causa: c.causa,
                        consequencia: c.consequencia,
                        categoria: c.categoria || "",
                        descricao: c.descricao || "",
                      }}
                      onSalvar={salvar}
                      onCancelar={() => setEditando(false)}
                    />
                  ) : (
                    <>
                      <p style={{ margin: "0 0 0.5rem" }}><strong>Causa:</strong> {c.causa}</p>
                      <p style={{ margin: "0 0 0.5rem" }}><strong>Evento:</strong> {c.evento}</p>
                      <p style={{ margin: "0 0 0.5rem" }}><strong>Consequência:</strong> {c.consequencia}</p>
                      {c.categoria && <p style={{ margin: "0 0 0.5rem" }}><strong>Categoria:</strong> {c.categoria}</p>}
                      {c.descricao && <p style={{ margin: 0 }}>{c.descricao}</p>}
                      <p className="field-helper" style={{ marginBottom: 0 }}>
                        Editar o cenário padrão não muda o texto dos riscos já ligados: cada projeto mantém o seu.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
                <div className="dash-panel-header">Risco corporativo</div>
                <div className="dash-panel-body">
                  {c.risco_corporativo_id ? (
                    <p style={{ margin: 0 }}>
                      <a href={`${BASE}/riscos/${c.risco_corporativo_id}`} style={{ fontWeight: 600 }}>
                        #{c.risco_corporativo_id}
                      </a>{" "}
                      · dono {c.corporativo_dono || "—"} · {c.corporativo_status || "Identificado"}
                      {c.corporativo_nivel ? ` · ${c.corporativo_nivel}` : " · ainda sem avaliação"}
                    </p>
                  ) : (
                    <>
                      <p style={{ marginTop: 0 }}>
                        {resumo.candidatoCorporativo
                          ? `Este cenário afeta ${resumo.projetos} projetos. Se a causa é comum (ex.: um processo corporativo único), registre um risco corporativo com dono e tratamento central.`
                          : "Use quando a causa for comum a vários projetos e o tratamento precisar ser central."}
                      </p>
                      {dados?.podeEditar &&
                        (registrando ? (
                          <div>
                            <SeletorDono valor={dono} onChange={setDono} idPrefixo="donoCorp" />
                            {erroCorp && (
                              <p className="field-helper" style={{ color: "var(--danger)" }}>
                                {erroCorp}
                              </p>
                            )}
                            <p className="field-helper">
                              O risco corporativo é criado no projeto &quot;Corporativo (transversal)&quot; com o texto deste
                              cenário, e segue o fluxo normal: avaliação, planos de ação, aceitação e revisão.
                            </p>
                            <div style={{ display: "flex", gap: "0.75rem" }}>
                              <button type="button" className="btn-primary" onClick={registrarCorporativo} disabled={enviando}>
                                {enviando ? "Registrando..." : "Registrar risco corporativo"}
                              </button>
                              <button type="button" className="btn-secondary" onClick={() => setRegistrando(false)} disabled={enviando}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" className="btn-secondary" onClick={() => setRegistrando(true)}>
                            Registrar risco corporativo
                          </button>
                        ))}
                    </>
                  )}
                </div>
              </div>

              <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
                <div className="dash-panel-header">Riscos dos projetos · {deProjetos.length}</div>
                <div className="dash-panel-body">
                  {deProjetos.length === 0 ? (
                    <p className="text-muted" style={{ margin: 0 }}>
                      Nenhum risco ligado. Ligue riscos a este cenário no cadastro ou no painel &quot;Cenário de risco&quot;
                      da tela do risco.
                    </p>
                  ) : (
                    <div className="dash-table-scroll">
                      <table className="dash-table">
                        <thead>
                          <tr>
                            <th>Projeto</th>
                            <th>Risco</th>
                            <th>Nível</th>
                            <th>Status</th>
                            <th>Dono</th>
                            <th>Planos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deProjetos.map((r) => (
                            <tr key={r.id}>
                              <td>{r.projeto}</td>
                              <td>
                                <a href={`${BASE}/riscos/${r.id}`} style={{ fontWeight: 600 }}>
                                  #{r.id}
                                </a>
                              </td>
                              <td>{r.nivel ? <span className={`badge ${BADGE[r.nivel] || ""}`}>{r.nivel}</span> : "—"}</td>
                              <td>{r.aceito ? "Aceito" : r.status || "—"}</td>
                              <td>{r.dono_nome || <span style={{ color: "var(--danger)" }}>sem dono</span>}</td>
                              <td>{r.planos}</td>
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

          <a href={`${BASE}/cenarios`} className="status-tag" style={{ marginTop: "2.5rem", display: "inline-block" }}>
            ← Voltar para o catálogo
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
