"use client";

import { useState, useEffect, FormEvent } from "react";
import Footer from "@/components/Footer";

type TipoChamado = { id: number; nome: string; sla_horas: number };

export default function TiposDeChamado() {
  const [tipos, setTipos] = useState<TipoChamado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  function carregarTipos() {
    setCarregando(true);
    fetch("/api/tipos-chamado")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setTipos(d.tipos || []);
      })
      .catch((e) => setErroLista(e.message || "Erro ao carregar tipos de chamado."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregarTipos();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      nome: formData.get("nome"),
      slaHoras: formData.get("slaHoras"),
    };

    setEnviando(true);
    try {
      const res = await fetch("/api/tipos-chamado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Não foi possível cadastrar o tipo de chamado.");
      form.reset();
      carregarTipos();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Condomínio</span>
          <h1>Tipos de Chamado</h1>
          <p className="lede">
            Categorias de chamado disponíveis no formulário de abertura, cada
            uma com seu prazo de atendimento (SLA) em horas. Só o síndico ou
            conselheiro pode cadastrar.
          </p>

          <form className="risk-form" onSubmit={handleSubmit}>
            <fieldset className="form-section">
              <legend>Cadastrar Tipo de Chamado</legend>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="nome">Nome</label>
                  <input id="nome" name="nome" type="text" required placeholder="Ex.: Hidráulica" />
                </div>
                <div className="form-field">
                  <label htmlFor="slaHoras">SLA (horas)</label>
                  <input id="slaHoras" name="slaHoras" type="number" min="1" step="1" required placeholder="Ex.: 48" />
                  <p className="field-helper">
                    Prazo de atendimento, contado a partir da abertura do chamado.
                  </p>
                </div>
              </div>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={enviando}>
                {enviando ? "Cadastrando..." : "Cadastrar"}
              </button>
            </div>

            {erro && (
              <div className="error-banner">
                <span className="success-icon error-icon">!</span>
                <span className="success-text">
                  <strong>Não foi possível cadastrar.</strong>
                  <span>{erro}</span>
                </span>
              </div>
            )}
          </form>

          {carregando && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}

          {erroLista && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">{erroLista}</span>
            </div>
          )}

          {!carregando && !erroLista && (
            <div className="dash-panel" style={{ marginTop: "2.5rem" }}>
              <div className="dash-panel-header">
                {tipos.length} tipo{tipos.length !== 1 ? "s" : ""} cadastrado{tipos.length !== 1 ? "s" : ""}
              </div>
              <div className="dash-panel-body">
                {tipos.length === 0 ? (
                  <p className="text-muted" style={{ margin: 0 }}>Nenhum tipo de chamado cadastrado ainda.</p>
                ) : (
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>SLA (horas)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tipos.map((t) => (
                        <tr key={t.id}>
                          <td>{t.nome}</td>
                          <td>{t.sla_horas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
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
