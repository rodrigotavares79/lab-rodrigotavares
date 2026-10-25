"use client";

import { useState, useEffect, FormEvent } from "react";
import Footer from "@/components/Footer";

type Servico = {
  id: number;
  nome: string;
  categoria: string | null;
  urgencia: string | null;
  tipo: string | null;
  sla_horas: number;
};

function classeUrgencia(urgencia: string): string {
  if (urgencia === "Urgente") return "badge badge-critico";
  if (urgencia === "Média") return "badge badge-medio";
  return "badge badge-baixo";
}

export default function NovoChamado() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoId, setServicoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/catalogo-servicos")
      .then((r) => r.json())
      .then((d) => setServicos(d.servicos || []))
      .catch(() => setServicos([]));
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviado(false);

    if (!servicoId) {
      setErro("Selecione um serviço.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      titulo: formData.get("titulo"),
      descricao: formData.get("descricao"),
      servicoId,
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
      setServicoId("");
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
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>Serviço</legend>
              <p className="field-helper" style={{ marginTop: 0 }}>
                A urgência e o prazo de atendimento (SLA) vêm do serviço escolhido.
              </p>

              {servicos.length === 0 ? (
                <p className="field-helper">
                  Nenhum serviço cadastrado ainda — peça ao síndico para
                  cadastrar em "Catálogo de Serviços".
                </p>
              ) : (
                <div className="servico-list" role="radiogroup" aria-label="Selecione o serviço">
                  {servicos.map((s) => (
                    <label key={s.id} className="servico-item">
                      <input
                        type="radio"
                        name="servico"
                        value={s.id}
                        checked={servicoId === String(s.id)}
                        onChange={() => setServicoId(String(s.id))}
                        required
                      />
                      <div className="servico-item-card">
                        <div className="servico-item-card-top">
                          <div>
                            <div className="servico-item-nome">{s.nome}</div>
                            {s.categoria && <div className="servico-item-categoria">{s.categoria}</div>}
                          </div>
                          <div className="servico-item-badges">
                            {s.urgencia && <span className={classeUrgencia(s.urgencia)}>{s.urgencia}</span>}
                            {s.tipo && <span className="status-tag">{s.tipo}</span>}
                          </div>
                        </div>
                        <div className="servico-item-sla">SLA: {s.sla_horas}h</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
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
