"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Footer from "@/components/Footer";

type Fornecedor = { id: number; nome_fantasia: string };

type ChamadoDetalhe = {
  id: number;
  titulo: string;
  descricao: string | null;
  urgencia: string | null;
  status: string;
  prazo_sla: string | null;
  global: boolean;
  justificativa_ultima_movimentacao: string | null;
  aberto_por_nome: string;
  aberto_por_unidade: string | null;
  criado_em: string;
  tipo: string | null;
  fornecedor_id: number | null;
  fornecedor: string | null;
};

type Mensagem = {
  id: number;
  autor_nome: string;
  texto: string;
  visivel_condomino: boolean;
  criado_em: string;
};

const STATUS_OPCOES = [
  "Novo",
  "Em andamento",
  "Aguardando fornecedor",
  "Paralisado",
  "Resolvido",
  "Reaberto",
  "Cancelado",
];

function classeUrgencia(urgencia: string | null): string {
  if (urgencia === "Urgente") return "badge badge-critico";
  if (urgencia === "Média") return "badge badge-medio";
  if (urgencia === "Baixa") return "badge badge-baixo";
  return "";
}

function formatDataHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function LinhaCampo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <td style={{ color: "var(--text-muted)", width: "40%", whiteSpace: "normal" }}>{label}</td>
      <td style={{ fontWeight: 500, whiteSpace: "normal" }}>{value}</td>
    </tr>
  );
}

export default function DetalheDoChamado() {
  const params = useParams<{ id: string }>();
  const [chamado, setChamado] = useState<ChamadoDetalhe | null>(null);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [statusForm, setStatusForm] = useState("");
  const [fornecedorForm, setFornecedorForm] = useState("");
  const [globalForm, setGlobalForm] = useState(false);
  const [justificativaForm, setJustificativaForm] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [sucessoSalvar, setSucessoSalvar] = useState(false);

  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregandoMensagens, setCarregandoMensagens] = useState(true);
  const [textoMensagem, setTextoMensagem] = useState("");
  const [notaInterna, setNotaInterna] = useState(false);
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [erroMensagem, setErroMensagem] = useState<string | null>(null);

  function carregarChamado() {
    if (!params?.id) return;
    setCarregando(true);
    setErro(null);
    fetch(`/api/chamados/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setChamado(d.chamado);
        setPerfil(d.perfil);
        setStatusForm(d.chamado.status);
        setFornecedorForm(d.chamado.fornecedor_id ? String(d.chamado.fornecedor_id) : "");
        setGlobalForm(d.chamado.global);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar o chamado."))
      .finally(() => setCarregando(false));
  }

  function carregarMensagens() {
    if (!params?.id) return;
    setCarregandoMensagens(true);
    fetch(`/api/chamados/${params.id}/mensagens`)
      .then((r) => r.json())
      .then((d) => setMensagens(d.mensagens || []))
      .catch(() => setMensagens([]))
      .finally(() => setCarregandoMensagens(false));
  }

  useEffect(() => {
    carregarChamado();
    carregarMensagens();
    fetch("/api/fornecedores")
      .then((r) => r.json())
      .then((d) => setFornecedores(d.fornecedores || []))
      .catch(() => setFornecedores([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  const gerente = perfil === "sindico" || perfil === "conselheiro";

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!chamado) return;
    setSalvando(true);
    setErroSalvar(null);
    setSucessoSalvar(false);
    try {
      const res = await fetch(`/api/chamados/${chamado.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusForm,
          fornecedorId: fornecedorForm ? Number(fornecedorForm) : null,
          global: globalForm,
          justificativa: justificativaForm,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao salvar.");
      setSucessoSalvar(true);
      setJustificativaForm("");
      carregarChamado();
    } catch (err) {
      setErroSalvar(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleEnviarMensagem(e: React.FormEvent) {
    e.preventDefault();
    if (!params?.id) return;
    setEnviandoMensagem(true);
    setErroMensagem(null);
    try {
      const res = await fetch(`/api/chamados/${params.id}/mensagens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: textoMensagem, visivelCondomino: !notaInterna }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao enviar a mensagem.");
      setTextoMensagem("");
      setNotaInterna(false);
      carregarMensagens();
    } catch (err) {
      setErroMensagem(err instanceof Error ? err.message : "Erro ao enviar a mensagem.");
    } finally {
      setEnviandoMensagem(false);
    }
  }

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Condomínio</span>
          <div className="page-header-row">
            <h1>Chamado {chamado ? `#${chamado.id}` : ""}</h1>
          </div>

          {carregando && <p className="text-muted" style={{ marginTop: "1.5rem" }}>Carregando...</p>}

          {erro && (
            <div className="error-banner" style={{ marginTop: "1.5rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar este chamado.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {!carregando && !erro && chamado && (
            <div className="dashboard" style={{ marginTop: "1.5rem" }}>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                {chamado.urgencia && <span className={classeUrgencia(chamado.urgencia)}>{chamado.urgencia}</span>}
                <span className="status-tag" style={{ fontSize: "0.85rem" }}>Status: {chamado.status}</span>
                {chamado.global && <span className="status-tag">Visível a todos</span>}
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">Identificação</div>
                <div className="dash-panel-body">
                  <table className="dash-table">
                    <tbody>
                      <LinhaCampo label="Título" value={chamado.titulo} />
                      <LinhaCampo label="Descrição" value={chamado.descricao || "—"} />
                      <LinhaCampo label="Tipo" value={chamado.tipo || "—"} />
                      <LinhaCampo label="Aberto por" value={chamado.aberto_por_nome} />
                      <LinhaCampo label="Unidade" value={chamado.aberto_por_unidade || "—"} />
                      <LinhaCampo label="Data de abertura" value={formatDataHora(chamado.criado_em)} />
                      <LinhaCampo label="Prazo SLA" value={formatDataHora(chamado.prazo_sla)} />
                      <LinhaCampo label="Fornecedor responsável" value={chamado.fornecedor || "—"} />
                      {chamado.justificativa_ultima_movimentacao && (
                        <LinhaCampo label="Justificativa da última movimentação" value={chamado.justificativa_ultima_movimentacao} />
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {gerente && (
                <div className="dash-panel">
                  <div className="dash-panel-header">Atualizar Chamado</div>
                  <div className="dash-panel-body">
                    <p className="field-helper" style={{ marginTop: 0, marginBottom: "1rem" }}>
                      Toda mudança de status exige uma justificativa.
                    </p>
                    <form onSubmit={handleSalvar} className="form-grid" style={{ maxWidth: "34rem" }}>
                      <div className="form-field">
                        <label htmlFor="statusForm">Status</label>
                        <select id="statusForm" value={statusForm} onChange={(e) => setStatusForm(e.target.value)}>
                          {STATUS_OPCOES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="form-field">
                        <label htmlFor="fornecedorForm">Fornecedor Responsável</label>
                        <select id="fornecedorForm" value={fornecedorForm} onChange={(e) => setFornecedorForm(e.target.value)}>
                          <option value="">Nenhum</option>
                          {fornecedores.map((f) => (
                            <option key={f.id} value={f.id}>{f.nome_fantasia}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-field form-field-wide">
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 400 }}>
                          <input
                            type="checkbox"
                            checked={globalForm}
                            onChange={(e) => setGlobalForm(e.target.checked)}
                          />
                          Visível a todos os condôminos (ex.: problema em área comum)
                        </label>
                      </div>
                      <div className="form-field form-field-wide">
                        <label htmlFor="justificativaForm">Justificativa da Alteração</label>
                        <textarea
                          id="justificativaForm"
                          rows={3}
                          value={justificativaForm}
                          onChange={(e) => setJustificativaForm(e.target.value)}
                          placeholder="Ex.: Fornecedor acionado, visita agendada para amanhã às 10h."
                        />
                      </div>
                      <div className="form-field-wide form-actions">
                        <button type="submit" className="btn-primary" disabled={salvando}>
                          {salvando ? "Salvando..." : "Salvar"}
                        </button>
                        {sucessoSalvar && <span className="text-muted" style={{ fontSize: "0.85rem" }}>Salvo.</span>}
                      </div>
                      {erroSalvar && (
                        <div className="error-banner form-field-wide" style={{ marginTop: 0 }}>
                          <span className="success-icon error-icon">!</span>
                          <span className="success-text">{erroSalvar}</span>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}

              <div className="dash-panel">
                <div className="dash-panel-header">Mensagens</div>
                <div className="dash-panel-body">
                  {carregandoMensagens && <p className="text-muted" style={{ fontSize: "0.85rem" }}>Carregando...</p>}

                  {!carregandoMensagens && mensagens.length === 0 && (
                    <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: 0 }}>
                      Nenhuma mensagem ainda.
                    </p>
                  )}

                  {!carregandoMensagens && mensagens.map((m) => (
                    <div key={m.id} className="dash-panel" style={{ marginBottom: "0.75rem", background: "var(--bg)" }}>
                      <div className="dash-panel-body" style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                          <strong style={{ color: "var(--text)" }}>{m.autor_nome}</strong>
                          <span>
                            {formatDataHora(m.criado_em)}
                            {!m.visivel_condomino && <span className="status-tag" style={{ marginLeft: "0.5rem" }}>Nota interna</span>}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>{m.texto}</p>
                      </div>
                    </div>
                  ))}

                  <form onSubmit={handleEnviarMensagem} className="form-grid" style={{ maxWidth: "34rem", marginTop: "1rem" }}>
                    <div className="form-field form-field-wide">
                      <label htmlFor="textoMensagem">Nova mensagem</label>
                      <textarea
                        id="textoMensagem"
                        rows={2}
                        value={textoMensagem}
                        onChange={(e) => setTextoMensagem(e.target.value)}
                        required
                      />
                    </div>
                    {gerente && (
                      <div className="form-field form-field-wide">
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 400 }}>
                          <input
                            type="checkbox"
                            checked={notaInterna}
                            onChange={(e) => setNotaInterna(e.target.checked)}
                          />
                          Nota interna (não visível ao condômino)
                        </label>
                      </div>
                    )}
                    <div className="form-field-wide form-actions">
                      <button type="submit" className="btn-primary" disabled={enviandoMensagem}>
                        {enviandoMensagem ? "Enviando..." : "Enviar mensagem"}
                      </button>
                    </div>
                    {erroMensagem && (
                      <div className="error-banner form-field-wide" style={{ marginTop: 0 }}>
                        <span className="success-icon error-icon">!</span>
                        <span className="success-text">{erroMensagem}</span>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          )}

          <a
            href="/condominio/chamados"
            className="status-tag"
            style={{ marginTop: "2.5rem", display: "inline-block" }}
          >
            ← Voltar para Chamados
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
