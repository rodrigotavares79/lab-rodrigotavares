"use client";

import { useState, useEffect, FormEvent } from "react";
import Footer from "@/components/Footer";

type Fornecedor = {
  id: number;
  nome_fantasia: string;
  cnpj: string | null;
  categoria_servico: string | null;
  nome_contato: string | null;
  email: string | null;
  telefone: string | null;
};

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  function carregarFornecedores() {
    setCarregando(true);
    fetch("/api/fornecedores")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setFornecedores(d.fornecedores || []);
      })
      .catch((e) => setErroLista(e.message || "Erro ao carregar fornecedores."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregarFornecedores();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      nomeFantasia: formData.get("nomeFantasia"),
      cnpj: formData.get("cnpj"),
      categoriaServico: formData.get("categoriaServico"),
      nomeContato: formData.get("nomeContato"),
      email: formData.get("email"),
      telefone: formData.get("telefone"),
    };

    setEnviando(true);
    try {
      const res = await fetch("/api/fornecedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Não foi possível cadastrar o fornecedor.");
      form.reset();
      carregarFornecedores();
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
          <h1>Fornecedores</h1>
          <p className="lede">
            Empresas e contatos usados para atender os chamados do condomínio.
          </p>

          <form className="risk-form" onSubmit={handleSubmit}>
            <fieldset className="form-section">
              <legend>Cadastrar Fornecedor</legend>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="nomeFantasia">Nome Fantasia</label>
                  <input id="nomeFantasia" name="nomeFantasia" type="text" required />
                </div>
                <div className="form-field">
                  <label htmlFor="cnpj">CNPJ</label>
                  <input id="cnpj" name="cnpj" type="text" />
                </div>
                <div className="form-field">
                  <label htmlFor="categoriaServico">Categoria de Serviço</label>
                  <input id="categoriaServico" name="categoriaServico" type="text" placeholder="Ex.: Elétrica, Hidráulica, Limpeza" />
                </div>
                <div className="form-field">
                  <label htmlFor="nomeContato">Nome do Contato</label>
                  <input id="nomeContato" name="nomeContato" type="text" />
                </div>
                <div className="form-field">
                  <label htmlFor="email">E-mail</label>
                  <input id="email" name="email" type="email" />
                </div>
                <div className="form-field">
                  <label htmlFor="telefone">Telefone</label>
                  <input id="telefone" name="telefone" type="text" />
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
                {fornecedores.length} fornecedor{fornecedores.length !== 1 ? "es" : ""} cadastrado{fornecedores.length !== 1 ? "s" : ""}
              </div>
              <div className="dash-panel-body">
                {fornecedores.length === 0 ? (
                  <p className="text-muted" style={{ margin: 0 }}>Nenhum fornecedor cadastrado ainda.</p>
                ) : (
                  <div className="dash-table-scroll">
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Nome Fantasia</th>
                          <th>Categoria</th>
                          <th>Contato</th>
                          <th>E-mail</th>
                          <th>Telefone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fornecedores.map((f) => (
                          <tr key={f.id}>
                            <td>{f.nome_fantasia}</td>
                            <td>{f.categoria_servico || "—"}</td>
                            <td>{f.nome_contato || "—"}</td>
                            <td>{f.email || "—"}</td>
                            <td>{f.telefone || "—"}</td>
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
