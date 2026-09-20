"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import Footer from "@/components/Footer";
import { TIPOS, AREAS, OPCOES_DADOS_TRATADOS } from "@/lib/inventarioIAConstants";

type CatalogoItem = { nome: string; tipo: string };

export default function CadastroDeSistemaIA() {
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);

  const [sistema, setSistema] = useState("");
  const [tipo, setTipo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [area, setArea] = useState("");
  const [areaUsuario, setAreaUsuario] = useState("");
  const [usuarios, setUsuarios] = useState("");
  const [emails, setEmails] = useState("");
  const [dadosTratados, setDadosTratados] = useState<string[]>([]);
  const [parecerAprovado, setParecerAprovado] = useState("");
  const [parecerNumeroChamado, setParecerNumeroChamado] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/catalogo-sistemas-ia")
      .then((r) => r.json())
      .then((d) => setCatalogo(d.catalogo || []))
      .catch(() => setCatalogo([]));
  }, []);

  const itemCatalogo = useMemo(
    () => catalogo.find((c) => c.nome.toLowerCase() === sistema.trim().toLowerCase()) || null,
    [catalogo, sistema]
  );

  // Sempre que o nome do sistema bater com o catálogo, o Tipo é carregado
  // automaticamente (ainda editável, se precisar corrigir).
  useEffect(() => {
    if (itemCatalogo) setTipo(itemCatalogo.tipo);
  }, [itemCatalogo]);

  function toggleDadoTratado(valor: string) {
    setDadosTratados((atual) =>
      atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor]
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviado(false);

    const payload = {
      sistema,
      tipo: tipo || null,
      descricao: descricao || null,
      area: area || null,
      areaUsuario: areaUsuario || null,
      usuarios: usuarios || null,
      emails: emails || null,
      dadosTratados,
      parecerAprovado: parecerAprovado === "Sim" ? true : parecerAprovado === "Não" ? false : null,
      parecerNumeroChamado: parecerNumeroChamado || null,
    };

    setEnviando(true);
    try {
      const res = await fetch("/api/sistemas-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Não foi possível cadastrar o sistema.");
      }

      setEnviado(true);
      setSistema("");
      setTipo("");
      setDescricao("");
      setArea("");
      setAreaUsuario("");
      setUsuarios("");
      setEmails("");
      setDadosTratados([]);
      setParecerAprovado("");
      setParecerNumeroChamado("");
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
          <span className="eyebrow">Governança de IA</span>
          <h1>Cadastro de Sistema de IA</h1>
          <p className="lede">
            Registro de um sistema/ferramenta de IA em uso na organização.
          </p>

          <form className="risk-form" onSubmit={handleSubmit}>
            <fieldset className="form-section">
              <legend>Identificação</legend>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="sistema">Sistema</label>
                  <input
                    id="sistema"
                    type="text"
                    required
                    list="catalogo-sistemas"
                    placeholder="Nome do sistema ou ferramenta"
                    value={sistema}
                    onChange={(e) => setSistema(e.target.value)}
                  />
                  <datalist id="catalogo-sistemas">
                    {catalogo.map((c) => (
                      <option key={c.nome} value={c.nome} />
                    ))}
                  </datalist>
                </div>

                <div className="form-field">
                  <label htmlFor="tipo">Tipo</label>
                  <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                    <option value="" disabled>Selecione</option>
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <p className="field-helper">
                    {itemCatalogo
                      ? "Carregado automaticamente a partir do catálogo — pode ajustar se necessário."
                      : "Sistema não encontrado no catálogo — selecione manualmente."}
                  </p>
                </div>

                <div className="form-field">
                  <label htmlFor="area">Área</label>
                  <select id="area" value={area} onChange={(e) => setArea(e.target.value)}>
                    <option value="" disabled>Selecione</option>
                    {AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <p className="field-helper">Setor da empresa responsável pelo sistema.</p>
                </div>

                <div className="form-field form-field-wide">
                  <label htmlFor="descricao">Descrição</label>
                  <textarea
                    id="descricao"
                    rows={3}
                    placeholder="Para que o sistema é usado"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>Uso</legend>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="areaUsuario">Área do Usuário</label>
                  <select id="areaUsuario" value={areaUsuario} onChange={(e) => setAreaUsuario(e.target.value)}>
                    <option value="" disabled>Selecione</option>
                    {AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <p className="field-helper">
                    Setor de quem efetivamente usa o sistema — pode ser diferente da área responsável.
                  </p>
                </div>

                <div className="form-field">
                  <label htmlFor="usuarios">Usuário(s)</label>
                  <input
                    id="usuarios"
                    type="text"
                    placeholder="Nome 1; Nome 2; Nome 3"
                    value={usuarios}
                    onChange={(e) => setUsuarios(e.target.value)}
                  />
                  <p className="field-helper">Separe múltiplos usuários com ";".</p>
                </div>

                <div className="form-field">
                  <label htmlFor="emails">E-mail(s)</label>
                  <input
                    id="emails"
                    type="text"
                    placeholder="nome1@empresa.com; nome2@empresa.com"
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                  />
                  <p className="field-helper">Separe múltiplos e-mails com ";".</p>
                </div>

                <div className="form-field form-field-wide">
                  <label>Dados Tratados</label>
                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "0.3rem", alignItems: "center" }}>
                    {OPCOES_DADOS_TRATADOS.map((opcao) => (
                      <label
                        key={opcao}
                        style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 400 }}
                      >
                        <input
                          type="checkbox"
                          checked={dadosTratados.includes(opcao)}
                          onChange={() => toggleDadoTratado(opcao)}
                        />
                        {opcao}
                      </label>
                    ))}
                    {(dadosTratados.includes("Pessoais") || dadosTratados.includes("Sensíveis")) && (
                      <span className="badge badge-atencao">Requer atenção</span>
                    )}
                  </div>
                  {(dadosTratados.includes("Pessoais") || dadosTratados.includes("Sensíveis")) && (
                    <p className="field-helper">
                      Sistemas com dados pessoais e/ou sensíveis recebem esse selo automaticamente no Dashboard.
                    </p>
                  )}
                </div>
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>Parecer de Cibersegurança</legend>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="parecerAprovado">Aprovado?</label>
                  <select
                    id="parecerAprovado"
                    value={parecerAprovado}
                    onChange={(e) => setParecerAprovado(e.target.value)}
                  >
                    <option value="" disabled>Selecione</option>
                    <option>Sim</option>
                    <option>Não</option>
                  </select>
                </div>

                {parecerAprovado === "Sim" && (
                  <div className="form-field">
                    <label htmlFor="parecerNumeroChamado">Número do Chamado</label>
                    <input
                      id="parecerNumeroChamado"
                      type="text"
                      placeholder="Ex: CYBER-1234"
                      value={parecerNumeroChamado}
                      onChange={(e) => setParecerNumeroChamado(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={enviando}>
                {enviando ? "Enviando..." : "Cadastrar Sistema"}
              </button>
            </div>

            {enviado && (
              <div className="success-banner">
                <span className="success-icon">✓</span>
                <span className="success-text">
                  <strong>Sistema cadastrado com sucesso.</strong>
                  <span>
                    Veja todos os registros no{" "}
                    <a href="/seguranca/governanca-de-ia/dashboard">Dashboard</a>.
                  </span>
                </span>
              </div>
            )}

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

          <a
            href="/seguranca/governanca-de-ia/inventario"
            className="status-tag"
            style={{ marginTop: "2.5rem", display: "inline-block" }}
          >
            ← Voltar para Inventário de Sistemas de IA
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
