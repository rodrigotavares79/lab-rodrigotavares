"use client";

import { useState, FormEvent } from "react";
import Footer from "@/components/Footer";

const NIVEIS = [
  { value: 1, label: "1 — Muito Baixo" },
  { value: 2, label: "2 — Baixo" },
  { value: 3, label: "3 — Médio" },
  { value: 4, label: "4 — Alto" },
  { value: 5, label: "5 — Muito Alto" },
];

function classificarImpacto(score: number) {
  if (score <= 4) return { label: "Baixo", className: "badge-baixo" };
  if (score <= 9) return { label: "Médio", className: "badge-medio" };
  if (score <= 15) return { label: "Alto", className: "badge-alto" };
  return { label: "Crítico", className: "badge-critico" };
}

export default function CadastroDeRiscos() {
  const [impacto, setImpacto] = useState(0);
  const [probabilidade, setProbabilidade] = useState(0);
  const [enviado, setEnviado] = useState(false);

  const score = impacto && probabilidade ? impacto * probabilidade : 0;
  const classificacao = score ? classificarImpacto(score) : null;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviado(true);
  }

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Cadastro de Riscos</h1>
          <p className="lede">
            Formulário de cadastro de riscos de TI — identificação e análise.
          </p>

          <form className="risk-form" onSubmit={handleSubmit}>
            <fieldset className="form-section">
              <legend>Identificação do Risco</legend>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="categoria">Categoria do Risco</label>
                  <select id="categoria" name="categoria" defaultValue="">
                    <option value="" disabled>Selecione</option>
                    <option>Tecnológico</option>
                    <option>Operacional</option>
                    <option>Estratégico</option>
                    <option>Financeiro</option>
                    <option>Conformidade / Regulatório</option>
                    <option>Segurança da Informação</option>
                    <option>Reputacional</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="gatilho">Ponto de Gatilho</label>
                  <input
                    id="gatilho"
                    name="gatilho"
                    type="text"
                    placeholder="O que dispara esse risco"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="levantadoPor">Levantado Por</label>
                  <input
                    id="levantadoPor"
                    name="levantadoPor"
                    type="text"
                    placeholder="Nome do responsável"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="dataLevantamento">Data de Levantamento</label>
                  <input id="dataLevantamento" name="dataLevantamento" type="date" />
                </div>

                <div className="form-field">
                  <label htmlFor="fonte">Fonte</label>
                  <select id="fonte" name="fonte" defaultValue="">
                    <option value="" disabled>Selecione</option>
                    <option>Auditoria Interna</option>
                    <option>Auditoria Externa</option>
                    <option>Incidente</option>
                    <option>Análise de Processo</option>
                    <option>Stakeholder</option>
                    <option>Avaliação de Terceiros</option>
                    <option>Outro</option>
                  </select>
                </div>

                <div className="form-field form-field-wide">
                  <label htmlFor="resultado">Resultado Potencial</label>
                  <textarea
                    id="resultado"
                    name="resultado"
                    rows={3}
                    placeholder="Descreva o possível impacto caso o risco se concretize"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>Análise do Risco</legend>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="impacto">Impacto</label>
                  <select
                    id="impacto"
                    name="impacto"
                    value={impacto || ""}
                    onChange={(e) => setImpacto(Number(e.target.value))}
                  >
                    <option value="" disabled>Selecione</option>
                    {NIVEIS.map((n) => (
                      <option key={n.value} value={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="probabilidade">Probabilidade</label>
                  <select
                    id="probabilidade"
                    name="probabilidade"
                    value={probabilidade || ""}
                    onChange={(e) => setProbabilidade(Number(e.target.value))}
                  >
                    <option value="" disabled>Selecione</option>
                    {NIVEIS.map((n) => (
                      <option key={n.value} value={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="matrixScore">Pontuação da Matriz</label>
                  <input
                    id="matrixScore"
                    name="matrixScore"
                    type="text"
                    value={score ? score : ""}
                    placeholder="Calculado automaticamente"
                    readOnly
                  />
                </div>

                <div className="form-field">
                  <label>Impacto Qualitativo</label>
                  {classificacao ? (
                    <span className={`badge ${classificacao.className}`}>
                      {classificacao.label}
                    </span>
                  ) : (
                    <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                      Selecione impacto e probabilidade
                    </span>
                  )}
                </div>
              </div>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Cadastrar Risco
              </button>
              {enviado && (
                <span className="form-note">
                  Front-end apenas — integração com base de dados em desenvolvimento.
                </span>
              )}
            </div>
          </form>

          <a
            href="/seguranca/gestao-de-riscos"
            className="status-tag"
            style={{ marginTop: "2.5rem", display: "inline-block" }}
          >
            ← Voltar para Gestão de Riscos
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
