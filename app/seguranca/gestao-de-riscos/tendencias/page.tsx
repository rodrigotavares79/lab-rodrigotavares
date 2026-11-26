"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import GraficoLinhas from "@/components/riscos/GraficoLinhas";
import EvolucaoMensal from "@/components/riscos/EvolucaoMensal";
import {
  altosOuCriticos,
  conformidadeTratamento,
  rotuloMes,
  serie,
  type FotoIndicadores,
} from "@/lib/fotosIndicadores";

// B22 · Tendências: fotos mensais dos indicadores (6 ou 12 meses), por
// projeto ou consolidado. A foto do mês corrente é atualizada todo dia e
// fecha no dia 1 do mês seguinte.

// Paleta categórica validada (dataviz) para inerente/atual/projetado e para
// as pendências; os níveis usam as cores já usadas nos selos do módulo.
const C1 = "#257de0";
const C2 = "#f47230";
const C3 = "#00b894";
const COR_NIVEL: Record<string, string> = { Crítico: "#c0392b", Alto: "#e67e22", Médio: "#d4ac0d", Baixo: "#27ae60" };

type Foto = { referencia: string; dados: FotoIndicadores; capturado_em: string };

export default function Tendencias() {
  const [projetos, setProjetos] = useState<{ id: number; nome: string }[]>([]);
  const [projetoId, setProjetoId] = useState("");
  const [meses, setMeses] = useState<"6" | "12">("12");
  const [dados, setDados] = useState<{ meses: string[]; fotos: Foto[]; mesAberto: string; podeCapturar: boolean } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [capturando, setCapturando] = useState(false);

  useEffect(() => {
    fetch("/api/projetos")
      .then((r) => r.json())
      .then((d) => setProjetos(d.projetos || []))
      .catch(() => setProjetos([]));
  }, []);

  function carregar() {
    const q = new URLSearchParams({ meses });
    if (projetoId) q.set("projetoId", projetoId);
    fetch(`/api/fotos-indicadores?${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDados(d);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar as tendências."));
  }
  useEffect(carregar, [projetoId, meses]);

  async function capturar() {
    setCapturando(true);
    await fetch("/api/fotos-indicadores", { method: "POST" }).catch(() => undefined);
    setCapturando(false);
    carregar();
  }

  const rotulos = (dados?.meses || []).map(rotuloMes);
  const fotos = dados?.fotos || [];
  const s = (fn: (f: FotoIndicadores) => number | null) =>
    serie(dados?.meses || [], fotos, (f) => fn(f) as number).map((v) => (v === undefined ? null : v));
  const ultima = fotos[fotos.length - 1];

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Tendências</h1>
          <p className="lede">
            Evolução mês a mês a partir de fotos dos indicadores. A foto do mês corrente é atualizada todo dia e fica
            fechada no dia 1 do mês seguinte.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end", marginTop: "1rem" }}>
            <div className="form-field" style={{ minWidth: "14rem" }}>
              <label htmlFor="tendProjeto">Projeto</label>
              <select id="tendProjeto" value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
                <option value="">Todos (consolidado)</option>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="tendMeses">Período</label>
              <select id="tendMeses" value={meses} onChange={(e) => setMeses(e.target.value as "6" | "12")}>
                <option value="6">Últimos 6 meses</option>
                <option value="12">Últimos 12 meses</option>
              </select>
            </div>
            {dados?.podeCapturar && (
              <button type="button" className="btn-secondary" onClick={capturar} disabled={capturando} style={{ marginBottom: "0.6rem" }}>
                {capturando ? "Atualizando..." : "Atualizar foto do mês"}
              </button>
            )}
          </div>

          {erro && (
            <div className="error-banner" style={{ marginTop: "1.5rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {dados && (
            <>
              <p className="field-helper" style={{ marginTop: "0.75rem" }}>
                {fotos.length === 0
                  ? "Ainda não há fotos gravadas."
                  : `${fotos.length} ${fotos.length === 1 ? "mês com foto" : "meses com foto"}; última atualização em ${new Date(
                      ultima.capturado_em
                    ).toLocaleString("pt-BR")}.`}{" "}
                {fotos.length < 2 && "A tendência aparece a partir do segundo mês com foto. Não há histórico confiável anterior a 25/11/2026."}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(22rem, 1fr))", gap: "1.25rem", marginTop: "1rem" }}>
                <GraficoLinhas
                  titulo="Riscos Alto ou Crítico: inerente × atual × projetado"
                  meses={rotulos}
                  series={[
                    { nome: "Inerente", cor: C1, valores: s((f) => altosOuCriticos(f.inerente)) },
                    { nome: "Atual", cor: C2, valores: s((f) => altosOuCriticos(f.atual)) },
                    { nome: "Projetado", cor: C3, valores: s((f) => altosOuCriticos(f.projetado)), tracejada: true },
                  ]}
                />
                <GraficoLinhas
                  titulo="Riscos ativos por nível atual"
                  meses={rotulos}
                  series={(["Crítico", "Alto", "Médio", "Baixo"] as const).map((n) => ({
                    nome: n,
                    cor: COR_NIVEL[n],
                    valores: s((f) => f.ativosPorNivel?.[n] ?? 0),
                  }))}
                />
                <GraficoLinhas
                  titulo="Pendências"
                  meses={rotulos}
                  series={[
                    { nome: "Sem tratamento", cor: C1, valores: s((f) => f.semTratamento) },
                    { nome: "Ações atrasadas", cor: C2, valores: s((f) => f.acoesAtrasadas) },
                    { nome: "Revisões vencidas", cor: C3, valores: s((f) => f.revisoesVencidas) },
                  ]}
                />
                <GraficoLinhas
                  titulo="Alto/Crítico com tratamento (política)"
                  meses={rotulos}
                  sufixo="%"
                  maximo={100}
                  series={[{ nome: "Conformidade", cor: C1, valores: s((f) => conformidadeTratamento(f)) }]}
                />
                <EvolucaoMensal projetoId={projetoId} />
              </div>
            </>
          )}

          <a href="/seguranca/gestao-de-riscos" className="status-tag" style={{ marginTop: "2.5rem", display: "inline-block" }}>
            ← Voltar para Gestão de Riscos
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
