"use client";

import { useEffect, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import { TIPOS_ATIVO } from "@/lib/ativosCriticos";
import SolicitarProjeto from "@/components/riscos/SolicitarProjeto";

// B14 · Inventário de ativos e processos críticos. Cada risco aponta para um
// item daqui (ativo ou processo afetado), e a área responsável do item é a
// área usada nos filtros da lista de riscos. Custos são opcionais: só itens
// com os dois custos geram a estimativa financeira no cadastro do risco.

type Projeto = { id: number; nome: string; ativo?: boolean };
type Ativo = {
  id: number;
  projeto_id: number;
  projeto: string;
  nome: string;
  tipo: string;
  area_responsavel: string | null;
  descricao: string | null;
  ativo: boolean;
  custo_indisponibilidade_hora: string | number | null;
  custo_restauracao_hora_homem: string | number | null;
  riscos: number;
};

type Form = {
  id: number | null;
  projetoId: string;
  nome: string;
  tipo: string;
  areaResponsavel: string;
  descricao: string;
  custoIndisponibilidadeHora: string;
  custoRestauracaoHoraHomem: string;
};

const VAZIO: Form = {
  id: null,
  projetoId: "",
  nome: "",
  tipo: "Sistema",
  areaResponsavel: "",
  descricao: "",
  custoIndisponibilidadeHora: "",
  custoRestauracaoHoraHomem: "",
};

function moeda(v: string | number | null) {
  if (v === null || v === undefined || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AtivosCriticos() {
  const [ativos, setAtivos] = useState<Ativo[] | null>(null);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [podeEditar, setPodeEditar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroProjeto, setFiltroProjeto] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  function carregar() {
    fetch(`/api/ativos-criticos?inativos=1`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setAtivos(d.ativos || []);
        setPodeEditar(!!d.podeEditar);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar o inventário."));
  }

  useEffect(() => {
    carregar();
    fetch("/api/projetos")
      .then((r) => r.json())
      .then((d) => setProjetos(d.projetos || []))
      .catch(() => setProjetos([]));
  }, []);

  const areas = useMemo(
    () =>
      [...new Set((ativos || []).map((a) => a.area_responsavel).filter((a): a is string => !!a))].sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    [ativos]
  );

  const visiveis = (ativos || []).filter((a) => {
    if (!mostrarInativos && !a.ativo) return false;
    if (filtroProjeto && String(a.projeto_id) !== filtroProjeto) return false;
    if (filtroArea === "__sem__" ? !!a.area_responsavel : filtroArea && a.area_responsavel !== filtroArea) return false;
    return true;
  });
  const semArea = (ativos || []).filter((a) => a.ativo && !a.area_responsavel).length;

  function editar(a: Ativo) {
    setErroForm(null);
    setForm({
      id: a.id,
      projetoId: String(a.projeto_id),
      nome: a.nome,
      tipo: a.tipo,
      areaResponsavel: a.area_responsavel || "",
      descricao: a.descricao || "",
      custoIndisponibilidadeHora: a.custo_indisponibilidade_hora === null ? "" : String(a.custo_indisponibilidade_hora),
      custoRestauracaoHoraHomem: a.custo_restauracao_hora_homem === null ? "" : String(a.custo_restauracao_hora_homem),
    });
    setTimeout(() => document.getElementById("form-ativo")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function salvar() {
    if (!form) return;
    setSalvando(true);
    setErroForm(null);
    try {
      const url = form.id ? `/api/ativos-criticos/${form.id}` : "/api/ativos-criticos";
      const r = await fetch(url, {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, projetoId: Number(form.projetoId) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Não foi possível salvar.");
      setForm(null);
      carregar();
    } catch (e: any) {
      setErroForm(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function alternarSituacao(a: Ativo) {
    const r = await fetch(`/api/ativos-criticos/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !a.ativo }),
    });
    if (r.ok) carregar();
  }

  const campo = (k: keyof Form) => ({
    value: (form?.[k] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => (f ? { ...f, [k]: e.target.value } : f)),
  });

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <h1>Ativos e processos críticos</h1>
              <p className="lede">
                Inventário de onde os riscos acontecem: sistemas, processos, infraestrutura, dados e fornecedores,
                com a área responsável. Os custos são opcionais e alimentam a estimativa financeira dos riscos.
              </p>
            </div>
            {podeEditar && !form && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setErroForm(null);
                  setForm({ ...VAZIO, projetoId: filtroProjeto });
                }}
              >
                + Novo ativo ou processo
              </button>
            )}
          </div>

          {semArea > 0 && (
            <p className="field-helper" style={{ color: "var(--danger)", marginTop: "1rem" }}>
              {semArea} {semArea > 1 ? "itens ativos estão" : "item ativo está"} sem área responsável. Edite para
              completar: os riscos ligados a eles ficam fora do filtro por área.
            </p>
          )}

          {form && (
            <div className="dash-panel" id="form-ativo" style={{ marginTop: "1.5rem" }}>
              <div className="dash-panel-header">{form.id ? "Editar ativo ou processo" : "Novo ativo ou processo"}</div>
              <div className="dash-panel-body">
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor="atProjeto">Projeto *</label>
                    <select id="atProjeto" {...campo("projetoId")} disabled={!!form.id}>
                      <option value="">Selecione</option>
                      {projetos.filter((p) => p.ativo !== false || String(p.id) === String(form.projetoId)).map((p) => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                    {!form.id && <SolicitarProjeto />}
                  </div>
                  <div className="form-field">
                    <label htmlFor="atTipo">Tipo *</label>
                    <select id="atTipo" {...campo("tipo")}>
                      {TIPOS_ATIVO.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="atNome">Nome *</label>
                    <input id="atNome" type="text" maxLength={150} {...campo("nome")} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="atArea">Área responsável *</label>
                    <input id="atArea" type="text" maxLength={120} list="areasExistentes" {...campo("areaResponsavel")} />
                    <datalist id="areasExistentes">
                      {areas.map((a) => (
                        <option key={a} value={a} />
                      ))}
                    </datalist>
                  </div>
                  <div className="form-field form-field-wide">
                    <label htmlFor="atDescricao">Descrição</label>
                    <textarea id="atDescricao" rows={2} maxLength={2000} {...campo("descricao")} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="atCustoIndisp">Custo de indisponibilidade por hora (R$)</label>
                    <input id="atCustoIndisp" type="text" inputMode="decimal" {...campo("custoIndisponibilidadeHora")} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="atCustoRest">Custo de restauração por hora-homem (R$)</label>
                    <input id="atCustoRest" type="text" inputMode="decimal" {...campo("custoRestauracaoHoraHomem")} />
                    <p className="field-helper">Preencha os dois custos ou nenhum.</p>
                  </div>
                </div>
                {erroForm && (
                  <p className="field-helper" style={{ color: "var(--danger)" }}>
                    {erroForm}
                  </p>
                )}
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
                  <button type="button" className="btn-primary" onClick={salvar} disabled={salvando}>
                    {salvando ? "Salvando..." : "Salvar"}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setForm(null)} disabled={salvando}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "1.5rem", alignItems: "flex-end" }}>
            <div className="form-field" style={{ minWidth: "14rem", flex: "1 1 14rem", maxWidth: "20rem" }}>
              <label htmlFor="fAtProjeto">Projeto</label>
              <select id="fAtProjeto" value={filtroProjeto} onChange={(e) => setFiltroProjeto(e.target.value)}>
                <option value="">Todos</option>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div className="form-field" style={{ minWidth: "14rem", flex: "1 1 14rem", maxWidth: "20rem" }}>
              <label htmlFor="fAtArea">Área responsável</label>
              <select id="fAtArea" value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
                <option value="">Todas</option>
                <option value="__sem__">Sem área definida</option>
                {areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", paddingBottom: "0.6rem" }}>
              <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} />
              Mostrar inativos
            </label>
          </div>

          {!ativos && !erro && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}
          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar o inventário.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {ativos && (
            <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
              <div className="dash-panel-header">
                {visiveis.length} {visiveis.length === 1 ? "item" : "itens"}
              </div>
              <div className="dash-panel-body">
                {visiveis.length === 0 ? (
                  <p className="text-muted" style={{ margin: 0 }}>Nenhum item com esses filtros.</p>
                ) : (
                  <div className="dash-table-scroll">
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Projeto</th>
                          <th>Área responsável</th>
                          <th>Indisp./hora</th>
                          <th>Restauração/h-h</th>
                          <th>Riscos</th>
                          {podeEditar && <th></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {visiveis.map((a) => (
                          <tr key={a.id} style={a.ativo ? undefined : { opacity: 0.55 }}>
                            <td style={{ whiteSpace: "normal", minWidth: "12rem" }}>
                              <strong>{a.nome}</strong>
                              {!a.ativo && <span className="text-muted"> · inativo</span>}
                              {a.descricao && (
                                <div className="text-muted" style={{ fontSize: "0.75rem" }}>{a.descricao}</div>
                              )}
                            </td>
                            <td>{a.tipo}</td>
                            <td>{a.projeto}</td>
                            <td>
                              {a.area_responsavel || <span style={{ color: "var(--danger)" }}>não definida</span>}
                            </td>
                            <td>{moeda(a.custo_indisponibilidade_hora)}</td>
                            <td>{moeda(a.custo_restauracao_hora_homem)}</td>
                            <td>{a.riscos}</td>
                            {podeEditar && (
                              <td style={{ whiteSpace: "nowrap" }}>
                                <button
                                  type="button"
                                  onClick={() => editar(a)}
                                  style={{ background: "none", border: 0, color: "var(--accent)", cursor: "pointer", font: "inherit" }}
                                >
                                  Editar
                                </button>
                                {" · "}
                                <button
                                  type="button"
                                  onClick={() => alternarSituacao(a)}
                                  style={{ background: "none", border: 0, color: "var(--accent)", cursor: "pointer", font: "inherit" }}
                                >
                                  {a.ativo ? "Inativar" : "Reativar"}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
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
