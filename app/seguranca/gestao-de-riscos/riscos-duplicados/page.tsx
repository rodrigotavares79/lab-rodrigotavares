"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";

// B19 · Revisão e consolidação de riscos repetidos no mesmo projeto. Em cada
// grupo, quem edita riscos escolhe o risco principal e quais repetidos ele
// absorve. Os repetidos viram ocorrências do principal, seus planos de ação
// passam para ele e o registro original fica guardado (riscos_consolidados).

const BASE = "/seguranca/gestao-de-riscos";
const ORDEM_NIVEL: Record<string, number> = { Baixo: 1, "Médio": 2, Alto: 3, "Crítico": 4 };
const BADGE: Record<string, string> = { Baixo: "badge-baixo", "Médio": "badge-medio", Alto: "badge-alto", "Crítico": "badge-critico" };

type Risco = {
  id: number;
  status: string | null;
  nivel: string | null;
  dono_nome: string | null;
  ativo: string | null;
  levantado_por: string | null;
  data_levantamento: string | null;
  fonte: string | null;
  planos: number;
  ocorrencias: number;
  fatores: number;
  aceitacoes: number;
  bloqueioDuplicado: string | null;
  bloqueioPrincipal: string | null;
};
type Grupo = { projeto: string; titulo: string | null; riscos: Risco[] };

function data(d: string | null) {
  if (!d) return "—";
  const [a, m, dia] = d.slice(0, 10).split("-");
  return `${dia}/${m}/${a}`;
}

// Sugestão de principal: o que tem plano, depois dono, depois maior nível,
// depois o mais antigo. É só o ponto de partida: quem revisa decide.
function sugerirPrincipal(riscos: Risco[]): number {
  const candidatos = riscos.filter((r) => !r.bloqueioPrincipal);
  const lista = candidatos.length ? candidatos : riscos;
  return [...lista].sort(
    (a, b) =>
      b.planos - a.planos ||
      Number(!!b.dono_nome) - Number(!!a.dono_nome) ||
      (ORDEM_NIVEL[b.nivel || ""] || 0) - (ORDEM_NIVEL[a.nivel || ""] || 0) ||
      a.id - b.id
  )[0].id;
}

function CartaoGrupo({ grupo, onConsolidado }: { grupo: Grupo; onConsolidado: (msg: string) => void }) {
  const [principal, setPrincipal] = useState<number>(() => sugerirPrincipal(grupo.riscos));
  const [marcados, setMarcados] = useState<Set<number>>(
    () => new Set(grupo.riscos.filter((r) => !r.bloqueioDuplicado).map((r) => r.id))
  );
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const duplicados = grupo.riscos.filter((r) => r.id !== principal && marcados.has(r.id) && !r.bloqueioDuplicado);
  const principalRisco = grupo.riscos.find((r) => r.id === principal)!;
  const niveisDiferentes = new Set([principalRisco, ...duplicados].map((r) => r.nivel)).size > 1;
  const planosTransferidos = duplicados.reduce((s, r) => s + r.planos, 0);

  async function consolidar() {
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch("/api/riscos-duplicados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ principalId: principal, duplicadosIds: duplicados.map((d) => d.id) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Não foi possível consolidar.");
      onConsolidado(
        `${duplicados.map((x) => `#${x.id}`).join(", ")} ${duplicados.length > 1 ? "consolidados" : "consolidado"} no risco #${principal}.`
      );
    } catch (e: any) {
      setErro(e.message);
      setConfirmando(false);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
      <div className="dash-panel-header">
        {grupo.projeto} · {grupo.riscos.length} riscos iguais
      </div>
      <div className="dash-panel-body">
        <p style={{ marginTop: 0 }}>{grupo.titulo}</p>
        <div className="dash-table-scroll">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Principal</th>
                <th>Consolidar</th>
                <th>Risco</th>
                <th>Nível</th>
                <th>Status</th>
                <th>Dono</th>
                <th>Planos</th>
                <th>Levantado</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {grupo.riscos.map((r) => {
                const ehPrincipal = r.id === principal;
                return (
                  <tr key={r.id} style={ehPrincipal ? { background: "var(--surface)" } : undefined}>
                    <td>
                      <input
                        type="radio"
                        name={`principal-${grupo.riscos[0].id}`}
                        checked={ehPrincipal}
                        disabled={!!r.bloqueioPrincipal}
                        onChange={() => {
                          setPrincipal(r.id);
                          setConfirmando(false);
                        }}
                        aria-label={`Risco #${r.id} como principal`}
                      />
                    </td>
                    <td>
                      {!ehPrincipal && (
                        <input
                          type="checkbox"
                          checked={marcados.has(r.id) && !r.bloqueioDuplicado}
                          disabled={!!r.bloqueioDuplicado}
                          onChange={(e) => {
                            const n = new Set(marcados);
                            if (e.target.checked) n.add(r.id);
                            else n.delete(r.id);
                            setMarcados(n);
                            setConfirmando(false);
                          }}
                          aria-label={`Consolidar o risco #${r.id}`}
                        />
                      )}
                    </td>
                    <td>
                      <a href={`${BASE}/riscos/${r.id}`} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                        #{r.id}
                      </a>
                    </td>
                    <td>{r.nivel ? <span className={`badge ${BADGE[r.nivel] || ""}`}>{r.nivel}</span> : "—"}</td>
                    <td>{r.status || "—"}</td>
                    <td>{r.dono_nome || "—"}</td>
                    <td>{r.planos}</td>
                    <td style={{ whiteSpace: "normal", minWidth: "9rem" }}>
                      {data(r.data_levantamento)}
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                        {r.levantado_por || "—"}
                        {r.fonte ? ` · ${r.fonte}` : ""}
                      </div>
                    </td>
                    <td style={{ whiteSpace: "normal", minWidth: "10rem", fontSize: "0.8rem" }}>
                      {ehPrincipal ? (
                        <strong>fica</strong>
                      ) : r.bloqueioDuplicado ? (
                        <span style={{ color: "var(--danger)" }}>não pode ser consolidado: {r.bloqueioDuplicado}</span>
                      ) : marcados.has(r.id) ? (
                        `vira ocorrência do #${principal}${r.planos ? `; ${r.planos} plano(s) passam para ele` : ""}`
                      ) : (
                        "continua como risco separado"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {erro && (
          <p className="field-helper" style={{ color: "var(--danger)" }}>
            {erro}
          </p>
        )}

        {!confirmando ? (
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: "1rem" }}
            disabled={duplicados.length === 0}
            onClick={() => setConfirmando(true)}
          >
            Consolidar {duplicados.length} no #{principal}
          </button>
        ) : (
          <div className="dash-panel" style={{ marginTop: "1rem", borderColor: "var(--danger)" }}>
            <div className="dash-panel-body">
              <p style={{ marginTop: 0 }}>
                <strong>
                  {duplicados.map((d) => `#${d.id}`).join(", ")} {duplicados.length > 1 ? "deixam" : "deixa"} de existir
                  como risco
                </strong>{" "}
                e {duplicados.length > 1 ? "viram ocorrências" : "vira ocorrência"} do #{principal}
                {planosTransferidos > 0 ? `, que recebe ${planosTransferidos} plano(s) de ação` : ""}. O registro completo
                fica guardado no histórico, e o endereço antigo passa a apontar para o #{principal}. Não há como desfazer
                pela tela.
              </p>
              {niveisDiferentes && (
                <p className="field-helper" style={{ color: "var(--danger)" }}>
                  Os níveis são diferentes. O #{principal} mantém o nível {principalRisco.nivel || "atual"}; reavalie-o
                  depois, se for o caso.
                </p>
              )}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="button" className="btn-primary" onClick={consolidar} disabled={enviando}>
                  {enviando ? "Consolidando..." : "Confirmar consolidação"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setConfirmando(false)} disabled={enviando}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RiscosDuplicados() {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function carregar() {
    fetch("/api/riscos-duplicados")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setGrupos(d.grupos || []);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar."));
  }
  useEffect(carregar, []);

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Riscos repetidos</h1>
          <p className="lede">
            Riscos do mesmo projeto com o mesmo cenário. Em cada grupo, escolha o risco principal: os outros viram
            ocorrências dele e seus planos de ação passam para ele. Riscos de projetos diferentes não aparecem aqui:
            cada projeto avalia e trata o seu.
          </p>

          {aviso && (
            <div className="dash-panel" style={{ marginTop: "1.5rem", borderColor: "var(--accent)" }}>
              <div className="dash-panel-body">
                <strong>{aviso}</strong>
              </div>
            </div>
          )}

          {!grupos && !erro && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}
          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}
          {grupos && grupos.length === 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-body">
                <p className="text-muted" style={{ margin: 0 }}>Nenhum risco repetido no mesmo projeto.</p>
              </div>
            </div>
          )}
          {grupos?.map((g) => (
            <CartaoGrupo
              key={g.riscos.map((r) => r.id).join("-")}
              grupo={g}
              onConsolidado={(msg) => {
                setAviso(msg);
                carregar();
              }}
            />
          ))}

          <a href={BASE} className="status-tag" style={{ marginTop: "2.5rem", display: "inline-block" }}>
            ← Voltar para Gestão de Riscos
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
