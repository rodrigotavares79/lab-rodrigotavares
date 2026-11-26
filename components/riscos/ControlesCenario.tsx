"use client";

import { useCallback, useEffect, useState } from "react";
import { FRAMEWORKS } from "@/lib/conformidadeFrameworks";
import type { Catalogo, FrameworkId } from "@/lib/mapeamentoControles";

// B24 · Biblioteca de controles do cenário, revisada manualmente. Os riscos
// ligados ao cenário recebem esses controles como sugestão "da biblioteca"
// na tela de Conformidade (cada risco ainda confirma o status).

type Linha = { id: number; framework: FrameworkId; controle_id: string; controle_titulo: string; revisado_por_nome: string | null; revisado_em: string };
const IDS: FrameworkId[] = ["cis", "nist", "iso"];
const nomeFw = (fw: FrameworkId) => `${FRAMEWORKS[fw].nome} ${FRAMEWORKS[fw].versao.split(" ")[0]}`;

export default function ControlesCenario({ cenarioId }: { cenarioId: number }) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [podeEditar, setPodeEditar] = useState(false);
  const [fw, setFw] = useState<FrameworkId>("iso");
  const [controle, setControle] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    fetch(`/api/cenarios/${cenarioId}/controles`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setLinhas(d.controles);
        setCatalogo(d.catalogo);
        setPodeEditar(!!d.podeEditar);
      })
      .catch((e) => setErro(e.message));
  }, [cenarioId]);
  useEffect(carregar, [carregar]);

  async function incluir() {
    setOcupado(true);
    setErro(null);
    const r = await fetch(`/api/cenarios/${cenarioId}/controles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ framework: fw, controleId: controle }),
    });
    if (!r.ok) setErro((await r.json()).error);
    setControle("");
    setOcupado(false);
    carregar();
  }

  async function retirar(l: Linha) {
    setOcupado(true);
    await fetch(`/api/cenarios/${cenarioId}/controles?framework=${l.framework}&controleId=${encodeURIComponent(l.controle_id)}`, { method: "DELETE" });
    setOcupado(false);
    carregar();
  }

  const ja = new Set((linhas ?? []).map((l) => `${l.framework}|${l.controle_id}`));

  return (
    <div className="dash-panel" style={{ marginTop: "1.5rem" }} id="controles">
      <div className="dash-panel-header">Biblioteca de controles · {linhas?.length ?? 0}</div>
      <div className="dash-panel-body">
        <p className="text-muted" style={{ marginTop: 0, fontSize: "0.82rem" }}>
          Controles revisados para este cenário. Os riscos ligados a ele recebem estes controles como sugestão na tela de
          Conformidade, onde cada um é confirmado com o seu status.
        </p>
        {erro && <p style={{ color: "var(--danger)" }}>{erro}</p>}
        {linhas && linhas.length === 0 && <p className="text-muted" style={{ fontSize: "0.85rem" }}>Nenhum controle na biblioteca deste cenário.</p>}
        {linhas && linhas.length > 0 && (
          <div className="dash-table-scroll">
            <table className="dash-table">
              <thead><tr><th>Framework</th><th>Controle</th><th>Revisado por</th>{podeEditar && <th />}</tr></thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{nomeFw(l.framework)}</td>
                    <td style={{ whiteSpace: "normal", minWidth: "16rem" }}><strong>{l.controle_id}</strong> · {l.controle_titulo}</td>
                    <td>{l.revisado_por_nome || "—"}<div className="text-muted" style={{ fontSize: "0.72rem" }}>{new Date(l.revisado_em).toLocaleDateString("pt-BR")}</div></td>
                    {podeEditar && <td><button className="status-tag" disabled={ocupado} onClick={() => retirar(l)}>retirar</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {podeEditar && catalogo && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-end", marginTop: "0.75rem" }}>
            <select aria-label="Framework" value={fw} onChange={(e) => { setFw(e.target.value as FrameworkId); setControle(""); }}>
              {IDS.map((f) => <option key={f} value={f}>{nomeFw(f)}</option>)}
            </select>
            <select aria-label="Controle" value={controle} onChange={(e) => setControle(e.target.value)} style={{ maxWidth: "24rem" }}>
              <option value="">Escolha o controle</option>
              {catalogo[fw].filter((c) => !ja.has(`${fw}|${c.id}`)).map((c) => <option key={c.id} value={c.id}>{c.id} · {c.titulo}</option>)}
            </select>
            <button className="btn-primary" disabled={!controle || ocupado} onClick={incluir}>Incluir na biblioteca</button>
          </div>
        )}
      </div>
    </div>
  );
}
