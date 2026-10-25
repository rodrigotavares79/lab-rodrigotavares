"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import Footer from "@/components/Footer";

type Servico = {
  id: number;
  nome: string;
  categoria: string | null;
  urgencia: string | null;
  tipo: string | null;
  sla_horas: number;
};

// Uma linha densa por serviço. A urgência não aparece aqui de propósito —
// só depois que o chamado é aberto (ver Chamados / detalhe do chamado).
function ServicoLinha({
  servico,
  selecionado,
  onSelecionar,
}: {
  servico: Servico;
  selecionado: boolean;
  onSelecionar: () => void;
}) {
  return (
    <label className={`servico-linha${selecionado ? " servico-linha-selecionada" : ""}`}>
      <input
        type="radio"
        name="servico"
        value={servico.id}
        checked={selecionado}
        onChange={onSelecionar}
      />
      <div className="servico-linha-info">
        <span className="servico-linha-nome">{servico.nome}</span>
        {servico.categoria && <span className="servico-linha-categoria">{servico.categoria}</span>}
      </div>
      <div className="servico-linha-meta">
        {servico.tipo && <span className="status-tag">{servico.tipo}</span>}
        <span className="servico-linha-sla">SLA {servico.sla_horas}h</span>
      </div>
    </label>
  );
}

export default function NovoChamado() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoId, setServicoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [avisoAnexos, setAvisoAnexos] = useState<string | null>(null);

  // Só um grupo aberto por vez — abrir outro fecha o anterior. Começa tudo
  // recolhido.
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/catalogo-servicos")
      .then((r) => r.json())
      .then((d) => setServicos(d.servicos || []))
      .catch(() => setServicos([]));
  }, []);

  const servicosPorCategoria = useMemo(() => {
    const grupos = new Map<string, Servico[]>();
    for (const s of servicos) {
      const chave = s.categoria || "Sem categoria";
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave)!.push(s);
    }
    return Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [servicos]);

  function toggleGrupo(categoria: string) {
    setGrupoAberto((atual) => (atual === categoria ? null : categoria));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviado(false);
    setAvisoAnexos(null);

    if (!servicoId) {
      setErro("Selecione um serviço.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    const arquivos = formData.getAll("anexos").filter((a): a is File => a instanceof File && a.size > 0);

    const payload = {
      titulo: formData.get("titulo"),
      descricao: formData.get("descricao"),
      servicoId,
    };

    setEnviando(true);
    try {
      const res = await fetch("/api/chamados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Não foi possível abrir o chamado.");

      if (arquivos.length > 0) {
        const falhas = (
          await Promise.all(
            arquivos.map(async (arquivo) => {
              const anexoForm = new FormData();
              anexoForm.append("arquivo", arquivo);
              const r = await fetch(`/api/chamados/${body.id}/anexos`, { method: "POST", body: anexoForm });
              return r.ok ? null : arquivo.name;
            })
          )
        ).filter((nome): nome is string => nome !== null);
        if (falhas.length > 0) {
          setAvisoAnexos(`Chamado aberto, mas não foi possível anexar: ${falhas.join(", ")}.`);
        }
      }

      setEnviado(true);
      form.reset();
      setServicoId("");
      setGrupoAberto(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao abrir o chamado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Condomínio</span>
          <h1>Abrir Chamado</h1>
          <p className="lede">
            Descreva o problema — o síndico será notificado e vai acompanhar a resolução.
          </p>

          <form className="risk-form" onSubmit={handleSubmit}>
            <fieldset className="form-section">
              <legend>Identificação do Problema</legend>
              <div className="form-grid">
                <div className="form-field form-field-wide">
                  <label htmlFor="titulo">Título</label>
                  <input
                    id="titulo"
                    name="titulo"
                    type="text"
                    required
                    placeholder="Ex.: Vazamento no teto da garagem"
                  />
                </div>

                <div className="form-field form-field-wide">
                  <label htmlFor="descricao">Descreva o problema</label>
                  <textarea
                    id="descricao"
                    name="descricao"
                    rows={4}
                    placeholder="Dê o máximo de detalhes possível: local exato, desde quando, etc."
                  />
                </div>

                <div className="form-field form-field-wide">
                  <label htmlFor="anexos">Fotos ou PDF (opcional)</label>
                  <input
                    id="anexos"
                    name="anexos"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                  />
                  <p className="field-helper">Até 8 MB por arquivo.</p>
                </div>
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>Serviço</legend>
              <p className="field-helper" style={{ marginTop: 0 }}>
                Escolha a categoria e depois o serviço. O prazo de atendimento (SLA) já vem definido por ele.
              </p>

              {servicos.length === 0 ? (
                <p className="field-helper">
                  Nenhum serviço cadastrado ainda — peça ao síndico para
                  cadastrar em "Catálogo de Serviços".
                </p>
              ) : (
                <div role="radiogroup" aria-label="Selecione o serviço">
                  {servicosPorCategoria.map(([categoria, itens]) => {
                    const aberto = grupoAberto === categoria;
                    return (
                      <div key={categoria} className="servico-grupo">
                        <button
                          type="button"
                          className="servico-grupo-header"
                          onClick={() => toggleGrupo(categoria)}
                          aria-expanded={aberto}
                        >
                          <span>{categoria}</span>
                          <span className="text-muted" style={{ fontSize: "0.78rem", fontWeight: 400 }}>
                            {itens.length} serviço{itens.length !== 1 ? "s" : ""} {aberto ? "▾" : "▸"}
                          </span>
                        </button>
                        {aberto && (
                          <div className="servico-lista">
                            {itens.map((s) => (
                              <ServicoLinha
                                key={s.id}
                                servico={s}
                                selecionado={servicoId === String(s.id)}
                                onSelecionar={() => setServicoId(String(s.id))}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={enviando}>
                {enviando ? "Enviando..." : "Abrir Chamado"}
              </button>
            </div>

            {enviado && (
              <div className="success-banner">
                <span className="success-icon">✓</span>
                <span className="success-text">
                  <strong>Chamado aberto com sucesso.</strong>
                  <span>Acompanhe o status (incluindo a urgência) em "Chamados".</span>
                </span>
              </div>
            )}

            {avisoAnexos && (
              <div className="error-banner">
                <span className="success-icon error-icon">!</span>
                <span className="success-text">{avisoAnexos}</span>
              </div>
            )}

            {erro && (
              <div className="error-banner">
                <span className="success-icon error-icon">!</span>
                <span className="success-text">
                  <strong>Não foi possível abrir o chamado.</strong>
                  <span>{erro}</span>
                </span>
              </div>
            )}
          </form>

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
