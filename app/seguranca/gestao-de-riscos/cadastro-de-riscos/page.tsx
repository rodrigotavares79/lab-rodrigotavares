"use client";

import { useState, useEffect, FormEvent } from "react";
import { montarTituloRisco, validarCenario, TAMANHO_MAXIMO_CAMPO } from "@/lib/cenarioRisco";
import Footer from "@/components/Footer";
import ImportarRiscosCSV from "@/components/ImportarRiscosCSV";
import { type FaixaEstimativa } from "@/lib/riscoUtils";
import { MATRIZ_5X5 } from "@/lib/metodologiaRisco";
import { usePerfilRiscos, SemPermissao } from "@/components/riscos/PermissoesRiscos";
import { ativoTemCusto } from "@/lib/ativosCriticos";
import RiscosSemelhantes from "@/components/riscos/RiscosSemelhantes";
import SeletorDono, { DONO_VAZIO, donoPreenchido, type ValorDono } from "@/components/riscos/SeletorDono";

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
  tipo?: string | null;
  area_responsavel?: string | null;
  custo_indisponibilidade_hora: number | string | null;
  custo_restauracao_hora_homem: number | string | null;
};



const NIVEL_RISCO: Record<number, { label: string; className: string }> = {
  1: { label: "Baixo", className: "badge-baixo" },
  2: { label: "Médio", className: "badge-medio" },
  3: { label: "Alto", className: "badge-alto" },
  4: { label: "Crítico", className: "badge-critico" },
};

function classificarRisco(probabilidade: number, impacto: number) {
  if (!probabilidade || !impacto) return null;
  const nivel = MATRIZ_5X5[probabilidade - 1][impacto - 1];
  return NIVEL_RISCO[nivel];
}

// Estado de formulário para uma estimativa de 3 pontos (mín/provável/máx).
// Preencher só "provável" e deixar mín/máx em branco equivale a um valor
// único (sem faixa de incerteza).
type FaixaTexto = { min: string; provavel: string; max: string };

const faixaVazia = (): FaixaTexto => ({ min: "", provavel: "", max: "" });

function faixaParaEstimativa(f: FaixaTexto): FaixaEstimativa | null {
  const provavel = Number(f.provavel);
  if (!f.provavel || Number.isNaN(provavel)) return null;
  const min = f.min ? Number(f.min) : provavel;
  const max = f.max ? Number(f.max) : provavel;
  return { min: Number.isNaN(min) ? provavel : min, provavel, max: Number.isNaN(max) ? provavel : max };
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
  const perfil = usePerfilRiscos();
  const [modo, setModo] = useState<"form" | "csv">("form");
  // B13: cenário estruturado; o título é montado a partir destes três campos.
  const [causa, setCausa] = useState("");
  const [evento, setEvento] = useState("");
  const [consequencia, setConsequencia] = useState("");
  const [impacto, setImpacto] = useState(0);
  const [probabilidade, setProbabilidade] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [emailEnviadoPara, setEmailEnviadoPara] = useState("");
  const [avisoEmail, setAvisoEmail] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [projetoId, setProjetoId] = useState("");

  const [sistemas, setSistemas] = useState<SistemaCritico[]>([]);
  // B14: dono do risco (usuário ou contato de negócio), distinto de quem levantou.
  const [dono, setDono] = useState<ValorDono>(DONO_VAZIO);
  const [sistemaCriticoId, setSistemaCriticoId] = useState("");
  const [duracaoHoras, setDuracaoHoras] = useState<FaixaTexto>(faixaVazia());
  const [percentualDegradacao, setPercentualDegradacao] = useState<FaixaTexto>({ min: "30", provavel: "30", max: "30" });
  const [restauracaoPessoas, setRestauracaoPessoas] = useState<FaixaTexto>(faixaVazia());
  const [restauracaoHoras, setRestauracaoHoras] = useState<FaixaTexto>(faixaVazia());

  const score = impacto && probabilidade ? impacto * probabilidade : 0;
  const classificacao = classificarRisco(probabilidade, impacto);
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

  const sistemaSelecionado = sistemas.find((x) => String(x.id) === String(sistemaCriticoId));
  const sistemaSelecionadoTemCusto = !!sistemaSelecionado && ativoTemCusto(sistemaSelecionado);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviado(false);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const cenarioInvalido = validarCenario({ causa, evento, consequencia });
    if (cenarioInvalido) {
      setErro(cenarioInvalido);
      return;
    }
    if (!donoPreenchido(dono)) {
      setErro(dono.donoContatoId !== null ? "Escolha o ponto focal (Analista GRC) do risco." : "Escolha o dono do risco.");
      return;
    }

    const payload = {
      projetoId,
      categoria: formData.get("categoria"),
      causa,
      evento,
      consequencia,
      donoEmail: dono.donoEmail || null,
      donoContatoId: dono.donoContatoId,
      pontoFocalEmail: dono.pontoFocalEmail || null,
      gatilho: formData.get("gatilho"),
      resultado: formData.get("resultado"),
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
        throw new Error(body.error || "Não foi possível cadastrar o risco.");
      }

      // B10: o risco já foi gravado; o e-mail pode ter sido pulado ou falhado.
      const corpo = await res.json().catch(() => ({}));
      setEmailEnviadoPara(corpo.email?.enviado ? corpo.email.para : "");
      setAvisoEmail(corpo.email?.enviado ? null : corpo.email?.aviso || null);
      setEnviado(true);
      form.reset();
      setCausa("");
      setDono(DONO_VAZIO);
      setEvento("");
      setConsequencia("");
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

  if (perfil.carregado && !perfil.permissoes.editarRiscos) {
    return (
      <>
        <SemPermissao mensagem="Seu perfil é de consulta: você pode ver os riscos e emitir relatórios, mas não cadastrar. Fale com um administrador se precisar desse acesso." />
        <Footer />
      </>
    );
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

          <div className="mode-tabs">
            <button
              type="button"
              className={modo === "form" ? "mode-tab mode-tab-active" : "mode-tab"}
              onClick={() => setModo("form")}
            >
              Cadastro Individual
            </button>
            <button
              type="button"
              className={modo === "csv" ? "mode-tab mode-tab-active" : "mode-tab"}
              onClick={() => setModo("csv")}
            >
              Importação em Lote (CSV)
            </button>
          </div>

          {modo === "csv" ? (
            <ImportarRiscosCSV />
          ) : (
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

                <div className="form-field form-field-wide">
                  <label htmlFor="causa">Causa *</label>
                  <input
                    id="causa"
                    type="text"
                    value={causa}
                    maxLength={TAMANHO_MAXIMO_CAMPO}
                    onChange={(e) => setCausa(e.target.value)}
                    placeholder="Por que pode acontecer: ameaça, vulnerabilidade ou falha de controle"
                  />
                </div>

                <div className="form-field form-field-wide">
                  <label htmlFor="evento">Evento *</label>
                  <input
                    id="evento"
                    type="text"
                    value={evento}
                    maxLength={TAMANHO_MAXIMO_CAMPO}
                    onChange={(e) => setEvento(e.target.value)}
                    placeholder="O que pode acontecer"
                  />
                </div>

                <div className="form-field form-field-wide">
                  <label htmlFor="consequencia">Consequência *</label>
                  <input
                    id="consequencia"
                    type="text"
                    value={consequencia}
                    maxLength={TAMANHO_MAXIMO_CAMPO}
                    onChange={(e) => setConsequencia(e.target.value)}
                    placeholder="O que acontece se o evento ocorrer"
                  />
                  <p className="field-helper">
                    <strong>Título do risco:</strong>{" "}
                    {montarTituloRisco({ causa, evento, consequencia }) || "preencha causa, evento e consequência"}
                  </p>
                </div>

                <RiscosSemelhantes projetoId={projetoId} evento={evento} causa={causa} consequencia={consequencia} />

                <div className="form-field">
                  <label htmlFor="gatilho">Ponto de Gatilho</label>
                  <input
                    id="gatilho"
                    name="gatilho"
                    type="text"
                    maxLength={500}
                    placeholder="Sinal observável de que o risco está se materializando"
                  />
                </div>

                <SeletorDono valor={dono} onChange={setDono} idPrefixo="donoCadastro" />

                <div className="form-field">
                  <label htmlFor="levantadoPor">Levantado Por</label>
                  <input
                    id="levantadoPor"
                    type="text"
                    value={perfil.carregado ? `${perfil.nome} <${perfil.email}>` : "Carregando..."}
                    readOnly
                    aria-readonly="true"
                    style={{ background: "var(--surface)", cursor: "not-allowed" }}
                  />
                  <p className="field-helper">
                    Preenchido com o seu usuário. O e-mail de confirmação com os dados deste risco
                    vai para o seu endereço.
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
                  <label htmlFor="resultado">Detalhamento do impacto</label>
                  <textarea
                    id="resultado"
                    name="resultado"
                    rows={3}
                    placeholder="Opcional: detalhe o impacto (áreas afetadas, prazos, valores)"
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
              <legend>Ativo ou Processo Afetado</legend>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="sistemaCritico">Ativo ou processo (inventário)</label>
                  <select
                    id="sistemaCritico"
                    value={sistemaCriticoId}
                    onChange={(e) => setSistemaCriticoId(e.target.value)}
                    disabled={!projetoId}
                  >
                    <option value="">Nenhum</option>
                    {sistemas.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                        {s.tipo ? ` · ${s.tipo}` : ""}
                        {s.area_responsavel ? ` · ${s.area_responsavel}` : ""}
                      </option>
                    ))}
                  </select>
                  {!projetoId ? (
                    <p className="field-helper">Selecione um Projeto primeiro.</p>
                  ) : (
                    <p className="field-helper">
                      Não está na lista?{" "}
                      <a href="/seguranca/gestao-de-riscos/ativos-criticos" target="_blank" rel="noreferrer">
                        Cadastre no inventário
                      </a>{" "}
                      e escolha o projeto de novo. Só ativos com custos geram a estimativa financeira.
                    </p>
                  )}
                </div>

                {sistemaSelecionadoTemCusto && (
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
                  <span>
                    {emailEnviadoPara
                      ? `Uma cópia dos dados foi enviada para ${emailEnviadoPara}.`
                      : avisoEmail || "O risco foi cadastrado."}
                  </span>
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
          )}

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
