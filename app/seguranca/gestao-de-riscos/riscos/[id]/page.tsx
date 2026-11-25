"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import s from "@/components/riscos/riscos.module.css";
import EvidenciasPlano, { type Evidencia } from "@/components/riscos/EvidenciasPlano";
import AceitacaoRisco from "@/components/riscos/AceitacaoRisco";
import CenarioRisco from "@/components/riscos/CenarioRisco";
import OcorrenciasRisco from "@/components/riscos/OcorrenciasRisco";
import ResponsabilidadeRisco from "@/components/riscos/ResponsabilidadeRisco";
import { podeTrocarAtivo } from "@/lib/ativosCriticos";
import { OPCOES_TRATAMENTO } from "@/lib/aceitacaoRisco";
import { hojeSaoPaulo, situacaoRevisao, textoSituacaoRevisao } from "@/lib/revisaoRisco";
import { montarEventos, type RegistroLog, type TipoEvento } from "@/lib/historicoRisco";
import { STATUS_RISCO, statusPermitidos, validarTransicaoStatus, type StatusRisco } from "@/lib/statusRisco";
import { usePerfilRiscos } from "@/components/riscos/PermissoesRiscos";

type FatorRisco = {
  id: number;
  risco_id: number;
  codigo: string;
  descricao: string;
  explicacao: string | null;
  natureza: string;
  criticidade: string;
  controle_descricao: string;
  tipo_controle: string;
  natureza_controle: string;
  eficacia_potencial: string;
  status_implementacao: string;
  vetor_override: string | null;
  justificativa_override: string | null;
  criado_em: string;
};

type RiscoDetalhe = {
  id: number;
  opcao_tratamento: string | null;
  revisado_em: string | null;
  dias_revisao: number | null;
  proxima_revisao: string | null;
  projeto_id: number;
  projeto: string;
  categoria: string | null;
  gatilho: string | null;
  resultado_potencial: string | null;
  causa: string | null;
  evento: string | null;
  consequencia: string | null;
  titulo: string | null;
  cenario_id: number | null;
  cenario_catalogo: string | null;
  dono_email: string | null;
  dono_nome: string | null;
  dono_contato_id: number | null;
  ponto_focal_email: string | null;
  ponto_focal_nome: string | null;
  ativo_tipo: string | null;
  ativo_area: string | null;
  levantado_por: string;
  data_levantamento: string | null;
  fonte: string | null;
  impacto: number | null;
  probabilidade: number | null;
  matrix_score: number | null;
  nivel_inicial: string | null;
  impacto_qualitativo: string | null;
  nivel_projetado: string | null;
  prob_nivel_atual: number | null;
  imp_nivel_atual: number | null;
  prob_nivel_projetado: number | null;
  imp_nivel_projetado: number | null;
  im_prob_atual: number | null;
  im_imp_atual: number | null;
  im_prob_projetado: number | null;
  im_imp_projetado: number | null;
  status: string | null;
  sistema_critico_id: number | null;
  sistema_critico: string | null;
  duracao_horas: number | null;
  duracao_horas_min: number | null;
  duracao_horas_max: number | null;
  percentual_degradacao: number | null;
  percentual_degradacao_min: number | null;
  percentual_degradacao_max: number | null;
  restauracao_pessoas: number | null;
  restauracao_pessoas_min: number | null;
  restauracao_pessoas_max: number | null;
  restauracao_horas: number | null;
  restauracao_horas_min: number | null;
  restauracao_horas_max: number | null;
  // Resultado da simulação financeira gravado no cadastro (P50 = *_total).
  // O driver do Neon devolve colunas numeric como string.
  impacto_critico_total: number | string | null;
  impacto_critico_p10: number | string | null;
  impacto_critico_p90: number | string | null;
  impacto_alto_total: number | string | null;
  impacto_alto_p10: number | string | null;
  impacto_alto_p90: number | string | null;
  criado_em: string;
  fatores: FatorRisco[];
};

type Acao = {
  id: number;
  plano_acao_id: number;
  descricao: string;
  responsavel: string | null;
  responsavel_email: string | null;
  prazo: string | null;
  status: string;
  criado_em: string;
};

type UsuarioResponsavel = { email: string; nome: string; perfil: string };

type PlanoAcao = {
  id: number;
  risco_id: number;
  titulo: string;
  status: string;
  criado_em: string;
  concluido_em: string | null;
  auditoria_status: "Pendente" | "Conforme" | "Não conforme" | null;
  auditado_em: string | null;
  auditado_por_nome: string | null;
  auditoria_comentario: string | null;
  acoes: Acao[];
  evidencias: Evidencia[];
};

const ROTULO_AUDITORIA: Record<string, { texto: string; fundo: string }> = {
  Pendente: { texto: "Aguardando auditoria", fundo: "rgba(255,255,255,0.15)" },
  Conforme: { texto: "Auditoria: Conforme", fundo: "rgba(63,125,88,0.85)" },
  "Não conforme": { texto: "Auditoria: Não conforme", fundo: "rgba(163,36,47,0.85)" },
};

function formatDataHoraAud(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const BADGE_POR_NIVEL: Record<string, string> = {
  "Baixo": "badge-baixo",
  "Médio": "badge-medio",
  "Alto": "badge-alto",
  "Crítico": "badge-critico",
};

const OPCOES_NATUREZA_FATOR = ["Exposição", "Amplificação", "Misto"];
const OPCOES_CRITICIDADE = ["Muito Alta", "Alta", "Média", "Baixa", "Muito Baixa"];
const OPCOES_TIPO_CONTROLE = ["Preventivo", "Detectivo", "Corretivo", "Diretivo / Governança"];
const OPCOES_NATUREZA_CONTROLE = ["Técnico automatizado", "Técnico com intervenção manual", "Processo / Manual"];
const OPCOES_EFICACIA_POTENCIAL = ["Alta", "Média", "Baixa", "Inexistente"];
const OPCOES_STATUS_IMPLEMENTACAO = [
  "Não iniciado",
  "Planejado / Em desenho",
  "Em implementação",
  "Implementado — pendente de validação",
  "Implementado e validado",
];
const OPCOES_VETOR = ["Probabilidade", "Impacto", "Ambos"];

function classeStatus(status: string | null): string {
  if (status === "Mitigado") return "status-resolved";
  if (status === "Aceito") return "status-accepted";
  if (status === "Identificado") return "status-identified";
  return "status-pending";
}

function classeStatusPlano(status: string): string {
  if (status === "Concluído") return "status-resolved";
  return "status-pending";
}

function classeStatusAcao(status: string): string {
  if (status === "Concluído") return "status-resolved";
  if (status === "Em andamento") return "status-identified";
  return "status-pending";
}

function formatData(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return String(iso);
  return `${dia}/${mes}/${ano}`;
}

function formatPct(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(0)}%`;
}

// Mostra "valor (mín–máx)" quando o risco foi cadastrado com faixa de
// incerteza; riscos antigos (cadastrados antes da simulação Monte Carlo)
// não têm min/max gravados e caem no valor único de sempre.
function valorComFaixa(valor: number | null, min: number | null, max: number | null): React.ReactNode {
  if (valor === null || valor === undefined) return "—";
  if (min === null || max === null || min === max) return valor;
  return (
    <>
      {valor} <span style={{ color: "var(--text-muted)", fontSize: "0.85em" }}>({min}–{max})</span>
    </>
  );
}

function acaoVencida(prazo: string | null, status: string): boolean {
  if (!prazo || status === "Concluído") return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataPrazo = new Date(String(prazo).slice(0, 10) + "T00:00:00");
  return dataPrazo < hoje;
}

function LinhaCampo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <td style={{ color: "var(--text-muted)", width: "40%", whiteSpace: "normal" }}>{label}</td>
      <td style={{ fontWeight: 500, whiteSpace: "normal" }}>{value}</td>
    </tr>
  );
}

function Campo({ label, value, largo }: { label: string; value: React.ReactNode; largo?: boolean }) {
  return (
    <div className={largo ? s.campoLargo : undefined}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function numero(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const MOEDA_COMPACTA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

function moeda(v: number | null): string {
  return v === null ? "—" : MOEDA_COMPACTA.format(v);
}

/* ---------- Impacto e decisão (simulação financeira já gravada) ---------- */

function ImpactoDecisao({ risco, totalPlanos }: { risco: RiscoDetalhe; totalPlanos: number }) {
  const critP10 = numero(risco.impacto_critico_p10);
  const critP50 = numero(risco.impacto_critico_total);
  const critP90 = numero(risco.impacto_critico_p90);
  const altoP10 = numero(risco.impacto_alto_p10);
  const altoP50 = numero(risco.impacto_alto_total);
  const altoP90 = numero(risco.impacto_alto_p90);
  const temFaixa = critP10 !== null && critP90 !== null && critP90 > critP10;

  return (
    <div className="dash-panel">
      <div className="dash-panel-header">Impacto e decisão</div>
      <div className="dash-panel-body">
        {critP50 === null ? (
          <p className={s.nota} style={{ marginTop: 0 }}>
            Sem estimativa financeira para este risco. A simulação é feita no cadastro
            individual, quando o risco é vinculado a um Sistema Crítico.
          </p>
        ) : (
          <>
            <span className={s.rotuloMono}>Exposição estimada · indisponibilidade total</span>
            <p className={s.valorGrande}>
              {temFaixa ? `${moeda(critP10)} – ${moeda(critP90)}` : moeda(critP50)}
            </p>
            <p className={s.nota}>
              {temFaixa
                ? `Faixa P10–P90 · mediana ${moeda(critP50)} · simulação de Monte Carlo`
                : "Valor pontual (cadastrado sem faixa de incerteza)"}
            </p>
            {altoP50 !== null && (
              <>
                <hr className={s.separador} />
                <span className={s.rotuloMono}>Cenário de degradação</span>
                <p className={s.valorMedio}>
                  {altoP10 !== null && altoP90 !== null && altoP90 > altoP10
                    ? `${moeda(altoP10)} – ${moeda(altoP90)}`
                    : moeda(altoP50)}
                </p>
              </>
            )}
          </>
        )}
        <hr className={s.separador} />
        <span className={s.rotuloMono}>Tratamento</span>
        <p className={s.valorMedio} style={{ fontSize: "0.92rem" }}>
          {risco.status || "Identificado"}
          {totalPlanos > 0 ? ` · ${totalPlanos} plano${totalPlanos > 1 ? "s" : ""} de ação` : " · sem plano de ação"}
        </p>
      </div>
    </div>
  );
}

/* ---------- Revisão periódica (B17) ---------- */

const COR_REVISAO: Record<string, string> = {
  vencida: "var(--danger)",
  vence_em_breve: "#b7791f",
  em_dia: "var(--success)",
  sem_prazo: "var(--text-muted)",
};

function BlocoRevisao({ risco }: { risco: RiscoDetalhe }) {
  const sit = situacaoRevisao(risco.proxima_revisao, hojeSaoPaulo());
  return (
    <div
      className="field-helper"
      style={{ margin: "0 0 1rem", padding: "0.6rem 0.8rem", borderLeft: `3px solid ${COR_REVISAO[sit.estado]}`, background: "var(--surface)" }}
    >
      <strong>Revisão periódica:</strong> última em {risco.revisado_em ? formatDataHoraAud(risco.revisado_em) : "—"} · próxima em{" "}
      {formatData(risco.proxima_revisao)}{" "}
      <span style={{ color: COR_REVISAO[sit.estado], fontWeight: 600 }}>({textoSituacaoRevisao(sit)})</span>
      {risco.dias_revisao ? (
        <span>
          {" "}· prazo do nível {risco.impacto_qualitativo}: {risco.dias_revisao} dias
        </span>
      ) : null}
    </div>
  );
}

/* ---------- Linha do tempo (B06: log de alterações + datas de criação) ---------- */

type Evento = {
  data: string;
  titulo: string;
  meta: string;
  tipo: TipoEvento;
  mudancas?: { campo: string; de: string; para: string }[];
};

function LinhaDoTempo({ risco, planos }: { risco: RiscoDetalhe; planos: PlanoAcao[] }) {
  const [registros, setRegistros] = useState<RegistroLog[] | null>(null);

  useEffect(() => {
    fetch(`/api/riscos/${risco.id}/historico`)
      .then((r) => r.json())
      .then((d) => setRegistros(d.registros || []))
      .catch(() => setRegistros([]));
    // Recarrega quando o risco ou os planos mudam (status, novo plano etc.).
  }, [risco, planos]);

  const doLog = montarEventos(registros || []);
  // Criações já registradas no log não se repetem pelas datas de criação.
  const criadosNoLog = new Set(doLog.filter((e) => e.operacao === "INSERT").map((e) => e.chave));

  const derivados: (Evento & { chave: string })[] = [
    {
      chave: `riscos:${risco.id}`,
      data: risco.criado_em,
      titulo: "Risco cadastrado",
      meta: `${formatData(risco.criado_em)} · por ${risco.levantado_por}`,
      tipo: "risco" as const,
    },
    ...risco.fatores.map((f) => ({
      chave: `fatores_risco:${f.id}`,
      data: f.criado_em,
      titulo: `Fator ${f.codigo} adicionado`,
      meta: `${formatData(f.criado_em)} · ${f.status_implementacao}`,
      tipo: "fator" as const,
    })),
    ...planos.map((p) => ({
      chave: `planos_acao:${p.id}`,
      data: p.criado_em,
      titulo: `Plano de ação criado: ${p.titulo}`,
      meta: `${formatData(p.criado_em)} · ${p.status}`,
      tipo: "plano" as const,
    })),
    ...planos.flatMap((p) =>
      (p.acoes || []).map((a) => ({
        chave: `acoes:${a.id}`,
        data: a.criado_em,
        titulo: `Ação registrada: ${a.descricao}`,
        meta: `${formatData(a.criado_em)}${a.responsavel ? ` · ${a.responsavel}` : ""} · ${a.status}`,
        tipo: "acao" as const,
      }))
    ),
  ];

  const eventos: Evento[] = [
    ...derivados.filter((e) => !criadosNoLog.has(e.chave)),
    ...doLog.map((e) => ({
      data: e.data,
      titulo: e.titulo,
      meta: `${formatDataHoraAud(e.data)} · ${e.autor}`,
      tipo: e.tipo,
      mudancas: e.mudancas,
    })),
  ]
    .filter((e) => e.data)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const classeMarcador: Record<TipoEvento, string> = {
    risco: s.marcador,
    fator: `${s.marcador} ${s.marcadorFator}`,
    plano: `${s.marcador} ${s.marcadorPlano}`,
    acao: `${s.marcador} ${s.marcadorAcao}`,
    evidencia: `${s.marcador} ${s.marcadorPlano}`,
    auditoria: `${s.marcador} ${s.marcadorPlano}`,
    aceitacao: `${s.marcador} ${s.marcadorFator}`,
    ocorrencia: `${s.marcador} ${s.marcadorFator}`,
  };

  return (
    <div className="dash-panel">
      <div className="dash-panel-header">Linha do tempo</div>
      <div className="dash-panel-body">
        {registros === null && <p className="text-muted" style={{ margin: "0 0 0.75rem" }}>Carregando histórico...</p>}
        <ol className={s.linhaTempo}>
          {eventos.map((e, i) => (
            <li key={`${e.tipo}-${i}`}>
              <span className={classeMarcador[e.tipo]} aria-hidden="true" />
              <p className={s.eventoTitulo}>{e.titulo}</p>
              {e.mudancas && e.mudancas.length > 0 && (
                <div className={s.eventoMeta} style={{ margin: "0.15rem 0" }}>
                  {e.mudancas.map((m) => (
                    <div key={m.campo}>
                      {m.campo}: {m.de} → <strong>{m.para}</strong>
                    </div>
                  ))}
                </div>
              )}
              <p className={s.eventoMeta}>{e.meta}</p>
            </li>
          ))}
        </ol>
        <p className={s.nota}>
          Alterações registradas automaticamente a partir de 25/11/2026, com autor, data e hora. Antes disso, só as
          datas de criação. O log completo pode ser exportado no Relatório de Auditoria.
        </p>
      </div>
    </div>
  );
}

/* ---------- Card de um Fator de Risco ---------- */

function FatorRiscoCard({
  fator,
  riscoMitigado,
  onAtualizado,
}: {
  fator: FatorRisco;
  riscoMitigado: boolean;
  onAtualizado: () => void;
}) {
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleStatusChange(novoStatus: string) {
    setSalvandoStatus(true);
    setErro(null);
    try {
      const res = await fetch(`/api/fatores-risco/${fator.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusImplementacao: novoStatus }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao atualizar o status.");
      onAtualizado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao atualizar.");
    } finally {
      setSalvandoStatus(false);
    }
  }

  async function handleRemover() {
    if (!confirm(`Remover o fator ${fator.codigo}? Essa ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`/api/fatores-risco/${fator.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao remover o fator.");
      onAtualizado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao remover.");
    }
  }

  return (
    <div className="dash-panel" style={{ marginBottom: "1rem" }}>
      <div className="dash-panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
        <span>{fator.codigo} — {fator.descricao}</span>
        {!riscoMitigado && (
          <button
            type="button"
            onClick={handleRemover}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", fontSize: "0.75rem" }}
          >
            Remover
          </button>
        )}
      </div>
      <div className="dash-panel-body">
        <table className="dash-table" style={{ marginBottom: "1rem" }}>
          <tbody>
            <label className="label-com-ajuda">
  Natureza do Fator
  <span className="info-icon" tabIndex={0}>
    i
    <span className="info-tooltip">
      <strong>Exposição</strong>: facilita o risco acontecer (não muda o tamanho do estrago).{" "}
      <strong>Amplificação</strong>: não muda a chance, mas piora as consequências se acontecer.{" "}
      <strong>Misto</strong>: faz as duas coisas ao mesmo tempo.
    </span>
  </span>
</label>
            <LinhaCampo label="Criticidade" value={fator.criticidade} />
            <LinhaCampo label="Controle / Ação Recomendada" value={fator.controle_descricao} />
            <LinhaCampo label="Tipo de Controle" value={fator.tipo_controle} />
            <LinhaCampo label="Natureza do Controle" value={fator.natureza_controle} />
            <LinhaCampo label="Eficácia Potencial" value={fator.eficacia_potencial} />
            {fator.vetor_override && (
              <LinhaCampo label="Vetor (override)" value={`${fator.vetor_override} — ${fator.justificativa_override || ""}`} />
            )}
          </tbody>
        </table>

        <div className="form-field" style={{ maxWidth: "22rem" }}>
          <label>Status de Implementação</label>
          <select
            value={fator.status_implementacao}
            disabled={riscoMitigado || salvandoStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            {OPCOES_STATUS_IMPLEMENTACAO.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {erro && (
          <div className="error-banner" style={{ marginTop: "0.75rem" }}>
            <span className="success-icon error-icon">!</span>
            <span className="success-text">{erro}</span>
          </div>
        )}
      </div>
    </div>
  );
}
/* ---------- Formulário de novo Fator de Risco ---------- */

function NovoFatorForm({ riscoId, onCriado }: { riscoId: number; onCriado: () => void }) {
  const [descricao, setDescricao] = useState("");
  const [explicacao, setExplicacao] = useState("");
  const [natureza, setNatureza] = useState(OPCOES_NATUREZA_FATOR[0]);
  const [criticidade, setCriticidade] = useState(OPCOES_CRITICIDADE[2]);
  const [controleDescricao, setControleDescricao] = useState("");
  const [tipoControle, setTipoControle] = useState(OPCOES_TIPO_CONTROLE[0]);
  const [naturezaControle, setNaturezaControle] = useState(OPCOES_NATUREZA_CONTROLE[0]);
  const [eficaciaPotencial, setEficaciaPotencial] = useState(OPCOES_EFICACIA_POTENCIAL[0]);
  const [statusImplementacao, setStatusImplementacao] = useState(OPCOES_STATUS_IMPLEMENTACAO[0]);
  const [vetorOverride, setVetorOverride] = useState("");
  const [justificativaOverride, setJustificativaOverride] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/fatores-risco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riscoId,
          descricao,
          explicacao: explicacao || null,
          natureza,
          criticidade,
          controleDescricao,
          tipoControle,
          naturezaControle,
          eficaciaPotencial,
          statusImplementacao,
          vetorOverride: vetorOverride || null,
          justificativaOverride: justificativaOverride || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao cadastrar o fator de risco.");
      setDescricao("");
      setExplicacao("");
      setControleDescricao("");
      setVetorOverride("");
      setJustificativaOverride("");
      setStatusImplementacao(OPCOES_STATUS_IMPLEMENTACAO[0]);
      onCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ maxWidth: "40rem" }}>
      <div className="form-field form-field-wide">
        <label>Descrição do Fator (vulnerabilidade / causa)</label>
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} required
          placeholder="Ex.: Política DMARC em modo de observação, sem bloqueio." />
      </div>
      <div className="form-field form-field-wide">
        <label>Explicação (opcional)</label>
        <textarea value={explicacao} onChange={(e) => setExplicacao(e.target.value)}
          placeholder="Detalhamento técnico do fator, se necessário." />
      </div>
      <div className="form-field">
        <label>Natureza do Fator</label>
        <select value={natureza} onChange={(e) => setNatureza(e.target.value)}>
          {OPCOES_NATUREZA_FATOR.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="form-field">
        <label>Criticidade do Fator</label>
        <select value={criticidade} onChange={(e) => setCriticidade(e.target.value)}>
          {OPCOES_CRITICIDADE.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="form-field form-field-wide">
        <label>Controle / Ação Recomendada</label>
        <textarea value={controleDescricao} onChange={(e) => setControleDescricao(e.target.value)} required
          placeholder="Ex.: Evolução controlada de p=none para quarantine/reject." />
      </div>
      <div className="form-field">
        <label>Tipo de Controle</label>
        <select value={tipoControle} onChange={(e) => setTipoControle(e.target.value)}>
          {OPCOES_TIPO_CONTROLE.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="form-field">
        <label>Natureza do Controle</label>
        <select value={naturezaControle} onChange={(e) => setNaturezaControle(e.target.value)}>
          {OPCOES_NATUREZA_CONTROLE.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="form-field">
        <label>Eficácia Potencial</label>
        <select value={eficaciaPotencial} onChange={(e) => setEficaciaPotencial(e.target.value)}>
          {OPCOES_EFICACIA_POTENCIAL.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="form-field">
        <label>Status de Implementação</label>
        <select value={statusImplementacao} onChange={(e) => setStatusImplementacao(e.target.value)}>
          {OPCOES_STATUS_IMPLEMENTACAO.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="form-field">
        <label>Vetor — Override (opcional)</label>
        <select value={vetorOverride} onChange={(e) => setVetorOverride(e.target.value)}>
          <option value="">— usar vetor sugerido —</option>
          {OPCOES_VETOR.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      {vetorOverride && (
        <div className="form-field form-field-wide">
          <label>Justificativa do Override (obrigatória)</label>
          <textarea value={justificativaOverride} onChange={(e) => setJustificativaOverride(e.target.value)} required />
        </div>
      )}
      <div className="form-field-wide form-actions">
        <button type="submit" className="btn-primary" disabled={salvando}>
          {salvando ? "Salvando..." : "Adicionar fator de risco"}
        </button>
      </div>
      {erro && (
        <div className="error-banner form-field-wide" style={{ marginTop: 0 }}>
          <span className="success-icon error-icon">!</span>
          <span className="success-text">{erro}</span>
        </div>
      )}
    </form>
  );
}
/* ---------- Card de um Plano de Ação, com suas Ações dentro ---------- */

function PlanoAcaoCard({
  plano,
  riscoMitigado,
  somenteLeitura,
  usuarios,
  onAtualizado,
}: {
  plano: PlanoAcao;
  riscoMitigado: boolean;
  // Perfil sem permissão para editar planos de ação.
  somenteLeitura: boolean;
  // B09: usuários que podem ser responsáveis (vazio para quem só lê).
  usuarios: UsuarioResponsavel[];
  onAtualizado: () => void;
}) {
  const [descricaoAcao, setDescricaoAcao] = useState("");
  const [responsavelAcao, setResponsavelAcao] = useState("");
  const [prazoAcao, setPrazoAcao] = useState("");
  const [salvandoAcao, setSalvandoAcao] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [concluindo, setConcluindo] = useState(false);
  const [erroConcluir, setErroConcluir] = useState<string | null>(null);
  const [reabrindo, setReabrindo] = useState(false);

  const planoAberto = plano.status !== "Concluído";
  const podeAdicionarAcao = planoAberto && !riscoMitigado && !somenteLeitura;
  const todasConcluidas = plano.acoes.length > 0 && plano.acoes.every((a) => a.status === "Concluído");
  const temEvidencia = plano.evidencias.length > 0;
  const podeConcluirPlano = planoAberto && !riscoMitigado && todasConcluidas && temEvidencia;
  const motivoNaoConcluir = !todasConcluidas
    ? "Todas as ações precisam estar concluídas"
    : !temEvidencia
      ? "Anexe pelo menos uma evidência"
      : "";
  const rotuloAud = plano.auditoria_status ? ROTULO_AUDITORIA[plano.auditoria_status] : null;

  async function handleReabrirPlano() {
    setReabrindo(true);
    setErroConcluir(null);
    try {
      const res = await fetch(`/api/planos-acao/${plano.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Aberto" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao reabrir o plano de ação.");
      onAtualizado();
    } catch (err) {
      setErroConcluir(err instanceof Error ? err.message : "Erro ao reabrir o plano de ação.");
    } finally {
      setReabrindo(false);
    }
  }

  async function handleAdicionarAcao(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoAcao(true);
    setErroAcao(null);
    try {
      const res = await fetch("/api/acoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planoAcaoId: plano.id,
          descricao: descricaoAcao,
          responsavelEmail: responsavelAcao || null,
          prazo: prazoAcao || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao cadastrar a ação.");
      setDescricaoAcao("");
      setResponsavelAcao("");
      setPrazoAcao("");
      onAtualizado();
    } catch (err) {
      setErroAcao(err instanceof Error ? err.message : "Erro ao cadastrar a ação.");
    } finally {
      setSalvandoAcao(false);
    }
  }

  async function handleAtualizarStatusAcao(acaoId: number, novoStatus: string) {
    try {
      const res = await fetch(`/api/acoes/${acaoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao atualizar a ação.");
      onAtualizado();
    } catch (err) {
      setErroAcao(err instanceof Error ? err.message : "Erro ao atualizar a ação.");
    }
  }

  // B09: vincula uma ação antiga (responsável em texto livre) a um usuário.
  async function handleVincularResponsavel(acaoId: number, email: string) {
    if (!email) return;
    try {
      const res = await fetch(`/api/acoes/${acaoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responsavelEmail: email }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao vincular o responsável.");
      onAtualizado();
    } catch (err) {
      setErroAcao(err instanceof Error ? err.message : "Erro ao vincular o responsável.");
    }
  }

  async function handleConcluirPlano() {
    setConcluindo(true);
    setErroConcluir(null);
    try {
      const res = await fetch(`/api/planos-acao/${plano.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Concluído" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao concluir o plano de ação.");
      onAtualizado();
    } catch (err) {
      setErroConcluir(err instanceof Error ? err.message : "Erro ao concluir o plano de ação.");
    } finally {
      setConcluindo(false);
    }
  }

  return (
    <div className="dash-panel" style={{ marginBottom: "1rem" }}>
      <div
        className="dash-panel-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}
      >
        <span>{plano.titulo}</span>
        <span style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {rotuloAud && (
            <span
              style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em", background: rotuloAud.fundo, padding: "0.15rem 0.5rem", borderRadius: "3px", color: "#fff" }}
            >
              {rotuloAud.texto}
            </span>
          )}
          <span
            className={classeStatusPlano(plano.status)}
            style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em", background: "rgba(255,255,255,0.15)", padding: "0.15rem 0.5rem", borderRadius: "3px", color: "#fff" }}
          >
            {plano.status}
          </span>
        </span>
      </div>
      <div className="dash-panel-body">
        {plano.auditoria_status === "Não conforme" && planoAberto && (
          <div className="error-banner" style={{ marginTop: 0, marginBottom: "1rem" }}>
            <span className="success-icon error-icon">!</span>
            <span className="success-text">
              <strong>
                Não conforme na auditoria de {formatDataHoraAud(plano.auditado_em)}
                {plano.auditado_por_nome ? ` (${plano.auditado_por_nome})` : ""}.
              </strong>
              <span>{plano.auditoria_comentario}</span>
              <span>Corrija o que foi apontado, atualize as evidências e conclua o plano de novo.</span>
            </span>
          </div>
        )}
        {plano.auditoria_status === "Conforme" && (
          <p className="field-helper" style={{ marginTop: 0, marginBottom: "1rem" }}>
            Auditado como <strong>Conforme</strong> em {formatDataHoraAud(plano.auditado_em)}
            {plano.auditado_por_nome ? ` por ${plano.auditado_por_nome}` : ""}
            {plano.auditoria_comentario ? ` — “${plano.auditoria_comentario}”` : ""}.
          </p>
        )}
        {plano.acoes.length === 0 ? (
          <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: 0 }}>
            Nenhuma ação cadastrada neste plano ainda.
          </p>
        ) : (
          <div className="dash-table-scroll" style={{ marginBottom: "1.25rem" }}>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Responsável</th>
                  <th>Prazo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {plano.acoes.map((a) => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>{a.descricao}</td>
                    <td style={{ whiteSpace: "normal", minWidth: "9rem" }}>
                      {a.responsavel || "—"}
                      {!a.responsavel_email && (
                        <div style={{ fontSize: "0.72rem", color: "var(--warning, #b7791f)" }}>
                          não vinculado a usuário
                        </div>
                      )}
                      {!a.responsavel_email && !riscoMitigado && !somenteLeitura && usuarios.length > 0 && (
                        <select
                          aria-label={`Vincular responsável da ação ${a.descricao}`}
                          defaultValue=""
                          onChange={(e) => handleVincularResponsavel(a.id, e.target.value)}
                          style={{ fontSize: "0.75rem", marginTop: "0.25rem", maxWidth: "12rem" }}
                        >
                          <option value="" disabled>Vincular a usuário…</option>
                          {usuarios.map((u) => (
                            <option key={u.email} value={u.email}>{u.nome}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {formatData(a.prazo)}
                      {acaoVencida(a.prazo, a.status) && (
                        <span className="report-vencida" style={{ marginLeft: "0.4rem", fontSize: "0.72rem" }}>
                          ⚠ Vencida
                        </span>
                      )}
                    </td>
                    <td>
                      <select
                        value={a.status}
                        disabled={riscoMitigado || !planoAberto || somenteLeitura}
                        onChange={(e) => handleAtualizarStatusAcao(a.id, e.target.value)}
                        className={classeStatusAcao(a.status)}
                        style={{ fontSize: "0.8rem", border: "1px solid var(--border)", borderRadius: "3px", padding: "0.3rem 0.4rem", background: "var(--bg)" }}
                      >
                        {["Não iniciado", "Em andamento", "Concluído"].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {riscoMitigado && (
          <p className="field-helper" style={{ margin: 0 }}>
            Este risco foi mitigado — este plano está congelado e não pode mais ser alterado.
          </p>
        )}

        <EvidenciasPlano
          planoId={plano.id}
          evidencias={plano.evidencias}
          editavel={planoAberto && !riscoMitigado && !somenteLeitura}
          onAtualizado={onAtualizado}
        />

        {!riscoMitigado && !planoAberto && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <p className="field-helper" style={{ margin: 0 }}>
              {plano.auditoria_status === "Pendente"
                ? "Plano concluído e aguardando a Auditoria — ações e evidências ficam congeladas."
                : "Plano concluído — não é possível cadastrar novas ações nele."}
            </p>
            {plano.auditoria_status === "Pendente" && !somenteLeitura && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleReabrirPlano}
                disabled={reabrindo}
                style={{ fontSize: "0.8rem" }}
              >
                {reabrindo ? "Reabrindo..." : "Reabrir plano"}
              </button>
            )}
            {erroConcluir && (
              <div className="error-banner" style={{ marginTop: 0, width: "100%" }}>
                <span className="success-icon error-icon">!</span>
                <span className="success-text">{erroConcluir}</span>
              </div>
            )}
          </div>
        )}

        {podeAdicionarAcao && (
          <>
            <p style={{ fontSize: "0.8rem", fontWeight: 600, marginTop: "0.5rem", marginBottom: "0.75rem" }}>
              Nova ação
            </p>
            <form onSubmit={handleAdicionarAcao} className="form-grid" style={{ maxWidth: "32rem" }}>
              <div className="form-field form-field-wide">
                <label>Descrição</label>
                <textarea
                  value={descricaoAcao}
                  onChange={(e) => setDescricaoAcao(e.target.value)}
                  placeholder="Ex.: Contratar link redundante com operadora alternativa."
                  required
                />
              </div>
              <div className="form-field">
                <label>Responsável</label>
                <select value={responsavelAcao} onChange={(e) => setResponsavelAcao(e.target.value)} required>
                  <option value="" disabled>
                    {usuarios.length ? "Escolha um usuário" : "Nenhum usuário disponível"}
                  </option>
                  {usuarios.map((u) => (
                    <option key={u.email} value={u.email}>
                      {u.nome} · {u.perfil}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Prazo</label>
                <input type="date" value={prazoAcao} onChange={(e) => setPrazoAcao(e.target.value)} />
              </div>
              <div className="form-field-wide form-actions">
                <button type="submit" className="btn-primary" disabled={salvandoAcao}>
                  {salvandoAcao ? "Salvando..." : "Adicionar ação"}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConcluirPlano}
                  disabled={!podeConcluirPlano || concluindo}
                  title={motivoNaoConcluir}
                  style={{ background: "var(--text-muted)" }}
                >
                  {concluindo ? "Concluindo..." : "Concluir plano de ação"}
                </button>
              </div>
              {motivoNaoConcluir && (
                <p className="field-helper form-field-wide" style={{ margin: 0 }}>
                  Para concluir o plano: {motivoNaoConcluir.charAt(0).toLowerCase() + motivoNaoConcluir.slice(1)}. Depois de
                  concluído, ele segue para a Auditoria.
                </p>
              )}
              {erroAcao && (
                <div className="error-banner form-field-wide" style={{ marginTop: 0 }}>
                  <span className="success-icon error-icon">!</span>
                  <span className="success-text">{erroAcao}</span>
                </div>
              )}
              {erroConcluir && (
                <div className="error-banner form-field-wide" style={{ marginTop: 0 }}>
                  <span className="success-icon error-icon">!</span>
                  <span className="success-text">{erroConcluir}</span>
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
export default function DetalheDoRisco() {
  const params = useParams<{ id: string }>();
  const [risco, setRisco] = useState<RiscoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [impactoForm, setImpactoForm] = useState("");
  const [probabilidadeForm, setProbabilidadeForm] = useState("");
  const [statusForm, setStatusForm] = useState("");
  const [opcaoForm, setOpcaoForm] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [sucessoSalvar, setSucessoSalvar] = useState(false);

  const [consolidadoEm, setConsolidadoEm] = useState<number | null>(null);

  function carregarRisco() {
    if (!params?.id) return;
    setCarregando(true);
    setErro(null);
    fetch(`/api/riscos/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        setConsolidadoEm(d.consolidadoEm ?? null);
        if (d.error) throw new Error(d.error);
        setRisco(d.risco);
        setImpactoForm(d.risco.impacto ? String(d.risco.impacto) : "");
        setProbabilidadeForm(d.risco.probabilidade ? String(d.risco.probabilidade) : "");
        setStatusForm(d.risco.status || "Identificado");
        setOpcaoForm(d.risco.opcao_tratamento || "");
      })
      .catch((e) => setErro(e.message || "Erro ao carregar o risco."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregarRisco();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  async function handleReavaliar(e: React.FormEvent) {
    e.preventDefault();
    if (!risco) return;
    setSalvando(true);
    setErroSalvar(null);
    setSucessoSalvar(false);
    try {
      const res = await fetch(`/api/riscos/${risco.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          impacto: impactoForm ? Number(impactoForm) : undefined,
          probabilidade: probabilidadeForm ? Number(probabilidadeForm) : undefined,
          status: statusForm,
          opcaoTratamento: opcaoForm || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao salvar.");
      setSucessoSalvar(true);
      carregarRisco();
    } catch (err) {
      setErroSalvar(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const [planos, setPlanos] = useState<PlanoAcao[]>([]);
  const [carregandoPlanos, setCarregandoPlanos] = useState(true);
  const [tituloPlano, setTituloPlano] = useState("");
  const [salvandoPlano, setSalvandoPlano] = useState(false);
  const [erroPlano, setErroPlano] = useState<string | null>(null);

  // Link vindo de "Ações atrasadas" (#planos-de-acao): rola até os planos
  // depois que eles carregam.
  useEffect(() => {
    if (!carregandoPlanos && window.location.hash === "#planos-de-acao") {
      document.getElementById("planos-de-acao")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [carregandoPlanos]);

  function carregarPlanos() {
    if (!params?.id) return;
    setCarregandoPlanos(true);
    fetch(`/api/planos-acao?riscoId=${params.id}`)
      .then((r) => r.json())
      .then((d) => setPlanos(d.planos || []))
      .catch(() => setPlanos([]))
      .finally(() => setCarregandoPlanos(false));
  }

  useEffect(() => {
    carregarPlanos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  async function handleCadastrarPlano(e: React.FormEvent) {
    e.preventDefault();
    if (!risco) return;
    setSalvandoPlano(true);
    setErroPlano(null);
    try {
      const res = await fetch("/api/planos-acao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riscoId: risco.id, titulo: tituloPlano }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao cadastrar o plano de ação.");
      setTituloPlano("");
      setNovoPlanoAberto(false);
      carregarPlanos();
      // O servidor passa o risco para Em Tratamento ao criar o primeiro plano.
      carregarRisco();
    } catch (err) {
      setErroPlano(err instanceof Error ? err.message : "Erro ao cadastrar o plano de ação.");
    } finally {
      setSalvandoPlano(false);
    }
  }

  const riscoMitigado = risco?.status === "Mitigado";
  // Regras de transição (lib/statusRisco): as opções que o servidor
  // recusaria aparecem desabilitadas, com o motivo logo abaixo.
  const resumoPlanos = {
    total: planos.length,
    conformes: planos.filter((p) => p.auditoria_status === "Conforme").length,
  };
  const statusAtual = (risco?.status || "Identificado") as StatusRisco;
  const permitidos = carregandoPlanos ? [statusAtual] : statusPermitidos(statusAtual, resumoPlanos);
  const motivosBloqueio = carregandoPlanos
    ? []
    : STATUS_RISCO.filter((st) => !permitidos.includes(st))
        .map((st) => validarTransicaoStatus(statusAtual, st, resumoPlanos))
        .filter((m): m is string => !!m);
  const perfil = usePerfilRiscos();
  const podeEditarRisco = perfil.permissoes.editarRiscos;
  const podeEditarPlanos = perfil.permissoes.editarPlanos;

  // B09: usuários que podem ser responsáveis por ações.
  const [usuarios, setUsuarios] = useState<UsuarioResponsavel[]>([]);
  useEffect(() => {
    if (!podeEditarPlanos) return;
    fetch("/api/usuarios-riscos")
      .then((r) => r.json())
      .then((d) => setUsuarios(d.usuarios || []))
      .catch(() => setUsuarios([]));
  }, [podeEditarPlanos]);
  const [novoFatorAberto, setNovoFatorAberto] = useState(false);
  const [novoPlanoAberto, setNovoPlanoAberto] = useState(false);

  const reavaliacao = riscoMitigado ? (
    <div className="field-helper" style={{ margin: 0 }}>
      Este risco foi mitigado e não pode mais ser alterado.
    </div>
  ) : !podeEditarRisco ? (
    <div className="field-helper" style={{ margin: 0 }}>
      {perfil.carregado ? "Seu perfil permite apenas consultar este risco." : "Carregando..."}
    </div>
  ) : (
    <>
      <p className="field-helper" style={{ marginTop: 0, marginBottom: "1rem" }}>
        Impacto e Probabilidade abaixo são os valores <strong>inerentes</strong> (antes de
        qualquer controle). O nível Atual e o Projetado são sempre calculados a partir dos
        Fatores de Risco — não são digitados aqui. Ao marcar o status como{" "}
        <strong>Mitigado</strong>, o risco é congelado por completo.
      </p>

      {risco && <BlocoRevisao risco={risco} />}

      <form onSubmit={handleReavaliar} className="form-grid">
        <div className="form-field">
          <label htmlFor="impactoForm">Impacto Inerente (1–5)</label>
          <select id="impactoForm" value={impactoForm} onChange={(e) => setImpactoForm(e.target.value)}>
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="probabilidadeForm">Probabilidade Inerente (1–5)</label>
          <select id="probabilidadeForm" value={probabilidadeForm} onChange={(e) => setProbabilidadeForm(e.target.value)}>
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="form-field form-field-wide">
          <label htmlFor="opcaoForm">Opção de tratamento</label>
          <select id="opcaoForm" value={opcaoForm} onChange={(e) => setOpcaoForm(e.target.value)}>
            <option value="">— não definida —</option>
            {OPCOES_TRATAMENTO.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {opcaoForm === "Aceitar" && risco?.status !== "Aceito" && (
            <p className="field-helper" style={{ margin: "0.4rem 0 0" }}>
              Para aceitar, solicite a aceitação com a Carta de Risco no painel &quot;Aceitação do risco&quot;.
            </p>
          )}
          {risco?.status === "Aceito" && opcaoForm !== "Aceitar" && (
            <p className="field-helper" style={{ margin: "0.4rem 0 0", color: "var(--danger)" }}>
              Ao salvar, a aceitação vigente será revogada e o risco sai de Aceito.
            </p>
          )}
        </div>
        <div className="form-field form-field-wide">
          <label htmlFor="statusForm">Status</label>
          <select id="statusForm" value={statusForm} onChange={(e) => setStatusForm(e.target.value)}>
            {STATUS_RISCO.map((st) => (
              <option key={st} value={st} disabled={!permitidos.includes(st)}>{st}</option>
            ))}
          </select>
          {motivosBloqueio.length > 0 && (
            <ul className="field-helper" style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem" }}>
              {motivosBloqueio.map((m) => <li key={m}>{m}</li>)}
            </ul>
          )}
        </div>
        <div className="form-field-wide form-actions">
          <button type="submit" className="btn-primary" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar reavaliação"}
          </button>
          <span className="text-muted" style={{ fontSize: "0.8rem" }}>
            Salvar registra a revisão periódica, mesmo sem mudar nenhum valor.
          </span>
          {sucessoSalvar && <span className="text-muted" style={{ fontSize: "0.85rem" }}>Salvo.</span>}
        </div>
        {erroSalvar && (
          <div className="error-banner form-field-wide" style={{ marginTop: 0 }}>
            <span className="success-icon error-icon">!</span>
            <span className="success-text">{erroSalvar}</span>
          </div>
        )}
      </form>
    </>
  );

  return (
    <section className="content-block">
      <div className="container">
        <nav className={s.migalhas} aria-label="Navegação">
          <a href="/seguranca/gestao-de-riscos">Gestão de Riscos</a> /{" "}
          <a href="/seguranca/gestao-de-riscos/riscos">Lista de Riscos</a> /{" "}
          <span>Risco {risco ? `#${risco.id}` : ""}</span>
        </nav>

        {carregando && <p className="text-muted" style={{ marginTop: "1.5rem" }}>Carregando...</p>}

        {erro && (
          <div className="error-banner" style={{ marginTop: "1.5rem" }}>
            <span className="success-icon error-icon">!</span>
            <span className="success-text">
              <strong>{consolidadoEm ? "Risco consolidado." : "Não foi possível carregar este risco."}</strong>
              <span>
                {erro}
                {consolidadoEm && (
                  <>
                    {" "}
                    <a href={`/seguranca/gestao-de-riscos/riscos/${consolidadoEm}#ocorrencias`}>Abrir o risco #{consolidadoEm}</a>
                  </>
                )}
              </span>
            </span>
          </div>
        )}

        {!carregando && !erro && risco && (
          <>
            <div className={s.cabecalho}>
              <div>
                <h1 className={s.titulo}>Risco #{risco.id}</h1>
                {(risco.titulo || risco.gatilho) && <p className={s.subtitulo}>{risco.titulo || risco.gatilho}</p>}
                {!risco.titulo && (
                  <p className="field-helper" style={{ marginTop: "0.25rem" }}>
                    <a href="#cenario">Cenário incompleto</a>: o título é gerado a partir de causa, evento e consequência.
                  </p>
                )}
                <div className={s.chips}>
                  {risco.impacto_qualitativo && (
                    <span className={`badge ${BADGE_POR_NIVEL[risco.impacto_qualitativo] || ""}`}>
                      Nível atual: {risco.impacto_qualitativo}
                    </span>
                  )}
                  <span className={s.chip}>
                    <span className={s.chipRotulo}>Status</span>
                    <span className={classeStatus(risco.status)}>{risco.status || "Identificado"}</span>
                  </span>
                  <span className={s.chip}>
                    <span className={s.chipRotulo}>Dono</span>
                    {risco.dono_nome || <a href="#responsabilidade" style={{ color: "var(--danger)" }}>sem dono</a>}
                  </span>
                  <span className={s.chip}>
                    <span className={s.chipRotulo}>Projeto</span>
                    {risco.projeto}
                  </span>
                  {risco.categoria && (
                    <span className={s.chip}>
                      <span className={s.chipRotulo}>Categoria</span>
                      {risco.categoria}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={s.grade}>
              <div className={s.coluna}>
                <ResponsabilidadeRisco
                  key={`resp-${risco.id}-${risco.dono_email}-${risco.ponto_focal_email}-${risco.sistema_critico_id}`}
                  riscoId={risco.id}
                  projetoId={risco.projeto_id}
                  donoEmail={risco.dono_email}
                  donoNome={risco.dono_nome}
                  donoContatoId={risco.dono_contato_id}
                  pontoFocalEmail={risco.ponto_focal_email}
                  pontoFocalNome={risco.ponto_focal_nome}
                  levantadoPor={risco.levantado_por}
                  ativoId={risco.sistema_critico_id}
                  ativoNome={risco.sistema_critico}
                  ativoTipo={risco.ativo_tipo}
                  ativoArea={risco.ativo_area}
                  podeTrocarAtivo={podeTrocarAtivo(risco)}
                  podeEditar={podeEditarRisco}
                  bloqueado={riscoMitigado}
                  onAtualizado={carregarRisco}
                />

                <CenarioRisco
                  key={`${risco.id}-${risco.titulo}-${risco.gatilho}-${risco.resultado_potencial}-${risco.cenario_id}`}
                  riscoId={risco.id}
                  causa={risco.causa}
                  evento={risco.evento}
                  consequencia={risco.consequencia}
                  gatilho={risco.gatilho}
                  detalhamento={risco.resultado_potencial}
                  cenarioId={risco.cenario_id}
                  cenarioCatalogo={risco.cenario_catalogo}
                  podeEditar={podeEditarRisco}
                  bloqueado={riscoMitigado}
                  onAtualizado={carregarRisco}
                />

                <OcorrenciasRisco riscoId={risco.id} />

                <div className="dash-panel">
                  <div className="dash-panel-header">Identificação</div>
                  <div className="dash-panel-body">
                    <dl className={s.campos}>
                      <Campo label="Data de levantamento" value={formatData(risco.data_levantamento)} />
                      <Campo label="Fonte" value={risco.fonte || "—"} />
                      <Campo label="Cadastrado em" value={formatData(risco.criado_em)} />
                    </dl>
                  </div>
                </div>

                <div className="dash-panel">
                  <div className="dash-panel-header">Fatores de risco e controles · {risco.fatores.length}</div>
                  <div className="dash-panel-body">
                    <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: 0, marginBottom: "1rem" }}>
                      Cada fator empurra a Probabilidade e/ou o Impacto deste risco. O Índice de
                      Mitigação e os níveis Atual e Projetado são recalculados a cada fator
                      adicionado, editado ou removido.
                    </p>

                    {risco.fatores.length === 0 && (
                      <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                        Nenhum fator de risco cadastrado ainda — o nível Atual permanece igual ao Inerente.
                      </p>
                    )}

                    {risco.fatores.map((f) => (
                      <FatorRiscoCard key={f.id} fator={f} riscoMitigado={riscoMitigado || !podeEditarRisco} onAtualizado={carregarRisco} />
                    ))}

                    {riscoMitigado ? (
                      <p className="field-helper" style={{ margin: "1rem 0 0" }}>
                        Este risco foi mitigado — não é possível cadastrar novos fatores de risco.
                      </p>
                    ) : !podeEditarRisco ? null : (
                      novoFatorAberto ? (
                        <div className={s.formularioNovo}>
                          <div className={s.formularioNovoTopo}>
                            <strong>Novo fator de risco</strong>
                            <button type="button" className={s.botaoFechar} onClick={() => setNovoFatorAberto(false)}>
                              Cancelar
                            </button>
                          </div>
                          <NovoFatorForm
                            riscoId={risco.id}
                            onCriado={() => {
                              setNovoFatorAberto(false);
                              carregarRisco();
                            }}
                          />
                        </div>
                      ) : (
                        <button type="button" className={s.botaoAdicionar} onClick={() => setNovoFatorAberto(true)}>
                          + Adicionar fator de risco
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="dash-panel" id="planos-de-acao" style={{ scrollMarginTop: "5rem" }}>
                  <div className="dash-panel-header">Planos de ação · {planos.length}</div>
                  <div className="dash-panel-body">
                    {carregandoPlanos && <p className="text-muted" style={{ fontSize: "0.85rem" }}>Carregando planos...</p>}

                    {!carregandoPlanos && planos.length === 0 && (
                      <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: 0 }}>
                        Nenhum plano de ação cadastrado para este risco ainda.
                      </p>
                    )}

                    {!carregandoPlanos && planos.map((p) => (
                      <PlanoAcaoCard
                        key={p.id}
                        plano={p}
                        riscoMitigado={riscoMitigado}
                        somenteLeitura={!podeEditarPlanos}
                        usuarios={usuarios}
                        onAtualizado={carregarPlanos}
                      />
                    ))}

                    {riscoMitigado ? (
                      <p className="field-helper" style={{ margin: "1rem 0 0" }}>
                        Este risco foi mitigado — não é possível cadastrar novos planos de ação.
                      </p>
                    ) : !podeEditarPlanos ? null : (
                      novoPlanoAberto ? (
                      <div className={s.formularioNovo}>
                        <div className={s.formularioNovoTopo}>
                          <strong>Novo plano de ação</strong>
                          <button type="button" className={s.botaoFechar} onClick={() => setNovoPlanoAberto(false)}>
                            Cancelar
                          </button>
                        </div>
                        <form onSubmit={handleCadastrarPlano} className="form-grid" style={{ maxWidth: "30rem" }}>
                          <div className="form-field form-field-wide">
                            <label htmlFor="tituloPlano">Título</label>
                            <input
                              id="tituloPlano"
                              type="text"
                              value={tituloPlano}
                              onChange={(e) => setTituloPlano(e.target.value)}
                              placeholder="Ex.: Redundância de link de internet"
                              required
                            />
                          </div>
                          <div className="form-field-wide form-actions">
                            <button type="submit" className="btn-primary" disabled={salvandoPlano}>
                              {salvandoPlano ? "Salvando..." : "Criar plano de ação"}
                            </button>
                          </div>
                          {erroPlano && (
                            <div className="error-banner form-field-wide" style={{ marginTop: 0 }}>
                              <span className="success-icon error-icon">!</span>
                              <span className="success-text">{erroPlano}</span>
                            </div>
                          )}
                        </form>
                      </div>
                      ) : (
                        <button type="button" className={s.botaoAdicionar} onClick={() => setNovoPlanoAberto(true)}>
                          + Criar plano de ação
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className={`${s.coluna} ${s.colunaResumo}`}>
                <div className="dash-panel">
                  <div className="dash-panel-header">Nível do risco</div>
                  <div className="dash-panel-body">
                    <div className={s.niveis}>
                      <div className={s.nivelCaixa}>
                        <span className={s.rotuloMono}>Inerente</span>
                        {risco.nivel_inicial ? (
                          <span className={`badge ${BADGE_POR_NIVEL[risco.nivel_inicial] || ""}`}>{risco.nivel_inicial}</span>
                        ) : "—"}
                        <span className={s.nivelIm}>Sem controles</span>
                      </div>
                      <div className={s.nivelCaixa}>
                        <span className={s.rotuloMono}>Atual</span>
                        {risco.impacto_qualitativo ? (
                          <span className={`badge ${BADGE_POR_NIVEL[risco.impacto_qualitativo] || ""}`}>{risco.impacto_qualitativo}</span>
                        ) : "—"}
                        <span className={s.nivelIm}>
                          IM P {formatPct(risco.im_prob_atual)} · I {formatPct(risco.im_imp_atual)}
                        </span>
                      </div>
                      <div className={s.nivelCaixa}>
                        <span className={s.rotuloMono}>Projetado</span>
                        {risco.nivel_projetado ? (
                          <span className={`badge ${BADGE_POR_NIVEL[risco.nivel_projetado] || ""}`}>{risco.nivel_projetado}</span>
                        ) : "—"}
                        <span className={s.nivelIm}>
                          IM P {formatPct(risco.im_prob_projetado)} · I {formatPct(risco.im_imp_projetado)}
                        </span>
                      </div>
                    </div>
                    {reavaliacao}
                  </div>
                </div>

                <ImpactoDecisao risco={risco} totalPlanos={planos.length} />
                <AceitacaoRisco
                  riscoId={risco.id}
                  statusRisco={risco.status || "Identificado"}
                  opcaoTratamento={risco.opcao_tratamento}
                  podeSolicitar={podeEditarRisco}
                  onAtualizado={carregarRisco}
                />

                {risco.sistema_critico && (
                  <div className="dash-panel">
                    <div className="dash-panel-header">Sistema crítico vinculado</div>
                    <div className="dash-panel-body">
                      <dl className={s.campos}>
                        <Campo label="Ativo ou processo" value={risco.sistema_critico} largo />
                        <Campo label="Duração (h)" value={valorComFaixa(risco.duracao_horas, risco.duracao_horas_min, risco.duracao_horas_max)} />
                        <Campo label="Degradação (%)" value={valorComFaixa(risco.percentual_degradacao, risco.percentual_degradacao_min, risco.percentual_degradacao_max)} />
                        <Campo label="Pessoas na restauração" value={valorComFaixa(risco.restauracao_pessoas, risco.restauracao_pessoas_min, risco.restauracao_pessoas_max)} />
                        <Campo label="Horas de restauração" value={valorComFaixa(risco.restauracao_horas, risco.restauracao_horas_min, risco.restauracao_horas_max)} />
                      </dl>
                    </div>
                  </div>
                )}

                <LinhaDoTempo risco={risco} planos={planos} />
              </div>
            </div>
          </>
        )}

        <a href="/seguranca/gestao-de-riscos/riscos" className={s.voltar}>
          ← Voltar para a Lista de Riscos
        </a>
      </div>
    </section>
  );
}
