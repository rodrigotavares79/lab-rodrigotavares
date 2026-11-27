"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import { usePerfilRiscos, SemPermissao } from "@/components/riscos/PermissoesRiscos";
import { NIVEIS_REVISAO, validarParametros } from "@/lib/parametrosRegras";

// B29 · Administração → Parâmetros da política: prazo para riscos Altos e
// Críticos terem tratamento e periodicidade de revisão por nível. Antes só
// mudavam direto no banco; a alteração vale na hora para os indicadores.

type Form = { prazoTratamentoDias: string; revisao: Record<string, string> };

export default function Parametros() {
  const perfil = usePerfilRiscos();
  const [form, setForm] = useState<Form | null>(null);
  const [original, setOriginal] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    fetch("/api/parametros-riscos")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        const f: Form = {
          prazoTratamentoDias: String(d.prazoTratamentoDias ?? ""),
          revisao: Object.fromEntries(NIVEIS_REVISAO.map((n) => [n, String(d.revisao?.[n] ?? "")])),
        };
        setForm(f);
        setOriginal(JSON.stringify(f));
      })
      .catch((e) => setErro(e.message || "Erro ao carregar os parâmetros."));
  }
  useEffect(() => {
    if (perfil.carregado && perfil.permissoes.gerirUsuarios) carregar();
  }, [perfil.carregado, perfil.permissoes.gerirUsuarios]);

  if (perfil.carregado && !perfil.permissoes.gerirUsuarios) {
    return (
      <>
        <SemPermissao mensagem="Só Administrador e CISO alteram os parâmetros da política. Os valores em vigor estão descritos na Política de Gestão de Riscos." />
        <Footer />
      </>
    );
  }

  const validacao = form ? validarParametros(form) : null;
  const erroForm = typeof validacao === "string" ? validacao : null;
  const alterado = form ? JSON.stringify(form) !== original : false;

  async function salvar() {
    if (!form) return;
    setSalvando(true);
    setMsg(null);
    try {
      const r = await fetch("/api/parametros-riscos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ ok: true, texto: "Parâmetros gravados. Os indicadores de prazo e de revisões vencidas já usam os novos valores." });
      setOriginal(JSON.stringify(form));
    } catch (e: any) {
      setMsg({ ok: false, texto: e.message || "Não foi possível gravar." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Administração</span>
          <h1>Parâmetros da política</h1>
          <p className="lede">
            Prazos que a Política de Gestão de Riscos define e que o sistema usa nos indicadores. Toda alteração fica no
            log de alterações, com autor e valor anterior.
          </p>

          {erro && <div className="error-banner" style={{ marginTop: "1.25rem" }}><span className="success-text">{erro}</span></div>}
          {msg && (
            <div className="dash-panel" style={{ marginTop: "1.25rem", borderLeft: `4px solid ${msg.ok ? "var(--success)" : "var(--danger)"}` }}>
              <div className="dash-panel-body">{msg.texto}</div>
            </div>
          )}
          {!form && !erro && <p className="text-muted">Carregando...</p>}

          {form && (
            <>
              <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
                <div className="dash-panel-header">Prazo de tratamento</div>
                <div className="dash-panel-body">
                  <div className="form-field" style={{ maxWidth: "16rem" }}>
                    <label htmlFor="prazo">Dias para definir o tratamento</label>
                    <input id="prazo" type="number" min={1} max={365} inputMode="numeric" value={form.prazoTratamentoDias} onChange={(e) => setForm({ ...form, prazoTratamentoDias: e.target.value })} />
                  </div>
                  <p className="field-helper" style={{ margin: 0 }}>
                    Contados a partir do cadastro: um risco Alto ou Crítico sem tratamento depois desse prazo entra em “Riscos sem tratamento”.
                  </p>
                </div>
              </div>

              <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
                <div className="dash-panel-header">Periodicidade de revisão por nível</div>
                <div className="dash-panel-body">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))", gap: "0 1rem" }}>
                    {NIVEIS_REVISAO.map((n) => (
                      <div className="form-field" key={n}>
                        <label htmlFor={`rev-${n}`}>Risco {n} (dias)</label>
                        <input
                          id={`rev-${n}`}
                          type="number"
                          min={1}
                          max={730}
                          inputMode="numeric"
                          value={form.revisao[n]}
                          onChange={(e) => setForm({ ...form, revisao: { ...form.revisao, [n]: e.target.value } })}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="field-helper" style={{ margin: 0 }}>
                    Depois desse intervalo sem reavaliação, o risco entra em “Revisões vencidas”. Nível mais grave precisa de revisão igual ou mais frequente.
                  </p>
                </div>
              </div>

              {erroForm && <p style={{ color: "var(--danger)", marginTop: "1rem" }}>{erroForm}</p>}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                <button className="btn-primary" disabled={!alterado || !!erroForm || salvando} onClick={salvar}>{salvando ? "Gravando..." : "Gravar parâmetros"}</button>
                {alterado && <button className="status-tag" onClick={() => setForm(JSON.parse(original))}>Desfazer alterações</button>}
              </div>
            </>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
