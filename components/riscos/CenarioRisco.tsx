"use client";

import { useState } from "react";
import { montarTituloRisco, validarCenario, TAMANHO_MAXIMO_CAMPO } from "@/lib/cenarioRisco";

// B13 · Painel "Cenário de risco" na tela do risco: causa → evento →
// consequência, ponto de gatilho e detalhamento do impacto. Quem edita riscos
// pode corrigir o cenário; o título é remontado a partir dos três campos.

type Props = {
  riscoId: number;
  causa: string | null;
  evento: string | null;
  consequencia: string | null;
  gatilho: string | null;
  detalhamento: string | null;
  podeEditar: boolean;
  bloqueado?: boolean;
  onAtualizado: () => void;
};

const estiloRotulo: React.CSSProperties = {
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-muted)",
  margin: 0,
};

function Bloco({ rotulo, texto, dica }: { rotulo: string; texto: string | null; dica?: string }) {
  return (
    <div style={{ marginBottom: "0.9rem" }}>
      <p style={estiloRotulo}>
        {rotulo}
        {dica && <span style={{ textTransform: "none", letterSpacing: 0 }}> · {dica}</span>}
      </p>
      <p style={{ margin: "0.2rem 0 0" }}>{texto || <span className="text-muted">—</span>}</p>
    </div>
  );
}

export default function CenarioRisco(props: Props) {
  const [editando, setEditando] = useState(false);
  const [causa, setCausa] = useState(props.causa || "");
  const [evento, setEvento] = useState(props.evento || "");
  const [consequencia, setConsequencia] = useState(props.consequencia || "");
  const [gatilho, setGatilho] = useState(props.gatilho || "");
  const [detalhamento, setDetalhamento] = useState(props.detalhamento || "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const completo = !!(props.causa && props.evento && props.consequencia);
  const previa = montarTituloRisco({ causa, evento, consequencia });

  function abrir() {
    setCausa(props.causa || "");
    setEvento(props.evento || "");
    setConsequencia(props.consequencia || "");
    setGatilho(props.gatilho || "");
    setDetalhamento(props.detalhamento || "");
    setErro(null);
    setEditando(true);
  }

  async function salvar() {
    const invalido = validarCenario({ causa, evento, consequencia });
    if (invalido) {
      setErro(invalido);
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/riscos/${props.riscoId}/cenario`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ causa, evento, consequencia, gatilho, detalhamento }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Não foi possível salvar o cenário.");
      setEditando(false);
      props.onAtualizado();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="dash-panel" id="cenario">
      <div className="dash-panel-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <span>Cenário de risco</span>
        {props.podeEditar && !props.bloqueado && !editando && (
          <button
            type="button"
            onClick={abrir}
            style={{ background: "none", border: 0, padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit" }}
          >
            Editar cenário
          </button>
        )}
      </div>
      <div className="dash-panel-body">
        {!editando && (
          <>
            {!completo && (
              <p className="field-helper" style={{ marginTop: 0, color: "var(--danger)" }}>
                Cenário incompleto: preencha causa, evento e consequência para gerar o título do risco.
              </p>
            )}
            <Bloco rotulo="Causa" dica="por que pode acontecer" texto={props.causa} />
            <Bloco rotulo="Evento" dica="o que pode acontecer" texto={props.evento} />
            <Bloco rotulo="Consequência" dica="o que acontece se ocorrer" texto={props.consequencia} />
            <Bloco rotulo="Ponto de gatilho" dica="sinal observável de que o risco está se materializando" texto={props.gatilho} />
            <Bloco rotulo="Detalhamento do impacto" texto={props.detalhamento} />
          </>
        )}

        {editando && (
          <div>
            {[
              ["causaCenario", "Causa", "Por que pode acontecer (ameaça, vulnerabilidade, falha de controle)", causa, setCausa],
              ["eventoCenario", "Evento", "O que pode acontecer", evento, setEvento],
              ["consequenciaCenario", "Consequência", "O que acontece se o evento ocorrer", consequencia, setConsequencia],
            ].map(([id, rotulo, dica, valor, setter]: any) => (
              <div className="form-field" key={id}>
                <label htmlFor={id}>{rotulo} *</label>
                <input
                  id={id}
                  type="text"
                  value={valor}
                  maxLength={TAMANHO_MAXIMO_CAMPO}
                  placeholder={dica}
                  onChange={(e) => setter(e.target.value)}
                />
              </div>
            ))}
            <div className="form-field">
              <label htmlFor="gatilhoCenario">Ponto de gatilho</label>
              <input
                id="gatilhoCenario"
                type="text"
                value={gatilho}
                maxLength={500}
                placeholder="Sinal observável e mensurável (ex.: CVSS ≥ 9 sem correção em 15 dias)"
                onChange={(e) => setGatilho(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="detalhamentoCenario">Detalhamento do impacto</label>
              <textarea
                id="detalhamentoCenario"
                rows={3}
                value={detalhamento}
                maxLength={4000}
                onChange={(e) => setDetalhamento(e.target.value)}
              />
            </div>
            <p className="field-helper">
              <strong>Título:</strong> {previa || "preencha causa, evento e consequência"}
            </p>
            {erro && (
              <p className="field-helper" style={{ color: "var(--danger)" }}>
                {erro}
              </p>
            )}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
              <button type="button" className="btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar cenário"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditando(false)} disabled={salvando}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
