"use client";

import { useState } from "react";
import Papa from "papaparse";

type LinhaMapeada = {
  projeto: string;
  categoria: string;
  gatilho: string;
  resultado: string;
  levantadoPor: string;
  dataLevantamento: string;
  fonte: string;
  impacto: string;
  probabilidade: string;
  sistemaCritico: string;
  duracaoHoras: string;
  percentualDegradacao: string;
  restauracaoPessoas: string;
  restauracaoHoras: string;
};

// mapeia o cabeçalho esperado do CSV (modelo) -> chave interna
const MAPA_CABECALHOS: [string, keyof LinhaMapeada][] = [
  ["projeto", "projeto"],
  ["categoria do risco", "categoria"],
  ["ponto de gatilho", "gatilho"],
  ["resultado potencial", "resultado"],
  ["levantado por", "levantadoPor"],
  ["data de levantamento", "dataLevantamento"],
  ["fonte", "fonte"],
  ["impacto", "impacto"],
  ["probabilidade", "probabilidade"],
  ["sistema crítico", "sistemaCritico"],
  ["duração horas", "duracaoHoras"],
  ["% degradação", "percentualDegradacao"],
  ["pessoas restauração", "restauracaoPessoas"],
  ["horas restauração", "restauracaoHoras"],
];

function normalizarTexto(t: string) {
  return t
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type ResultadoImportacao = {
  totalLinhas: number;
  inseridos: number;
  erros: { linha: number; motivo: string }[];
  avisos: { linha: number; motivo: string }[];
};

export default function ImportarRiscosCSV() {
  const [linhas, setLinhas] = useState<LinhaMapeada[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [erroParse, setErroParse] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErroParse(null);
    setResultado(null);
    setNomeArquivo(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: "",
      complete: (results) => {
        const camposDetectados = results.meta.fields || [];
        const mapaColunaChave = new Map<string, keyof LinhaMapeada>();

        for (const coluna of camposDetectados) {
          const norm = normalizarTexto(coluna);
          const match = MAPA_CABECALHOS.find(([cab]) => normalizarTexto(cab) === norm);
          if (match) mapaColunaChave.set(coluna, match[1]);
        }

        if (!Array.from(mapaColunaChave.values()).includes("projeto")) {
          setErroParse(
            "Não encontrei a coluna \"Projeto\" no arquivo. Baixe o modelo e confira os nomes das colunas."
          );
          setLinhas([]);
          return;
        }

        const mapeadas: LinhaMapeada[] = results.data.map((row) => {
          const linha: Partial<LinhaMapeada> = {};
          mapaColunaChave.forEach((chave, coluna) => {
            linha[chave] = (row[coluna] || "").trim();
          });
          return {
            projeto: linha.projeto || "",
            categoria: linha.categoria || "",
            gatilho: linha.gatilho || "",
            resultado: linha.resultado || "",
            levantadoPor: linha.levantadoPor || "",
            dataLevantamento: linha.dataLevantamento || "",
            fonte: linha.fonte || "",
            impacto: linha.impacto || "",
            probabilidade: linha.probabilidade || "",
            sistemaCritico: linha.sistemaCritico || "",
            duracaoHoras: linha.duracaoHoras || "",
            percentualDegradacao: linha.percentualDegradacao || "",
            restauracaoPessoas: linha.restauracaoPessoas || "",
            restauracaoHoras: linha.restauracaoHoras || "",
          };
        });

        setLinhas(mapeadas);
      },
      error: (err) => {
        setErroParse(err.message || "Erro ao ler o arquivo.");
      },
    });
  }

  async function handleImportar() {
    setImportando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/importar-riscos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linhas }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Falha na importação.");
      }
      setResultado(body);
      if (body.erros?.length === 0) {
        setLinhas([]);
        setNomeArquivo("");
      }
    } catch (err) {
      setErroParse(err instanceof Error ? err.message : "Erro ao importar.");
    } finally {
      setImportando(false);
    }
  }

  function limpar() {
    setLinhas([]);
    setNomeArquivo("");
    setErroParse(null);
    setResultado(null);
  }

  return (
    <div className="csv-import">
      <p className="text-muted" style={{ fontSize: "0.88rem", maxWidth: "38rem" }}>
        Cadastre vários riscos de uma vez a partir de uma planilha. Baixe o
        modelo, preencha no Excel (ou Google Sheets) e envie o arquivo aqui.
        Nenhum e-mail de confirmação é enviado para importações em lote.
      </p>

      <a
        href="/templates/modelo-cadastro-riscos.csv"
        download
        className="btn-primary"
        style={{ display: "inline-block", textDecoration: "none", marginTop: "0.75rem" }}
      >
        Baixar modelo CSV
      </a>

      <div className="csv-upload-box">
        <label htmlFor="csvFile" className="field-label">Selecionar arquivo (.csv)</label>
        <input id="csvFile" type="file" accept=".csv" onChange={handleFile} />
        {nomeArquivo && <p className="field-helper">Arquivo: {nomeArquivo}</p>}
      </div>

      {erroParse && (
        <div className="error-banner">
          <span className="success-icon error-icon">!</span>
          <span className="success-text">
            <strong>Não foi possível ler o arquivo.</strong>
            <span>{erroParse}</span>
          </span>
        </div>
      )}

      {linhas.length > 0 && !resultado && (
        <>
          <p style={{ fontSize: "0.85rem", marginTop: "1.25rem", fontWeight: 600 }}>
            Prévia — {linhas.length} linha{linhas.length > 1 ? "s" : ""} encontrada{linhas.length > 1 ? "s" : ""}
          </p>
          <div className="csv-preview-scroll">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Projeto</th>
                  <th>Categoria</th>
                  <th>Levantado Por</th>
                  <th>Impacto</th>
                  <th>Probabilidade</th>
                  <th>Sistema Crítico</th>
                </tr>
              </thead>
              <tbody>
                {linhas.slice(0, 10).map((l, i) => (
                  <tr key={i}>
                    <td>{i + 2}</td>
                    <td>{l.projeto || "—"}</td>
                    <td>{l.categoria || "—"}</td>
                    <td>{l.levantadoPor || "—"}</td>
                    <td>{l.impacto || "—"}</td>
                    <td>{l.probabilidade || "—"}</td>
                    <td>{l.sistemaCritico || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {linhas.length > 10 && (
            <p className="field-helper">Mostrando as primeiras 10 de {linhas.length} linhas.</p>
          )}

          <div className="form-actions" style={{ marginTop: "1rem" }}>
            <button type="button" className="btn-primary" onClick={handleImportar} disabled={importando}>
              {importando ? "Importando..." : `Importar ${linhas.length} registro${linhas.length > 1 ? "s" : ""}`}
            </button>
            <button
              type="button"
              onClick={limpar}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      {resultado && (
        <div className="csv-result">
          <div className={resultado.erros.length > 0 ? "error-banner" : "success-banner"}>
            <span className={resultado.erros.length > 0 ? "success-icon error-icon" : "success-icon"}>
              {resultado.erros.length > 0 ? "!" : "✓"}
            </span>
            <span className="success-text">
              <strong>
                {resultado.inseridos} de {resultado.totalLinhas} risco{resultado.totalLinhas > 1 ? "s" : ""} importado{resultado.inseridos !== 1 ? "s" : ""} com sucesso.
              </strong>
              {resultado.erros.length > 0 && (
                <span>{resultado.erros.length} linha{resultado.erros.length > 1 ? "s" : ""} com erro, não importada{resultado.erros.length > 1 ? "s" : ""}.</span>
              )}
            </span>
          </div>

          {resultado.erros.length > 0 && (
            <ul className="csv-issue-list">
              {resultado.erros.map((e, i) => (
                <li key={i}><strong>Linha {e.linha}:</strong> {e.motivo}</li>
              ))}
            </ul>
          )}

          {resultado.avisos.length > 0 && (
            <ul className="csv-issue-list csv-issue-list-warning">
              {resultado.avisos.map((a, i) => (
                <li key={i}><strong>Linha {a.linha}:</strong> {a.motivo}</li>
              ))}
            </ul>
          )}

          <button type="button" className="btn-primary" onClick={limpar} style={{ marginTop: "1rem" }}>
            Importar outro arquivo
          </button>
        </div>
      )}
    </div>
  );
}
