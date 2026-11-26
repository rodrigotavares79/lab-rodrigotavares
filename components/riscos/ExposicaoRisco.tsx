"use client";

import { useState } from "react";
import { calcularExposicao, lerFaixa, moeda, perdaPorIndisponibilidade, textoFrequencia, LIMITE_FREQUENCIA, LIMITE_HORAS } from "@/lib/exposicaoRisco";

// B23 · Painel "Exposição financeira (perda anual esperada)" na tela do
// risco: frequência anual e perda por evento em faixas, com a prévia do
// cálculo antes de gravar. A perda pode ser calculada pelo ativo crítico:
// custo de indisponibilidade por hora × horas de parada.

type Dados = {
  id: number;
  freq_anual_min: number | string | null;
  freq_anual_provavel: number | string | null;
  freq_anual_max: number | string | null;
  perda_evento_min: number | string | null;
  perda_evento_provavel: number | string | null;
  perda_evento_max: number | string | null;
  perda_origem: string | null;
  exposicao_ale: number | string | null;
  exposicao_min: number | string | null;
  exposicao_max: number | string | null;
  exposicao_premissas: string | null;
  exposicao_em: string | null;
  horas_parada_min?: number | string | null;
  horas_parada_provavel?: number | string | null;
  horas_parada_max?: number | string | null;
  sistema_critico?: string | null;
  custo_indisponibilidade_hora?: number | string | null;
};

const GRADE = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.5rem" } as const;

const s = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v).replace(".", ","));

export default function ExposicaoRisco({ risco, podeEditar, onAtualizado }: { risco: Dados; podeEditar: boolean; onAtualizado: () => void }) {
  const custoHora = Number(risco.custo_indisponibilidade_hora || 0);
  const temCustoHora = custoHora > 0;
  const [editando, setEditando] = useState(false);
  const [usarAtivo, setUsarAtivo] = useState(risco.perda_origem === "ativo" || (!risco.perda_origem && temCustoHora));
  const [h, setH] = useState({ min: s(risco.horas_parada_min), provavel: s(risco.horas_parada_provavel), max: s(risco.horas_parada_max) });
  const [f, setF] = useState({ min: s(risco.freq_anual_min), provavel: s(risco.freq_anual_provavel), max: s(risco.freq_anual_max) });
  const [p, setP] = useState({ min: s(risco.perda_evento_min), provavel: s(risco.perda_evento_provavel), max: s(risco.perda_evento_max) });
  const [premissas, setPremissas] = useState(risco.exposicao_premissas ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const freq = lerFaixa(f, "frequência anual", LIMITE_FREQUENCIA);
  const horas = lerFaixa(h, "horas de parada", LIMITE_HORAS);
  const perda = usarAtivo && temCustoHora
    ? typeof horas === "string"
      ? horas
      : perdaPorIndisponibilidade(custoHora, horas)
    : lerFaixa(p, "perda por evento");
  const previa = typeof freq !== "string" && perda && typeof perda !== "string" ? calcularExposicao(freq, perda) : null;
  const erroForm = typeof freq === "string" ? freq : !perda ? "O ativo não tem custo por hora." : typeof perda === "string" ? perda : null;

  async function salvar() {
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/riscos/${risco.id}/exposicao`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequencia: f, perda: p, usarAtivo: usarAtivo && temCustoHora, horas: h, premissas }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setEditando(false);
      onAtualizado();
    } catch (e: any) {
      setErro(e.message || "Erro ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  async function remover() {
    setEnviando(true);
    await fetch(`/api/riscos/${risco.id}/exposicao`, { method: "DELETE" }).catch(() => null);
    setEnviando(false);
    onAtualizado();
  }

  const tem = risco.exposicao_ale !== null && risco.exposicao_ale !== undefined;
  const campo = (rotulo: string, valor: string, mudar: (v: string) => void, id: string) => (
    <div className="form-field" style={{ margin: 0, minWidth: 0 }}>
      <label htmlFor={id} style={{ fontSize: "0.75rem" }}>{rotulo}</label>
      <input id={id} inputMode="decimal" value={valor} onChange={(e) => mudar(e.target.value)} style={{ width: "100%", minWidth: 0 }} />
    </div>
  );

  return (
    <div className="dash-panel" id="exposicao">
      <div className="dash-panel-header">Exposição financeira (perda anual esperada)</div>
      <div className="dash-panel-body">
        {!editando && (
          <>
            {tem ? (
              <>
                <p style={{ fontSize: "1.6rem", fontWeight: 700, margin: 0 }}>{moeda(risco.exposicao_ale)} <span style={{ fontSize: "0.85rem", fontWeight: 400 }}>por ano</span></p>
                <p className="text-muted" style={{ fontSize: "0.8rem", margin: "0.2rem 0 0.75rem" }}>
                  Faixa de {moeda(risco.exposicao_min)} a {moeda(risco.exposicao_max)} por ano
                </p>
                <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.25rem 0.75rem", margin: 0, fontSize: "0.82rem" }}>
                  <dt className="text-muted">Frequência</dt>
                  <dd style={{ margin: 0 }}>
                    {textoFrequencia(Number(risco.freq_anual_provavel))} (de {s(risco.freq_anual_min)} a {s(risco.freq_anual_max)} por ano)
                  </dd>
                  <dt className="text-muted">Perda por evento</dt>
                  <dd style={{ margin: 0 }}>
                    {moeda(risco.perda_evento_provavel)} (de {moeda(risco.perda_evento_min)} a {moeda(risco.perda_evento_max)})
                    {risco.perda_origem === "ativo" && (
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                        {moeda(risco.custo_indisponibilidade_hora)}/h de indisponibilidade de {risco.sistema_critico || "o ativo"} ×{" "}
                        {s(risco.horas_parada_provavel)} h de parada (de {s(risco.horas_parada_min)} a {s(risco.horas_parada_max)} h)
                      </div>
                    )}
                  </dd>
                  {risco.exposicao_premissas && (
                    <>
                      <dt className="text-muted">Premissas</dt>
                      <dd style={{ margin: 0 }}>{risco.exposicao_premissas}</dd>
                    </>
                  )}
                </dl>
              </>
            ) : (
              <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                Sem estimativa. Informe quantas vezes por ano o evento deve ocorrer e quanto custa cada ocorrência
                {temCustoHora ? ` (a perda pode ser calculada pelo custo de ${moeda(custoHora)}/h de indisponibilidade de ${risco.sistema_critico})` : ""}.
              </p>
            )}
            {podeEditar && (
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.9rem" }}>
                <button className="status-tag" onClick={() => setEditando(true)}>{tem ? "Revisar estimativa" : "Estimar exposição"}</button>
                {tem && <button className="status-tag" disabled={enviando} onClick={remover}>Remover</button>}
              </div>
            )}
          </>
        )}

        {editando && (
          <>
            <p style={{ margin: "0 0 0.4rem", fontWeight: 600, fontSize: "0.85rem" }}>Frequência anual (ocorrências por ano)</p>
            <div style={GRADE}>
              {campo("Mínimo", f.min, (v) => setF({ ...f, min: v }), "fMin")}
              {campo("Provável", f.provavel, (v) => setF({ ...f, provavel: v }), "fProv")}
              {campo("Máximo", f.max, (v) => setF({ ...f, max: v }), "fMax")}
            </div>
            <p className="field-helper" style={{ margin: "0.25rem 0 0.75rem" }}>Ex.: 0,2 = uma vez a cada 5 anos; 2 = duas vezes por ano.</p>

            <p style={{ margin: "0 0 0.4rem", fontWeight: 600, fontSize: "0.85rem" }}>Perda por evento (R$)</p>
            {temCustoHora && (
              <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", fontSize: "0.82rem", marginBottom: "0.4rem" }}>
                <input type="checkbox" checked={usarAtivo} onChange={(e) => setUsarAtivo(e.target.checked)} />
                Calcular pela indisponibilidade de {risco.sistema_critico}: {moeda(custoHora)} por hora parada
              </label>
            )}
            {usarAtivo && temCustoHora && (
              <>
                <p style={{ margin: "0 0 0.3rem", fontSize: "0.78rem" }}>Horas de parada por evento</p>
                <div style={GRADE}>
                  {campo("Mínimo", h.min, (v) => setH({ ...h, min: v }), "hMin")}
                  {campo("Provável", h.provavel, (v) => setH({ ...h, provavel: v }), "hProv")}
                  {campo("Máximo", h.max, (v) => setH({ ...h, max: v }), "hMax")}
                </div>
                {perda && typeof perda !== "string" && (
                  <p className="field-helper" style={{ margin: "0.25rem 0 0" }}>
                    Perda por evento: {moeda(perda.min)} a {moeda(perda.max)} (provável {moeda(perda.provavel)})
                  </p>
                )}
              </>
            )}
            {(!usarAtivo || !temCustoHora) && (
              <div style={GRADE}>
                {campo("Mínimo", p.min, (v) => setP({ ...p, min: v }), "pMin")}
                {campo("Provável", p.provavel, (v) => setP({ ...p, provavel: v }), "pProv")}
                {campo("Máximo", p.max, (v) => setP({ ...p, max: v }), "pMax")}
              </div>
            )}
            <div className="form-field" style={{ marginTop: "0.75rem" }}>
              <label htmlFor="premissasExp" style={{ fontSize: "0.75rem" }}>Premissas (opcional)</label>
              <textarea id="premissasExp" rows={2} value={premissas} onChange={(e) => setPremissas(e.target.value)} placeholder="De onde vieram os números: histórico de incidentes, benchmark, opinião do dono..." />
            </div>
            <p style={{ margin: "0.5rem 0", fontSize: "0.88rem" }}>
              {previa ? (
                <>Perda anual esperada: <strong>{moeda(previa.ale)}</strong> <span className="text-muted">(de {moeda(previa.min)} a {moeda(previa.max)})</span></>
              ) : (
                <span style={{ color: "var(--danger)" }}>{erroForm}</span>
              )}
            </p>
            {erro && <p style={{ color: "var(--danger)", margin: "0 0 0.5rem" }}>{erro}</p>}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn-primary" disabled={!previa || enviando} onClick={salvar}>Salvar estimativa</button>
              <button className="status-tag" onClick={() => setEditando(false)}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
