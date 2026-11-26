"use client";

import { useEffect, useState } from "react";
import GraficoLinhas from "./GraficoLinhas";
import { rotuloMes } from "@/lib/fotosIndicadores";

// B05 · Riscos por mês, pela data de levantamento (quando o risco foi
// identificado) ou de cadastro (quando entrou no sistema). Veio do Dashboard
// para Tendências quando o Dashboard virou cockpit.
export default function EvolucaoMensal({ projetoId }: { projetoId: string }) {
  const [base, setBase] = useState<"levantamento" | "cadastro">("levantamento");
  const [dados, setDados] = useState<{ evolucao: { mes: string; levantamento: number; cadastro: number }[]; semDataLevantamento: number } | null>(null);

  useEffect(() => {
    fetch(projetoId ? `/api/evolucao-riscos?projetoId=${projetoId}` : "/api/evolucao-riscos")
      .then((r) => r.json())
      .then((d) => setDados(d.error ? null : d))
      .catch(() => setDados(null));
  }, [projetoId]);

  if (!dados) return null;
  const alternador = (
    <div role="group" aria-label="Data usada no gráfico" style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem" }}>
      {(["levantamento", "cadastro"] as const).map((b) => (
        <button
          key={b}
          type="button"
          aria-pressed={base === b}
          onClick={() => setBase(b)}
          className={base === b ? "btn-primary" : "btn-secondary"}
          style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
        >
          Data de {b}
        </button>
      ))}
    </div>
  );
  return (
    <GraficoLinhas
      titulo={`Riscos por mês (data de ${base})`}
      meses={dados.evolucao.map((e) => rotuloMes(e.mes))}
      series={[{ nome: "Riscos", cor: "#257de0", valores: dados.evolucao.map((e) => e[base]) }]}
      topo={alternador}
      rodape={
        base === "levantamento" && dados.semDataLevantamento > 0 ? (
          <p className="text-muted" style={{ margin: "0.4rem 0 0", fontSize: "0.78rem" }}>
            {dados.semDataLevantamento} risco(s) sem data de levantamento não aparecem neste gráfico.
          </p>
        ) : null
      }
    />
  );
}
