"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import Footer from "@/components/Footer";
import { simularImpactoFinanceiro, type FaixaEstimativa } from "@/lib/riscoUtils";

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

// Estado de formulário para uma estimativa de 3 pontos (mín/provável/máx).
// Preencher só "provável" e deixar mín/máx em branco equivale a um valor
// único (mesmo comportamento de antes, sem faixa de incerteza).
type FaixaTexto = { min: string; provavel: string; max: string };

const faixaVazia = (): FaixaTexto => ({ min: "", provavel: "", max: "" });

function faixaParaEstimativa(f: FaixaTexto): FaixaEstimativa | null {
  const provavel = Number(f.provavel);
  if (!f.provavel || Number.isNaN(provavel)) return null;
  const min = f.min ? Number(f.min) : provavel;
  const max = f.max ? Number(f.max) : provavel;
  return { min: Number.isNaN(min) ? provavel : min, provavel, max: Number.isNaN(max) ? provavel : max };
}

function classificarImpacto(score: number) {
  if (score <= 4) return { label: "Baixo", className: "badge-baixo" };
  if (score <= 9) return { label: "Médio", className: "badge-medio" };
  if (score <= 15) return { label: "Alto", className: "badge-alto" };
  return { label: "Crítico", className: "badge-critico" };
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CampoFaixa({
  legend,
  helper,
  value,
  onChange,
  min = "0",
  max,
  step = "1",
}: {
  legend: string;
  helper?: string;
  value: FaixaTexto;
  onChange: (f: FaixaTexto) => void;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <div className="form-field form-field-wide">
      <label>{legend}</label>
      {helper && <p className="field-helper">{helper}</p>}
      <div className="faixa-inputs">
        <div className="faixa-input">
          <span className="faixa-input-label">Mín.</span>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value.min}
            onChange={(e) => onChange({ ...value, min: e.target.value })}
          />
        </div>
        <div className="faixa-input">
          <span className="faixa-input-label">Mais provável</span>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value.provavel}
            onChange={(e) => onChange({ ...value, provavel: e.target.value })}
          />
        </div>
        <div className="faixa-input">
          <span className="faixa-input-label">Máx.</span>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value.max}
            onChange={(e) => onChange({ ...value, max: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
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
  const [duracaoHoras, setDuracaoHoras] = useState<FaixaTexto>(faixaVazia());
  const [percentualDegradacao, setPercentualDegradacao] = useState<FaixaTexto>({ min: "30", provavel: "30", max: "30" });
  const [restauracaoPessoas, setRestauracaoPessoas] = useState<FaixaTexto>(faixaVazia());
  const [restauracaoHoras, setRestauracaoHoras] = useState<FaixaTexto>(faixaVazia());

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

  // Simulação client-side só pra preview (poucas iterações — é refeita a
  // cada tecla digitada). O valor gravado de verdade é recalculado no
  // servidor com mais iterações, nunca confiando neste número.
  const preview = useMemo(() => {
    if (!sistemaSelecionado) return null;
    return simularImpactoFinanceiro(
      sistemaSelecionado,
      {
        duracaoHoras: faixaParaEstimativa(duracaoHoras),
        percentualDegradacao: faixaParaEstimativa(percentualDegradacao),
        restauracaoPessoas: faixaParaEstimativa(restauracaoPessoas),
        restauracaoHoras: faixaParaEstimativa(restauracaoHoras),
      },
      2000
    );
  }, [sistemaSelecionado, duracaoHoras, percentualDegradacao, restauracaoPessoas, restauracaoHoras]);

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
      duracaoHoras: faixaParaEstimativa(duracaoHoras),
      percentualDegradacao: faixaParaEstimativa(percentualDegradacao),
      restauracaoPessoas: faixaParaEstimativa(restauracaoPessoas),
      restauracaoHoras: faixaParaEstimativa(restauracaoHoras),
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
      setDuracaoHoras(faixaVazia());
      setPercentualDegradacao({ min: "30", provavel: "30", max: "30" });
      setRestauracaoPessoas(faixaVazia());
      setRestauracaoHoras(faixaVazia());
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
                    <CampoFaixa
                      legend="Duração Estimada da Indisponibilidade (horas)"
                      helper="Preencha só 'mais provável' pra um valor único, ou mín./máx. também pra capturar a incerteza."
                      value={duracaoHoras}
                      onChange={setDuracaoHoras}
                      step="0.5"
                    />

                    <CampoFaixa
                      legend="% de Degradação (cenário Alto Impacto)"
                      value={percentualDegradacao}
                      onChange={setPercentualDegradacao}
                      max="100"
                      step="5"
                    />

                    <CampoFaixa
                      legend="Pessoas na Restauração"
                      value={restauracaoPessoas}
                      onChange={setRestauracaoPessoas}
                      step="1"
                    />

                    <CampoFaixa
                      legend="Horas de Restauração (por pessoa)"
                      value={restauracaoHoras}
                      onChange={setRestauracaoHoras}
                      step="0.5"
                    />

                    {preview && (
                      <div className="form-field form-field-wide">
                        <div className="financial-preview">
                          <div className="financial-scenario">
                            <span className="financial-scenario-title">Evento Crítico (Indisponibilidade)</span>
                            <span className="financial-scenario-total">{formatBRL(preview.critico.total.p50)}</span>
                            <span className="financial-scenario-detail">
                              {formatBRL(preview.critico.indisponibilidade.p50)} perda por indisponibilidade;{" "}
                              {formatBRL(preview.critico.restauracao.p50)} perda por restauração (homem/hora)
                            </span>
                            <span className="financial-scenario-range">
                              Faixa (p10–p90): {formatBRL(preview.critico.total.p10)} a {formatBRL(preview.critico.total.p90)}
                            </span>
                          </div>
                          <div className="financial-scenario">
                            <span className="financial-scenario-title">Evento Alto Impacto (Degradação)</span>
                            <span className="financial-scenario-total">{formatBRL(preview.alto.total.p50)}</span>
                            <span className="financial-scenario-detail">
                              {formatBRL(preview.alto.indisponibilidade.p50)} perda por indisponibilidade;{" "}
                              {formatBRL(preview.alto.restauracao.p50)} perda por restauração (homem/hora)
                            </span>
                            <span className="financial-scenario-range">
                              Faixa (p10–p90): {formatBRL(preview.alto.total.p10)} a {formatBRL(preview.alto.total.p90)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
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
