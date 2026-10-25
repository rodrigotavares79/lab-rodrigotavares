"use client";

import { useState, useEffect, FormEvent } from "react";
import Footer from "@/components/Footer";

type TipoChamado = { id: number; nome: string; sla_horas: number };

export default function NovoChamado() {
  const [tipos, setTipos] = useState<TipoChamado[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tipos-chamado")
      .then((r) => r.json())
      .then((d) => setTipos(d.tipos || []))
      .catch(() => setTipos([]));
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviado(false);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      titulo: formData.get("titulo"),
      descricao: formData.get("descricao"),
      tipoId: formData.get("tipoId"),
      urgencia: formData.get("urgencia"),
    };

    setEnviando(true);
    try {
      const res = await fetch("/api/chamados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Não foi possível abrir o chamado.");
      setEnviado(true);
      form.reset();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao abrir o chamado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Condomínio</span>
          <h1>Abrir Chamado</h1>
          <p className="lede">
            Descreva o problema — o síndico será notificado e vai acompanhar a resolução.
          </p>

          <form className="risk-form" onSubmit={handleSubmit}>
            <fieldset className="form-section">
              <legend>Identificação do Problema</legend>
              <div className="form-grid">
                <div className="form-field form-field-wide">
                  <label htmlFor="titulo">Título</label>
                  <input
                    id="titulo"
                    name="titulo"
                    type="text"
                    required
                    placeholder="Ex.: Vazamento no teto da garagem"
                  />
                </div>

                <div className="form-field form-field-wide">
                  <label htmlFor="descricao">Descreva o problema</label>
                  <textarea
                    id="descricao"
                    name="descricao"
                    rows={4}
                    placeholder="Dê o máximo de detalhes possível: local exato, desde quando, etc."
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="tipoId">Tipo de Chamado</label>
                  <select id="tipoId" name="tipoId" defaultValue="" required>
                    <option value="" disabled>Selecione</option>
                    {tipos.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                  {tipos.length === 0 && (
                    <p className="field-helper">
                      Nenhum tipo cadastrado ainda — peça ao síndico para
                      cadastrar em "Tipos de Chamado".
                    </p>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="urgencia">Urgência</label>
                  <select id="urgencia" name="urgencia" defaultValue="">
                    <option value="" disabled>Selecione</option>
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={enviando}>
                {enviando ? "Enviando..." : "Abrir Chamado"}
              </button>
            </div>

            {enviado && (
              <div className="success-banner">
                <span className="success-icon">✓</span>
                <span className="success-text">
                  <strong>Chamado aberto com sucesso.</strong>
                  <span>Acompanhe o status em "Chamados".</span>
                </span>
              </div>
            )}

            {erro && (
              <div className="error-banner">
                <span className="success-icon error-icon">!</span>
                <span className="success-text">
                  <strong>Não foi possível abrir o chamado.</strong>
                  <span>{erro}</span>
                </span>
              </div>
            )}
          </form>

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
