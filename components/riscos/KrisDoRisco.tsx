"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fmt, textoLimites, type FaixaKri } from "@/lib/kriRisco";
import { MiniGrafico, SeloFaixa } from "./KriVisual";

// B21 · Painel "Indicadores (KRIs)" na tela do risco: os KRIs ligados a ele,
// com a última medição, e o atalho para criar um KRI a partir do gatilho.

type Kri = {
  id: number;
  codigo: string;
  nome: string;
  unidade: string;
  direcao: string;
  limite_amarelo: number;
  limite_vermelho: number;
  frequencia: string;
  ativo: boolean;
  ultima_referencia: string | null;
  ultimo_valor: number | null;
  ultima_faixa: FaixaKri | null;
  historico: { referencia: string; valor: number; faixa: FaixaKri }[];
};

const BASE = "/seguranca/gestao-de-riscos";

export default function KrisDoRisco({ riscoId, gatilho, podeEditar }: { riscoId: number; gatilho: string | null; podeEditar: boolean }) {
  const [kris, setKris] = useState<Kri[] | null>(null);
  useEffect(() => {
    fetch(`/api/kris?riscoId=${riscoId}`)
      .then((r) => r.json())
      .then((d) => setKris(d.kris || []))
      .catch(() => setKris([]));
  }, [riscoId]);

  if (!kris) return null;
  if (kris.length === 0 && !podeEditar) return null;
  return (
    <div className="dash-panel" id="kris">
      <div className="dash-panel-header">Indicadores (KRIs){kris.length ? ` · ${kris.length}` : ""}</div>
      <div className="dash-panel-body">
        {kris.length === 0 ? (
          <p className="text-muted" style={{ marginTop: 0, fontSize: "0.85rem" }}>
            Nenhum indicador acompanha este risco.
            {gatilho ? <> O ponto de gatilho “{gatilho}” pode virar um KRI com limiares e medição periódica.</> : null}
          </p>
        ) : (
          <div className="dash-table-scroll">
            <table className="dash-table">
              <thead>
                <tr><th>KRI</th><th>Última medição</th><th>Faixa</th><th>Tendência</th><th>Limiares</th></tr>
              </thead>
              <tbody>
                {kris.map((k) => (
                  <tr key={k.id} style={k.ativo ? undefined : { opacity: 0.55 }}>
                    <td style={{ whiteSpace: "normal", minWidth: "12rem" }}>
                      <Link href={`${BASE}/kris/${k.id}`} style={{ color: "var(--accent)", fontWeight: 600 }}>{k.codigo}</Link> · {k.nome}
                      {!k.ativo && <span className="text-muted"> (inativo)</span>}
                    </td>
                    <td>
                      {k.ultimo_valor !== null ? `${fmt(k.ultimo_valor)} ${k.unidade}` : "—"}
                      {k.ultima_referencia && (
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                          {k.ultima_referencia.slice(8, 10)}/{k.ultima_referencia.slice(5, 7)}/{k.ultima_referencia.slice(0, 4)} · {k.frequencia}
                        </div>
                      )}
                    </td>
                    <td><SeloFaixa faixa={k.ultima_faixa} /></td>
                    <td><MiniGrafico pontos={k.historico} /></td>
                    <td className="text-muted" style={{ fontSize: "0.78rem", whiteSpace: "normal" }}>{textoLimites(k)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {podeEditar && (
          <Link href={`${BASE}/kris?novo=${riscoId}`} className="status-tag" style={{ display: "inline-block", marginTop: "0.75rem" }}>
            + Novo KRI {gatilho ? "a partir do gatilho" : ""}
          </Link>
        )}
      </div>
    </div>
  );
}
