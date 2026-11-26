"use client";

import Link from "next/link";
import s from "./Cockpit.module.css";
import { MATRIZ_5X5, FAIXAS_NIVEL_RISCO, ROTULOS_ESCALA_5, NIVEL_RISCO_LABEL } from "@/lib/metodologiaRisco";
import { rotuloMes } from "@/lib/fotosIndicadores";
import { variacao, textoDelta, ROTULO_ESTAGIO, type LinhaApetite, type EstagioTratamento, type FaixaPrazo } from "@/lib/cockpitRisco";
import { moeda } from "@/lib/exposicaoRisco";
import { fmt, ROTULO_SITUACAO_MEDICAO, type FaixaKri, type SituacaoMedicao } from "@/lib/kriRisco";
import { SeloFaixa, MiniGrafico } from "./KriVisual";

// Peças visuais do Dashboard (cockpit). Cada número leva à lista ou à tela
// onde se age sobre ele, sempre numa nova aba para não sair do Dashboard; a
// cor indica estado e vem sempre com rótulo.

export const BASE = "/seguranca/gestao-de-riscos";

/** Monta o link da lista de riscos já filtrada, preservando o projeto escolhido. */
export function linkRiscos(params: Record<string, string | number>, projetoId: string): string {
  const q = new URLSearchParams();
  if (projetoId) q.set("projetoId", projetoId);
  for (const [k, v] of Object.entries(params)) q.set(k, String(v));
  return `${BASE}/riscos?${q.toString()}`;
}

// Mesma paleta da matriz do Relatório Executivo.
export const COR_NIVEL_MATRIZ: Record<number, { fundo: string; texto: string }> = {
  1: { fundo: "#d7ebdd", texto: "#24593a" },
  2: { fundo: "#f6e7b0", texto: "#6b5000" },
  3: { fundo: "#f3c79a", texto: "#7a3a07" },
  4: { fundo: "#e7a3a3", texto: "#6e1423" },
};

const COR = {
  ok: "var(--rs-ok)",
  alerta: "var(--rs-alerta)",
  perigo: "var(--rs-perigo)",
  neutro: "#a7adb8",
  primaria: "var(--rs-primaria)",
};

// ---------- Faixa de comando ----------

function Sparkline({ valores, meses }: { valores: (number | null)[]; meses: string[] }) {
  const w = 120, h = 30, pad = 3;
  const nums = valores.filter((v): v is number => v !== null);
  if (nums.length < 2) return null;
  const min = Math.min(...nums), max = Math.max(...nums);
  const faixa = max - min || 1;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (valores.length - 1);
  const y = (v: number) => h - pad - ((v - min) / faixa) * (h - pad * 2);
  // Quebra a linha nos meses sem foto.
  const trechos: string[] = [];
  let atual: string[] = [];
  valores.forEach((v, i) => {
    if (v === null) {
      if (atual.length) trechos.push(atual.join(" "));
      atual = [];
    } else atual.push(`${x(i)},${y(v)}`);
  });
  if (atual.length) trechos.push(atual.join(" "));
  const resumo = valores.map((v, i) => `${rotuloMes(meses[i])}: ${v ?? "sem foto"}`).join(", ");
  const ultimo = valores.length - 1;
  return (
    <svg className={s.spark} width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`Últimos 6 meses: ${resumo}`}>
      <title>{resumo}</title>
      {trechos.map((t, i) => (
        <polyline key={i} points={t} fill="none" stroke={COR.primaria} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      ))}
      {valores[ultimo] !== null && <circle cx={x(ultimo)} cy={y(valores[ultimo] as number)} r={2.5} fill={COR.primaria} />}
    </svg>
  );
}

export function TileKpi({
  rotulo,
  valor,
  href,
  serie,
  meses,
  sentido = "neutro",
  sufixoDelta = "",
  nota,
  alerta = false,
}: {
  rotulo: string;
  valor: string | number;
  href?: string;
  serie?: (number | null)[];
  meses?: string[];
  sentido?: "menor" | "maior" | "neutro";
  sufixoDelta?: string;
  nota?: string;
  alerta?: boolean;
}) {
  const n = serie?.length ?? 0;
  const v = n >= 2 ? variacao(serie![n - 1], serie![n - 2], sentido) : { delta: null, tom: "neutro" as const };
  const seta = v.delta === null || v.delta === 0 ? "" : v.delta > 0 ? "▲" : "▼";
  const conteudo = (
    <>
      <span className={s.tileRotulo}>{rotulo}</span>
      <span className={s.tileValor}>{valor}</span>
      {v.delta !== null ? (
        <span className={`${s.delta} ${s[v.tom]}`}>
          {seta && <span aria-hidden="true">{seta}</span>}
          {v.delta === 0 ? "estável" : textoDelta(v.delta, sufixoDelta)}
          <span className={s.neutro} style={{ fontWeight: 400 }}>vs mês anterior</span>
        </span>
      ) : (
        nota && <span className={s.tileNota}>{nota}</span>
      )}
      {serie && meses && <Sparkline valores={serie} meses={meses} />}
      {v.delta !== null && nota && <span className={s.tileNota}>{nota}</span>}
    </>
  );
  const classe = `${s.tile} ${alerta ? s.tileAlerta : ""}`;
  return href ? (
    <Link href={href} className={classe} {...(href.startsWith("#") ? {} : { target: "_blank", rel: "noopener noreferrer" })}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

// ---------- Onde está o risco ----------

export function MatrizCalor({ celulas, projetoId }: { celulas: { prob: number; imp: number; total: number }[]; projetoId: string }) {
  const contagem = new Map(celulas.map((c) => [`${c.prob}-${c.imp}`, c.total]));
  return (
    <div>
      <div style={{ display: "flex", gap: "0.4rem", alignItems: "stretch" }}>
        <span className={s.eixo} style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Probabilidade</span>
        <div style={{ flex: 1 }}>
          <div className={s.matriz} role="table" aria-label="Riscos ativos por probabilidade e impacto (nível atual)">
            {[5, 4, 3, 2, 1].map((p) => (
              <div key={p} role="row" style={{ display: "contents" }}>
                <span role="rowheader" className={s.eixo} title={ROTULOS_ESCALA_5[p - 1]}>{p}</span>
                {[1, 2, 3, 4, 5].map((i) => {
                  const nivel = MATRIZ_5X5[p - 1][i - 1];
                  const n = contagem.get(`${p}-${i}`) || 0;
                  const estilo = { background: COR_NIVEL_MATRIZ[nivel].fundo, color: COR_NIVEL_MATRIZ[nivel].texto };
                  const titulo = `Probabilidade ${p} × Impacto ${i} (${NIVEL_RISCO_LABEL[nivel]}): ${n} risco(s)`;
                  return n > 0 ? (
                    <Link target="_blank" rel="noopener noreferrer" role="cell" key={i} href={linkRiscos({ prob: p, imp: i }, projetoId)} className={s.celula} style={estilo} title={titulo} aria-label={titulo}>
                      {n}
                    </Link>
                  ) : (
                    <span role="cell" key={i} className={s.celula} style={{ ...estilo, opacity: 0.55 }} title={titulo} aria-label={titulo} />
                  );
                })}
              </div>
            ))}
            <span aria-hidden="true" />
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} role="columnheader" className={s.eixo} title={ROTULOS_ESCALA_5[i - 1]}>{i}</span>
            ))}
          </div>
          <div className={s.eixo} style={{ maxWidth: "24rem", paddingLeft: "1.6rem" }}>Impacto</div>
        </div>
      </div>
      <div className={s.legenda}>
        {FAIXAS_NIVEL_RISCO.map((f) => (
          <span key={f.nivel}>
            <i style={{ background: COR_NIVEL_MATRIZ[f.nivel].fundo }} />
            {f.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}

const SEGMENTOS_APETITE: { chave: keyof LinhaApetite; rotulo: string; cor: string; filtro?: string }[] = [
  { chave: "acimaTolerancia", rotulo: "Acima da tolerância", cor: COR.perigo, filtro: "acima-tolerancia" },
  { chave: "acimaApetite", rotulo: "Acima do apetite", cor: COR.alerta, filtro: "acima-apetite" },
  { chave: "dentro", rotulo: "Dentro do apetite", cor: COR.ok, filtro: "dentro" },
  { chave: "semLimite", rotulo: "Sem limite definido", cor: COR.neutro },
];

export function ApetitePorCategoria({ linhas, projetoId }: { linhas: LinhaApetite[]; projetoId: string }) {
  if (linhas.length === 0) return <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Nenhum risco ativo.</p>;
  const max = Math.max(...linhas.map((l) => l.total));
  return (
    <div>
      {linhas.map((l) => (
        <div key={l.categoria} className={s.linhaBarra}>
          <Link target="_blank" rel="noopener noreferrer" className={s.rotuloBarra} href={linkRiscos({ categoria: l.categoria, ativos: 1 }, projetoId)} title={l.categoria}>
            {l.categoria}
          </Link>
          <div className={s.trilho} style={{ width: `${(l.total / max) * 100}%`, background: "transparent" }}>
            {SEGMENTOS_APETITE.filter((g) => (l[g.chave] as number) > 0).map((g) => {
              const n = l[g.chave] as number;
              const titulo = `${l.categoria} · ${g.rotulo}: ${n}`;
              return g.filtro ? (
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  key={g.chave}
                  href={linkRiscos({ categoria: l.categoria, apetite: g.filtro }, projetoId)}
                  className={s.segmento}
                  style={{ flex: n, background: g.cor }}
                  title={titulo}
                  aria-label={titulo}
                />
              ) : (
                <span key={g.chave} className={s.segmento} style={{ flex: n, background: g.cor }} title={titulo} aria-label={titulo} />
              );
            })}
          </div>
          <span className={s.numero}>{l.total}</span>
        </div>
      ))}
      <div className={s.legenda}>
        {SEGMENTOS_APETITE.map((g) => (
          <span key={g.chave}>
            <i style={{ background: g.cor }} />
            {g.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- O tratamento está andando? ----------

export function FunilTratamento({ funil, projetoId }: { funil: Record<EstagioTratamento, number>; projetoId: string }) {
  const etapas: { chave: EstagioTratamento; cor: string }[] = [
    { chave: "sem_plano", cor: COR.perigo },
    { chave: "em_andamento", cor: COR.alerta },
    { chave: "concluido", cor: COR.primaria },
    { chave: "auditado", cor: COR.ok },
  ];
  const max = Math.max(1, ...etapas.map((e) => funil[e.chave]));
  return (
    <div>
      {etapas.map((e) => (
        <div key={e.chave} className={s.linhaBarra} style={{ gridTemplateColumns: "minmax(8rem, 10rem) 1fr auto" }}>
          <span className={s.rotuloBarra}>{ROTULO_ESTAGIO[e.chave]}</span>
          <div className={s.trilho}>
            {funil[e.chave] > 0 && <span className={s.segmento} style={{ width: `${(funil[e.chave] / max) * 100}%`, background: e.cor }} />}
          </div>
          <span className={s.numero}>{funil[e.chave]}</span>
        </div>
      ))}
      <p className="text-muted" style={{ fontSize: "0.78rem", margin: "0.6rem 0 0" }}>
        Todos os riscos do escopo, inclusive mitigados.{" "}
        {funil.aceito > 0 && (
          <>
            <Link target="_blank" rel="noopener noreferrer" href={linkRiscos({ status: "Aceito" }, projetoId)}>{funil.aceito} risco(s) aceito(s)</Link> ficam fora do funil.
          </>
        )}
      </p>
    </div>
  );
}

const ROTULO_PRAZO: Record<FaixaPrazo, string> = {
  atrasada: "Atrasadas",
  vencendo: "Vencem em 30 dias",
  no_prazo: "No prazo",
  sem_prazo: "Sem prazo",
};
const COR_PRAZO: Record<FaixaPrazo, string> = { atrasada: COR.perigo, vencendo: COR.alerta, no_prazo: COR.ok, sem_prazo: COR.neutro };

export function AcoesPorPrazo({ prazos }: { prazos: Record<FaixaPrazo, number> }) {
  const ordem: FaixaPrazo[] = ["atrasada", "vencendo", "no_prazo", "sem_prazo"];
  const total = ordem.reduce((t, k) => t + prazos[k], 0);
  if (total === 0) return <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Nenhuma ação aberta.</p>;
  return (
    <div>
      <div className={s.trilho} style={{ height: 16, marginBottom: "0.8rem" }} role="img" aria-label={ordem.map((k) => `${ROTULO_PRAZO[k]}: ${prazos[k]}`).join(", ")}>
        {ordem.filter((k) => prazos[k] > 0).map((k) => (
          <span key={k} className={s.segmento} style={{ flex: prazos[k], background: COR_PRAZO[k] }} title={`${ROTULO_PRAZO[k]}: ${prazos[k]}`} />
        ))}
      </div>
      <div className={s.mini}>
        {ordem.map((k) => {
          const corpo = (
            <>
              <span className={s.miniValor}>{prazos[k]}</span>
              <span className={s.miniRotulo}>
                <span className={s.ponto} style={{ background: COR_PRAZO[k] }} />
                {ROTULO_PRAZO[k]}
              </span>
            </>
          );
          return k === "atrasada" ? (
            <Link target="_blank" rel="noopener noreferrer" key={k} href={`${BASE}/acoes-atrasadas`} className={s.miniItem}>{corpo}</Link>
          ) : (
            <Link target="_blank" rel="noopener noreferrer" key={k} href={`${BASE}/planos-de-acao`} className={s.miniItem}>{corpo}</Link>
          );
        })}
      </div>
      <p className="text-muted" style={{ fontSize: "0.78rem", margin: "0.6rem 0 0" }}>{total} ações abertas em riscos ativos.</p>
    </div>
  );
}

export function Aceitacoes({ a, projetoId }: { a: { vigentes: number; pendentes: number; vencendo: number }; projetoId: string }) {
  return (
    <div className={s.mini}>
      <Link target="_blank" rel="noopener noreferrer" href={linkRiscos({ status: "Aceito" }, projetoId)} className={s.miniItem}>
        <span className={s.miniValor}>{a.vigentes}</span>
        <span className={s.miniRotulo}>Vigentes</span>
      </Link>
      <Link target="_blank" rel="noopener noreferrer" href={`${BASE}/aceitacoes-pendentes`} className={s.miniItem}>
        <span className={s.miniValor}>{a.pendentes}</span>
        <span className={s.miniRotulo}>
          {a.pendentes > 0 && <span className={s.ponto} style={{ background: COR.alerta }} />}
          Aguardando aprovação
        </span>
      </Link>
      <Link target="_blank" rel="noopener noreferrer" href={linkRiscos({ status: "Aceito" }, projetoId)} className={s.miniItem}>
        <span className={s.miniValor}>{a.vencendo}</span>
        <span className={s.miniRotulo}>
          {a.vencendo > 0 && <span className={s.ponto} style={{ background: COR.alerta }} />}
          Vencem em 60 dias
        </span>
      </Link>
    </div>
  );
}

// ---------- Sinais de alerta ----------

export type KriCockpit = {
  id: number;
  codigo: string;
  nome: string;
  unidade: string | null;
  ultimo_valor: number | null;
  ultima_faixa: FaixaKri | null;
  historico: { referencia: string; valor: number; faixa: FaixaKri }[];
  medicao: SituacaoMedicao;
};

export function SemaforoKris({ kris }: { kris: KriCockpit[] }) {
  if (kris.length === 0) return <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Nenhum KRI ativo neste escopo.</p>;
  const visiveis = kris.slice(0, 8);
  return (
    <div>
      <table className="dash-table">
        <thead>
          <tr>
            <th>KRI</th>
            <th style={{ textAlign: "right" }}>Último</th>
            <th>Faixa</th>
            <th>Tendência</th>
          </tr>
        </thead>
        <tbody>
          {visiveis.map((k) => (
            <tr key={k.id}>
              <td>
                <Link target="_blank" rel="noopener noreferrer" href={`${BASE}/kris/${k.id}`} style={{ fontWeight: 600 }}>{k.codigo}</Link>{" "}
                <span style={{ fontSize: "0.82rem" }}>{k.nome}</span>
                {k.medicao !== "em_dia" && (
                  <div className="text-muted" style={{ fontSize: "0.72rem" }}>{ROTULO_SITUACAO_MEDICAO[k.medicao]}</div>
                )}
              </td>
              <td style={{ textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                {fmt(k.ultimo_valor)}
                {k.ultimo_valor !== null && k.unidade ? ` ${k.unidade}` : ""}
              </td>
              <td><SeloFaixa faixa={k.ultima_faixa} /></td>
              <td><MiniGrafico pontos={(k.historico || []).slice(-6)} largura={90} altura={24} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Link target="_blank" rel="noopener noreferrer" href={`${BASE}/kris`} className={s.linkPainel}>
        {kris.length > visiveis.length ? `Ver todos os ${kris.length} KRIs →` : "Abrir KRIs →"}
      </Link>
    </div>
  );
}

export function TopExposicao({
  exposicao,
}: {
  exposicao: { total: number; comEstimativa: number; ativos: number; top: { id: number; titulo: string | null; gatilho: string | null; impacto_qualitativo: string | null; ale: number }[] };
}) {
  if (exposicao.top.length === 0)
    return <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Nenhum risco ativo com estimativa de perda.</p>;
  const max = exposicao.top[0].ale || 1;
  return (
    <div>
      {exposicao.top.map((r) => (
        <div key={r.id} className={s.linhaBarra} style={{ gridTemplateColumns: "minmax(9rem, 14rem) 1fr auto" }}>
          <Link target="_blank" rel="noopener noreferrer" className={s.rotuloBarra} href={`${BASE}/riscos/${r.id}`} title={r.titulo || r.gatilho || ""}>
            <strong>#{r.id}</strong> {r.titulo || r.gatilho}
          </Link>
          <div className={s.trilho}>
            <span className={s.segmento} style={{ width: `${(r.ale / max) * 100}%`, background: COR.primaria }} />
          </div>
          <span className={s.numero} style={{ minWidth: "5.5rem" }}>{moeda(r.ale, true)}</span>
        </div>
      ))}
      <p className="text-muted" style={{ fontSize: "0.78rem", margin: "0.6rem 0 0" }}>
        Perda anual esperada somada: <strong style={{ color: "var(--rs-text)" }}>{moeda(exposicao.total)}</strong>, em {exposicao.comEstimativa} de{" "}
        {exposicao.ativos} riscos ativos com estimativa.
      </p>
    </div>
  );
}

// ---------- Governança e conformidade ----------

export function CoberturaFrameworks({ cobertura, nome }: { cobertura: { framework: string; controles: number; percentual: number | null }[]; nome: (fw: string) => string }) {
  return (
    <div>
      {cobertura.map((c) => {
        const pct = c.percentual;
        const cor = pct === null ? COR.neutro : pct >= 70 ? COR.ok : pct >= 40 ? COR.alerta : COR.perigo;
        return (
          <div key={c.framework} className={s.linhaBarra} style={{ gridTemplateColumns: "minmax(8rem, 11rem) 1fr auto" }}>
            <Link target="_blank" rel="noopener noreferrer" className={s.rotuloBarra} href={`${BASE}/conformidade`}>{nome(c.framework)}</Link>
            <div className={s.trilho}>{pct ? <span className={s.segmento} style={{ width: `${pct}%`, background: cor }} /> : null}</div>
            <span className={s.numero} style={{ minWidth: "6.5rem" }}>
              {pct === null ? "—" : `${pct}%`}
              <span className="text-muted" style={{ fontWeight: 400, fontSize: "0.74rem" }}> · {c.controles} ctrl.</span>
            </span>
          </div>
        );
      })}
      <p className="text-muted" style={{ fontSize: "0.78rem", margin: "0.6rem 0 0" }}>
        Controles confirmados nos riscos ativos: implementado vale 100%, parcial 50%, ausente 0%.
      </p>
    </div>
  );
}

export function Pendencias({ itens }: { itens: { rotulo: string; n: number | string | null; href: string; grave?: boolean }[] }) {
  return (
    <div>
      {itens.map((i) => {
        const vazio = i.n === 0 || i.n === null;
        return (
          <Link target="_blank" rel="noopener noreferrer" key={i.rotulo} href={i.href} className={`${s.pendencia} ${vazio ? s.pendenciaOk : ""}`}>
            <span>{i.rotulo}</span>
            <span className={s.selo} style={{ color: vazio ? "var(--rs-ok)" : i.grave ? "var(--rs-perigo)" : "var(--rs-alerta)" }}>
              <span aria-hidden="true">{vazio ? "✓" : i.grave ? "▲▲" : "▲"}</span>
              {vazio ? "em dia" : i.n}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
