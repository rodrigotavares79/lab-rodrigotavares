"use client";

import { useEffect, useState } from "react";
import { NIVEIS_APETITE } from "@/lib/apetiteRisco";
import { calcularExposicao, mediaPert, moeda, perdaPorIndisponibilidade, textoFrequencia } from "@/lib/exposicaoRisco";
import { EXEMPLO_EXPOSICAO as X } from "@/lib/politicaRiscos";

// B20 · Peças da Política e do Processo que leem o sistema ou o motor de
// cálculo, para o texto nunca divergir do que as telas fazem.

const BADGE: Record<string, string> = { Baixo: "badge-baixo", "Médio": "badge-medio", Alto: "badge-alto", "Crítico": "badge-critico" };
function Nivel({ n }: { n: string }) {
  return <span className={`badge ${BADGE[n] || ""}`}>{n}</span>;
}

const num = (v: number, casas = 2) => v.toLocaleString("pt-BR", { maximumFractionDigits: casas });

/** Faixas de leitura de um par apetite/tolerância, em linguagem direta. */
export function leituraApetite(apetite: string, tolerancia: string): { faixa: string; situacao: string; acao: string }[] {
  const ordem = NIVEIS_APETITE as readonly string[];
  const a = ordem.indexOf(apetite);
  const t = ordem.indexOf(tolerancia);
  const nomes = (de: number, ate: number) => ordem.slice(de, ate + 1).join(", ");
  const linhas = [{ faixa: nomes(0, a), situacao: "Dentro do apetite", acao: "Aceito sem ação adicional; segue o monitoramento normal." }];
  if (t > a) linhas.push({ faixa: nomes(a + 1, t), situacao: "Acima do apetite", acao: "Suportado por tempo limitado: exige tratamento com prazo." });
  if (t < ordem.length - 1) linhas.push({ faixa: nomes(t + 1, ordem.length - 1), situacao: "Acima da tolerância", acao: "Não suportado: tratamento imediato e reporte ao Comitê." });
  return linhas;
}

type Versao = {
  versao: number;
  situacao: string;
  justificativa: string;
  decidido_por_nome: string | null;
  decidido_em: string | null;
  vigente_desde: string | null;
  limites: { categoria: string; apetite: string; tolerancia: string }[];
};

/** Tabela do apetite e da tolerância vigentes, lida do sistema. */
export function ApetiteVigente() {
  const [vig, setVig] = useState<Versao | null | undefined>(undefined);
  const [pendente, setPendente] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/apetite")
      .then((r) => r.json())
      .then((d) => {
        const vs: Versao[] = d.versoes || [];
        setVig(vs.find((v) => v.situacao === "Vigente") ?? null);
        setPendente(vs.find((v) => v.situacao === "Pendente")?.versao ?? null);
      })
      .catch(() => setVig(null));
  }, []);

  if (vig === undefined) return <p className="text-muted">Carregando os limites vigentes...</p>;
  if (vig === null)
    return (
      <p className="text-muted">
        Não há versão de apetite vigente. Enquanto não houver, os riscos aparecem como &quot;Sem limite definido&quot;.
      </p>
    );
  const quando = vig.decidido_em ? new Date(vig.decidido_em).toLocaleDateString("pt-BR") : "—";
  return (
    <div>
      <p style={{ marginBottom: "0.75rem" }}>
        <strong>Versão vigente: {vig.versao}</strong>, aprovada por {vig.decidido_por_nome || "—"} em {quando}.{" "}
        {pendente !== null && <>A versão {pendente} está aguardando aprovação e só passa a valer depois de aprovada. </>}
        <a href="/seguranca/gestao-de-riscos/apetite" target="_blank" rel="noopener noreferrer">Ver histórico de versões</a>.
      </p>
      <div className="dash-table-scroll">
        <table className="doc-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Apetite</th>
              <th>Tolerância</th>
              <th>Como ler</th>
            </tr>
          </thead>
          <tbody>
            {vig.limites.map((l) => (
              <tr key={l.categoria}>
                <td>{l.categoria}</td>
                <td><Nivel n={l.apetite} /></td>
                <td><Nivel n={l.tolerancia} /></td>
                <td style={{ fontSize: "0.85rem" }}>
                  {leituraApetite(l.apetite, l.tolerancia).map((x) => (
                    <div key={x.situacao}>
                      <strong>{x.faixa}:</strong> {x.situacao.toLowerCase()}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {vig.justificativa && (
        <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
          Justificativa da versão: {vig.justificativa}
        </p>
      )}
    </div>
  );
}

/** O exemplo fictício de apontamento financeiro, calculado pelo motor do sistema. */
export function ExemploExposicao() {
  const perda = perdaPorIndisponibilidade(X.custoHora, X.horasParada)!;
  const pf = mediaPert(X.frequencia);
  const pp = mediaPert(perda);
  const e = calcularExposicao(X.frequencia, perda);
  const perdaDepois = perdaPorIndisponibilidade(X.custoHora, X.plano.horasDepois)!;
  const depois = calcularExposicao(X.plano.frequenciaDepois, perdaDepois);
  const reducao = e.ale - depois.ale;
  const f = X.frequencia, h = X.horasParada;
  return (
    <div className="exemplo-exposicao">
      <p>
        <strong>Risco (fictício):</strong> {X.risco}. Categoria {X.categoria}; ativo crítico <em>{X.ativo}</em>, com custo de
        indisponibilidade de <strong>{moeda(X.custoHora)} por hora</strong> registrado no inventário de ativos.
      </p>

      <h4>Passo 1 · Frequência anual (quantas vezes por ano o evento deve ocorrer)</h4>
      <table className="doc-table">
        <thead>
          <tr><th></th><th>Mínimo</th><th>Provável</th><th>Máximo</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Eventos por ano</td><td>{num(f.min)}</td><td>{num(f.provavel)}</td><td>{num(f.max)}</td>
          </tr>
          <tr>
            <td>Leitura</td><td>{textoFrequencia(f.min)}</td><td>{textoFrequencia(f.provavel)}</td><td>{textoFrequencia(f.max)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-muted" style={{ fontSize: "0.85rem" }}>
        Base: histórico de incidentes do storage (duas falhas graves em quatro anos), idade do equipamento e opinião do fornecedor.
      </p>

      <h4>Passo 2 · Perda por evento (horas de parada × custo por hora)</h4>
      <table className="doc-table">
        <thead>
          <tr><th></th><th>Mínimo</th><th>Provável</th><th>Máximo</th></tr>
        </thead>
        <tbody>
          <tr><td>Horas de parada</td><td>{num(h.min)} h</td><td>{num(h.provavel)} h</td><td>{num(h.max)} h</td></tr>
          <tr><td>× custo por hora</td><td>{moeda(X.custoHora)}</td><td>{moeda(X.custoHora)}</td><td>{moeda(X.custoHora)}</td></tr>
          <tr><td><strong>Perda por evento</strong></td><td>{moeda(perda.min)}</td><td>{moeda(perda.provavel)}</td><td>{moeda(perda.max)}</td></tr>
        </tbody>
      </table>

      <h4>Passo 3 · Valor representativo de cada faixa (média PERT)</h4>
      <p>
        Média PERT = (mínimo + 4 × provável + máximo) ÷ 6. O provável pesa quatro vezes mais, mas os extremos ainda puxam o resultado.
      </p>
      <ul>
        <li>
          Frequência: ({num(f.min)} + 4 × {num(f.provavel)} + {num(f.max)}) ÷ 6 = <strong>{num(pf, 4)} evento por ano</strong>
        </li>
        <li>
          Perda: ({moeda(perda.min)} + 4 × {moeda(perda.provavel)} + {moeda(perda.max)}) ÷ 6 = <strong>{moeda(pp)}</strong>
        </li>
      </ul>

      <h4>Passo 4 · Perda anual esperada e faixa</h4>
      <ul>
        <li>
          <strong>Perda anual esperada</strong> = frequência PERT × perda PERT = {num(pf, 4)} × {moeda(pp)} ={" "}
          <strong>{moeda(e.ale)} por ano</strong>
        </li>
        <li>
          Faixa: de {num(f.min)} × {moeda(perda.min)} = <strong>{moeda(e.min)}</strong> (cenário otimista) a {num(f.max)} ×{" "}
          {moeda(perda.max)} = <strong>{moeda(e.max)}</strong> (cenário pessimista)
        </li>
      </ul>

      <h4>Passo 5 · Leitura para decisão</h4>
      <p>
        Plano proposto: {X.plano.descricao}, a {moeda(X.plano.custoAnual)} por ano. Com ele, a estimativa passa a{" "}
        {num(X.plano.frequenciaDepois.min)} / {num(X.plano.frequenciaDepois.provavel)} / {num(X.plano.frequenciaDepois.max)} evento por ano
        e {num(X.plano.horasDepois.min)} / {num(X.plano.horasDepois.provavel)} / {num(X.plano.horasDepois.max)} horas de parada:
      </p>
      <table className="doc-table">
        <tbody>
          <tr><td>Perda anual esperada hoje</td><td style={{ textAlign: "right" }}>{moeda(e.ale)}</td></tr>
          <tr><td>Perda anual esperada com o plano</td><td style={{ textAlign: "right" }}>{moeda(depois.ale)}</td></tr>
          <tr><td>Redução da exposição</td><td style={{ textAlign: "right" }}>{moeda(reducao)}</td></tr>
          <tr><td>Custo anual do plano</td><td style={{ textAlign: "right" }}>{moeda(X.plano.custoAnual)}</td></tr>
          <tr>
            <td><strong>Benefício líquido estimado</strong></td>
            <td style={{ textAlign: "right" }}><strong>{moeda(reducao - X.plano.custoAnual)} por ano</strong></td>
          </tr>
        </tbody>
      </table>
      <p className="text-muted" style={{ fontSize: "0.85rem" }}>
        A redução de exposição ({moeda(reducao)}) é mais que o dobro do custo do plano, o que justifica o investimento. A perda anual
        esperada é uma média de longo prazo, não a previsão de um ano específico: num ano sem falha a perda é zero; num ano com a pior
        falha, pode chegar a {moeda(e.max)}.
      </p>
    </div>
  );
}

export function BotaoImprimir({ rotulo = "Imprimir ou salvar em PDF" }: { rotulo?: string }) {
  return (
    <button type="button" className="btn-primary report-toolbar" onClick={() => window.print()}>
      {rotulo}
    </button>
  );
}
