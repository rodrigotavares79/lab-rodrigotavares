"use client";

import { useState, useEffect, FormEvent } from "react";
import Footer from "@/components/Footer";

type Perfil = "sindico" | "conselheiro" | "conselheiro_admin" | "condomino";

type UsuarioCondominio = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  unidade: string;
  conselheiroAdminPrazoAte: string | null;
  diasUteisRestantes: number | null;
  conselheiroAdminPrazoValido: boolean;
};

const LABEL_PERFIL: Record<Perfil, string> = {
  sindico: "Síndico",
  conselheiro: "Conselheiro",
  conselheiro_admin: "Conselheiro-Admin",
  condomino: "Condômino",
};

const BADGE_PERFIL: Record<Perfil, string> = {
  sindico: "badge badge-critico",
  conselheiro: "badge badge-medio",
  conselheiro_admin: "badge badge-medio",
  condomino: "badge badge-baixo",
};

function formatData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function LinhaUsuario({
  usuario,
  souEu,
  podeEditar,
  podeRenovarEste,
  onAtualizado,
}: {
  usuario: UsuarioCondominio;
  souEu: boolean;
  podeEditar: boolean;
  podeRenovarEste: boolean;
  onAtualizado: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [perfil, setPerfil] = useState<Perfil>(usuario.perfil);
  const [unidade, setUnidade] = useState(usuario.unidade);
  const [salvando, setSalvando] = useState(false);
  const [renovando, setRenovando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/condominio-usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfil, unidade }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao salvar.");
      setEditando(false);
      onAtualizado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function renovarPrazo() {
    setRenovando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/condominio-usuarios/${usuario.id}/renovar-prazo`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao renovar.");
      onAtualizado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao renovar.");
    } finally {
      setRenovando(false);
    }
  }

  const mostrarPrazo = usuario.perfil === "conselheiro_admin" && usuario.conselheiroAdminPrazoAte;
  const prazoVencendo = mostrarPrazo && usuario.diasUteisRestantes !== null && usuario.diasUteisRestantes <= 7;

  if (!editando) {
    return (
      <tr>
        <td>{usuario.nome}{souEu && <span className="text-muted"> (você)</span>}</td>
        <td>{usuario.email}</td>
        <td><span className={BADGE_PERFIL[usuario.perfil]}>{LABEL_PERFIL[usuario.perfil]}</span></td>
        <td>{usuario.unidade || "—"}</td>
        <td>
          {mostrarPrazo ? (
            <span className={prazoVencendo ? "status-identified" : ""}>
              {formatData(usuario.conselheiroAdminPrazoAte)}
              {usuario.conselheiroAdminPrazoValido
                ? ` (${usuario.diasUteisRestantes} dia${usuario.diasUteisRestantes === 1 ? "" : "s"} útil(eis))`
                : " — vencido"}
            </span>
          ) : "—"}
        </td>
        <td style={{ display: "flex", gap: "0.75rem" }}>
          {podeEditar && (
            <button
              type="button"
              onClick={() => setEditando(true)}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
            >
              Editar
            </button>
          )}
          {mostrarPrazo && podeRenovarEste && (
            <button
              type="button"
              onClick={renovarPrazo}
              disabled={renovando}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
            >
              {renovando ? "Renovando..." : "Renovar prazo"}
            </button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={6}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap", padding: "0.5rem 0" }}>
          <div className="form-field" style={{ maxWidth: "12rem" }}>
            <label>{usuario.nome}</label>
            <span className="text-muted" style={{ fontSize: "0.78rem" }}>{usuario.email}</span>
          </div>
          <div className="form-field" style={{ maxWidth: "11rem" }}>
            <label>Perfil</label>
            <select value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}>
              <option value="sindico">Síndico</option>
              <option value="conselheiro">Conselheiro</option>
              <option value="conselheiro_admin">Conselheiro-Admin</option>
              <option value="condomino">Condômino</option>
            </select>
          </div>
          <div className="form-field" style={{ maxWidth: "14rem" }}>
            <label>Unidade</label>
            <input type="text" value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="Ex.: Bloco 2, Apto 304" />
          </div>
          <div className="form-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => { setEditando(false); setPerfil(usuario.perfil); setUnidade(usuario.unidade); setErro(null); }}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
            >
              Cancelar
            </button>
          </div>
        </div>
        {perfil === "sindico" && perfil !== usuario.perfil && (
          <p className="field-helper" style={{ margin: "0 0 0.5rem" }}>
            Só funciona se não houver outro síndico cadastrado. Para trocar de síndico, use a ação "Cadastrar Síndico" como conselheiro-admin.
          </p>
        )}
        {erro && (
          <div className="error-banner" style={{ marginTop: 0 }}>
            <span className="success-icon error-icon">!</span>
            <span className="success-text">{erro}</span>
          </div>
        )}
      </td>
    </tr>
  );
}

function PainelCadastrarSindico({
  usuarios,
  onAtualizado,
}: {
  usuarios: UsuarioCondominio[];
  onAtualizado: () => void;
}) {
  const [novoSindicoId, setNovoSindicoId] = useState("");
  const [destino, setDestino] = useState<"conselheiro" | "condomino" | "inativo">("condomino");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const sindicoAtual = usuarios.find((u) => u.perfil === "sindico");
  const elegiveis = usuarios.filter((u) => u.perfil !== "sindico");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    setSucesso(false);
    try {
      const res = await fetch("/api/condominio-cadastrar-sindico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novoSindicoUserId: novoSindicoId, destinoSindicoAtual: destino }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao cadastrar o síndico.");
      setSucesso(true);
      setNovoSindicoId("");
      onAtualizado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cadastrar o síndico.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="risk-form" onSubmit={handleSubmit}>
      <fieldset className="form-section">
        <legend>Cadastrar Novo Síndico</legend>
        <p className="field-helper" style={{ marginTop: 0 }}>
          Ação exclusiva do conselheiro-admin, disponível dentro do prazo de 30 dias úteis.
          {sindicoAtual && ` O síndico atual (${sindicoAtual.nome}) será atualizado conforme a decisão da assembleia.`}
        </p>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="novoSindicoId">Novo Síndico</label>
            <select id="novoSindicoId" value={novoSindicoId} onChange={(e) => setNovoSindicoId(e.target.value)} required>
              <option value="" disabled>Selecione</option>
              {elegiveis.map((u) => (
                <option key={u.id} value={u.id}>{u.nome} ({u.email})</option>
              ))}
            </select>
          </div>
          {sindicoAtual && (
            <div className="form-field">
              <label htmlFor="destino">O que fazer com o síndico atual?</label>
              <select id="destino" value={destino} onChange={(e) => setDestino(e.target.value as typeof destino)}>
                <option value="conselheiro">Rebaixar para Conselheiro</option>
                <option value="condomino">Rebaixar para Condômino</option>
                <option value="inativo">Inativar (síndico profissional, não-morador)</option>
              </select>
            </div>
          )}
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={enviando}>
          {enviando ? "Cadastrando..." : "Cadastrar Síndico"}
        </button>
      </div>

      {sucesso && (
        <div className="success-banner">
          <span className="success-icon">✓</span>
          <span className="success-text">
            <strong>Novo síndico cadastrado.</strong>
          </span>
        </div>
      )}

      {erro && (
        <div className="error-banner">
          <span className="success-icon error-icon">!</span>
          <span className="success-text">{erro}</span>
        </div>
      )}
    </form>
  );
}

export default function ManutencaoDeCondominos() {
  const [usuarios, setUsuarios] = useState<UsuarioCondominio[]>([]);
  const [meuId, setMeuId] = useState<string | null>(null);
  const [meuPerfil, setMeuPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [perfilConvite, setPerfilConvite] = useState<Perfil>("condomino");
  const [unidadeConvite, setUnidadeConvite] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erroConvite, setErroConvite] = useState<string | null>(null);

  function carregarUsuarios() {
    setCarregando(true);
    setErro(null);
    fetch("/api/condominio-usuarios")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setUsuarios(d.usuarios || []);
        setMeuId(d.meuId || null);
        setMeuPerfil(d.perfil || null);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar usuários."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function handleConvidar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErroConvite(null);
    setEnviado(false);
    try {
      const res = await fetch("/api/condominio-usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, perfil: perfilConvite, unidade: unidadeConvite }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao convidar.");
      setEnviado(true);
      setEmail("");
      setUnidadeConvite("");
      setPerfilConvite("condomino");
      carregarUsuarios();
    } catch (err) {
      setErroConvite(err instanceof Error ? err.message : "Erro ao convidar.");
    } finally {
      setEnviando(false);
    }
  }

  const podeEditar = meuPerfil === "sindico" || meuPerfil === "conselheiro";
  const souConselheiroAdmin = meuPerfil === "conselheiro_admin";
  const meuRegistro = usuarios.find((u) => u.id === meuId);
  const meuPrazoValido = souConselheiroAdmin && meuRegistro?.conselheiroAdminPrazoValido;
  const meuAvisoPrazo =
    souConselheiroAdmin && meuRegistro?.diasUteisRestantes !== null && meuRegistro?.diasUteisRestantes !== undefined
      ? meuRegistro.diasUteisRestantes <= 7 && meuRegistro.conselheiroAdminPrazoValido
      : false;

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Condomínio</span>
          <h1>Manutenção de Condôminos</h1>
          <p className="lede">
            Convide moradores e defina o perfil de cada um. Síndico e
            conselheiro gerenciam o condomínio; condômino só abre e
            acompanha os seus chamados; conselheiro-admin tem as funções de
            condômino, mais o poder temporário de cadastrar um novo síndico.
          </p>

          {meuAvisoPrazo && meuRegistro && (
            <div className="error-banner" style={{ marginTop: "1.5rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Seu prazo de conselheiro-admin está acabando.</strong>
                <span>
                  Faltam {meuRegistro.diasUteisRestantes} dia{meuRegistro.diasUteisRestantes === 1 ? "" : "s"} útil(eis)
                  (vence em {formatData(meuRegistro.conselheiroAdminPrazoAte)}). Renove o prazo na sua linha da tabela abaixo.
                </span>
              </span>
            </div>
          )}

          {!carregando && !erro && meuPrazoValido && (
            <PainelCadastrarSindico usuarios={usuarios} onAtualizado={carregarUsuarios} />
          )}

          {podeEditar && (
            <form className="risk-form" onSubmit={handleConvidar}>
              <fieldset className="form-section">
                <legend>Convidar Condômino</legend>
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor="email">E-mail</label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@email.com"
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="perfilConvite">Perfil</label>
                    <select id="perfilConvite" value={perfilConvite} onChange={(e) => setPerfilConvite(e.target.value as Perfil)}>
                      <option value="condomino">Condômino</option>
                      <option value="conselheiro">Conselheiro</option>
                      <option value="conselheiro_admin">Conselheiro-Admin</option>
                      <option value="sindico">Síndico</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="unidadeConvite">Unidade</label>
                    <input
                      id="unidadeConvite"
                      type="text"
                      value={unidadeConvite}
                      onChange={(e) => setUnidadeConvite(e.target.value)}
                      placeholder="Ex.: Bloco 2, Apto 304"
                    />
                  </div>
                </div>
              </fieldset>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={enviando}>
                  {enviando ? "Convidando..." : "Enviar Convite"}
                </button>
              </div>

              {enviado && (
                <div className="success-banner">
                  <span className="success-icon">✓</span>
                  <span className="success-text">
                    <strong>Convite enviado.</strong>
                    <span>A pessoa recebe um e-mail do Clerk pra criar a conta.</span>
                  </span>
                </div>
              )}

              {erroConvite && (
                <div className="error-banner">
                  <span className="success-icon error-icon">!</span>
                  <span className="success-text">
                    <strong>Não foi possível convidar.</strong>
                    <span>{erroConvite}</span>
                  </span>
                </div>
              )}
            </form>
          )}

          {carregando && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}

          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar os usuários.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {!carregando && !erro && (
            <div className="dash-panel" style={{ marginTop: "2.5rem" }}>
              <div className="dash-panel-header">
                {usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""} com acesso
              </div>
              <div className="dash-panel-body">
                <div className="dash-table-scroll">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Perfil</th>
                        <th>Unidade</th>
                        <th>Prazo (conselheiro-admin)</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map((u) => (
                        <LinhaUsuario
                          key={u.id}
                          usuario={u}
                          souEu={u.id === meuId}
                          podeEditar={podeEditar}
                          podeRenovarEste={podeEditar || u.id === meuId}
                          onAtualizado={carregarUsuarios}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <a
            href="/condominio"
            className="status-tag"
            style={{ marginTop: "2.5rem", display: "inline-block" }}
          >
            ← Voltar para Gestão de Condomínio
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
