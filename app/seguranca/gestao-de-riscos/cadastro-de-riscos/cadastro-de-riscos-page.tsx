"use client";

import { useState, useEffect, FormEvent } from "react";
import Footer from "@/components/Footer";

const NIVEIS = [
  { value: 1, label: "1 — Muito Baixo" },
  { value: 2, label: "2 — Baixo" },
  { value: 3, label: "3 — Médio" },
  { value: 4, label: "4 — Alto" },
  { value: 5, label: "5 — Muito Alto" },
];

type Projeto = { id: number; nome: string };
type SistemaCritico = {
  id: number;
  nome: string;
  custo_indisponibilidade_hora: string;
  custo_restauracao_hora_homem: string;
};

function classificarImpacto(score: number) {
  if (score <= 4) return { label: "Baixo", className: "badge-baixo" };
  if (score <= 9) return { label: "Médio", className: "badge-medio" };
  if (score <= 15) return { label: "Alto", className: "badge-alto" };
  return { label: "Crítico", className: "badge-critico" };
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CadastroDeRiscos() {
  const [impacto, setImpacto] = useState(0);
  const [probabilidade, setProbabilidade] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [emailEnviadoPara, setEmailEnviadoPara] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [projetoId, setProjetoId] = useState("");

  const [sistemas, setSistemas] = useState<SistemaCritico[]>([]);
  const [sistemaCriticoId, setSistemaCriticoId] = useState("");
  const [duracaoHoras, setDuracaoHoras] = useState("");
  const [percentualDegradacao, setPercentualDegradacao] = useState("30");
  const [restauracaoPessoas, setRestauracaoPessoas] = useState("");
  const [restauracaoHoras, setRestauracaoHoras] = useState("");

  const score = impacto && probabilidade ? impacto * probabilidade : 0;
  const classificacao = score ? classificarImpacto(score) : null;
  const impactoLabel = NIVEIS.find((n) => n.value === impacto)?.label ?? "";
  const probabilidadeLabel = NIVEIS.find((n) => n.value === probabilidade)?.label ?? "";

  useEffect(() => {
    fetch("/api/projetos")
      .then((r) => r.json())
      .then((d) => setProjetos(d.projetos || []))
      .catch(() => setProjetos([]));
  }, []);

  useEffect(() => {
    if (!projetoId) {
      setSistemas([]);
      setSistemaCriticoId("");
      return;
    }
    fetch(`/api/sistemas-criticos?projetoId=${projetoId}`)
      .then((r) => r.json())
      .then((d) => setSistemas(d.sistemas || []))
      .catch(() => setSistemas([]));
    setSistemaCriticoId("");
  }, [projetoId]);

  const sistemaSelecionado = sistemas.find((s) => String(s.id) === sistemaCriticoId);

  let previewCriticoIndisp = 0;
  let previewCriticoRestauracao = 0;
  let previewAltoIndisp = 0;
  let previewAltoRestauracao = 0;

  if (sistemaSelecionado) {
    const custoIndisp = Number(sistemaSelecionado.custo_indisponibilidade_hora) || 0;
    const custoRestauracao = Number(sistemaSelecionado.custo_restauracao_hora_homem) || 0;
    const horas = Number(duracaoHoras) || 0;
    const pct = Number(percentualDegradacao) || 0;
    const pessoas = Number(restauracaoPessoas) || 0;
    const horasRestauracao = Number(restauracaoHoras) || 0;

    previewCriticoIndisp = custoIndisp * horas;
    previewCriticoRestauracao = custoRestauracao * pessoas * horasRestauracao;
    previewAltoIndisp = custoIndisp * horas * (pct / 100);
    previewAltoRestauracao = custoRestauracao * pessoas * horasRestauracao;
  }
  const previewCriticoTotal = previewCriticoIndisp + previewCriticoRestauracao;
  const previewAltoTotal = previewAltoIndisp + previewAltoRestauracao;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviado(false);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const levantadoPor = String(formData.get("levantadoPor") || "");

    const payload = {
      projetoId,
      categoria: formData.get("categoria"),
      gatilho: formData.get("gatilho"),
      resultado: formData.get("resultado"),
      levantadoPor,
      dataLevantamento: formData.get("dataLevantamento"),
      fonte: formData.get("fonte"),
      impacto,
      probabilidade,
      impactoLabel,
      probabilidadeLabel,
      matrixScore: score,
      classificacaoLabel: classificacao?.label,
      sistemaCriticoId: sistemaCriticoId || null,
      duracaoHoras: duracaoHoras || null,
      percentualDegradacao: percentualDegradacao || null,
      restauracaoPessoas: restauracaoPessoas || null,
      restauracaoHoras: restauracaoHoras || null,
    };

    setEnviando(true);
    try {
      const res = await fetch("/api/cadastro-risco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Não foi possível enviar o e-mail de confirmação.");
      }

      setEmailEnviadoPara(levantadoPor);
      setEnviado(true);
      form.reset();
      setImpacto(0);
      setProbabilidade(0);
      setProjetoId("");
      setSistemaCriticoId("");
      setDuracaoHoras("");
      setPercentualDegradacao("30");
      setRestauracaoPessoas("");
      setRestauracaoHoras("");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setEnviando(false);
    }
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
                  <label htmlFor="projeto">Projeto</label>
                  <select
                    id="projeto"
                    name="projeto"
                    value={projetoId}
                    onChange={(e) => setProjetoId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Selecione</option>
                    {projetos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>

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
                    type="email"
                    required
                    placeholder="nome@empresa.com"
                  />
                  <p className="field-helper">
                    Um e-mail de confirmação com os dados deste risco será
                    enviado automaticamente para este endereço.
                  </p>
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

            <fieldset className="form-section">
              <legend>Impacto Financeiro (opcional)</legend>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="sistemaCritico">Sistema Crítico vinculado</label>
                  <select
                    id="sistemaCritico"
                    value={sistemaCriticoId}
                    onChange={(e) => setSistemaCriticoId(e.target.value)}
                    disabled={!projetoId}
                  >
                    <option value="">Nenhum</option>
                    {sistemas.map((s) => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                  {!projetoId && (
                    <p className="field-helper">Selecione um Projeto primeiro.</p>
                  )}
                </div>

                {sistemaCriticoId && (
                  <>
                    <div className="form-field">
                      <label htmlFor="duracaoHoras">Duração Estimada da Indisponibilidade (horas)</label>
                      <input
                        id="duracaoHoras"
                        type="number"
                        min="0"
                        step="0.5"
                        value={duracaoHoras}
                        onChange={(e) => setDuracaoHoras(e.target.value)}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="percentualDegradacao">
                        % de Degradação (cenário Alto Impacto)
                      </label>
                      <input
                        id="percentualDegradacao"
                        type="number"
                        min="0"
                        max="100"
                        step="5"
                        value={percentualDegradacao}
                        onChange={(e) => setPercentualDegradacao(e.target.value)}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="restauracaoPessoas">Pessoas na Restauração</label>
                      <input
                        id="restauracaoPessoas"
                        type="number"
                        min="0"
                        step="1"
                        value={restauracaoPessoas}
                        onChange={(e) => setRestauracaoPessoas(e.target.value)}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="restauracaoHoras">Horas de Restauração (por pessoa)</label>
                      <input
                        id="restauracaoHoras"
                        type="number"
                        min="0"
                        step="0.5"
                        value={restauracaoHoras}
                        onChange={(e) => setRestauracaoHoras(e.target.value)}
                      />
                    </div>

                    <div className="form-field form-field-wide">
                      <div className="financial-preview">
                        <div className="financial-scenario">
                          <span className="financial-scenario-title">Evento Crítico (Indisponibilidade)</span>
                          <span className="financial-scenario-total">{formatBRL(previewCriticoTotal)}</span>
                          <span className="financial-scenario-detail">
                            {formatBRL(previewCriticoIndisp)} perda por indisponibilidade;{" "}
                            {formatBRL(previewCriticoRestauracao)} perda por restauração (homem/hora)
                          </span>
                        </div>
                        <div className="financial-scenario">
                          <span className="financial-scenario-title">Evento Alto Impacto (Degradação)</span>
                          <span className="financial-scenario-total">{formatBRL(previewAltoTotal)}</span>
                          <span className="financial-scenario-detail">
                            {formatBRL(previewAltoIndisp)} perda por indisponibilidade;{" "}
                            {formatBRL(previewAltoRestauracao)} perda por restauração (homem/hora)
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={enviando}>
                {enviando ? "Enviando..." : "Cadastrar Risco"}
              </button>
            </div>

            {enviado && (
              <div className="success-banner">
                <span className="success-icon">✓</span>
                <span className="success-text">
                  <strong>Risco cadastrado com sucesso.</strong>
                  <span>Uma cópia dos dados foi enviada para {emailEnviadoPara}.</span>
                </span>
              </div>
            )}

            {erro && (
              <div className="error-banner">
                <span className="success-icon error-icon">!</span>
                <span className="success-text">
                  <strong>Não foi possível enviar o e-mail.</strong>
                  <span>{erro}</span>
                </span>
              </div>
            )}
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
