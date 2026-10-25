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

export default function CatalogoDeServicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  function carregarServicos() {
    setCarregando(true);
    fetch("/api/catalogo-servicos")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setServicos(d.servicos || []);
      })
      .catch((e) => setErroLista(e.message || "Erro ao carregar o catálogo de serviços."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregarServicos();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      nome: formData.get("nome"),
      categoria: formData.get("categoria"),
      urgencia: formData.get("urgencia"),
      tipo: formData.get("tipo"),
      slaHoras: formData.get("slaHoras"),
    };

    setEnviando(true);
    try {
      const res = await fetch("/api/catalogo-servicos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Não foi possível cadastrar o serviço.");
      form.reset();
      carregarServicos();
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
          <h1>Catálogo de Serviços</h1>
          <p className="lede">
            Serviços disponíveis no formulário de abertura de chamado. A
            urgência e o SLA são definidos aqui, não mais pelo condômino.
          </p>

          <form className="risk-form" onSubmit={handleSubmit}>
            <fieldset className="form-section">
              <legend>Cadastrar Serviço</legend>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="nome">Nome (serviço)</label>
                  <input id="nome" name="nome" type="text" required placeholder="Ex.: Vazamento hidráulico" />
                </div>
                <div className="form-field">
                  <label htmlFor="categoria">Categoria</label>
                  <input id="categoria" name="categoria" type="text" placeholder="Ex.: Hidráulica, Elétrica, Limpeza" />
                </div>
                <div className="form-field">
                  <label htmlFor="urgencia">Urgência</label>
                  <select id="urgencia" name="urgencia" defaultValue="" required>
                    <option value="" disabled>Selecione</option>
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="tipo">Tipo</label>
                  <select id="tipo" name="tipo" defaultValue="" required>
                    <option value="" disabled>Selecione</option>
                    <option value="Problema">Problema</option>
                    <option value="Demanda">Demanda</option>
                  </select>
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
                {servicos.length} serviço{servicos.length !== 1 ? "s" : ""} cadastrado{servicos.length !== 1 ? "s" : ""}
              </div>
              <div className="dash-panel-body">
                {servicos.length === 0 ? (
                  <p className="text-muted" style={{ margin: 0 }}>Nenhum serviço cadastrado ainda.</p>
                ) : (
                  <div className="dash-table-scroll">
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Nome (serviço)</th>
                          <th>Categoria</th>
                          <th>Tipo</th>
                          <th>Urgência</th>
                          <th>SLA (horas)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {servicos.map((s) => (
                          <tr key={s.id}>
                            <td>{s.nome}</td>
                            <td>{s.categoria || "—"}</td>
                            <td>{s.tipo ? <span className="status-tag">{s.tipo}</span> : "—"}</td>
                            <td>{s.urgencia ? <span className={classeUrgencia(s.urgencia)}>{s.urgencia}</span> : "—"}</td>
                            <td>{s.sla_horas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
