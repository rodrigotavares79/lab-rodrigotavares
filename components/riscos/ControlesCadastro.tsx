"use client";

import {
  OPCOES_NATUREZA_FATOR,
  OPCOES_CRITICIDADE,
  OPCOES_TIPO_CONTROLE,
  OPCOES_NATUREZA_CONTROLE,
  OPCOES_EFICACIA_POTENCIAL,
  OPCOES_STATUS_IMPLEMENTACAO,
} from "@/lib/metodologiaRisco";

// B15 · Controles existentes no cadastro do risco. Cada controle vira um
// fator de risco (o que o controle trata + o controle) e entra no cálculo do
// nível atual. Sem controle, é preciso declarar que não há e justificar.

export type ControleCadastro = {
  descricao: string;
  natureza: string;
  criticidade: string;
  controleDescricao: string;
  tipoControle: string;
  naturezaControle: string;
  eficaciaPotencial: string;
  statusImplementacao: string;
};

export function controleVazio(causa: string): ControleCadastro {
  return {
    descricao: causa,
    natureza: "Exposição",
    criticidade: "Média",
    controleDescricao: "",
    tipoControle: "Preventivo",
    naturezaControle: "Processo / Manual",
    eficaciaPotencial: "Média",
    statusImplementacao: "Implementado — pendente de validação",
  };
}

function Select({ id, rotulo, valor, opcoes, onChange }: { id: string; rotulo: string; valor: string; opcoes: string[]; onChange: (v: string) => void }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{rotulo}</label>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)}>
        {opcoes.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

export default function ControlesCadastro({
  controles,
  setControles,
  semControles,
  setSemControles,
  justificativa,
  setJustificativa,
  causa,
}: {
  controles: ControleCadastro[];
  setControles: (c: ControleCadastro[]) => void;
  semControles: boolean;
  setSemControles: (v: boolean) => void;
  justificativa: string;
  setJustificativa: (v: string) => void;
  causa: string;
}) {
  const alterar = (i: number, k: keyof ControleCadastro, v: string) =>
    setControles(controles.map((c, j) => (j === i ? { ...c, [k]: v } : c)));

  return (
    <div className="form-grid">
      <p className="field-helper form-field-wide" style={{ marginTop: 0 }}>
        Informe os controles que <strong>já existem</strong> hoje. Eles reduzem a probabilidade e/ou o impacto e
        definem o nível atual; o nível inerente continua sendo a avaliação sem controles.
      </p>

      {controles.map((c, i) => (
        <div key={i} className="form-field-wide" style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "0.8rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <strong>Controle {i + 1}</strong>
            <button
              type="button"
              onClick={() => setControles(controles.filter((_, j) => j !== i))}
              style={{ background: "none", border: 0, color: "var(--danger)", cursor: "pointer", font: "inherit" }}
            >
              Remover
            </button>
          </div>
          <div className="form-grid">
            <div className="form-field form-field-wide">
              <label htmlFor={`ctrlDesc${i}`}>Controle existente *</label>
              <input
                id={`ctrlDesc${i}`}
                type="text"
                value={c.controleDescricao}
                onChange={(e) => alterar(i, "controleDescricao", e.target.value)}
                placeholder="Ex.: varredura semanal de vulnerabilidades com correção em até 15 dias"
              />
            </div>
            <div className="form-field form-field-wide">
              <label htmlFor={`ctrlFator${i}`}>O que o controle trata (fator de risco) *</label>
              <input id={`ctrlFator${i}`} type="text" value={c.descricao} onChange={(e) => alterar(i, "descricao", e.target.value)} />
            </div>
            <Select id={`ctrlTipo${i}`} rotulo="Tipo do controle" valor={c.tipoControle} opcoes={OPCOES_TIPO_CONTROLE} onChange={(v) => alterar(i, "tipoControle", v)} />
            <Select id={`ctrlNatC${i}`} rotulo="Natureza do controle" valor={c.naturezaControle} opcoes={OPCOES_NATUREZA_CONTROLE} onChange={(v) => alterar(i, "naturezaControle", v)} />
            <Select id={`ctrlEf${i}`} rotulo="Eficácia" valor={c.eficaciaPotencial} opcoes={OPCOES_EFICACIA_POTENCIAL} onChange={(v) => alterar(i, "eficaciaPotencial", v)} />
            <Select id={`ctrlSt${i}`} rotulo="Situação" valor={c.statusImplementacao} opcoes={OPCOES_STATUS_IMPLEMENTACAO} onChange={(v) => alterar(i, "statusImplementacao", v)} />
            <Select id={`ctrlNatF${i}`} rotulo="Natureza do fator" valor={c.natureza} opcoes={OPCOES_NATUREZA_FATOR} onChange={(v) => alterar(i, "natureza", v)} />
            <Select id={`ctrlCrit${i}`} rotulo="Criticidade do fator" valor={c.criticidade} opcoes={OPCOES_CRITICIDADE} onChange={(v) => alterar(i, "criticidade", v)} />
          </div>
        </div>
      ))}

      {!semControles && (
        <div className="form-field-wide">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setControles([...controles, controleVazio(causa)])}
          >
            + Adicionar controle existente
          </button>
        </div>
      )}

      {controles.length === 0 && (
        <div className="form-field form-field-wide">
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontWeight: 400 }}>
            <input type="checkbox" checked={semControles} onChange={(e) => setSemControles(e.target.checked)} />
            Não há controles existentes para este risco
          </label>
          {semControles && (
            <textarea
              rows={2}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Explique por que não há controles (ex.: sistema novo, controle ainda não contratado)"
              aria-label="Justificativa de não haver controles"
              style={{ marginTop: "0.4rem" }}
            />
          )}
        </div>
      )}
    </div>
  );
}
