"use client";

import { useEffect, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import { usePerfilRiscos, SemPermissao } from "@/components/riscos/PermissoesRiscos";
import { PERFIS_ATRIBUIVEIS, ROTULO_PERFIL_RISCOS, type PerfilRiscos } from "@/lib/perfisRiscos";

// Usuários e perfis do Gestão de Riscos. Administrador e CISO convidam,
// atribuem perfis e removem o acesso; as regras valem de fato no servidor
// (lib/perfisRiscos: validarMudancaPerfil e validarConvite).

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilRiscos;
  porGrupo: boolean;
  bloqueado: boolean;
  criadoEm: string;
  ultimoAcesso: string | null;
};
type Convite = { id: string; email: string; perfil: PerfilRiscos; criadoEm: string };
type Hist = {
  ocorrido_em: string;
  operacao: string;
  campo: string;
  valor_anterior: { email?: string; perfil?: string } | null;
  valor_novo: { email?: string; perfil?: string } | null;
  usuario_nome: string | null;
};
type Dados = { usuarios: Usuario[]; convites: Convite[]; historico: Hist[]; eu: { id: string | null; perfil: PerfilRiscos } };

const O_QUE_FAZ: Record<string, string> = {
  usuario: "Consulta riscos, planos, indicadores e relatórios.",
  analista_grc: "Cadastra e edita riscos, planos, ações e evidências.",
  auditor: "Audita planos concluídos; vê a trilha de alterações.",
  coordenador: "Edita riscos, audita e aprova aceitações de nível Baixo e Médio.",
  gerente: "Edita riscos, audita e aprova aceitações até nível Alto.",
  ciso: "Aprova o apetite, aceita riscos Críticos e gerencia usuários.",
  administrador: "Todas as funções, inclusive conceder o perfil Administrador.",
};

const BADGE: Partial<Record<PerfilRiscos, { fundo: string; cor: string }>> = {
  administrador: { fundo: "#ede9fe", cor: "#5b21b6" },
  ciso: { fundo: "var(--rs-primaria-tint, #e9eef7)", cor: "var(--rs-primaria, #2f4b7c)" },
  sem_acesso: { fundo: "#f2f4f7", cor: "#667085" },
};

function Perfil({ p }: { p: PerfilRiscos }) {
  const e = BADGE[p] ?? { fundo: "#f2f4f7", cor: "#1b2130" };
  return (
    <span style={{ background: e.fundo, color: e.cor, borderRadius: 999, padding: "0.15rem 0.6rem", fontSize: "0.8rem", fontWeight: 600, whiteSpace: "nowrap" }}>
      {ROTULO_PERFIL_RISCOS[p]}
    </span>
  );
}

const dataHora = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

export default function Usuarios() {
  const perfil = usePerfilRiscos();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mostrarSemAcesso, setMostrarSemAcesso] = useState(false);
  const [busca, setBusca] = useState("");
  const [rascunho, setRascunho] = useState<Record<string, PerfilRiscos>>({});
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [convite, setConvite] = useState<{ email: string; perfil: PerfilRiscos | "" }>({ email: "", perfil: "" });

  function carregar() {
    fetch("/api/usuarios-admin")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDados(d);
        setRascunho({});
      })
      .catch((e) => setErro(e.message || "Erro ao carregar."));
  }
  useEffect(() => {
    if (perfil.carregado && perfil.permissoes.gerirUsuarios) carregar();
  }, [perfil.carregado, perfil.permissoes.gerirUsuarios]);

  const souAdmin = dados?.eu.perfil === "administrador";
  const opcoes = PERFIS_ATRIBUIVEIS.filter((p) => souAdmin || p !== "administrador");

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (dados?.usuarios ?? []).filter(
      (u) => (mostrarSemAcesso || u.perfil !== "sem_acesso") && (!q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [dados, busca, mostrarSemAcesso]);
  const contagem = useMemo(() => {
    const c: Partial<Record<PerfilRiscos, number>> = {};
    for (const u of dados?.usuarios ?? []) if (u.perfil !== "sem_acesso") c[u.perfil] = (c[u.perfil] ?? 0) + 1;
    return c;
  }, [dados]);
  const semAcesso = (dados?.usuarios ?? []).filter((u) => u.perfil === "sem_acesso").length;

  async function chamar(chave: string, url: string, init: RequestInit, ok: string) {
    setEnviando(chave);
    setErro(null);
    setAviso(null);
    try {
      const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Não foi possível concluir.");
      setAviso(ok);
      setConfirmar(null);
      carregar();
      return true;
    } catch (e: any) {
      setErro(e.message);
      return false;
    } finally {
      setEnviando(null);
    }
  }

  function bloqueioDe(u: Usuario): string | null {
    if (u.id === dados?.eu.id) return "Você não pode alterar o próprio perfil.";
    if (u.porGrupo) return "Perfil definido por grupo do provedor de identidade (SSO).";
    if (!souAdmin && u.perfil === "administrador") return "Só um Administrador altera outro Administrador.";
    return null;
  }

  if (perfil.carregado && !perfil.permissoes.gerirUsuarios) {
    return (
      <>
        <SemPermissao mensagem="Somente o Administrador ou o CISO gerenciam usuários e perfis." />
        <Footer />
      </>
    );
  }

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos · Administração</span>
          <h1>Usuários e perfis</h1>
          <p className="lede">
            Convide pessoas para o Gestão de Riscos, defina o perfil de cada uma e remova o acesso de quem não precisa mais. Toda
            mudança fica registrada na trilha de auditoria.
          </p>

          {erro && (
            <div className="error-banner" role="alert" style={{ marginTop: "1rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text"><span>{erro}</span></span>
            </div>
          )}
          {aviso && (
            <p role="status" style={{ marginTop: "1rem", color: "var(--rs-ok, #2f7a54)", fontWeight: 600 }}>✓ {aviso}</p>
          )}

          {!dados && !erro && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}

          {dados && (
            <div className="dashboard">
              <div className="dash-panel">
                <div className="dash-panel-header">Convidar usuário</div>
                <div className="dash-panel-body">
                  <form
                    style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const ok = await chamar(
                        "convite",
                        "/api/usuarios-admin",
                        { method: "POST", body: JSON.stringify(convite) },
                        `Convite enviado para ${convite.email}.`
                      );
                      if (ok) setConvite({ email: "", perfil: "" });
                    }}
                  >
                    <div className="form-field" style={{ flex: "2 1 16rem", margin: 0 }}>
                      <label htmlFor="conviteEmail">E-mail</label>
                      <input
                        id="conviteEmail"
                        type="email"
                        required
                        value={convite.email}
                        onChange={(e) => setConvite({ ...convite, email: e.target.value })}
                        placeholder="nome@empresa.com.br"
                      />
                    </div>
                    <div className="form-field" style={{ flex: "1 1 12rem", margin: 0 }}>
                      <label htmlFor="convitePerfil">Perfil</label>
                      <select
                        id="convitePerfil"
                        required
                        value={convite.perfil}
                        onChange={(e) => setConvite({ ...convite, perfil: e.target.value as PerfilRiscos })}
                      >
                        <option value="" disabled>Selecione</option>
                        {opcoes.map((p) => (
                          <option key={p} value={p}>{ROTULO_PERFIL_RISCOS[p]}</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="btn-primary" disabled={enviando === "convite"} style={{ minHeight: "2.75rem" }}>
                      {enviando === "convite" ? "Enviando..." : "Enviar convite"}
                    </button>
                  </form>
                  {convite.perfil && <p className="field-helper" style={{ marginTop: "0.5rem" }}>{O_QUE_FAZ[convite.perfil]}</p>}
                  <p className="field-helper" style={{ marginTop: "0.5rem" }}>
                    A pessoa recebe um e-mail para criar a conta; o convite vale por 7 dias e ela entra já com o perfil escolhido. Quando o
                    SSO estiver ligado, quem é do domínio da empresa entra direto pelo login corporativo; o convite continua servindo para
                    pessoas de fora, como auditores externos.
                  </p>

                  {dados.convites.length > 0 && (
                    <>
                      <h3 style={{ marginTop: "1.25rem" }}>Convites pendentes · {dados.convites.length}</h3>
                      <table className="dash-table">
                        <thead>
                          <tr><th>E-mail</th><th>Perfil</th><th>Enviado em</th><th></th></tr>
                        </thead>
                        <tbody>
                          {dados.convites.map((c) => (
                            <tr key={c.id}>
                              <td>{c.email}</td>
                              <td><Perfil p={c.perfil} /></td>
                              <td>{dataHora(c.criadoEm)}</td>
                              <td style={{ textAlign: "right" }}>
                                {confirmar === c.id ? (
                                  <span style={{ display: "inline-flex", gap: "0.4rem" }}>
                                    <button
                                      type="button"
                                      className="btn-primary"
                                      style={{ background: "var(--rs-perigo, #b42330)", fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}
                                      disabled={enviando === c.id}
                                      onClick={() => chamar(c.id, `/api/usuarios-admin/convites/${c.id}`, { method: "DELETE" }, `Convite de ${c.email} cancelado.`)}
                                    >
                                      Confirmar cancelamento
                                    </button>
                                    <button type="button" className="status-tag" onClick={() => setConfirmar(null)}>Voltar</button>
                                  </span>
                                ) : (
                                  <button type="button" className="status-tag" onClick={() => setConfirmar(c.id)}>Cancelar convite</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">Usuários com acesso · {(dados.usuarios.length - semAcesso)}</div>
                <div className="dash-panel-body">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                    {PERFIS_ATRIBUIVEIS.filter((p) => contagem[p]).map((p) => (
                      <span key={p} style={{ fontSize: "0.82rem" }}>
                        <Perfil p={p} /> <strong>{contagem[p]}</strong>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", marginBottom: "0.75rem" }}>
                    <input
                      type="search"
                      aria-label="Buscar por nome ou e-mail"
                      placeholder="Buscar por nome ou e-mail"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      style={{ flex: "1 1 16rem", padding: "0.5rem 0.75rem", border: "1px solid var(--rs-border, #e5e7eb)", borderRadius: 8 }}
                    />
                    <label style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", fontSize: "0.85rem" }}>
                      <input type="checkbox" checked={mostrarSemAcesso} onChange={(e) => setMostrarSemAcesso(e.target.checked)} />
                      Mostrar contas do lab sem acesso ao módulo ({semAcesso})
                    </label>
                  </div>
                  <div className="dash-table-scroll">
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Usuário</th>
                          <th>Perfil</th>
                          <th>Último acesso</th>
                          <th style={{ textAlign: "right" }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visiveis.map((u) => {
                          const trava = bloqueioDe(u);
                          const novo = rascunho[u.id];
                          const mudou = novo && novo !== u.perfil;
                          return (
                            <tr key={u.id}>
                              <td>
                                <strong>{u.nome}</strong>
                                {u.id === dados.eu.id && <span className="text-muted"> (você)</span>}
                                <div className="text-muted" style={{ fontSize: "0.78rem" }}>{u.email}</div>
                                {u.bloqueado && <div style={{ fontSize: "0.75rem", color: "var(--rs-perigo, #b42330)" }}>Conta bloqueada no lab</div>}
                              </td>
                              <td>
                                {trava ? (
                                  <span title={trava}>
                                    <Perfil p={u.perfil} /> <span aria-hidden="true">🔒</span>
                                    <div className="text-muted" style={{ fontSize: "0.72rem", maxWidth: "14rem" }}>{trava}</div>
                                  </span>
                                ) : (
                                  <select
                                    aria-label={`Perfil de ${u.nome}`}
                                    value={novo ?? u.perfil}
                                    onChange={(e) => setRascunho({ ...rascunho, [u.id]: e.target.value as PerfilRiscos })}
                                    style={{ padding: "0.3rem 0.5rem" }}
                                  >
                                    {u.perfil === "sem_acesso" && <option value="sem_acesso">Sem acesso</option>}
                                    {opcoes.map((p) => (
                                      <option key={p} value={p}>{ROTULO_PERFIL_RISCOS[p]}</option>
                                    ))}
                                  </select>
                                )}
                              </td>
                              <td style={{ whiteSpace: "nowrap" }} title={`Conta criada em ${data(u.criadoEm)}`}>
                                {u.ultimoAcesso ? dataHora(u.ultimoAcesso) : "Nunca acessou"}
                              </td>
                              <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                {!trava && mudou && (
                                  <span style={{ display: "inline-flex", gap: "0.4rem" }}>
                                    <button
                                      type="button"
                                      className="btn-primary"
                                      style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}
                                      disabled={enviando === u.id}
                                      onClick={() =>
                                        chamar(
                                          u.id,
                                          `/api/usuarios-admin/${u.id}`,
                                          { method: "PATCH", body: JSON.stringify({ perfil: novo }) },
                                          `${u.nome}: ${ROTULO_PERFIL_RISCOS[u.perfil]} → ${ROTULO_PERFIL_RISCOS[novo]}.`
                                        )
                                      }
                                    >
                                      Salvar
                                    </button>
                                    <button type="button" className="status-tag" onClick={() => setRascunho({ ...rascunho, [u.id]: u.perfil })}>
                                      Desfazer
                                    </button>
                                  </span>
                                )}
                                {!trava && !mudou && u.perfil !== "sem_acesso" &&
                                  (confirmar === u.id ? (
                                    <span style={{ display: "inline-flex", gap: "0.4rem" }}>
                                      <button
                                        type="button"
                                        className="btn-primary"
                                        style={{ background: "var(--rs-perigo, #b42330)", fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}
                                        disabled={enviando === u.id}
                                        onClick={() =>
                                          chamar(
                                            u.id,
                                            `/api/usuarios-admin/${u.id}`,
                                            { method: "PATCH", body: JSON.stringify({ perfil: "sem_acesso" }) },
                                            `Acesso de ${u.nome} ao Gestão de Riscos removido.`
                                          )
                                        }
                                      >
                                        Confirmar remoção
                                      </button>
                                      <button type="button" className="status-tag" onClick={() => setConfirmar(null)}>Voltar</button>
                                    </span>
                                  ) : (
                                    <button type="button" className="status-tag" onClick={() => setConfirmar(u.id)}>Remover acesso</button>
                                  ))}
                              </td>
                            </tr>
                          );
                        })}
                        {visiveis.length === 0 && (
                          <tr><td colSpan={4} className="text-muted">Nenhum usuário encontrado.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="field-helper" style={{ marginTop: "0.75rem" }}>
                    Remover o acesso tira a pessoa só do Gestão de Riscos; a conta continua valendo para os outros módulos do lab. Ninguém
                    altera o próprio perfil, só um Administrador concede o perfil Administrador e o último Administrador não pode ser
                    rebaixado.
                  </p>
                </div>
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">O que cada perfil pode fazer</div>
                <div className="dash-panel-body">
                  <table className="dash-table">
                    <tbody>
                      {PERFIS_ATRIBUIVEIS.map((p) => (
                        <tr key={p}>
                          <td style={{ width: "12rem" }}><Perfil p={p} /></td>
                          <td>{O_QUE_FAZ[p]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">Últimas alterações</div>
                <div className="dash-panel-body">
                  {dados.historico.length === 0 ? (
                    <p className="text-muted" style={{ margin: 0 }}>Nenhuma alteração registrada pela tela ainda.</p>
                  ) : (
                    <table className="dash-table">
                      <thead>
                        <tr><th>Quando</th><th>Quem</th><th>O que</th></tr>
                      </thead>
                      <tbody>
                        {dados.historico.map((h, i) => {
                          const alvo = h.valor_novo?.email || h.valor_anterior?.email || "—";
                          const rot = (p?: string) => (p ? ROTULO_PERFIL_RISCOS[p as PerfilRiscos] ?? p : "—");
                          const texto =
                            h.campo === "convite"
                              ? h.operacao === "INSERT"
                                ? `Convidou ${alvo} como ${rot(h.valor_novo?.perfil)}`
                                : `Cancelou o convite de ${alvo}`
                              : h.valor_novo?.perfil === "sem_acesso"
                                ? `Removeu o acesso de ${alvo} (era ${rot(h.valor_anterior?.perfil)})`
                                : `Mudou ${alvo}: ${rot(h.valor_anterior?.perfil)} → ${rot(h.valor_novo?.perfil)}`;
                          return (
                            <tr key={i}>
                              <td style={{ whiteSpace: "nowrap" }}>{dataHora(h.ocorrido_em)}</td>
                              <td>{h.usuario_nome || "—"}</td>
                              <td>{texto}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
