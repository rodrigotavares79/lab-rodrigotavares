"use client";

import { useEffect, useMemo, useState } from "react";
import Footer from "@/components/Footer";

// B14 · Contatos de negócio: pessoas que podem ser donas de risco sem ter
// acesso ao sistema (ex.: gestor de uma área de negócio). Um risco com dono
// externo tem sempre um ponto focal Analista GRC, que atualiza o risco.

type Contato = {
  id: number;
  nome: string;
  email: string;
  area: string;
  cargo: string | null;
  ativo: boolean;
  riscos: number;
};
type Form = { id: number | null; nome: string; email: string; area: string; cargo: string };
const VAZIO: Form = { id: null, nome: "", email: "", area: "", cargo: "" };

const botaoLink: React.CSSProperties = {
  background: "none",
  border: 0,
  padding: 0,
  color: "var(--accent)",
  cursor: "pointer",
  font: "inherit",
};

export default function ContatosRisco() {
  const [contatos, setContatos] = useState<Contato[] | null>(null);
  const [podeEditar, setPodeEditar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  function carregar() {
    fetch("/api/contatos-risco")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setContatos(d.contatos || []);
        setPodeEditar(!!d.podeEditar);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar os contatos."));
  }
  useEffect(carregar, []);

  const areas = useMemo(() => [...new Set((contatos || []).map((c) => c.area))].sort(), [contatos]);
  const visiveis = (contatos || []).filter((c) => mostrarInativos || c.ativo);

  async function salvar() {
    if (!form) return;
    setSalvando(true);
    setErroForm(null);
    try {
      const r = await fetch(form.id ? `/api/contatos-risco/${form.id}` : "/api/contatos-risco", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Não foi possível salvar.");
      setForm(null);
      carregar();
    } catch (e: any) {
      setErroForm(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(c: Contato) {
    const r = await fetch(`/api/contatos-risco/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !c.ativo }),
    });
    if (r.ok) carregar();
  }

  const campo = (k: keyof Omit<Form, "id">) => ({
    value: form?.[k] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f)),
  });

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <h1>Contatos de negócio</h1>
              <p className="lede">
                Pessoas que podem ser donas de risco sem ter acesso ao sistema. Um risco com dono externo tem
                sempre um ponto focal Analista GRC, que atualiza o risco e responde pelas pendências.
              </p>
            </div>
            {podeEditar && !form && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setErroForm(null);
                  setForm(VAZIO);
                }}
              >
                + Novo contato
              </button>
            )}
          </div>

          {form && (
            <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
              <div className="dash-panel-header">{form.id ? "Editar contato" : "Novo contato"}</div>
              <div className="dash-panel-body">
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor="ctNome">Nome *</label>
                    <input id="ctNome" type="text" maxLength={150} {...campo("nome")} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="ctEmail">E-mail *</label>
                    <input id="ctEmail" type="email" maxLength={200} {...campo("email")} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="ctArea">Área *</label>
                    <input id="ctArea" type="text" maxLength={120} list="ctAreas" {...campo("area")} />
                    <datalist id="ctAreas">
                      {areas.map((a) => (
                        <option key={a} value={a} />
                      ))}
                    </datalist>
                  </div>
                  <div className="form-field">
                    <label htmlFor="ctCargo">Cargo</label>
                    <input id="ctCargo" type="text" maxLength={120} {...campo("cargo")} />
                  </div>
                </div>
                {form.id && (
                  <p className="field-helper">Nome e e-mail também são atualizados nos riscos de que este contato é dono.</p>
                )}
                {erroForm && (
                  <p className="field-helper" style={{ color: "var(--danger)" }}>
                    {erroForm}
                  </p>
                )}
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
                  <button type="button" className="btn-primary" onClick={salvar} disabled={salvando}>
                    {salvando ? "Salvando..." : "Salvar"}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setForm(null)} disabled={salvando}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "1.5rem" }}>
            <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} />
            Mostrar inativos
          </label>

          {!contatos && !erro && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}
          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar os contatos.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {contatos && (
            <div className="dash-panel" style={{ marginTop: "1rem" }}>
              <div className="dash-panel-header">
                {visiveis.length} {visiveis.length === 1 ? "contato" : "contatos"}
              </div>
              <div className="dash-panel-body">
                {visiveis.length === 0 ? (
                  <p className="text-muted" style={{ margin: 0 }}>Nenhum contato cadastrado ainda.</p>
                ) : (
                  <div className="dash-table-scroll">
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>E-mail</th>
                          <th>Área</th>
                          <th>Cargo</th>
                          <th>Riscos</th>
                          {podeEditar && <th></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {visiveis.map((c) => (
                          <tr key={c.id} style={c.ativo ? undefined : { opacity: 0.55 }}>
                            <td>
                              <strong>{c.nome}</strong>
                              {!c.ativo && <span className="text-muted"> · inativo</span>}
                            </td>
                            <td>{c.email}</td>
                            <td>{c.area}</td>
                            <td>{c.cargo || "—"}</td>
                            <td>
                              {c.riscos > 0 ? (
                                <a href={`/seguranca/gestao-de-riscos/riscos?contato=${c.id}`} title="Ver os riscos deste contato">
                                  {c.riscos}
                                </a>
                              ) : (
                                0
                              )}
                            </td>
                            {podeEditar && (
                              <td style={{ whiteSpace: "nowrap" }}>
                                <button
                                  type="button"
                                  style={botaoLink}
                                  onClick={() => {
                                    setErroForm(null);
                                    setForm({ id: c.id, nome: c.nome, email: c.email, area: c.area, cargo: c.cargo || "" });
                                  }}
                                >
                                  Editar
                                </button>
                                {" · "}
                                <button type="button" style={botaoLink} onClick={() => alternar(c)}>
                                  {c.ativo ? "Inativar" : "Reativar"}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <a href="/seguranca/gestao-de-riscos" className="status-tag" style={{ marginTop: "2.5rem", display: "inline-block" }}>
            ← Voltar para Gestão de Riscos
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
