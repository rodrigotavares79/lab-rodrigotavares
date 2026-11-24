"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";

// Ponto de entrada do Relatório Executivo pelo menu: escolhe o projeto e abre
// a versão de impressão (/relatorio?projetoId=...) numa nova aba.

type Projeto = { id: number; nome: string };

export default function RelatorioExecutivoEntrada() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [projetoId, setProjetoId] = useState("");

  useEffect(() => {
    fetch("/api/projetos")
      .then((r) => r.json())
      .then((d) => setProjetos(d.projetos || []))
      .catch(() => setProjetos([]));
  }, []);

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Relatórios</span>
          <h1>Relatório Executivo</h1>
          <p className="lede">
            Resumo executivo de um projeto: indicadores, riscos críticos e altos em aberto e a situação dos planos de
            ação, em formato pronto para imprimir ou salvar como PDF.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              gap: "1rem",
              marginTop: "1.5rem",
              padding: "1.25rem",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              maxWidth: "40rem",
            }}
          >
            <div className="form-field" style={{ flex: "1 1 16rem", margin: 0 }}>
              <label htmlFor="relExecProjeto">Projeto</label>
              <select id="relExecProjeto" value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
                <option value="">Selecione um projeto</option>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            {projetoId ? (
              <a
                href={`/seguranca/gestao-de-riscos/relatorio?projetoId=${projetoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", minHeight: "2.75rem" }}
              >
                Emitir relatório
              </a>
            ) : (
              <button type="button" className="btn-primary" disabled style={{ minHeight: "2.75rem" }}>
                Emitir relatório
              </button>
            )}
          </div>
          <p className="field-helper" style={{ marginTop: "0.75rem" }}>O relatório abre numa nova aba.</p>
        </div>
      </section>
      <Footer />
    </>
  );
}
