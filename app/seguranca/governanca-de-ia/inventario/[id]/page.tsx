"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams } from "next/navigation";
import Footer from "@/components/Footer";
import {
  TIPOS,
  AREAS,
  OPCOES_DADOS_TRATADOS,
  requerAtencao,
  calcularProximaRevisao,
  formatarData,
} from "@/lib/inventarioIAConstants";

type SistemaIA = {
  id: number;
  sistema: string;
  tipo: string | null;
  descricao: string | null;
  area: string | null;
  area_usuario: string | null;
  usuarios: string | null;
  emails: string | null;
  dados_tratados: string | null;
  parecer_aprovado: boolean | null;
  parecer_numero_chamado: string | null;
  criado_em: string;
};

type Revisao = {
  id: number;
  revisado_por: string | null;
  data_revisao: string;
  numero_chamado: string | null;
  parecer_aprovado: boolean | null;
  criado_em: string;
};

export default function DetalheSistemaIA() {
  const params = useParams();
  const id = params?.id as string;

  const [sistema, setSistema] = useState<SistemaIA | null>(null);
  const [revisoes, setRevisoes] = useState<Revisao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Campos editáveis
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [area, setArea] = useState("");
  const [areaUsuario, setAreaUsuario] = useState("");
  const [usuarios, setUsuarios] = useState("");
  const [emails, setEmails] = useState("");
  const [dadosTratados, setDadosTratados] = useState<string[]>([]);
  const [parecerAprovado, setParecerAprovado] = useState("");
  const [parecerNumeroChamado, setParecerNumeroChamado] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  // Formulário de nova revisão
  const [revRevisadoPor, setRevRevisadoPor] = useState("");
  const [revData, setRevData] = useState("");
  const [revChamado, setRevChamado] = useState("");
  const [revParecer, setRevParecer] = useState("");
  const [enviandoRevisao, setEnviandoRevisao] = useState(false);
  const [erroRevisao, setErroRevisao] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    setErro(null);
    fetch(`/api/sistemas-ia/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setSistema(d.sistema);
        setRevisoes(d.revisoes || []);
        setNome(d.sistema.sistema);
        setTipo(d.sistema.tipo || "");
        setDescricao(d.sistema.descricao || "");
        setArea(d.sistema.area || "");
        setAreaUsuario(d.sistema.area_usuario || "");
        setUsuarios(d.sistema.usuarios || "");
        setEmails(d.sistema.emails || "");
        setDadosTratados(d.sistema.dados_tratados ? d.sistema.dados_tratados.split(", ") : []);
        setParecerAprovado(d.sistema.parecer_aprovado === true ? "Sim" : d.sistema.parecer_aprovado === false ? "Não" : "");
        setParecerNumeroChamado(d.sistema.parecer_numero_chamado || "");
      })
      .catch((e) => setErro(e.message || "Erro ao carregar sistema."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    if (id) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function toggleDadoTratado(valor: string) {
    setDadosTratados((atual) =>
      atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor]
    );
  }

  async function handleSalvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErroSalvar(null);
    setSalvo(false);
    setSalvando(true);
    try {
      const res = await fetch(`/api/sistemas-ia/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sistema: nome,
          tipo: tipo || null,
          descricao: descricao || null,
          area: area || null,
          areaUsuario: areaUsuario || null,
          usuarios: usuarios || null,
          emails: emails || null,
          dadosTratados,
          parecerAprovado: parecerAprovado === "Sim" ? true : parecerAprovado === "Não" ? false : null,
          parecerNumeroChamado: parecerNumeroChamado || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Não foi possível salvar.");
      }
      setSalvo(true);
      carregar();
    } catch (err) {
      setErroSalvar(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleAdicionarRevisao(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErroRevisao(null);
    if (!revData || !revParecer) {
      setErroRevisao("Data e parecer são obrigatórios.");
      return;
    }
    setEnviandoRevisao(true);
    try {
      const res = await fetch(`/api/sistemas-ia/${id}/revisoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revisadoPor: revRevisadoPor || null,
          dataRevisao: revData,
          numeroChamado: revChamado || null,
          parecerAprovado: revParecer === "Sim",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Não foi possível registrar a revisão.");
      }
      setRevRevisadoPor("");
      setRevData("");
      setRevChamado("");
      setRevParecer("");
      carregar();
    } catch (err) {
      setErroRevisao(err instanceof Error ? err.message : "Erro ao registrar revisão.");
    } finally {
      setEnviandoRevisao(false);
    }
  }

  const atencao = requerAtencao(dadosTratados.join(", "));
  const ultimaRevisao = revisoes[0] || null;
  const statusAtual = ultimaRevisao ? ultimaRevisao.parecer_aprovado : sistema?.parecer_aprovado ?? null;
  const proximaRevisao = sistema
    ? calcularProximaRevisao(sistema.criado_em, ultimaRevisao?.data_revisao || null, dadosTratados.join(", "))
    : null;
  const revisaoVencida = proximaRevisao ? proximaRevisao.getTime() < Date.now() : false;

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Governança de IA</span>
          <h1>{sistema ? sistema.sistema : "Sistema de IA"}</h1>

          {carregando && <p className="text-muted" style={{ marginTop: "1.5rem" }}>Carregando...</p>}

          {erro && (
            <div className="error-banner" style={{ marginTop: "1.5rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar o sistema.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {!carregando && !erro && sistema && (
            <>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem", marginBottom: "1.5rem" }}>
                <span className={`badge ${statusAtual === true ? "badge-baixo" : statusAtual === false ? "badge-critico" : ""}`}>
                  {statusAtual === true ? "Aprovado" : statusAtual === false ? "Não aprovado" : "Sem parecer"}
                </span>
                {atencao && <span className="badge badge-atencao">Requer atenção</span>}
                <span className={`badge ${revisaoVencida ? "badge-critico" : "badge-baixo"}`}>
                  Próxima revisão: {formatarData(proximaRevisao)}{revisaoVencida ? " — vencida" : ""}
                </span>
              </div>

              <form className="risk-form" onSubmit={handleSalvar}>
                <fieldset className="form-section">
                  <legend>Identificação</legend>
                  <div className="form-grid">
                    <div className="form-field">
                      <label htmlFor="nome">Sistema</label>
                      <input id="nome" type="text" required value={nome} onChange={(e) => setNome(e.target.value)} />
                    </div>

                    <div className="form-field">
                      <label htmlFor="tipo">Tipo</label>
                      <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                        <option value="" disabled>Selecione</option>
                        {TIPOS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="area">Área</label>
                      <select id="area" value={area} onChange={(e) => setArea(e.target.value)}>
                        <option value="" disabled>Selecione</option>
                        {AREAS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field form-field-wide">
                      <label htmlFor="descricao">Descrição</label>
                      <textarea id="descricao" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="form-section">
                  <legend>Uso</legend>
                  <div className="form-grid">
                    <div className="form-field">
                      <label htmlFor="areaUsuario">Área do Usuário</label>
                      <select id="areaUsuario" value={areaUsuario} onChange={(e) => setAreaUsuario(e.target.value)}>
                        <option value="" disabled>Selecione</option>
                        {AREAS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="usuarios">Usuário(s)</label>
                      <input id="usuarios" type="text" value={usuarios} onChange={(e) => setUsuarios(e.target.value)} />
                      <p className="field-helper">Separe múltiplos usuários com ";".</p>
                    </div>

                    <div className="form-field">
                      <label htmlFor="emails">E-mail(s)</label>
                      <input id="emails" type="text" value={emails} onChange={(e) => setEmails(e.target.value)} />
                      <p className="field-helper">Separe múltiplos e-mails com ";".</p>
                    </div>

                    <div className="form-field form-field-wide">
                      <label>Dados Tratados</label>
                      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "0.3rem", alignItems: "center" }}>
                        {OPCOES_DADOS_TRATADOS.map((opcao) => (
                          <label key={opcao} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 400 }}>
                            <input type="checkbox" checked={dadosTratados.includes(opcao)} onChange={() => toggleDadoTratado(opcao)} />
                            {opcao}
                          </label>
                        ))}
                        {atencao && <span className="badge badge-atencao">Requer atenção</span>}
                      </div>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="form-section">
                  <legend>Parecer de Cibersegurança (cadastro original)</legend>
                  <div className="form-grid">
                    <div className="form-field">
                      <label htmlFor="parecerAprovado">Aprovado?</label>
                      <select id="parecerAprovado" value={parecerAprovado} onChange={(e) => setParecerAprovado(e.target.value)}>
                        <option value="" disabled>Selecione</option>
                        <option>Sim</option>
                        <option>Não</option>
                      </select>
                    </div>
                    {parecerAprovado === "Sim" && (
                      <div className="form-field">
                        <label htmlFor="parecerNumeroChamado">Número do Chamado</label>
                        <input id="parecerNumeroChamado" type="text" value={parecerNumeroChamado} onChange={(e) => setParecerNumeroChamado(e.target.value)} />
                      </div>
                    )}
                  </div>
                </fieldset>

                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={salvando}>
                    {salvando ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>

                {salvo && (
                  <div className="success-banner">
                    <span className="success-icon">✓</span>
                    <span className="success-text"><strong>Alterações salvas.</strong></span>
                  </div>
                )}
                {erroSalvar && (
                  <div className="error-banner">
                    <span className="success-icon error-icon">!</span>
                    <span className="success-text">
                      <strong>Não foi possível salvar.</strong>
                      <span>{erroSalvar}</span>
                    </span>
                  </div>
                )}
              </form>

              <div className="dash-panel" style={{ marginTop: "2.5rem" }}>
                <div className="dash-panel-header">Histórico de Revisões</div>
                <div className="dash-panel-body">
                  {revisoes.length === 0 ? (
                    <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Nenhuma revisão registrada ainda.</p>
                  ) : (
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Revisado Por</th>
                          <th>Data</th>
                          <th>Número do Chamado</th>
                          <th>Parecer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revisoes.map((r) => (
                          <tr key={r.id}>
                            <td>{r.revisado_por || "—"}</td>
                            <td>{formatarData(r.data_revisao)}</td>
                            <td>{r.numero_chamado || "—"}</td>
                            <td>
                              <span className={`badge ${r.parecer_aprovado ? "badge-baixo" : "badge-critico"}`}>
                                {r.parecer_aprovado ? "Sim" : "Não"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
                <div className="dash-panel-header">Adicionar Revisão</div>
                <div className="dash-panel-body">
                  <form onSubmit={handleAdicionarRevisao}>
                    <div className="form-grid">
                      <div className="form-field">
                        <label htmlFor="revRevisadoPor">Revisado Por</label>
                        <input
                          id="revRevisadoPor"
                          type="text"
                          placeholder="nome@empresa.com"
                          value={revRevisadoPor}
                          onChange={(e) => setRevRevisadoPor(e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="revData">Data da Revisão</label>
                        <input id="revData" type="date" required value={revData} onChange={(e) => setRevData(e.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="revChamado">Número do Chamado</label>
                        <input id="revChamado" type="text" value={revChamado} onChange={(e) => setRevChamado(e.target.value)} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="revParecer">Parecer</label>
                        <select id="revParecer" required value={revParecer} onChange={(e) => setRevParecer(e.target.value)}>
                          <option value="" disabled>Selecione</option>
                          <option>Sim</option>
                          <option>Não</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn-primary" disabled={enviandoRevisao}>
                        {enviandoRevisao ? "Registrando..." : "Registrar Revisão"}
                      </button>
                    </div>
                    {erroRevisao && (
                      <div className="error-banner">
                        <span className="success-icon error-icon">!</span>
                        <span className="success-text">
                          <strong>Não foi possível registrar.</strong>
                          <span>{erroRevisao}</span>
                        </span>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </>
          )}

          <a
            href="/seguranca/governanca-de-ia/dashboard"
            className="status-tag"
            style={{ marginTop: "2.5rem", display: "inline-block" }}
          >
            ← Voltar para o Dashboard
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
