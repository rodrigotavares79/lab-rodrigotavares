"use client";

import { useCallback, useEffect, useState } from "react";
import Footer from "@/components/Footer";
import { usePerfilRiscos, SemPermissao } from "@/components/riscos/PermissoesRiscos";
import { AREAS_ASSESSMENT, validarPergunta } from "@/lib/assessmentRegras";

// B29 · Administração → Perguntas dos assessments: banco de perguntas por
// área. Cadastrar, corrigir (só sem respostas) e ativar/desativar. Pergunta
// não se exclui, para não mudar assessments já respondidos.

type Pergunta = { id: number; codigo: string; area: string; texto: string; tipo: "objetiva" | "descritiva"; ativa: boolean; respostas: number };
type Form = { area: string; texto: string; tipo: string };

export default function PerguntasAssessment() {
  const perfil = usePerfilRiscos();
  const [perguntas, setPerguntas] = useState<Pergunta[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [nova, setNova] = useState<Form | null>(null);
  const [editando, setEditando] = useState<(Form & { id: number }) | null>(null);
  const [area, setArea] = useState("");
  const [busca, setBusca] = useState("");
  const [mostrarInativas, setMostrarInativas] = useState(false);
  const [agindo, setAgindo] = useState(false);

  const carregar = useCallback(() => {
    fetch("/api/assessments/perguntas")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setPerguntas(d.perguntas || []);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar as perguntas."));
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
      setMsg({ ok: true, texto: typeof ok === "string" ? ok.replace("{codigo}", d.pergunta?.codigo ?? "") : ok });
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
        <SemPermissao mensagem="Só Administrador e CISO alteram o banco de perguntas dos assessments." />
        <Footer />
      </>
    );
  }

  const termo = busca.trim().toLowerCase();
  const visiveis = (perguntas ?? []).filter(
    (p) => (mostrarInativas || p.ativa) && (!area || p.area === area) && (!termo || `${p.codigo} ${p.texto}`.toLowerCase().includes(termo))
  );
  const ativas = (perguntas ?? []).filter((p) => p.ativa).length;
  const erroNova = nova ? validarPergunta(nova) : null;
  const erroEdicao = editando ? validarPergunta(editando) : null;

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Administração</span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <h1>Perguntas dos assessments</h1>
              <p className="lede">
                {perguntas ? `${ativas} perguntas ativas em ${AREAS_ASSESSMENT.length} áreas. ` : ""}
                Pergunta nova entra nos assessments novos e nos que estão em Rascunho naquela área. Depois de respondida,
                a pergunta não muda de texto: desative e cadastre outra.
              </p>
            </div>
            {!nova && <button className="btn-primary" onClick={() => { setNova({ area: area || AREAS_ASSESSMENT[0], texto: "", tipo: "objetiva" }); setMsg(null); }}>+ Nova pergunta</button>}
          </div>

          {msg && (
            <div className="dash-panel" style={{ marginTop: "1.25rem", borderLeft: `4px solid ${msg.ok ? "var(--success)" : "var(--danger)"}` }}>
              <div className="dash-panel-body">{msg.texto}</div>
            </div>
          )}
          {erro && <div className="error-banner" style={{ marginTop: "1.25rem" }}><span className="success-text">{erro}</span></div>}

          {nova && (
            <div className="dash-panel" style={{ marginTop: "1.25rem" }}>
              <div className="dash-panel-header">Nova pergunta</div>
              <div className="dash-panel-body">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "0 1rem" }}>
                  <div className="form-field">
                    <label htmlFor="npArea">Área</label>
                    <select id="npArea" value={nova.area} onChange={(e) => setNova({ ...nova, area: e.target.value })}>
                      {AREAS_ASSESSMENT.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="npTipo">Tipo</label>
                    <select id="npTipo" value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value })}>
                      <option value="objetiva">Objetiva (Sim / Não / Parcial / N/A)</option>
                      <option value="descritiva">Descritiva (texto)</option>
                    </select>
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="npTexto">Pergunta</label>
                  <textarea id="npTexto" rows={2} maxLength={500} value={nova.texto} onChange={(e) => setNova({ ...nova, texto: e.target.value })} />
                </div>
                {nova.texto && erroNova && <p style={{ color: "var(--danger)", margin: "0 0 0.5rem" }}>{erroNova}</p>}
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button className="btn-primary" disabled={!!erroNova || agindo} onClick={async () => (await chamar("/api/assessments/perguntas", "POST", nova, "Pergunta {codigo} cadastrada.")) && setNova(null)}>
                    Cadastrar pergunta
                  </button>
                  <button className="status-tag" onClick={() => setNova(null)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginTop: "1.5rem" }}>
            <select aria-label="Filtrar por área" value={area} onChange={(e) => setArea(e.target.value)} style={{ minHeight: "2.5rem" }}>
              <option value="">Todas as áreas</option>
              {AREAS_ASSESSMENT.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <input type="search" aria-label="Buscar pergunta" placeholder="Buscar por código ou texto" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ minHeight: "2.5rem", flex: "1 1 14rem", maxWidth: "22rem" }} />
            <label style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center", fontSize: "0.9rem" }}>
              <input type="checkbox" checked={mostrarInativas} onChange={(e) => setMostrarInativas(e.target.checked)} /> mostrar inativas
            </label>
          </div>

          <div className="dash-panel" style={{ marginTop: "1rem" }}>
            <div className="dash-panel-header">{visiveis.length} pergunta{visiveis.length === 1 ? "" : "s"}</div>
            <div className="dash-panel-body">
              {!perguntas && !erro && <p className="text-muted" style={{ margin: 0 }}>Carregando...</p>}
              {perguntas && visiveis.length === 0 && <p className="text-muted" style={{ margin: 0 }}>Nenhuma pergunta neste filtro.</p>}
              {perguntas && visiveis.length > 0 && (
                <div className="dash-table-scroll">
                  <table className="dash-table">
                    <thead>
                      <tr><th>Código</th><th>Pergunta</th><th>Tipo</th><th style={{ textAlign: "right" }}>Respostas</th><th></th></tr>
                    </thead>
                    <tbody>
                      {visiveis.map((p) => (
                        <tr key={p.id} style={p.ativa ? undefined : { opacity: 0.55 }}>
                          <td style={{ fontVariantNumeric: "tabular-nums" }}>{p.codigo}</td>
                          <td style={{ whiteSpace: "normal", minWidth: "20rem" }}>
                            {editando?.id === p.id ? (
                              <div>
                                <textarea aria-label="Texto da pergunta" rows={2} maxLength={500} value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} style={{ width: "100%" }} />
                                <select aria-label="Tipo" value={editando.tipo} onChange={(e) => setEditando({ ...editando, tipo: e.target.value })} style={{ marginTop: "0.35rem" }}>
                                  <option value="objetiva">Objetiva</option>
                                  <option value="descritiva">Descritiva</option>
                                </select>
                                {erroEdicao && <div style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{erroEdicao}</div>}
                              </div>
                            ) : (
                              <>
                                {p.texto}
                                {!area && <div className="text-muted" style={{ fontSize: "0.75rem" }}>{p.area}</div>}
                              </>
                            )}
                          </td>
                          <td>{p.tipo === "objetiva" ? "Objetiva" : "Descritiva"}{!p.ativa && <div className="text-muted" style={{ fontSize: "0.75rem" }}>inativa</div>}</td>
                          <td style={{ textAlign: "right" }}>{p.respostas}</td>
                          <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                            {editando?.id === p.id ? (
                              <>
                                <button className="btn-primary" disabled={!!erroEdicao || agindo} onClick={async () => (await chamar(`/api/assessments/perguntas/${p.id}`, "PATCH", { texto: editando.texto, tipo: editando.tipo }, `Pergunta ${p.codigo} atualizada.`)) && setEditando(null)}>
                                  Salvar
                                </button>{" "}
                                <button className="status-tag" onClick={() => setEditando(null)}>Cancelar</button>
                              </>
                            ) : (
                              <>
                                {p.respostas === 0 && (
                                  <button className="status-tag" onClick={() => setEditando({ id: p.id, area: p.area, texto: p.texto, tipo: p.tipo })}>Editar</button>
                                )}{" "}
                                <button className="status-tag" disabled={agindo} onClick={() => chamar(`/api/assessments/perguntas/${p.id}`, "PATCH", { ativa: !p.ativa }, p.ativa ? `Pergunta ${p.codigo} desativada.` : `Pergunta ${p.codigo} reativada.`)}>
                                  {p.ativa ? "Desativar" : "Reativar"}
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
        </div>
      </section>
      <Footer />
    </>
  );
}
