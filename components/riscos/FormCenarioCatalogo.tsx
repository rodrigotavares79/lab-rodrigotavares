"use client";

import { useState } from "react";

// B27 · Formulário de cenário do catálogo (novo ou edição).

export type DadosForm = {
  nome: string;
  evento: string;
  causa: string;
  consequencia: string;
  categoria: string;
  descricao: string;
};

const CATEGORIAS = [
  "Tecnológico",
  "Operacional",
  "Estratégico",
  "Financeiro",
  "Conformidade / Regulatório",
  "Segurança da Informação",
  "Reputacional",
];

export default function FormCenarioCatalogo({
  inicial,
  onSalvar,
  onCancelar,
}: {
  inicial: DadosForm;
  onSalvar: (d: DadosForm) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [d, setD] = useState<DadosForm>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const campo = (k: keyof DadosForm) => ({
    value: d[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setD({ ...d, [k]: e.target.value }),
  });

  async function salvar() {
    setSalvando(true);
    setErro(await onSalvar(d));
    setSalvando(false);
  }

  return (
    <div>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="cnNome">Nome do cenário *</label>
          <input id="cnNome" type="text" maxLength={150} {...campo("nome")} />
        </div>
        <div className="form-field">
          <label htmlFor="cnCategoria">Categoria</label>
          <select id="cnCategoria" {...campo("categoria")}>
            <option value="">—</option>
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="form-field form-field-wide">
          <label htmlFor="cnCausa">Causa *</label>
          <input id="cnCausa" type="text" maxLength={300} {...campo("causa")} />
        </div>
        <div className="form-field form-field-wide">
          <label htmlFor="cnEvento">Evento *</label>
          <input id="cnEvento" type="text" maxLength={300} {...campo("evento")} />
        </div>
        <div className="form-field form-field-wide">
          <label htmlFor="cnConsequencia">Consequência *</label>
          <input id="cnConsequencia" type="text" maxLength={300} {...campo("consequencia")} />
        </div>
        <div className="form-field form-field-wide">
          <label htmlFor="cnDescricao">Descrição / orientações</label>
          <textarea id="cnDescricao" rows={2} maxLength={2000} {...campo("descricao")} />
        </div>
      </div>
      {erro && (
        <p className="field-helper" style={{ color: "var(--danger)" }}>
          {erro}
        </p>
      )}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
        <button type="button" className="btn-primary" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
