"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import Footer from "@/components/Footer";
import s from "../condominio.module.css";

type Fornecedor = {
  id: number;
  nome_fantasia: string;
  cnpj: string | null;
  categoria_servico: string | null;
  nome_contato: string | null;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
};

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const [alterandoId, setAlterandoId] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function iniciarEdicao(f: Fornecedor) {
    setErro(null);
    setEditando(f);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Desativar não apaga: o fornecedor sai da escolha nos chamados, mas
  // continua nos chamados antigos. Reativar desfaz.
  async function alternarAtivo(f: Fornecedor) {
    setAlterandoId(f.id);
    setErroLista(null);
    try {
      const res = await fetch(`/api/fornecedores/${f.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !f.ativo }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Não foi possível alterar o fornecedor.");
      if (editando?.id === f.id) setEditando(null);
      carregarFornecedores();
    } catch (err) {
      setErroLista(err instanceof Error ? err.message : "Erro ao alterar o fornecedor.");
    } finally {
      setAlterandoId(null);
    }
  }

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
      const res = await fetch(editando ? `/api/fornecedores/${editando.id}` : "/api/fornecedores", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Não foi possível salvar o fornecedor.");
      form.reset();
      setEditando(null);
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

          <form className="risk-form" onSubmit={handleSubmit} ref={formRef} key={editando ? `editar-${editando.id}` : "novo"}>
            <fieldset className="form-section">
              <legend>{editando ? `Editar Fornecedor — ${editando.nome_fantasia}` : "Cadastrar Fornecedor"}</legend>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="nomeFantasia">Nome Fantasia</label>
                  <input id="nomeFantasia" name="nomeFantasia" defaultValue={editando?.nome_fantasia ?? ""} type="text" required />
                </div>
                <div className="form-field">
                  <label htmlFor="cnpj">CNPJ</label>
                  <input id="cnpj" name="cnpj" defaultValue={editando?.cnpj ?? ""} type="text" />
                </div>
                <div className="form-field">
                  <label htmlFor="categoriaServico">Categoria de Serviço</label>
                  <input id="categoriaServico" name="categoriaServico" defaultValue={editando?.categoria_servico ?? ""} type="text" placeholder="Ex.: Elétrica, Hidráulica, Limpeza" />
                </div>
                <div className="form-field">
                  <label htmlFor="nomeContato">Nome do Contato</label>
                  <input id="nomeContato" name="nomeContato" defaultValue={editando?.nome_contato ?? ""} type="text" />
                </div>
                <div className="form-field">
                  <label htmlFor="email">E-mail</label>
                  <input id="email" name="email" defaultValue={editando?.email ?? ""} type="email" />
                </div>
                <div className="form-field">
                  <label htmlFor="telefone">Telefone</label>
                  <input id="telefone" name="telefone" defaultValue={editando?.telefone ?? ""} type="text" />
                </div>
              </div>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={enviando}>
                {enviando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar"}
              </button>
              {editando && (
                <button type="button" className="btn-secondary" onClick={() => { setEditando(null); setErro(null); }}>
                  Cancelar edição
                </button>
              )}
            </div>

            {erro && (
              <div className="error-banner">
                <span className="success-icon error-icon">!</span>
                <span className="success-text">
                  <strong>{editando ? "Não foi possível salvar." : "Não foi possível cadastrar."}</strong>
                  <span>{erro}</span>
                </span>
              </div>
            )}
          </form>

          {carregando && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}

          {erroLista && fornecedores.length === 0 && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">{erroLista}</span>
            </div>
          )}

          {!carregando && (fornecedores.length > 0 || !erroLista) && (
            <div className="dash-panel" style={{ marginTop: "2.5rem" }}>
              <div className="dash-panel-header">
                {fornecedores.filter((f) => f.ativo).length} fornecedor{fornecedores.filter((f) => f.ativo).length !== 1 ? "es" : ""} ativo{fornecedores.filter((f) => f.ativo).length !== 1 ? "s" : ""}
                {fornecedores.some((f) => !f.ativo) && ` · ${fornecedores.filter((f) => !f.ativo).length} inativo${fornecedores.filter((f) => !f.ativo).length !== 1 ? "s" : ""}`}
              </div>
              <div className="dash-panel-body">
                {erroLista && (
                  <div className="error-banner" style={{ marginTop: 0, marginBottom: "1rem" }}>
                    <span className="success-icon error-icon">!</span>
                    <span className="success-text">{erroLista}</span>
                  </div>
                )}
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
                          <th>Situação</th>
                          <th aria-label="Ações" />
                        </tr>
                      </thead>
                      <tbody>
                        {fornecedores.map((f) => (
                          <tr key={f.id} className={f.ativo ? undefined : s.linhaInativa}>
                            <td>{f.nome_fantasia}</td>
                            <td>{f.categoria_servico || "—"}</td>
                            <td>{f.nome_contato || "—"}</td>
                            <td>{f.email || "—"}</td>
                            <td>{f.telefone || "—"}</td>
                            <td>
                              <span className={`${s.situacao} ${f.ativo ? s.situacaoAtivo : s.situacaoInativo}`}>
                                {f.ativo ? "Ativo" : "Inativo"}
                              </span>
                            </td>
                            <td>
                              <div className={s.acoesLinha}>
                                <button type="button" className={s.acaoTabela} onClick={() => iniciarEdicao(f)}>
                                  Editar
                                </button>
                                <button type="button" className={s.acaoTabela} disabled={alterandoId === f.id} onClick={() => alternarAtivo(f)}>
                                  {f.ativo ? "Desativar" : "Reativar"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </section>
      <Footer />
    </>
  );
}
