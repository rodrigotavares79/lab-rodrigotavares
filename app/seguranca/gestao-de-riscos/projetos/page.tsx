"use client";

import { useCallback, useEffect, useState } from "react";
import Footer from "@/components/Footer";
import { usePerfilRiscos, SemPermissao } from "@/components/riscos/PermissoesRiscos";
import { normalizarNomeProjeto, projetoComMesmoNome, validarNomeProjeto } from "@/lib/projetosRegras";

// B29 · Administração → Projetos: solicitações de inclusão pendentes,
// cadastro, renomeação e desativação de projetos. Projeto não se exclui:
// inativo some das listas de cadastro e continua nos filtros e relatórios.

type Projeto = { id: number; nome: string; ativo: boolean; descricao: string | null; riscos: number; assessments: number; ativos_criticos: number };
type Solicitacao = {
  id: number;
  nome: string;
  justificativa: string;
  situacao: "Pendente" | "Aprovada" | "Recusada";
  solicitado_por_email: string;
  solicitado_por_nome: string | null;
  solicitado_em: string;
  decidido_por_nome: string | null;
  decidido_em: string | null;
  motivo_recusa: string | null;
  projeto_nome: string | null;
};

function dataBr(d: string | null) {
  return d ? new Date(d).toLocaleDateString("pt-BR") : "—";
}

export default function Projetos() {
  const perfil = usePerfilRiscos();
  const [projetos, setProjetos] = useState<Projeto[] | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [novo, setNovo] = useState<{ nome: string; descricao: string } | null>(null);
  const [editando, setEditando] = useState<{ id: number; nome: string; descricao: string } | null>(null);
  const [decisao, setDecisao] = useState<{ id: number; tipo: "Aprovada" | "Recusada"; nome: string; motivo: string } | null>(null);
  const [agindo, setAgindo] = useState(false);
  const [mostrarInativos, setMostrarInativos] = useState(true);

  const carregar = useCallback(() => {
    Promise.all([fetch("/api/projetos?detalhes=1").then((r) => r.json()), fetch("/api/projetos/solicitacoes").then((r) => r.json())])
      .then(([p, s]) => {
        if (p.error) throw new Error(p.error);
        setProjetos(p.projetos || []);
        setSolicitacoes(s.solicitacoes || []);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar os projetos."));
  }, []);
  useEffect(() => {
    if (perfil.carregado && perfil.permissoes.gerirUsuarios) carregar();
  }, [perfil.carregado, perfil.permissoes.gerirUsuarios, carregar]);

  async function chamar(url: string, metodo: string, corpo: unknown, ok: string) {
    setAgindo(true);
    setMsg(null);
    try {
      const r = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ ok: true, texto: ok });
      carregar();
      return true;
    } catch (e: any) {
      setMsg({ ok: false, texto: e.message || "Não foi possível concluir." });
      return false;
    } finally {
      setAgindo(false);
    }
  }

  if (perfil.carregado && !perfil.permissoes.gerirUsuarios) {
    return (
      <>
        <SemPermissao mensagem="Só Administrador e CISO cadastram projetos. Se precisar de um projeto que não está na lista, use “Solicitar inclusão” embaixo do campo Projeto nos cadastros." />
        <Footer />
      </>
    );
  }

  const pendentes = solicitacoes.filter((s) => s.situacao === "Pendente");
  const decididas = solicitacoes.filter((s) => s.situacao !== "Pendente").slice(0, 15);
  const lista = (projetos ?? []).filter((p) => mostrarInativos || p.ativo);
  const erroNovo = novo ? validarNomeProjeto(novo.nome) || (projetoComMesmoNome(normalizarNomeProjeto(novo.nome), projetos ?? []) ? "Já existe um projeto com esse nome." : null) : null;
  const erroEdicao = editando ? validarNomeProjeto(editando.nome) || (projetoComMesmoNome(normalizarNomeProjeto(editando.nome), projetos ?? [], editando.id) ? "Já existe um projeto com esse nome." : null) : null;

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Administração</span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <h1>Projetos</h1>
              <p className="lede">
                Projetos usados em riscos, ativos críticos e assessments. Quem não acha um projeto na lista pede a inclusão
                pelo próprio cadastro; as solicitações aparecem aqui. Projetos não são excluídos: desative para tirá-los das
                listas de cadastro sem perder o histórico.
              </p>
            </div>
            {!novo && <button className="btn-primary" onClick={() => { setNovo({ nome: "", descricao: "" }); setMsg(null); }}>+ Novo projeto</button>}
          </div>

          {msg && (
            <div className="dash-panel" style={{ marginTop: "1.25rem", borderLeft: `4px solid ${msg.ok ? "var(--success)" : "var(--danger)"}` }}>
              <div className="dash-panel-body">{msg.texto}</div>
            </div>
          )}
          {erro && <div className="error-banner" style={{ marginTop: "1.25rem" }}><span className="success-text">{erro}</span></div>}

          {novo && (
            <div className="dash-panel" style={{ marginTop: "1.25rem" }}>
              <div className="dash-panel-header">Novo projeto</div>
              <div className="dash-panel-body">
                <div className="form-field">
                  <label htmlFor="pjNome">Nome</label>
                  <input id="pjNome" value={novo.nome} maxLength={120} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
                </div>
                <div className="form-field">
                  <label htmlFor="pjDesc">Descrição (opcional)</label>
                  <textarea id="pjDesc" rows={2} value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} />
                </div>
                {novo.nome && erroNovo && <p style={{ color: "var(--danger)", margin: "0 0 0.5rem" }}>{erroNovo}</p>}
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    className="btn-primary"
                    disabled={!!erroNovo || agindo}
                    onClick={async () => (await chamar("/api/projetos", "POST", novo, `Projeto "${normalizarNomeProjeto(novo.nome)}" cadastrado.`)) && setNovo(null)}
                  >
                    Cadastrar projeto
                  </button>
                  <button className="status-tag" onClick={() => setNovo(null)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          <div className="dash-panel" style={{ marginTop: "1.5rem", borderLeft: pendentes.length ? "4px solid var(--warning)" : undefined }}>
            <div className="dash-panel-header">Solicitações de inclusão pendentes ({pendentes.length})</div>
            <div className="dash-panel-body">
              {pendentes.length === 0 ? (
                <p className="text-muted" style={{ margin: 0 }}>Nenhuma solicitação aguardando decisão.</p>
              ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {pendentes.map((s) => {
                    const proprio = s.solicitado_por_email.toLowerCase() === perfil.email.toLowerCase();
                    const parecido = projetoComMesmoNome(s.nome, projetos ?? []);
                    const emDecisao = decisao?.id === s.id ? decisao : null;
                    return (
                      <div key={s.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.75rem 1rem" }}>
                        <strong>{s.nome}</strong>
                        <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                          Pedido por {s.solicitado_por_nome || s.solicitado_por_email} em {dataBr(s.solicitado_em)}
                        </div>
                        <p style={{ margin: "0.35rem 0" }}>{s.justificativa}</p>
                        {parecido && (
                          <p style={{ margin: "0 0 0.35rem", color: "var(--warning-text)", fontSize: "0.85rem" }}>
                            Já existe o projeto “{parecido.nome}”{parecido.ativo ? "" : " (inativo)"}. Aprovar vai apontar para ele{parecido.ativo ? "" : " e reativá-lo"}.
                          </p>
                        )}
                        {proprio ? (
                          <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Você fez este pedido; outro Administrador ou CISO decide.</p>
                        ) : emDecisao ? (
                          <div>
                            {emDecisao.tipo === "Aprovada" && !parecido && (
                              <div className="form-field" style={{ marginBottom: "0.5rem" }}>
                                <label htmlFor={`apNome-${s.id}`}>Nome do projeto (ajuste se precisar)</label>
                                <input id={`apNome-${s.id}`} value={emDecisao.nome} maxLength={120} onChange={(e) => setDecisao({ ...emDecisao, nome: e.target.value })} />
                              </div>
                            )}
                            {emDecisao.tipo === "Recusada" && (
                              <div className="form-field" style={{ marginBottom: "0.5rem" }}>
                                <label htmlFor={`rcMotivo-${s.id}`}>Motivo da recusa</label>
                                <textarea id={`rcMotivo-${s.id}`} rows={2} value={emDecisao.motivo} onChange={(e) => setDecisao({ ...emDecisao, motivo: e.target.value })} />
                              </div>
                            )}
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button
                                className="btn-primary"
                                disabled={agindo || (emDecisao.tipo === "Recusada" ? emDecisao.motivo.trim().length < 5 : !parecido && !!validarNomeProjeto(emDecisao.nome))}
                                onClick={async () => {
                                  const corpo =
                                    emDecisao.tipo === "Recusada"
                                      ? { decisao: "Recusada", motivo: emDecisao.motivo }
                                      : parecido
                                        ? { decisao: "Aprovada", projetoExistenteId: parecido.id }
                                        : { decisao: "Aprovada", nome: emDecisao.nome };
                                  const ok = await chamar(`/api/projetos/solicitacoes/${s.id}`, "POST", corpo, emDecisao.tipo === "Recusada" ? "Solicitação recusada." : "Solicitação aprovada; o projeto já aparece nas listas.");
                                  if (ok) setDecisao(null);
                                }}
                              >
                                Confirmar {emDecisao.tipo === "Recusada" ? "recusa" : "aprovação"}
                              </button>
                              <button className="status-tag" onClick={() => setDecisao(null)}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                            <button className="btn-primary" onClick={() => setDecisao({ id: s.id, tipo: "Aprovada", nome: s.nome, motivo: "" })}>Aprovar</button>
                            <button className="status-tag" onClick={() => setDecisao({ id: s.id, tipo: "Recusada", nome: s.nome, motivo: "" })}>Recusar</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
            <div className="dash-panel-header">
              {lista.length} projeto{lista.length === 1 ? "" : "s"}
              <label style={{ marginLeft: "1rem", fontWeight: 400, fontSize: "0.85rem", display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} /> mostrar inativos
              </label>
            </div>
            <div className="dash-panel-body">
              {!projetos && !erro && <p className="text-muted" style={{ margin: 0 }}>Carregando...</p>}
              {projetos && (
                <div className="dash-table-scroll">
                  <table className="dash-table">
                    <thead>
                      <tr><th>Projeto</th><th>Situação</th><th style={{ textAlign: "right" }}>Riscos</th><th style={{ textAlign: "right" }}>Ativos</th><th style={{ textAlign: "right" }}>Assessments</th><th></th></tr>
                    </thead>
                    <tbody>
                      {lista.map((p) => (
                        <tr key={p.id} style={p.ativo ? undefined : { opacity: 0.6 }}>
                          <td style={{ whiteSpace: "normal", minWidth: "16rem" }}>
                            {editando?.id === p.id ? (
                              <div>
                                <input aria-label="Nome do projeto" value={editando.nome} maxLength={120} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} style={{ width: "100%" }} />
                                <textarea aria-label="Descrição" rows={2} value={editando.descricao} onChange={(e) => setEditando({ ...editando, descricao: e.target.value })} style={{ width: "100%", marginTop: "0.35rem" }} placeholder="Descrição (opcional)" />
                                {erroEdicao && <div style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{erroEdicao}</div>}
                              </div>
                            ) : (
                              <>
                                <strong>{p.nome}</strong>
                                {p.descricao && <div className="text-muted" style={{ fontSize: "0.8rem" }}>{p.descricao}</div>}
                              </>
                            )}
                          </td>
                          <td style={{ color: p.ativo ? "var(--success)" : "var(--text-muted)", fontWeight: 600 }}>{p.ativo ? "Ativo" : "Inativo"}</td>
                          <td style={{ textAlign: "right" }}>{p.riscos}</td>
                          <td style={{ textAlign: "right" }}>{p.ativos_criticos}</td>
                          <td style={{ textAlign: "right" }}>{p.assessments}</td>
                          <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                            {editando?.id === p.id ? (
                              <>
                                <button
                                  className="btn-primary"
                                  disabled={!!erroEdicao || agindo}
                                  onClick={async () => (await chamar(`/api/projetos/${p.id}`, "PATCH", { nome: editando.nome, descricao: editando.descricao }, "Projeto atualizado.")) && setEditando(null)}
                                >
                                  Salvar
                                </button>{" "}
                                <button className="status-tag" onClick={() => setEditando(null)}>Cancelar</button>
                              </>
                            ) : (
                              <>
                                <button className="status-tag" onClick={() => setEditando({ id: p.id, nome: p.nome, descricao: p.descricao ?? "" })}>Editar</button>{" "}
                                <button
                                  className="status-tag"
                                  disabled={agindo}
                                  onClick={() => chamar(`/api/projetos/${p.id}`, "PATCH", { ativo: !p.ativo }, p.ativo ? `"${p.nome}" desativado: some das listas de cadastro.` : `"${p.nome}" reativado.`)}
                                >
                                  {p.ativo ? "Desativar" : "Reativar"}
                                </button>
                              </>
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

          {decididas.length > 0 && (
            <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
              <div className="dash-panel-header">Solicitações decididas (últimas {decididas.length})</div>
              <div className="dash-panel-body">
                <div className="dash-table-scroll">
                  <table className="dash-table">
                    <thead>
                      <tr><th>Pedido</th><th>Solicitante</th><th>Decisão</th><th>Por</th><th>Em</th></tr>
                    </thead>
                    <tbody>
                      {decididas.map((s) => (
                        <tr key={s.id}>
                          <td style={{ whiteSpace: "normal" }}>{s.nome}</td>
                          <td>{s.solicitado_por_nome || s.solicitado_por_email}</td>
                          <td style={{ whiteSpace: "normal", color: s.situacao === "Aprovada" ? "var(--success)" : "var(--danger)" }}>
                            {s.situacao}
                            {s.situacao === "Aprovada" && s.projeto_nome && s.projeto_nome !== s.nome && <span className="text-muted"> como “{s.projeto_nome}”</span>}
                            {s.situacao === "Recusada" && s.motivo_recusa && <div className="text-muted" style={{ fontSize: "0.8rem" }}>{s.motivo_recusa}</div>}
                          </td>
                          <td>{s.decidido_por_nome || "—"}</td>
                          <td>{dataBr(s.decidido_em)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
