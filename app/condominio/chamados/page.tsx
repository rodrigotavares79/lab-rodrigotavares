"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import cs from "../condominio.module.css";

type ChamadoLinha = {
  id: number;
  titulo: string;
  status: string;
  urgencia: string | null;
  prazo_sla: string | null;
  global: boolean;
  aberto_por_nome: string;
  aberto_por_unidade: string | null;
  criado_em: string;
  servico: string | null;
  fornecedor: string | null;
  descricao: string | null;
};

// Minúsculas e sem acento, para "agua" encontrar "Água".
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Todas as palavras digitadas precisam aparecer em algum campo do chamado;
// números precisam bater por inteiro.
function correspondeBusca(c: ChamadoLinha, termos: string[]): boolean {
  if (termos.length === 0) return true;
  const alvo = normalizar(
    [
      `#${c.id}`, c.titulo, c.descricao, c.servico, c.status, c.urgencia,
      c.aberto_por_nome, c.aberto_por_unidade, c.fornecedor,
    ].filter(Boolean).join(" ")
  );
  return termos.every((t) =>
    // Termo só com dígitos bate apenas com o número inteiro: "2" acha
    // "Bloco 2" e "#2", mas não "Apto 220" nem "#25".
    /^\d+$/.test(t) ? new RegExp(`(^|\\D)${t}(\\D|$)`).test(alvo) : alvo.includes(t)
  );
}

function classeStatus(status: string): string {
  if (status === "Resolvido") return "status-resolved";
  if (status === "Novo" || status === "Reaberto") return "status-identified";
  if (status === "Cancelado") return "status-pending";
  return "status-identified";
}

function classeUrgencia(urgencia: string | null): string {
  if (urgencia === "Urgente") return "badge badge-critico";
  if (urgencia === "Média") return "badge badge-medio";
  if (urgencia === "Baixa") return "badge badge-baixo";
  return "";
}

function slaVencido(prazo: string | null, status: string): boolean {
  if (!prazo || status === "Resolvido" || status === "Cancelado") return false;
  return new Date(prazo) < new Date();
}

function formatDataHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Ordem de prioridade para a ordenação da lista — mais urgente / mais
// perto do vencimento / mais "precisa de atenção" primeiro.
const ORDEM_URGENCIA: Record<string, number> = { "Urgente": 0, "Média": 1, "Baixa": 2 };
const ORDEM_STATUS: Record<string, number> = {
  "Novo": 0,
  "Reaberto": 1,
  "Em andamento": 2,
  "Aguardando fornecedor": 3,
  "Paralisado": 4,
  "Resolvido": 5,
  "Cancelado": 6,
};

function encerrado(status: string): boolean {
  return status === "Resolvido" || status === "Cancelado";
}

function valorUrgencia(c: ChamadoLinha): number {
  return c.urgencia ? ORDEM_URGENCIA[c.urgencia] ?? 99 : 99;
}

function valorPrazo(c: ChamadoLinha): number {
  return c.prazo_sla ? new Date(c.prazo_sla).getTime() : Infinity;
}

function valorStatus(c: ChamadoLinha): number {
  return ORDEM_STATUS[c.status] ?? 99;
}

function valorCriado(c: ChamadoLinha): number {
  return new Date(c.criado_em).getTime();
}

// Filtros rápidos por situação do chamado.
type Situacao = "todos" | "abertos" | "vencidos" | "encerrados";
const OPCOES_SITUACAO: { valor: Situacao; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "abertos", rotulo: "Em aberto" },
  { valor: "vencidos", rotulo: "Prazo vencido" },
  { valor: "encerrados", rotulo: "Encerrados" },
];

function correspondeSituacao(c: ChamadoLinha, situacao: Situacao): boolean {
  if (situacao === "abertos") return !encerrado(c.status);
  if (situacao === "vencidos") return slaVencido(c.prazo_sla, c.status);
  if (situacao === "encerrados") return encerrado(c.status);
  return true;
}

const POR_PAGINA = 25;

type Ordenacao = "padrao" | "prazo" | "urgencia" | "status" | "recentes" | "antigos";

const OPCOES_ORDENACAO: { valor: Ordenacao; rotulo: string }[] = [
  { valor: "padrao", rotulo: "Padrão (urgência, prazo e status)" },
  { valor: "prazo", rotulo: "Prazo SLA — mais próximo primeiro" },
  { valor: "urgencia", rotulo: "Urgência" },
  { valor: "status", rotulo: "Status" },
  { valor: "recentes", rotulo: "Mais recentes primeiro" },
  { valor: "antigos", rotulo: "Mais antigos primeiro" },
];

function compararPorCriterio(a: ChamadoLinha, b: ChamadoLinha, ordenacao: Ordenacao): number {
  switch (ordenacao) {
    case "prazo":
      return valorPrazo(a) - valorPrazo(b) || valorUrgencia(a) - valorUrgencia(b);
    case "urgencia":
      return valorUrgencia(a) - valorUrgencia(b) || valorPrazo(a) - valorPrazo(b);
    case "status":
      return valorStatus(a) - valorStatus(b) || valorPrazo(a) - valorPrazo(b);
    case "recentes":
      return valorCriado(b) - valorCriado(a);
    case "antigos":
      return valorCriado(a) - valorCriado(b);
    case "padrao":
    default:
      return (
        valorUrgencia(a) - valorUrgencia(b) ||
        valorPrazo(a) - valorPrazo(b) ||
        valorStatus(a) - valorStatus(b)
      );
  }
}

function compararChamados(a: ChamadoLinha, b: ChamadoLinha, ordenacao: Ordenacao): number {
  // Encerrados sempre vão para o fim da fila, qualquer que seja o critério escolhido.
  const encA = encerrado(a.status) ? 1 : 0;
  const encB = encerrado(b.status) ? 1 : 0;
  if (encA !== encB) return encA - encB;

  return compararPorCriterio(a, b, ordenacao);
}

function IconeGlobo() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.8 2.5 4.2 5.8 4.2 9s-1.4 6.5-4.2 9c-2.8-2.5-4.2-5.8-4.2-9s1.4-6.5 4.2-9z" />
    </svg>
  );
}

export default function Chamados() {
  const [chamados, setChamados] = useState<ChamadoLinha[]>([]);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("padrao");
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<Situacao>("abertos");
  const [urgenciaFiltro, setUrgenciaFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    fetch("/api/chamados")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setChamados(d.chamados || []);
        setPerfil(d.perfil || null);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar chamados."))
      .finally(() => setCarregando(false));
  }, []);

  const gerente = perfil === "sindico" || perfil === "conselheiro" || perfil === "conselheiro_admin";

  // Encerrados sempre no fim; dentro de cada grupo, pelo critério escolhido.
  const chamadosOrdenados = useMemo(() => {
    const termos = normalizar(busca).split(/\s+/).filter(Boolean);
    return chamados
      .filter((c) => correspondeBusca(c, termos))
      .filter((c) => correspondeSituacao(c, situacao))
      .filter((c) => !urgenciaFiltro || c.urgencia === urgenciaFiltro)
      .filter((c) => !statusFiltro || c.status === statusFiltro)
      .sort((a, b) => compararChamados(a, b, ordenacao));
  }, [chamados, ordenacao, busca, situacao, urgenciaFiltro, statusFiltro]);
  const filtrando = busca.trim().length > 0 || situacao !== "todos" || !!urgenciaFiltro || !!statusFiltro;

  // Contagem de cada filtro rápido (considerando só a busca por texto).
  const contagemSituacao = useMemo(() => {
    const termos = normalizar(busca).split(/\s+/).filter(Boolean);
    const base = chamados.filter((c) => correspondeBusca(c, termos));
    return Object.fromEntries(
      OPCOES_SITUACAO.map((o) => [o.valor, base.filter((c) => correspondeSituacao(c, o.valor)).length])
    ) as Record<Situacao, number>;
  }, [chamados, busca]);

  const statusDisponiveis = useMemo(
    () => Object.keys(ORDEM_STATUS).filter((st) => chamados.some((c) => c.status === st)),
    [chamados]
  );

  // Qualquer mudança de filtro, busca ou ordenação volta para a página 1.
  useEffect(() => {
    setPagina(1);
  }, [busca, situacao, urgenciaFiltro, statusFiltro, ordenacao]);

  const totalPaginas = Math.max(1, Math.ceil(chamadosOrdenados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const chamadosDaPagina = chamadosOrdenados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  function limparFiltros() {
    setBusca("");
    setSituacao("todos");
    setUrgenciaFiltro("");
    setStatusFiltro("");
  }

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Condomínio</span>
          <h1>Chamados</h1>
          <p className="lede">
            {gerente
              ? "Todos os chamados abertos no condomínio."
              : "Os chamados que você abriu, mais os marcados como visíveis a todos."}
          </p>

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

          {!carregando && !erro && chamados.length === 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-body">
                <p className="text-muted" style={{ margin: 0 }}>
                  Nenhum chamado por aqui ainda. Abra um em{" "}
                  <a href="/condominio/novo-chamado">Abrir Chamado</a>.
                </p>
              </div>
            </div>
          )}

          {!carregando && !erro && chamados.length > 0 && (
            <>
              <div className="list-toolbar">
                <input
                  type="search"
                  className="list-toolbar-busca"
                  placeholder="Buscar por palavra-chave (título, descrição, serviço, unidade...)"
                  aria-label="Buscar chamados por palavra-chave"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
                <span className="list-toolbar-grupo">
                <label htmlFor="ordenacao">Ordenar por</label>
                <select
                  id="ordenacao"
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
                >
                  {OPCOES_ORDENACAO.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.rotulo}
                    </option>
                  ))}
                </select>
                </span>
              </div>
              <div className={cs.filtrosRapidos}>
                <div className={cs.chips} role="group" aria-label="Filtrar por situação">
                  {OPCOES_SITUACAO.map((o) => (
                    <button
                      key={o.valor}
                      type="button"
                      className={`${cs.chip} ${situacao === o.valor ? cs.chipAtivo : ""}`}
                      aria-pressed={situacao === o.valor}
                      onClick={() => setSituacao(o.valor)}
                    >
                      {o.rotulo}
                      <span className={cs.chipContagem}>{contagemSituacao[o.valor]}</span>
                    </button>
                  ))}
                </div>
                <select
                  className={cs.filtroSelect}
                  aria-label="Filtrar por urgência"
                  value={urgenciaFiltro}
                  onChange={(e) => setUrgenciaFiltro(e.target.value)}
                >
                  <option value="">Todas as urgências</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
                <select
                  className={cs.filtroSelect}
                  aria-label="Filtrar por status"
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value)}
                >
                  <option value="">Todos os status</option>
                  {statusDisponiveis.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                {filtrando && (
                  <button type="button" className={cs.limparFiltros} onClick={limparFiltros}>
                    Limpar filtros
                  </button>
                )}
              </div>
              <div className="dash-panel" style={{ marginTop: "0.75rem" }}>
                <div className="dash-panel-header">
                  {filtrando
                    ? `${chamadosOrdenados.length} de ${chamados.length} chamados`
                    : `${chamados.length} chamado${chamados.length > 1 ? "s" : ""}`}
                </div>
                <div className="dash-panel-body">
                  <div className={cs.tabelaRolagemHorizontal}>
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Título</th>
                          <th style={{ textAlign: "center" }} title="Visível a todos os condôminos">
                            <IconeGlobo />
                          </th>
                          <th>Serviço</th>
                          <th>Urgência</th>
                          <th>Status</th>
                          {gerente && <th>Unidade</th>}
                          <th>Fornecedor</th>
                          <th>Prazo SLA</th>
                        </tr>
                      </thead>
                    <tbody>
                      {chamadosDaPagina.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <Link
                              href={`/condominio/chamados/${c.id}`}
                              style={{ color: "var(--accent)", fontWeight: 600 }}
                            >
                              #{c.id}
                            </Link>
                          </td>
                          <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>{c.titulo}</td>
                          <td style={{ textAlign: "center", color: "var(--accent)" }}>
                            {c.global && (
                              <span title="Visível a todos os condôminos">
                                <IconeGlobo />
                              </span>
                            )}
                          </td>
                          <td>{c.servico || "—"}</td>
                          <td>
                            {c.urgencia ? <span className={classeUrgencia(c.urgencia)}>{c.urgencia}</span> : "—"}
                          </td>
                          <td className={classeStatus(c.status)}>{c.status}</td>
                          {gerente && <td>{c.aberto_por_unidade || "—"}</td>}
                          <td>{c.fornecedor || "—"}</td>
                          <td>
                            {formatDataHora(c.prazo_sla)}
                            {slaVencido(c.prazo_sla, c.status) && (
                              <span className="report-vencida" style={{ marginLeft: "0.5rem", fontSize: "0.72rem" }}>
                                <span className="legend-dot" style={{ background: "var(--danger)" }} />
                                Vencido
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {chamadosOrdenados.length === 0 && (
                        <tr>
                          <td colSpan={gerente ? 9 : 8} className="text-muted" style={{ whiteSpace: "normal", padding: "1.5rem 0.65rem" }}>
                            Nenhum chamado encontrado com os filtros escolhidos.
                          </td>
                        </tr>
                      )}
                      </tbody>
                    </table>
                  </div>
                  {chamadosOrdenados.length > POR_PAGINA && (
                    <div className={cs.paginacao}>
                      <span>
                        Mostrando {(paginaAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaAtual * POR_PAGINA, chamadosOrdenados.length)} de {chamadosOrdenados.length} · página {paginaAtual} de {totalPaginas}
                      </span>
                      <span className={cs.paginacaoBotoes}>
                        <button type="button" className={cs.acaoTabela} disabled={paginaAtual <= 1} onClick={() => setPagina(paginaAtual - 1)}>
                          ← Anterior
                        </button>
                        <button type="button" className={cs.acaoTabela} disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(paginaAtual + 1)}>
                          Próxima →
                        </button>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </section>
      <Footer />
    </>
  );
}
