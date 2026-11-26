"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { usePerfilRiscos } from "@/components/riscos/PermissoesRiscos";
import BadgeApetite from "@/components/riscos/BadgeApetite";
import { ROTULO_SITUACAO_APETITE, type SituacaoApetite } from "@/lib/apetiteRisco";
import { situacaoControles, ROTULO_SITUACAO_CONTROLES, type SituacaoControles } from "@/lib/controlesRisco";

type Projeto = { id: number; nome: string };
type RiscoLinha = {
  id: number;
  projeto: string;
  categoria: string | null;
  gatilho: string | null;
  titulo?: string | null;
  levantado_por: string;
  data_levantamento: string | null;
  impacto_qualitativo: string | null;
  matrix_score: number | null;
  status: string | null;
  criado_em: string;
  dono_email?: string | null;
  fatores?: number;
  sem_controles?: boolean | null;
  dono_nome?: string | null;
  dono_contato_id?: number | null;
  ponto_focal_nome?: string | null;
  ativo?: string | null;
  area?: string | null;
  apetite?: SituacaoApetite;
};

// Valor especial do filtro de dono: riscos sem dono definido (B14).
const SEM_DONO = "__sem_dono__";
const SEM_AREA = "__sem_area__";

const BADGE_POR_NIVEL: Record<string, string> = {
  "Baixo": "badge-baixo",
  "Médio": "badge-medio",
  "Alto": "badge-alto",
  "Crítico": "badge-critico",
};

function classeStatus(status: string | null): string {
  if (status === "Mitigado") return "status-resolved";
  if (status === "Aceito") return "status-accepted";
  if (status === "Identificado") return "status-identified";
  return "status-pending";
}

function formatData(iso: string | null): string {
  if (!iso) return "—";
  // colunas DATE podem vir do driver como "2026-08-24" ou como
  // "2026-08-24T00:00:00.000Z" (quando o driver as trata como Date) —
  // pegamos só os 10 primeiros caracteres (YYYY-MM-DD) em ambos os casos.
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return String(iso);
  return `${dia}/${mes}/${ano}`;
}

export default function ListaDeRiscos() {
  const perfil = usePerfilRiscos();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [projetoId, setProjetoId] = useState("");
  const [riscos, setRiscos] = useState<RiscoLinha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroDono, setFiltroDono] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroControles, setFiltroControles] = useState<"" | SituacaoControles>("");
  // B18: filtro pela situação frente ao apetite/tolerância.
  const [filtroApetite, setFiltroApetite] = useState<"" | SituacaoApetite | "acima">("");

  // ?dono=sem (link "Riscos sem dono" do menu) já abre filtrado.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("dono") === "sem") setFiltroDono(SEM_DONO);
    if (params.get("controles") === "nao-avaliados") setFiltroControles("nao_avaliados");
    if (params.get("apetite") === "acima-tolerancia") setFiltroApetite("acima_tolerancia");
    if (params.get("apetite") === "acima") setFiltroApetite("acima");
    // ?contato=ID (link da tela Contatos de negócio): filtra pelo dono externo.
    const contato = Number(params.get("contato"));
    if (Number.isInteger(contato) && contato > 0) setContatoParam(contato);
  }, []);
  const [contatoParam, setContatoParam] = useState<number | null>(null);
  useEffect(() => {
    if (contatoParam === null) return;
    const r = riscos.find((x) => x.dono_contato_id === contatoParam);
    if (r?.dono_email) setFiltroDono(r.dono_email);
  }, [contatoParam, riscos]);

  const donos = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of riscos) if (r.dono_email) m.set(r.dono_email, r.dono_nome || r.dono_email);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [riscos]);
  const areas = useMemo(
    () => [...new Set(riscos.map((r) => r.area).filter((a): a is string => !!a))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [riscos]
  );
  const visiveis = useMemo(
    () =>
      riscos.filter((r) => {
        if (filtroDono === SEM_DONO ? !!r.dono_email : filtroDono && r.dono_email !== filtroDono) return false;
        if (filtroArea === SEM_AREA ? !!r.area : filtroArea && r.area !== filtroArea) return false;
        if (
          filtroControles &&
          (r.status === "Mitigado" ||
            situacaoControles({ fatores: r.fatores ?? 0, sem_controles: !!r.sem_controles }) !== filtroControles)
        )
          return false;
        if (filtroApetite === "acima" ? r.apetite !== "acima_apetite" && r.apetite !== "acima_tolerancia" : filtroApetite && r.apetite !== filtroApetite)
          return false;
        return true;
      }),
    [riscos, filtroDono, filtroArea, filtroControles, filtroApetite]
  );

  useEffect(() => {
    fetch("/api/projetos")
      .then((r) => r.json())
      .then((d) => setProjetos(d.projetos || []))
      .catch(() => setProjetos([]));
  }, []);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    const url = projetoId ? `/api/riscos?projetoId=${projetoId}` : "/api/riscos";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRiscos(d.riscos || []);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar riscos."))
      .finally(() => setCarregando(false));
  }, [projetoId]);

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <h1>Riscos</h1>
              <p className="lede">
                Todos os riscos cadastrados. Clique em um risco para ver o detalhe
                completo, o nível atual e o plano de ação.
              </p>
            </div>
            {perfil.permissoes.editarRiscos && (
            <a
              href="/seguranca/gestao-de-riscos/cadastro-de-riscos"
              className="btn-primary"
              style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem", minHeight: "2.75rem" }}
            >
              + Novo risco ou importar CSV
            </a>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "1.5rem" }}>
          <div className="form-field" style={{ minWidth: "14rem", flex: "1 1 14rem", maxWidth: "20rem" }}>
            <label htmlFor="filtroProjetoLista">Projeto</label>
            <select
              id="filtroProjetoLista"
              value={projetoId}
              onChange={(e) => setProjetoId(e.target.value)}
            >
              <option value="">Todos os Projetos</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ minWidth: "14rem", flex: "1 1 14rem", maxWidth: "20rem" }}>
            <label htmlFor="filtroDonoLista">Dono do risco</label>
            <select id="filtroDonoLista" value={filtroDono} onChange={(e) => setFiltroDono(e.target.value)}>
              <option value="">Todos</option>
              <option value={SEM_DONO}>Sem dono definido</option>
              {donos.map(([email, nome]) => (
                <option key={email} value={email}>{nome}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ minWidth: "14rem", flex: "1 1 14rem", maxWidth: "20rem" }}>
            <label htmlFor="filtroControlesLista">Controles existentes</label>
            <select
              id="filtroControlesLista"
              value={filtroControles}
              onChange={(e) => setFiltroControles(e.target.value as "" | SituacaoControles)}
            >
              <option value="">Todos</option>
              {(Object.keys(ROTULO_SITUACAO_CONTROLES) as SituacaoControles[]).map((k) => (
                <option key={k} value={k}>{ROTULO_SITUACAO_CONTROLES[k]}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ minWidth: "14rem", flex: "1 1 14rem", maxWidth: "20rem" }}>
            <label htmlFor="filtroApetiteLista">Apetite e tolerância</label>
            <select
              id="filtroApetiteLista"
              value={filtroApetite}
              onChange={(e) => setFiltroApetite(e.target.value as "" | SituacaoApetite | "acima")}
            >
              <option value="">Todos</option>
              <option value="acima">Acima do apetite (inclui tolerância)</option>
              {(Object.keys(ROTULO_SITUACAO_APETITE) as SituacaoApetite[]).map((k) => (
                <option key={k} value={k}>{ROTULO_SITUACAO_APETITE[k]}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ minWidth: "14rem", flex: "1 1 14rem", maxWidth: "20rem" }}>
            <label htmlFor="filtroAreaLista">Área responsável</label>
            <select id="filtroAreaLista" value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
              <option value="">Todas</option>
              <option value={SEM_AREA}>Sem ativo/área vinculada</option>
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          </div>

          {carregando && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}

          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar a lista.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {!carregando && !erro && riscos.length === 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-body">
                <p className="text-muted" style={{ margin: 0 }}>
                  Nenhum risco cadastrado ainda {projetoId ? "para esse projeto" : ""}. Cadastre
                  riscos na página{" "}
                  <a href="/seguranca/gestao-de-riscos/cadastro-de-riscos">Cadastro de Riscos</a>.
                </p>
              </div>
            </div>
          )}

          {!carregando && !erro && riscos.length > 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-header">
                {visiveis.length === riscos.length
                  ? `${riscos.length} risco${riscos.length > 1 ? "s" : ""} encontrado${riscos.length > 1 ? "s" : ""}`
                  : `${visiveis.length} de ${riscos.length} riscos`}
              </div>
              <div className="dash-panel-body">
                <div className="dash-table-scroll">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Projeto</th>
                        <th>Categoria</th>
                        <th>Risco</th>
                        <th>Nível</th>
                        <th>Apetite</th>
                        <th>Status</th>
                        <th>Dono</th>
                        <th>Ativo / Área</th>
                        <th>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiveis.map((r) => (
                        <tr
                          key={r.id}
                          style={r.apetite === "acima_tolerancia" ? { boxShadow: "inset 4px 0 0 var(--danger)" } : undefined}
                        >
                          <td>
                            <Link
                              href={`/seguranca/gestao-de-riscos/riscos/${r.id}`}
                              style={{ color: "var(--accent)", fontWeight: 600 }}
                            >
                              #{r.id}
                            </Link>
                          </td>
                          <td>{r.projeto}</td>
                          <td>{r.categoria || "—"}</td>
                          <td style={{ whiteSpace: "normal", minWidth: "18rem" }}>{r.titulo || r.gatilho || "—"}</td>
                          <td>
                            {r.impacto_qualitativo ? (
                              <span className={`badge ${BADGE_POR_NIVEL[r.impacto_qualitativo] || ""}`}>
                                {r.impacto_qualitativo}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td><BadgeApetite situacao={r.apetite} /></td>
                          <td className={classeStatus(r.status)}>{r.status || "Identificado"}</td>
                          <td>
                            {r.dono_nome || r.dono_email || (
                              <span style={{ color: "var(--danger)", fontWeight: 600 }}>sem dono</span>
                            )}
                            {r.dono_contato_id && r.ponto_focal_nome && (
                              <div className="text-muted" style={{ fontSize: "0.75rem" }}>ponto focal: {r.ponto_focal_nome}</div>
                            )}
                          </td>
                          <td style={{ whiteSpace: "normal", minWidth: "10rem" }}>
                            {r.ativo || "—"}
                            {r.area && <div className="text-muted" style={{ fontSize: "0.75rem" }}>{r.area}</div>}
                          </td>
                          <td>{formatData(r.data_levantamento)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

            <a
            href="/seguranca/gestao-de-riscos"
            className="status-tag"
            style={{ marginTop: "2.5rem", display: "inline-block" }}
          >
            ← Voltar para Gestão de Riscos
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
