"use client";

import { useEffect, useState } from "react";

// B19 · No cadastro, mostra os riscos do mesmo projeto com cenário parecido
// e permite registrar o que está sendo cadastrado como nova ocorrência de um
// deles, em vez de criar um risco repetido.

type Semelhante = {
  id: number;
  titulo: string | null;
  status: string | null;
  nivel: string | null;
  dono: string | null;
  ocorrencias: number;
  nota: number;
};

const BADGE: Record<string, string> = { Baixo: "badge-baixo", "Médio": "badge-medio", Alto: "badge-alto", "Crítico": "badge-critico" };
const FONTES = ["Auditoria Interna", "Auditoria Externa", "Incidente", "Análise de Processo", "Stakeholder", "Avaliação de Terceiros", "Outro"];
const BASE = "/seguranca/gestao-de-riscos";

function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function RiscosSemelhantes({
  projetoId,
  evento,
  causa,
  consequencia,
}: {
  projetoId: string;
  evento: string;
  causa: string;
  consequencia: string;
}) {
  const [lista, setLista] = useState<Semelhante[]>([]);
  const [alvo, setAlvo] = useState<Semelhante | null>(null);
  const [data, setData] = useState(hoje());
  const [fonte, setFonte] = useState("");
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [registrada, setRegistrada] = useState<{ id: number; titulo: string | null } | null>(null);

  // Busca com atraso de 600 ms depois da última tecla.
  useEffect(() => {
    if (!projetoId || (evento.trim().length < 5 && causa.trim().length < 5)) {
      setLista([]);
      return;
    }
    const t = setTimeout(() => {
      fetch("/api/riscos-semelhantes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projetoId: Number(projetoId), evento, causa, consequencia }),
      })
        .then((r) => r.json())
        .then((d) => setLista(d.semelhantes || []))
        .catch(() => setLista([]));
    }, 600);
    return () => clearTimeout(t);
  }, [projetoId, evento, causa, consequencia]);

  function escolher(s: Semelhante) {
    setErro(null);
    setAlvo(s);
    setObservacao([evento, causa, consequencia].filter((x) => x.trim()).join(" · "));
  }

  async function registrar() {
    if (!alvo) return;
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/riscos/${alvo.id}/ocorrencias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataLevantamento: data, fonte, observacao }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Não foi possível registrar a ocorrência.");
      setRegistrada({ id: alvo.id, titulo: alvo.titulo });
      setAlvo(null);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (registrada) {
    return (
      <div className="form-field form-field-wide">
        <div className="dash-panel" style={{ margin: 0, borderColor: "var(--accent)" }}>
          <div className="dash-panel-body">
            <strong>Ocorrência registrada no risco #{registrada.id}.</strong>{" "}
            <a href={`${BASE}/riscos/${registrada.id}#ocorrencias`}>Abrir o risco</a> ·{" "}
            <button
              type="button"
              onClick={() => setRegistrada(null)}
              style={{ background: "none", border: 0, padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit" }}
            >
              continuar cadastrando
            </button>
            <p className="field-helper" style={{ marginBottom: 0 }}>
              Nenhum risco novo foi criado. Se ainda assim for um risco diferente, continue o cadastro normalmente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (lista.length === 0) return null;

  return (
    <div className="form-field form-field-wide">
      <div className="dash-panel" style={{ margin: 0 }}>
        <div className="dash-panel-header">
          {lista.length === 1 ? "1 risco parecido" : `${lista.length} riscos parecidos`} neste projeto
        </div>
        <div className="dash-panel-body">
          <p className="field-helper" style={{ marginTop: 0 }}>
            Se for o mesmo risco identificado de novo, registre como ocorrência dele em vez de cadastrar outro.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
            {lista.map((s) => (
              <li key={s.id} style={{ borderTop: "1px solid var(--border)", paddingTop: "0.6rem" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "baseline" }}>
                  <a href={`${BASE}/riscos/${s.id}`} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                    #{s.id}
                  </a>
                  <span>{s.titulo || "—"}</span>
                </div>
                <div className="text-muted" style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>
                  {s.nivel && <span className={`badge ${BADGE[s.nivel] || ""}`} style={{ marginRight: "0.4rem" }}>{s.nivel}</span>}
                  {s.status} · {Math.round(s.nota * 100)}% parecido
                  {s.dono ? ` · dono: ${s.dono}` : ""}
                  {s.ocorrencias > 0 ? ` · ${s.ocorrencias} ocorrência${s.ocorrencias > 1 ? "s" : ""}` : ""}
                </div>
                {s.status === "Mitigado" ? (
                  <p className="field-helper" style={{ margin: "0.3rem 0 0" }}>
                    Mitigado: se voltou a acontecer, cadastre como risco novo.
                  </p>
                ) : (
                  alvo?.id !== s.id && (
                    <button
                      type="button"
                      onClick={() => escolher(s)}
                      style={{ background: "none", border: 0, padding: 0, marginTop: "0.3rem", color: "var(--accent)", cursor: "pointer", font: "inherit" }}
                    >
                      Registrar como nova ocorrência deste risco
                    </button>
                  )
                )}
                {alvo?.id === s.id && (
                  <div style={{ marginTop: "0.6rem" }}>
                    <div className="form-grid">
                      <div className="form-field">
                        <label htmlFor="ocData">Data da ocorrência</label>
                        <input id="ocData" type="date" value={data} onChange={(e) => setData(e.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="ocFonte">Fonte</label>
                        <select id="ocFonte" value={fonte} onChange={(e) => setFonte(e.target.value)}>
                          <option value="">Selecione</option>
                          {FONTES.map((f) => (
                            <option key={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-field form-field-wide">
                        <label htmlFor="ocObs">O que foi observado *</label>
                        <textarea id="ocObs" rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
                      </div>
                    </div>
                    {erro && (
                      <p className="field-helper" style={{ color: "var(--danger)" }}>
                        {erro}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                      <button type="button" className="btn-primary" onClick={registrar} disabled={enviando}>
                        {enviando ? "Registrando..." : `Registrar ocorrência no #${s.id}`}
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => setAlvo(null)} disabled={enviando}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
