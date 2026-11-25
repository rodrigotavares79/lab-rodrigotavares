"use client";

import { useEffect, useState } from "react";

// B19 · Painel "Ocorrências" na tela do risco: cada vez que o risco foi
// identificado de novo (registrado a partir do cadastro, em vez de virar um
// risco repetido). Some quando não há nenhuma.

type Ocorrencia = {
  id: number;
  data_levantamento: string | null;
  fonte: string | null;
  observacao: string;
  registrado_por_nome: string | null;
  registrado_por_email: string;
  criado_em: string;
};

function data(d: string | null) {
  if (!d) return "—";
  const [a, m, dia] = d.slice(0, 10).split("-");
  return `${dia}/${m}/${a}`;
}

export default function OcorrenciasRisco({ riscoId }: { riscoId: number }) {
  const [lista, setLista] = useState<Ocorrencia[]>([]);
  useEffect(() => {
    fetch(`/api/riscos/${riscoId}/ocorrencias`)
      .then((r) => r.json())
      .then((d) => setLista(d.ocorrencias || []))
      .catch(() => setLista([]));
  }, [riscoId]);

  if (lista.length === 0) return null;
  return (
    <div className="dash-panel" id="ocorrencias">
      <div className="dash-panel-header">Ocorrências · {lista.length}</div>
      <div className="dash-panel-body">
        <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: 0 }}>
          Vezes em que este risco foi identificado de novo, registradas no lugar de um cadastro repetido.
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
          {lista.map((o) => (
            <li key={o.id} style={{ borderTop: "1px solid var(--border)", paddingTop: "0.6rem" }}>
              <div style={{ fontWeight: 600 }}>
                {data(o.data_levantamento || o.criado_em)}
                {o.fonte ? ` · ${o.fonte}` : ""}
              </div>
              <p style={{ margin: "0.2rem 0" }}>{o.observacao}</p>
              <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                registrada por {o.registrado_por_nome || o.registrado_por_email}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
